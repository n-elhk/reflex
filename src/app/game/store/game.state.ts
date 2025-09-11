export type SwipeDirection = 'left' | 'right' | 'up' | 'down';

export type RoundType = 'movement' | 'arrow';

export type GameSatus = 'over' | 'playing';

export type GameState = {
    gameStatus: GameSatus;
    score: number;
    bestScore: number;
    roundType: RoundType;
    movementDirection: SwipeDirection;
    arrowDirection: SwipeDirection;
}



