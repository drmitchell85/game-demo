import Phaser from 'phaser';
import { Unit } from './Unit';
import { HexRenderer } from '../hex/HexRenderer';

// Placeholder visual for a unit — a gold rectangle centered on its hex.
// Swap this for a Phaser.GameObjects.Sprite once pixel art assets exist.
export class UnitSprite {
  private rect: Phaser.GameObjects.Rectangle;

  constructor(
    scene: Phaser.Scene,
    unit: Unit,
    hexRenderer: HexRenderer,
    color = 0xd4af37,
  ) {
    const center = hexRenderer.hexToScreen(unit.hex);

    // 24×32px rectangle — narrower than a hex so the grid lines stay visible.
    this.rect = scene.add.rectangle(center.x, center.y, 24, 32, color);
    // Render above grid (0), range (1), and hover (2) layers.
    this.rect.setDepth(3);
  }

  // Expose the underlying game object so MovementSystem can tween it directly.
  getGameObject(): Phaser.GameObjects.Rectangle {
    return this.rect;
  }
}
