# PRD: Sudoku Solver (FastAPI + React + Three.js)

**Course:** Analysis of Algorithms
**Document type:** Product Requirements Document
**Version:** 2.0

---

## 1. Overview

A full-stack web application that takes an unsolved 9x9 Sudoku and solves it with the **Backtracking algorithm** (Depth-First Search with recursion).

- **Backend:** FastAPI (Python) runs the solver and exposes a small JSON API.
- **Frontend:** A minimalist React app with a 3D board built on the Three.js ecosystem. It does not just show the answer; it replays every decision the algorithm made, including each dead end and backtrack, so the behavior of the algorithm is visible.

The project serves two purposes: a correct implementation for the Analysis of Algorithms course, and a clear, memorable way to demonstrate and explain backtracking and its complexity.

## 2. Problem Statement

A Sudoku puzzle is a 9x9 grid partially filled with digits 1-9. Every row, every column, and each of the nine 3x3 boxes must contain the digits 1-9 exactly once.

Trying every possible filling is infeasible. Backtracking searches systematically and abandons a partial solution the moment it breaks a rule. Because this pruning is hard to appreciate from code alone, the product makes the search process visible.

## 3. Goals

| # | Goal |
|---|------|
| G1 | Correctly solve any valid, solvable 9x9 Sudoku. |
| G2 | Implement the solver strictly with Backtracking + Recursion (DFS). |
| G3 | Detect and report invalid or unsolvable puzzles clearly. |
| G4 | Return metrics (recursive calls, placements, backtracks, time) to support the complexity analysis. |
| G5 | Provide a minimalist, bold, optimistic web interface where the search is animated in 3D. |
| G6 | Keep the code clean enough to explain in a viva or presentation. |

## 4. Non-Goals

- No puzzle generator or difficulty rating.
- No advanced solving techniques in the core solver (constraint propagation, Dancing Links). They are listed as future work only.
- No user accounts, database, or saved history.
- No grid sizes other than 9x9.
- No native mobile app (the web app must simply work well on phones).

## 5. Target Users

- **Primary:** The student (author) submitting the project.
- **Secondary:** The instructor evaluating correctness, algorithm design, and complexity analysis.
- **Tertiary:** Anyone who wants to see how backtracking works.

## 6. User Stories

1. As a user, I can type or load a puzzle into a clean grid.
2. As a user, I can press one button and get the solved grid.
3. As a user, I can watch the algorithm place digits and undo them, at a speed I control.
4. As a user, I can pause, step forward, and reset the replay.
5. As a user, I see invalid cells highlighted if my puzzle has conflicts.
6. As a user, I am told clearly if the puzzle has no solution.
7. As a student, I can read the number of recursive calls, placements, backtracks, and the time taken.
8. As a student, I can load sample puzzles (easy, medium, hard) to compare metrics.

## 7. Product Experience and Design Direction

### 7.1 Principles

| Principle | Meaning |
|-----------|---------|
| Minimalist | One screen, one job. Few controls, generous space, no decoration that does not carry meaning. |
| Optimistic | Warm paper-toned background, sunny yellow accent, encouraging copy. Failure states (backtracking) are shown as a normal, healthy part of the search, not as errors. |
| Decent | Calm motion, readable type, high contrast, polite copy. Nothing flashy or noisy. |
| Bold | Oversized headline type, thick ink outlines, hard offset shadows, strong color blocking. |
| Unique | The board is a physical object: 81 chunky tiles that rise when a digit is placed and drop when it is undone. |

### 7.2 Hard rules

- **No emojis anywhere:** not in the UI, copy, code comments, logs, commit messages, or documentation.
- Icons, if needed, are simple inline SVG shapes. Most controls use plain text labels.
- The 3D scene is supportive, never required: every action must also work through the flat 2D grid.

### 7.3 Signature interaction

The **Replay**: after solving, tiles rise and turn sun-yellow as digits are placed, and drop with a brief coral flash when the algorithm backtracks. When the last digit lands, a soft green ripple crosses the board from corner to corner.

