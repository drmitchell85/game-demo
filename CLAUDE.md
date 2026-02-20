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
    │   └── game.config.ts            # Phaser config: pixelArt, resolution, scale
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
    │   └── UnitSprite.ts             # Phaser.GameObjects.Rectangle placeholder; depth 3
    ├── state/
    │   ├── actions.ts                # GameAction union type (MOVE_UNIT, END_TURN, ATTACK_UNIT)
    │   ├── GameState.ts              # GameState interface + createInitialState()
    │   ├── reducer.ts                # applyAction(state, action): GameState — pure, immutable
    │   └── selectors.ts              # Pure query functions: getUnitAtHex, getPlayerUnits, getEnemyUnits
    ├── systems/
    │   ├── MovementSystem.ts         # moveAlongPath(): chains Phaser tweens, returns Promise<void>
    │   ├── InputSystem.ts            # pointerup (left click only) → pixelToHex → onHexClick callback; destroy() removes listener
    │   └── CameraSystem.ts           # middle-mouse drag pan; scroll-wheel zoom (Phase 2.4)
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