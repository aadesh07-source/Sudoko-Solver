/**
 * Apply trace steps onto the givens grid up to cursor.
 * Givens are never modified.
 */
export function applyTrace(
  givens: number[][],
  trace: number[][],
  cursor: number
): number[][] {
  const grid = givens.map((row) => [...row]);
  const limit = Math.min(cursor, trace.length);

  for (let i = 0; i < limit; i++) {
    const [r, c, v] = trace[i];
    // Safeguard: givens cannot be overwritten
    if (givens[r][c] === 0) {
      grid[r][c] = v;
    }
  }

  return grid;
}

/**
 * Apply a single step in-place or returning updated grid,
 * guaranteeing givens remain untouched.
 */
export function applyStepToGrid(
  grid: number[][],
  givens: number[][],
  step: number[]
): number[][] {
  const [r, c, v] = step;
  if (givens[r][c] !== 0) return grid;

  const next = grid.map((row) => [...row]);
  next[r][c] = v;
  return next;
}
