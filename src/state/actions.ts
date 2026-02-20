import { HexCoord } from '../hex/HexCoord';

export type GameAction =
  | { type: 'MOVE_UNIT'; unitId: string; to: HexCoord }
  | { type: 'END_TURN' };
