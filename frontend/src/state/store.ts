import { create } from 'zustand';
import { solve as apiSolve, fetchRandomPuzzle } from '../api/client';
import type { Stats } from '../api/client';
import { applyTrace } from '../playback/applyTrace';

export type Phase =
  | 'editing'
  | 'solving'
  | 'ready'
  | 'playing'
  | 'paused'
  | 'done'
  | 'unsolvable'
  | 'error';

const INITIAL_BOARD = [
  [5, 3, 0, 0, 7, 0, 0, 0, 0],
  [6, 0, 0, 1, 9, 5, 0, 0, 0],
  [0, 9, 8, 0, 0, 0, 0, 6, 0],
  [8, 0, 0, 0, 6, 0, 0, 0, 3],
  [4, 0, 0, 8, 0, 3, 0, 0, 1],
  [7, 0, 0, 0, 2, 0, 0, 0, 6],
  [0, 6, 0, 0, 0, 0, 2, 8, 0],
  [0, 0, 0, 4, 1, 9, 0, 0, 5],
  [0, 0, 0, 0, 8, 0, 0, 7, 9],
];

export interface SudokuState {
  givens: number[][];
  grid: number[][];
  solution: number[][] | null;
  trace: number[][];
  truncated: boolean;
  cursor: number;
  lastStep: number[] | null;
  speed: number;
  stats: Stats | null;
  conflicts: number[][];
  phase: Phase;
  message: string;
  selected: [number, number] | null;
  difficulty: string;

  setCell: (r: number, c: number, v: number) => void;
  clear: () => void;
  loadSample: (board: number[][]) => void;
  loadDifficulty: (diff: string) => Promise<void>;
  loadNewPuzzle: () => Promise<void>;
  solve: (autoPlay?: boolean) => Promise<void>;
  instantSolve: () => Promise<void>;
  jumpToSolution: () => void;
  play: () => void;
  pause: () => void;
  step: () => void;
  reset: () => void;
  setSpeed: (s: number) => void;
  setSelected: (cell: [number, number] | null) => void;
  applyStepsBatch: (count: number) => void;
}

const copyBoard = (b: number[][]): number[][] => b.map((row) => [...row]);

