import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import {IonApp, IonSplitPane, IonMenu, IonHeader, IonContent, IonList,IonListHeader, IonNote, IonMenuToggle, IonItem, IonIcon, IonLabel,IonRouterOutlet, IonRouterLink} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {mailOutline, mailSharp,paperPlaneOutline, paperPlaneSharp,heartOutline, heartSharp,archiveOutline, archiveSharp,trashOutline, trashSharp,warningOutline, warningSharp,bookmarkOutline, bookmarkSharp,homeOutline, person, barChartOutline, podiumOutline, waterOutline, cameraOutline, restaurantOutline, footstepsOutline, logoGoogle,} from 'ionicons/icons';


@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
  // se for standalone componente, adicione standalone: true
  imports: [RouterLink, RouterLinkActive, IonApp, IonSplitPane, IonMenu, IonContent, IonList, IonListHeader, IonNote, IonHeader, IonMenuToggle, IonItem, IonIcon, IonLabel, IonRouterLink, IonRouterOutlet],
})
export class AppComponent {
  public appPages = [
    { title: 'Home', url: '/home', icon: 'home-outline' },
    { title: 'Dashboard', url: '/dashboard', icon: 'podium-outline' },
    { title: 'Meu Perfil', url: '/meuperfil', icon: 'person' },
    { title: 'Cardápio', url: '/cardapio', icon: 'restaurant-outline' },
    { title: 'Atividade', url: '/atividade', icon: 'footsteps-outline' },
    { title: 'Hidratação', url: '/hidratacao', icon: 'water-outline' },
  
  ];

  constructor() {
    addIcons({
      'mail-outline': mailOutline,
      'mail-sharp': mailSharp,
      'paper-plane-outline': paperPlaneOutline,
      'paper-plane-sharp': paperPlaneSharp,
      'heart-outline': heartOutline,
      'heart-sharp': heartSharp,
      'archive-outline': archiveOutline,
      'archive-sharp': archiveSharp,
      'trash-outline': trashOutline,
      'trash-sharp': trashSharp,
      'warning-outline': warningOutline,
      'warning-sharp': warningSharp,
      'bookmark-outline': bookmarkOutline,
      'bookmark-sharp': bookmarkSharp,
      'home-outline': homeOutline,
      'person': person,
      'bar-chart-outline': barChartOutline,
      'podium-outline': podiumOutline,
      'water-outline': waterOutline,
      'camera-outline': cameraOutline,
      'restaurant-outline': restaurantOutline,
      'footsteps-outline' : footstepsOutline,
      'logo-google': logoGoogle,
    });
  
  }
  async loginGoogle() {
    const clientId = "1012678978201-leomt1dr68ljbsa1ltrb27dsgiimc318.apps.googleusercontent.com";
    const redirectUri = "http://localhost:8100"; // ajuste para produção ou device real
    const scope = "https://www.googleapis.com/auth/fitness.activity.read";

    const url = `https://accounts.google.com/o/oauth2/v2/auth?response_type=token&client_id=${clientId}&redirect_uri=${redirectUri}&scope=${scope}`;

    window.location.href = url;
  }
}

