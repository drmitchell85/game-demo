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

    case 'ATTACK_UNIT': {
      const attacker = state.units.get(action.attackerId);
      const defender = state.units.get(action.defenderId);
      // Guard: unknown unit or self-attack — no-op.
      if (!attacker || !defender || action.attackerId === action.defenderId) return state;

      const updatedUnits = new Map(state.units);

      // Attacker uses their attack regardless of hit or miss.
      updatedUnits.set(action.attackerId, { ...attacker, hasAttacked: true });

      // On hit: reduce defender hp, clamped to 0 (death handled separately in 4.5).
      if (action.hit) {
        const newHp = Math.max(0, defender.hp - action.damage);
        updatedUnits.set(action.defenderId, { ...defender, hp: newHp });
      }

      return { ...state, units: updatedUnits };
    }

    case 'REMOVE_UNIT': {
      // Unknown unit id — no-op (return the same reference so callers can detect it).
      if (!state.units.has(action.unitId)) return state;
      const updatedUnits = new Map(state.units);
      updatedUnits.delete(action.unitId);
      return { ...state, units: updatedUnits };
    }

    case 'END_TURN': {
      const nextTurn = state.activeTurn === 'PLAYER' ? 'ENEMY' : 'PLAYER';

      // Transitioning to PLAYER: increment round and reset hasMoved + hasAttacked for all player units.
      // TODO(Phase 5): reset enemy hasMoved + hasAttacked on PLAYER → ENEMY transition.
      if (nextTurn === 'PLAYER') {
        const updatedUnits = new Map(state.units);
        for (const [id, unit] of updatedUnits) {
          if (unit.faction === 'player') {
            updatedUnits.set(id, { ...unit, hasMoved: false, hasAttacked: false });
          }
        }
        return { ...state, activeTurn: 'PLAYER', round: state.round + 1, units: updatedUnits };
      }

      // Transitioning to ENEMY: no round change, no reset.
      return { ...state, activeTurn: 'ENEMY' };
    }
  }
}
