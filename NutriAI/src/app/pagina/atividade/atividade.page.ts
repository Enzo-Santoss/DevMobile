import { interval, Subscription as RxSubscription } from 'rxjs';
/*import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonContent, IonHeader, IonInput, IonMenuButton, IonTitle, IonToolbar,IonButtons, IonCard, IonCardHeader, IonCardTitle, IonCardContent } from '@ionic/angular/standalone';

@Component({
  selector: 'app-atividade',
  templateUrl: './atividade.page.html',
  styleUrls: ['./atividade.page.scss'],
  standalone: true,
  imports: [IonContent, IonHeader, IonTitle, IonToolbar, CommonModule, FormsModule,IonInput,IonMenuButton,IonButtons, IonCard, IonCardHeader, IonCardTitle, IonCardContent]
})
export class AtividadePage implements OnInit {
  passos: number = 0;
  calorias: number = 0;
  token: string | null = null;

  constructor() {}

  ngOnInit() {
    this.token = localStorage.getItem('google_token'); // salvo após login
    if (this.token) {
      const end = Date.now();
      const start = end - (24 * 60 * 60 * 1000); // últimas 24h

    }
  }

  calcularCalorias(passos: number, pesoKg: number = 70): number {
    const metrosPorPasso = 0.78;
    const distanciaKm = (passos * metrosPorPasso) / 1000;
    return distanciaKm * pesoKg * 1.036;
  }
}*/
import { Component, OnInit, OnDestroy, AfterViewInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonContent, IonHeader, IonMenuButton, IonTitle, IonToolbar, IonFooter, IonButton, IonToggle } from '@ionic/angular/standalone';
import { Observable, Subscription } from 'rxjs';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { Geolocation } from '@capacitor/geolocation';
import * as Leaflet from 'leaflet';
import { ToastController, PickerController } from '@ionic/angular';

// ⭐️ Importa o serviço e a interface de dados reativos
import { TrackerService, AtividadeData } from '../../services/tracker.service';
import { ProfileSyncService } from '../../services/profile-sync.service';

@Component({
  selector: 'app-atividade',
  templateUrl: './atividade.page.html',
  styleUrls: ['./atividade.page.scss'],
  standalone: true,
  imports: [IonContent, IonHeader, IonTitle, IonToolbar, IonFooter, IonButton, CommonModule, FormsModule, IonMenuButton, IonToggle]
})
export class AtividadePage implements OnInit, AfterViewInit, OnDestroy {
  // Variável reativa para expor os dados para o HTML (usando o | async pipe)
  atividadeData$!: Observable<AtividadeData>;
  
  // Variável de estado para o botão Iniciar/Parar
  isTracking: boolean = false;
  
    // Intervalo para atualização dos status
    private statusIntervalSub?: RxSubscription;
  // As variáveis originais não são mais necessárias se usarmos o Observable
  // passos: number = 0; 
  // calorias: number = 0;

  // ⚠️ O token do Google Fit não será usado na abordagem Capacitor Geolocation
  // token: string | null = null;

  // ⭐️ Injetando o TrackerService via inject()
  private readonly trackerService = inject(TrackerService);
  // Toast controller for user feedback
  private readonly toastCtrl = inject(ToastController);
  // Picker controller for wheel selector
  private readonly pickerCtrl = inject(PickerController);
  private readonly profileSync = inject(ProfileSyncService);
  private readonly sanitizer = inject(DomSanitizer);
  // leaflet map references (created when running in webview with Leaflet loaded)
  private map: any = null;
  private trackMarker: any = null;
  private trackPolyline: any = null;

  // Meta de passos configurável pelo usuário
  metaPassos: number = 10000;
  // presets for quick selection (similar to hidratação UI style)
  metaOptions = [5000, 7000, 10000, 12000, 15000];
  
