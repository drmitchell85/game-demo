import Phaser from 'phaser';
import { HexCoord, pixelToHex } from '../hex/HexCoord';
import { HexGrid } from '../hex/HexGrid';

// Listens for pointerup events, converts screen coords to hex coords,
// and calls onHexClick if the click lands on a valid grid cell.
export class InputSystem {
  private readonly handler: (pointer: Phaser.Input.Pointer) => void;

  constructor(
    scene: Phaser.Scene,
    grid: HexGrid,
    gridOrigin: { x: number; y: number },
    hexSize: number,
    onHexClick: (hex: HexCoord) => void,
  ) {
    this.handler = (pointer: Phaser.Input.Pointer) => {
      if (pointer.button !== 0) return; // left click only — ignore middle/right mouse
      const hex = pixelToHex(
        pointer.worldX - gridOrigin.x,
        pointer.worldY - gridOrigin.y,
        hexSize,
      );
      if (grid.has(hex)) {
        onHexClick(hex);
      }
    };

    scene.input.on('pointerup', this.handler);
  }

  destroy(scene: Phaser.Scene): void {
    scene.input.off('pointerup', this.handler);
  }
}
