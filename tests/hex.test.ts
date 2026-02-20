import { describe, it, expect } from 'vitest';
import {
  hexKey,
  hexToPixel,
  pixelToHex,
  hexRound,
  hexNeighbors,
  hexDistance,
  hexRange,
  calcGridOrigin,
  calcWorldSize,
} from '../src/hex/HexCoord';
import { HexGrid, createRectangularGrid } from '../src/hex/HexGrid';

const SIZE = 36;

// ---------------------------------------------------------------------------
// hexKey
// ---------------------------------------------------------------------------

describe('hexKey', () => {
  it('formats as "q,r"', () => {
    expect(hexKey({ q: 0, r: 0 })).toBe('0,0');
    expect(hexKey({ q: 3, r: -2 })).toBe('3,-2');
    expect(hexKey({ q: -1, r: 5 })).toBe('-1,5');
  });
});

// ---------------------------------------------------------------------------
// hexToPixel — pointy-top axial
// ---------------------------------------------------------------------------

describe('hexToPixel', () => {
  it('maps origin to (0, 0)', () => {
    const { x, y } = hexToPixel({ q: 0, r: 0 }, SIZE);
    expect(x).toBeCloseTo(0);
    expect(y).toBeCloseTo(0);
  });

  it('{q:1,r:0} → (size * sqrt(3), 0)', () => {
    const { x, y } = hexToPixel({ q: 1, r: 0 }, SIZE);
    expect(x).toBeCloseTo(SIZE * Math.sqrt(3));
    expect(y).toBeCloseTo(0);
  });

  it('{q:0,r:1} → (size * sqrt(3)/2, size * 3/2)', () => {
    const { x, y } = hexToPixel({ q: 0, r: 1 }, SIZE);
    expect(x).toBeCloseTo(SIZE * Math.sqrt(3) / 2);
    expect(y).toBeCloseTo(SIZE * 1.5);
  });

  it('{q:-1,r:0} is mirrored from {q:1,r:0}', () => {
    const pos = hexToPixel({ q: 1, r: 0 }, SIZE);
    const neg = hexToPixel({ q: -1, r: 0 }, SIZE);
    expect(neg.x).toBeCloseTo(-pos.x);
    expect(neg.y).toBeCloseTo(0);
  });
});

// ---------------------------------------------------------------------------
// pixelToHex — roundtrip is the primary correctness guarantee
// ---------------------------------------------------------------------------

describe('pixelToHex', () => {
  it('roundtrips through hexToPixel for every hex in a 10×10 range', () => {
    for (let q = -5; q <= 5; q++) {
      for (let r = -5; r <= 5; r++) {
        const original = { q, r };
        const { x, y } = hexToPixel(original, SIZE);
        const result = pixelToHex(x, y, SIZE);
        expect(result).toEqual(original);
      }
    }
  });

  it('snaps to the correct hex when slightly off-center', () => {
    const center = hexToPixel({ q: 2, r: -1 }, SIZE);
    // Slightly perturbed — should still resolve to the same hex
    expect(pixelToHex(center.x + 0.01, center.y + 0.01, SIZE)).toEqual({ q: 2, r: -1 });
    expect(pixelToHex(center.x - 0.01, center.y - 0.01, SIZE)).toEqual({ q: 2, r: -1 });
  });
});

// ---------------------------------------------------------------------------
// hexRound — the non-trivial part of pixelToHex
// ---------------------------------------------------------------------------

describe('hexRound', () => {
  it('rounds to origin from fractional center', () => {
    expect(hexRound(0.1, 0.1)).toEqual({ q: 0, r: 0 });
  });

  it('picks {q:1,r:0} when q-error is largest', () => {
    // q_frac=0.9, r_frac=0.05 → rounding error largest on q → reset q
    expect(hexRound(0.9, 0.05)).toEqual({ q: 1, r: 0 });
  });

  it('picks {q:0,r:1} when r-error is largest', () => {
    expect(hexRound(0.1, 0.9)).toEqual({ q: 0, r: 1 });
  });

  it('result always satisfies cube constraint q + r + s = 0', () => {
    const cases = [
      [0.5, 0], [0, 0.5], [-0.5, 0], [0.4, 0.4], [0.6, -0.3],
    ] as const;
    for (const [q, r] of cases) {
      const result = hexRound(q, r);
      const s = -result.q - result.r;
      // q + r + s should be 0 for any valid cube coordinate
      expect(result.q + result.r + s).toBe(0);
    }
  });
});

// ---------------------------------------------------------------------------
// hexNeighbors
// ---------------------------------------------------------------------------

