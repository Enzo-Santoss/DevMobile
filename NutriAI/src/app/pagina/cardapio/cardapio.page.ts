import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonContent, IonHeader, IonTitle, IonToolbar,IonMenuButton, IonSegment, IonSegmentButton, IonLabel, IonSegmentView, IonSegmentContent, IonIcon, IonList, IonCard, IonCardContent, IonCardHeader, IonCardSubtitle, IonCardTitle, IonItem, IonThumbnail, IonBadge,} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { barbell, basket, call, globe, heart, home, man, person, pin, star, trash } from 'ionicons/icons';

@Component({
  selector: 'app-cardapio',
  templateUrl: './cardapio.page.html',
  styleUrls: ['./cardapio.page.scss'],
  standalone: true,
  imports: [IonContent, IonHeader, IonTitle, IonToolbar, CommonModule, FormsModule,IonMenuButton,IonSegment,IonSegmentButton,IonLabel,IonSegmentView,IonSegmentContent,IonIcon,IonList,IonCard,IonCardContent,IonCardHeader,IonCardSubtitle,IonCardTitle,IonItem ,IonThumbnail,IonBadge,]
})
export class CardapioPage implements OnInit {

  constructor() {
      addIcons({man,barbell,heart,star}); }

  escolhar = 'ganhar';

  alterar(evento: any){
    this.escolhar = evento.detail.value;

  }

  ngOnInit() {

  addIcons({ barbell, basket, call, globe, heart, home, person, pin, star, trash,man });
  
  }

}
