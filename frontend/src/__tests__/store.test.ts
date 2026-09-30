import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useSudokuStore } from '../state/store';
import * as client from '../api/client';

describe('Sudoku Store State Transitions', () => {
  beforeEach(() => {
    useSudokuStore.getState().clear();
  });

  it('F3: Editing after solve clears trace and resets phase to editing', () => {
    useSudokuStore.setState({
      phase: 'ready',
      trace: [[0, 0, 1], [0, 0, 0]],
      solution: Array.from({ length: 9 }, () => Array(9).fill(1)),
    });

    useSudokuStore.getState().setCell(0, 0, 5);

    const state = useSudokuStore.getState();
    expect(state.phase).toBe('editing');
    expect(state.trace).toEqual([]);
    expect(state.solution).toBeNull();
    expect(state.givens[0][0]).toBe(5);
    expect(state.grid[0][0]).toBe(5);
  });

  it('F7: Reduced motion skips replay and shows solution immediately', async () => {
    const fakeSolution = Array.from({ length: 9 }, () => Array(9).fill(1));
    const fakeTrace = [[0, 0, 1], [0, 1, 2]];

    vi.spyOn(client, 'solve').mockResolvedValueOnce({
      solved: true,
      solution: fakeSolution,
      stats: { calls: 10, placements: 5, backtracks: 2, elapsed_ms: 1.2, empty_cells: 81 },
      trace: fakeTrace,
      trace_truncated: false,
    });

    // Mock matchMedia for prefers-reduced-motion
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: query.includes('prefers-reduced-motion: reduce'),
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));

    await useSudokuStore.getState().solve();

    const state = useSudokuStore.getState();
    expect(state.phase).toBe('done');
    expect(state.grid).toEqual(fakeSolution);
    expect(state.cursor).toBe(fakeTrace.length);
  });
});