describe('hexNeighbors', () => {
  it('returns exactly 6 neighbors', () => {
    expect(hexNeighbors({ q: 0, r: 0 })).toHaveLength(6);
    expect(hexNeighbors({ q: 5, r: -3 })).toHaveLength(6);
  });

  it('origin has all 6 directional neighbors', () => {
    const neighbors = hexNeighbors({ q: 0, r: 0 });
    expect(neighbors).toContainEqual({ q: +1, r:  0 }); // E
    expect(neighbors).toContainEqual({ q: +1, r: -1 }); // NE
    expect(neighbors).toContainEqual({ q:  0, r: -1 }); // NW
    expect(neighbors).toContainEqual({ q: -1, r:  0 }); // W
    expect(neighbors).toContainEqual({ q: -1, r: +1 }); // SW
    expect(neighbors).toContainEqual({ q:  0, r: +1 }); // SE
  });

  it('each neighbor is exactly 1 step away', () => {
    const origin = { q: 3, r: -2 };
    for (const n of hexNeighbors(origin)) {
      expect(hexDistance(origin, n)).toBe(1);
    }
  });
});

// ---------------------------------------------------------------------------
// hexDistance
// ---------------------------------------------------------------------------

describe('hexDistance', () => {
  it('distance to self is 0', () => {
    expect(hexDistance({ q: 0, r: 0 }, { q: 0, r: 0 })).toBe(0);
    expect(hexDistance({ q: 4, r: -2 }, { q: 4, r: -2 })).toBe(0);
  });

  it('adjacent hexes have distance 1', () => {
    expect(hexDistance({ q: 0, r: 0 }, { q:  1, r:  0 })).toBe(1);
    expect(hexDistance({ q: 0, r: 0 }, { q:  0, r:  1 })).toBe(1);
    expect(hexDistance({ q: 0, r: 0 }, { q: -1, r:  1 })).toBe(1);
  });

  it('computes longer distances correctly', () => {
    expect(hexDistance({ q: 0, r: 0 }, { q: 3, r:  0 })).toBe(3);
    expect(hexDistance({ q: 0, r: 0 }, { q: 2, r: -3 })).toBe(3);
    expect(hexDistance({ q: 0, r: 0 }, { q: 3, r: -3 })).toBe(3);
  });

  it('is symmetric', () => {
    const a = { q: 2, r: -4 };
    const b = { q: -1, r: 3 };
    expect(hexDistance(a, b)).toBe(hexDistance(b, a));
  });
});

// ---------------------------------------------------------------------------
// hexRange
// ---------------------------------------------------------------------------

describe('hexRange', () => {
  it('range 0 returns only the center hex', () => {
    const result = hexRange({ q: 0, r: 0 }, 0);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({ q: 0, r: 0 });
  });

  // Hex count formula: 3n² + 3n + 1
  it('range 1 returns 7 hexes', () => {
    expect(hexRange({ q: 0, r: 0 }, 1)).toHaveLength(7);
  });

  it('range 2 returns 19 hexes', () => {
    expect(hexRange({ q: 0, r: 0 }, 2)).toHaveLength(19);
  });

  it('range 3 returns 37 hexes', () => {
    expect(hexRange({ q: 0, r: 0 }, 3)).toHaveLength(37);
  });

  it('all results are within the specified range', () => {
    const center = { q: 3, r: -1 };
    const range = 3;
    for (const hex of hexRange(center, range)) {
      expect(hexDistance(center, hex)).toBeLessThanOrEqual(range);
    }
  });

  it('includes the center hex', () => {
    const center = { q: 2, r: -2 };
    expect(hexRange(center, 2)).toContainEqual(center);
  });

  it('works for non-origin centers', () => {
    // Count should be the same regardless of center position
    expect(hexRange({ q: 5, r: -3 }, 2)).toHaveLength(19);
  });
});

// ---------------------------------------------------------------------------
// HexGrid
// ---------------------------------------------------------------------------

describe('HexGrid', () => {
  it('starts empty', () => {
    expect(new HexGrid().size).toBe(0);
  });

  it('set → has → get roundtrip', () => {
    const grid = new HexGrid();
    const hex = { q: 2, r: -1 };
    expect(grid.has(hex)).toBe(false);
    grid.set(hex, { hex });
    expect(grid.has(hex)).toBe(true);
    expect(grid.get(hex)?.hex).toEqual(hex);
  });

  it('does not confuse distinct hexes', () => {
    const grid = new HexGrid();
    grid.set({ q: 0, r: 0 }, { hex: { q: 0, r: 0 } });
    expect(grid.has({ q: 1, r: 0 })).toBe(false);
    expect(grid.has({ q: 0, r: 1 })).toBe(false);
  });

  it('size tracks insertions', () => {
    const grid = new HexGrid();
    grid.set({ q: 0, r: 0 }, { hex: { q: 0, r: 0 } });
    grid.set({ q: 1, r: 0 }, { hex: { q: 1, r: 0 } });
    expect(grid.size).toBe(2);
    // Overwriting same key does not increase size
    grid.set({ q: 0, r: 0 }, { hex: { q: 0, r: 0 } });
    expect(grid.size).toBe(2);
  });

  it('forEach visits every cell exactly once', () => {
    const grid = new HexGrid();
    grid.set({ q: 0, r: 0 }, { hex: { q: 0, r: 0 } });
    grid.set({ q: 1, r: 0 }, { hex: { q: 1, r: 0 } });
    grid.set({ q: 0, r: 1 }, { hex: { q: 0, r: 1 } });
    let count = 0;
    grid.forEach(() => count++);
    expect(count).toBe(3);
  });
});

