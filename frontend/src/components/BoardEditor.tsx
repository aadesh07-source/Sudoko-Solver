import React, { useEffect, useRef } from 'react';
import { useSudokuStore } from '../state/store';

export const BoardEditor: React.FC = () => {
  const givens = useSudokuStore((s) => s.givens);
  const grid = useSudokuStore((s) => s.grid);
  const conflicts = useSudokuStore((s) => s.conflicts);
  const selected = useSudokuStore((s) => s.selected);
  const lastStep = useSudokuStore((s) => s.lastStep);
  const setSelected = useSudokuStore((s) => s.setSelected);
  const setCell = useSudokuStore((s) => s.setCell);
  const solve = useSudokuStore((s) => s.solve);
  const phase = useSudokuStore((s) => s.phase);

  const gridRef = useRef<HTMLDivElement>(null);

  // Set of conflict keys "r,c"
  const conflictSet = new Set(conflicts.map(([r, c]) => `${r},${c}`));

  // Handle keyboard events
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!selected) return;
    const [r, c] = selected;

    if (e.key >= '1' && e.key <= '9') {
      e.preventDefault();
      setCell(r, c, parseInt(e.key, 10));
    } else if (e.key === '0' || e.key === 'Backspace' || e.key === 'Delete') {
      e.preventDefault();
      setCell(r, c, 0);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelected([Math.max(0, r - 1), c]);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelected([Math.min(8, r + 1), c]);
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      setSelected([r, Math.max(0, c - 1)]);
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      setSelected([r, Math.min(8, c + 1)]);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (phase !== 'solving') {
        solve();
      }
    }
  };

  // Focus selected cell element when selection changes
  useEffect(() => {
    if (selected && gridRef.current) {
      const cellElem = gridRef.current.querySelector(
        `[data-row="${selected[0]}"][data-col="${selected[1]}"]`
      ) as HTMLElement | null;
      if (cellElem && document.activeElement !== cellElem && gridRef.current.contains(document.activeElement)) {
        cellElem.focus();
      }
    }
  }, [selected]);

  return (
    <div
      className="grid-wrapper"
      ref={gridRef}
      onKeyDown={handleKeyDown}
      role="grid"
      aria-label="9 by 9 Sudoku board editor"
    >
      <div className="sudoku-grid">
        {Array.from({ length: 9 }).map((_, r) =>
          Array.from({ length: 9 }).map((_, c) => {
            const isSelected = selected && selected[0] === r && selected[1] === c;
            const isGiven = givens[r][c] !== 0;
            const isConflict = conflictSet.has(`${r},${c}`);
            const val = grid[r][c];
            const isPlaced = !isGiven && val !== 0;
            const isLast = lastStep && lastStep[0] === r && lastStep[1] === c;

            // Box borders
            const borderRight = c % 3 === 2 && c !== 8 ? 'border-right-box' : '';
            const borderBottom = r % 3 === 2 && r !== 8 ? 'border-bottom-box' : '';

            // Class list
            const classes = [
              'sudoku-cell',
              borderRight,
              borderBottom,
              isGiven ? 'cell-given' : '',
              isPlaced ? 'cell-placed' : '',
              isSelected ? 'cell-selected' : '',
              isConflict ? 'cell-conflict' : '',
              isLast ? 'cell-last-step' : '',
            ]
              .filter(Boolean)
              .join(' ');

            const labelValue = isGiven
              ? `given ${val}`
              : val !== 0
              ? `placed ${val}`
              : 'empty';

            const conflictNotice = isConflict ? ', conflict' : '';
            const ariaLabel = `Row ${r + 1}, column ${c + 1}, ${labelValue}${conflictNotice}`;

            return (
              <div
                key={`${r}-${c}`}
                className={classes}
                data-row={r}
                data-col={c}
                role="gridcell"
                tabIndex={isSelected ? 0 : -1}
                aria-label={ariaLabel}
                aria-selected={Boolean(isSelected)}
                onClick={() => setSelected([r, c])}
              >
                {val !== 0 ? val : ''}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
