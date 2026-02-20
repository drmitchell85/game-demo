import { HexCoord } from '../hex/HexCoord';

// Pure data — no Phaser imports. The visual representation lives in UnitSprite.
export interface Unit {
  id:        string;
  hex:       HexCoord;
  moveRange: number;
  faction:   'player' | 'enemy';
  hasMoved:  boolean;
}
