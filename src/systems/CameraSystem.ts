import Phaser from 'phaser';
import { ZOOM_STEP, MIN_ZOOM, MAX_ZOOM } from '../config/game.config';

// Owns camera input beyond keyboard pan (which lives in GameScene.update).
// Handles middle-mouse drag pan and scroll-wheel zoom.
export class CameraSystem {
  private readonly scene: Phaser.Scene;
  private readonly camera: Phaser.Cameras.Scene2D.Camera;

  private isDragging = false;
  private dragStart   = { x: 0, y: 0 };

  constructor(scene: Phaser.Scene, camera: Phaser.Cameras.Scene2D.Camera) {
    this.scene  = scene;
    this.camera = camera;
    this.bindEvents();
  }

  private bindEvents(): void {
    const input = this.scene.input;
    input.on('pointerdown',      this.onPointerDown, this);
    input.on('pointermove',      this.onPointerMove, this);
    input.on('pointerup',        this.onPointerUp,   this);
    // Fires when pointer is released outside the canvas — ensures isDragging is
    // always cleared even if the mouse exits the window while button is held.
    input.on('pointerupoutside', this.onPointerUp,   this);
    input.on('wheel',            this.onWheel,       this);
  }

  private onPointerDown(pointer: Phaser.Input.Pointer): void {
    if (pointer.button !== 1) return; // middle mouse only
    this.isDragging = true;
    this.dragStart  = { x: pointer.x, y: pointer.y };
  }

  private onPointerMove(pointer: Phaser.Input.Pointer): void {
    if (!this.isDragging) return;

    // Use screen-space delta (pointer.x/y), not world coords — we're measuring
    // how far the screen moved, not which world hex the cursor is over.
    const dx = pointer.x - this.dragStart.x;
    const dy = pointer.y - this.dragStart.y;

    // Divide by zoom: at zoom 2.0, a 100px screen drag should move 50 world pixels,
    // not 100. Without this, dragging feels too fast when zoomed in.
    this.camera.scrollX -= dx / this.camera.zoom;
    this.camera.scrollY -= dy / this.camera.zoom;

    // Update start each frame for smooth incremental drag (not relative to mouse-down).
    this.dragStart = { x: pointer.x, y: pointer.y };
  }

  private onPointerUp(pointer: Phaser.Input.Pointer): void {
    if (pointer.button !== 1) return;
    this.isDragging = false;
  }

  private onWheel(
    pointer: Phaser.Input.Pointer,
    _gameObjects: Phaser.GameObjects.GameObject[],
    _deltaX: number,
    deltaY: number,
  ): void {
    const oldZoom = this.camera.zoom;
    // Math.sign normalises trackpad momentum — each scroll event steps by exactly
    // ZOOM_STEP regardless of how fast the wheel is spinning.
    const newZoom = Phaser.Math.Clamp(
      oldZoom - Math.sign(deltaY) * ZOOM_STEP,
      MIN_ZOOM,
      MAX_ZOOM,
    );
    if (newZoom === oldZoom) return; // already at clamp limit — nothing to do

    // Cursor-centered zoom: the world point under the cursor must stay under the
    // cursor after zooming. Derivation:
    //   Before: worldX = scrollX + screenX / oldZoom
    //   After:  worldX = newScrollX + screenX / newZoom  (invariant)
    //   Solve:  newScrollX = worldX - screenX / newZoom
    const worldX = this.camera.scrollX + pointer.x / oldZoom;
    const worldY = this.camera.scrollY + pointer.y / oldZoom;

    this.camera.zoom    = newZoom;
    this.camera.scrollX = worldX - pointer.x / newZoom;
    this.camera.scrollY = worldY - pointer.y / newZoom;
  }

  destroy(): void {
    const input = this.scene.input;
    input.off('pointerdown',      this.onPointerDown, this);
    input.off('pointermove',      this.onPointerMove, this);
    input.off('pointerup',        this.onPointerUp,   this);
    input.off('pointerupoutside', this.onPointerUp,   this);
    input.off('wheel',            this.onWheel,       this);
  }
}
