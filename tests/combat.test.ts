import { describe, it, expect, vi, afterEach } from 'vitest';
import { resolveAttack } from '../src/combat/CombatResolver';
import { createInitialState } from '../src/state/GameState';
import { applyAction } from '../src/state/reducer';

afterEach(() => {
  vi.restoreAllMocks();
});

// ---------------------------------------------------------------------------
// resolveAttack
// ---------------------------------------------------------------------------

describe('resolveAttack', () => {
  it('returns hit: true when Math.random is below BASE_HIT_CHANCE (0.75)', () => {
    // First call: hit check (0.5 < 0.75 → hit); second call: damage variance
    vi.spyOn(Math, 'random').mockReturnValueOnce(0.5).mockReturnValueOnce(0.5);
    const state    = createInitialState();
    const attacker = state.units.get('player')!;
    const defender = state.units.get('enemy-1')!;
    const result   = resolveAttack(attacker, defender);
    expect(result.hit).toBe(true);
  });

  it('returns hit: false when Math.random is at or above BASE_HIT_CHANCE (0.75)', () => {
    vi.spyOn(Math, 'random').mockReturnValueOnce(0.75); // exactly 0.75 → miss
    const state    = createInitialState();
    const attacker = state.units.get('player')!;
    const defender = state.units.get('enemy-1')!;
    const result   = resolveAttack(attacker, defender);
    expect(result.hit).toBe(false);
    expect(result.damage).toBe(0);
  });

  it('returns damage: 0 on miss', () => {
    vi.spyOn(Math, 'random').mockReturnValueOnce(0.9); // > 0.75 → miss
    const state    = createInitialState();
    const attacker = state.units.get('player')!;
    const defender = state.units.get('enemy-1')!;
    expect(resolveAttack(attacker, defender).damage).toBe(0);
  });

  it('returns minimum damage of attack - 1 when variance is -1', () => {
    // first call: 0.5 → hit; second call: 0.0 → floor(0*3)-1 = -1 variance
    vi.spyOn(Math, 'random').mockReturnValueOnce(0.5).mockReturnValueOnce(0.0);
    const state    = createInitialState();
    const attacker = state.units.get('player')!; // attack: 3
    const defender = state.units.get('enemy-1')!;
    const result   = resolveAttack(attacker, defender);
    expect(result.hit).toBe(true);
    expect(result.damage).toBe(2); // 3 - 1
  });

  it('returns maximum damage of attack + 1 when variance is +1', () => {
    // first call: 0.5 → hit; second call: 0.99 → floor(2.97)-1 = 1 variance
    vi.spyOn(Math, 'random').mockReturnValueOnce(0.5).mockReturnValueOnce(0.99);
    const state    = createInitialState();
    const attacker = state.units.get('player')!; // attack: 3
    const defender = state.units.get('enemy-1')!;
    const result   = resolveAttack(attacker, defender);
    expect(result.hit).toBe(true);
    expect(result.damage).toBe(4); // 3 + 1
  });

  it('clamps minimum damage to 1 when attack - 1 would be 0', () => {
    // attacker with attack: 1 + variance -1 → 0, should be clamped to 1
    vi.spyOn(Math, 'random').mockReturnValueOnce(0.5).mockReturnValueOnce(0.0);
    const state    = createInitialState();
    const weakUnit = { ...state.units.get('player')!, attack: 1 };
    const defender = state.units.get('enemy-1')!;
    const result   = resolveAttack(weakUnit, defender);
    expect(result.hit).toBe(true);
    expect(result.damage).toBe(1); // max(1, 1-1) = 1
  });
});

// ---------------------------------------------------------------------------
// applyAction — ATTACK_UNIT
// ---------------------------------------------------------------------------

