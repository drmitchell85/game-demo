import Phaser from 'phaser';
import { HexCoord, calcWorldSize, hexToPixel, pixelToHex, hexKey } from '../hex/HexCoord';
import { HexGrid, createRectangularGrid } from '../hex/HexGrid';
import { HexRenderer } from '../hex/HexRenderer';
import { GRID_COLS, GRID_ROWS, HEX_SIZE, PAN_SPEED } from '../config/game.config';
import { GameState, createInitialState } from '../state/GameState';
import { applyAction } from '../state/reducer';
import { getUnitAtHex } from '../state/selectors';
import { UnitSprite } from '../entities/UnitSprite';
import { findPath } from '../hex/pathfinding';
import { getReachableHexes } from '../hex/HexHighlight';
import { moveAlongPath } from '../systems/MovementSystem';
import { InputSystem } from '../systems/InputSystem';
import { CameraSystem } from '../systems/CameraSystem';

const HOVER_COLOR  = 0x3d3d8a;
const HOVER_ALPHA  = 0.75;
const RANGE_COLOR  = 0x3366cc; // soft blue per ROADMAP spec
const RANGE_ALPHA  = 0.25;
const SELECT_COLOR = 0xffffff; // white overlay on selected unit's hex
const SELECT_ALPHA = 0.35;

type SceneMode = 'IDLE' | 'MOVING';

// Directional keys returned by addKeys() for WASD pan.
interface WASDKeys {
  up:    Phaser.Input.Keyboard.Key;
  down:  Phaser.Input.Keyboard.Key;
  left:  Phaser.Input.Keyboard.Key;
  right: Phaser.Input.Keyboard.Key;
}

export class GameScene extends Phaser.Scene {
  private grid!: HexGrid;
  private gridOrigin!: { x: number; y: number };
  private hexRenderer!: HexRenderer;
  private hoveredHex: HexCoord | null = null;

  private gameState!: GameState;
  private unitSprites: Map<string, UnitSprite> = new Map();
  private sceneMode: SceneMode = 'IDLE';

  // null = no unit selected; set when player clicks a player-faction unit.
  private selectedUnitId: string | null = null;

  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!: WASDKeys;
  private cameraSystem!: CameraSystem;
  private lastZoom = 1;

  // Hex keys of cells the selected unit can currently move to (excludes occupied hexes).
  private reachableSet: Set<string> = new Set();

  constructor() {
    super({ key: 'GameScene' });
  }

  create(): void {
    this.grid = createRectangularGrid(GRID_COLS, GRID_ROWS);

    // Anchor the grid so its bounding box starts at world (0, 0).
    // The {q:0, r:0} hex center sits exactly (√3/2·size, size) from the top-left
    // corner of the bounding box — derived from the pointy-top bounding-box formula.
    const SQRT3 = Math.sqrt(3);
    this.gridOrigin = {
      x: (SQRT3 / 2) * HEX_SIZE,
      y: HEX_SIZE,
    };

    // Tell the camera the full extent of the world so it can clamp scroll.
    const { width: worldW, height: worldH } = calcWorldSize(GRID_COLS, GRID_ROWS, HEX_SIZE);
    this.cameras.main.setBounds(0, 0, worldW, worldH);

    // Layer 0: static hex grid.
    this.hexRenderer = new HexRenderer(this, this.grid, {
      size:        HEX_SIZE,
      gridOrigin:  this.gridOrigin,
      fillColor:   0x1a1a2e,
      fillAlpha:   0.85,
      strokeColor: 0x4a4a6a,
      strokeAlpha: 0.9,
      strokeWidth: 1,
    });

    // Layers 1 (range) and 2 (hover/selection) are managed by HexRenderer.

    // Layer 3: unit sprites — one rectangle per unit, gold for players, red for enemies.
    this.gameState = createInitialState();
    this.gameState.units.forEach(unit => {
      const color = unit.faction === 'player' ? 0xd4af37 : 0xcc2222;
      this.unitSprites.set(unit.id, new UnitSprite(this, unit, this.hexRenderer, color));
    });

    // No unit selected on load — range highlights only appear after clicking a unit.

    // Keyboard pan — arrow keys and WASD.
    this.cursors = this.input.keyboard!.createCursorKeys();
    this.wasd    = this.input.keyboard!.addKeys({
      up:    'W',
      down:  'S',
      left:  'A',
      right: 'D',
    }) as WASDKeys;

    // Scroll the camera so the first player's starting hex is visible on load.
    const startPx = hexToPixel(this.gameState.units.get('player')!.hex, HEX_SIZE);
    this.cameras.main.centerOn(
      this.gridOrigin.x + startPx.x,
      this.gridOrigin.y + startPx.y,
    );

    // Middle-mouse drag pan and scroll-wheel zoom.
    this.cameraSystem = new CameraSystem(this, this.cameras.main);

    // Wire up click-to-select / click-to-move.
    new InputSystem(this, this.grid, this.gridOrigin, HEX_SIZE, (hex) => {
      void this.handleClickIntent(hex);
    });
  }

