import { HexCoord, hexKey, hexNeighbors } from './HexCoord';
import { HexGrid } from './HexGrid';

// BFS from start to end across the walkable cells in grid.
// Returns the path from start (exclusive) to end (inclusive), or null if
// end is not on the grid or is not reachable from start.
//
// Optional `blocked` set: hex keys that may not be used as intermediate waypoints.
// The destination is always allowed through regardless of the blocked set.
export function findPath(
  grid: HexGrid,
  start: HexCoord,
  end: HexCoord,
  blocked?: Set<string>,
): HexCoord[] | null {
  if (!grid.has(end)) return null;
  if (hexKey(start) === hexKey(end)) return [];

  const endKey   = hexKey(end);
  const visited  = new Set<string>([hexKey(start)]);
  // Each queue entry carries the full path from start to that hex.
  const queue: Array<{ hex: HexCoord; path: HexCoord[] }> = [
    { hex: start, path: [] },
  ];

  while (queue.length > 0) {
    const { hex, path } = queue.shift()!;

    for (const neighbor of hexNeighbors(hex)) {
      const key = hexKey(neighbor);
      if (visited.has(key) || !grid.has(neighbor)) continue;
      // Skip blocked intermediate hexes; always allow the destination through.
      if (blocked?.has(key) && key !== endKey) continue;

      // Mark visited before the early-return so any future re-entry of this
      // neighbor via a different BFS branch is correctly suppressed.
      visited.add(key);

      const newPath = [...path, neighbor];
      if (key === endKey) return newPath;

      queue.push({ hex: neighbor, path: newPath });
    }
  }

  return null; // end is on the grid but surrounded by unwalkable cells
}
