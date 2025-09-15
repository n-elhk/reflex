import { AfterViewInit, ChangeDetectionStrategy, Component, ElementRef, inject, viewChild } from '@angular/core';
import { IonContent, IonFooter, IonProgressBar } from '@ionic/angular/standalone';
import { type GestureDetail, createGesture } from '@ionic/core';

import { GameStore } from '../store/game.store';
import { Direction } from '../store/game.state';
import { GameRunner } from "./game-runner";
import { CanvasElement } from './canvas-element';
import { takeUntilDestroyed, toObservable, toSignal } from '@angular/core/rxjs-interop';
import { filter, tap } from 'rxjs';
import { Router } from '@angular/router';

@Component({
  selector: 'app-game',
  templateUrl: './board.page.html',
  styleUrls: ['./board.page.scss'],
  imports: [IonContent, IonFooter, IonProgressBar, GameRunner, CanvasElement],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BoardPage implements AfterViewInit {

  private readonly gameStore = inject(GameStore);
  private readonly router = inject(Router);

  private readonly isOver = this.gameStore.isOver;
  readonly arrowDirection = this.gameStore.arrowDirection;
  readonly movementDirection = this.gameStore.movementDirection;
  readonly score = this.gameStore.score;
  readonly isMovmentRound = this.gameStore.isMovmentRound;
  readonly helpText = this.gameStore.helpText;

  readonly countdown = toSignal(this.gameStore.countdown(), { initialValue: null });

  readonly gameRunnerChild = viewChild.required<GameRunner, ElementRef<HTMLElement>>(GameRunner, { read: ElementRef });

  private readonly redirectToReulstPage$ = toObservable(this.gameStore.isOver).pipe(
    filter(Boolean),
    tap(() => this.router.navigate(['game', 'result'], { replaceUrl: true }))
  );

  constructor() {
    this.redirectToReulstPage$.pipe(takeUntilDestroyed()).subscribe();
  }

  ngAfterViewInit(): void {
    const el = this.gameRunnerChild().nativeElement;

    const onEnd = (ev: GestureDetail) => {
      if (this.isOver()) return;
      const dir = this.detectDirection(ev.deltaX, ev.deltaY);
      this.gameStore.handleSwipe(dir);
    };

    // Gesture horizontal
    const gestureX = createGesture({
      el,
      gestureName: 'swipe-x',
      gesturePriority: 1,
      direction: 'x',           // <— important
      threshold: 10,
      disableScroll: true,      // évite que le scroll intercepte
      onEnd
    });

    // Gesture vertical
    const gestureY = createGesture({
      el,
      gestureName: 'swipe-y',
      gesturePriority: 0,
      direction: 'y',           // <— important
      threshold: 10,
      disableScroll: true,
      onEnd
    });

    gestureX.enable(true);
    gestureY.enable(true);

  }

  private detectDirection(dx: number, dy: number): Direction {
    if (Math.abs(dx) > Math.abs(dy)) {
      return dx > 0 ? 'right' : 'left';
    } else {
      return dy > 0 ? 'down' : 'up';
    }
  }
}
