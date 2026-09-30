import { describe, it, expect } from 'vitest';
import { applyTrace } from '../playback/applyTrace';
import { useSudokuStore } from '../state/store';

describe('Playback Engine', () => {
  it('F1: applyTrace with place then remove returns grid to previous state', () => {
    const givens = Array.from({ length: 9 }, () => Array(9).fill(0));
    const trace = [
      [0, 2, 4], // place 4
      [0, 2, 0], // backtrack / remove
    ];

    const afterPlace = applyTrace(givens, trace, 1);
    expect(afterPlace[0][2]).toBe(4);

    const afterRemove = applyTrace(givens, trace, 2);
    expect(afterRemove[0][2]).toBe(0);
  });

  it('F2: applyTrace never modifies given cells', () => {
    const givens = Array.from({ length: 9 }, () => Array(9).fill(0));
    givens[0][0] = 5;

    const trace = [
      [0, 0, 9], // malicious or invalid step targeting a given cell
      [0, 1, 3],
    ];

    const grid = applyTrace(givens, trace, 2);
    expect(grid[0][0]).toBe(5);
    expect(grid[0][1]).toBe(3);
  });

  it('F6: Truncated trace sets grid to solution and explains truncation', () => {
    const givens = Array.from({ length: 9 }, () => Array(9).fill(0));
    const solution = Array.from({ length: 9 }, () => Array(9).fill(9));
    const trace = [[0, 0, 1]];

    useSudokuStore.setState({
      givens,
      grid: givens,
      solution,
      trace,
      truncated: true,
      cursor: 0,
      phase: 'playing',
      message: '',
    });

    useSudokuStore.getState().applyStepsBatch(1);

    const state = useSudokuStore.getState();
    expect(state.phase).toBe('done');
    expect(state.grid).toEqual(solution);
    expect(state.message).toContain('Replay reached cap');
  });
});
