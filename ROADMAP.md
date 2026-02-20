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

**Goal:** Alternating player/enemy turns. End Turn button. Multiple selectable units. One-move-per-turn gating.

| Step | Description | Key files |
|------|-------------|-----------|
| 3.1 ✅ | State foundation — `activeTurn`, `round`, `hasMoved`, `faction` on Unit; `END_TURN` reducer action | `Unit.ts`, `GameState.ts`, `actions.ts`, `reducer.ts`, `tests/state.test.ts` |
| 3.2 ✅ | Multi-unit sprites — UnitSprite color param; 2 player + 1 enemy; `unitSprites` Map in scene | `UnitSprite.ts`, `GameState.ts`, `GameScene.ts`, `tests/state.test.ts` |
| 3.3 ✅ | Unit selection — `selectedUnitId` in scene; `selectors.ts` (`getUnitAtHex`, `getPlayerUnits`, `getEnemyUnits`); click-to-select vs click-to-move; `blocked` set in pathfinding | `selectors.ts`, `GameScene.ts`, `pathfinding.ts`, `tests/state.test.ts`, `tests/pathfinding.test.ts` |
| 3.4 ✅ | End Turn button + enemy stub + round HUD — `EndTurnButton.ts` (`setScrollFactor(0)`, depth 10); 1s enemy pause; round counter | `EndTurnButton.ts`, `GameScene.ts` |
| 3.5 ✅ | `hasMoved` gating — block second move per turn; clear range/selection after move; select-but-no-range for moved units | `GameScene.ts`, `CLAUDE.md` |

**Gotchas logged:**
- `this.time.delayedCall` instead of `setTimeout` — Phaser's timer respects game pause/resume and uses the same clock as tweens
- `setScrollFactor(0)` Phaser objects instead of DOM buttons — avoids click-region misalignment caused by `scale.mode: FIT` CSS-scaling the canvas while DOM elements remain unscaled
- `hasMoved: boolean` chosen over action points (AP) — without attacks, AP has no meaningful decisions; deferred to Phase 4 where move-vs-attack tradeoff exists
- Optional `blocked?: Set<string>` added to `findPath()` BFS — skips occupied intermediate hexes, always allows the destination through; `occupiedKeys` excludes the moving unit's own hex so the two sets agree
- `scene.isActive()` guard required in `finally` blocks — Phaser GameObjects are destroyed on scene shutdown, so cleanup that touches them must verify the scene is still alive

---

## Phase 4: Combat _(planned)_

**Goal:** Melee combat loop — select a unit, click an adjacent enemy to attack, resolve hit/miss + damage, display HP bars, remove dead units, animate attacks.

**Design decisions:**
- `hasMoved` and `hasAttacked` are independent booleans — a unit can move and attack in the same turn, in either order. Action points (AP) deferred until Phase 6 when varied costs create meaningful tradeoffs.
- Pre-resolved attacks: scene calls `resolveAttack()` to roll hit/damage, then dispatches the pre-computed result. Keeps reducer pure and deterministic (important for future replay/undo).
- No `defense` stat yet — hit chance is flat 75%, damage is `attack ± 1`. Phase 6 adds stat differentiation.
- `REMOVE_UNIT` is a separate action dispatched after death animation — gives the scene control over sequencing (animate, then remove from state).

