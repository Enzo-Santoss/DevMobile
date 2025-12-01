// src/app/services/tracker.service.ts

import { Injectable, NgZone, inject } from '@angular/core';
import { Geolocation, Position, WatchPositionCallback } from '@capacitor/geolocation';
import { BehaviorSubject, Observable } from 'rxjs';

// Interface para os dados que vamos expor
export interface AtividadeData {
  distanciaMts: number;
  passosEstimados: number;
  caloriasKcal: number;
  // optional: reports whether steps are coming from pedometer or GPS-derived
  stepsSource?: 'gps'|'pedometer';
  // when using pedometer we may include the raw pedometer steps count
  pedometerSteps?: number;
}

@Injectable({
  providedIn: 'root'
})
export class TrackerService {
  private tracking = false;
  private watchId: string | null = null;
  private lastPosition: { lat: number, lng: number } | null = null;
  private currentTotalDistance = 0;
  // Small-steps accumulator to prevent counting tiny GPS drift as movement
  private pendingDistance = 0;
  // Ignore movements smaller than this (meters) — helps avoid GPS jitter counting as steps
  // Muito mais rigoroso para ignorar jitter do GPS
  private readonly MIN_MOVEMENT_THRESHOLD_M = 10; // metros — mínimo para considerar movimento
  private readonly PENDING_COMMIT_THRESHOLD_M = 15; // precisa de pelo menos 15m acumulados para confirmar
  private readonly MIN_WALK_SPEED_M_S = 0.7; // m/s (caminhada lenta)
  private readonly MAX_WALK_SPEED_M_S = 2.5; // m/s (caminhada rápida)
  private readonly MAX_ACCEPTABLE_ACCURACY_M = 20; // somente confia em leituras com accuracy <= 20m
  private readonly MIN_CONSECUTIVE_GOOD_SEGMENTS = 3; // confirma movimento com 3 leituras válidas seguidas
  private readonly MIN_SAMPLE_DT_SEC = 1.0; // ignora leituras com intervalo menor que 1s
  // If pendingDistance accumulates to this within PENDING_TIME_WINDOW_MS it will commit
  // PENDING_COMMIT_THRESHOLD_M defined above (10m) — no duplicate
  // Time window where pendingDistance is considered for committing (ms)
  private readonly PENDING_TIME_WINDOW_MS = 10_000; // 10s
  // Expire pendingDistance buffer after this much time (ms)
  private readonly PENDING_EXPIRE_MS = 30_000; // 30s
  // Maximum plausible walking/running speed (meters/second). Discard spikes above this.
  private readonly MAX_SPEED_M_S = 10; // ~36 km/h (too high for normal walking/running)
  private pendingSince: number | null = null; // timestamp when pendingDistance started accumulating
  private lastTimestamp: number | null = null; // last position timestamp (ms)
  // Count of consecutive good segments that passed accuracy/speed/distance checks
  private consecutiveGoodSegments: number = 0;
  // --- pedometer integration state (Capacitor plugin) ---
  private pedometerAvailable = false;
  private usingPedometer = false; // user preference — when true we prefer native pedometer
  private pedometerPlugin: any = null; // dynamic imported plugin reference
  private pedometerListener: any = null; // plugin listener handle
  private pedometerStartCount: number | null = null; // first reading at session start
  private pedometerLastCount: number | null = null; // last reading
  private pedometerStepsSinceStart = 0; // computed delta for current session

  // Variável reativa para expor os dados da atividade para os componentes
  private _atividadeData = new BehaviorSubject<AtividadeData>({
    distanciaMts: 0,
    passosEstimados: 0,
    caloriasKcal: 0,
  });
  public atividadeData$: Observable<AtividadeData> = this._atividadeData.asObservable();

