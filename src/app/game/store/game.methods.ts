import { randomDir, randomRound } from "./game.fn";
import type { GameState } from "./game.state";

export function randomizeRound(): Pick<GameState, 'roundType' | 'movementDirection' | 'arrowDirection'> {
  const movementDirection = randomDir();

  return {
    roundType: randomRound(),
    movementDirection: randomDir(),
    arrowDirection: randomDir(movementDirection)
  };
}

export function setGameOver(): Pick<GameState, 'gameStatus'> {
  return {
    gameStatus: 'over',
  };
}