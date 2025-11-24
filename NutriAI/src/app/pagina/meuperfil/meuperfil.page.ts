import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup } from '@angular/forms';
import { IonContent, IonHeader, IonTitle, IonToolbar, IonMenuButton, IonCard, IonCardHeader, IonCardTitle, IonItem, IonSelect, IonSelectOption, IonTextarea, IonCardSubtitle, IonButton, IonList, IonInput } from '@ionic/angular/standalone';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { getFirestore, doc, getDoc } from 'firebase/firestore';
import { ProfileSyncService } from '../../services/profile-sync.service';
import { ToastController } from '@ionic/angular';




@Component({
  selector: 'app-meuperfil',
  templateUrl: './meuperfil.page.html',
  styleUrls: ['./meuperfil.page.scss'],
  standalone: true,
  imports: [IonContent, IonHeader, IonTitle, IonToolbar, CommonModule, ReactiveFormsModule, IonMenuButton, IonCard, IonCardHeader, IonCardTitle, IonItem, IonSelect, IonSelectOption, IonTextarea, IonCardSubtitle, IonButton, IonList, IonInput]
})
export class MeuperfilPage {

  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly profileSync = inject(ProfileSyncService);
  private readonly router = inject(Router);
  private readonly toastCtrl = inject(ToastController);

  profileForm: FormGroup;
  private uid?: string;
  private db = getFirestore();

  constructor() {
    this.profileForm = this.fb.group({
      nome: [''],
      email: [''],
      idade: [''],
      altura: [''],
      pesoAtual: [''],
      pesoDesejado: [''],
      objetivo: [''],
      nivelAtividade: ['']
    });
  }

  async ngOnInit() {
    this.auth.user$.subscribe(async user => {
      if (!user) {
        // redirect to login if not authenticated
        await this.router.navigate(['/login']);
        return;
      }
      this.uid = user.uid;
      // Prefill basic info from auth where possible
      this.profileForm.patchValue({ email: user.email ?? '', nome: user.displayName ?? '' });
      // Load saved profile from Firestore (collection 'profiles', doc = uid)
      try {
        const ref = doc(this.db, 'profiles', this.uid);
        const snap = await getDoc(ref);
        if (snap.exists()) {
          const data = snap.data() as any;
          // only set known fields
          this.profileForm.patchValue({
            nome: data['nome'] ?? this.profileForm.value.nome,
            email: data['email'] ?? this.profileForm.value.email,
            idade: data['idade'] ?? this.profileForm.value.idade,
            altura: data['altura'] ?? this.profileForm.value.altura,
            pesoAtual: data['pesoAtual'] ?? this.profileForm.value.pesoAtual,
            pesoDesejado: data['pesoDesejado'] ?? this.profileForm.value.pesoDesejado,
            objetivo: data['objetivo'] ?? this.profileForm.value.objetivo,
            nivelAtividade: data['nivelAtividade'] ?? this.profileForm.value.nivelAtividade
          });
          // restore backup values into localStorage so app picks them up
          try {
            if (data['localFavorites']) {
              localStorage.setItem('localFavorites', JSON.stringify(data['localFavorites']));
            }
            if (typeof data['metaPassos'] !== 'undefined') {
              localStorage.setItem('metaPassos', String(data['metaPassos']));
            }
            if (typeof data['hidratacaoMeta'] !== 'undefined') {
              localStorage.setItem('hidratacao_meta', String(data['hidratacaoMeta']));
            }
          } catch (e) {
            console.warn('Failed to restore local backup values to localStorage', e);
          }
        }
      } catch (e) {
        console.warn('Failed to load profile from Firestore', e);
      }
    });
  }

  async saveProfile() {
    if (!this.uid) return;
    const payload = { ...this.profileForm.value };
    // Use ProfileSyncService which handles offline persistence and upload-on-connectivity
    try {
      const localFavRaw = localStorage.getItem('localFavorites');
      const localFav = localFavRaw ? JSON.parse(localFavRaw) : [];
      const metaPassosRaw = localStorage.getItem('metaPassos');
      const metaPassos = metaPassosRaw ? Number(metaPassosRaw) : undefined;
      const hidratacaoMetaRaw = localStorage.getItem('hidratacao_meta');
      const hidratacaoMeta = hidratacaoMetaRaw ? Number(hidratacaoMetaRaw) : undefined;

      const fullPayload: any = { ...payload };
      if (Array.isArray(localFav) && localFav.length) fullPayload.localFavorites = localFav;
      if (typeof metaPassos !== 'undefined' && !isNaN(metaPassos)) fullPayload.metaPassos = metaPassos;
      if (typeof hidratacaoMeta !== 'undefined' && !isNaN(hidratacaoMeta)) fullPayload.hidratacaoMeta = hidratacaoMeta;

      const savedToServer = await this.profileSync.saveProfilePayload(fullPayload);
      if (savedToServer === true) {
        const t = await this.toastCtrl.create({ message: 'Perfil salvo no servidor.', duration: 2000, color: 'success' });
        await t.present();
      } else if (savedToServer === false) {
        const t = await this.toastCtrl.create({ message: 'Offline: perfil salvo localmente. Será enviado ao reconectar.', duration: 3500, color: 'warning' });
        await t.present();
      } else {
        // undefined means no uid / saved to a general pending key
        const t = await this.toastCtrl.create({ message: 'Perfil salvo localmente.', duration: 2500 });
        await t.present();
      }
    } catch (e) {
      console.error('Failed to save profile', e);
      const t = await this.toastCtrl.create({ message: 'Falha ao salvar o perfil.', duration: 3000, color: 'danger' });
      await t.present();
    }
  }

}