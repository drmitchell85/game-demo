# Hexwar — Development Roadmap

A commit-by-commit plan for building a Battle Brothers-inspired tactical hex game.

**Rules:**
- Each subphase = one commit. The codebase must work after every commit.
- Acceptance criteria must be manually verifiable in the browser before committing.
- Phases build incrementally — don't jump ahead.

---

## Phase 1: Sprite on a Hex Grid ✅ Complete

**Goal:** A single unit sprite that moves smoothly between hexes when the player clicks a destination.

| Step | Description | Key files |
|------|-------------|-----------|
| 1.1 ✅ | Project scaffolding — Phaser 3 + Vite + TS, pixel art config, 960×540 viewport | `main.ts`, `game.config.ts`, `BootScene.ts`, `GameScene.ts` |
| 1.2 ✅ | Hex math — pointy-top axial coords, `hexToPixel`, `pixelToHex`, `hexRound`, BFS helpers | `HexCoord.ts`, `HexGrid.ts`, `tests/hex.test.ts` |
| 1.3 ✅ | Grid rendering — 12×8 grid via Phaser Graphics API, dark fill + border, centered in viewport | `HexRenderer.ts` |
| 1.4 ✅ | Hover highlight — `pointer.worldX/Y` → `pixelToHex` → repaint on change, separate Graphics layer | `HexRenderer.ts`, `GameScene.ts` |
| 1.5 ✅ | Unit placement — `Unit` pure data, `UnitSprite` Rectangle, Redux-style `GameState` + `applyAction` reducer | `Unit.ts`, `UnitSprite.ts`, `GameState.ts`, `actions.ts`, `reducer.ts` |
| 1.6 ✅ | Click-to-move — BFS `findPath`, recursive tween chain, IDLE/MOVING state machine blocks input during animation | `pathfinding.ts`, `MovementSystem.ts`, `InputSystem.ts` |
| 1.7 ✅ | Movement range — BFS `getReachableHexes`, blue highlight layer, restrict clicks to reachable set, clear/restore on move | `HexHighlight.ts` |

**Gotchas logged:**
- `Phaser.Scene` has a public `renderer` property — name custom scene props with a domain prefix (e.g. `hexRenderer`)
- `Math.round(-epsilon)` → `-0` in JS; normalize with `|| 0` in `hexRound`
- Always use `pointer.worldX/Y` (world space), not `pointer.x/y` (screen space)

---

## Phase 2: Camera + Larger Map ✅ Complete

**Goal:** A map larger than the 960×540 viewport, pannable with arrow keys or middle-mouse drag, and zoomable with the scroll wheel.

| Step | Description | Key files |
|------|-------------|-----------|
| 2.1 ✅ | Larger map — 24×16 grid, `calcWorldSize`, `camera.setBounds`; world is ~1527×882px | `game.config.ts`, `HexCoord.ts`, `GameScene.ts`, `tests/hex.test.ts` |
| 2.2 ✅ | Arrow key pan — `PAN_SPEED = 6`, WASD binding, `panCamera()` method, `camera.centerOn()` on load | `game.config.ts`, `GameScene.ts` |
| 2.3 ✅ | Middle-mouse drag pan — `CameraSystem` class, incremental `dragStart`, `pointerupoutside` guard, left-click-only fix in `InputSystem` | `CameraSystem.ts`, `InputSystem.ts`, `GameScene.ts` |
| 2.4 ✅ | Scroll wheel zoom — cursor-centered `newScrollX = worldX - screenX/newZoom`, `Math.sign(deltaY)`, `[0.5, 2.0]` clamp, dynamic `redrawGrid(1/zoom)` for 1px borders | `game.config.ts`, `CameraSystem.ts`, `HexRenderer.ts`, `GameScene.ts` |

**Gotchas logged:**
- Grid origin set to `{x: √3/2·size, y: size}` — bounding box top-left sits exactly at world (0,0) with no negative hex edges
- Direct `camera.scrollX/Y` mutation (not `camera.pan()`) for immediate per-frame key response; `WASDKeys` interface needed because `addKeys()` returns `any`
- `pointerupoutside` must be bound alongside `pointerup` so drag clears if mouse exits canvas mid-hold
- Middle-mouse `pointerup` would trigger unit movement without a `pointer.button !== 0` guard in `InputSystem`
- `Math.sign(deltaY)` normalises trackpad momentum — each scroll event steps by exactly `ZOOM_STEP` regardless of speed
- Direct `camera.zoom` assignment required (not `camera.zoomTo()`) — tween animation breaks cursor-anchor math
- Drag delta must be divided by `camera.zoom` so pan speed feels proportional at any zoom level
- Sub-pixel border bug: at zoom < 1.0, 1px world-space strokes render as 0px or 1px randomly; fixed with `HexRenderer.redrawGrid(1 / zoom)` on every zoom change

---

## Phase 3: Turn System ✅ Complete

Alternating player/enemy turns. End turn button. Multiple selectable units. (Action points deferred to Phase 4 — no decisions until attacks exist.)

