import Phaser from 'phaser';
import { HexCoord } from '../hex/HexCoord';
import { HexRenderer } from '../hex/HexRenderer';
import { AttackResult } from '../combat/CombatResolver';

// Tweens the attacker sprite ~12px toward the target hex, then returns.
// yoyo: true handles the return trip — total duration is ~150ms + ~150ms = ~300ms.
// Sprite is snapped back to exact origin after the yoyo to prevent float drift.
export function playAttackBump(
  scene:      Phaser.Scene,
  sprite:     Phaser.GameObjects.Container,
  targetHex:  HexCoord,
  hexRenderer: HexRenderer,
): Promise<void> {
  const origin = { x: sprite.x, y: sprite.y };
  const target = hexRenderer.hexToScreen(targetHex);

  const dx   = target.x - origin.x;
  const dy   = target.y - origin.y;
  const dist = Math.sqrt(dx * dx + dy * dy);

  // Normalize direction and offset 12px toward target.
  // Guard dist === 0 so we never divide by zero (attacker on defender's hex — shouldn't
  // happen, but produces a harmless 300ms no-op tween if it does).
  const bumpX = dist > 0 ? origin.x + (dx / dist) * 12 : origin.x;
  const bumpY = dist > 0 ? origin.y + (dy / dist) * 12 : origin.y;

  return new Promise<void>(resolve => {
    scene.tweens.add({
      targets:  sprite,
      x:        bumpX,
      y:        bumpY,
      duration: 150,
      ease:     'Quad.easeOut',
      yoyo:     true,
      onComplete: () => {
        // Pin to exact origin — the yoyo reversal may accumulate sub-pixel drift.
        sprite.setPosition(origin.x, origin.y);
        resolve();
      },
    });
  });
}

// Fire-and-forget: spawns a Text at `position`, floats it up ~30px, fades it out
// over 800ms, then destroys it. Rendered at depth 20 so it appears above all units.
// Hit: shows the damage value in red.  Miss: shows "MISS" in gray.
export function showDamageText(
  scene:    Phaser.Scene,
  position: { x: number; y: number },
  result:   AttackResult,
): void {
  const label = result.hit ? String(result.damage) : 'MISS';
  const color = result.hit ? '#ff4444' : '#888888';

  const textObj = scene.add
    .text(position.x, position.y, label, {
      fontSize:   '16px',
      color,
      fontFamily: 'monospace',
      fontStyle:  'bold',
    })
    .setDepth(20)
    .setOrigin(0.5, 0.5);

  scene.tweens.add({
    targets:  textObj,
    y:        position.y - 30,
    alpha:    0,
    duration: 800,
    ease:     'Quad.easeOut',
    onComplete: () => textObj.destroy(),
  });
}

// Brief red flash on the defender's hex on a hit.  Self-contained — creates and
// destroys its own Graphics object without touching the HexRenderer layers.
// Pointy-top hex corners match HexRenderer geometry exactly.
export function flashDefenderHex(
  scene:     Phaser.Scene,
  hexCenter: { x: number; y: number },
  hexSize:   number,
): void {
  const gfx = scene.add.graphics().setDepth(15).setAlpha(0.55);
  gfx.fillStyle(0xff2222, 1);

  const pts = Array.from({ length: 6 }, (_, i) => {
    const angle = Phaser.Math.DegToRad(60 * i - 30);
    return new Phaser.Math.Vector2(
      hexCenter.x + hexSize * Math.cos(angle),
      hexCenter.y + hexSize * Math.sin(angle),
    );
  });
  gfx.fillPoints(pts, true);

  scene.tweens.add({
    targets:  gfx,
    alpha:    0,
    duration: 250,
    onComplete: () => gfx.destroy(),
  });
}
