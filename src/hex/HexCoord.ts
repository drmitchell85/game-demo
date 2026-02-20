// Pointy-top axial hex coordinate system.
// Reference: https://www.redblobgames.com/grids/hexagons/
//
// Axial stores 2 values (q, r). The third cube coordinate is always s = -q - r.
// All algorithms operate on these two values; pixel conversion happens only at render time.

export interface HexCoord {
  q: number;
  r: number;
}

// Stable cache-friendly string key for Map/Set lookups.
export function hexKey(hex: HexCoord): string {
  return `${hex.q},${hex.r}`;
}

// ---------------------------------------------------------------------------
// Pixel ↔ Hex conversions (pointy-top)
// ---------------------------------------------------------------------------

const SQRT3 = Math.sqrt(3);

// Convert axial hex coordinate to pixel center (relative to grid origin).
export function hexToPixel(hex: HexCoord, size: number): { x: number; y: number } {
  return {
    x: size * (SQRT3 * hex.q + SQRT3 / 2 * hex.r),
    y: size * (3 / 2 * hex.r),
  };
}

// Round fractional cube coordinates to the nearest hex.
// Naive Math.round() on each axis can violate the cube constraint q+r+s=0.
// This resets whichever axis had the largest rounding error to restore it.
export function hexRound(q: number, r: number): HexCoord {
  const s = -q - r;
  let rq = Math.round(q);
  let rr = Math.round(r);
  let rs = Math.round(s);

  const qDiff = Math.abs(rq - q);
  const rDiff = Math.abs(rr - r);
  const sDiff = Math.abs(rs - s);

  if (qDiff > rDiff && qDiff > sDiff) {
    rq = -rr - rs;
  } else if (rDiff > sDiff) {
    rr = -rq - rs;
  }
  // else: rs has the largest error — reset it. Since we don't store s,
  // {rq, rr} are already correct and satisfy q+r+(-rq-rr) = 0.

  // Normalize -0 to 0. Math.round(-epsilon) returns -0 in JS, which breaks
  // deep-equality checks (Object.is(-0, 0) === false). -0 || 0 returns 0.
  return { q: rq || 0, r: rr || 0 };
}

// Convert a pixel position (relative to grid origin) to the nearest hex.
export function pixelToHex(x: number, y: number, size: number): HexCoord {
  const q = (SQRT3 / 3 * x - 1 / 3 * y) / size;
  const r = (2 / 3 * y) / size;
  return hexRound(q, r);
}

// ---------------------------------------------------------------------------
// Neighbor traversal
// ---------------------------------------------------------------------------

// The 6 unit direction vectors for pointy-top axial coordinates.
// Order: E, NE, NW, W, SW, SE (clockwise from east).
const HEX_DIRECTIONS: HexCoord[] = [
  { q: +1, r:  0 }, // E
  { q: +1, r: -1 }, // NE
  { q:  0, r: -1 }, // NW
  { q: -1, r:  0 }, // W
  { q: -1, r: +1 }, // SW
  { q:  0, r: +1 }, // SE
];

// All 6 neighbors of a hex, in direction order.
export function hexNeighbors(hex: HexCoord): HexCoord[] {
  return HEX_DIRECTIONS.map(dir => ({
    q: hex.q + dir.q,
    r: hex.r + dir.r,
  }));
}

// ---------------------------------------------------------------------------
// Distance and range
// ---------------------------------------------------------------------------

// Hex grid distance (the number of steps between two hexes).
// Equivalent to max(|dq|, |dr|, |ds|) in cube coordinates.
export function hexDistance(a: HexCoord, b: HexCoord): number {
  const dq = a.q - b.q;
  const dr = a.r - b.r;
  const ds = -dq - dr; // derived s difference
  return Math.max(Math.abs(dq), Math.abs(dr), Math.abs(ds));
}

// All hexes within `range` steps of `center` (inclusive of center).
export function hexRange(center: HexCoord, range: number): HexCoord[] {
  const results: HexCoord[] = [];
  for (let q = -range; q <= range; q++) {
    for (let r = Math.max(-range, -q - range); r <= Math.min(range, -q + range); r++) {
      results.push({ q: center.q + q, r: center.r + r });
    }
  }
  return results;
}

// ---------------------------------------------------------------------------
// Viewport layout
// ---------------------------------------------------------------------------

// Pixel dimensions of the bounding box that contains the full cols×rows grid.
//
// For a pointy-top odd-r layout the bounding box is:
//   width  = √3 · size · (cols + 0.5)       — accounts for odd-row half-hex offset
//   height = size · (1.5 · (rows - 1) + 2)  — 1.5·size per row gap + top/bottom radii
//
// Use this with a bounding-box-anchored grid origin (origin.x = √3/2·size, origin.y = size)
// so the full grid fills world space starting at (0, 0).
export function calcWorldSize(
  cols: number,
  rows: number,
  size: number,
): { width: number; height: number } {
  return {
    width:  SQRT3 * size * (cols + 0.5),
    height: size * (1.5 * (rows - 1) + 2),
  };
}

// Calculate the pixel position of the grid origin (center of the {q:0,r:0} hex)
// such that the entire odd-r rectangular grid is centered in the viewport.
//
// For a pointy-top odd-r layout with rows > 1:
//   - Bounding box x: from (origin.x - sqrt(3)/2*size) to (origin.x + cols*sqrt(3)*size)
//   - Bounding box y: from (origin.y - size)           to (origin.y + (rows-1)*1.5*size + size)
export function calcGridOrigin(
  cols: number,
  rows: number,
  size: number,
  viewWidth: number,
  viewHeight: number,
): { x: number; y: number } {
  // Center of the x bounding box in local coords: sqrt(3)*size*(cols - 0.5) / 2
  const bbCenterX = SQRT3 * size * (cols - 0.5) / 2;
  // Center of the y bounding box in local coords: (rows - 1) * 0.75 * size
  const bbCenterY = (rows - 1) * 0.75 * size;
  return {
    x: viewWidth  / 2 - bbCenterX,
    y: viewHeight / 2 - bbCenterY,
  };
}
