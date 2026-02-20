import { HexCoord, hexKey, hexNeighbors } from './HexCoord';
import { HexGrid } from './HexGrid';

// BFS from start, returning all hexes reachable within `range` steps.
// Result always includes the start hex itself (at distance 0).
// Uses BFS rather than hexRange() so grid edges naturally limit the result.
export function getReachableHexes(
  grid: HexGrid,
  start: HexCoord,
  range: number,
): HexCoord[] {
  const result:  HexCoord[] = [start];
  const visited = new Set<string>([hexKey(start)]);
  const queue:   Array<{ hex: HexCoord; stepsLeft: number }> = [
    { hex: start, stepsLeft: range },
  ];

  while (queue.length > 0) {
    const { hex, stepsLeft } = queue.shift()!;
    if (stepsLeft === 0) continue;

    for (const neighbor of hexNeighbors(hex)) {
      const key = hexKey(neighbor);
      if (visited.has(key) || !grid.has(neighbor)) continue;

      visited.add(key);
      result.push(neighbor);
      queue.push({ hex: neighbor, stepsLeft: stepsLeft - 1 });
    }
  }

  return result;
}
