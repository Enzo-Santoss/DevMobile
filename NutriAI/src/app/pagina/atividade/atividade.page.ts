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
import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonContent, IonHeader, IonMenuButton, IonTitle, IonToolbar } from '@ionic/angular/standalone';
import { Observable, Subscription } from 'rxjs';
import { Geolocation } from '@capacitor/geolocation';
import { ToastController, PickerController } from '@ionic/angular';

// ⭐️ Importa o serviço e a interface de dados reativos
import { TrackerService, AtividadeData } from '../../services/tracker.service';
import { ProfileSyncService } from '../../services/profile-sync.service';

@Component({
  selector: 'app-atividade',
  templateUrl: './atividade.page.html',
  styleUrls: ['./atividade.page.scss'],
  standalone: true,
  imports: [IonContent, IonHeader, IonTitle, IonToolbar, CommonModule, FormsModule, IonMenuButton]
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

  // ⭐️ Injetando o TrackerService via inject()
  private readonly trackerService = inject(TrackerService);
  // Toast controller for user feedback
  private readonly toastCtrl = inject(ToastController);
  // Picker controller for wheel selector
  private readonly pickerCtrl = inject(PickerController);
  private readonly profileSync = inject(ProfileSyncService);

  // Meta de passos configurável pelo usuário
  metaPassos: number = 10000;
  // marca para evitar toasts repetidos quando a meta já foi atingida
  private metaReachedAlready = false;
  private atividadeSub?: Subscription;
  // controla se a entrada de meta está em modo edição
  metaEditing: boolean = false;

  async ngOnInit() {
    // 1. Inicia a observação dos dados do serviço
    this.atividadeData$ = this.trackerService.atividadeData$;
    
    // 2. Verifica o estado atual do rastreamento (se a página for reaberta)
    this.isTracking = this.trackerService.isTracking();

    // 3. Verifica a permissão de localização
    await this.checkGeolocationPermissions();
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
          this.presentToast('Parabéns! Meta atingida!', 3500);
        }
        if (percent < 100 && this.metaReachedAlready) {
          // reset para permitir novo toast quando meta for novamente atingida
          this.metaReachedAlready = false;
        }
      } catch (e) {
        console.warn('Erro ao processar progresso da meta', e);
      }
    });
    
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
    if (this.atividadeSub) {
      this.atividadeSub.unsubscribe();
      this.atividadeSub = undefined;
    }
  }

  saveMeta() {
    try {
      const v = Number(this.metaPassos) || 0;
      this.metaPassos = v;
      localStorage.setItem('metaPassos', String(v));
      // ao salvar, sair do modo edição
      this.metaEditing = false;
      this.presentToast('Meta salva com sucesso');
      // attempt to sync backup to server (offline-aware)
      try { this.profileSync.syncLocalStorageToServer(); } catch (e) { console.warn('ProfileSync sync failed', e); }
    } catch (e) {
      console.warn('Falha ao salvar metaPassos', e);
      this.presentToast('Falha ao salvar a meta');
    }
  }

  enableMetaEdit() {
    // fallback to picker on mobile — present picker wheel
    this.showMetaPicker();
  }

  saveAndClose() {
    this.saveMeta();
    this.metaEditing = false;
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
    } catch (e) {
      console.warn('Failed to present picker', e);
      // fallback: enable input edit
      this.metaEditing = true;
      setTimeout(() => {
        const el = document.getElementById('meta-input') as HTMLInputElement | null;
        if (el) el.focus();
      }, 50);
    }
  }
}