| Step | Description | Key files |
|------|-------------|-----------|
| 4.1 ✅ | Combat stats — `hp`, `maxHp`, `attack`, `hasAttacked` on Unit; reducer resets `hasAttacked` on END_TURN; 3 enemies total | `Unit.ts`, `GameState.ts`, `reducer.ts`, `tests/state.test.ts` |
| 4.2 ✅ | Combat resolver + ATTACK_UNIT action — pure hit/damage math; reducer applies damage (clamped to 0); reducer guards against missing/self targets | `combat/CombatResolver.ts` *(new)*, `actions.ts`, `reducer.ts`, `tests/combat.test.ts` *(new)* |
| 4.3 ✅ | Attack targeting UI — red highlights on adjacent enemies; click to attack; `hasAttacked` gating; extract `trySelectUnit/tryAttackUnit/tryMoveUnit` helpers | `GameScene.ts`, `selectors.ts` |
| 4.4a ✅ | UnitSprite Container refactor — migrate from bare Rectangle to `Phaser.GameObjects.Container`; update `moveAlongPath` type; verify movement unchanged | `UnitSprite.ts`, `MovementSystem.ts`, `GameScene.ts` |
| 4.4b ✅ | HP bars — bar above each unit using Container children; color thresholds (green/yellow/red); updates after damage | `UnitSprite.ts`, `GameScene.ts` |
| 4.5 ✅ | Death + unit removal — `REMOVE_UNIT` action; destroy sprite; verify hex frees up; handle last-enemy-killed | `actions.ts`, `reducer.ts`, `GameScene.ts`, `UnitSprite.ts`, `tests/combat.test.ts` |
| 4.6 | Damage feedback — attacker bump animation; floating damage numbers / "MISS" text; `CombatAnimations` helper | `GameScene.ts`, `systems/CombatAnimations.ts` *(new)* |

---

### 4.1 — Combat Stats Foundation

**Goal:** Add HP and attack fields to `Unit`; reset `hasAttacked` on END_TURN. Pure data — no visible browser change.

**What to do:**
- [x] `Unit.ts`: add `hp: number`, `maxHp: number`, `attack: number`, `hasAttacked: boolean`
- [x] `GameState.ts` / `createInitialState()`: set stats on all units:
  - Players: `hp: 10, maxHp: 10, attack: 3, hasAttacked: false`
  - Enemies: `hp: 8, maxHp: 8, attack: 2, hasAttacked: false`
  - Add `enemy-2` at `{ q: 9, r: 3 }` and `enemy-3` at `{ q: 7, r: 5 }` (3 enemies total for testable combat without killing the only target immediately)
- [x] `reducer.ts`: update `END_TURN` — when flipping to `'PLAYER'`, also reset `hasAttacked: false` on all player-faction units (same pattern as `hasMoved` reset)
  - Add comment: `// TODO(Phase 5): reset enemy hasMoved + hasAttacked on PLAYER → ENEMY transition`
- [x] `tests/state.test.ts`: update unit-shape expectations for new fields; add test for `hasAttacked` reset on END_TURN

**Files:**
- `src/entities/Unit.ts` _(modify)_
- `src/state/GameState.ts` _(modify)_
- `src/state/reducer.ts` _(modify)_
- `tests/state.test.ts` _(modify)_

**Acceptance criteria:**
- [x] `npm test` passes with updated tests
- [x] Browser still works — movement, turn cycling, 3 enemy rectangles visible on map
- [x] `npm run build` clean

---

### 4.2 — Combat Resolver + ATTACK_UNIT Action

**Goal:** Pure combat math and the reducer action to apply results. Fully testable, no UI changes.

**What to do:**
- [x] Create `src/combat/CombatResolver.ts`:
  ```ts
  interface AttackResult { hit: boolean; damage: number }
  function resolveAttack(attacker: Unit, defender: Unit): AttackResult
  ```
  - `BASE_HIT_CHANCE = 0.75` (75% flat)
  - On hit: `damage = attacker.attack + randomInt(-1, 1)`, minimum 1
  - On miss: `{ hit: false, damage: 0 }`
- [x] `actions.ts`: add to the union:
  ```ts
  | { type: 'ATTACK_UNIT'; attackerId: string; defenderId: string; hit: boolean; damage: number }
  ```
  (Pre-resolved — scene rolls, then dispatches the outcome; reducer stays deterministic)
- [x] `reducer.ts`: handle `ATTACK_UNIT`:
  - Guard: `if (!attacker || !defender || action.attackerId === action.defenderId) return state`
  - Set `hasAttacked: true` on attacker (regardless of hit/miss)
  - On hit: reduce defender `hp` by `damage`, clamped to minimum 0
