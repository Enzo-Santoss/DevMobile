/*import { Component, OnInit } from '@angular/core';
import { User } from '@angular/fire/auth';
import { AuthService } from '../../services/auth.service'; // Ajuste o caminho se necessário
import { CommonModule } from '@angular/common'; // Necessário para *ngIf
import { IonicModule } from '@ionic/angular'; // Necessário para ion-button, ion-card, etc.

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
  // Se for standalone, adicione os imports necessários:
  // standalone: true, 
  // imports: [CommonModule, IonicModule] 
})
export class LoginPage implements OnInit {
  user: User | null = null;
  loading = false;

  // Injetando o AuthService
  constructor(private authService: AuthService) {}

  ngOnInit() {
    // Inscreve-se no Observable de usuário para manter o estado do componente atualizado
    this.authService.user$.subscribe(u => this.user = u);
  }

  // Função chamada pelo botão "Entrar com Google" no HTML
  async loginGoogle() {
    this.loading = true; // Mostra o spinner
    try {
      // Chama o método do serviço
      await this.authService.googleLogin();
      // O redirecionamento é feito dentro do AuthService, então não precisamos dele aqui
    } catch (err: any) {
      console.error('Erro ao logar com Google:', err);
      // Exibe um alerta de erro para o usuário (pode ser substituído por Toast ou AlertController)
      alert(`Erro ao fazer login: ${err.message || 'Verifique o console.'}`); 
    } finally {
      this.loading = false; // Esconde o spinner
    }
  }

  // Função chamada pelo botão "Sair" no HTML
  async logout() {
    // Chama o método do serviço
    await this.authService.logout();
    // O redirecionamento é feito dentro do AuthService
  }
}*/
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common'; // <-- ESSENCIAL para *ngIf
import { FormsModule } from '@angular/forms';
import { 
  IonHeader, // <-- Importar componentes do Ionic
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
} from '@ionic/angular/standalone'; // <-- Usar o standalone
import { AuthService } from 'src/app/services/auth.service';
import { User } from '@angular/fire/auth'; // Para o tipo User
import { Observable } from 'rxjs';

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
  standalone: true, // Já deve estar aqui
  imports: [
    CommonModule, // <--- ADICIONE ESTE
    FormsModule, 
    // Adicionar todos os componentes Ionic usados no template
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
    IonAvatar,IonMenuButton,IonInput,
  ]
})
export class LoginPage implements OnInit {
  user$: Observable<User | null>;
  user: User | null = null;
  loading: boolean = false;
  
  // O constructor injeta o AuthService
  constructor(private authService: AuthService) {
    this.user$ = this.authService.getCurrentUser();
  }

  ngOnInit() {
    // Se você está usando *ngIf="user", é melhor subscrever ou usar async pipe
    this.user$.subscribe(user => {
      this.user = user;
    });
  }

  // Função para lidar com o login via Google
  async loginGoogle() {
    this.loading = true;
    try {
      await this.authService.googleLogin();
      // O redirecionamento é feito pelo AuthService
    } catch (e) {
      console.error("Erro no login da página:", e);
      alert('Erro ao fazer login. Tente novamente.');
    } finally {
      this.loading = false;
    }
  }

  // Função para lidar com o logout
  async logout() {
    try {
      await this.authService.logout();
    } catch (e) {
      console.error("Erro ao fazer logout:", e);
    }
  }
}