  // Expose last known GPS position so the UI can show a map/marker
  private _position = new BehaviorSubject<{ lat: number, lng: number } | null>(null);
  public position$: Observable<{ lat: number, lng: number } | null> = this._position.asObservable();
  // Keep a small path history (last N points) so UI can draw the route
  private pathPoints: { lat: number, lng: number }[] = [];
  private _path = new BehaviorSubject<{ lat: number, lng: number }[]>(this.pathPoints);
  public path$: Observable<{ lat: number, lng: number }[]> = this._path.asObservable();

  // Diagnostics to help debug why steps/distance are counted
  private _diagnostics = new BehaviorSubject<any>({});
  public diagnostics$ = this._diagnostics.asObservable();

  // Constantes de conversão (você pode torná-las variáveis do usuário depois)
  private readonly COMPRIMENTO_PASSADA_M = 0.76; // Média de 76 cm
  private readonly PESO_KG = 70; // Peso base para o cálculo de calorias (Mude isso para um valor do usuário)

  private readonly zone = inject(NgZone);

  constructor() { }

  async startTracking() {
    if (this.tracking) return;
    this.tracking = true;
    this.currentTotalDistance = 0;
    this.pendingDistance = 0;
    this.lastPosition = null;
    this.pendingSince = null;
    this.lastTimestamp = null;
    // reset previous path for a fresh tracking session
    this.pathPoints = [];
    try { this._path.next(this.pathPoints.slice()); } catch(e) { /* ignore */ }
    try { this._position.next(null); } catch (e) { /* ignore */ }
    this._atividadeData.next({ distanciaMts: 0, passosEstimados: 0, caloriasKcal: 0 });

    const options = {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 0
    };

    const watchCallback: WatchPositionCallback = (position, err) => {
      this.zone.run(() => { // Garante que o Angular detecte as mudanças
        if (err) {
          console.error('Erro ao rastrear a posição:', err);
          return;
        }
        if (position) {
          this.processNewPosition(position);
        }
      });
    };

    try {
      // try initialize pedometer plugin if the app/OS supports it
      try {
        await this.initPedometerPlugin();
      } catch (err) {
        // ignore — plugin unavailable on web, unsupported platforms, or not installed
        console.debug('Pedometer plugin init failed or unavailable', err);
      }
      // fetch current position first so UI/map can show a point immediately
      try {
        const current = await Geolocation.getCurrentPosition({ enableHighAccuracy: true });
        if (current && current.coords) {
          this.lastPosition = { lat: current.coords.latitude, lng: current.coords.longitude };
            try {
              this.pathPoints.push(this.lastPosition);
              if (this.pathPoints.length > 2000) this.pathPoints.shift();
              this._position.next(this.lastPosition);
              this._path.next(this.pathPoints.slice());
            } catch(e) { /* ignore */ }
        }
      } catch(err) {
        // ignore — watchPosition will supply points shortly in many cases
        console.debug('getCurrentPosition failed or unavailable', err);
      }
      // Tenta iniciar a observação da posição
      this.watchId = await Geolocation.watchPosition(options, watchCallback);
      // if pedometer is available and user opted to use it, start updates
      if (this.pedometerAvailable && this.usingPedometer) {
        await this.startPedometerUpdates();
      }
      console.log('Rastreamento de posição iniciado. Watch ID:', this.watchId);
    } catch (e) {
      console.error('Falha ao iniciar o rastreamento GPS. Verifique as permissões.', e);
      this.tracking = false;
    }
  }

  async stopTracking() {
    if (this.watchId) {
      await Geolocation.clearWatch({ id: this.watchId });
    }
    this.tracking = false;
    this.watchId = null;
    this.lastPosition = null;
    // stop pedometer updates if active
    try { await this.stopPedometerUpdates(); } catch (e) { /* ignore */ }
    console.log('Rastreamento de posição parado.');
  }

