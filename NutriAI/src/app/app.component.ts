import { Component } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router'; // 1. Importe o Router
import { User } from '@angular/fire/auth'; // 2. Importe o tipo User do Firebase
import { AuthService } from './services/auth.service'; // 3. Importe o seu serviço de autenticação
import {IonApp, IonSplitPane, IonMenu, IonHeader, IonContent, IonList,IonListHeader, IonNote, IonMenuToggle, IonItem, IonIcon, IonLabel,IonRouterOutlet, IonRouterLink, IonButton} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {mailOutline, mailSharp,paperPlaneOutline, paperPlaneSharp,heartOutline, heartSharp,archiveOutline, archiveSharp,trashOutline, trashSharp,warningOutline, warningSharp,bookmarkOutline, bookmarkSharp,homeOutline, person, barChartOutline, podiumOutline, waterOutline, cameraOutline, restaurantOutline, footstepsOutline, logoGoogle, logIn, logInOutline, logOutOutline } from 'ionicons/icons'; // 4. Adicione logOutOutline

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
  // Se for standalone: true, o imports já está correto.
  imports: [RouterLink, RouterLinkActive, IonApp, IonSplitPane, IonMenu, IonContent, IonList, IonListHeader, IonNote, IonHeader, IonMenuToggle, IonItem, IonIcon, IonLabel, IonRouterLink, IonRouterOutlet,IonButton],
})
export class AppComponent {
  // 5. Variável para rastrear o usuário (usada no HTML)
  public user: User | null = null;
  
  public appPages = [
    { title: 'Home', url: '/home', icon: 'home-outline' },
    { title: 'Dashboard', url: '/dashboard', icon: 'podium-outline' },
    { title: 'Meu Perfil', url: '/meuperfil', icon: 'person' },
    { title: 'Cardápio', url: '/cardapio', icon: 'restaurant-outline' },
    { title: 'Atividade', url: '/atividade', icon: 'footsteps-outline' },
    { title: 'Hidratação', url: '/hidratacao', icon: 'water-outline' },
  ];

  constructor(
    private router: Router, // 6. Injete o Router
    private authService: AuthService // 7. Injete o AuthService
  ) {
    // Escuta mudanças no estado do usuário para atualizar a variável 'user'
    this.authService.user$.subscribe(u => {
      this.user = u;
    });

    // É uma boa prática adicionar todos os ícones que você usa no app.component.html
    addIcons({logInOutline,logIn,logOutOutline, 'mailOutline':mailOutline,'mailSharp':mailSharp,'paperPlaneOutline':paperPlaneOutline,'paperPlaneSharp':paperPlaneSharp,'heartOutline':heartOutline,'heartSharp':heartSharp,'archiveOutline':archiveOutline,'archiveSharp':archiveSharp,'trashOutline':trashOutline,'trashSharp':trashSharp,'warningOutline':warningOutline,'warningSharp':warningSharp,'bookmarkOutline':bookmarkOutline,'bookmarkSharp':bookmarkSharp,'homeOutline':homeOutline,'person':person,'barChartOutline':barChartOutline,'podiumOutline':podiumOutline,'waterOutline':waterOutline,'cameraOutline':cameraOutline,'restaurantOutline':restaurantOutline,'footstepsOutline':footstepsOutline,'logoGoogle':logoGoogle,'logOutline':logInOutline});
  }

  /**
   * 8. Lógica para o botão de Login/Sair no menu lateral.
   */
  async handleAuthClick() {
    if (this.user) {
      // Se estiver logado, faz logout (o AuthService cuidará do redirecionamento para /login)
      await this.authService.logout(); 
    } else {
      // Se não estiver logado, navega para a página de login
      this.router.navigate(['/login']);
    }
  }
}



