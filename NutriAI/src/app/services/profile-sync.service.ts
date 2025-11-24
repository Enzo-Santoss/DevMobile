import { Injectable, inject } from '@angular/core';
import { AuthService } from './auth.service';
import { getFirestore, doc, setDoc } from 'firebase/firestore';

@Injectable({ providedIn: 'root' })
export class ProfileSyncService {
  private readonly auth = inject(AuthService);
  private db = getFirestore();
  private uid: string | undefined;

  constructor() {
    // Sync when app loads (if logged in)
    setTimeout(() => {
      this.syncLocalStorageToServer().catch(() => {});
    }, 500);

    // Sync when user logs in
    this.auth.user$.subscribe(async u => {
      const prev = this.uid;
      this.uid = u?.uid;
      if (this.uid && this.uid !== prev) {
        try { await this.uploadPendingForCurrentUser(); } catch(e){}
        try { await this.syncLocalStorageToServer(); } catch(e){}
      }
    });

    // Sync when app is closed or page is hidden
    window.addEventListener('beforeunload', () => {
      this.syncLocalStorageToServer();
    });

    // When connectivity is restored, attempt upload
    window.addEventListener('online', () => {
      this.uploadPendingForCurrentUser();
    });
  }

  // Save payload to Firestore if online, otherwise persist locally for later upload
  async saveProfilePayload(payload: any): Promise<boolean> {
    if (!this.uid) {
      // No authenticated user — store pending generally
      try { localStorage.setItem('profilePending_noauth', JSON.stringify(payload)); } catch(e) { /* ignore */ }
      return false;
    }

    const key = `profilePending_${this.uid}`;

    try {
      if (navigator.onLine) {
        const ref = doc(this.db, 'profiles', this.uid);
        await setDoc(ref, payload, { merge: true });
        try { localStorage.removeItem(key); } catch(e) {}
        return true; // saved to server
      } else {
        // store pending locally
        try { localStorage.setItem(key, JSON.stringify(payload)); } catch(e) { }
        return false; // saved only locally
      }
    } catch (e) {
      console.warn('ProfileSync: failed to save to Firestore, storing locally', e);
      try { localStorage.setItem(key, JSON.stringify(payload)); } catch(err) {}
      return false;
    }
  }

  // Build a payload from localStorage values and optional extra fields
  async syncLocalStorageToServer(extra: any = {}) {
    const localFavRaw = localStorage.getItem('localFavorites');
    const localFav = localFavRaw ? JSON.parse(localFavRaw) : [];
    const metaPassosRaw = localStorage.getItem('metaPassos');
    const metaPassos = metaPassosRaw ? Number(metaPassosRaw) : undefined;
    const hidratacaoMetaRaw = localStorage.getItem('hidratacao_meta');
    const hidratacaoMeta = hidratacaoMetaRaw ? Number(hidratacaoMetaRaw) : undefined;
    const hidratacaoConsumoRaw = localStorage.getItem('hidratacao_consumo');
    const hidratacaoConsumo = hidratacaoConsumoRaw ? Number(hidratacaoConsumoRaw) : undefined;
    const passosEstimadosRaw = localStorage.getItem('passosEstimados');
    const passosEstimados = passosEstimadosRaw ? Number(passosEstimadosRaw) : undefined;

    const payload: any = { ...extra };
    if (Array.isArray(localFav) && localFav.length) payload.localFavorites = localFav;
    if (typeof metaPassos !== 'undefined' && !isNaN(metaPassos)) payload.metaPassos = metaPassos;
    if (typeof hidratacaoMeta !== 'undefined' && !isNaN(hidratacaoMeta)) payload.hidratacaoMeta = hidratacaoMeta;
    if (typeof hidratacaoConsumo !== 'undefined' && !isNaN(hidratacaoConsumo)) payload.hidratacaoConsumo = hidratacaoConsumo;
    if (typeof passosEstimados !== 'undefined' && !isNaN(passosEstimados)) payload.passosEstimados = passosEstimados;

    // Salvar histórico de hidratação
    try {
      const hidratacaoLogRaw = localStorage.getItem('hidratacao_log');
      const hidratacaoLog = hidratacaoLogRaw ? JSON.parse(hidratacaoLogRaw) : [];
      if (Array.isArray(hidratacaoLog) && hidratacaoLog.length) payload.hidratacaoLog = hidratacaoLog;
    } catch (e) { /* ignore */ }

    await this.saveProfilePayload(payload);
  }

  // Try to upload any pending payload for the current user
  async uploadPendingForCurrentUser() {
    if (!this.uid) return;
    const key = `profilePending_${this.uid}`;
    const raw = localStorage.getItem(key);
    if (!raw) return;
    try {
      const payload = JSON.parse(raw);
      const ref = doc(this.db, 'profiles', this.uid);
      await setDoc(ref, payload, { merge: true });
      localStorage.removeItem(key);
    } catch (e) {
      console.warn('ProfileSync: failed to upload pending payload', e);
    }
  }
}
