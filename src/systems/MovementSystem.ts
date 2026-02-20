import Phaser from 'phaser';
import { HexCoord } from '../hex/HexCoord';
import { HexRenderer } from '../hex/HexRenderer';

// Animate a Phaser game object along a sequence of hex positions.
// Each hop takes 250ms with a smooth ease. Resolves when the final hex is reached.
// path should exclude the unit's current hex (BFS already does this).
export function moveAlongPath(
  scene: Phaser.Scene,
  target: { x: number; y: number },
  path: HexCoord[],
  hexRenderer: HexRenderer,
): Promise<void> {
  return new Promise<void>((resolve) => {
    if (path.length === 0) {
      resolve();
      return;
    }

    let index = 0;

    function tweenNext(): void {
      const center = hexRenderer.hexToScreen(path[index]);
      scene.tweens.add({
        targets: target,
        x: center.x,
        y: center.y,
        duration: 250,
        ease: 'Quad.easeInOut',
        onComplete: () => {
          index++;
          if (index < path.length) {
            tweenNext();
          } else {
            resolve();
          }
        },
      });
    }

    tweenNext();
  });
}
