import { GameState } from './GameState';
import { Unit } from '../entities/Unit';
import { HexCoord, hexNeighbors } from '../hex/HexCoord';

// Returns the unit occupying the given hex, or undefined if the hex is empty.
export function getUnitAtHex(state: GameState, hex: HexCoord): Unit | undefined {
  for (const unit of state.units.values()) {
    if (unit.hex.q === hex.q && unit.hex.r === hex.r) return unit;
  }
  return undefined;
}

// Returns all player-faction units.
export function getPlayerUnits(state: GameState): Unit[] {
  return Array.from(state.units.values()).filter(u => u.faction === 'player');
}

// Returns all enemy-faction units.
export function getEnemyUnits(state: GameState): Unit[] {
  return Array.from(state.units.values()).filter(u => u.faction === 'enemy');
}

// Returns all enemy-faction units occupying a hex adjacent to `unitHex`.
export function getAdjacentEnemies(state: GameState, unitHex: HexCoord): Unit[] {
  const result: Unit[] = [];
  for (const neighbor of hexNeighbors(unitHex)) {
    const unit = getUnitAtHex(state, neighbor);
    if (unit?.faction === 'enemy') result.push(unit);
  }
  return result;
}
