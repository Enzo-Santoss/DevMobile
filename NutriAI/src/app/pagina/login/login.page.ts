import { Component, OnInit } from '@angular/core';
import { AuthService } from '../../services/auth.service';
import { User } from '@angular/fire/auth';

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
})
export class LoginPage implements OnInit {
  user: User | null = null;
  loading = false;

  constructor(private authService: AuthService) {}

  ngOnInit() {
    this.authService.user$.subscribe(u => this.user = u);
  }

  async loginGoogle() {
    this.loading = true;
    try {
      await this.authService.googleLogin();
    } catch (err) {
      console.error('Erro ao logar com Google:', err);
      alert('Erro ao fazer login. Veja o console.');
    } finally {
      this.loading = false;
    }
  }

  async logout() {
    await this.authService.logout();
  }
}
