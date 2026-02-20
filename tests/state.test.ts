import { describe, it, expect } from 'vitest';
import { createInitialState } from '../src/state/GameState';
import { applyAction } from '../src/state/reducer';
import { getUnitAtHex, getPlayerUnits, getEnemyUnits } from '../src/state/selectors';

// ---------------------------------------------------------------------------
// createInitialState
// ---------------------------------------------------------------------------

describe('createInitialState', () => {
  it('contains 5 units (2 player + 3 enemy)', () => {
    const state = createInitialState();
    expect(state.units.size).toBe(5);
    expect(state.units.has('player')).toBe(true);
    expect(state.units.has('player-2')).toBe(true);
    expect(state.units.has('enemy-1')).toBe(true);
    expect(state.units.has('enemy-2')).toBe(true);
    expect(state.units.has('enemy-3')).toBe(true);
  });

  it('places player at {q:0, r:0}', () => {
    const state = createInitialState();
    expect(state.units.get('player')?.hex).toEqual({ q: 0, r: 0 });
  });

  it('gives player-1 a non-zero moveRange', () => {
    const state = createInitialState();
    expect(state.units.get('player')?.moveRange).toBeGreaterThan(0);
  });

  it('sets both player units to faction player', () => {
    const state = createInitialState();
    expect(state.units.get('player')?.faction).toBe('player');
    expect(state.units.get('player-2')?.faction).toBe('player');
  });

  it('sets all enemy units to faction enemy', () => {
    const state = createInitialState();
    expect(state.units.get('enemy-1')?.faction).toBe('enemy');
    expect(state.units.get('enemy-2')?.faction).toBe('enemy');
    expect(state.units.get('enemy-3')?.faction).toBe('enemy');
  });

  it('places player-2 at {q:1, r:1} with moveRange 3', () => {
    const state = createInitialState();
    expect(state.units.get('player-2')?.hex).toEqual({ q: 1, r: 1 });
    expect(state.units.get('player-2')?.moveRange).toBe(3);
  });

  it('places enemy-1 at {q:8, r:4} with moveRange 2', () => {
    const state = createInitialState();
    expect(state.units.get('enemy-1')?.hex).toEqual({ q: 8, r: 4 });
    expect(state.units.get('enemy-1')?.moveRange).toBe(2);
  });

  it('places enemy-2 at {q:9, r:3} and enemy-3 at {q:7, r:5}', () => {
    const state = createInitialState();
    expect(state.units.get('enemy-2')?.hex).toEqual({ q: 9, r: 3 });
    expect(state.units.get('enemy-3')?.hex).toEqual({ q: 7, r: 5 });
  });

  it('sets all units hasMoved to false initially', () => {
    const state = createInitialState();
    state.units.forEach(unit => {
      expect(unit.hasMoved).toBe(false);
    });
  });

  it('sets all units hasAttacked to false initially', () => {
    const state = createInitialState();
    state.units.forEach(unit => {
      expect(unit.hasAttacked).toBe(false);
    });
  });

  it('gives player units hp:10, maxHp:10, attack:3', () => {
    const state = createInitialState();
    for (const id of ['player', 'player-2']) {
      const u = state.units.get(id)!;
      expect(u.hp).toBe(10);
      expect(u.maxHp).toBe(10);
      expect(u.attack).toBe(3);
    }
  });

  it('gives enemy units hp:8, maxHp:8, attack:2', () => {
    const state = createInitialState();
    for (const id of ['enemy-1', 'enemy-2', 'enemy-3']) {
      const u = state.units.get(id)!;
      expect(u.hp).toBe(8);
      expect(u.maxHp).toBe(8);
      expect(u.attack).toBe(2);
    }
  });

  it('starts on player turn', () => {
    const state = createInitialState();
    expect(state.activeTurn).toBe('PLAYER');
  });

  it('starts on round 1', () => {
    const state = createInitialState();
    expect(state.round).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// applyAction — MOVE_UNIT
// ---------------------------------------------------------------------------

describe('applyAction MOVE_UNIT', () => {
  it('moves the unit to the target hex', () => {
    const state  = createInitialState();
    const next   = applyAction(state, { type: 'MOVE_UNIT', unitId: 'player', to: { q: 3, r: 2 } });
    expect(next.units.get('player')?.hex).toEqual({ q: 3, r: 2 });
  });

  it('returns a new state object (does not mutate in place)', () => {
    const state = createInitialState();
    const next  = applyAction(state, { type: 'MOVE_UNIT', unitId: 'player', to: { q: 1, r: 0 } });
    expect(next).not.toBe(state);
  });

  it('returns a new units Map (does not mutate the original)', () => {
    const state        = createInitialState();
    const originalUnits = state.units;
    const next         = applyAction(state, { type: 'MOVE_UNIT', unitId: 'player', to: { q: 1, r: 0 } });
    expect(next.units).not.toBe(originalUnits);
  });

  it('does not mutate the original unit record', () => {
    const state       = createInitialState();
    const originalHex = state.units.get('player')!.hex;
    applyAction(state, { type: 'MOVE_UNIT', unitId: 'player', to: { q: 5, r: 3 } });
    // Original state must be unchanged
    expect(state.units.get('player')?.hex).toEqual(originalHex);
  });

  it('preserves other unit fields on move', () => {
    const state      = createInitialState();
    const before     = state.units.get('player')!;
    const next       = applyAction(state, { type: 'MOVE_UNIT', unitId: 'player', to: { q: 2, r: 1 } });
    const after      = next.units.get('player')!;
    expect(after.id).toBe(before.id);
    expect(after.moveRange).toBe(before.moveRange);
    expect(after.faction).toBe(before.faction);
    expect(after.hasMoved).toBe(true); // MOVE_UNIT sets hasMoved
    // Combat stats must be preserved unchanged across MOVE_UNIT
    expect(after.hasAttacked).toBe(before.hasAttacked);
    expect(after.hp).toBe(before.hp);
    expect(after.maxHp).toBe(before.maxHp);
    expect(after.attack).toBe(before.attack);
  });

  it('sets hasMoved to true on the moved unit', () => {
    const state = createInitialState();
    const next  = applyAction(state, { type: 'MOVE_UNIT', unitId: 'player', to: { q: 1, r: 0 } });
    expect(next.units.get('player')?.hasMoved).toBe(true);
  });

  it('returns state unchanged when unitId does not exist', () => {
    const state = createInitialState();
    const next  = applyAction(state, { type: 'MOVE_UNIT', unitId: 'ghost', to: { q: 1, r: 0 } });
    expect(next).toBe(state);
  });
});

// ---------------------------------------------------------------------------
// applyAction — END_TURN
// ---------------------------------------------------------------------------

describe('applyAction END_TURN', () => {
  it('flips activeTurn from PLAYER to ENEMY', () => {
    const state = createInitialState(); // activeTurn: 'PLAYER'
    const next  = applyAction(state, { type: 'END_TURN' });
    expect(next.activeTurn).toBe('ENEMY');
  });

  it('flips activeTurn from ENEMY back to PLAYER', () => {
    const s1 = createInitialState();
    const s2 = applyAction(s1, { type: 'END_TURN' }); // PLAYER → ENEMY
    const s3 = applyAction(s2, { type: 'END_TURN' }); // ENEMY → PLAYER
    expect(s3.activeTurn).toBe('PLAYER');
  });

  it('does NOT increment round when flipping PLAYER → ENEMY', () => {
    const state = createInitialState(); // round: 1
    const next  = applyAction(state, { type: 'END_TURN' });
    expect(next.round).toBe(1);
  });

  it('increments round when flipping ENEMY → PLAYER', () => {
    const s1 = createInitialState(); // round: 1
    const s2 = applyAction(s1, { type: 'END_TURN' }); // → ENEMY, round still 1
    const s3 = applyAction(s2, { type: 'END_TURN' }); // → PLAYER, round → 2
    expect(s3.round).toBe(2);
  });

  it('resets hasMoved on player-faction units when flipping ENEMY → PLAYER', () => {
    // Move player to set hasMoved: true
    const s1 = createInitialState();
    const s2 = applyAction(s1, { type: 'MOVE_UNIT', unitId: 'player', to: { q: 1, r: 0 } });
    expect(s2.units.get('player')?.hasMoved).toBe(true);

    // End player turn
    const s3 = applyAction(s2, { type: 'END_TURN' }); // → ENEMY
    // End enemy turn — should reset hasMoved for ALL player units
    const s4 = applyAction(s3, { type: 'END_TURN' }); // → PLAYER
    expect(s4.units.get('player')?.hasMoved).toBe(false);
    expect(s4.units.get('player-2')?.hasMoved).toBe(false);
  });

  it('does NOT reset hasMoved on enemy-faction units when flipping ENEMY → PLAYER', () => {
    const s1 = createInitialState();
    const s2 = applyAction(s1, { type: 'MOVE_UNIT', unitId: 'enemy-1', to: { q: 9, r: 4 } });
    expect(s2.units.get('enemy-1')?.hasMoved).toBe(true);

    const s3 = applyAction(s2, { type: 'END_TURN' }); // → ENEMY
    const s4 = applyAction(s3, { type: 'END_TURN' }); // → PLAYER
    // Enemy hasMoved is NOT reset — enemy turn management is Phase 5
    expect(s4.units.get('enemy-1')?.hasMoved).toBe(true);
  });

  it('resets hasAttacked on player-faction units when flipping ENEMY → PLAYER', () => {
    const s1 = createInitialState();
    // Manually construct state with hasAttacked: true on both player units
    const withAttacked = new Map(s1.units);
    withAttacked.set('player',   { ...s1.units.get('player')!,   hasAttacked: true });
    withAttacked.set('player-2', { ...s1.units.get('player-2')!, hasAttacked: true });
    const s2: typeof s1 = { ...s1, units: withAttacked };

    const s3 = applyAction(s2, { type: 'END_TURN' }); // → ENEMY
    const s4 = applyAction(s3, { type: 'END_TURN' }); // → PLAYER
    expect(s4.units.get('player')?.hasAttacked).toBe(false);
    expect(s4.units.get('player-2')?.hasAttacked).toBe(false);
  });

  it('does NOT reset hasAttacked on enemy-faction units when flipping ENEMY → PLAYER', () => {
    const s1 = createInitialState();
    const withAttacked = new Map(s1.units);
    withAttacked.set('enemy-1', { ...s1.units.get('enemy-1')!, hasAttacked: true });
    const s2: typeof s1 = { ...s1, units: withAttacked };

    const s3 = applyAction(s2, { type: 'END_TURN' }); // → ENEMY
    const s4 = applyAction(s3, { type: 'END_TURN' }); // → PLAYER
    // Enemy hasAttacked is NOT reset — enemy turn management is Phase 5
    expect(s4.units.get('enemy-1')?.hasAttacked).toBe(true);
  });

  it('returns a new state object', () => {
    const state = createInitialState();
    const next  = applyAction(state, { type: 'END_TURN' });
    expect(next).not.toBe(state);
  });
});

// ---------------------------------------------------------------------------
// selectors
// ---------------------------------------------------------------------------

describe('getUnitAtHex', () => {
  it('returns the player unit at {q:0, r:0}', () => {
    const state = createInitialState();
    expect(getUnitAtHex(state, { q: 0, r: 0 })?.id).toBe('player');
  });

  it('returns player-2 at {q:1, r:1}', () => {
    const state = createInitialState();
    expect(getUnitAtHex(state, { q: 1, r: 1 })?.id).toBe('player-2');
  });

  it('returns enemy-1 at {q:8, r:4}', () => {
    const state = createInitialState();
    expect(getUnitAtHex(state, { q: 8, r: 4 })?.id).toBe('enemy-1');
  });

  it('returns undefined when no unit occupies the hex', () => {
    const state = createInitialState();
    expect(getUnitAtHex(state, { q: 5, r: 5 })).toBeUndefined();
  });

  it('reflects updated position after MOVE_UNIT', () => {
    const state = createInitialState();
    const next  = applyAction(state, { type: 'MOVE_UNIT', unitId: 'player', to: { q: 3, r: 2 } });
    expect(getUnitAtHex(next, { q: 3, r: 2 })?.id).toBe('player');
    expect(getUnitAtHex(next, { q: 0, r: 0 })).toBeUndefined();
  });
});

describe('getPlayerUnits', () => {
  it('returns exactly the 2 player-faction units', () => {
    const state = createInitialState();
    const units = getPlayerUnits(state);
    expect(units).toHaveLength(2);
    units.forEach(u => expect(u.faction).toBe('player'));
  });

  it('includes player and player-2 by id', () => {
    const state = createInitialState();
    const ids   = getPlayerUnits(state).map(u => u.id);
    expect(ids).toContain('player');
    expect(ids).toContain('player-2');
  });
});

describe('getEnemyUnits', () => {
  it('returns exactly the 3 enemy-faction units', () => {
    const state = createInitialState();
    const units = getEnemyUnits(state);
    expect(units).toHaveLength(3);
    units.forEach(u => expect(u.faction).toBe('enemy'));
  });

  it('includes enemy-1, enemy-2, enemy-3 by id', () => {
    const state = createInitialState();
    const ids   = getEnemyUnits(state).map(u => u.id);
    expect(ids).toContain('enemy-1');
    expect(ids).toContain('enemy-2');
    expect(ids).toContain('enemy-3');
  });
});
