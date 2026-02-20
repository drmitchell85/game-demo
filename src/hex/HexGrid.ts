import { HexCoord, hexKey } from './HexCoord';

// Minimal cell data stored per hex. Extended in later phases (terrain, occupant, etc.).
export interface HexCell {
  hex: HexCoord;
}

// Map-backed grid with O(1) lookup by hex coordinate.
// No Phaser imports — this is pure data, testable in Node.
export class HexGrid {
  private cells: Map<string, HexCell> = new Map();

  has(hex: HexCoord): boolean {
    return this.cells.has(hexKey(hex));
  }

  get(hex: HexCoord): HexCell | undefined {
    return this.cells.get(hexKey(hex));
  }

  set(hex: HexCoord, cell: HexCell): void {
    this.cells.set(hexKey(hex), cell);
  }

  forEach(cb: (cell: HexCell) => void): void {
    this.cells.forEach(cb);
  }

  get size(): number {
    return this.cells.size;
  }
}

// Build a visually rectangular grid using offset-row layout for pointy-top hexes.
// For each row r, column indices are shifted so the left edge stays aligned.
// This is the "odd-r" offset → axial conversion: q = col - floor(r / 2)
export function createRectangularGrid(cols: number, rows: number): HexGrid {
  const grid = new HexGrid();
  for (let r = 0; r < rows; r++) {
    for (let col = 0; col < cols; col++) {
      const hex: HexCoord = { q: col - Math.floor(r / 2), r };
      grid.set(hex, { hex });
    }
  }
  return grid;
}
