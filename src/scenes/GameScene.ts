import Phaser from 'phaser';
import { HexCoord, calcWorldSize, hexToPixel, hexKey } from '../hex/HexCoord';
import { HexGrid, createRectangularGrid } from '../hex/HexGrid';
import { HexRenderer } from '../hex/HexRenderer';
import { GRID_COLS, GRID_ROWS, HEX_SIZE } from '../config/game.config';
import { GameState, createInitialState } from '../state/GameState';
import { applyAction } from '../state/reducer';
import { getUnitAtHex } from '../state/selectors';
import { UnitSprite } from '../entities/UnitSprite';
import { findPath } from '../hex/pathfinding';
import { moveAlongPath } from '../systems/MovementSystem';
import { InputSystem } from '../systems/InputSystem';
import { CameraSystem } from '../systems/CameraSystem';
import { EndTurnButton } from '../ui/EndTurnButton';
import { resolveAttack } from '../combat/CombatResolver';
import { playAttackBump, showDamageText, flashDefenderHex } from '../systems/CombatAnimations';
import { HoverSystem } from '../systems/HoverSystem';
import { SelectionManager } from '../systems/SelectionManager';
import { TurnSystem } from '../systems/TurnSystem';

type SceneMode = 'IDLE' | 'MOVING';

export class GameScene extends Phaser.Scene {
  private grid!: HexGrid;
  private gridOrigin!: { x: number; y: number };
  private hexRenderer!: HexRenderer;
  private hoverSystem!: HoverSystem;

  private gameState!: GameState;
  private unitSprites: Map<string, UnitSprite> = new Map();
  private sceneMode: SceneMode = 'IDLE';

  private selection!: SelectionManager;

  private endTurnButton!: EndTurnButton;
  private roundText!: Phaser.GameObjects.Text;

  private cameraSystem!: CameraSystem;
  private inputSystem!: InputSystem;
  private turnSystem!: TurnSystem;

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

    // Scroll the camera so the first player's starting hex is visible on load.
    const startPx = hexToPixel(this.gameState.units.get('player')!.hex, HEX_SIZE);
    this.cameras.main.centerOn(
      this.gridOrigin.x + startPx.x,
      this.gridOrigin.y + startPx.y,
    );

    // Keyboard pan (arrow + WASD), middle-mouse drag, scroll-wheel zoom, and
    // zoom-adaptive grid stroke — all owned by CameraSystem.
    this.cameraSystem = new CameraSystem(this, this.cameras.main, this.hexRenderer);

    // Wire up click-to-select / click-to-attack / click-to-move.
    this.inputSystem = new InputSystem(this, this.grid, this.gridOrigin, HEX_SIZE, (hex) => {
      void this.handleClickIntent(hex);
    });
    // Remove the pointerup handler when the scene shuts down so it doesn't
    // accumulate if the scene is ever restarted via scene.restart().
    this.events.once('shutdown', () => this.inputSystem.destroy(this));

    // Selection state machine: tracks selected unit, reachable set, and attack targets.
    this.selection = new SelectionManager(
      () => this.gameState,
      this.grid,
      this.hexRenderer,
      () => this.hoverSystem.redraw(),
    );

    // Hover tracking and depth-2 highlight layer (selection indicator + hover tint).
    this.hoverSystem = new HoverSystem(
      this,
      this.grid,
      this.gridOrigin,
      HEX_SIZE,
      this.hexRenderer,
      () => {
        if (this.selection.selectedUnitId === null) return null;
        return this.gameState.units.get(this.selection.selectedUnitId)?.hex ?? null;
      },
    );

    // HUD: round counter (top-left) and End Turn button (bottom-right).
    // Both use setScrollFactor(0) to stay fixed on screen during pan/zoom.
    this.roundText = this.add.text(12, 12, `Round ${this.gameState.round}`, {
      fontSize:   '14px',
      color:      '#e0e0e0',
      fontFamily: 'monospace',
    })
      .setScrollFactor(0)
      .setDepth(10);

    this.endTurnButton = new EndTurnButton(this, () => this.turnSystem.handleEndTurn());

