import { Component, OnInit } from '@angular/core';
import { GoogleFitService } from 'src/app/services/google-fit.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonContent, IonHeader, IonInput, IonMenuButton, IonTitle, IonToolbar,IonButtons, IonCard, IonCardHeader, IonCardTitle, IonCardContent } from '@ionic/angular/standalone';

@Component({
  selector: 'app-atividade',
  templateUrl: './atividade.page.html',
  styleUrls: ['./atividade.page.scss'],
  standalone: true,
  imports: [IonContent, IonHeader, IonTitle, IonToolbar, CommonModule, FormsModule,IonInput,IonMenuButton,IonButtons, IonCard, IonCardHeader, IonCardTitle, IonCardContent]
})
export class AtividadePage implements OnInit {
  passos: number = 0;
  calorias: number = 0;
  token: string | null = null;

  constructor(private googleFit: GoogleFitService) {}

  ngOnInit() {
    this.token = localStorage.getItem('google_token'); // salvo após login
    if (this.token) {
      const end = Date.now();
      const start = end - (24 * 60 * 60 * 1000); // últimas 24h

      this.googleFit.getStepCount(this.token, start, end).subscribe((res: any) => {
        const steps = res.bucket?.[0]?.dataset?.[0]?.point?.[0]?.value?.[0]?.intVal || 0;
        this.passos = steps;
        this.calorias = this.calcularCalorias(steps, 70);
      });
    }
  }

  calcularCalorias(passos: number, pesoKg: number = 70): number {
    const metrosPorPasso = 0.78;
    const distanciaKm = (passos * metrosPorPasso) / 1000;
    return distanciaKm * pesoKg * 1.036;
  }
}
