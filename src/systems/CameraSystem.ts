import Phaser from 'phaser';
import { ZOOM_STEP, MIN_ZOOM, MAX_ZOOM, PAN_SPEED } from '../config/game.config';
import { HexRenderer } from '../hex/HexRenderer';

// Directional keys returned by addKeys() for WASD pan.
interface WASDKeys {
  up:    Phaser.Input.Keyboard.Key;
  down:  Phaser.Input.Keyboard.Key;
  left:  Phaser.Input.Keyboard.Key;
  right: Phaser.Input.Keyboard.Key;
}

// Owns all camera input: keyboard pan (arrow + WASD), middle-mouse drag pan,
// scroll-wheel zoom, and the zoom-adaptive grid stroke redraw.
export class CameraSystem {
  private readonly scene:       Phaser.Scene;
  private readonly camera:      Phaser.Cameras.Scene2D.Camera;
  private readonly hexRenderer: HexRenderer;

  // Keyboard pan keys — bound in the constructor.
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!:    WASDKeys;

  // Grid stroke redraw is only needed when zoom actually changes.
  private lastZoom = 1;

  // Middle-mouse drag state.
  private isDragging = false;
  private dragStart   = { x: 0, y: 0 };

  constructor(
    scene:       Phaser.Scene,
    camera:      Phaser.Cameras.Scene2D.Camera,
    hexRenderer: HexRenderer,
  ) {
    this.scene       = scene;
    this.camera      = camera;
    this.hexRenderer = hexRenderer;
    this.bindKeyboard();
    this.bindEvents();
  }

  // Call once per frame from GameScene.update().
  // Handles keyboard pan and zoom-adaptive grid stroke in one place.
  update(): void {
    this.panCamera();
    this.updateGridStroke();
  }

  // Moves the camera based on held arrow / WASD keys each frame.
  // Camera bounds (set in create) clamp scrollX/Y automatically.
  private panCamera(): void {
    const cam = this.camera;
    if (this.cursors.left.isDown  || this.wasd.left.isDown)  cam.scrollX -= PAN_SPEED;
    if (this.cursors.right.isDown || this.wasd.right.isDown) cam.scrollX += PAN_SPEED;
    if (this.cursors.up.isDown    || this.wasd.up.isDown)    cam.scrollY -= PAN_SPEED;
    if (this.cursors.down.isDown  || this.wasd.down.isDown)  cam.scrollY += PAN_SPEED;
  }

  // Redraws hex grid borders when camera zoom changes, keeping them exactly
  // 1 screen pixel thick: world strokeWidth = 1 / zoom.
  private updateGridStroke(): void {
    const zoom = this.camera.zoom;
    if (zoom !== this.lastZoom) {
      this.lastZoom = zoom;
      this.hexRenderer.redrawGrid(1 / zoom);
    }
  }

  private bindKeyboard(): void {
    this.cursors = this.scene.input.keyboard!.createCursorKeys();
    this.wasd    = this.scene.input.keyboard!.addKeys({
      up:    'W',
      down:  'S',
      left:  'A',
      right: 'D',
    }) as WASDKeys;
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