- [x] `tests/combat.test.ts` _(new)_:
  - Test `resolveAttack` returns `hit: true`/`hit: false` (mock `Math.random`)
  - Test damage range is `[attack-1, attack+1]`, minimum 1
  - Test ATTACK_UNIT reducer applies damage correctly
  - Test ATTACK_UNIT sets `hasAttacked: true` on attacker regardless of hit/miss
  - Test ATTACK_UNIT with `damage > remaining HP` clamps to exactly 0, not negative
  - Test ATTACK_UNIT with unknown attacker/defender ID returns state unchanged

**Files:**
- `src/combat/CombatResolver.ts` _(new)_
- `src/state/actions.ts` _(modify)_
- `src/state/reducer.ts` _(modify)_
- `tests/combat.test.ts` _(new)_

**Acceptance criteria:**
- [x] `npm test` passes (all combat + reducer tests)
- [x] Browser still works unchanged
- [x] `npm run build` clean

---

### 4.3 ✅ — Attack Targeting UI

**Goal:** When a player unit is selected and hasn't attacked, adjacent enemy hexes glow red. Clicking one triggers the attack. After attacking, selection clears.

**What to do:**
- [x] `selectors.ts`: add `getAdjacentEnemies(state, unitHex): Unit[]` — returns enemy-faction units occupying any of the 6 neighbors of `unitHex`
- [x] `GameScene.ts`: extract `handleClickIntent` into three helper methods:
  - `trySelectUnit(hex)`: returns `true` if a player unit was selected
  - `tryAttackUnit(hex)`: returns `true` if attack was initiated
  - `tryMoveUnit(hex)`: returns `Promise<boolean>` — true if movement dispatched
  - `handleClickIntent` becomes: guards → `trySelectUnit` → `tryAttackUnit` → `tryMoveUnit`
- [x] `GameScene.ts` / `selectUnit()`: add `attackTargetSet: Set<string>` — compute adjacent enemies if `hasAttacked === false`, else empty set (parallel to `reachableSet` / `hasMoved`)
- [x] `GameScene.ts` / `selectUnit()`: after drawing blue movement range, draw red overlays on `attackTargetHexes` (`ATTACK_COLOR = 0xcc3333`, `ATTACK_ALPHA = 0.35`)
- [x] `tryAttackUnit()`:
  1. If clicked hex is in `attackTargetSet`
  2. Call `resolveAttack(attacker, defender)` to get `{ hit, damage }`
  3. `console.log` attack result: `[attacker.id] attacks [defender.id]: HIT for X dmg (HP: X→Y) | MISS (HP: X→Y)` — temporary, removed in 4.4b
  4. Dispatch `ATTACK_UNIT` action
  5. Call `clearSelection()`
  6. (No death handling yet — deferred to 4.5)

**Files:**
- `src/scenes/GameScene.ts` _(modify — extract helpers, add attackTargetSet)_
- `src/state/selectors.ts` _(modify — add getAdjacentEnemies)_

**Acceptance criteria:**
- [x] Select a player unit adjacent to an enemy → red highlight on enemy hex
- [x] Click red hex → `hasAttacked` becomes true; selection clears; console shows attack result
- [x] Re-select the same unit → no red highlights (already attacked); blue movement range still shows if `hasMoved === false`
- [x] Non-adjacent enemies get no red highlight
- [x] Units with HP ≤ 0 remain on the map (expected — death handling is 4.5). Attacking a 0-HP unit still works.
- [x] `npm test` passes; `npm run build` clean

---

### 4.4a ✅ — UnitSprite Container Refactor

**Goal:** Migrate `UnitSprite` from a bare `Phaser.GameObjects.Rectangle` to a `Phaser.GameObjects.Container`. No visual change — this is a structural refactor to enable HP bars (4.4b) to move with the unit during animation.