  // Allow runtime toggle (UI or settings) to prefer pedometer when available.
  public async setUsePedometer(enabled: boolean) {
    this.usingPedometer = !!enabled;
    if (this.usingPedometer && this.tracking && this.pedometerAvailable) {
      await this.startPedometerUpdates();
    } else {
      await this.stopPedometerUpdates();
    }
  }

  private processNewPosition(position: Position) {
    const newPoint = {
      lat: position.coords.latitude,
      lng: position.coords.longitude
    };

    const newTimestamp = (position && position.timestamp) ? Number(position.timestamp) : Date.now();

    if (this.lastPosition) {
      // Calcula a distância do último ponto para o novo
      const segmentDistance = this.calculateHaversineDistance(this.lastPosition, newPoint);


      // compute delta time and speed
      const dtMs = (this.lastTimestamp && newTimestamp) ? (newTimestamp - this.lastTimestamp) : 0;
      const dtSec = dtMs > 0 ? dtMs / 1000 : 0.0;
      // Prefer reported speed from the GPS device if available (m/s). Fallback to computed speed.
      const reportedSpeed = (position && position.coords && (position as any).coords.speed) ? Number((position as any).coords.speed) : null;
      const speed = (reportedSpeed !== null && !isNaN(reportedSpeed) && reportedSpeed >= 0) ? reportedSpeed : (dtSec > 0 ? (segmentDistance / dtSec) : 0);
      // publish diagnostics sample
      try { this._diagnostics.next({ accuracy: (position as any)?.coords?.accuracy, speed, segmentDistance, pendingDistance: this.pendingDistance, consecutiveGoodSegments: this.consecutiveGoodSegments }); } catch (e) { /* ignore */ }

      // ignore extremely frequent samples — they often indicate hardware noise
      if (dtSec > 0 && dtSec < this.MIN_SAMPLE_DT_SEC) {
        try { this._diagnostics.next({ lastAction: 'sample-too-frequent', dtSec, speed, segmentDistance }); } catch (e) {}
        this.lastTimestamp = newTimestamp;
        try { this._position.next(newPoint); } catch (e) { /* ignore */ }
        return;
      }

      // NOVO: só conta passos se velocidade estiver na faixa típica de caminhada
      if (speed < this.MIN_WALK_SPEED_M_S || speed > this.MAX_WALK_SPEED_M_S) {
        // expõe ponto para UI, mas não soma distância nem passos
        try { this._position.next(newPoint); } catch (e) { /* ignore */ }
        this.lastTimestamp = newTimestamp;
        try { this._diagnostics.next({ lastAction: 'speed-out-of-range', speed, accuracy: (position as any)?.coords?.accuracy, segmentDistance }); } catch(e){}
        return;
      }

      // Ignore unrealistic spikes (likely GPS glitches)
      if (speed > this.MAX_SPEED_M_S) {
        try { this._position.next(newPoint); } catch (e) { /* ignore */ }
        // expire stale pending buffer if present
        if (this.pendingSince && (newTimestamp - this.pendingSince) > this.PENDING_EXPIRE_MS) {
          this.pendingDistance = 0;
          this.pendingSince = null;
        }
        this.lastTimestamp = newTimestamp;
        return;
      }

      // Ignore poor accuracy samples — don't count distance/steps when accuracy is too low
      const accuracy = (position && position.coords && (position as any).coords.accuracy) ? Number((position as any).coords.accuracy) : null;
      if (accuracy !== null && accuracy > this.MAX_ACCEPTABLE_ACCURACY_M) {
        // expose point to UI (so user sees location) but do not add to pending or commit
        try { this._position.next(newPoint); } catch (e) { /* ignore */ }
        // reset any pending sequences when accuracy is unreliable
        this.pendingDistance = 0;
        this.pendingSince = null;
        this.consecutiveGoodSegments = 0;
        try { this._diagnostics.next({ lastAction: 'poor-accuracy', accuracy, segmentDistance }); } catch(e){}
        this.lastTimestamp = newTimestamp;
        return;
      }

      // Buffer very small segments to avoid jitter-triggered steps
      if (segmentDistance < this.MIN_MOVEMENT_THRESHOLD_M) {
        // start pending if not yet active
        if (!this.pendingSince) this.pendingSince = newTimestamp || Date.now();
        this.pendingDistance += segmentDistance;
        // this small segment invalidates a streak of large/valid segments
        this.consecutiveGoodSegments = 0;

        // if pending has exceeded commit threshold and within window, commit
        if (this.pendingDistance >= this.PENDING_COMMIT_THRESHOLD_M && this.pendingSince && (newTimestamp - this.pendingSince) <= this.PENDING_TIME_WINDOW_MS) {
          // commit buffered movement
          const distanceToAdd = this.pendingDistance;
          this.currentTotalDistance += distanceToAdd;
          this.pendingDistance = 0;
          try { this._diagnostics.next({ lastAction: 'pending-commit', distanceToAdd }); } catch(e){}
          // on commit also reset consecutive segments streak
          this.consecutiveGoodSegments = 0;
          this.pendingSince = null;

          // commit position
          this.lastPosition = newPoint;
          try { this._position.next(newPoint); } catch (e) { /* ignore */ }
          try {
            this.pathPoints.push(newPoint);
            if (this.pathPoints.length > 2000) this.pathPoints.shift();
            this._path.next(this.pathPoints.slice());
          } catch(e) { /* ignore */ }
          this.updateActivityData();
          this.lastTimestamp = newTimestamp;
          return;
        }

        // If pending is too old, reset it (stale jitter)
        if (this.pendingSince && (newTimestamp - this.pendingSince) > this.PENDING_EXPIRE_MS) {
          this.pendingDistance = 0;
          this.pendingSince = null;
        }

        // expose latest point to UI but do not count distance yet
        try { this._position.next(newPoint); } catch (e) { /* ignore */ }
        try { this._diagnostics.next({ lastAction: 'pending-accumulate', pendingDistance: this.pendingDistance, pendingSince: this.pendingSince, segmentDistance }); } catch (e) {}
        this.lastTimestamp = newTimestamp;
        return; // wait for more movement
      }

      // Significant movement: but require that speed is within walking range
      // Confirm movement across a minimum number of consecutive valid samples
      if (!this.consecutiveGoodSegments) this.consecutiveGoodSegments = 0;
      this.consecutiveGoodSegments++;

      // if this single segment is very large (>= 2x threshold) accept immediately
      const distanceToAdd = segmentDistance + (this.pendingDistance || 0);
      const commitNow = (this.consecutiveGoodSegments >= this.MIN_CONSECUTIVE_GOOD_SEGMENTS) || (segmentDistance >= (this.MIN_MOVEMENT_THRESHOLD_M * 2));
      if (!commitNow) {
        // hold it in pending until we see a confirmation segment
        if (!this.pendingSince) this.pendingSince = newTimestamp || Date.now();
        this.pendingDistance += segmentDistance;
        this.lastTimestamp = newTimestamp;
        try { this._position.next(newPoint); } catch (e) { /* ignore */ }
        try { this._diagnostics.next({ lastAction: 'waiting-confirmation', consecutiveGoodSegments: this.consecutiveGoodSegments, pendingDistance: this.pendingDistance }); } catch (e) {}
        return; // wait for confirmation
      }
      this.currentTotalDistance += distanceToAdd;
      try { this._diagnostics.next({ lastAction: 'commit-significant', distanceToAdd, consecutiveGoodSegments: this.consecutiveGoodSegments }); } catch(e){}
      // reset buffered
      this.pendingDistance = 0;
      this.consecutiveGoodSegments = 0;
      this.pendingSince = null;

      // Atualiza o último ponto para o próximo cálculo
      this.lastPosition = newPoint;
      this.lastTimestamp = newTimestamp;
      try { this._position.next(newPoint); } catch (e) { /* ignore */ }
      try {
        this.pathPoints.push(newPoint);
        if (this.pathPoints.length > 2000) this.pathPoints.shift();
        this._path.next(this.pathPoints.slice());
      } catch(e) { /* ignore */ }

      // update overall activity stats
      this.updateActivityData();
      return;
    }

    // no lastPosition yet — set it and expose initial point
    this.lastPosition = newPoint;
    try { this._position.next(newPoint); } catch (e) { /* ignore */ }
    try {
      this.pathPoints.push(newPoint);
      if (this.pathPoints.length > 2000) this.pathPoints.shift();
      this._path.next(this.pathPoints.slice());
    } catch(e) { /* ignore */ }
  }

