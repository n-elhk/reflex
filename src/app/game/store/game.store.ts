import { computed } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { patchState, signalStore, withComputed, withHooks, withMethods, withProps, withState } from '@ngrx/signals';
import { GameState, SwipeDirection } from './game.state';
import { randomizeRound, setGameOver } from './game.methods';
import { arrowIconWithDirection } from './game.fn';
import { withStorageSync } from '@angular-architects/ngrx-toolkit';
import { endWith, filter, interval, map, merge, mergeWith, startWith, switchMap, takeUntil, takeWhile, tap, timer } from 'rxjs';

const initialState: GameState = {
  gameStatus: 'playing',
  bestScore: 0,
  score: 0,
  ...randomizeRound(),
};

export const GameStore = signalStore(
  withState(initialState),
  withStorageSync({
    key: 'best-score',
    // Only persist the public fields; omit sensitive/ephemeral data
    select: ({ bestScore }) => ({ bestScore }),
    autoSync: false, // Disable automatic synchronization
  }),
  withComputed(({ gameStatus, arrowDirection, roundType }) => ({
    isOver: computed(() => gameStatus() === 'over'),
    isMovmentRound: computed(() => roundType() === 'movement'),
    iconName: computed(() => arrowIconWithDirection(arrowDirection())),
  })),
  withComputed(({ isMovmentRound }) => ({
    helpText: computed(() => isMovmentRound()
      ? 'Sens de  déplacement'
      : 'Sens de la flèche'),
  })),

  withProps(({ arrowDirection, gameStatus, score }) => {
    const DURATION = 10_000;
    const arrowDirection$ = toObservable(arrowDirection);
    const gameStatus$ = toObservable(gameStatus);
    const playing$ = gameStatus$.pipe(
      filter(s => s === 'playing')
    );

    const computeDuration = (score: number) => Math.max(1000, DURATION * Math.pow(0.95, score));

    const over$ = gameStatus$.pipe(filter(s => s === 'over'));

    const countdown$ = merge(
      playing$,
      arrowDirection$).pipe(
        switchMap(() => {
          const durationByScore = computeDuration(score());

          return interval(100).pipe(
            map(i => durationByScore - i * 100),
            map(i => ({
              remaining: i,
              duration: durationByScore
            })),
            takeWhile(({ remaining }) => remaining >= 0),
            takeUntil(over$),
          )
        }
        ),
        mergeWith(over$.pipe(map(() => ({ remaining: 0, duration: DURATION })))) // force un 0 sans tuer le flux
      );

    return {
      countdown: () => countdown$,
    };
  }),

  withMethods((store) => ({
    handleSwipe(dir: SwipeDirection): void {
      const expected = store.isMovmentRound() ? store.movementDirection() : store.arrowDirection();
      const isCorrect = dir === expected;
      if (isCorrect) {
        const score = store.score() + 1;
        patchState(store, { ...randomizeRound(), score });

        if (score > store.bestScore()) {
          patchState(store, { bestScore: score });
          store.writeToStorage();
        }

      } else {
        patchState(store, setGameOver());
      }
    },

    replay(): void {
      const { bestScore, ...state } = initialState
      patchState(store, state);
    },

    endGame(): void {
      patchState(store, setGameOver());
    },
  })),
  withHooks({
    async onInit(store) {
      store.countdown().pipe(
        filter(({ remaining }) => remaining === 0),
        tap(() => store.endGame()),
        takeUntilDestroyed()
      ).subscribe();

      // Ensure initial state is read from IndexedDB before any writes
      await store.readFromStorage();
    },
  }),
);