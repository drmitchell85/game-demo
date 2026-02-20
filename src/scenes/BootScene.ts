import Phaser from 'phaser';

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  preload(): void {
    // Asset loading will go here in future phases.
    // For now the scene is a pass-through.
  }

  create(): void {
    this.scene.start('GameScene');
  }
}
