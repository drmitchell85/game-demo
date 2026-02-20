import Phaser from 'phaser';
import { Unit } from './Unit';
import { HexRenderer } from '../hex/HexRenderer';

// Placeholder visual for a unit — a Container holding a colored rectangle.
// Using Container allows HP bar children (Phase 4.4b) to move with the unit
// during animation: tweening the Container's x/y moves all children in sync.
// Swap the rectangle for a Phaser.GameObjects.Sprite once pixel art assets exist.
export class UnitSprite {
  private container: Phaser.GameObjects.Container;

  constructor(
    scene: Phaser.Scene,
    unit: Unit,
    hexRenderer: HexRenderer,
    color = 0xd4af37,
  ) {
    const center = hexRenderer.hexToScreen(unit.hex);

    // 24×32px rectangle — narrower than a hex so the grid lines stay visible.
    // Positioned at (0, 0) relative to the container's origin.
    const rect = scene.add.rectangle(0, 0, 24, 32, color);

    // Container holds the rectangle (and future HP bar children from Phase 4.4b).
    // Moving the container moves all children in sync during animation.
    this.container = scene.add.container(center.x, center.y, [rect]);
    // Render above grid (0), range (1), and hover (2) layers.
    this.container.setDepth(3);
  }

  // Expose the Container so MovementSystem can tween its x/y directly.
  // Children (rectangle + future HP bar) follow automatically.
  getGameObject(): Phaser.GameObjects.Container {
    return this.container;
  }

  // Destroy the container and all its children (rectangle, HP bar, etc.).
  // Called by GameScene when a unit is removed from state (Phase 4.5).
  destroy(): void {
    this.container.destroy();
  }
}
