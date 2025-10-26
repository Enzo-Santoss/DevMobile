import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    redirectTo: '/home',
    pathMatch: 'full',
  },
  // ADICIONAR A ROTA DE LOGIN AQUI!
  {
    path: 'login',
    loadComponent: () => import('./pagina/login/login.page').then( m => m.LoginPage)
  },
  // Rota antiga do folder (mantida por precaução)
  {
    path: 'folder/:id',
    loadComponent: () =>
      import('./folder/folder.page').then((m) => m.FolderPage),
  },
  {
    path: 'home',
    loadComponent: () => import('./pagina/home/home.page').then( m => m.HomePage)
  },
  {
    path: 'dashboard',
    loadComponent: () => import('./pagina/dashboard/dashboard.page').then( m => m.DashboardPage)
  },
  {
    path: 'meuperfil',
    loadComponent: () => import('./pagina/meuperfil/meuperfil.page').then( m => m.MeuperfilPage)
  },
  {
    path: 'cardapio',
    loadComponent: () => import('./pagina/cardapio/cardapio.page').then( m => m.CardapioPage)
  },
  {
    path: 'hidratacao',
    loadComponent: () => import('./pagina/hidratacao/hidratacao.page').then( m => m.HidratacaoPage)
  },
  {
    path: 'atividade',
    loadComponent: () => import('./pagina/atividade/atividade.page').then( m => m.AtividadePage)
  },

];