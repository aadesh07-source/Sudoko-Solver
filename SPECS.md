# SPECS: Sudoku Solver (FastAPI + React + Three.js)

**Course:** Analysis of Algorithms
**Companion to:** `PRD.md`
**Version:** 2.0

---

## 1. Scope

Technical design for the backend (FastAPI), frontend (React + Three.js ecosystem), the API contract between them, the algorithm, the visual design system, and the test plan. Requirement IDs (FB, FF, NFR) refer to `PRD.md`.

## 2. Architecture

```
+----------------------------+        HTTP / JSON        +-----------------------------+
|  Frontend (Vite, React)    |  ---------------------->  |  Backend (FastAPI)          |
|                            |    POST /api/solve        |                             |
|  Editor (2D grid, HTML)    |    GET  /api/samples      |  routes -> validation       |
|  Store (Zustand)           |  <----------------------  |          -> solver          |
|  Playback engine           |    solution, stats, trace |          -> response        |
|  Stage (R3F / Three.js)    |                           |                             |
+----------------------------+                           +-----------------------------+
```

Flow:

1. User edits the grid (2D editor updates the store).
2. Solve sends the givens to `POST /api/solve` with `include_trace: true`.
3. Backend validates, runs backtracking, and returns the solution, metrics, and trace.
4. The playback engine applies trace steps over time to the store.
5. Both the 2D grid and the 3D stage render from the same store state.

## 3. Technology and Versions

**Language:** Python is the project language. All algorithm code (backtracking solver, validation, API, tests) is Python. The React frontend runs in the browser, so it is TypeScript; it only renders and replays the steps the Python backend returns.

| Area | Package / Tool | Version target |
|------|----------------|----------------|
| Backend runtime and project language | **Python** (solver, API, validation, tests) | 3.10+ |
| Web framework | FastAPI | 0.110+ |
| Server | Uvicorn | 0.29+ |
| Validation | Pydantic | v2 |
| Backend tests | pytest, httpx | latest |
| Frontend runtime | Node | 18+ |
| Build tool | Vite | 5+ |
| UI | React, React DOM | 18 |
| Language | TypeScript | 5+ |
| 3D core | three | 0.160+ |
| 3D React renderer | @react-three/fiber | 8+ |
| 3D helpers | @react-three/drei | 9+ |
| State | zustand | 4+ |
| Fonts | @fontsource/space-grotesk, @fontsource/jetbrains-mono | latest |
| Frontend tests | vitest, @testing-library/react | latest |

## 4. Project Structure

```
sudoku-solver/
├── PRD.md
├── SPECS.md
├── README.md
├── backend/
│   ├── requirements.txt
│   ├── app/
│   │   ├── main.py            # app factory, CORS, router mount
│   │   ├── routes.py          # /api endpoints
│   │   ├── schemas.py         # Pydantic request/response models
│   │   ├── samples.py         # sample puzzles
│   │   └── core/
│   │       ├── solver.py      # backtracking algorithm
│   │       └── validation.py  # conflict detection
│   └── tests/
│       ├── test_solver.py
│       └── test_api.py
├── tools/
│   └── check_emoji.py
└── frontend/
    ├── index.html
    ├── package.json
    ├── vite.config.ts         # dev proxy: /api -> http://localhost:8000
    ├── public/fonts/          # .woff/.ttf files for 3D text (see 8.6)
    └── src/
        ├── main.tsx
        ├── App.tsx
        ├── api/client.ts
        ├── state/store.ts
        ├── playback/applyTrace.ts
        ├── playback/usePlayback.ts
        ├── components/
        │   ├── Header.tsx
        │   ├── BoardEditor.tsx
        │   ├── Controls.tsx
        │   ├── MetricsPanel.tsx
        │   ├── StatusLine.tsx
        │   └── Stage.tsx          # lazy-loaded
        ├── three/
        │   ├── BoardScene.tsx
        │   ├── Tiles.tsx          # instanced tiles
        │   ├── Digits.tsx
        │   ├── CameraRig.tsx
        │   └── palette.ts
        └── styles/
            ├── tokens.css
            └── global.css
```

