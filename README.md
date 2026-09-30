# Sudoku Solver (FastAPI + React + Three.js)

**Course:** Analysis of Algorithms  
**Project:** Depth-First Search with Recursion and Backtracking  
**Version:** 2.0  

---

## 1. Overview

An end-to-end full-stack web application designed for the Analysis of Algorithms curriculum. The application demonstrates how the classic **Backtracking algorithm** solves any solvable 9x9 Sudoku puzzle by exploring the decision tree via Depth-First Search (DFS).

Unlike conventional solvers that only output the final answer, this system records and streams the decision trace:
- **Digits placed** (branches explored)
- **Digits removed** (dead ends encountered and pruned)
- **Metrics** (total recursive calls, placement decisions, backtracks, wall-clock time)

The frontend offers both an accessible 2D interactive board editor and a 3D visualization constructed with Three.js, React Three Fiber, and Drei.

---

## 2. Algorithm and Complexity Analysis

### 2.1 The Backtracking Approach

Backtracking solves constraint satisfaction problems by incrementally building candidates toward a solution and abandoning a candidate ("backtracking") as soon as it determines that the candidate cannot lead to a valid solution.

1. **Find an empty cell:** Scan the 9x9 board row by row for an unassigned cell (value `0`). If no empty cell remains, the board is solved.
2. **Try candidates 1 through 9:** For each candidate digit:
   - Check if the digit is valid (it does not already exist in the same row, column, or 3x3 subgrid).
   - If valid, assign the digit to the cell, increment placement metrics, and record the step in the trace.
   - Recursively call `solve()` on the new board state.
   - If the recursive call returns `True`, return `True` (propagate success up the call stack).
   - If the recursive call returns `False`, undo the placement (set cell back to `0`), increment backtrack metrics, record the backtrack step, and continue to the next candidate.
3. **Exhaustion:** If all digits 1 through 9 have been tested without success, return `False` to signal a dead end to the parent caller.

### 2.2 Complexity Analysis

Let $n$ denote the number of empty cells on the board ($0 \le n \le 81$).

#### Time Complexity: $O(9^n)$
- In the unconstrained worst case, each empty cell branches into 9 choices, leading to a decision tree of depth $n$ and $9^n$ leaves.
- At each node, row, column, and box validity checks take $O(1)$ constant time (checking at most 27 cells in a fixed 9x9 grid).
- Hence, the worst-case recurrence is:
  $$T(n) \le 9 \cdot T(n - 1) + O(1) \implies T(n) = O(9^n)$$
- **Pruning Effect:** Because validity checks prune impossible branches almost immediately, real running times are orders of magnitude lower (typically under 30 ms for standard puzzles).

#### Space Complexity: $O(n)$
- The maximum depth of the recursion stack is bounded by the number of empty cells $n \le 81$.
- Auxiliary memory per stack frame is $O(1)$.
- Thus, the recursion stack requires $O(n)$ space, excluding the board and the optional trace buffer.

---

## 3. Architecture and Tech Stack

```
+------------------------------------+        HTTP / JSON        +-----------------------------------+
|  Frontend (Vite, React 18, TS)     |  ---------------------->  |  Backend (FastAPI, Python 3.10+)  |
|                                    |    POST /api/solve        |                                   |
|  - BoardEditor (2D HTML grid)      |    GET  /api/samples      |  - validation.py (conflict check) |
|  - Zustand Store                   |  <----------------------  |  - solver.py (backtracking DFS)   |
|  - Playback Engine (rAF loop)      |    solution, stats, trace |  - routes.py & schemas.py         |
|  - 3D Stage (R3F, Drei, Three.js)  |                           |                                   |
+------------------------------------+                           +-----------------------------------+
```

- **Backend:** Python 3.10+, FastAPI, Pydantic v2, Uvicorn, Pytest, HTTPX.
- **Frontend:** React 18, TypeScript, Vite, Three.js, React Three Fiber, React Three Drei, Zustand.
- **Styling:** Vanilla CSS design tokens (`tokens.css`, `global.css`), Space Grotesk and JetBrains Mono typography.

---

## 4. Getting Started

### 4.1 Prerequisites
- Python 3.10 or higher
- Node.js 18 or higher

### 4.2 Backend Setup and Run

```bash
cd backend
# Create virtual environment
python -m venv .venv

# Activate virtual environment
# Windows:
.\.venv\Scripts\activate
# Linux/macOS:
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Run the API server
uvicorn app.main:app --reload --port 8000
```
- API Health: `http://localhost:8000/api/health`
- Interactive OpenAPI Docs: `http://localhost:8000/docs`

### 4.3 Frontend Setup and Run

In a separate terminal:

```bash
cd frontend
# Install dependencies
npm install

# Start development server
npm run dev
```
Open `http://localhost:5173` in your browser.

---

## 5. Running the Tests

### 5.1 Backend Tests (Pytest)

Run from `backend` with the virtual environment activated:

```bash
cd backend
.\.venv\Scripts\pytest -v
```

Covers all 18 test cases including classic puzzle resolution, already-solved boards, single blanks, empty boards, unsolvable boards, conflict validation (422), parameter validation, trace truncation, determinism, and replay correctness.

### 5.2 Frontend Tests (Vitest)

Run from `frontend`:

```bash
cd frontend
npm test
```

Covers trace application, given immutability, state transitions, keyboard navigation, conflict styling, trace truncation, and reduced-motion preference.

### 5.3 Emoji Compliance Verification

To verify that the entire codebase and documentation remain completely emoji-free:

```bash
python tools/check_emoji.py
```

---

## 6. Viva and Presentation Talking Points

1. **Why Backtracking instead of Brute Force?**  
   Brute-force testing of $9^{81} \approx 1.96 \times 10^{77}$ combinations is physically impossible. Backtracking prunes subtrees the instant a candidate violates Sudoku constraints, reducing the search space to thousands of operations.

2. **How does the replay work without storing full board copies?**  
   The backend returns an ordered step trace `[row, col, value]`. Value `1-9` indicates a digit placement, and `0` indicates a backtrack. The frontend replays these steps from the original givens in $O(k)$ time using a dedicated `requestAnimationFrame` engine with logarithmic speed scaling (1 to 2000 steps/sec).

3. **How are givens protected?**  
   Both the backend validation and the frontend store strictly isolate user givens. The replay engine rejects any modification targeting a given cell.

4. **Why is the 3D scene code-split?**  
   The 3D stage (`Stage.tsx`) is loaded via `React.lazy` and `Suspense`, ensuring the core 2D application and its accessibility tree are interactive almost immediately. If WebGL is unavailable, an error boundary seamlessly provides a graceful fallback while the 2D grid remains fully operational.