  // marca para evitar toasts repetidos quando a meta já foi atingida
  private metaReachedAlready = false;
  // pedometer UI state
  pedometerAvailable: boolean = false;
  usePedometer: boolean = false;
  // connection & hardware statuses
  isOnline: boolean = (typeof navigator !== 'undefined') ? !!navigator.onLine : true;
  gpsActive: boolean = false;
  private _onOffline: (() => void) | undefined;
  private atividadeSub?: Subscription;
  private positionSub?: Subscription;
  private pathSub?: Subscription;
  private diagnosticsSub?: Subscription;
  private _onVisibilityChange: (() => void) | undefined;
  private _onOnline: (() => void) | undefined;
  // current location and iframe url for OSM embed
  currentLat: number | null = null;
  currentLng: number | null = null;
  // true when the map is showing the Rio de Janeiro center because GPS isn't available
  mapFallbackRJ: boolean = false;
  // Optional debug UI — enable by setting localStorage.setItem('activity_debug','1') in the device's webview/devtools
  debugMode: boolean = false;
  lastDiagnostics: any = null;
  safeMapUrl: SafeResourceUrl | null = null;
  // whether Leaflet has been loaded and initialized
  leafletAvailable: boolean = false;
  // if Leaflet is not available, render iframe as fallback
  showIframeFallback: boolean = false;
  // controla se a entrada de meta está em modo edição
  metaEditing: boolean = false;

