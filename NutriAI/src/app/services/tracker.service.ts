// src/app/services/tracker.service.ts

import { Injectable, NgZone, inject } from '@angular/core';
import { Geolocation, Position, WatchPositionCallback } from '@capacitor/geolocation';
import { BehaviorSubject, Observable } from 'rxjs';

// Interface para os dados que vamos expor
export interface AtividadeData {
  distanciaMts: number;
  passosEstimados: number;
  caloriasKcal: number;
}

@Injectable({
  providedIn: 'root'
})
export class TrackerService {
  private tracking = false;
  private watchId: string | null = null;
  private lastPosition: { lat: number, lng: number } | null = null;
  private currentTotalDistance = 0;

  // Variável reativa para expor os dados da atividade para os componentes
  private _atividadeData = new BehaviorSubject<AtividadeData>({
    distanciaMts: 0,
    passosEstimados: 0,
    caloriasKcal: 0,
  });
  public atividadeData$: Observable<AtividadeData> = this._atividadeData.asObservable();

  // Constantes de conversão (você pode torná-las variáveis do usuário depois)
  private readonly COMPRIMENTO_PASSADA_M = 0.76; // Média de 76 cm
  private readonly PESO_KG = 70; // Peso base para o cálculo de calorias (Mude isso para um valor do usuário)

  private readonly zone = inject(NgZone);

  constructor() { }

  async startTracking() {
    if (this.tracking) return;
    this.tracking = true;
    this.currentTotalDistance = 0;
    this.lastPosition = null;
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
      // Tenta iniciar a observação da posição
      this.watchId = await Geolocation.watchPosition(options, watchCallback);
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
    console.log('Rastreamento de posição parado.');
  }

  private processNewPosition(position: Position) {
    const newPoint = {
      lat: position.coords.latitude,
      lng: position.coords.longitude
    };

    if (this.lastPosition) {
      // Calcula a distância do último ponto para o novo
      const segmentDistance = this.calculateHaversineDistance(this.lastPosition, newPoint);
      this.currentTotalDistance += segmentDistance;
      
      this.updateActivityData();
    }
    
    // Atualiza o último ponto para o próximo cálculo
    this.lastPosition = newPoint;
  }

  private updateActivityData() {
    // 1. Passos Estimados
    // Distância total / Comprimento médio da passada
    const passos = Math.round(this.currentTotalDistance / this.COMPRIMENTO_PASSADA_M);

    // 2. Calorias (Estimativa simples baseada na distância e peso)
    // Usamos a estimativa: aprox. 1 kcal por quilômetro por quilograma de peso corporal.
    // Fórmula: Distância (km) * Peso (kg)
    const distanciaKm = this.currentTotalDistance / 1000;
    const calorias = distanciaKm * this.PESO_KG; 

    this._atividadeData.next({
      distanciaMts: this.currentTotalDistance,
      passosEstimados: passos,
      caloriasKcal: calorias,
    });
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
}