## 5. Data Representation

### 5.1 Board

```
board: number[9][9]      // board[row][col]; 0 = empty, 1-9 = digit
```

### 5.2 Trace

An ordered list of steps `[row, col, value]`.

| value | Meaning |
|-------|---------|
| 1-9 | Digit placed at (row, col) |
| 0 | Digit removed at (row, col) (a backtrack) |

Replaying the trace from the givens reproduces the search exactly. A trace of length `k` costs `O(k)` to apply from scratch.

### 5.3 Metrics

| Field | Meaning |
|-------|---------|
| `calls` | Number of `solve()` invocations |
| `placements` | Digits placed on the board |
| `backtracks` | Digits removed after a failed branch |
| `elapsed_ms` | Solver wall time in milliseconds |

## 6. Backend Specification

### 6.1 Algorithm pseudocode

```
function solve(grid):
    calls += 1
    if limit exceeded: raise SolveLimitExceeded
    cell = find_empty(grid)
    if cell is None:
        return True                      # board full: solved

    (row, col) = cell
    for num from 1 to 9:
        if is_valid(grid, row, col, num):
            grid[row][col] = num         # place
            placements += 1
            record(row, col, num)

            if solve(grid):              # recurse
                return True

            grid[row][col] = 0           # backtrack
            backtracks += 1
            record(row, col, 0)

    return False                         # dead end
```

### 6.2 `core/validation.py`

```python
Board = list[list[int]]


def find_conflicts(board: Board) -> list[list[int]]:
    """Return [row, col] pairs of givens that duplicate a digit in a row, column, or box."""
    bad = set()
    units = []
    units += [[(r, c) for c in range(9)] for r in range(9)]            # rows
    units += [[(r, c) for r in range(9)] for c in range(9)]            # columns
    for br in range(0, 9, 3):                                          # boxes
        for bc in range(0, 9, 3):
            units.append([(r, c) for r in range(br, br + 3)
                                 for c in range(bc, bc + 3)])
    for unit in units:
        seen = {}
        for r, c in unit:
            v = board[r][c]
            if v == 0:
                continue
            if v in seen:
                bad.add((r, c))
                bad.add(seen[v])
            else:
                seen[v] = (r, c)
    return sorted([r, c] for r, c in bad)
```

### 6.3 `core/solver.py`

```python
import time
from dataclasses import dataclass, field

Board = list[list[int]]


class SolveLimitExceeded(Exception):
    """Raised when the call budget or time budget is exhausted."""


@dataclass
class SolveResult:
    solved: bool
    board: Board
    calls: int
    placements: int
    backtracks: int
    elapsed_ms: float
    trace: list[list[int]] = field(default_factory=list)
    trace_truncated: bool = False


def find_empty(grid: Board):
    for r in range(9):
        for c in range(9):
            if grid[r][c] == 0:
                return r, c
    return None


def is_valid(grid: Board, row: int, col: int, num: int) -> bool:
    if num in grid[row]:
        return False
    for r in range(9):
        if grid[r][col] == num:
            return False
    br, bc = 3 * (row // 3), 3 * (col // 3)
    for r in range(br, br + 3):
        for c in range(bc, bc + 3):
            if grid[r][c] == num:
                return False
    return True


def solve_sudoku(board: Board,
                 record_trace: bool = False,
                 max_trace: int = 20000,
                 max_calls: int = 5_000_000,
                 time_limit_s: float = 10.0) -> SolveResult:
    grid = [row[:] for row in board]          # never mutate the caller's data
    calls = placements = backtracks = 0
    trace: list[list[int]] = []
    truncated = False
    start = time.perf_counter()
    deadline = start + time_limit_s

    def record(r: int, c: int, v: int):
        nonlocal truncated
        if not record_trace:
            return
        if len(trace) < max_trace:
            trace.append([r, c, v])
        else:
            truncated = True

    def solve() -> bool:
        nonlocal calls, placements, backtracks
        calls += 1
        if calls > max_calls or (calls % 1024 == 0 and time.perf_counter() > deadline):
            raise SolveLimitExceeded()

        cell = find_empty(grid)
        if cell is None:
            return True
        row, col = cell

        for num in range(1, 10):
            if is_valid(grid, row, col, num):
                grid[row][col] = num
                placements += 1
                record(row, col, num)
                if solve():
                    return True
                grid[row][col] = 0
                backtracks += 1
                record(row, col, 0)
        return False

    solved = solve()
    elapsed_ms = (time.perf_counter() - start) * 1000
    return SolveResult(solved, grid if solved else [row[:] for row in board],
                       calls, placements, backtracks, elapsed_ms, trace, truncated)
```