  async ngOnInit() {
    // 1. Inicia a observação dos dados do serviço
    this.atividadeData$ = this.trackerService.atividadeData$;
    
    // 2. Verifica o estado atual do rastreamento (se a página for reaberta)
    this.isTracking = this.trackerService.isTracking();

    // 3. Verifica a permissão de localização e inicia rastreamento automaticamente se já tiver permissão
    try {
      const granted = await this.checkGeolocationPermissions();
      if (granted && !this.isTracking) {
        // inicia automaticamente para facilitar testes e uso real
        this.toggleTracking();
      }
    } catch (e) {
      console.warn('Erro avaliando permissões de localização', e);
    }

      // optionally enable debug UI
      try { this.debugMode = localStorage.getItem('activity_debug') === '1'; } catch(e) { this.debugMode = false; }
      if (this.debugMode) {
        this.diagnosticsSub = this.trackerService.diagnostics$.subscribe(d => { this.lastDiagnostics = d; });
      }

      // Inicia atualização periódica dos status
      this.statusIntervalSub = interval(2000).subscribe(() => {
        this.isOnline = (typeof navigator !== 'undefined') ? !!navigator.onLine : true;
        this.gpsActive = !!(this.trackerService.position$ && this.currentLat !== null && this.currentLng !== null);
        this.pedometerAvailable = this.trackerService['pedometerAvailable'] ?? false;
        this.usePedometer = this.trackerService.isUsingPedometer ? this.trackerService.isUsingPedometer() : this.usePedometer;
      });
    // Attempt to keep tracking active whenever possible: resume on visibility and when going online
    this._onVisibilityChange = async () => {
      try {
        if (!document.hidden && !this.isTracking) {
          const granted = await this.checkGeolocationPermissions();
          if (granted) {
            await this.trackerService.startTracking();
            this.isTracking = true;
          }
        }
      } catch (err) { console.warn('visibility handler failed', err); }
    };

    this._onOnline = async () => {
      try {
        // mark online (UI) and attempt to resume tracking
        this.isOnline = true;
        if (!this.isTracking) {
          const granted = await this.checkGeolocationPermissions();
          if (granted) {
            await this.trackerService.startTracking();
            this.isTracking = true;
          }
        }
      } catch (err) { console.warn('online handler failed', err); }
    };

    if (this._onVisibilityChange) window.addEventListener('visibilitychange', this._onVisibilityChange as EventListener);
    if (this._onOnline) window.addEventListener('online', this._onOnline as EventListener);
    // create offline handler to display connection state
    this._onOffline = () => { this.isOnline = false; };
    window.addEventListener('offline', this._onOffline as EventListener);
    // carrega meta de passos salva localmente
    try {
      const raw = localStorage.getItem('metaPassos');
      if (raw) this.metaPassos = Number(raw) || this.metaPassos;
    } catch (e) {
      console.warn('Falha ao carregar metaPassos', e);
    }

    // Assina os dados para detectar quando a meta for atingida
    this.atividadeSub = this.atividadeData$.subscribe(d => {
      try {
        if (!d) return;
        const passos = Number(d.passosEstimados) || 0;
        const percent = this.metaPassos > 0 ? (passos / this.metaPassos) * 100 : 0;
        if (percent >= 100 && !this.metaReachedAlready) {
          this.metaReachedAlready = true;
          if (!navigator.onLine) this.presentToast('Parabéns! Meta atingida!', 3500);
        }
        if (percent < 100 && this.metaReachedAlready) {
          // reset para permitir novo toast quando meta for novamente atingida
          this.metaReachedAlready = false;
        }
      } catch (e) {
        console.warn('Erro ao processar progresso da meta', e);
      }
    });

    // Subscribe to position updates exposed by the tracker service so we can show a small map
    this.positionSub = this.trackerService.position$.subscribe(p => {
      try {
        if (!p) {
          this.currentLat = this.currentLng = null;
          // no position yet — show Rio de Janeiro as the small OSM fallback
          const rlat = -22.9068; const rlon = -43.1729;
          const delta = 0.02;
          const minLon = (rlon - delta).toFixed(6);
          const minLat = (rlat - delta).toFixed(6);
          const maxLon = (rlon + delta).toFixed(6);
          const maxLat = (rlat + delta).toFixed(6);
          const url = `https://www.openstreetmap.org/export/embed.html?bbox=${minLon}%2C${minLat}%2C${maxLon}%2C${maxLat}&layer=mapnik&marker=${rlat}%2C${rlon}`;
          this.safeMapUrl = this.sanitizer.bypassSecurityTrustResourceUrl(url);
          this.mapFallbackRJ = true;
          this.gpsActive = false;
          return;
        }
        // we have a real reading — disable fallback flag
        this.mapFallbackRJ = false;
        this.gpsActive = true;
        this.currentLat = Number(p.lat);
        this.currentLng = Number(p.lng);

        // build a small bbox around the point (0.01 deg ~ ~1.1km) and marker
        const lat = this.currentLat;
        const lon = this.currentLng;
        const delta = 0.01; // approximate bounding box size
        const minLon = (lon - delta).toFixed(6);
        const minLat = (lat - delta).toFixed(6);
        const maxLon = (lon + delta).toFixed(6);
        const maxLat = (lat + delta).toFixed(6);

        const url = `https://www.openstreetmap.org/export/embed.html?bbox=${minLon}%2C${minLat}%2C${maxLon}%2C${maxLat}&layer=mapnik&marker=${lat}%2C${lon}`;
        this.safeMapUrl = this.sanitizer.bypassSecurityTrustResourceUrl(url);
      } catch (e) {
        console.warn('Failed to set map URL', e);
        this.safeMapUrl = null;
      }
    });

    // polyline updates — listen to full path and update leaflet if initialized
    this.pathSub = this.trackerService.path$.subscribe(p => {
      try {
        if (!this.map) return;
        if (!Array.isArray(p) || !p.length) {
          // nothing to draw yet
          return;
        }
        // Convert to LatLng tuples
        const latlngs = p.map(pt => [pt.lat, pt.lng]);
        if (!this.trackPolyline) {
          // create polyline
          this.trackPolyline = (window as any).L.polyline(latlngs, { color: '#2dd55b', weight: 4 }).addTo(this.map);
        } else {
          this.trackPolyline.setLatLngs(latlngs);
        }
        // update marker to last
        const last = latlngs[latlngs.length - 1];
        if (last) {
          if (!this.trackMarker) {
            this.trackMarker = (window as any).L.circleMarker(last, { radius: 6, color: '#0b2b16', fillColor: '#2dd55b', fillOpacity: 0.9 }).addTo(this.map);
          } else {
            this.trackMarker.setLatLng(last);
          }
        }
        // keep map view in bounds of the track
        try { this.map.fitBounds(this.trackPolyline.getBounds(), { padding: [40, 40] }); } catch(e) { /* ignore */ }
      } catch (e) {
        console.warn('Failed to update polyline', e);
      }
    });



    // If we don't have a map URL yet, try to get a quick current position to display immediately
    try {
      if (!this.safeMapUrl) {
        const cur = await Geolocation.getCurrentPosition({ enableHighAccuracy: true, timeout: 8000 });
        if (cur && cur.coords) {
          const lat = Number(cur.coords.latitude);
          const lon = Number(cur.coords.longitude);
          this.gpsActive = true;
          this.currentLat = lat;
          this.currentLng = lon;
          const delta = 0.01;
          const minLon = (lon - delta).toFixed(6);
          const minLat = (lat - delta).toFixed(6);
          const maxLon = (lon + delta).toFixed(6);
          const maxLat = (lat + delta).toFixed(6);
          const url = `https://www.openstreetmap.org/export/embed.html?bbox=${minLon}%2C${minLat}%2C${maxLon}%2C${maxLat}&layer=mapnik&marker=${lat}%2C${lon}`;
          this.safeMapUrl = this.sanitizer.bypassSecurityTrustResourceUrl(url);
        }
      }
    } catch (e) {
      // if GPS is unavailable or permission denied this will simply fail silently
      console.debug('Initial getCurrentPosition failed (non-blocking)', e);
      // fallback to Rio de Janeiro center so the map still displays
      try {
        const rlat = -22.9068; const rlon = -43.1729; // Rio de Janeiro center
        const delta = 0.02; // bounding box size for city view
        const minLon = (rlon - delta).toFixed(6);
        const minLat = (rlat - delta).toFixed(6);
        const maxLon = (rlon + delta).toFixed(6);
        const maxLat = (rlat + delta).toFixed(6);
        const url = `https://www.openstreetmap.org/export/embed.html?bbox=${minLon}%2C${minLat}%2C${maxLon}%2C${maxLat}&layer=mapnik&marker=${rlat}%2C${rlon}`;
        this.safeMapUrl = this.sanitizer.bypassSecurityTrustResourceUrl(url);
        this.mapFallbackRJ = true;
        this.gpsActive = false;
      } catch(e2) { /* ignore */ }
    }
    // no-op for submeta (removed)
    
    // ⚠️ Removido o código de acesso ao token, pois usaremos o Capacitor
    // try to initialize pedometer plugin so UI can show availability and allow toggling
    try {
      const avail = await this.trackerService.ensurePedometerInitialized();
      this.pedometerAvailable = !!avail;
      // Restore saved user preference for pedometer if present — default to service state if missing
      try {
        const rawPref = localStorage.getItem('usePedometer');
        if (rawPref !== null) {
          this.usePedometer = (rawPref === '1' || rawPref === 'true');
        } else {
          this.usePedometer = this.trackerService.isUsingPedometer();
        }
      } catch (e) {
        this.usePedometer = this.trackerService.isUsingPedometer();
      }
      // Propagate preference to tracker service (it will start/stop native updates if running)
      try { await this.trackerService.setUsePedometer(!!this.usePedometer); } catch (e) { /* ignore */ }
    } catch (e) {
      this.pedometerAvailable = false;
      this.usePedometer = false;
    }
  }

