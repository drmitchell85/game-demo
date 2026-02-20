import Phaser from 'phaser';
import { HexCoord, pixelToHex } from '../hex/HexCoord';
import { HexGrid } from '../hex/HexGrid';
import { HexRenderer } from '../hex/HexRenderer';
import { HOVER_COLOR, HOVER_ALPHA, SELECT_COLOR, SELECT_ALPHA } from '../config/colors';

// Tracks the pointer-hovered hex each frame and repaints the depth-2 highlight
// layer (selection indicator + hover tint) whenever either value changes.
//
// `getSelectedHex` is a callback that returns the selected unit's world-space hex
// at the moment of a redraw — letting HoverSystem composite both overlays without
// holding a direct reference to selection state.
export class HoverSystem {
  hoveredHex: HexCoord | null = null;

  constructor(
    private scene:          Phaser.Scene,
    private grid:           HexGrid,
    private gridOrigin:     { x: number; y: number },
    private hexSize:        number,
    private hexRenderer:    HexRenderer,
    private getSelectedHex: () => HexCoord | null,
  ) {}

  // Called from GameScene.update() every frame.
  // Converts pointer world-space position to a grid hex and repaints only when changed.
  update(): void {
    const pointer = this.scene.input.activePointer;

    // Always use worldX/Y — accounts for camera pan and zoom.
    const hex = pixelToHex(
      pointer.worldX - this.gridOrigin.x,
      pointer.worldY - this.gridOrigin.y,
      this.hexSize,
    );

    // null when the pointer is outside the grid boundary.
    const hovered: HexCoord | null = this.grid.has(hex) ? hex : null;

    // Only repaint when the hovered hex actually changes to avoid redundant draws.
    if (!hexEqual(hovered, this.hoveredHex)) {
      this.hoveredHex = hovered;
      this.redraw();
    }
  }

  // Repaints the depth-2 highlight layer: selection indicator first, hover tint on top.
  // Call this after any selection change so both overlays stay in sync.
  redraw(): void {
    this.hexRenderer.clearHighlights();

    // Selection indicator: white overlay on the selected unit's own hex.
    const selectedHex = this.getSelectedHex();
    if (selectedHex !== null) {
      this.hexRenderer.highlightHex(selectedHex, SELECT_COLOR, SELECT_ALPHA);
    }

    // Hover tint: draws on top of the selection overlay when they overlap.
    if (this.hoveredHex !== null) {
      this.hexRenderer.highlightHex(this.hoveredHex, HOVER_COLOR, HOVER_ALPHA);
    }
  }
}

// Null-safe equality check for two hex coordinates.
function hexEqual(a: HexCoord | null, b: HexCoord | null): boolean {
  if (a === null && b === null) return true;
  if (a === null || b === null) return false;
  return a.q === b.q && a.r === b.r;
}
