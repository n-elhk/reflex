import { RoundType, Direction } from "./game.state";

export const randomDir = (except?: Direction): Direction => {
    const dirs: Direction[] = ['left', 'right', 'up', 'down'];
    let d: Direction;
    do {
        d = dirs[Math.floor(Math.random() * dirs.length)];
    } while (except && d === except);
    return d;
}

export const randomRound = (): RoundType => {
    return Math.random() < 0.5 ? 'movement' : 'arrow';
}

export const arrowIconWithDirection = (direction: Direction): string => {
    switch (direction) {
        case 'left': return 'arrow-back-outline';
        case 'right': return 'arrow-forward-outline';
        case 'up': return 'arrow-up-outline';
        case 'down': return 'arrow-down-outline';
    }
}