  private updateActivityData() {
    // 1. Passos Estimados
    // If we are using pedometer data prefer that count — pedometer gives better native counts
    let passos = Math.round(this.currentTotalDistance / this.COMPRIMENTO_PASSADA_M);
    let distancia = this.currentTotalDistance;
    let source: 'gps'|'pedometer' = 'gps';
    if (this.pedometerAvailable && this.usingPedometer && this.pedometerStepsSinceStart > 0) {
      passos = this.pedometerStepsSinceStart;
      distancia = passos * this.COMPRIMENTO_PASSADA_M;
      source = 'pedometer';
    }

    // 2. Calorias (Estimativa simples baseada na distância e peso)
    // Usamos a estimativa: aprox. 1 kcal por quilômetro por quilograma de peso corporal.
    // Fórmula: Distância (km) * Peso (kg)
    const distanciaKm = this.currentTotalDistance / 1000;
    // ensure calories are computed from the active distance source (pedometer or GPS)
    const distanciaKmActive = distancia / 1000;
    const calorias = distanciaKmActive * this.PESO_KG; 

    this._atividadeData.next({
      distanciaMts: distancia,
      passosEstimados: passos,
      caloriasKcal: calorias,
      stepsSource: source,
      pedometerSteps: this.pedometerStepsSinceStart > 0 ? this.pedometerStepsSinceStart : undefined
    });
    // persist latest passosEstimados to localStorage so it can be synced to cloud
    try { localStorage.setItem('passosEstimados', String(passos)); } catch (e) { /* ignore */ }
  }

