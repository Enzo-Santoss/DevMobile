import { Injectable } from '@angular/core';
import { Auth, GoogleAuthProvider, signInWithPopup, signOut, User } from '@angular/fire/auth';
import { BehaviorSubject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private userSource = new BehaviorSubject<User | null>(null);
  user$ = this.userSource.asObservable();

  constructor(private auth: Auth) {
    this.auth.onAuthStateChanged(user => this.userSource.next(user));
  }

  async googleLogin() {
    const provider = new GoogleAuthProvider();
    const result = await signInWithPopup(this.auth, provider);
    this.userSource.next(result.user);
    return result.user;
  }

  async logout() {
    await signOut(this.auth);
    this.userSource.next(null);
  }

  get currentUser(): User | null {
    return this.auth.currentUser;
  }
}
