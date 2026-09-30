import React from 'react';

export const Header: React.FC = () => {
  return (
    <header className="site-header">
      <div className="wordmark">Analysis of Algorithms · Sudoku Solver</div>
      <h1 className="display-headline">Solve it by trying, failing, and trying again.</h1>
      <p className="sub-headline">Watch backtracking fill the board, one decision at a time.</p>
    </header>
  );
};
