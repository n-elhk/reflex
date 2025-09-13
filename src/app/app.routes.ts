import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: 'home',
    loadComponent: () => import('./home/home.page').then(({ HomePage }) => HomePage),
  },
  {
    path: 'game',
    loadComponent: () => import('./game/game.page').then(({ GamePage }) => GamePage),
    children: [
      {
        path: '',
        loadComponent: () => import('./game/board/board.page').then(({ BoardPage }) => BoardPage),
      },

      {
        path: 'result',
        loadComponent: () => import('./game/result/result.page').then(({ ResultPage }) => ResultPage),
      },
    ]
  },
  {
    path: '',
    redirectTo: 'home',
    pathMatch: 'full',
  },

];