  // --- Pedometer plugin helpers ---
  private async initPedometerPlugin() {
    if (this.pedometerPlugin) return;
    try {
      // dynamic import so web builds won't require the native plugin to be installed
      // the @vite-ignore comment prevents Vite from trying to pre-resolve this import
      if (typeof window === 'undefined') throw new Error('no-window');
      // @ts-ignore: this may not exist in dev environment; load dynamically
      // Use a non-literal import target so bundlers that analyze literal imports
      // won't try to pre-resolve the module. This helps Vite to skip static
      // resolution when the dependency is not installed (typical during web dev).
      const pkgName = '@capgo/capacitor-pedometer';
      const mod = await import(/* @vite-ignore */ (pkgName as any));
      // get exported plugin object
      this.pedometerPlugin = (mod as any).CapacitorPedometer ?? (mod as any).default ?? mod;
      // check features
      try {
        const avail = await this.pedometerPlugin.isAvailable();
        this.pedometerAvailable = !!(avail && avail.stepCounting);
      } catch (e) {
        this.pedometerAvailable = false;
      }
    } catch (e) {
      this.pedometerAvailable = false; // plugin not installed or not supported in the current environment
      console.debug('Dynamic import of pedometer failed', e);
    }
  }

  private async startPedometerUpdates() {
    if (!this.pedometerPlugin || !this.pedometerAvailable) return;
    try {
      // request permissions if necessary
      try { await this.pedometerPlugin.requestPermissions(); } catch (e) { /* ignore */ }

      // ensure we start fresh for the session
      this.pedometerStartCount = null;
      this.pedometerLastCount = null;
      this.pedometerStepsSinceStart = 0;

      // add listener for measurement events
      this.pedometerListener = await this.pedometerPlugin.addListener('measurement', (ev: any) => {
        try {
          const count = Number(ev?.numberOfSteps ?? 0);
          // On Android, the sensor provides a cumulative counter — compute delta since session start
          if (this.pedometerStartCount === null) {
            this.pedometerStartCount = count;
            this.pedometerLastCount = count;
            this.pedometerStepsSinceStart = 0;
          } else {
            const last = this.pedometerLastCount ?? this.pedometerStartCount ?? 0;
            const delta = Math.max(0, count - last);
            this.pedometerLastCount = count;
            // use cumulative delta since session start
            this.pedometerStepsSinceStart = Math.max(0, count - (this.pedometerStartCount ?? 0));
            // sync with current distance so UI shows consistent values
            // we do not overwrite currentTotalDistance permanently — we prefer pedometer for display only
            this.updateActivityData();
          }
        } catch (e) { console.warn('pedometer measurement handler failed', e); }
      });

      // start native updates
      try { await this.pedometerPlugin.startMeasurementUpdates(); } catch (e) { /* ignore */ }
    } catch (e) {
      console.warn('Failed to enable pedometer updates', e);
    }
  }

