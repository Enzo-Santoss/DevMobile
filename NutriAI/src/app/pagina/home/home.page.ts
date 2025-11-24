import { Component, CUSTOM_ELEMENTS_SCHEMA, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { User } from '@angular/fire/auth';
import { Observable } from 'rxjs';
import { SheetsService, MenuItem } from '../../services/sheets.service';
import { Router, RouterModule } from '@angular/router';
import { TrackerService } from '../../services/tracker.service';
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
    // RouterModule is needed so `routerLink` in the template works when using standalone component
    RouterModule,
  ],
  providers: [],
})
export class HomePage implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly sheets = inject(SheetsService);
  private readonly router = inject(Router);
  private readonly tracker = inject(TrackerService);
  passosEstimados: number = 0;
  metaPassos: number = 10000;
  passosPercent: number = 0;

  // hydration
  hidratacaoConsumo = 0;
  hidratacaoMeta = 4000;
  favorites: MenuItem[] = [];
  loadingFavorites = true;
  // keep original cards as fallback
  user$: Observable<User | null> = this.authService.user$;
  
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

  constructor() {}

  openRecipe(item?: any) {
    if (!item) return;
    try {
      const id = item.id ?? undefined;
      const title = item.title ?? undefined;
      this.router.navigate(['/pagina/cardapio'], { queryParams: { id, title } });
    } catch (e) {
      console.warn('Failed to navigate to cardapio with item', item, e);
    }
  }

  ngOnInit(): void {
    this.loadingFavorites = true;
    this.sheets.getMenuItems().subscribe({
      next: items => {
        this.favorites = items.filter(i => !!i.favorite);
        this.loadingFavorites = false;
      },
      error: () => { this.loadingFavorites = false; }
    });

    // subscribe to steps data
    this.tracker.atividadeData$.subscribe(d => {
      if (!d) return;
      this.passosEstimados = d.passosEstimados;
      try {
        const raw = localStorage.getItem('metaPassos');
        this.metaPassos = raw ? Number(raw) || this.metaPassos : this.metaPassos;
      } catch (e) {}
      this.passosPercent = this.metaPassos > 0 ? (this.passosEstimados / this.metaPassos) : 0;
      // optional debug logging enabled via localStorage 'home_debug' === '1'
      try {
        const dbg = localStorage.getItem('home_debug') === '1';
        if (dbg) console.debug('Home debug (steps):', { passosEstimados: this.passosEstimados, metaPassos: this.metaPassos, passosPercentPct: this.passosPercentPct });
      } catch (e) {}
    });

    // load hydration from localStorage if present
    try {
      const c = localStorage.getItem('hidratacao_consumo');
      const m = localStorage.getItem('hidratacao_meta');
      if (c) this.hidratacaoConsumo = Number(c) || this.hidratacaoConsumo;
      if (m) this.hidratacaoMeta = Number(m) || this.hidratacaoMeta;
    } catch (e) {}

    // optional hydration debug
    try {
      const dbg = localStorage.getItem('home_debug') === '1';
      if (dbg) console.debug('Home debug (hydration):', { hidratacaoConsumo: this.hidratacaoConsumo, hidratacaoMeta: this.hidratacaoMeta, hidratacaoPercentPct: this.hidratacaoPercentPct });
    } catch (e) {}
  }

  // percent values clamped between 0 and 100 for safe binding in template
  get passosPercentPct(): number {
    const pct = (this.passosPercent || 0) * 100;
    return Math.max(0, Math.min(100, Number.isFinite(pct) ? pct : 0));
  }

  get hidratacaoPercentPct(): number {
    const meta = this.hidratacaoMeta && this.hidratacaoMeta > 0 ? this.hidratacaoMeta : 1;
    const pct = (this.hidratacaoConsumo || 0) / meta * 100;
    return Math.max(0, Math.min(100, Number.isFinite(pct) ? pct : 0));
  }
}