### 6.4 `schemas.py`

```python
from pydantic import BaseModel, Field, field_validator


class SolveRequest(BaseModel):
    board: list[list[int]]
    include_trace: bool = False
    max_trace: int = Field(20000, ge=0, le=100000)

    @field_validator("board")
    @classmethod
    def check_board(cls, v):
        if len(v) != 9 or any(len(row) != 9 for row in v):
            raise ValueError("board must be 9 rows of 9 values")
        if any(not (0 <= x <= 9) for row in v for x in row):
            raise ValueError("values must be integers from 0 to 9")
        return v


class Stats(BaseModel):
    calls: int
    placements: int
    backtracks: int
    elapsed_ms: float
    empty_cells: int


class SolveResponse(BaseModel):
    solved: bool
    solution: list[list[int]] | None
    stats: Stats
    trace: list[list[int]] | None = None
    trace_truncated: bool = False


class Sample(BaseModel):
    id: str
    name: str
    board: list[list[int]]
```

### 6.5 `routes.py`

```python
from fastapi import APIRouter, HTTPException
from .schemas import SolveRequest, SolveResponse, Stats, Sample
from .samples import SAMPLES
from .core.solver import solve_sudoku, SolveLimitExceeded
from .core.validation import find_conflicts

router = APIRouter(prefix="/api")


@router.get("/health")
def health():
    return {"status": "ok"}


@router.get("/samples", response_model=list[Sample])
def samples():
    return SAMPLES


# Plain "def" (not "async def"): FastAPI runs it in a worker thread,
# so a CPU-bound solve does not block the event loop.
@router.post("/solve", response_model=SolveResponse)
def solve(req: SolveRequest):
    conflicts = find_conflicts(req.board)
    if conflicts:
        raise HTTPException(status_code=422, detail={
            "code": "INVALID_PUZZLE",
            "message": "The puzzle has duplicate digits in a row, column, or box.",
            "conflicts": conflicts,
        })
    try:
        res = solve_sudoku(req.board, record_trace=req.include_trace,
                           max_trace=req.max_trace)
    except SolveLimitExceeded:
        raise HTTPException(status_code=408, detail={
            "code": "LIMIT_EXCEEDED",
            "message": "The search exceeded its time or step limit.",
        })
    empty = sum(1 for row in req.board for v in row if v == 0)
    return SolveResponse(
        solved=res.solved,
        solution=res.board if res.solved else None,
        stats=Stats(calls=res.calls, placements=res.placements,
                    backtracks=res.backtracks,
                    elapsed_ms=round(res.elapsed_ms, 3), empty_cells=empty),
        trace=res.trace if req.include_trace else None,
        trace_truncated=res.trace_truncated,
    )
```

### 6.6 `main.py`

```python
import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .routes import router

app = FastAPI(title="Sudoku Solver API", version="2.0")

origins = os.getenv("CORS_ORIGINS", "http://localhost:5173").split(",")
app.add_middleware(CORSMiddleware, allow_origins=origins,
                   allow_methods=["GET", "POST"], allow_headers=["*"])

app.include_router(router)
```

