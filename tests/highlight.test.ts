import { describe, it, expect } from 'vitest';
import { createRectangularGrid } from '../src/hex/HexGrid';
import { getReachableHexes } from '../src/hex/HexHighlight';
import { hexDistance } from '../src/hex/HexCoord';

// 5×5 grid. Odd-r offset: r=0 → q=0..4, r=2 → q=-1..3, r=4 → q=-2..2
const grid = createRectangularGrid(5, 5);

describe('getReachableHexes', () => {
  it('range 0 returns only the start hex', () => {
    const result = getReachableHexes(grid, { q: 0, r: 0 }, 0);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({ q: 0, r: 0 });
  });

  it('always includes the start hex', () => {
    const result = getReachableHexes(grid, { q: 1, r: 1 }, 2);
    expect(result.some(h => h.q === 1 && h.r === 1)).toBe(true);
  });

  it('all returned hexes are on the grid', () => {
    const result = getReachableHexes(grid, { q: 1, r: 1 }, 3);
    expect(result.every(h => grid.has(h))).toBe(true);
  });

  it('no returned hex exceeds the range distance from start', () => {
    const start = { q: 1, r: 1 };
    const range  = 2;
    const result = getReachableHexes(grid, start, range);
    expect(result.every(h => hexDistance(start, h) <= range)).toBe(true);
  });

  it('range 1 from a fully-surrounded hex returns 7 hexes (start + 6 neighbors)', () => {
    // {q:1, r:1} has all 6 axial neighbors on a 5×5 grid.
    const result = getReachableHexes(grid, { q: 1, r: 1 }, 1);
    expect(result).toHaveLength(7);
  });

  it('range 1 from a corner hex is limited by grid edges', () => {
    // {q:0, r:0} only has 2 on-grid neighbors: {1,0} and {0,1}.
    const result = getReachableHexes(grid, { q: 0, r: 0 }, 1);
    expect(result).toHaveLength(3); // start + 2 reachable neighbors
  });

  it('returns no duplicates', () => {
    const result = getReachableHexes(grid, { q: 1, r: 1 }, 3);
    const keys = result.map(h => `${h.q},${h.r}`);
    expect(new Set(keys).size).toBe(keys.length);
  });
});
