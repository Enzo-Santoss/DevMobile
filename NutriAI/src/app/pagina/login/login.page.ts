import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { 
  IonHeader,
  IonToolbar, 
  IonTitle, 
  IonContent, 
  IonButton, 
  IonIcon, 
  IonSpinner, 
  IonCard, 
  IonCardHeader, 
  IonCardTitle, 
  IonCardContent, 
  IonAvatar, 
  IonMenuButton,
  IonInput
} from '@ionic/angular/standalone';
import { AuthService } from '../../services/auth.service';
import { User } from '@angular/fire/auth';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonHeader, 
    IonToolbar, 
    IonTitle, 
    IonContent, 
    IonButton, 
    IonIcon,
    IonSpinner,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardContent,
    IonAvatar,
    IonMenuButton,
    IonInput
  ]
})
export class LoginPage implements OnInit {
  user$: Observable<User | null>;
  user: User | null = null;
  loading: boolean = false;
  email: string = '';
  password: string = '';
  
  constructor(private authService: AuthService) {
    this.user$ = this.authService.user$;
  }

  ngOnInit() {
    this.user$.subscribe(user => {
      this.user = user;
    });
  }

  async loginGoogle() {
    this.loading = true;
    try {
      await this.authService.googleLogin();
    } catch (e) {
      console.error("Erro no login da página:", e);
      alert('Erro ao fazer login. Tente novamente.');
    } finally {
      this.loading = false;
    }
  }

  async loginAnonimo() {
    this.loading = true;
    try {
      await this.authService.anonymousLogin();
    } catch (e) {
      console.error("Erro no login anônimo:", e);
      alert('Erro ao fazer login anônimo. Tente novamente.');
    } finally {
      this.loading = false;
    }
  }

  async logout() {
    try {
      await this.authService.logout();
    } catch (e) {
      console.error("Erro ao fazer logout:", e);
    }
  }

  async loginWithEmail() {
    if (!this.email || !this.password) {
      alert('Por favor, preencha email e senha.');
      return;
    }

    this.loading = true;
    try {
      await this.authService.loginWithEmailAndPassword(this.email, this.password);
    } catch (e: any) {
      console.error("Erro no login com email:", e);
      alert(this.getErrorMessage(e.code));
    } finally {
      this.loading = false;
    }
  }

  async register() {
    if (!this.email || !this.password) {
      alert('Por favor, preencha email e senha.');
      return;
    }

    this.loading = true;
    try {
      await this.authService.registerWithEmailAndPassword(this.email, this.password);
      alert('Cadastro realizado com sucesso!');
    } catch (e: any) {
      console.error("Erro no cadastro:", e);
      alert(this.getErrorMessage(e.code));
    } finally {
      this.loading = false;
    }
  }

  private getErrorMessage(errorCode: string): string {
    switch (errorCode) {
      case 'auth/email-already-in-use':
        return 'Este email já está em uso.';
      case 'auth/weak-password':
        return 'A senha deve ter pelo menos 6 caracteres.';
      case 'auth/invalid-email':
        return 'Email inválido.';
      case 'auth/user-not-found':
        return 'Usuário não encontrado.';
      case 'auth/wrong-password':
        return 'Senha incorreta.';
      default:
        return 'Ocorreu um erro. Por favor, tente novamente.';
    }
  }
}