### 6.7 `samples.py`

Contains at least three entries. The first is the standard puzzle:

```python
SAMPLES = [
    {"id": "classic", "name": "Classic", "board": [
        [5,3,0,0,7,0,0,0,0],
        [6,0,0,1,9,5,0,0,0],
        [0,9,8,0,0,0,0,6,0],
        [8,0,0,0,6,0,0,0,3],
        [4,0,0,8,0,3,0,0,1],
        [7,0,0,0,2,0,0,0,6],
        [0,6,0,0,0,0,2,8,0],
        [0,0,0,4,1,9,0,0,5],
        [0,0,0,0,8,0,0,7,9]]},
    # add a "medium" and a "hard" puzzle (about 25 and 17 givens)
]
```

## 7. API Contract

### 7.1 Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/health` | Liveness check |
| GET | `/api/samples` | List sample puzzles |
| POST | `/api/solve` | Solve a puzzle |
| GET | `/docs` | Interactive OpenAPI docs (built in) |

### 7.2 `POST /api/solve`

Request:

```json
{
  "board": [[5,3,0,0,7,0,0,0,0], "... 8 more rows ..."],
  "include_trace": true,
  "max_trace": 20000
}
```

Response 200 (solved):

```json
{
  "solved": true,
  "solution": [[5,3,4,6,7,8,9,1,2], "... 8 more rows ..."],
  "stats": { "calls": 4209, "placements": 4208, "backtracks": 4127,
             "elapsed_ms": 18.4, "empty_cells": 51 },
  "trace": [[0,2,1],[0,2,0],[0,2,2], "..."],
  "trace_truncated": false
}
```

Response 200 (unsolvable): `"solved": false`, `"solution": null`, stats present.

### 7.3 Errors

| Status | `detail.code` | When | Extra fields |
|--------|---------------|------|--------------|
| 422 | `INVALID_PUZZLE` | Duplicate givens | `conflicts: [[row, col], ...]` |
| 422 | (FastAPI default) | Wrong shape or values | Pydantic error list |
| 408 | `LIMIT_EXCEEDED` | Time or call budget exhausted | none |
| 500 | (server) | Unexpected error | generic message |

## 8. Frontend Specification

### 8.1 State (Zustand)

```ts
type Phase = 'editing' | 'solving' | 'ready' | 'playing' | 'paused' | 'done' | 'unsolvable' | 'error';

interface SudokuState {
  givens: number[][];          // what the user entered; never changed by playback
  grid: number[][];            // what is currently displayed (givens + placed digits)
  solution: number[][] | null;
  trace: number[][];           // [row, col, value] steps
  truncated: boolean;
  cursor: number;              // number of trace steps applied
  lastStep: number[] | null;   // most recent step, for highlighting
  speed: number;               // steps per second (1 to 2000, logarithmic slider)
  stats: Stats | null;
  conflicts: number[][];       // [row, col] pairs
  phase: Phase;
  message: string;             // status line text
  selected: [number, number] | null;

  setCell(r: number, c: number, v: number): void;
  clear(): void;
  loadSample(board: number[][]): void;
  solve(): Promise<void>;
  play(): void; pause(): void; step(): void; reset(): void;
  setSpeed(s: number): void;
}
```

Rules:

- Editing any cell while a replay exists resets the phase to `editing` and discards the trace.
- Given cells cannot be changed by playback. Playback only touches cells that are empty in `givens`.

### 8.2 Playback engine

- `usePlayback` runs a `requestAnimationFrame` loop while `phase === 'playing'`.
- Each frame it computes `n = round(speed * dt)` (at least 1 when speed allows) and applies `n` steps.
- `applyTrace(givens, trace, cursor)` returns the grid after `cursor` steps. Incremental application is used during playback; full recompute is used for reset and step-back.
- When `cursor === trace.length`:
  - If not truncated: phase becomes `done`.
  - If truncated: grid is set to `solution`, phase becomes `done`, and the status line explains that playback showed the first N steps.
