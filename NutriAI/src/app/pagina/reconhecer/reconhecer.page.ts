import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonContent, IonHeader, IonTitle, IonToolbar,IonMenuButton, } from '@ionic/angular/standalone';

@Component({
  selector: 'app-reconhecer',
  templateUrl: './reconhecer.page.html',
  styleUrls: ['./reconhecer.page.scss'],
  standalone: true,
  imports: [IonContent, IonHeader, IonTitle, IonToolbar, CommonModule, FormsModule,IonMenuButton,]
})
export class ReconhecerPage implements OnInit {

  constructor() { }

  ngOnInit() {
  }

}