### 7.4 Tone of copy

Short, warm, and confident. Examples:

- Headline: "Solve it by trying, failing, and trying again."
- Sub-line: "Watch backtracking fill the board, one decision at a time."
- Backtrack note: "Dead end. Stepping back."
- Success: "Solved in 4,208 steps."
- No solution: "No solution exists for this puzzle. Check the givens and try again."

## 8. Functional Requirements

### 8.1 Backend

| ID | Requirement | Priority |
|----|-------------|----------|
| FB1 | `POST /api/solve` accepts a 9x9 board (0 = empty) and returns the solution and metrics. | Must |
| FB2 | Validate shape (9x9), value range (0-9), and initial conflicts; return a structured error listing conflicting cells. | Must |
| FB3 | Solver uses backtracking: find empty cell, try 1-9, check row/column/box, place, recurse, undo on failure. | Must |
| FB4 | Return `solved: false` (HTTP 200) for a well-formed but unsolvable puzzle. | Must |
| FB5 | Optionally return the step trace (list of placements and removals) for replay, with a configurable cap and a truncation flag. | Must |
| FB6 | Enforce safety limits (maximum calls and time limit) and return a clear error when exceeded. | Should |
| FB7 | `GET /api/samples` returns named sample puzzles. | Should |
| FB8 | `GET /api/health` returns service status. | Should |
| FB9 | CORS configured for the frontend origin. | Must |
| FB10 | Auto-generated interactive API docs at `/docs`. | Should |

### 8.2 Frontend

| ID | Requirement | Priority |
|----|-------------|----------|
| FF1 | 2D editable 9x9 grid with keyboard input (digits, arrows, backspace/delete). | Must |
| FF2 | Given digits are visually distinct from digits placed by the solver. | Must |
| FF3 | Solve button calls the API and shows loading, success, unsolvable, and error states. | Must |
| FF4 | 3D board (Three.js via React Three Fiber) that mirrors the grid state. | Must |
| FF5 | Replay controls: play, pause, step, reset, and speed slider. | Must |
| FF6 | Tile motion: rise and yellow on placement, drop and coral flash on backtrack, green ripple on completion. | Must |
| FF7 | Metrics panel: calls, placements, backtracks, time, empty cells. | Must |
| FF8 | Conflict highlighting in the editor and clear inline messages. | Must |
| FF9 | Sample puzzle picker and a Clear button. | Should |
| FF10 | Orbit camera limited to a pleasant range (no full flips); gentle damping. | Should |
| FF11 | Graceful fallback to the 2D grid if WebGL is unavailable. | Must |
| FF12 | Respect `prefers-reduced-motion` by skipping animation and jumping to the result. | Must |
| FF13 | Complexity note displayed in the footer: Time O(9^n), Space O(n). | Should |

## 9. Non-Functional Requirements

| ID | Requirement |
|----|-------------|
| NFR1 | **Correctness:** Output satisfies all Sudoku rules and preserves the givens. |
| NFR2 | **Backend performance:** Typical puzzles solve in under 1 second; hard puzzles within the 10 second limit. |
| NFR3 | **Frontend performance:** 60 fps target for the 3D scene on a mid-range laptop; instanced rendering; device pixel ratio capped at 2. |
| NFR4 | **Bundle size:** The 3D scene is code-split and lazy-loaded; initial page interactive before Three.js finishes loading. |
| NFR5 | **Accessibility:** Keyboard-operable, visible focus, ARIA labels on cells, text contrast at WCAG AA or better, status changes announced via a live region. |
| NFR6 | **Responsiveness:** Usable from 360 px wide phones to large desktops. |
| NFR7 | **Determinism:** The same input always produces the same solution, metrics, and trace. |
| NFR8 | **Readability:** Small, named functions with brief comments on both sides of the stack. |
| NFR9 | **Portability:** Runs locally with Python 3.10+ and Node 18+; no external services or paid APIs. |
| NFR10 | **Space:** Solver uses O(n) extra space for the recursion stack (n = empty cells), excluding the board and the optional trace. |

