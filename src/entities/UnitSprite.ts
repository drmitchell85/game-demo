import Phaser from 'phaser';
import { Unit } from './Unit';
import { HexRenderer } from '../hex/HexRenderer';

// HP bar dimensions relative to the container's origin.
const BAR_WIDTH  = 28;
const BAR_HEIGHT = 4;
// Center of the bar: 4px above the top edge of the 32px unit rect (top edge at y=-16).
const BAR_Y      = -22;

// Placeholder visual for a unit — a Container holding a colored rectangle and HP bar.
// Using Container allows all children to move with the unit during animation:
// tweening the Container's x/y moves the rectangle and HP bar in sync automatically.
// Swap the rectangle for a Phaser.GameObjects.Sprite once pixel art assets exist.
export class UnitSprite {
  private container:  Phaser.GameObjects.Container;
  private hpBarFill: Phaser.GameObjects.Rectangle;

  constructor(
    scene: Phaser.Scene,
    unit: Unit,
    hexRenderer: HexRenderer,
    color = 0xd4af37,
  ) {
    const center = hexRenderer.hexToScreen(unit.hex);

    // Unit rectangle — 24×32px centered at the container origin.
    const rect = scene.add.rectangle(0, 0, 24, 32, color);

    // HP bar — background (dark gray) then fill (colored), rendered above rect
    // in insertion order within the container.
    const hpBarBg = scene.add.rectangle(0, BAR_Y, BAR_WIDTH, BAR_HEIGHT, 0x333333);

    // Fill bar: origin (0, 0.5) pins the left edge so width shrinks from the right.
    // Left edge is at x = -BAR_WIDTH / 2 to align with the background left edge.
    const ratio     = unit.maxHp > 0 ? unit.hp / unit.maxHp : 1;
    const fillWidth = ratio * BAR_WIDTH;
    this.hpBarFill  = scene.add
      .rectangle(-BAR_WIDTH / 2, BAR_Y, fillWidth, BAR_HEIGHT, hpFillColor(ratio))
      .setOrigin(0, 0.5);

    // Container: rect drawn first (back), hp bar on top.
    // Depth 3 renders above grid (0), range (1), and hover (2) layers.
    this.container = scene.add.container(center.x, center.y, [rect, hpBarBg, this.hpBarFill]);
    this.container.setDepth(3);
  }

  // Expose the Container so MovementSystem can tween its x/y directly.
  // All children (rectangle + HP bar) follow automatically.
  getGameObject(): Phaser.GameObjects.Container {
    return this.container;
  }

  // Recalculate fill width and color after damage.
  // Called by GameScene after dispatching ATTACK_UNIT.
  updateHp(hp: number, maxHp: number): void {
    const ratio = maxHp > 0 ? hp / maxHp : 0;
    this.hpBarFill.width = ratio * BAR_WIDTH;
    this.hpBarFill.setFillStyle(hpFillColor(ratio));
  }

  // Destroy the container and all its children (rectangle, HP bar, etc.).
  // Called by GameScene when a unit is removed from state (Phase 4.5).
  destroy(): void {
    this.container.destroy();
  }
}

// Returns bar fill color based on HP ratio:
// green > 50%, yellow > 25%, red ≤ 25%.
function hpFillColor(ratio: number): number {
  if (ratio > 0.5)  return 0x44cc44; // green
  if (ratio > 0.25) return 0xcccc44; // yellow
  return 0xcc4444;                   // red
}
