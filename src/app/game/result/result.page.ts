import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { IonContent, IonButton } from '@ionic/angular/standalone';

import { GameStore } from '../store/game.store';
import { Router } from '@angular/router';

@Component({
  selector: 'app-game',
  templateUrl: './result.page.html',
  styleUrls: ['./result.page.scss'],
  imports: [IonContent, IonButton],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ResultPage {
  private readonly gameStore = inject(GameStore);
  private readonly router = inject(Router);

  readonly score = this.gameStore.score;
  readonly bestScore = this.gameStore.bestScore;

  restart() {
    this.gameStore.replay();
    this.router.navigate(['/game']);
  }
}