  private async stopPedometerUpdates() {
    try {
      if (this.pedometerListener && typeof this.pedometerListener?.remove === 'function') {
        await this.pedometerListener.remove();
      } else if (this.pedometerPlugin && typeof this.pedometerPlugin.removeAllListeners === 'function') {
        try { await this.pedometerPlugin.removeAllListeners(); } catch (e) { /* ignore */ }
      }
      if (this.pedometerPlugin && typeof this.pedometerPlugin.stopMeasurementUpdates === 'function') {
        try { await this.pedometerPlugin.stopMeasurementUpdates(); } catch (e) { /* ignore */ }
      }
    } catch (e) {
      console.debug('stopPedometerUpdates ignored error', e);
    } finally {
      this.pedometerListener = null;
      // keep the last counts for later reference but do not reset start count here — reset only on new startTracking
    }
  }

  // For testing: increment the tracked distance by one average step
  // This simulates one step being taken and updates observers.
  public addTestStep(count = 1) {
    if (count <= 0) return;
    this.currentTotalDistance += this.COMPRIMENTO_PASSADA_M * count;
    this.updateActivityData();
  }

  // A FÓRMULA DE HAVERSINE COMPLETA para calcular a distância
  private calculateHaversineDistance(
    p1: { lat: number, lng: number },
    p2: { lat: number, lng: number }
  ): number {
    const R = 6371e3; // Raio da Terra em metros
    const lat1 = p1.lat * (Math.PI / 180);
    const lat2 = p2.lat * (Math.PI / 180);
    const deltaLat = (p2.lat - p1.lat) * (Math.PI / 180);
    const deltaLon = (p2.lng - p1.lng) * (Math.PI / 180);

    const a =
      Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
      Math.cos(lat1) * Math.cos(lat2) *
      Math.sin(deltaLon / 2) * Math.sin(deltaLon / 2);
    
    // ⭐️ O erro estava aqui. Esta linha completa a fórmula.
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    
    return R * c; // Distância em metros
  }

  // Método de verificação de estado, essencial para o componente
  public isTracking(): boolean {
    return this.tracking;
  }

  // public accessors to expose pedometer status to UI
  public isPedometerSupported(): boolean {
    return this.pedometerAvailable;
  }

  public isUsingPedometer(): boolean {
    return this.usingPedometer;
  }

  // Public helper to initialize the pedometer plugin (safe to call from UI)
  public async ensurePedometerInitialized(): Promise<boolean> {
    try {
      await this.initPedometerPlugin();
    } catch (e) { /* ignore */ }
    return this.pedometerAvailable;
  }
}