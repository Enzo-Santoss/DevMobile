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
import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonContent, IonHeader, IonInput, IonMenuButton, IonTitle, IonToolbar, IonButtons, IonCard, IonCardHeader, IonCardTitle, IonCardContent } from '@ionic/angular/standalone';
import { Observable } from 'rxjs';
import { Geolocation } from '@capacitor/geolocation';

// ⭐️ Importa o serviço e a interface de dados reativos
import { TrackerService, AtividadeData } from '../../services/tracker.service';

@Component({
  selector: 'app-atividade',
  templateUrl: './atividade.page.html',
  styleUrls: ['./atividade.page.scss'],
  standalone: true,
  // Mantendo todos os imports que você listou
  imports: [IonContent, IonHeader, IonTitle, IonToolbar, CommonModule, FormsModule, IonInput, IonMenuButton, IonButtons, IonCard, IonCardHeader, IonCardTitle, IonCardContent]
})
export class AtividadePage implements OnInit, OnDestroy {
  // Variável reativa para expor os dados para o HTML (usando o | async pipe)
  atividadeData$!: Observable<AtividadeData>;
  
  // Variável de estado para o botão Iniciar/Parar
  isTracking: boolean = false;
  
  // As variáveis originais não são mais necessárias se usarmos o Observable
  // passos: number = 0; 
  // calorias: number = 0;

  // ⚠️ O token do Google Fit não será usado na abordagem Capacitor Geolocation
  // token: string | null = null;

  // ⭐️ Injetando o TrackerService no construtor
  constructor(private trackerService: TrackerService) {}

  async ngOnInit() {
    // 1. Inicia a observação dos dados do serviço
    this.atividadeData$ = this.trackerService.atividadeData$;
    
    // 2. Verifica o estado atual do rastreamento (se a página for reaberta)
    this.isTracking = this.trackerService.isTracking();

    // 3. Verifica a permissão de localização
    await this.checkGeolocationPermissions();
    
    // ⚠️ Removido o código de acesso ao token, pois usaremos o Capacitor
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

  // ⭐️ Verifica permissões
  private async checkGeolocationPermissions() {
    try {
      const status = await Geolocation.checkPermissions();
      if (status.location !== 'granted') {
        console.log('Permissão de Geolocalização não concedida. Solicitando...');
        await Geolocation.requestPermissions();
      }
    } catch (e) {
        console.error('Erro ao verificar/solicitar permissão de GPS', e);
    }
  }

  // ⚠️ A função calcularCalorias agora fica dentro do TrackerService
  // e não é mais necessária aqui, pois o serviço envia o dado pronto.

  ngOnDestroy(): void {
    // Opcional: Para um app de faculdade, é mais seguro parar o rastreamento ao sair da página.
    if (this.isTracking) {
       this.trackerService.stopTracking();
    }
  }
}
