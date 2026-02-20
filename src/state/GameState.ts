import { Unit } from '../entities/Unit';

export interface GameState {
  units:      Map<string, Unit>;
  activeTurn: 'PLAYER' | 'ENEMY';
  round:      number;
}

export function createInitialState(): GameState {
  const player: Unit = {
    id:        'player',
    hex:       { q: 0, r: 0 },
    moveRange: 3,
    faction:   'player',
    hasMoved:  false,
  };

  const player2: Unit = {
    id:        'player-2',
    hex:       { q: 1, r: 1 },
    moveRange: 3,
    faction:   'player',
    hasMoved:  false,
  };

  const enemy1: Unit = {
    id:        'enemy-1',
    hex:       { q: 8, r: 4 },
    moveRange: 2,
    faction:   'enemy',
    hasMoved:  false,
  };

  return {
    units: new Map([
      ['player',   player],
      ['player-2', player2],
      ['enemy-1',  enemy1],
    ]),
    activeTurn: 'PLAYER',
    round:      1,
  };
}