// ---------------------------------------------------------------------------
// createRectangularGrid
// ---------------------------------------------------------------------------

describe('createRectangularGrid', () => {
  it('creates cols × rows hexes', () => {
    expect(createRectangularGrid(12, 8).size).toBe(96);
    expect(createRectangularGrid(5, 5).size).toBe(25);
    expect(createRectangularGrid(1, 1).size).toBe(1);
  });

  it('every hex in the grid is retrievable by coordinate', () => {
    const grid = createRectangularGrid(6, 4);
    grid.forEach(cell => {
      expect(grid.has(cell.hex)).toBe(true);
    });
  });

  it('no two cells share the same coordinates', () => {
    const grid = createRectangularGrid(8, 6);
    const seen = new Set<string>();
    grid.forEach(cell => {
      const key = hexKey(cell.hex);
      expect(seen.has(key)).toBe(false);
      seen.add(key);
    });
  });
});

// ---------------------------------------------------------------------------
// calcGridOrigin
// ---------------------------------------------------------------------------

describe('calcGridOrigin', () => {
  const SIZE = 36;
  const COLS = 12;
  const ROWS = 8;
  const VW = 960;
  const VH = 540;

  it('places the bounding box center at the viewport center', () => {
    const origin = calcGridOrigin(COLS, ROWS, SIZE, VW, VH);
    const SQRT3 = Math.sqrt(3);

    // The bounding box x-span: left edge is at origin.x - sqrt(3)/2*size,
    // right edge is at origin.x + cols*sqrt(3)*size (from odd-row rightmost hex).
    const leftEdge  = origin.x - (SQRT3 / 2) * SIZE;
    const rightEdge = origin.x + COLS * SQRT3 * SIZE;
    expect((leftEdge + rightEdge) / 2).toBeCloseTo(VW / 2);

    // The bounding box y-span: top edge at origin.y - size,
    // bottom edge at origin.y + (rows-1)*1.5*size + size.
    const topEdge    = origin.y - SIZE;
    const bottomEdge = origin.y + (ROWS - 1) * 1.5 * SIZE + SIZE;
    expect((topEdge + bottomEdge) / 2).toBeCloseTo(VH / 2);
  });

  it('grid fits within the viewport', () => {
    const origin = calcGridOrigin(COLS, ROWS, SIZE, VW, VH);
    const SQRT3 = Math.sqrt(3);

    const leftEdge   = origin.x - (SQRT3 / 2) * SIZE;
    const rightEdge  = origin.x + COLS * SQRT3 * SIZE;
    const topEdge    = origin.y - SIZE;
    const bottomEdge = origin.y + (ROWS - 1) * 1.5 * SIZE + SIZE;

    expect(leftEdge).toBeGreaterThanOrEqual(0);
    expect(rightEdge).toBeLessThanOrEqual(VW);
    expect(topEdge).toBeGreaterThanOrEqual(0);
    expect(bottomEdge).toBeLessThanOrEqual(VH);
  });
});

// ---------------------------------------------------------------------------
// calcWorldSize
// ---------------------------------------------------------------------------

describe('calcWorldSize', () => {
  const COLS = 24;
  const ROWS = 16;
  const SZ   = 36;
  const SQRT3 = Math.sqrt(3);

  // When the grid origin is anchored so the bounding box starts at (0, 0):
  //   origin.x = √3/2 · size   (left edge of {q:0,r:0} sits at x = 0)
  //   origin.y = size           (top edge of {q:0,r:0} sits at y = 0)
  const originX = (SQRT3 / 2) * SZ;
  const originY = SZ;

  it('width fully contains every hex in the grid (center ± half-width)', () => {
    const { width } = calcWorldSize(COLS, ROWS, SZ);
    const grid = createRectangularGrid(COLS, ROWS);

    grid.forEach(cell => {
      const localX  = hexToPixel(cell.hex, SZ).x;
      const worldX  = originX + localX;
      const leftEdge  = worldX - (SQRT3 / 2) * SZ;
      const rightEdge = worldX + (SQRT3 / 2) * SZ;
      expect(leftEdge).toBeGreaterThanOrEqual(-0.01);
      expect(rightEdge).toBeLessThanOrEqual(width + 0.01);
    });
  });

  it('height fully contains every hex in the grid (center ± half-height)', () => {
    const { height } = calcWorldSize(COLS, ROWS, SZ);
    const grid = createRectangularGrid(COLS, ROWS);

    grid.forEach(cell => {
      const localY    = hexToPixel(cell.hex, SZ).y;
      const worldY    = originY + localY;
      const topEdge   = worldY - SZ;
      const bottomEdge = worldY + SZ;
      expect(topEdge).toBeGreaterThanOrEqual(-0.01);
      expect(bottomEdge).toBeLessThanOrEqual(height + 0.01);
    });
  });
});
