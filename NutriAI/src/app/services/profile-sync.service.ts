import { Injectable, inject } from '@angular/core';
import { AuthService } from './auth.service';
import { getFirestore, doc, setDoc } from 'firebase/firestore';

@Injectable({ providedIn: 'root' })
export class ProfileSyncService {
  private readonly auth = inject(AuthService);
  private db = getFirestore();
  private uid: string | undefined;

  constructor() {
    // keep current uid updated
    this.auth.user$.subscribe(u => { this.uid = u?.uid; });

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

    const payload: any = { ...extra };
    if (Array.isArray(localFav) && localFav.length) payload.localFavorites = localFav;
    if (typeof metaPassos !== 'undefined' && !isNaN(metaPassos)) payload.metaPassos = metaPassos;
    if (typeof hidratacaoMeta !== 'undefined' && !isNaN(hidratacaoMeta)) payload.hidratacaoMeta = hidratacaoMeta;

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
