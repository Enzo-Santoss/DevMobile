import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {IonContent,IonHeader,IonTitle,IonToolbar,IonMenuButton,IonCard,IonCardContent,IonCardTitle,IonCardHeader,IonButton,ToastController, IonIcon, IonSegment, IonSegmentButton} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { add, trash, water } from 'ionicons/icons';
import { ProfileSyncService } from '../../services/profile-sync.service';


@Component({
  selector: 'app-hidratacao',
  templateUrl: './hidratacao.page.html',
  styleUrls: ['./hidratacao.page.scss'],
  standalone: true,
  imports: [IonContent,IonHeader,IonTitle,IonToolbar,CommonModule,FormsModule,IonMenuButton,IonCard,IonCardContent,IonCardTitle,IonCardHeader,IonButton,IonIcon,IonSegment,IonSegmentButton]
})
export class HidratacaoPage implements OnInit {
  metaDiaria = 4000; // Meta de 4.0L (em ml)
  consumoAtual = 0; // Já consumido (1L)
  opcoes = [100, 200, 500, 1000]; // Botões de adição
  editandoMeta = false;
  metaLitrosSelecionado = 4; // valor default em litros
  logHidratacao: { data: string, consumo: number, meta: number }[] = [];
  confirmandoLimpar = false;
  private _limparTimeout: any;

  private readonly toastCtrl = inject(ToastController);
  private readonly profileSync = inject(ProfileSyncService);

  constructor() {
    addIcons({ water, add, trash });
  }

  adicionarAgua(qtd: number) {
    this.consumoAtual = this.consumoAtual + qtd;
    this.salvarConsumo();
  }

  async removerAgua(qtd: number) {
    this.consumoAtual = Math.max(this.consumoAtual - qtd, 0);
    // Só mostra toast se salvou localmente (offline)
    if (!navigator.onLine) {
      const toast = await this.toastCtrl.create({
        message: `Você removeu ${qtd}ml de água`,
        duration: 2500,
        color: 'warning',
        position: 'bottom',
      });
      await toast.present();
    }
    this.salvarConsumo();
  }

  atualizarMetaLitros() {
    this.metaDiaria = this.metaLitrosSelecionado * 1000;
    localStorage.setItem('hidratacao_meta', String(this.metaDiaria));
    this.editandoMeta = false;
    // Se consumo atual for maior que nova meta, não zera, só mantém
    this.salvarConsumo();
  }

  salvarConsumo() {
    try { localStorage.setItem('hidratacao_consumo', String(this.consumoAtual)); } catch (e) { }
    this.salvarLogDiario();
    try { this.profileSync.syncLocalStorageToServer(); } catch (e) { console.warn('ProfileSync failed', e); }
  }

  salvarLogDiario() {
    const hoje = this.dataHoje();
    let logs: any[] = [];
    try {
      logs = JSON.parse(localStorage.getItem('hidratacao_log') || '[]');
    } catch (e) { logs = []; }
    // Remove log do dia atual se já existir
    logs = logs.filter((l: any) => l.data !== hoje);
    logs.unshift({ data: hoje, consumo: this.consumoAtual, meta: this.metaDiaria });
    // Mantém só últimos 10 dias
    logs = logs.slice(0, 10);
    localStorage.setItem('hidratacao_log', JSON.stringify(logs));
    this.logHidratacao = logs;
  }

  dataHoje(): string {
    const d = new Date();
    return d.toLocaleDateString('pt-BR');
  }

  resetarSeMeiaNoite() {
    // Checa se já existe log para hoje, se não, reseta consumo
    const hoje = this.dataHoje();
    let logs: any[] = [];
    try {
      logs = JSON.parse(localStorage.getItem('hidratacao_log') || '[]');
    } catch (e) { logs = []; }
    const existeHoje = logs.some((l: any) => l.data === hoje);
    if (!existeHoje) {
      this.consumoAtual = 0;
      this.salvarConsumo();
    }
  }

  avancarDia() {
    // Avança o dia para testes: adiciona um log fake do próximo dia e reseta consumo
    const hoje = new Date();
    const prox = new Date(hoje.getTime() + 24*60*60*1000);
    const proxData = prox.toLocaleDateString('pt-BR');
    let logs: any[] = [];
    try { logs = JSON.parse(localStorage.getItem('hidratacao_log') || '[]'); } catch (e) { logs = []; }
    logs = logs.filter((l: any) => l.data !== proxData);
    logs.unshift({ data: proxData, consumo: 0, meta: this.metaDiaria });
    logs = logs.slice(0, 10);
    localStorage.setItem('hidratacao_log', JSON.stringify(logs));
    this.logHidratacao = logs;
    this.consumoAtual = 0;
    localStorage.setItem('hidratacao_consumo', '0');
  }

  limparAgua() {
    if (!this.confirmandoLimpar) {
      this.confirmandoLimpar = true;
      this._limparTimeout = setTimeout(() => { this.confirmandoLimpar = false; }, 15000);
      return;
    }
    // Se já está confirmando, limpa de fato
    clearTimeout(this._limparTimeout);
    this.consumoAtual = 0;
    this.salvarConsumo();
    this.confirmandoLimpar = false;
  }
  cancelarLimpar() {
    this.confirmandoLimpar = false;
    clearTimeout(this._limparTimeout);
  }

  ngOnInit() {
    addIcons({ add, trash, water });
    // Carrega meta e consumo
    try {
      const rawCons = localStorage.getItem('hidratacao_consumo');
      const rawMeta = localStorage.getItem('hidratacao_meta');
      const rawLog = localStorage.getItem('hidratacao_log');
      if (rawCons) this.consumoAtual = Number(rawCons) || this.consumoAtual;
      if (rawMeta) {
        this.metaDiaria = Number(rawMeta) || this.metaDiaria;
        this.metaLitrosSelecionado = Math.round(this.metaDiaria / 1000);
      }
      if (rawLog) this.logHidratacao = JSON.parse(rawLog);
      // --- RESTORE HIDRATACAO LOG FROM PROFILE (FIRESTORE) IF EXISTS ---
      // This is set by meuperfil.page.ts after login/profile load
      const profileRaw = localStorage.getItem('profile');
      if (profileRaw) {
        try {
          const profile = JSON.parse(profileRaw);
          if (Array.isArray(profile.hidratacaoLog) && profile.hidratacaoLog.length) {
            // Save to localStorage and update UI
            localStorage.setItem('hidratacao_log', JSON.stringify(profile.hidratacaoLog));
            this.logHidratacao = profile.hidratacaoLog;
          }
        } catch (e) { /* ignore */ }
      }
    } catch (e) { }

    // Reset diário automático
    this.resetarSeMeiaNoite();
    // Checa a cada minuto se mudou o dia
    setInterval(() => this.resetarSeMeiaNoite(), 60 * 1000);
  }
}