  update(): void {
    this.panCamera();
    this.updateGridStroke();
    this.updateHover();
  }

  // Redraws the hex grid borders whenever camera zoom changes, keeping them
  // exactly 1 screen pixel thick: world strokeWidth = 1 / zoom.
  private updateGridStroke(): void {
    const zoom = this.cameras.main.zoom;
    if (zoom !== this.lastZoom) {
      this.lastZoom = zoom;
      this.hexRenderer.redrawGrid(1 / zoom);
    }
  }

  // Moves the camera each frame based on held arrow / WASD keys.
  // Camera bounds (set in create) clamp scrollX/Y automatically — no manual clamping needed.
  private panCamera(): void {
    const cam = this.cameras.main;
    if (this.cursors.left.isDown  || this.wasd.left.isDown)  cam.scrollX -= PAN_SPEED;
    if (this.cursors.right.isDown || this.wasd.right.isDown) cam.scrollX += PAN_SPEED;
    if (this.cursors.up.isDown    || this.wasd.up.isDown)    cam.scrollY -= PAN_SPEED;
    if (this.cursors.down.isDown  || this.wasd.down.isDown)  cam.scrollY += PAN_SPEED;
  }

  // Dispatched on every left-click on the grid. Two cases:
  //   1. Clicked on a player-faction unit → select it (show range).
  //   2. Clicked on a reachable hex with a unit selected → move that unit.
  private async handleClickIntent(targetHex: HexCoord): Promise<void> {
    if (this.sceneMode !== 'IDLE') return;

    // Case 1: a player unit occupies the clicked hex — select it.
    const unitAtHex = getUnitAtHex(this.gameState, targetHex);
    if (unitAtHex?.faction === 'player') {
      this.selectUnit(unitAtHex.id);
      return;
    }

    // Case 2: a unit is selected and the target is within its range — move it.
    if (this.selectedUnitId === null) return;
    if (!this.reachableSet.has(hexKey(targetHex))) return;

    const unit = this.gameState.units.get(this.selectedUnitId)!;

    // Pass occupied hexes so the path never animates through another unit's sprite.
    // Exclude the moving unit's own starting hex — the BFS must be free to treat
    // it as a valid waypoint (e.g. backtracking on a constrained grid), and
    // getReachableHexes does not block it either, so the two sets must agree.
    const occupiedKeys = new Set<string>();
    this.gameState.units.forEach(u => occupiedKeys.add(hexKey(u.hex)));
    occupiedKeys.delete(hexKey(unit.hex));

    // path.length === 0 only when start === end, which can't happen here because
    // targetHex is in reachableSet (which excludes the unit's own hex). Guard kept
    // for safety.
    const path = findPath(this.grid, unit.hex, targetHex, occupiedKeys);
    if (!path || path.length === 0) return;

    this.sceneMode = 'MOVING';
    this.hexRenderer.clearRange();

    await moveAlongPath(
      this,
      this.unitSprites.get(this.selectedUnitId)!.getGameObject(),
      path,
      this.hexRenderer,
    );

    // State update after animation so logical position matches visual.
    this.gameState = applyAction(this.gameState, {
      type:   'MOVE_UNIT',
      unitId: this.selectedUnitId,
      to:     targetHex,
    });

    this.clearSelection(); // deselect after moving; range clears with it
    this.sceneMode = 'IDLE';
  }

