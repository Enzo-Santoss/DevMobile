import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { 
  Auth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signOut, 
  User, 
  onAuthStateChanged,
  setPersistence, 
  browserLocalPersistence,
  signInAnonymously,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword
} from '@angular/fire/auth'; 
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private userSubject = new BehaviorSubject<User | null>(null);
  public user$ = this.userSubject.asObservable();

  private readonly auth = inject(Auth);
  private readonly router = inject(Router);

  constructor() {
    // Escuta as mudanças de estado do Firebase Auth
    onAuthStateChanged(this.auth, (user) => {
      this.userSubject.next(user);
      
      if (user) {
        // Redireciona para home ou dashboard após o login
        this.router.navigate(['/home']); 
      } else {
        // Redireciona para a tela de login se não houver usuário logado (ex: após logout)
        this.router.navigate(['/login']);
      }
    });
  }

  /**
   * Realiza o login com o Google usando um pop-up (signInWithPopup).
   * Este método é usado para contornar o erro 'redirect_uri_mismatch' em localhost.
   */
  async anonymousLogin(): Promise<User | null> {
    try {
      // Define a persistência para 'local'
      await setPersistence(this.auth, browserLocalPersistence);
      
      // Realiza o login anônimo
      const result = await signInAnonymously(this.auth);
      return result.user;
    } catch (error: any) {
      console.error('Erro no login anônimo:', error);
      throw error;
    }
  }

  async googleLogin(): Promise<User | null> {
    const provider = new GoogleAuthProvider();
    
    try {
      // 1. Define a persistência para 'local' (mantém o login até o usuário sair)
      await setPersistence(this.auth, browserLocalPersistence); 

      // 2. Executa o login com o pop-up
      const result = await signInWithPopup(this.auth, provider);
      
      // O onAuthStateChanged (no construtor) notifica os observers e cuida do redirecionamento
      return result.user;
    } catch (error) {
      console.error("Erro no login do Google:", error);
      // É importante relançar o erro para que o componente possa exibir uma mensagem
      throw error;
    }
  }

  /**
   * Envia e-mail para redefinição de senha usando Firebase
   */
  async sendPasswordReset(email: string): Promise<void> {
    try {
      // Importa dinamicamente para evitar problemas em builds que não incluam o método
      const { sendPasswordResetEmail } = await import('firebase/auth');
      await sendPasswordResetEmail(this.auth, email);
    } catch (error) {
      console.error('Erro ao enviar email de redefinição de senha:', error);
      throw error;
    }
  }

  /**
   * Realiza o logout do usuário.
   */
  async logout(): Promise<void> {
    try {
      await signOut(this.auth);
      // O onAuthStateChanged cuidará do redirecionamento para /login
    } catch (error) {
      console.error("Erro ao fazer logout:", error);
      throw error;
    }
  }

  /**
   * Registra um novo usuário com email e senha
   */
  async registerWithEmailAndPassword(email: string, password: string): Promise<User | null> {
    try {
      await setPersistence(this.auth, browserLocalPersistence);
      const result = await createUserWithEmailAndPassword(this.auth, email, password);
      return result.user;
    } catch (error) {
      console.error("Erro no registro:", error);
      throw error;
    }
  }

  /**
   * Realiza login com email e senha
   */
  async loginWithEmailAndPassword(email: string, password: string): Promise<User | null> {
    try {
      await setPersistence(this.auth, browserLocalPersistence);
      const result = await signInWithEmailAndPassword(this.auth, email, password);
      return result.user;
    } catch (error) {
      console.error("Erro no login:", error);
      throw error;
    }
  }

  /**
   * Obtém o usuário logado atual.
   */
  getCurrentUser(): Observable<User | null> {
    return this.user$;
  }
}