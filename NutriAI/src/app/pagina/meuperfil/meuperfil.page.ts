import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonContent, IonHeader, IonTitle, IonToolbar, IonMenuButton,IonCard,IonCardHeader,IonCardTitle,IonCardContent,IonItem,IonSelect,IonSelectOption,IonTextarea, IonCardSubtitle, IonButton, IonList } from '@ionic/angular/standalone';




@Component({
  selector: 'app-meuperfil',
  templateUrl: './meuperfil.page.html',
  styleUrls: ['./meuperfil.page.scss'],
  standalone: true,
  imports: [IonContent, IonHeader, IonTitle, IonToolbar, CommonModule, FormsModule, IonMenuButton, IonCard, IonCardHeader, IonCardTitle, IonCardContent, IonItem, IonSelect, IonSelectOption, IonTextarea, IonCardSubtitle, IonButton, IonList]
})
export class MeuperfilPage implements OnInit {

  constructor() {}

  ngOnInit() {}
}