| Step | Status | Description |
|------|--------|-------------|
| 3.1 | ✅ Done | State foundation — `activeTurn`, `round`, `hasMoved`, `faction` on Unit; `END_TURN` reducer action |
| 3.2 | ✅ Done | Multi-unit sprites — UnitSprite color param; 2 player + 1 enemy in state; `unitSprites` Map in scene |
| 3.3 | ✅ Done | Unit selection — `selectedUnitId` in scene; `selectors.ts`; click-to-select vs click-to-move |
| 3.4 | ✅ Done | End Turn button + enemy stub + round HUD — `EndTurnButton.ts`; 1s enemy pause; round counter |
| 3.5 | ✅ Done | `hasMoved` gating — block second move per turn; clear range/selection after move |

---

### 3.1 — State Foundation

**Goal:** Add turn/movement fields to `Unit` and `GameState`; add `END_TURN` reducer action. No visible browser change — pure state layer, fully covered by tests.

**What to do:**
- [x] `Unit.ts`: add `faction: 'player' | 'enemy'` and `hasMoved: boolean`
- [x] `GameState.ts`: add `activeTurn: 'PLAYER' | 'ENEMY'` and `round: number`; update `createInitialState` (player gets `faction: 'player', hasMoved: false`; state gets `activeTurn: 'PLAYER', round: 1`)
- [x] `actions.ts`: add `{ type: 'END_TURN' }` to the union
- [x] `reducer.ts`: handle `END_TURN` — flip `activeTurn`; if flipping to `'PLAYER'` also increment `round` and reset `hasMoved: false` on all `'player'` faction units
- [x] `reducer.ts`: update `MOVE_UNIT` case to also set `hasMoved: true` on the moved unit
- [x] `tests/state.test.ts`: add tests for `END_TURN` (flip, round increment, hasMoved reset); update existing unit shape tests for new fields

**Files:**
- `src/entities/Unit.ts` _(modify)_
- `src/state/GameState.ts` _(modify)_
- `src/state/actions.ts` _(modify)_
- `src/state/reducer.ts` _(modify)_
- `tests/state.test.ts` _(modify)_

**Acceptance criteria:**
- [x] `npm test` passes with new tests
- [x] Browser still works unchanged (one gold unit, click-to-move)
- [x] `npm run build` clean

---

### 3.2 — Multi-Unit Sprites

**Goal:** Two player units and one enemy unit appear on the map; `GameScene` handles a collection of sprites instead of a single one.

**What to do:**
- [x] `UnitSprite.ts`: add optional `color?: number` param (default `0xd4af37` gold; pass `0xcc2222` red for enemies)
- [x] `createInitialState()`: add `{ id: 'player-2', hex: { q: 1, r: 1 }, faction: 'player', hasMoved: false, moveRange: 3 }` and `{ id: 'enemy-1', hex: { q: 8, r: 4 }, faction: 'enemy', hasMoved: false, moveRange: 2 }`
- [x] `GameScene.ts`: replace `unitSprite: UnitSprite` with `unitSprites: Map<string, UnitSprite>`; iterate all units in `create()` and instantiate a `UnitSprite` per unit
- [x] `GameScene.ts`: update `handleMoveIntent` and `refreshRangeHighlight` to use `unitSprites.get('player')` (still hardcoded; de-hardcoded in 3.3)
- [x] `tests/state.test.ts`: update unit count expectations (now 3 units)

**Files:**
- `src/entities/UnitSprite.ts` _(modify)_
- `src/state/GameState.ts` _(modify)_
- `src/scenes/GameScene.ts` _(modify)_
- `tests/state.test.ts` _(modify)_

**Acceptance criteria:**
- [x] Three rectangles visible (2 gold, 1 red)
- [x] Player gold rectangle still moves on click
- [x] Enemy red rectangle does not respond to clicks

---

### 3.3 — Unit Selection ✓

**Goal:** Clicking a player-faction unit selects it and shows its movement range; clicking a highlighted hex moves the selected unit; clicking another player unit switches selection.