  // Select a unit by id: show its movement range and the white selection indicator.
  // Excludes hexes occupied by any unit from the reachable set.
  private selectUnit(unitId: string): void {
    this.selectedUnitId = unitId;
    this.refreshRangeHighlight(unitId);
    this.redrawHighlightLayer();
  }

  // Clear selection, range highlight, and selection indicator.
  private clearSelection(): void {
    this.selectedUnitId = null;
    this.reachableSet   = new Set();
    this.hexRenderer.clearRange();
    this.redrawHighlightLayer();
  }

  // Recompute the reachable set and range overlay for a specific unit.
  // Excludes the unit's own hex and any hex currently occupied by another unit.
  private refreshRangeHighlight(unitId: string): void {
    const unit      = this.gameState.units.get(unitId)!;
    const reachable = getReachableHexes(this.grid, unit.hex, unit.moveRange);

    // Build a set of all occupied hexes so we can exclude them from the range.
    const occupiedKeys = new Set<string>();
    this.gameState.units.forEach(u => occupiedKeys.add(hexKey(u.hex)));

    // Reachable set: exclude own hex and all occupied hexes.
    // Own hex would never be a move destination; occupied hexes block movement (no stacking).
    this.reachableSet = new Set(
      reachable
        .filter(h => !occupiedKeys.has(hexKey(h)))
        .map(h => hexKey(h)),
    );

    this.hexRenderer.clearRange();
    this.hexRenderer.highlightRange(
      reachable.filter(h => !occupiedKeys.has(hexKey(h))),
      RANGE_COLOR,
      RANGE_ALPHA,
    );
  }

  // Redraws the highlight layer (depth 2) with both the selection indicator and
  // the hover overlay. Called whenever either changes so they stay in sync.
  // Selection is drawn first so the hover tint renders on top when overlapping.
  private redrawHighlightLayer(): void {
    this.hexRenderer.clearHighlights();
    if (this.selectedUnitId !== null) {
      const unit = this.gameState.units.get(this.selectedUnitId);
      if (unit) this.hexRenderer.highlightHex(unit.hex, SELECT_COLOR, SELECT_ALPHA);
    }
    if (this.hoveredHex !== null) {
      this.hexRenderer.highlightHex(this.hoveredHex, HOVER_COLOR, HOVER_ALPHA);
    }
  }

  private updateHover(): void {
    const pointer = this.input.activePointer;

    // Always use worldX/Y — accounts for camera pan/zoom.
    const hex = pixelToHex(
      pointer.worldX - this.gridOrigin.x,
      pointer.worldY - this.gridOrigin.y,
      HEX_SIZE,
    );

    // null when pointer is outside the grid boundary.
    const hovered: HexCoord | null = this.grid.has(hex) ? hex : null;

    // Only repaint when the hovered hex actually changes.
    if (!hexEqual(hovered, this.hoveredHex)) {
      this.hoveredHex = hovered;
      this.redrawHighlightLayer();
    }
  }
}

// Null-safe equality check for two hex coordinates.
function hexEqual(a: HexCoord | null, b: HexCoord | null): boolean {
  if (a === null && b === null) return true;
  if (a === null || b === null) return false;
  return a.q === b.q && a.r === b.r;
}
