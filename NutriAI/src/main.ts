import { bootstrapApplication } from '@angular/platform-browser';
import { RouteReuseStrategy, provideRouter, withPreloading, PreloadAllModules } from '@angular/router';
import { IonicRouteStrategy, provideIonicAngular } from '@ionic/angular/standalone';
import { provideHttpClient } from '@angular/common/http'; // Importe para substituir o HttpClientModule

import { routes } from './app/app.routes';
import { AppComponent } from './app/app.component';

// Imports do Firebase e Environment
import { provideFirebaseApp, initializeApp } from '@angular/fire/app';
import { provideAuth, getAuth } from '@angular/fire/auth';
import { environment } from './environments/environment';

bootstrapApplication(AppComponent, {
  providers: [
    { provide: RouteReuseStrategy, useClass: IonicRouteStrategy },
    provideIonicAngular(),
    // Adiciona o sistema de roteamento do Angular
    provideRouter(routes, withPreloading(PreloadAllModules)),

    // 1. Adiciona o provedor para o HttpClient (Substitui HttpClientModule)
    provideHttpClient(), 

    // 2. Configurações do Firebase
    // Inicializa o Firebase App
    provideFirebaseApp(() => initializeApp(environment.firebaseConfig)),
    // Inicializa o módulo de Autenticação (Auth)
    provideAuth(() => getAuth()),
  ],
});