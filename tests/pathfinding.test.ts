import { describe, it, expect } from 'vitest';
import { hexKey } from '../src/hex/HexCoord';
import { createRectangularGrid } from '../src/hex/HexGrid';
import { findPath } from '../src/hex/pathfinding';

// 5×5 grid — enough room for multi-step paths.
// Odd-r offset: r=0 → q=0..4, r=2 → q=-1..3, r=4 → q=-2..2
const grid = createRectangularGrid(5, 5);

describe('findPath', () => {
  it('returns [] when start equals end', () => {
    expect(findPath(grid, { q: 0, r: 0 }, { q: 0, r: 0 })).toEqual([]);
  });

  it('returns a 1-element path to an adjacent hex', () => {
    const path = findPath(grid, { q: 0, r: 0 }, { q: 1, r: 0 });
    expect(path).toHaveLength(1);
    expect(path![0]).toEqual({ q: 1, r: 0 });
  });

  it('excludes the start hex from the returned path', () => {
    const path = findPath(grid, { q: 0, r: 0 }, { q: 3, r: 0 });
    expect(path).not.toBeNull();
    expect(path!.some(h => h.q === 0 && h.r === 0)).toBe(false);
  });

  it('ends at the destination hex', () => {
    const path = findPath(grid, { q: 0, r: 0 }, { q: 3, r: 0 });
    expect(path).not.toBeNull();
    const last = path![path!.length - 1];
    expect(last).toEqual({ q: 3, r: 0 });
  });

  it('path length equals distance for a straight-line move', () => {
    // {q:0,r:0} → {q:3,r:0} — 3 steps along the q axis
    const path = findPath(grid, { q: 0, r: 0 }, { q: 3, r: 0 });
    expect(path).toHaveLength(3);
  });

  it('every hex in the path is on the grid', () => {
    const path = findPath(grid, { q: 0, r: 0 }, { q: 2, r: 2 });
    expect(path).not.toBeNull();
    expect(path!.every(h => grid.has(h))).toBe(true);
  });

  it('returns null for an off-grid destination', () => {
    expect(findPath(grid, { q: 0, r: 0 }, { q: 99, r: 99 })).toBeNull();
  });

  it('avoids a blocked intermediate hex', () => {
    // Direct path {0,0}→{2,0} goes through {1,0}. Block {1,0} — must route around it.
    const blocked = new Set<string>([hexKey({ q: 1, r: 0 })]);
    const path = findPath(grid, { q: 0, r: 0 }, { q: 2, r: 0 }, blocked);
    expect(path).not.toBeNull();
    expect(path!.every(h => !(h.q === 1 && h.r === 0))).toBe(true); // no blocked hex in path
    expect(path![path!.length - 1]).toEqual({ q: 2, r: 0 }); // destination still reached
  });

  it('still reaches destination when destination is in blocked set', () => {
    // reachableSet already excludes occupied hexes, but findPath should work
    // regardless — destination is always allowed through the blocked filter.
    const blocked = new Set<string>([hexKey({ q: 2, r: 0 })]); // destination itself is "blocked"
    const path = findPath(grid, { q: 0, r: 0 }, { q: 2, r: 0 }, blocked);
    expect(path).not.toBeNull();
    expect(path![path!.length - 1]).toEqual({ q: 2, r: 0 });
  });

  it('returns the same path whether blocked is undefined or an empty Set', () => {
    // Passing an empty Set should be functionally identical to omitting the argument.
    const withUndefined = findPath(grid, { q: 0, r: 0 }, { q: 3, r: 0 });
    const withEmptySet  = findPath(grid, { q: 0, r: 0 }, { q: 3, r: 0 }, new Set());
    expect(withEmptySet).toEqual(withUndefined);
  });
});