- If `prefers-reduced-motion` is set, skip replay and show the solution immediately.

### 8.3 Components

| Component | Responsibility |
|-----------|----------------|
| `Header` | Wordmark, headline, sub-line. |
| `BoardEditor` | 9x9 HTML grid (`role="grid"`), keyboard input, conflict styling, given vs placed styling. |
| `Controls` | Sample select, Clear, Solve, Play/Pause, Step, Reset, Speed slider. |
| `MetricsPanel` | Four large numerals (calls, placements, backtracks, time) and empty cell count. |
| `StatusLine` | One sentence of feedback; `aria-live="polite"`. |
| `Stage` | Lazy-loaded R3F `Canvas` wrapper with error boundary and WebGL check. |
| `Footer` | Complexity note: Time O(9^n), Space O(n). |

Keyboard behavior in `BoardEditor`:

| Key | Action |
|-----|--------|
| 1-9 | Set value in selected cell |
| 0, Backspace, Delete | Clear cell |
| Arrow keys | Move selection |
| Enter | Trigger Solve (when focus is on the grid) |

### 8.4 3D scene (Three.js via React Three Fiber and Drei)

**Canvas settings**

| Setting | Value |
|---------|-------|
| `dpr` | `[1, 2]` |
| `frameloop` | `"demand"`; call `invalidate()` while animating, idle otherwise |
| `camera` | Perspective, fov 32, position about `[0, -11, 13]`, looking at origin (a gentle tilt toward the board) |
| `shadows` | Soft directional shadow; Drei `ContactShadows` under the board |
| Lights | One ambient (0.7), one directional (1.1) from upper left. No HDRI files, so nothing is fetched at runtime. |
| Post-processing | None |

**Geometry**

- 81 tiles rendered with a single `InstancedMesh` and a rounded box geometry (about 0.92 x 0.92 x 0.22).
- Tiles are placed on a 9x9 lattice with a 0.08 gap between cells and an extra 0.18 gap between 3x3 boxes so the box structure reads clearly.
- A thin ink-colored base slab sits under the tiles.
- Digits use Drei `<Text>` (troika) positioned on the tile top face; one `Text` per non-empty cell.

**Tile states and colors**

| State | Tile color | Height (z) | Digit color |
|-------|------------|------------|-------------|
| Empty | white | 0 | none |
| Given | ink | 0.10 | paper |
| Placed by solver | sun | 0.26 | ink |
| Just removed (backtrack) | coral, fades to white over about 250 ms | drops from 0.26 to 0 | fades out |
| Conflict | coral outline tint | 0 | ink |
| Completed ripple | leaf green, then settles to sun | brief lift | ink |

**Motion**

- Per-instance targets (height and color) are stored in typed arrays and eased each frame with a critically damped lerp (about 12 per second). No animation library is required.
- Ripple on completion: delay per cell = `(row + col) * 35 ms`, with a lift of 0.15 and a green tint, then settle.
- At high playback speeds (over 200 steps per second) per-tile easing is shortened so the scene keeps up; the last-changed tile is always highlighted.
- Camera: Drei `OrbitControls` with `enablePan={false}`, `enableDamping`, limited polar angle (about 25 to 65 degrees) and limited zoom. Slow idle drift is disabled when reduced motion is requested.

**Interaction**

- Hover on a tile shows a thin sun outline (pointer events on the instanced mesh using `instanceId`).
- Clicking a tile selects the same cell in the editor.

**Fallback**

- `Stage` checks WebGL support and wraps the canvas in an error boundary. On failure it renders a compact message ("3D view unavailable. The grid on the left still works.") and nothing else changes.

### 8.5 Design system

**Color tokens (`tokens.css`)**

