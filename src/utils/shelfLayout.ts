export interface ShelfGrid {
  cols: number;
  rows: number;
}

export interface GridArrangement {
  gridDimensions: ShelfGrid;
  coordinates: Record<string, { x: number; y: number }>;
}

/**
 * Spreads a shelf's books across its coordinate grid, one book per bin.
 *
 * The grid is grown when the books no longer fit it. Filling a shelf's stored
 * grid as it stands packs more books into a row than the row has columns, and
 * the map draws one book per bin: every book after the first in a bin was
 * simply not on the map any more.
 */
export function arrangeIntoGrid(bookIds: string[], grid: ShelfGrid): GridArrangement {
  const cols = Math.max(1, Math.round(grid.cols));
  const rows = Math.max(1, Math.round(grid.rows), Math.ceil(bookIds.length / cols));
  const perRow = Math.max(1, Math.ceil(bookIds.length / rows));
  const step = cols / perRow;

  const coordinates: Record<string, { x: number; y: number }> = {};
  bookIds.forEach((id, index) => {
    const column = index % perRow;
    coordinates[id] = {
      x: Math.max(1, Math.min(cols, Math.round(column * step + step / 2))),
      y: Math.floor(index / perRow) + 1,
    };
  });

  return { gridDimensions: { cols, rows }, coordinates };
}

/**
 * Drops a book's bin from every shelf that still holds one.
 *
 * A bin outlives the book it points at: deleting a book, or moving it to
 * another shelf, used to leave its coordinate behind on the old shelf, where it
 * is carried in the shelf record for good and synced on every write.
 */
export function releaseBin<T extends { coordinates?: Record<string, { x: number; y: number }> }>(
  shelves: T[],
  bookId: string
): T[] {
  let changed = false;
  const next = shelves.map((shelf) => {
    if (!shelf.coordinates || !(bookId in shelf.coordinates)) return shelf;
    changed = true;
    const { [bookId]: released, ...rest } = shelf.coordinates;
    void released;
    return { ...shelf, coordinates: rest };
  });
  return changed ? next : shelves;
}