**What to do:**
- [x] `UnitSprite.ts`: replace the bare `Rectangle` with a `Container` holding the rectangle as a child
  - `getGameObject()` now returns the `Container` (was `Rectangle`)
  - Add `destroy()` method that destroys the container and all children
- [x] `MovementSystem.ts` / `moveAlongPath()`: update type signature — accept `Phaser.GameObjects.Container` (or a `{ x: number; y: number }` interface that both Container and Rectangle satisfy — prefer the interface for flexibility) _(no code change needed — already uses structural interface)_
- [x] `GameScene.ts`: update `unitSprites.get(id)` call sites to use new `getGameObject()` return type _(no code change needed — structural typing covers it)_

**Files:**
- `src/entities/UnitSprite.ts` _(modify — significant refactor)_
- `src/systems/MovementSystem.ts` _(no change — already uses `{ x: number; y: number }` structural interface)_
- `src/scenes/GameScene.ts` _(no change — structural typing handles return type change)_

**Acceptance criteria:**
- [x] All existing movement behavior unchanged — unit animates smoothly between hexes
- [x] Hover highlight, selection indicator, range highlight all still work
- [x] Turn cycling still works
- [x] `npm test` passes; `npm run build` clean

---

### 4.4b ✅ — HP Bars

**Goal:** Each unit displays an HP bar above its rectangle. Bars update after damage and follow units during movement.

**What to do:**
- [x] `UnitSprite.ts`: add HP bar to the Container in the constructor:
  - Background: dark gray rectangle (`0x333333`), width 28px, height 4px, positioned ~4px above unit rect top
  - Fill: colored rectangle on top, width = `(hp / maxHp) * 28`
  - Color thresholds: green (`0x44cc44`) > 50% HP, yellow (`0xcccc44`) > 25%, red (`0xcc4444`) ≤ 25%
  - Children use container insertion order for z-ordering (not global depth)
- [x] `UnitSprite.ts`: add `updateHp(hp: number, maxHp: number): void` — recalculates fill width and color
- [x] `GameScene.ts`: after dispatching `ATTACK_UNIT`, call `defenderSprite.updateHp(defenderUnit.hp, defenderUnit.maxHp)`
- [x] Remove the temporary `console.log` added in 4.3 (HP bars now provide visual feedback)

**Files:**
- `src/entities/UnitSprite.ts` _(modify)_
- `src/scenes/GameScene.ts` _(modify)_

**Acceptance criteria:**
- [x] All units show full green HP bars on load
- [x] After attacking an enemy, its HP bar shrinks; color changes at 50% and 25% thresholds
- [x] HP bars follow units during movement animation (Container handles this automatically)
- [x] HP bars render correctly after turn cycling
- [x] `npm test` passes; `npm run build` clean

---

### 4.5 ✅ — Death + Unit Removal

**Goal:** Units with HP ≤ 0 are removed from state and their sprites destroyed.

**What to do:**
- [x] `actions.ts`: add `{ type: 'REMOVE_UNIT'; unitId: string }` to the union
- [x] `reducer.ts`: handle `REMOVE_UNIT` — delete unit from the `units` Map
- [x] `GameScene.ts`: after dispatching `ATTACK_UNIT`, check defender HP:
  ```ts
  const defender = this.gameState.units.get(defenderId);
  if (defender && defender.hp <= 0) {
    this.gameState = applyAction(this.gameState, { type: 'REMOVE_UNIT', unitId: defenderId });
    const sprite = this.unitSprites.get(defenderId);
    if (sprite) { sprite.destroy(); this.unitSprites.delete(defenderId); }
  }
  ```
  - Invariant: `REMOVE_UNIT` must be dispatched synchronously after `ATTACK_UNIT` (or immediately after an awaited animation in 4.6) — never on the next frame
- [x] `tests/combat.test.ts`: add tests for REMOVE_UNIT (unit removed from state; unknown ID is a no-op)

**Files:**
- `src/state/actions.ts` _(modify)_
- `src/state/reducer.ts` _(modify)_
- `src/scenes/GameScene.ts` _(modify)_
- `src/entities/UnitSprite.ts` _(no change needed — `destroy()` was already correct from 4.4a)_
- `tests/combat.test.ts` _(modify)_

