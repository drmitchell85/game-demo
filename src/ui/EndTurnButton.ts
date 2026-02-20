import Phaser from 'phaser';

// A fixed-screen "End Turn" button composed of a Phaser Rectangle + Text,
// both pinned with setScrollFactor(0) so they stay in place during pan/zoom.
//
// Why Phaser objects instead of a DOM button: scale.mode: FIT scales the
// canvas element with CSS but does not scale DOM overlays, causing click-region
// misalignment. Phaser objects live inside the canvas coordinate system and
// are always correctly positioned.
export class EndTurnButton {
  private readonly bg:   Phaser.GameObjects.Rectangle;
  private readonly text: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene, onClick: () => void) {
    this.bg = scene.add.rectangle(880, 510, 140, 36, 0x334466)
      .setScrollFactor(0)
      .setDepth(10)
      .setInteractive({ useHandCursor: true });

    this.text = scene.add.text(880, 510, 'End Turn', {
      fontSize:  '14px',
      color:     '#e0e0e0',
      fontFamily: 'monospace',
    })
      .setOrigin(0.5, 0.5)
      .setScrollFactor(0)
      .setDepth(10);

    // Use pointerdown on the Rectangle, not scene-global pointerup, so this
    // button's click event does not collide with InputSystem's grid pointerup.
    this.bg.on('pointerdown', onClick);
  }

  // Toggle enabled state: dims alpha and removes/restores interactivity.
  setEnabled(enabled: boolean): void {
    this.bg.setAlpha(enabled ? 1.0 : 0.4);
    this.text.setAlpha(enabled ? 1.0 : 0.4);
    if (enabled) {
      this.bg.setInteractive({ useHandCursor: true });
    } else {
      this.bg.disableInteractive();
    }
  }

  destroy(): void {
    this.bg.destroy();
    this.text.destroy();
  }
}
