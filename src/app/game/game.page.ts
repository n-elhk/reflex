import { AfterViewInit, Component, computed, ElementRef, inject, signal, viewChild } from '@angular/core';
import { IonContent, IonIcon, IonButton, IonFooter, IonProgressBar } from '@ionic/angular/standalone';
import { type GestureDetail, createGesture } from '@ionic/core';

import { arrowBackOutline, arrowForwardOutline, arrowUpOutline, arrowDownOutline } from 'ionicons/icons';
import { addIcons } from 'ionicons';
import { GameStore } from './store/game.store';
import { SwipeDirection } from './store/game.state';
import { GameArea } from "./game-area";
import { toSignal } from '@angular/core/rxjs-interop';

const SPRITES_COUNT = 6;
const LINES_COUNT = 3;

@Component({
  selector: 'app-game',
  templateUrl: './game.page.html',
  styleUrls: ['./game.page.scss'],
  imports: [IonContent, IonIcon, IonButton, IonFooter, IonProgressBar, GameArea],
  providers: [GameStore],
})
export class GamePage implements AfterViewInit {
  private readonly gameStore = inject(GameStore);

  readonly lines = Array.from({ length: LINES_COUNT }, (_, i) => i);
  readonly sprites = Array.from({ length: SPRITES_COUNT }, (_, i) => i);

  readonly gameArea = viewChild<GameArea, ElementRef<HTMLElement>>(GameArea, { read: ElementRef });

  // État de jeu
  readonly gameStatus = this.gameStore.gameStatus;
  readonly isOver = this.gameStore.isOver;
  readonly score = this.gameStore.score;
  readonly iconName = this.gameStore.iconName;
  readonly helpText = this.gameStore.helpText;
  readonly bestScore = this.gameStore.bestScore;
  readonly countdown = toSignal(this.gameStore.countdown(), { initialValue: null });


  // État du round
  readonly isMovmentRound = this.gameStore.isMovmentRound;
  readonly movementDirection = this.gameStore.movementDirection;
  readonly arrowDirection = this.gameStore.arrowDirection;

  readonly roundSpeedMs = signal(3500);
  readonly speedCss = computed(() => `${this.roundSpeedMs()}ms`);

  // readonly score$ = toObservable(this.score);
  // private readonly updateBestScore$ = this.score$.pipe(
  //   filter(s => s > this.bestScore()),
  //   tap((score) => localStorage.setItem('bestScore', String(score)))
  // )

  // private readonly reset$ = new BehaviorSubject<string>('next');

  // private readonly gameTimer$ = this.reset$.pipe(
  //   switchMap(() => timer(10_000)),
  //   map(() => this.endGame()),
  // );

  constructor() {
    addIcons({
      arrowBackOutline, arrowForwardOutline, arrowUpOutline, arrowDownOutline
    });
  }

  ngAfterViewInit(): void {
    const el = this.gameArea()!.nativeElement;

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

  restart() {
    this.gameStore.replay();
  }

  private detectDirection(dx: number, dy: number): SwipeDirection {
    if (Math.abs(dx) > Math.abs(dy)) {
      return dx > 0 ? 'right' : 'left';
    } else {
      return dy > 0 ? 'down' : 'up';
    }
  }

  private lanePhaseMs(laneIndex: number): number {
    const s = this.roundSpeedMs();
    const phases = [-s / 8, -s / 5, -s / 3.5];
    return phases[laneIndex % phases.length];
  }

  // Déphasage individuel par sprite (assure l'étalement régulier)
  delayMs(i: number, laneIndex: number): number {
    const s = this.roundSpeedMs();
    const spread = Math.max(1, SPRITES_COUNT);
    return -(i / spread) * s + this.lanePhaseMs(laneIndex);
  }
}
