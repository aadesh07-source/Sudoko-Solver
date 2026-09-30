import React from 'react';
import { useSudokuStore } from '../state/store';

export const MetricsPanel: React.FC = () => {
  const stats = useSudokuStore((s) => s.stats);
  const givens = useSudokuStore((s) => s.givens);

  const emptyCellsCount = stats
    ? stats.empty_cells
    : givens.reduce((acc, row) => acc + row.filter((v) => v === 0).length, 0);

  return (
    <section className="metrics-section" aria-label="Algorithm performance metrics">
      <div className="metrics-heading">Algorithm Metrics</div>
      <div className="metrics-grid">
        <div className="metric-card">
          <span className="metric-label">Recursive Calls</span>
          <span className="metric-value">
            {stats ? stats.calls.toLocaleString() : '—'}
          </span>
          <span className="metric-meta">DFS calls made</span>
        </div>

        <div className="metric-card">
          <span className="metric-label">Placements</span>
          <span className="metric-value">
            {stats ? stats.placements.toLocaleString() : '—'}
          </span>
          <span className="metric-meta">Digits tested</span>
        </div>

        <div className="metric-card">
          <span className="metric-label">Backtracks</span>
          <span className="metric-value">
            {stats ? stats.backtracks.toLocaleString() : '—'}
          </span>
          <span className="metric-meta">Dead ends pruned</span>
        </div>

        <div className="metric-card">
          <span className="metric-label">Time Elapsed</span>
          <span className="metric-value">
            {stats ? `${stats.elapsed_ms.toFixed(1)} ms` : '—'}
          </span>
          <span className="metric-meta">Solver runtime</span>
        </div>

        <div className="metric-card">
          <span className="metric-label">Empty Cells</span>
          <span className="metric-value">{emptyCellsCount}</span>
          <span className="metric-meta">To be filled</span>
        </div>
      </div>
    </section>
  );
};