export const useSudokuStore = create<SudokuState>((set, get) => ({
  givens: copyBoard(INITIAL_BOARD),
  grid: copyBoard(INITIAL_BOARD),
  solution: null,
  trace: [],
  truncated: false,
  cursor: 0,
  lastStep: null,
  speed: 250, // default to 250 steps per second for lively backtracking action
  stats: null,
  conflicts: [],
  phase: 'editing',
  message: 'Press Solve & Animate to watch backtracking DFS, or Instant Solution to fill immediately.',
  selected: [0, 0],
  difficulty: 'classic',

  setCell: (r: number, c: number, v: number) => {
    const { givens, conflicts } = get();
    const newGivens = copyBoard(givens);
    newGivens[r][c] = v;

    // Reset replay when board is modified
    set({
      givens: newGivens,
      grid: copyBoard(newGivens),
      solution: null,
      trace: [],
      truncated: false,
      cursor: 0,
      lastStep: null,
      stats: null,
      phase: 'editing',
      conflicts: conflicts.length > 0 ? [] : conflicts,
      message: 'Editing puzzle.',
    });
  },

  clear: () => {
    const empty = Array.from({ length: 9 }, () => Array(9).fill(0));
    set({
      givens: empty,
      grid: copyBoard(empty),
      solution: null,
      trace: [],
      truncated: false,
      cursor: 0,
      lastStep: null,
      stats: null,
      conflicts: [],
      phase: 'editing',
      message: 'Board cleared.',
    });
  },

  loadSample: (board: number[][]) => {
    set({
      givens: copyBoard(board),
      grid: copyBoard(board),
      solution: null,
      trace: [],
      truncated: false,
      cursor: 0,
      lastStep: null,
      stats: null,
      conflicts: [],
      phase: 'editing',
      message: 'Sample puzzle loaded.',
    });
  },

  loadDifficulty: async (diff: string) => {
    const d = diff.toLowerCase();
    set({ difficulty: d, message: `Loading new ${d} puzzle...` });
    try {
      const puzzle = await fetchRandomPuzzle(d);
      set({
        givens: copyBoard(puzzle.board),
        grid: copyBoard(puzzle.board),
        solution: null,
        trace: [],
        truncated: false,
        cursor: 0,
        lastStep: null,
        stats: null,
        conflicts: [],
        phase: 'editing',
        message: `New ${puzzle.name} puzzle loaded. Ready to solve.`,
      });
    } catch {
      // Graceful offline fallback with random digit permutation
      const current = get().givens;
      const perm = [1, 2, 3, 4, 5, 6, 7, 8, 9].sort(() => Math.random() - 0.5);
      const mapping: Record<number, number> = { 0: 0 };
      for (let i = 1; i <= 9; i++) mapping[i] = perm[i - 1];
      const randomized = current.map((row) => row.map((v) => mapping[v] ?? 0));
      set({
        givens: copyBoard(randomized),
        grid: copyBoard(randomized),
        solution: null,
        trace: [],
        truncated: false,
        cursor: 0,
        lastStep: null,
        stats: null,
        conflicts: [],
        phase: 'editing',
        message: `New ${d} puzzle loaded.`,
      });
    }
  },

  loadNewPuzzle: async () => {
    const { difficulty } = get();
    await get().loadDifficulty(difficulty);
  },

  solve: async (autoPlay: boolean = true) => {
    const { givens } = get();
    set({ phase: 'solving', message: 'Solving with Depth-First Search backtracking...', conflicts: [] });

    try {
      const data = await apiSolve(givens);

      if (!data.solved) {
        set({
          phase: 'unsolvable',
          solution: null,
          stats: data.stats,
          trace: [],
          message: 'No solution exists for this puzzle. Check the givens and try again.',
        });
        return;
      }

      const reducedMotion =
        typeof window !== 'undefined' &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches;

      if (reducedMotion || !autoPlay) {
        set({
          solution: data.solution,
          grid: copyBoard(data.solution!),
          stats: data.stats,
          trace: data.trace ?? [],
          truncated: data.trace_truncated,
          cursor: (data.trace ?? []).length,
          lastStep: null,
          phase: 'done',
          message: `Solved in ${data.stats.calls.toLocaleString()} calls (${data.stats.elapsed_ms.toFixed(1)} ms).`,
        });
        return;
      }

      // Auto-play the backtracking replay immediately so digits animate on screen
      set({
        solution: data.solution,
        stats: data.stats,
        trace: data.trace ?? [],
        truncated: data.trace_truncated,
        cursor: 0,
        lastStep: null,
        phase: 'playing',
        message: `Solved in ${data.stats.calls.toLocaleString()} calls. Replaying backtracking search...`,
      });
    } catch (err: any) {
      if (err?.status === 422) {
        const detail = err.detail;
        if (detail?.code === 'INVALID_PUZZLE' && detail.conflicts) {
          set({
            phase: 'error',
            conflicts: detail.conflicts,
            message: 'Two matching digits share a row, column, or box.',
          });
          return;
        }
        set({
          phase: 'error',
          message: 'Invalid puzzle input. Ensure all values are 0-9.',
        });
        return;
      }

      if (err?.status === 408) {
        set({
          phase: 'error',
          message: 'This puzzle took too long to search. Try a different one.',
        });
        return;
      }

      set({
        phase: 'error',
        message: 'Cannot reach the solver. Is the backend running?',
      });
    }
  },

  instantSolve: async () => {
    const { solution, trace } = get();
    if (solution) {
      set({
        grid: copyBoard(solution),
        cursor: trace.length,
        lastStep: null,
        phase: 'done',
        message: 'Showing completed solution.',
      });
      return;
    }
    await get().solve(false);
  },

  jumpToSolution: () => {
    const { solution, trace } = get();
    if (solution) {
      set({
        grid: copyBoard(solution),
        cursor: trace.length,
        lastStep: null,
        phase: 'done',
        message: 'Replay jumped to completed solution.',
      });
    }
  },

  play: () => {
    const { phase, cursor, trace, givens } = get();
    if (phase === 'playing') return;

    if (cursor >= trace.length && trace.length > 0) {
      set({
        cursor: 0,
        grid: copyBoard(givens),
        lastStep: null,
        phase: 'playing',
        message: 'Replaying backtracking search...',
      });
      return;
    }

    set({ phase: 'playing', message: 'Replaying backtracking search...' });
  },

  pause: () => {
    set({ phase: 'paused', message: 'Replay paused.' });
  },

  step: () => {
    const { givens, trace, cursor, solution, truncated } = get();
    if (cursor >= trace.length) return;

    const nextCursor = cursor + 1;
    const currentStep = trace[cursor];
    const newGrid = applyTrace(givens, trace, nextCursor);

    if (nextCursor === trace.length) {
      if (truncated && solution) {
        set({
          cursor: nextCursor,
          grid: copyBoard(solution),
          lastStep: currentStep,
          phase: 'done',
          message: `Replay reached cap (${trace.length.toLocaleString()} steps). Showing final solution.`,
        });
      } else {
        set({
          cursor: nextCursor,
          grid: newGrid,
          lastStep: currentStep,
          phase: 'done',
          message: 'Replay complete. Solved.',
        });
      }
    } else {
      const isBacktrack = currentStep[2] === 0;
      set({
        cursor: nextCursor,
        grid: newGrid,
        lastStep: currentStep,
        phase: 'paused',
        message: isBacktrack
          ? `Backtrack at row ${currentStep[0] + 1}, column ${currentStep[1] + 1}.`
          : `Placed ${currentStep[2]} at row ${currentStep[0] + 1}, column ${currentStep[1] + 1}.`,
      });
    }
  },

  reset: () => {
    const { givens } = get();
    set({
      cursor: 0,
      grid: copyBoard(givens),
      lastStep: null,
      phase: 'ready',
      message: 'Replay reset to start.',
    });
  },

  setSpeed: (s: number) => {
    set({ speed: s });
  },

  setSelected: (cell: [number, number] | null) => {
    set({ selected: cell });
  },

  applyStepsBatch: (count: number) => {
    const { givens, trace, cursor, solution, truncated } = get();
    const nextCursor = Math.min(cursor + count, trace.length);
    if (nextCursor === cursor) return;

    const newGrid = applyTrace(givens, trace, nextCursor);
    const lastStep = trace[nextCursor - 1] ?? null;

    if (nextCursor === trace.length) {
      if (truncated && solution) {
        set({
          cursor: nextCursor,
          grid: copyBoard(solution),
          lastStep,
          phase: 'done',
          message: `Replay reached cap (${trace.length.toLocaleString()} steps). Showing final solution.`,
        });
      } else {
        set({
          cursor: nextCursor,
          grid: newGrid,
          lastStep,
          phase: 'done',
          message: 'Replay complete. Solved.',
        });
      }
    } else {
      set({
        cursor: nextCursor,
        grid: newGrid,
        lastStep,
      });
    }
  },
}));
