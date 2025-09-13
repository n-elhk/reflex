import { ChangeDetectionStrategy, Component } from '@angular/core';
import { IonRouterOutlet } from '@ionic/angular/standalone';

import { GameStore } from './store/game.store';

@Component({
  template: '<ion-router-outlet></ion-router-outlet>',
  imports: [IonRouterOutlet],
  providers: [GameStore],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GamePage { }
