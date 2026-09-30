import React from 'react';
import { useSudokuStore } from '../state/store';

export const Controls: React.FC = () => {
  const phase = useSudokuStore((s) => s.phase);
  const trace = useSudokuStore((s) => s.trace);
  const cursor = useSudokuStore((s) => s.cursor);
  const speed = useSudokuStore((s) => s.speed);
  const difficulty = useSudokuStore((s) => s.difficulty);
  const loadDifficulty = useSudokuStore((s) => s.loadDifficulty);
  const loadNewPuzzle = useSudokuStore((s) => s.loadNewPuzzle);
  const solve = useSudokuStore((s) => s.solve);
  const instantSolve = useSudokuStore((s) => s.instantSolve);
  const jumpToSolution = useSudokuStore((s) => s.jumpToSolution);
  const play = useSudokuStore((s) => s.play);
  const pause = useSudokuStore((s) => s.pause);
  const step = useSudokuStore((s) => s.step);
  const reset = useSudokuStore((s) => s.reset);
  const clear = useSudokuStore((s) => s.clear);
  const setSpeed = useSudokuStore((s) => s.setSpeed);

  // Convert speed (1 to 2000) to/from logarithmic slider (0 to 100)
  const minSpeed = 1;
  const maxSpeed = 2000;
  const minLog = Math.log10(minSpeed);
  const maxLog = Math.log10(maxSpeed);

  const sliderValue = Math.round(((Math.log10(Math.max(1, speed)) - minLog) / (maxLog - minLog)) * 100);

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    const calculatedSpeed = Math.round(Math.pow(10, minLog + (val / 100) * (maxLog - minLog)));
    setSpeed(calculatedSpeed);
  };

  const handleDropdownChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const diff = e.target.value;
    loadDifficulty(diff);
  };

  const isSolving = phase === 'solving';
  const hasTrace = trace.length > 0;
  const isPlaying = phase === 'playing';
  const canStep = hasTrace && cursor < trace.length && !isPlaying;
  const canJump = hasTrace && cursor < trace.length;

  return (
    <div className="controls-container">
      {/* Row 1: Dropdown arrow for modes, New Puzzle, Clear, Solve, Instant Solution */}
      <div className="controls-row">
        <select
          className="select-input"
          value={difficulty}
          onChange={handleDropdownChange}
          disabled={isSolving}
          aria-label="Select puzzle difficulty mode"
        >
          <option value="classic">Classic</option>
          <option value="medium">Medium</option>
          <option value="hard">Hard</option>
        </select>

        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => loadNewPuzzle()}
          disabled={isSolving}
          aria-label="Load a fresh puzzle in selected mode"
          title="Click to generate another different puzzle"
        >
          New Puzzle
        </button>

        <button
          type="button"
          className="btn btn-secondary"
          onClick={clear}
          disabled={isSolving}
          aria-label="Clear grid"
        >
          Clear
        </button>

        <button
          type="button"
          className="btn btn-primary"
          onClick={() => solve(true)}
          disabled={isSolving}
          aria-label="Solve puzzle and animate DFS backtracking"
        >
          {isSolving ? 'Solving...' : 'Solve'}
        </button>

        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => instantSolve()}
          disabled={isSolving}
          aria-label="Show solved numbers immediately"
        >
          Instant Solution
        </button>
      </div>

      {/* Row 2: Playback Controls */}
      <div className="controls-row">
        {isPlaying ? (
          <button
            type="button"
            className="btn btn-secondary"
            onClick={pause}
            aria-label="Pause replay"
          >
            Pause
          </button>
        ) : (
          <button
            type="button"
            className="btn btn-secondary"
            onClick={play}
            disabled={!hasTrace}
            aria-label="Play replay"
          >
            {cursor >= trace.length && trace.length > 0 ? 'Replay' : 'Play'}
          </button>
        )}

        <button
          type="button"
          className="btn btn-secondary"
          onClick={step}
          disabled={!canStep}
          aria-label="Step forward one decision"
        >
          Step
        </button>

        <button
          type="button"
          className="btn btn-secondary"
          onClick={reset}
          disabled={!hasTrace || cursor === 0}
          aria-label="Reset replay"
        >
          Reset
        </button>

        {canJump && (
          <button
            type="button"
            className="btn btn-secondary"
            onClick={jumpToSolution}
            aria-label="Jump directly to final solved state"
          >
            Jump to End
          </button>
        )}
      </div>

      {/* Row 3: Speed Slider */}
      <div className="slider-group">
        <span className="slider-label">Speed</span>
        <input
          type="range"
          min="0"
          max="100"
          value={sliderValue}
          onChange={handleSliderChange}
          className="speed-slider"
          aria-label="Replay speed in steps per second"
        />
        <span className="slider-val">{speed} step/s</span>
      </div>
    </div>
  );
};
