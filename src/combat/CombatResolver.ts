import { Unit } from '../entities/Unit';

export interface AttackResult {
  hit:    boolean;
  damage: number;
}

const BASE_HIT_CHANCE = 0.75;

// Returns a random integer in [-1, 0, +1] with equal probability.
function variance(): number {
  return Math.floor(Math.random() * 3) - 1;
}

// Pre-resolves an attack: rolls hit/miss and damage.
// The caller dispatches the returned AttackResult in ATTACK_UNIT — keeping
// the reducer pure and deterministic (same action always produces same state).
export function resolveAttack(attacker: Unit, _defender: Unit): AttackResult {
  const hit = Math.random() < BASE_HIT_CHANCE;
  if (!hit) return { hit: false, damage: 0 };

  const damage = Math.max(1, attacker.attack + variance());
  return { hit: true, damage };
}
