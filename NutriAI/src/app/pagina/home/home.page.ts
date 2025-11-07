import { Component, OnInit, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { User } from '@angular/fire/auth';
import { Observable } from 'rxjs';
import {
  IonContent,
  IonHeader,
  IonTitle,
  IonToolbar,
  IonMenuButton,
  IonGrid,
  IonRow,
  IonCol,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonButton
} from '@ionic/angular/standalone';

// Import and register Swiper Web Components globally
import { register } from 'swiper/element/bundle'; 
register();

@Component({
  selector: 'app-home',
  standalone: true,
  templateUrl: './home.page.html',
  styleUrls: ['./home.page.scss'],
  
  // Now recognized because it's imported above
  schemas: [CUSTOM_ELEMENTS_SCHEMA],

  imports: [
    CommonModule,
    FormsModule,
    IonContent,
    IonHeader,
    IonTitle,
    IonToolbar,
    IonMenuButton,
    IonGrid,
    IonRow,
    IonCol,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardContent,
    IonButton,
  ],
})
export class HomePage implements OnInit {
  user$: Observable<User | null>;
  
  // Swiper configuration object
  swiperConfig = {
    slidesPerView: 1,
    loop: true,
    autoplay: { delay: 3000 },
    pagination: { clickable: true },
  };

  slides = [
    { img: '/assets/slides/slide1.jpeg', title: 'Alimente seu corpo', subtitle: 'Descubra refeições saudáveis e nutritivas.' },
    { img: '/assets/slides/slide2.jpeg', title: 'Monitore sua dieta', subtitle: 'Acompanhe seu progresso diariamente.' },
    { img: '/assets/slides/slide3.jpeg', title: 'Receitas incríveis', subtitle: 'Experimente novas receitas e sabores.' },
  ];

  cards = [
    { img: '/assets/cards/card1.jpeg', title: 'Plano de Refeições', description: 'Organize suas refeições diárias com facilidade.' },
    { img: '/assets/cards/card2.jpeg', title: 'Monitor de Nutrição', description: 'Acompanhe calorias, macros e nutrientes.' },
    { img: '/assets/cards/card3.jpeg', title: 'Receitas Saudáveis', description: 'Receitas rápidas e deliciosas para todos os gostos.' },
  ];

  constructor(private authService: AuthService) {
    this.user$ = this.authService.user$;
  }

  ngOnInit() {}
}
