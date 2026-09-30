import React from 'react';
import { useSudokuStore } from '../state/store';

export const StatusLine: React.FC = () => {
  const message = useSudokuStore((s) => s.message);
  const phase = useSudokuStore((s) => s.phase);

  const isError = phase === 'error' || phase === 'unsolvable';
  const isDone = phase === 'done';

  const statusClass = `status-line ${isError ? 'error' : isDone ? 'done' : ''}`.trim();

  return (
    <div className={statusClass} role="status" aria-live="polite">
      <span>{message}</span>
    </div>
  );
};
