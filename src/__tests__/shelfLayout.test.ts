import { describe, expect, it } from 'vitest';
import { arrangeIntoGrid, releaseBin } from '../utils/shelfLayout';

const ids = (count: number) => Array.from({ length: count }, (_, i) => `b${i + 1}`);

function bins(bookIds: string[], cols: number, rows: number): string[] {
  const { coordinates } = arrangeIntoGrid(bookIds, { cols, rows });
  return bookIds.map((id) => `${coordinates[id].x},${coordinates[id].y}`);
}

describe('arrangeIntoGrid', () => {
  it('gives every book a bin of its own', () => {
    const placed = bins(ids(40), 6, 3);
    expect(new Set(placed).size).toBe(40);
  });

  it('grows the grid when the books no longer fit the stored one', () => {
    const { gridDimensions } = arrangeIntoGrid(ids(40), { cols: 6, rows: 3 });
    expect(gridDimensions).toEqual({ cols: 6, rows: 7 });
  });

  it('keeps a grid that is already big enough', () => {
    const { gridDimensions } = arrangeIntoGrid(ids(10), { cols: 6, rows: 4 });
    expect(gridDimensions).toEqual({ cols: 6, rows: 4 });
  });

  it('never files a book outside the grid', () => {
    const { coordinates, gridDimensions } = arrangeIntoGrid(ids(23), { cols: 5, rows: 2 });
    Object.values(coordinates).forEach(({ x, y }) => {
      expect(x).toBeGreaterThanOrEqual(1);
      expect(x).toBeLessThanOrEqual(gridDimensions.cols);
      expect(y).toBeGreaterThanOrEqual(1);
      expect(y).toBeLessThanOrEqual(gridDimensions.rows);
    });
  });

  it('places nothing for an empty shelf', () => {
    expect(arrangeIntoGrid([], { cols: 6, rows: 3 })).toEqual({
      gridDimensions: { cols: 6, rows: 3 },
      coordinates: {},
    });
  });
});

describe('releaseBin', () => {
  const shelves = [
    { id: 's1', coordinates: { b1: { x: 1, y: 1 }, b2: { x: 2, y: 1 } } },
    { id: 's2', coordinates: { b3: { x: 1, y: 1 } } },
    { id: 's3' },
  ];

  it('drops the bin of the given book', () => {
    const next = releaseBin(shelves, 'b1');
    expect(next[0].coordinates).toEqual({ b2: { x: 2, y: 1 } });
  });

  it('leaves every other shelf alone', () => {
    const next = releaseBin(shelves, 'b1');
    expect(next[1]).toBe(shelves[1]);
    expect(next[2]).toBe(shelves[2]);
  });

  it('returns the same list when the book has no bin anywhere', () => {
    expect(releaseBin(shelves, 'unknown')).toBe(shelves);
  });
});
