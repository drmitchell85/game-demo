import { HexCoord, hexKey } from '../hex/HexCoord';
import { HexGrid } from '../hex/HexGrid';
import { HexRenderer } from '../hex/HexRenderer';
import { GameState } from '../state/GameState';
import { getAdjacentEnemies } from '../state/selectors';
import { getReachableHexes } from '../hex/HexHighlight';
import { RANGE_COLOR, RANGE_ALPHA, ATTACK_COLOR, ATTACK_ALPHA } from '../config/colors';

// Owns the unit-selection state machine: which unit is selected, what it can move
// to (reachableSet), and what it can attack (attackTargetSet).  All three are derived
// from GameState each time selectUnit() is called — they are UI-layer cache, not
// source-of-truth state.
//
// `getState` is a callback so callers always pass the latest GameState without
// SelectionManager holding a stale copy.  `onChanged` is called at the end of every
// selectUnit / clearSelection to let the scene redraw the highlight layer.
export class SelectionManager {
  selectedUnitId:  string | null = null;
  reachableSet:    Set<string>   = new Set();
  attackTargetSet: Set<string>   = new Set();

  constructor(
    private getState:    () => GameState,
    private grid:        HexGrid,
    private hexRenderer: HexRenderer,
    private onChanged:   () => void,
  ) {}

  // Select a unit by id.  Computes movement range (blue) if the unit hasn't moved,
  // and attack targets (red) on adjacent enemies if it hasn't attacked this turn.
  selectUnit(unitId: string): void {
    const state = this.getState();
    const unit  = state.units.get(unitId);
    if (!unit) return; // guard: unit may have been removed between input and dispatch

    this.selectedUnitId = unitId;

    if (unit.hasMoved) {
      // Already moved this turn — clear range so no blue hexes appear.
      this.reachableSet = new Set();
      this.hexRenderer.clearRange();
    } else {
      this.refreshRangeHighlight(unitId, state);
    }

    // Attack targets: adjacent enemies if unit hasn't attacked this turn.
    // Painted on the range layer on top of (or instead of) movement range.
    if (!unit.hasAttacked) {
      const adjacentEnemies = getAdjacentEnemies(state, unit.hex);
      this.attackTargetSet  = new Set(adjacentEnemies.map(e => hexKey(e.hex)));
      if (adjacentEnemies.length > 0) {
        this.hexRenderer.highlightRange(adjacentEnemies.map(e => e.hex), ATTACK_COLOR, ATTACK_ALPHA);
      }
    } else {
      this.attackTargetSet = new Set();
    }

    this.onChanged();
  }

  // Reset all three selection fields and clear range highlights.
  clearSelection(): void {
    this.selectedUnitId  = null;
    this.reachableSet    = new Set();
    this.attackTargetSet = new Set();
    this.hexRenderer.clearRange();
    this.onChanged();
  }

  // Recompute the reachable set and movement-range overlay for a unit.
  // Excludes the unit's own hex and all hexes occupied by any unit.
  private refreshRangeHighlight(unitId: string, state: GameState): void {
    const unit = state.units.get(unitId);
    if (!unit) return;

    const reachable = getReachableHexes(this.grid, unit.hex, unit.moveRange);

    // Build a set of occupied hex keys so we can exclude them from the range.
    const occupiedKeys = new Set<string>();
    state.units.forEach(u => occupiedKeys.add(hexKey(u.hex)));

    // Reachable set: exclude own hex and occupied hexes.
    // Own hex is never a valid move destination; occupied hexes block stacking.
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
}