  ngAfterViewInit(): void {
    // Wait for Leaflet to appear on the page. If it doesn't, show the iframe fallback.
    // prefer the bundled Leaflet module when available
    const bundledL = (typeof Leaflet !== 'undefined' ? Leaflet : null);
    this.waitForLeaflet(bundledL, 12, 250).then(L => {
      if (!L) {
        this.leafletAvailable = false;
        this.showIframeFallback = true;
        // ensure we have a safeMapUrl fallback (Rio) when leaflet is missing
        if (!this.safeMapUrl) {
          try {
            const rlat = -22.9068; const rlon = -43.1729; // Rio de Janeiro
            const delta = 0.02;
            const minLon = (rlon - delta).toFixed(6);
            const minLat = (rlat - delta).toFixed(6);
            const maxLon = (rlon + delta).toFixed(6);
            const maxLat = (rlat + delta).toFixed(6);
            const url = `https://www.openstreetmap.org/export/embed.html?bbox=${minLon}%2C${minLat}%2C${maxLon}%2C${maxLat}&layer=mapnik&marker=${rlat}%2C${rlon}`;
            this.safeMapUrl = this.sanitizer.bypassSecurityTrustResourceUrl(url);
            this.mapFallbackRJ = true;
          } catch(e) { /* ignore */ }
        }
        return;
      }
      try {
        this.leafletAvailable = true;
        this.showIframeFallback = false;

        const RJ_CENTER: [number, number] = [-22.9068, -43.1729];
        const initialCenter = (this.currentLat !== null && this.currentLng !== null)
          ? [this.currentLat, this.currentLng]
          : RJ_CENTER;
        const initialZoom = (this.currentLat !== null && this.currentLng !== null) ? 15 : 12;
        this.mapFallbackRJ = !(this.currentLat !== null && this.currentLng !== null);

        this.initLeafletMap(L, initialCenter as any, initialZoom);
      } catch (e) {
        console.debug('Leaflet initialization failed', e);
        this.leafletAvailable = false;
        this.showIframeFallback = true;
      }
    });
  }

