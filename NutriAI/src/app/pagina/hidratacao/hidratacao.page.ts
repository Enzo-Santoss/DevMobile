import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {IonContent,IonHeader,IonTitle,IonToolbar,IonMenuButton,IonCard ,IonProgressBar,IonCardContent,IonCardTitle,IonCardHeader,IonButton,ToastController, IonIcon,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { add, trash, water } from 'ionicons/icons';


@Component({
  selector: 'app-hidratacao',
  templateUrl: './hidratacao.page.html',
  styleUrls: ['./hidratacao.page.scss'],
  standalone: true,
  imports: [IonContent,IonHeader,IonTitle,IonToolbar,CommonModule,FormsModule,IonMenuButton,IonCard ,IonProgressBar,IonCardContent,IonCardTitle,IonCardHeader,IonButton,IonIcon]
})

export class HidratacaoPage implements OnInit {

  metaDiaria = 4000;      // Meta de 4.0L (em ml)
  consumoAtual = 0;    // Já consumido (1L)
  opcoes = [300, 500, 800, 1000]; // Botões de adição

  constructor(private toastCtrl: ToastController) {
      addIcons({water,add,trash});}

  adicionarAgua(qtd: number) {
    this.consumoAtual = Math.min(this.consumoAtual + qtd, this.metaDiaria);
  }

  async removerAgua(qtd: number) {
    this.consumoAtual = Math.max(this.consumoAtual - qtd, 0);

    const toast = await this.toastCtrl.create({
      message: `Você removeu ${qtd}ml de água`,
      duration: 2500,
      color: 'warning',
      position: 'bottom',
    });

    await toast.present();
  }

  ngOnInit() {

  addIcons({ add, trash, water });

  }

}