    // Turn flow: END_TURN dispatch, 1-second enemy pause, round counter update.
    this.turnSystem = new TurnSystem(
      this,
      () => this.gameState,
      (s) => { this.gameState = s; },
      () => this.sceneMode === 'IDLE',
      () => { this.sceneMode = 'MOVING'; this.endTurnButton.setEnabled(false); },
      () => { this.sceneMode = 'IDLE';   this.endTurnButton.setEnabled(true); },
      () => this.selection.clearSelection(),
      (round) => this.roundText.setText(`Round ${round}`),
    );
  }

  update(): void {
    this.cameraSystem.update();
    this.hoverSystem.update();
  }

  // Routes a click to the appropriate handler in priority order: select → attack → move.
  private async handleClickIntent(targetHex: HexCoord): Promise<void> {
    if (this.sceneMode !== 'IDLE') return;
    // Defense-in-depth: sceneMode is already 'MOVING' during enemy turn, but
    // this guard makes the intent explicit and covers any future divergence.
    if (this.gameState.activeTurn !== 'PLAYER') return;

    if (this.trySelectUnit(targetHex)) return;
    if (await this.tryAttackUnit(targetHex)) return;
    await this.tryMoveUnit(targetHex);
  }

  // Selects a player-faction unit at the clicked hex.
  // Returns true if a player unit was found and selected.
  private trySelectUnit(hex: HexCoord): boolean {
    const unit = getUnitAtHex(this.gameState, hex);
    if (unit?.faction !== 'player') return false;
    this.selection.selectUnit(unit.id);
    return true;
  }

  // Attacks an enemy at the clicked hex if it is in attackTargetSet.
  // Returns true if an attack was initiated.
  // Async: awaits the bump animation before resolving state changes.
  private async tryAttackUnit(hex: HexCoord): Promise<boolean> {
    if (this.selection.selectedUnitId === null) return false;
    if (!this.selection.attackTargetSet.has(hexKey(hex))) return false;

    const attacker = this.gameState.units.get(this.selection.selectedUnitId);
    const defender = getUnitAtHex(this.gameState, hex);
    if (!attacker || !defender) return false;

    const attackerSprite = this.unitSprites.get(attacker.id);
    if (!attackerSprite) return false;

    this.sceneMode = 'MOVING'; // block grid input during animation
    this.endTurnButton.setEnabled(false);

    // attacked tracks whether state was successfully dispatched.
    // The finally block uses it to conditionally call clearSelection on error paths.
    let attacked = false;

    try {
      // Bump the attacker toward the target hex, then await its return.
      await playAttackBump(this, attackerSprite.getGameObject(), hex, this.hexRenderer);

      // Resolve and dispatch after the animation so that if the scene is destroyed
      // mid-bump (hot-reload, scene.restart()) no state mutation has occurred.
      const result = resolveAttack(attacker, defender);

      this.gameState = applyAction(this.gameState, {
        type:       'ATTACK_UNIT',
        attackerId: attacker.id,
        defenderId: defender.id,
        hit:        result.hit,
        damage:     result.damage,
      });

      // Update defender's HP bar to reflect the post-attack state.
      const updatedDefender = this.gameState.units.get(defender.id);
      const defenderSprite  = this.unitSprites.get(defender.id);
      if (updatedDefender && defenderSprite) {
        defenderSprite.updateHp(updatedDefender.hp, updatedDefender.maxHp);
      }

      // Floating damage number or "MISS" text drifts up and fades on its own (800ms).
      const defenderPos = this.hexRenderer.hexToScreen(defender.hex);
      showDamageText(this, defenderPos, result);

      // Brief red hex flash on hit.
      if (result.hit) {
        flashDefenderHex(this, defenderPos, HEX_SIZE);
      }

      // If the defender's HP reached 0, remove from state and destroy the sprite.
      // Dispatched synchronously (no await) so logical and visual state agree before
      // the next input event.
      if (updatedDefender && updatedDefender.hp <= 0) {
        this.gameState = applyAction(this.gameState, { type: 'REMOVE_UNIT', unitId: defender.id });
        if (defenderSprite) {
          defenderSprite.destroy();
          this.unitSprites.delete(defender.id);
        }
      }

      this.selection.clearSelection();
      attacked = true;
    } finally {
      if (this.scene.isActive()) {
        // On the error path: clear half-selected state left by the failed animation.
        // On the success path: clearSelection was already called in the try block.
        if (!attacked) this.selection.clearSelection();
        this.endTurnButton.setEnabled(true);
      }
      this.sceneMode = 'IDLE';
    }

    return attacked;
  }

  // Moves the selected unit to `hex` if it is within the reachable range.
  // Returns true if movement was successfully dispatched; false on all early-exit paths.
  private async tryMoveUnit(hex: HexCoord): Promise<boolean> {
    if (this.selection.selectedUnitId === null) return false;
    if (!this.selection.reachableSet.has(hexKey(hex))) return false;

    const unitId = this.selection.selectedUnitId; // capture before await
    const unit   = this.gameState.units.get(unitId);
    if (!unit) return false; // should always exist; guard against future REMOVE_UNIT action
    // Explicit hasMoved guard: reachableSet is already empty when hasMoved === true
    // (selectUnit clears it), so this case can't be reached in practice. Guard kept
    // for documentation and defense against future range-display bugs.
    if (unit.hasMoved) return false;

    // Guard before locking state: if the sprite is missing (e.g. unit died),
    // bail out cleanly without ever setting sceneMode = 'MOVING'.
    const sprite = this.unitSprites.get(unitId);
    if (!sprite) return false;

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
    const path = findPath(this.grid, unit.hex, hex, occupiedKeys);
    if (!path || path.length === 0) return false;

    this.sceneMode = 'MOVING';
    this.endTurnButton.setEnabled(false); // dim button while unit is animating
    this.hexRenderer.clearRange();

    // moved tracks whether state was successfully dispatched.
    // Initialized before try so the finally block can read it via closure if needed
    // in a future phase. Return value reported after finally completes.
    let moved = false;

    // try/finally ensures sceneMode and button are always restored, even if
    // moveAlongPath throws (e.g. scene shutdown mid-animation).
    try {
      await moveAlongPath(this, sprite.getGameObject(), path, this.hexRenderer);

      // State update after animation so logical position matches visual.
      this.gameState = applyAction(this.gameState, {
        type:   'MOVE_UNIT',
        unitId,
        to:     hex,
      });

      this.selection.clearSelection(); // deselect after moving; range clears with it
      moved = true;
    } finally {
      // clearSelection() and setEnabled() access Phaser GameObjects that are
      // destroyed on scene shutdown. Guard with isActive() so a throw during
      // shutdown doesn't crash inside the finally block itself.
      // sceneMode is a plain field — safe to restore regardless.
      if (this.scene.isActive()) {
        // On the error path: clear half-selected state left by the failed animation.
        // On the success path: clearSelection was already called in the try block;
        // skip here to avoid a redundant hoverSystem.redraw() render pass.
        if (!moved) this.selection.clearSelection();
        this.endTurnButton.setEnabled(true);
      }
      this.sceneMode = 'IDLE';
    }

    return moved;
  }

}
