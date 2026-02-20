# Project Instructions

## Project Structure
```
game-demo/
├── index.html                        # Vite entry point
├── package.json
├── tsconfig.json
├── vite.config.ts
├── public/
│   └── style.css                     # Canvas pixel art rendering, body reset
└── src/
    ├── main.ts                       # Creates Phaser.Game, registers scenes
    ├── config/
    │   ├── game.config.ts            # Phaser config: pixelArt, resolution, scale
    │   └── colors.ts                 # Shared hex highlight color constants (hover, range, selection, attack)
    ├── scenes/
    │   ├── BootScene.ts              # Asset preload pass-through → GameScene
    │   └── GameScene.ts              # Main gameplay scene (stub, grows each phase)
    ├── hex/
    │   ├── HexCoord.ts               # HexCoord type, hexToPixel, pixelToHex, hexRound, hexNeighbors, hexDistance, hexRange, calcGridOrigin
    │   ├── HexGrid.ts                # HexGrid class (Map wrapper), HexCell, createRectangularGrid
    │   ├── HexRenderer.ts            # 3 Graphics layers (depth 0/1/2): base grid, range highlight, hover
    │   ├── HexHighlight.ts           # getReachableHexes(): BFS limited by range (pure math, no Phaser)
    │   └── pathfinding.ts            # findPath(): BFS shortest path, excludes start hex; optional blocked set skips occupied waypoints
    ├── combat/
    │   └── CombatResolver.ts         # resolveAttack(attacker, defender): AttackResult — pure hit/damage math (75% hit chance, attack±1 damage)
    ├── entities/
    │   ├── Unit.ts                   # Unit interface (pure data, no Phaser): id, hex, moveRange, faction, hasMoved, hasAttacked, hp, maxHp, attack
    │   └── UnitSprite.ts             # Phaser.GameObjects.Container (Rectangle + HP bar children); depth 3; updateHp() recalculates bar; destroy() cleans up children
    ├── state/
    │   ├── actions.ts                # GameAction union type (MOVE_UNIT, END_TURN, ATTACK_UNIT)
    │   ├── GameState.ts              # GameState interface + createInitialState()
    │   ├── reducer.ts                # applyAction(state, action): GameState — pure, immutable
    │   └── selectors.ts              # Pure query functions: getUnitAtHex, getPlayerUnits, getEnemyUnits, getAdjacentEnemies
    ├── systems/
    │   ├── MovementSystem.ts         # moveAlongPath(): chains Phaser tweens, returns Promise<void>
    │   ├── InputSystem.ts            # pointerup (left click only) → pixelToHex → onHexClick callback; destroy() removes listener
    │   ├── CameraSystem.ts           # keyboard pan (arrow+WASD), middle-mouse drag, scroll-wheel zoom, zoom-adaptive grid stroke; update() called each frame
    │   ├── CombatAnimations.ts       # playAttackBump(): attacker bump tween; showDamageText(): floating hit/miss label; flashDefenderHex(): brief red hex overlay
    │   ├── HoverSystem.ts            # tracks pointer hex each frame; redraws depth-2 highlight layer (selection indicator + hover tint)
    │   ├── SelectionManager.ts       # owns selectedUnitId, reachableSet, attackTargetSet; selectUnit() / clearSelection() drive range + attack highlights
    │   └── TurnSystem.ts             # handleEndTurn() + runEnemyTurn(): END_TURN dispatch, 1-second enemy pause, round counter update; uses callbacks so it never imports SceneMode
    ├── ui/
    │   └── EndTurnButton.ts          # Fixed-screen HUD button (setScrollFactor(0), depth 10); setEnabled() toggles interactivity
    └── utils/
        └── EventBus.ts               # Singleton Phaser EventEmitter for cross-scene events
```

## Things to Remember
Before writing any code:
1. State how you will verify this change works (e.g. unit tests, integration tests, manual testing, browser check, etc.)
2. Write the test or verification steps first
3. Implement the code
4. Run verification and iterate as needed
5. If any mistakes were made, add them to the `Mistakes & Corrections` section below for future reference
6. If any changes were made to the project structure, update the `Project Structure` section above

## Code Style & Conventions
- TBD

## File Size & Complexity Guidelines

### Core Principle

A file should have **one clear responsibility**. File size is a secondary indicator — a large
file with one job is better than three small files that fragment a cohesive concept.

### Review Thresholds

When a source file exceeds these line counts, pause and evaluate whether it has accumulated
multiple responsibilities:

| File Type | Review At | Notes |
|-----------|:---------:|-------|
| **Most source files** | ~150 lines | Modules, services, utilities, components, reducers |
| **Root coordinators** | ~300 lines | Entry points, app shells, container components, or anything whose job is wiring other modules together — larger is expected |
| **Config / pure type files** | ~50 lines | Should stay trivial; a growing config file usually means misplaced logic |
| **Test files** | ~400 lines | Consider splitting by feature area if navigability suffers |

These are **review triggers, not hard caps**. A 180-line file of cohesive pure functions is
fine. A 120-line file with three unrelated responsibilities needs splitting regardless of size.

### When to Split

A file should be split when any of these are true:
- It has **multiple distinct responsibilities** (e.g., input handling AND state management AND rendering in one file)
- New features keep getting added to it **because "it's already there"** rather than because they belong there
- It has **grown 50+ lines in a single session** without a deliberate architectural reason — this is the strongest signal of scope creep

### When NOT to Split

Do **not** split a file just to hit a line-count target. These are signs a large file is healthy:
- All functions/methods serve a single cohesive purpose (e.g., many utility functions, one domain)
- The file is a coordinator whose size comes from wiring modules together, not from logic
- Splitting would require shared state or tight coupling between the new files
- The file is large because of framework or library API surface area

### How to Split

When splitting is warranted:
- Extract into the **existing directory structure** — don't create new directories unless a new domain genuinely emerges
- Follow **established naming conventions** already present in the project
- The extracted module should be independently understandable — if it requires reading the parent file to make sense, the split was wrong

## Do not
- Store secrets in code (use env variables)
- commit without testing

## Dependencies & External Services
- **Phaser 3** (`^3.90.0`) — game framework (scenes, rendering, tweens, input)
- **honeycomb-grid** (`^4.1.5`) — TypeScript hex grid library (coord conversions, traversals)
- **eventemitter3** (`^5.0.1`) — used internally by Phaser; available if needed outside Phaser context
- **Vite** (`^6.0.0`) — dev server + bundler
- **TypeScript** (`^5.7.2`) — strict mode, `isolatedModules: true`

## Mistakes & Corrections

### `renderer` is a reserved property name on `Phaser.Scene`
`Phaser.Scene` exposes a public `renderer` property (the WebGL/Canvas renderer). Declaring a private class property with the same name causes two TypeScript errors: a type mismatch (`HexRenderer` vs `CanvasRenderer | WebGLRenderer`) and a visibility conflict. **Fix:** always prefix custom scene properties with a domain qualifier — e.g. `hexRenderer`, `hexGrid` — to avoid collisions with Phaser's own scene properties.

### `Math.round(-epsilon)` returns `-0` in JavaScript
In `hexRound()`, floating-point arithmetic can produce a very small negative number (e.g., `-1.7e-17`) for coordinates that should be exactly zero. `Math.round` of any negative number, even one infinitesimally close to zero, returns `-0`. This is observably different from `0` via `Object.is`, which Vitest uses in `toEqual`.

**Fix:** Normalize the output with `|| 0`:
```ts
return { q: rq || 0, r: rr || 0 };
```
`-0 || 0` evaluates to `0` because `-0` is falsy in JavaScript.