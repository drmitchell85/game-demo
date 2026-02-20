import { HexCoord } from '../hex/HexCoord';

export type GameAction =
  | { type: 'MOVE_UNIT'; unitId: string; to: HexCoord }
  | { type: 'END_TURN' }
  // Pre-resolved: scene calls resolveAttack() and dispatches the outcome.
  // Reducer stays deterministic — same action always produces same next-state.
  | { type: 'ATTACK_UNIT'; attackerId: string; defenderId: string; hit: boolean; damage: number }
  // Dispatched by the scene after death animation (or immediately in 4.5) to
  // remove a dead unit from state. Sprite destruction is the scene's responsibility.
  | { type: 'REMOVE_UNIT'; unitId: string };