**What to do:**
- [x] Create `src/state/selectors.ts` (pure, no Phaser): `getUnitAtHex(state, hex)`, `getPlayerUnits(state)`, `getEnemyUnits(state)`
- [x] `GameScene.ts`: add `private selectedUnitId: string | null = null`
- [x] `GameScene.ts`: update `handleMoveIntent(targetHex)` → renamed `handleClickIntent`; if player unit at hex → select it; else if `selectedUnitId !== null` and in `reachableSet` → move selected unit
- [x] `GameScene.ts`: `refreshRangeHighlight(unitId: string)` — parameterized, uses given unit's hex/moveRange
- [x] `GameScene.ts`: add `clearSelection()` — clears `selectedUnitId`, range, selection visual
- [x] Selection visual: `hexRenderer.highlightHex(unit.hex, 0xffffff, 0.35)` on selected unit's hex
- [x] `tests/state.test.ts`: add selector tests
- [x] `src/hex/pathfinding.ts`: added optional `blocked?: Set<string>` param — BFS skips blocked intermediates, always allows destination through (edit pass P2 fix)
- [x] `GameScene.ts`: pass `occupiedKeys` (minus moving unit's own hex) to `findPath` to prevent animation routing through other units' sprites

**Files:**
- `src/state/selectors.ts` _(new)_
- `src/scenes/GameScene.ts` _(modify)_
- `src/hex/pathfinding.ts` _(modify — blocked set)_
- `tests/state.test.ts` _(modify)_
- `tests/pathfinding.test.ts` _(modify — 3 new tests)_

**Acceptance criteria:**
- [x] Clicking player unit 1 shows blue range
- [x] Clicking player unit 2 switches selection; range updates
- [x] Clicking highlighted hex moves the selected unit
- [x] Clicking enemy does nothing
- [x] No unit selected on load

---

### 3.4 — End Turn Button + Enemy Turn Stub + Round HUD

**Goal:** A fixed "End Turn" button ends the player turn; a 1-second pause simulates the enemy turn; a round counter shows the current round.

**What to do:**
- [x] Create `src/ui/EndTurnButton.ts`: Phaser `Rectangle` + `Text` both with `setScrollFactor(0)` (stays fixed on screen), depth 10; `setEnabled(v)` toggles alpha + `disableInteractive()`/`setInteractive()`; position `x: 880, y: 510`; `destroy()` cleanup
- [x] `GameScene.ts`: add `endTurnButton: EndTurnButton` and `roundText: Phaser.GameObjects.Text` (top-left, `setScrollFactor(0)`, depth 10)
- [x] `GameScene.ts`: `handleEndTurn()` — guard on `sceneMode !== 'IDLE'` or `activeTurn !== 'PLAYER'`; `clearSelection()`; dispatch `END_TURN`; set `sceneMode = 'MOVING'`; disable button; `void this.runEnemyTurn()`
- [x] `GameScene.ts`: `runEnemyTurn()` — `await this.time.delayedCall(1000)`; dispatch `END_TURN`; set `sceneMode = 'IDLE'`; enable button; update `roundText`

**Files:**
- `src/ui/EndTurnButton.ts` _(new)_
- `src/scenes/GameScene.ts` _(modify)_

**Acceptance criteria:**
- [x] "End Turn" button fixed bottom-right at all camera positions and zoom levels
- [x] Clicking: button grays out, grid unresponsive for 1 second, then re-enables
- [x] Round counter increments after each enemy pause
- [x] Button does not move when camera pans

**Decision logged:** `this.time.delayedCall` used instead of `setTimeout` — Phaser's timer respects game pause/resume and uses the same clock as tweens. Phaser objects with `setScrollFactor(0)` used instead of DOM button — avoids click-region misalignment caused by `scale.mode: FIT` CSS-scaling the canvas while DOM elements are not.

---

### 3.5 — `hasMoved` Gating

**Goal:** Each player unit can only move once per turn; the range highlight clears after a move; `activeTurn` blocks all player input during enemy turn.

**What to do:**
- [x] `GameScene.ts` / `handleClickIntent`: add guards — `if (gameState.activeTurn !== 'PLAYER') return`; `if (unit.hasMoved) return` (clicking a moved unit selects it but shows no range)
- [x] After move resolves: call `clearSelection()` — no range shown until player selects another unit; `hasMoved: true` is already set by the `MOVE_UNIT` reducer (added in 3.1)
- [x] `selectUnit(unitId)`: if `unit.hasMoved === true`, select but show no range (empty `reachableSet`, no blue hexes)
- [x] Update `CLAUDE.md` project structure — `src/ui/` entry added (done in 3.4); `InputSystem.ts` description updated with `destroy()` note

**Files:**
- `src/scenes/GameScene.ts` _(modify)_
- `CLAUDE.md` _(modify)_

**Acceptance criteria:**
- [x] Player unit can only move once per turn; clicking it again shows no range
- [x] After End Turn + enemy pause, both player units can move again
- [x] Enemy rectangle never responds to input
- [x] Full turn cycle: move player-1 → move player-2 → End Turn → 1s pause → round increments → both units moveable again

**Decision logged:** `hasMoved: boolean` used instead of action points (`ap`/`maxAp`) — without attacks, AP has no interesting decisions. AP deferred to Phase 4 where the move-vs-attack tradeoff makes it meaningful.

---

## Phase 4: Combat _(planned)_

Attack action. Hit chance. Damage roll. HP bars. Death.

---

## Phase 5: Enemy AI _(planned)_

Move toward nearest player unit. Attack if adjacent. Simple aggression.

---

## Phase 6: Unit Roster _(planned)_

Multiple unit types with different stats. Pre-battle squad selection.

---

## Phase 7: Polish _(planned)_

Pixel art sprites. Sound effects. Animations. Map variety. Maybe a main menu.

---

## Phase 8: Strategic Layer _(maybe never)_

Campaign map. Between-battle management. Hiring/firing. Economy.