## 10. Algorithm Summary

**Approach:** Backtracking with Depth-First Search.

1. Find an empty cell.
2. Try numbers 1 to 9.
3. Check the number is not already in the same row, column, or 3x3 box.
4. If valid, place it.
5. Recursively solve the remaining puzzle.
6. If that fails, remove the number (backtrack) and try the next one.
7. Stop when the grid is full (success) or every option is exhausted (failure).

**Complexity**

| Measure | Value |
|---------|-------|
| Time (worst case) | O(9^n), n = number of empty cells |
| Space | O(n) for the recursion stack, excluding the board |

The bound is loose: validity checks prune most branches early, so real running time is far lower.

## 11. Technology Choices

| Layer | Choice | Reason |
|-------|--------|--------|
| Backend (Python) | Python 3.10+, FastAPI, Pydantic v2, Uvicorn | Project language; the backtracking solver lives here; typed validation and free API docs. |
| Frontend framework | React 18 with Vite | Fast setup, minimal boilerplate. |
| 3D | Three.js, React Three Fiber, Drei | The Three.js ecosystem; declarative 3D inside React. |
| State | Zustand | Tiny, simple store shared by the 2D and 3D views. |
| Styling | Plain CSS with design tokens | Minimal dependencies and full control over the bold look. |
| Fonts | Space Grotesk (display and body), JetBrains Mono (numerals), self-hosted | Distinct, legible, no external requests. |
| Testing | Pytest (backend), Vitest (frontend) | Standard tools for each side. |

## 12. Success Criteria

- The standard sample puzzle is solved and matches the known solution.
- A hard puzzle is solved within the time limit and shows its metrics.
- Invalid input highlights the conflicting cells and shows a clear message.
- An unsolvable puzzle produces the "no solution" message.
- The replay shows placements and backtracks correctly and ends on the exact solution.
- The interface works with mouse, touch, and keyboard.
- A repository-wide check finds no emoji characters in source or docs.
- Lighthouse accessibility score of 90 or higher on the main page.

## 13. Assumptions

- "Three.js frameworks" is interpreted as the Three.js ecosystem: `three`, `@react-three/fiber`, and `@react-three/drei`.
- **Python is the project language.** The solver, API, validation, and backend tests are all written in Python 3.10+.
- The browser UI cannot run Python, so the React frontend is written in TypeScript (plain JavaScript is an acceptable substitute). It contains presentation and playback logic only; no algorithm code lives in the frontend.
- Only a single light theme is required (dark theme is future work).
- Puzzles may have multiple solutions; the solver returns the first one found in its deterministic search order.
- The app runs locally (frontend on port 5173, backend on port 8000); deployment is out of scope.

## 14. Risks and Mitigations

| Risk | Mitigation |
|------|------------|
| Hard puzzles produce huge traces. | Cap trace length (default 20,000 steps), flag truncation, and jump to the exact solution at the end of playback. |
| Solver blocks the server on pathological input. | Call and time limits; sync endpoint runs in FastAPI's worker thread pool. |
| 3D looks cluttered or slows weaker devices. | Instanced meshes, no heavy post-processing, capped pixel ratio, on-demand rendering when idle. |
| Bold styling reduces readability. | Contrast checks on every color pair; body text always ink on paper. |
| WebGL unavailable. | 2D grid remains fully functional. |
| CORS errors in development. | Vite dev proxy plus explicit CORS origins on the backend. |

## 15. Deliverables

1. Backend source (FastAPI app, solver, tests).
2. Frontend source (React app, 3D scene, tests).
3. `PRD.md` and `SPECS.md`.
4. Sample puzzles and recorded metrics for the report.
5. Short complexity analysis for the course report.
6. README with run instructions.

## 16. Future Enhancements (Out of Scope)

- Minimum Remaining Values heuristic, bitmask checks, forward checking, and constraint propagation, with a side-by-side metrics comparison.
- Dark theme.
- Puzzle import from an image.
- Shareable puzzle links.
- Chart comparing backtracks across strategies.