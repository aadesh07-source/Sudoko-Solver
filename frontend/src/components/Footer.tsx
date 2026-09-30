import React from 'react';

export const Footer: React.FC = () => {
  return (
    <footer className="site-footer">
      <div>
        <span>Analysis of Algorithms: Depth-First Search with Recursion and Backtracking.</span>
      </div>
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
        <span>Worst-case Complexity:</span>
        <span className="complexity-pill">Time O(9ⁿ)</span>
        <span className="complexity-pill">Space O(n)</span>
      </div>
    </footer>
  );
};
