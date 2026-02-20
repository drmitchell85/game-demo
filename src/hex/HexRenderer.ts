import Phaser from 'phaser';
import { HexCoord, hexToPixel } from './HexCoord';
import { HexGrid } from './HexGrid';

export interface HexRendererOptions {
  size: number;
  gridOrigin: { x: number; y: number };
  fillColor: number;
  fillAlpha: number;
  strokeColor: number;
  strokeAlpha: number;
  strokeWidth: number;
}

const DEFAULTS: HexRendererOptions = {
  size: 36,
  gridOrigin: { x: 0, y: 0 },
  fillColor: 0x1a1a2e,
  fillAlpha: 0.85,
  strokeColor: 0x4a4a6a,
  strokeAlpha: 0.9,
  strokeWidth: 1,
};

export class HexRenderer {
  private graphics:          Phaser.GameObjects.Graphics; // depth 0: base grid
  private rangeGraphics:     Phaser.GameObjects.Graphics; // depth 1: movement range
  private highlightGraphics: Phaser.GameObjects.Graphics; // depth 2: hover
  readonly options: HexRendererOptions;

  constructor(
    scene: Phaser.Scene,
    private readonly grid: HexGrid,
    options: Partial<HexRendererOptions> = {},
  ) {
    this.options = { ...DEFAULTS, ...options };

    // Explicit depths ensure correct layering regardless of display-list order.
    this.graphics = scene.add.graphics().setDepth(0);
    this.drawGrid();

    this.rangeGraphics     = scene.add.graphics().setDepth(1);
    this.highlightGraphics = scene.add.graphics().setDepth(2);
  }

  // Draw every hex in the grid with the default fill. Called once at creation
  // and again whenever the camera zoom changes (to keep borders 1 screen pixel thick).
  private drawGrid(): void {
    this.grid.forEach(cell => {
      this.drawHex(cell.hex, this.options.fillColor, this.options.fillAlpha);
    });
  }

  // Redraw the base grid with a new stroke width. Called when camera zoom changes
  // so borders stay exactly 1 screen pixel: strokeWidth = 1 / cameraZoom.
  redrawGrid(strokeWidth: number): void {
    this.options.strokeWidth = strokeWidth;
    this.graphics.clear();
    this.drawGrid();
  }

  // Draw a single hex by coordinate with an optional fill override.
  // Used by the hover/highlight system to repaint individual hexes.
  drawHex(hex: HexCoord, fillColor?: number, fillAlpha?: number): void {
    const center = this.hexToScreen(hex);
    const color  = fillColor ?? this.options.fillColor;
    const alpha  = fillAlpha ?? this.options.fillAlpha;
    const pts    = this.cornerPoints(center.x, center.y);

    this.graphics.fillStyle(color, alpha);
    this.graphics.fillPoints(pts, true);

    this.graphics.lineStyle(
      this.options.strokeWidth,
      this.options.strokeColor,
      this.options.strokeAlpha,
    );
    this.graphics.strokePoints(pts, true);
  }

  // Paint movement-range hexes. Sets fillStyle once for the whole batch.
  highlightRange(hexes: HexCoord[], fillColor: number, fillAlpha: number): void {
    this.rangeGraphics.fillStyle(fillColor, fillAlpha);
    for (const hex of hexes) {
      const center = this.hexToScreen(hex);
      this.rangeGraphics.fillPoints(this.cornerPoints(center.x, center.y), true);
    }
  }

  // Remove movement-range highlights.
  clearRange(): void {
    this.rangeGraphics.clear();
  }

  // Draw a fill overlay on the hover layer for a single hex.
  // No stroke — the base grid's borders always show through.
  highlightHex(hex: HexCoord, fillColor: number, fillAlpha: number): void {
    const center = this.hexToScreen(hex);
    const pts    = this.cornerPoints(center.x, center.y);
    this.highlightGraphics.fillStyle(fillColor, fillAlpha);
    this.highlightGraphics.fillPoints(pts, true);
  }

  // Remove hover overlay.
  clearHighlights(): void {
    this.highlightGraphics.clear();
  }

  // World-space pixel center of a hex.
  hexToScreen(hex: HexCoord): { x: number; y: number } {
    const local = hexToPixel(hex, this.options.size);
    return {
      x: this.options.gridOrigin.x + local.x,
      y: this.options.gridOrigin.y + local.y,
    };
  }

  // Compute the 6 corner points of a pointy-top hex centred at (cx, cy).
  // Pointy-top: first corner at angle -30° (top-right), then every 60°.
  private cornerPoints(cx: number, cy: number): Phaser.Math.Vector2[] {
    return Array.from({ length: 6 }, (_, i) => {
      const angle = Phaser.Math.DegToRad(60 * i - 30);
      return new Phaser.Math.Vector2(
        cx + this.options.size * Math.cos(angle),
        cy + this.options.size * Math.sin(angle),
      );
    });
  }
}
