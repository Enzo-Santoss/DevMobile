import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonContent, IonHeader, IonTitle, IonToolbar, IonMenuButton, } from '@ionic/angular/standalone';

@Component({
  selector: 'app-hidratacao',
  templateUrl: './hidratacao.page.html',
  styleUrls: ['./hidratacao.page.scss'],
  standalone: true,
  imports: [IonContent, IonHeader, IonTitle, IonToolbar, CommonModule, FormsModule,IonMenuButton,]
})
export class HidratacaoPage implements OnInit {

  constructor() { }

  ngOnInit() {
  }

}