| Token | Value | Use |
|-------|-------|-----|
| `--paper` | `#FFF7E8` | Page background |
| `--surface` | `#FFFFFF` | Cells, panels |
| `--ink` | `#15120E` | Text, outlines, given tiles |
| `--sun` | `#FFB300` | Primary accent, placed digits, primary button |
| `--sun-deep` | `#E59A00` | Hover for sun |
| `--coral` | `#FF4B3E` | Backtrack flash, conflict outline |
| `--coral-text` | `#B8281D` | Error text (passes AA on paper) |
| `--leaf` | `#14B87A` | Success ripple |
| `--line` | `rgba(21, 18, 14, 0.14)` | Hairlines |

Contrast: ink on paper and ink on sun both exceed 10:1. Coral (`--coral`) is used only for shapes and flashes, never for small text.

**Typography**

| Role | Font | Weight | Size |
|------|------|--------|------|
| Display headline | Space Grotesk | 700 | `clamp(2.5rem, 7vw, 5.5rem)`, line-height 0.95, tracking -0.03em |
| Body | Space Grotesk | 400 / 500 | 1rem |
| Labels | Space Grotesk | 600, uppercase | 0.75rem, tracking 0.08em |
| Numerals (cells, metrics) | JetBrains Mono | 600-700 | cells 1.5rem, metrics 3rem |

Fonts are installed through Fontsource packages for the HTML side. For the 3D `Text`, copy a `.woff` or `.ttf` file into `public/fonts/` and pass it through the `font` prop (troika does not read `.woff2`).

**Shape and elevation**

- Corners: 6 px on panels and buttons; 0 on the grid cells (the grid reads as a crisp table).
- Borders: 2 px ink on interactive elements; 3 px ink around the editor grid; thicker 3 px lines between 3x3 boxes.
- Shadows: hard offset only, no blur (`4px 4px 0 var(--ink)`).
- Buttons: primary is sun with ink text and a 2 px ink border and hard shadow; on press it translates by 2 px and the shadow shrinks. Secondary is surface with ink border.

**Layout**

- Desktop (1024 px and up): 12-column grid with 32 px gutters. Editor and controls span 5 columns; the 3D stage spans 7. Metrics span the full width below.
- Tablet: two rows, editor above stage.
- Phone (below 640 px): single column; the stage keeps a 1:1 aspect ratio; metrics become a 2x2 grid; the speed slider spans the full width.
- Max content width 1200 px. Base spacing unit 8 px.

**Copy rules**

- Sentences are short, positive, and in plain English.
- No emojis or emoji-like symbols anywhere (UI, code, comments, docs). Icons, if used, are inline SVG geometry.

### 8.6 Accessibility

- Every cell: `role="gridcell"` with `aria-label` such as "Row 3, column 5, empty" or "Row 3, column 5, given 8".
- Focus ring: 3 px sun ring with 2 px ink outline, never removed.
- Status changes (solving, solved, unsolvable, errors) announced through `aria-live="polite"`.
- Buttons have text labels; no icon-only controls.
- All animation is skipped under `prefers-reduced-motion`.
- The 3D canvas is decorative for assistive tech (`aria-hidden`), because all information is in the grid, metrics, and status line.

### 8.7 API client (`api/client.ts`)

```ts
const BASE = import.meta.env.VITE_API_URL ?? '';   // empty: use the Vite dev proxy

export async function solve(board: number[][]) {
  const res = await fetch(`${BASE}/api/solve`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ board, include_trace: true, max_trace: 20000 }),
  });
  const data = await res.json();
  if (!res.ok) throw { status: res.status, detail: data.detail };
  return data;
}
```

Error mapping in the store:

