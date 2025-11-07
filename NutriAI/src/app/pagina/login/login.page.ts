import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
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
  IonInput,
  IonText
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { logoGoogle, personOutline } from 'ionicons/icons';
import { AuthService } from '../../services/auth.service';
import { User } from '@angular/fire/auth';
import { Observable, finalize } from 'rxjs';
import { ToastController } from '@ionic/angular';
import { LoginCredentials, LoginState } from '../../interfaces/auth.interface';

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
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
    IonInput,
    IonText
  ]
})
export class LoginPage implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly toastCtrl = inject(ToastController);
  private readonly fb = inject(FormBuilder);
  
  user$: Observable<User | null>;
  loginForm: FormGroup;
  state: LoginState = {
    loading: false,
    error: null
  };
  
  constructor() {
    this.user$ = this.authService.user$;
    addIcons({ logoGoogle, personOutline });
    
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });
  }

  ngOnInit() {}

  async loginGoogle() {
    this.state.loading = true;
    this.state.error = null;
    try {
      await this.authService.googleLogin();
    } catch (e) {
      console.error("Erro no login da página:", e);
      await this.presentToast('Erro ao fazer login. Tente novamente.');
      this.state.error = 'Erro ao fazer login com Google';
    } finally {
      this.state.loading = false;
    }
  }

  async loginAnonimo() {
    this.state.loading = true;
    this.state.error = null;
    try {
      await this.authService.anonymousLogin();
    } catch (e) {
      console.error("Erro no login anônimo:", e);
      await this.presentToast('Erro ao fazer login anônimo. Tente novamente.');
      this.state.error = 'Erro ao fazer login anônimo';
    } finally {
      this.state.loading = false;
    }
  }

  async logout() {
    try {
      await this.authService.logout();
    } catch (e) {
      console.error("Erro ao fazer logout:", e);
      this.state.error = 'Erro ao fazer logout';
    }
  }

  async loginWithEmail() {
    if (this.loginForm.invalid) {
      await this.presentToast('Por favor, preencha todos os campos corretamente.');
      return;
    }

    this.state.loading = true;
    this.state.error = null;
    try {
      const { email, password } = this.loginForm.value;
      await this.authService.loginWithEmailAndPassword(email, password);
    } catch (e: any) {
      console.error("Erro no login com email:", e);
      await this.presentToast(this.getErrorMessage(e.code));
      this.state.error = this.getErrorMessage(e.code);
    } finally {
      this.state.loading = false;
    }
  }

  async register() {
    if (this.loginForm.invalid) {
      await this.presentToast('Por favor, preencha todos os campos corretamente.');
      return;
    }

    this.state.loading = true;
    this.state.error = null;
    try {
      const { email, password } = this.loginForm.value;
      await this.authService.registerWithEmailAndPassword(email, password);
      await this.presentToast('Cadastro realizado com sucesso!');
    } catch (e: any) {
      console.error("Erro no cadastro:", e);
      await this.presentToast(this.getErrorMessage(e.code));
      this.state.error = this.getErrorMessage(e.code);
    } finally {
      this.state.loading = false;
    }
  }

  private async presentToast(message: string, duration = 3000) {
    const toast = await this.toastCtrl.create({
      message,
      duration,
      color: 'dark'
    });
    await toast.present();
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