describe('applyAction ATTACK_UNIT', () => {
  it('reduces defender hp by damage on hit', () => {
    const state = createInitialState();
    const next  = applyAction(state, {
      type:       'ATTACK_UNIT',
      attackerId: 'player',
      defenderId: 'enemy-1',
      hit:        true,
      damage:     3,
    });
    expect(next.units.get('enemy-1')?.hp).toBe(5); // 8 - 3
  });

  it('does not change defender hp on miss', () => {
    const state = createInitialState();
    const next  = applyAction(state, {
      type:       'ATTACK_UNIT',
      attackerId: 'player',
      defenderId: 'enemy-1',
      hit:        false,
      damage:     0,
    });
    expect(next.units.get('enemy-1')?.hp).toBe(8); // unchanged
  });

  it('sets hasAttacked: true on attacker on hit', () => {
    const state = createInitialState();
    const next  = applyAction(state, {
      type:       'ATTACK_UNIT',
      attackerId: 'player',
      defenderId: 'enemy-1',
      hit:        true,
      damage:     2,
    });
    expect(next.units.get('player')?.hasAttacked).toBe(true);
  });

  it('sets hasAttacked: true on attacker on miss', () => {
    const state = createInitialState();
    const next  = applyAction(state, {
      type:       'ATTACK_UNIT',
      attackerId: 'player',
      defenderId: 'enemy-1',
      hit:        false,
      damage:     0,
    });
    expect(next.units.get('player')?.hasAttacked).toBe(true);
  });

  it('clamps defender hp to 0 when damage exceeds remaining hp', () => {
    const state = createInitialState();
    const next  = applyAction(state, {
      type:       'ATTACK_UNIT',
      attackerId: 'player',
      defenderId: 'enemy-1',
      hit:        true,
      damage:     100, // far exceeds hp: 8
    });
    expect(next.units.get('enemy-1')?.hp).toBe(0);
  });

  it('never reduces defender hp below 0', () => {
    const state = createInitialState();
    const next  = applyAction(state, {
      type:       'ATTACK_UNIT',
      attackerId: 'player',
      defenderId: 'enemy-1',
      hit:        true,
      damage:     9, // 8 hp - 9 damage would be -1 without clamp
    });
    expect(next.units.get('enemy-1')?.hp).toBe(0);
  });

  it('returns state unchanged when attacker id is unknown', () => {
    const state = createInitialState();
    const next  = applyAction(state, {
      type:       'ATTACK_UNIT',
      attackerId: 'ghost',
      defenderId: 'enemy-1',
      hit:        true,
      damage:     2,
    });
    expect(next).toBe(state);
  });

  it('returns state unchanged when defender id is unknown', () => {
    const state = createInitialState();
    const next  = applyAction(state, {
      type:       'ATTACK_UNIT',
      attackerId: 'player',
      defenderId: 'ghost',
      hit:        true,
      damage:     2,
    });
    expect(next).toBe(state);
  });

  it('returns state unchanged when attacker and defender are the same unit', () => {
    const state = createInitialState();
    const next  = applyAction(state, {
      type:       'ATTACK_UNIT',
      attackerId: 'player',
      defenderId: 'player',
      hit:        true,
      damage:     2,
    });
    expect(next).toBe(state);
  });

  it('returns a new state object (immutable update)', () => {
    const state = createInitialState();
    const next  = applyAction(state, {
      type:       'ATTACK_UNIT',
      attackerId: 'player',
      defenderId: 'enemy-1',
      hit:        true,
      damage:     1,
    });
    expect(next).not.toBe(state);
    expect(next.units).not.toBe(state.units);
  });

  it('does not affect bystander units', () => {
    const state = createInitialState();
    const next  = applyAction(state, {
      type:       'ATTACK_UNIT',
      attackerId: 'player',
      defenderId: 'enemy-1',
      hit:        true,
      damage:     2,
    });
    // player-2 and enemy-2 are not involved — their state should be unchanged.
    // Use ! (non-null) so the test throws loudly if a unit id is ever removed,
    // rather than silently passing on undefined === undefined.
    expect(next.units.get('player-2')!.hp).toBe(state.units.get('player-2')!.hp);
    expect(next.units.get('player-2')!.hasAttacked).toBe(state.units.get('player-2')!.hasAttacked);
    expect(next.units.get('enemy-2')!.hp).toBe(state.units.get('enemy-2')!.hp);
    expect(next.units.get('enemy-2')!.hasAttacked).toBe(state.units.get('enemy-2')!.hasAttacked);
  });

  it('still applies damage when attacker already has hasAttacked: true (reducer is permissive)', () => {
    // The reducer does not gate repeated attacks — that is the UI layer's responsibility (Phase 4.3).
    // This test documents the current reducer behavior: idempotent flag set, damage still applied.
    const s1           = createInitialState();
    const withAttacked = new Map(s1.units);
    withAttacked.set('player', { ...s1.units.get('player')!, hasAttacked: true });
    const state: typeof s1 = { ...s1, units: withAttacked };

    const next = applyAction(state, {
      type:       'ATTACK_UNIT',
      attackerId: 'player',
      defenderId: 'enemy-1',
      hit:        true,
      damage:     2,
    });
    expect(next.units.get('player')?.hasAttacked).toBe(true);    // stays true
    expect(next.units.get('enemy-1')?.hp).toBe(6);               // 8 - 2 = 6 (damage applied)
  });
});