| Response | UI result |
|----------|-----------|
| 422 `INVALID_PUZZLE` | Highlight `conflicts`, message "Two matching digits share a row, column, or box." |
| 408 `LIMIT_EXCEEDED` | Message "This puzzle took too long to search. Try a different one." |
| Network failure | Message "Cannot reach the solver. Is the backend running?" |
| 200 with `solved: false` | Phase `unsolvable`, message "No solution exists for this puzzle." |

## 9. Complexity Analysis

Let n = number of empty cells.

- Each empty cell branches into at most 9 choices; recursion depth is at most n.
- Nodes explored in the worst case: 9^n. Each node costs O(1) for a fixed 9x9 grid (`find_empty` scans at most 81 cells, `is_valid` about 27 comparisons).
- Recurrence: `T(n) <= 9 * T(n - 1) + O(1)`, which solves to `T(n) = O(9^n)`.
- **Time (worst case): O(9^n).** Pruning makes real runs much faster.
- **Space: O(n)** for the recursion stack, excluding the board. The optional trace adds O(min(steps, max_trace)).

## 10. Test Plan

### 10.1 Backend (pytest)

| ID | Test | Expected |
|----|------|----------|
| T1 | Solve classic sample | Matches the known solution below |
| T2 | Already solved grid | Returned unchanged; 1 call; 0 backtracks |
| T3 | One blank | Blank restored |
| T4 | Empty board | Valid complete grid |
| T5 | Duplicate in a row | 422 `INVALID_PUZZLE` with the conflicting cells |
| T6 | Wrong shape (8 rows, or 10 columns) | 422 from validation |
| T7 | Value out of range (for example 10 or -1) | 422 |
| T8 | Unsolvable puzzle (see 10.3) | 200, `solved: false` |
| T9 | Hard puzzle | Solved within the time limit; metrics returned |
| T10 | `include_trace` with small `max_trace` | Trace length equals cap; `trace_truncated: true` |
| T11 | Replay property | Applying the full (untruncated) trace to the givens yields the solution |
| T12 | Solution check | Every row, column, and box has 1-9 once; givens unchanged |
| T13 | Input not mutated | Request board object is identical after solving |
| T14 | `GET /api/samples`, `GET /api/health` | 200 with expected shape |
| T15 | Determinism | Two runs give identical solution, stats (except time), and trace |

### 10.2 Classic puzzle and solution

Puzzle (0 = empty):

```
530070000
600195000
098000060
800060003
400803001
700020006
060000280
000419005
000080079
```

Expected solution:

```
534678912
672195348
198342567
859761423
426853791
713924856
961537284
287419635
345286179
```

### 10.3 Unsolvable puzzle

No duplicates, but the empty cell in row 1, column 9 needs a 9 by the row rule while column 9 already contains a 9:

```
123456780
000000009
000000000
000000000
000000000
000000000
000000000
000000000
000000000
```

### 10.4 Frontend (Vitest and manual)

| ID | Test | Expected |
|----|------|----------|
| F1 | `applyTrace` with place then remove | Grid returns to previous state |
| F2 | `applyTrace` never modifies given cells | Givens unchanged |
| F3 | Store: editing after solve | Trace cleared, phase `editing` |
| F4 | Keyboard input | Digits set, Backspace clears, arrows move selection |
| F5 | Conflict styling | Cells in `conflicts` receive the conflict class |
| F6 | Truncated trace | At end, grid equals `solution` and status explains truncation |
| F7 | Reduced motion | No replay; solution shown immediately |
| F8 | WebGL disabled | 2D UI fully functional, fallback message shown |
| F9 | Responsive check at 360, 768, 1280 px | No horizontal scroll; controls reachable |
| F10 | Accessibility | Lighthouse score 90 or above; keyboard-only run through the whole flow |
| F11 | Emoji check | Command below returns no matches |

Emoji check (Python, run from the repository root):

