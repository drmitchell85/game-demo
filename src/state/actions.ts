import { HexCoord } from '../hex/HexCoord';

export type GameAction =
  | { type: 'MOVE_UNIT'; unitId: string; to: HexCoord }
  | { type: 'END_TURN' }
  // Pre-resolved: scene calls resolveAttack() and dispatches the outcome.
  // Reducer stays deterministic — same action always produces same next-state.
  | { type: 'ATTACK_UNIT'; attackerId: string; defenderId: string; hit: boolean; damage: number };