**Acceptance criteria:**
- [x] Attack enemy to 0 HP → sprite disappears from the map
- [x] Dead enemy's hex is no longer highlighted as an attack target
- [x] Dead enemy no longer blocks movement (hex is free)
- [x] Game continues normally after a unit dies — turns cycle, remaining units are selectable
- [x] After all enemies are killed, End Turn still works and rounds increment normally
- [x] `npm test` passes; `npm run build` clean

---

### 4.6 — Damage Feedback + Attack Animation

**Goal:** Visual feedback for combat — attacker bumps toward target, floating damage numbers appear, input is locked during animation.

**What to do:**
- [ ] Create `src/systems/CombatAnimations.ts`:
  - `playAttackBump(scene, sprite, targetHex, hexRenderer): Promise<void>` — tweens attacker ~12px toward target and back (~300ms total)
  - `showDamageText(scene, position, result: AttackResult): void` — spawns `Phaser.GameObjects.Text` at defender position, floats up ~30px and fades out over 800ms, then destroys itself; hit shows damage number in white/red, miss shows "MISS" in gray
- [ ] `GameScene.ts` / `tryAttackUnit()`:
  1. `sceneMode = 'MOVING'` (block input during animation — same pattern as movement)
  2. `endTurnButton.setEnabled(false)`
  3. `try { await playAttackBump(...); resolveAttack(...); dispatch ATTACK_UNIT; update HP bar; check death; showDamageText(...) } finally { if (scene.isActive()) { endTurnButton.setEnabled(true) } sceneMode = 'IDLE' }`
- [ ] Optional: brief red flash on defender hex on hit (reuse `hexRenderer.highlightHex`, clear after 200ms)

**Files:**
- `src/systems/CombatAnimations.ts` _(new)_
- `src/scenes/GameScene.ts` _(modify)_

**Acceptance criteria:**
- [ ] Clicking an adjacent enemy: attacker briefly bumps toward target and returns
- [ ] On hit: damage number floats up from defender and fades out
- [ ] On miss: "MISS" text floats up and fades out
- [ ] Input is blocked during the attack animation (clicking during bump does nothing)
- [ ] Animation works correctly at map edges and near camera bounds
- [ ] `npm test` passes; `npm run build` clean

**Decision logged:** `hasMoved` and `hasAttacked` are independent booleans — units can move and attack in either order. Action points (AP) deferred to Phase 6 where move-vs-attack tradeoffs become meaningful with varied unit types.

---

## Phase 5: Enemy AI _(planned)_

Move toward nearest player unit. Attack if adjacent. Simple aggression.

_Subphases to be defined after Phase 4 is complete. Likely 4 steps: enemy movement, enemy attack, player death + game-over condition, difficulty tuning._

---

## Phase 6: Unit Roster _(planned)_

### Phase 6a: Unit Types

Multiple unit types with different stats (HP, attack, moveRange). Same rectangle visuals with distinct colors. AI and combat handle varied stats automatically without code changes.

_Consider ranged unit types (attack range > 1) — requires extending the attack targeting UI from Phase 4.3._

### Phase 6b: Squad Selection

Pre-battle squad selection scene. Player picks which units to deploy before the battle starts. Requires a new `SquadSelectScene` and new game-flow state (menu → squad select → battle).

_Consider terrain types (movement costs, combat modifiers, impassable hexes) as a Phase 6c or Phase 7 item._

---

## Phase 7: Polish _(planned)_

Pixel art sprites. Sound effects. Animations. Map variety. Maybe a main menu.

_Note: `GameState.units` uses a `Map<string, Unit>` — Maps don't serialize to JSON. A serialization layer will be needed if save/load is added in this phase._

---

## Phase 8: Strategic Layer _(maybe never)_

Campaign map. Between-battle management. Hiring/firing. Economy.
