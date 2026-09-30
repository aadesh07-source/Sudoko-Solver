import { describe, it, expect, beforeEach } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { BoardEditor } from '../components/BoardEditor';
import { useSudokuStore } from '../state/store';

describe('BoardEditor Component', () => {
  beforeEach(() => {
    useSudokuStore.getState().clear();
  });

  it('F4: Keyboard input sets digits, backspace clears, arrows move selection', () => {
    const { container } = render(<BoardEditor />);
    const grid = container.querySelector('[role="grid"]')!;

    // Select row 0, col 0
    useSudokuStore.getState().setSelected([0, 0]);

    // Press '7'
    fireEvent.keyDown(grid, { key: '7' });
    expect(useSudokuStore.getState().grid[0][0]).toBe(7);

    // Arrow Right -> moves to [0, 1]
    fireEvent.keyDown(grid, { key: 'ArrowRight' });
    expect(useSudokuStore.getState().selected).toEqual([0, 1]);

    // Press '3'
    fireEvent.keyDown(grid, { key: '3' });
    expect(useSudokuStore.getState().grid[0][1]).toBe(3);

    // Press Backspace
    fireEvent.keyDown(grid, { key: 'Backspace' });
    expect(useSudokuStore.getState().grid[0][1]).toBe(0);
  });

  it('F5: Conflict styling applies cell-conflict class to conflicting cells', () => {
    useSudokuStore.setState({
      conflicts: [[0, 0], [0, 5]],
    });

    const { container } = render(<BoardEditor />);
    const conflictCell0 = container.querySelector('[data-row="0"][data-col="0"]');
    const conflictCell5 = container.querySelector('[data-row="0"][data-col="5"]');
    const normalCell = container.querySelector('[data-row="0"][data-col="1"]');

    expect(conflictCell0?.classList.contains('cell-conflict')).toBe(true);
    expect(conflictCell5?.classList.contains('cell-conflict')).toBe(true);
    expect(normalCell?.classList.contains('cell-conflict')).toBe(false);
  });
});