```python
# tools/check_emoji.py
import pathlib, re, sys

PATTERN = re.compile("[\U0001F000-\U0001FAFF\u2600-\u27BF]")
SUFFIXES = {".py", ".ts", ".tsx", ".css", ".html", ".md", ".json"}
SKIP = {"node_modules", ".venv", "dist", ".git"}

bad = 0
for path in pathlib.Path(".").rglob("*"):
    if path.is_file() and path.suffix in SUFFIXES and not (SKIP & set(path.parts)):
        for n, line in enumerate(path.read_text(encoding="utf-8", errors="ignore").splitlines(), 1):
            if PATTERN.search(line):
                print(f"{path}:{n}: emoji found")
                bad += 1
sys.exit(1 if bad else 0)
```

Run with `python tools/check_emoji.py`. Exit code 0 means the repository is emoji-free.

## 11. Error Handling Summary

| Situation | Backend | Frontend |
|-----------|---------|----------|
| Duplicate givens | 422 with conflicts | Highlight cells, show message |
| Malformed body | 422 (Pydantic) | Generic input error message |
| No solution | 200, `solved: false` | "No solution exists" message |
| Limit exceeded | 408 | "Took too long" message |
| Backend down | n/a | "Cannot reach the solver" message |
| WebGL missing | n/a | Fallback note; 2D grid works |

## 12. Optional Optimizations (for discussion and extra marks)

| Optimization | Idea | Effect |
|--------------|------|--------|
| MRV heuristic | Choose the empty cell with the fewest candidates | Large reduction in backtracks |
| Bitmask sets | Row, column, and box used-digit masks | Constant-time validity check with tiny constants |
| Forward checking | Fail early if any empty cell has no candidates | Earlier pruning |
| Constraint propagation | Fill forced cells before guessing | Solves easy puzzles with almost no search |

Suggested experiment: add a `strategy` field to the API (`plain` or `mrv`) and compare `calls` and `backtracks` on the same puzzles.

## 13. Requirement Traceability

| Requirement | Where implemented |
|-------------|-------------------|
| FB1, FB4, FB5 | `routes.solve`, `core/solver.py` |
| FB2 | `schemas.SolveRequest`, `core/validation.py` |
| FB3 | `solve()` inside `solve_sudoku` |
| FB6 | `SolveLimitExceeded`, `max_calls`, `time_limit_s` |
| FB7, FB8 | `routes.samples`, `routes.health` |
| FB9 | CORS middleware in `main.py` |
| FF1, FF8 | `BoardEditor`, store `conflicts` |
| FF2 | `BoardEditor` styling, tile states in `Tiles.tsx` |
| FF3 | `store.solve`, `api/client.ts`, `StatusLine` |
| FF4, FF6, FF10 | `three/` modules |
| FF5, FF12 | `usePlayback`, `Controls` |
| FF7 | `MetricsPanel` |
| FF9 | `Controls`, `GET /api/samples` |
| FF11 | `Stage` with WebGL check and error boundary |
| FF13 | `Footer` |
| NFR3, NFR4 | Instanced mesh, `frameloop="demand"`, `React.lazy(Stage)` |
| NFR5 | Section 8.6 |

## 14. Setup and Run

**Backend**

```bash
cd backend
python -m venv .venv
source .venv/bin/activate          # Windows: .venv\Scripts\activate
pip install fastapi "uvicorn[standard]" pydantic pytest httpx
uvicorn app.main:app --reload --port 8000
```

`backend/requirements.txt` should list: `fastapi`, `uvicorn[standard]`, `pydantic`, `pytest`, `httpx`.
Interactive docs: http://localhost:8000/docs

**Frontend**

```bash
cd frontend
npm create vite@latest . -- --template react-ts
npm install three @react-three/fiber @react-three/drei zustand
npm install @fontsource/space-grotesk @fontsource/jetbrains-mono
npm install -D vitest @testing-library/react @types/three
npm run dev
```

`vite.config.ts` proxy:

```ts
server: { proxy: { '/api': 'http://localhost:8000' } }
```

**Tests**

```bash
cd backend && pytest
cd frontend && npx vitest run
```