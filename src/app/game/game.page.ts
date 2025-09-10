import { AfterViewInit, Component, computed, ElementRef, signal, viewChild } from '@angular/core';
import { IonContent, IonIcon, IonButton, IonFooter } from '@ionic/angular/standalone';
import { type GestureDetail, createGesture } from '@ionic/core';

import { arrowBackOutline, arrowForwardOutline, arrowUpOutline, arrowDownOutline } from 'ionicons/icons';
import { addIcons } from 'ionicons';
import { StatInGameCardComponent } from "./stat-in-game-card/stat-in-game-card";

const SPRITES_COUNT = 6;
const LINES_COUNT = 3;

type Direction = 'left' | 'right' | 'up' | 'down';

@Component({
  selector: 'app-game',
  templateUrl: './game.page.html',
  styleUrls: ['./game.page.scss'],
  imports: [IonContent, IonIcon, IonButton, IonFooter, StatInGameCardComponent],

})
export class GamePage implements AfterViewInit {


  readonly lines  = Array.from({ length: LINES_COUNT }, (_, i) => i);
  readonly sprites = Array.from({ length: SPRITES_COUNT }, (_, i) => i);

  readonly gameArea = viewChild('gameArea', { read: ElementRef });

  // État de jeu
  readonly gameOver = signal(false);

  readonly score = signal(0);
  readonly bestScore = signal(0);

  // État du round
  readonly isGreen = signal(true);
  readonly movementDirection = signal<Direction>(this.randomDir());
  readonly arrowDirection = signal<Direction>(this.randomDir(this.movementDirection()));
  readonly roundSpeedMs = signal(3500);

  readonly speedCss = computed(() => `${this.roundSpeedMs()}ms`);


  readonly iconNameFor = computed(() => {
    switch (this.arrowDirection()) {
      case 'left': return 'arrow-back-outline';
      case 'right': return 'arrow-forward-outline';
      case 'up': return 'arrow-up-outline';
      case 'down': return 'arrow-down-outline';
    }
  });

  // Texte d’aide (rapide)
  readonly helpText = computed(() => this.isGreen()
    ? 'Sens de  déplacement'
    : 'Sens de la flèche')


  constructor() {
    addIcons({
      arrowBackOutline, arrowForwardOutline, arrowUpOutline, arrowDownOutline
    });

    this.bestScore.set(Number(localStorage.getItem('bestScore') || 0));
  }

  ngAfterViewInit(): void {
    const el = this.gameArea()!.nativeElement;

    const onEnd = (ev: GestureDetail) => {
      if (this.gameOver()) return;
      const dir = this.detectDirection(ev.deltaX, ev.deltaY);
      this.handleSwipe(dir);
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
    this.score.set(0);
    this.roundSpeedMs.set(3500);
    this.gameOver.set(false);
    this.randomizeRound();
  }

  private handleSwipe(dir: Direction) {
    const expected: Direction = this.isGreen() ? this.movementDirection() : this.arrowDirection();
    const correct = dir === expected;

    if (correct) {
      this.score.update(s => s + 1);
      if (this.score() > this.bestScore()) {
        this.bestScore.set(this.score());
        localStorage.setItem('bestScore', String(this.bestScore));
      }
      // Accélère progressivement
      this.roundSpeedMs.set(Math.max(1200, Math.round(this.roundSpeedMs() * 0.94)));
      this.randomizeRound();
    } else {
      this.endGame();
    }
  }

  private endGame() {
    this.gameOver.set(true);
  }

  private detectDirection(dx: number, dy: number): Direction {
    if (Math.abs(dx) > Math.abs(dy)) {
      return dx > 0 ? 'right' : 'left';
    } else {
      return dy > 0 ? 'down' : 'up';
    }
  }

  private randomDir(except?: Direction): Direction {
    const dirs: Direction[] = ['left', 'right', 'up', 'down'];
    let d: Direction;
    do {
      d = dirs[Math.floor(Math.random() * dirs.length)];
    } while (except && d === except);
    return d;
  }

  private randomizeRound() {
    // Choix des directions
    this.movementDirection.set(this.randomDir());
    this.arrowDirection.set(this.randomDir(this.movementDirection())); // la flèche est différente du déplacement global
    // Couleur (50/50)
    this.isGreen.set(Math.random() < 0.5);
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