  private initLeafletMap(L: any, initialCenter: [number, number], initialZoom: number) {
    this.map = L.map('leafletMap', { center: initialCenter, zoom: initialZoom, preferCanvas: true });
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '© OpenStreetMap' }).addTo(this.map);

    this.trackPolyline = L.polyline([], { color: '#2dd55b', weight: 4 }).addTo(this.map);
    this.trackMarker = L.circleMarker(initialCenter as any, { radius: 6, color: '#0b2b16', fillColor: '#2dd55b', fillOpacity: 0.95 }).addTo(this.map);

    try {
      const maybePath = (this.trackerService as any)._path?.value ?? [];
      if (Array.isArray(maybePath) && maybePath.length) {
        const latlngs = maybePath.map((pt: any) => [pt.lat, pt.lng]);
        this.trackPolyline.setLatLngs(latlngs);
        const last = latlngs[latlngs.length - 1];
        if (last) this.trackMarker.setLatLng(last);
        try { this.map.fitBounds(this.trackPolyline.getBounds(), { padding: [40, 40] }); } catch(e) { /* ignore */ }
      }
    } catch(e) { /* ignore */ }

    // ensure map layout when component becomes visible
    setTimeout(() => { try { this.map.invalidateSize(); } catch(e) {} }, 300);
  }

  private async waitForLeaflet(bundled: any|null, retries = 8, intervalMs = 300): Promise<any> {
    if (bundled) return bundled;
    for (let i = 0; i < retries; i++) {
      const L = (window as any).L;
      if (L) return L;
      await new Promise(r => setTimeout(r, intervalMs));
    }
    return null;
  }
  
  // ⭐️ Função que chama o serviço para iniciar ou parar o rastreamento
  toggleTracking() {
    if (this.isTracking) {
      this.trackerService.stopTracking();
      this.isTracking = false;
    } else {
      // Inicia o rastreamento (que já solicita permissão se necessário)
      this.trackerService.startTracking();
      this.isTracking = true;
    }
  }

  // Toggle whether we should use the native pedometer when available
  async toggleUsePedometer() {
    try {
      const newVal = !!this.usePedometer;
      await this.trackerService.setUsePedometer(newVal);
      this.usePedometer = newVal;
      // persist preference locally and attempt to sync with server backup
      try {
        localStorage.setItem('usePedometer', String(newVal));
        try { this.profileSync.syncLocalStorageToServer(); } catch (e) { /* ignore sync errors */ }
      } catch (e) { /* ignore localStorage error */ }
      if (!navigator.onLine) this.presentToast(newVal ? 'Usando pedômetro nativo' : 'Usando contagem por GPS', 1500);
      // confirm save
      try { if (navigator.onLine) this.presentToast('Preferência salva', 1100); } catch(e){}
    } catch (e) {
      console.warn('Failed to toggle pedometer usage', e);
      this.presentToast('Falha ao ativar/desativar pedômetro', 1600);
    }
  }

  // ⭐️ Verifica permissões
  private async checkGeolocationPermissions(): Promise<boolean> {
    try {
      const status = await Geolocation.checkPermissions();
      if (status.location === 'granted') return true;
      // tenta solicitar permissões caso ainda não concedidas
      const req = await Geolocation.requestPermissions();
      return req.location === 'granted';
    } catch (e) {
      console.error('Erro ao verificar/solicitar permissão de GPS', e);
      return false;
    }
  }

  // ⚠️ A função calcularCalorias agora fica dentro do TrackerService
  // e não é mais necessária aqui, pois o serviço envia o dado pronto.

  ngOnDestroy(): void {
     // We intentionally DON'T stop tracking here — keep tracking running when possible per request
    if (this.atividadeSub) {
      this.atividadeSub.unsubscribe();
      this.atividadeSub = undefined;
    }
    // positionSub already unsubscribed above
    // remove global listeners
    try { if (this._onVisibilityChange) window.removeEventListener('visibilitychange', this._onVisibilityChange as EventListener); } catch (e) { /* ignore */ }
    try { if (this._onOnline) window.removeEventListener('online', this._onOnline as EventListener); } catch (e) { /* ignore */ }
    try { if (this._onOffline) window.removeEventListener('offline', this._onOffline as EventListener); } catch (e) { /* ignore */ }
    if (this.positionSub) {
      this.positionSub.unsubscribe();
      this.positionSub = undefined;
    }
      // Limpa o intervalo de atualização dos status
      if (this.statusIntervalSub) {
        this.statusIntervalSub.unsubscribe();
        this.statusIntervalSub = undefined;
      }
    if (this.pathSub) {
      this.pathSub.unsubscribe();
      this.pathSub = undefined;
    }
    if (this.diagnosticsSub) {
      this.diagnosticsSub.unsubscribe();
      this.diagnosticsSub = undefined;
    }
    // destroy leaflet map if present
    try { if (this.map) { (this.map as any).remove(); this.map = null; } } catch(e) { /* ignore */ }
  }

  saveMeta() {
    try {
      const v = Number(this.metaPassos) || 0;
      this.metaPassos = v;
      localStorage.setItem('metaPassos', String(v));
      // ao salvar, sair do modo edição
      this.metaEditing = false;
      if (!navigator.onLine) this.presentToast('Meta salva com sucesso');
      // attempt to sync backup to server (offline-aware)
      try { this.profileSync.syncLocalStorageToServer(); } catch (e) { console.warn('ProfileSync sync failed', e); }
    } catch (e) {
      console.warn('Falha ao salvar metaPassos', e);
      if (!navigator.onLine) this.presentToast('Falha ao salvar a meta');
    }
  }

  
  // Test helper: add one simulated step (increments distance by one passo)
  testStep() {
    try {
      this.trackerService.addTestStep(1);
      // quick feedback
      if (!navigator.onLine) this.presentToast('Passo adicionado (teste)', 800);
    } catch (e) {
      console.warn('Failed to add test step', e);
    }
  }

  enableMetaEdit() {
    // Sempre ativa input editável, independente de picker
    this.metaEditing = true;
    setTimeout(() => {
      const el = document.getElementById('meta-inline-input') as HTMLInputElement | null;
      if (el) el.focus();
    }, 50);
  }

  // quick-select a preset and save
  selectMetaPreset(v: number) {
    try {
      this.metaPassos = Number(v) || this.metaPassos;
      this.saveMeta();
      this.metaEditing = false;
    } catch (e) {
      console.warn('Failed to select meta preset', e);
    }
  }

  saveAndClose() {
    this.saveMeta();
    this.metaEditing = false;
  }

  centerToCurrent() {
    try {
      if (!this.map) return;
      if (this.currentLat === null || this.currentLng === null) return;
      try { this.map.setView([this.currentLat, this.currentLng], 15); } catch(e) { /* ignore */ }
      this.mapFallbackRJ = false;
    } catch (e) {
      console.warn('Failed to center map to current position', e);
    }
  }

  async presentToast(message: string, duration = 2000) {
    try {
      const t = await this.toastCtrl.create({
        message,
        duration,
        position: 'bottom'
      });
      await t.present();
    } catch (e) {
      console.warn('Toast failed', e);
    }
  }

  // Present a wheel-style picker for selecting meta passos
  async showMetaPicker() {
    try {
      // Build five columns, each 0..9 — representing digits (ten-thousands, thousands, hundreds, tens, units)
      const digits = Array.from({ length: 10 }, (_, i) => i); // 0..9

      // decompose current metaPassos into 5 digits
      const current = Math.max(0, Number(this.metaPassos) || 0);
      const d0 = Math.floor((current % 10));
      const d1 = Math.floor((current / 10) % 10);
      const d2 = Math.floor((current / 100) % 10);
      const d3 = Math.floor((current / 1000) % 10);
      const d4 = Math.floor((current / 10000) % 10);

      // Só tenta abrir picker se disponível (mobile). Se não, ativa input editável.
      if (typeof this.pickerCtrl?.create === 'function') {
        const picker = await this.pickerCtrl.create({
          columns: [
            { name: 'd4', options: digits.map(n => ({ text: String(n), value: n, selected: n === d4 })) },
            { name: 'd3', options: digits.map(n => ({ text: String(n), value: n, selected: n === d3 })) },
            { name: 'd2', options: digits.map(n => ({ text: String(n), value: n, selected: n === d2 })) },
            { name: 'd1', options: digits.map(n => ({ text: String(n), value: n, selected: n === d1 })) },
            { name: 'd0', options: digits.map(n => ({ text: String(n), value: n, selected: n === d0 })) }
          ],
          buttons: [
            { text: 'Cancelar', role: 'cancel' },
            {
              text: 'OK',
              handler: (selected: any) => {
                const d4v = Number(selected?.d4?.value ?? 0);
                const d3v = Number(selected?.d3?.value ?? 0);
                const d2v = Number(selected?.d2?.value ?? 0);
                const d1v = Number(selected?.d1?.value ?? 0);
                const d0v = Number(selected?.d0?.value ?? 0);
                const val = d4v*10000 + d3v*1000 + d2v*100 + d1v*10 + d0v;
                const final = Math.max(100, val);
                this.metaPassos = final;
                this.saveMeta();
              }
            }
          ]
        });
        await picker.present();
      } else {
        // fallback: enable input edit
        this.metaEditing = true;
        setTimeout(() => {
          const el = document.getElementById('meta-inline-input') as HTMLInputElement | null;
          if (el) el.focus();
        }, 50);
      }
    } catch (e) {
      console.warn('Failed to present picker', e);
      // fallback: enable input edit
      this.metaEditing = true;
      setTimeout(() => {
        const el = document.getElementById('meta-inline-input') as HTMLInputElement | null;
        if (el) el.focus();
      }, 50);
    }
  }
}
