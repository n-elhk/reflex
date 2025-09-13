export type Direction = 'left' | 'right' | 'up' | 'down';

export type RoundType = 'movement' | 'arrow';

export type GameSatus = 'over' | 'playing';

export type GameState = {
    gameStatus: GameSatus;
    score: number;
    bestScore: number;
    roundType: RoundType;
    movementDirection: Direction;
    arrowDirection: Direction;
}



