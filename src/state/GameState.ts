import { Unit } from '../entities/Unit';

export interface GameState {
  units:      Map<string, Unit>;
  activeTurn: 'PLAYER' | 'ENEMY';
  round:      number;
}

export function createInitialState(): GameState {
  const player: Unit = {
    id:          'player',
    hex:         { q: 0, r: 0 },
    moveRange:   3,
    faction:     'player',
    hasMoved:    false,
    hasAttacked: false,
    hp:          10,
    maxHp:       10,
    attack:      3,
  };

  const player2: Unit = {
    id:          'player-2',
    hex:         { q: 1, r: 1 },
    moveRange:   3,
    faction:     'player',
    hasMoved:    false,
    hasAttacked: false,
    hp:          10,
    maxHp:       10,
    attack:      3,
  };

  const enemy1: Unit = {
    id:          'enemy-1',
    hex:         { q: 8, r: 4 },
    moveRange:   2,
    faction:     'enemy',
    hasMoved:    false,
    hasAttacked: false,
    hp:          8,
    maxHp:       8,
    attack:      2,
  };

  const enemy2: Unit = {
    id:          'enemy-2',
    hex:         { q: 9, r: 3 },
    moveRange:   2,
    faction:     'enemy',
    hasMoved:    false,
    hasAttacked: false,
    hp:          8,
    maxHp:       8,
    attack:      2,
  };

  const enemy3: Unit = {
    id:          'enemy-3',
    hex:         { q: 7, r: 5 },
    moveRange:   2,
    faction:     'enemy',
    hasMoved:    false,
    hasAttacked: false,
    hp:          8,
    maxHp:       8,
    attack:      2,
  };

  return {
    units: new Map([
      ['player',   player],
      ['player-2', player2],
      ['enemy-1',  enemy1],
      ['enemy-2',  enemy2],
      ['enemy-3',  enemy3],
    ]),
    activeTurn: 'PLAYER',
    round:      1,
  };
}
