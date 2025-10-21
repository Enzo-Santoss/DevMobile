import { Component, OnInit, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core'; // 🚨 CUSTOM_ELEMENTS_SCHEMA adicionado aqui!
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
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
  // Swiper configuration object
  swiperConfig = {
    slidesPerView: 1,
    loop: true,
    autoplay: { delay: 3000 },
    pagination: { clickable: true },
  };

  slides = [
    { img: '/assets/slides/healthy-food1.jpg', title: 'Alimente seu corpo', subtitle: 'Descubra refeições saudáveis e nutritivas.' },
    { img: '/assets/slides/healthy-food2.jpg', title: 'Monitore sua dieta', subtitle: 'Acompanhe seu progresso diariamente.' },
    { img: '/assets/slides/healthy-food3.jpg', title: 'Receitas incríveis', subtitle: 'Experimente novas receitas e sabores.' },
  ];

  cards = [
    { img: '/assets/cards/meal-plan.jpg', title: 'Plano de Refeições', description: 'Organize suas refeições diárias com facilidade.' },
    { img: '/assets/cards/nutrition-tracker.jpg', title: 'Monitor de Nutrição', description: 'Acompanhe calorias, macros e nutrientes.' },
    { img: '/assets/cards/recipes.jpg', title: 'Receitas Saudáveis', description: 'Receitas rápidas e deliciosas para todos os gostos.' },
  ];

  constructor() {}
  ngOnInit() {}
}
