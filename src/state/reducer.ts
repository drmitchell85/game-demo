import { GameState } from './GameState';
import { GameAction } from './actions';

export function applyAction(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'MOVE_UNIT': {
      const unit = state.units.get(action.unitId);
      // Unknown unit — return the same reference so callers can detect no-op.
      if (!unit) return state;

      const updatedUnit  = { ...unit, hex: action.to, hasMoved: true };
      const updatedUnits = new Map(state.units);
      updatedUnits.set(action.unitId, updatedUnit);

      return { ...state, units: updatedUnits };
    }

    case 'END_TURN': {
      const nextTurn = state.activeTurn === 'PLAYER' ? 'ENEMY' : 'PLAYER';

      // Transitioning to PLAYER: increment round and reset hasMoved for all player units.
      if (nextTurn === 'PLAYER') {
        const updatedUnits = new Map(state.units);
        for (const [id, unit] of updatedUnits) {
          if (unit.faction === 'player') {
            updatedUnits.set(id, { ...unit, hasMoved: false });
          }
        }
        return { ...state, activeTurn: 'PLAYER', round: state.round + 1, units: updatedUnits };
      }

      // Transitioning to ENEMY: no round change, no hasMoved reset.
      return { ...state, activeTurn: 'ENEMY' };
    }
  }
}
