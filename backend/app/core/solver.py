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


def find_empty(grid: Board) -> tuple[int, int] | None:
    """Find the next empty cell scanning row by row."""
    for r in range(9):
        for c in range(9):
            if grid[r][c] == 0:
                return r, c
    return None


def is_valid(grid: Board, row: int, col: int, num: int) -> bool:
    """Check if placing num at (row, col) is valid under Sudoku rules."""
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


def solve_sudoku(
    board: Board,
    record_trace: bool = False,
    max_trace: int = 20000,
    max_calls: int = 5_000_000,
    time_limit_s: float = 10.0,
) -> SolveResult:
    """Solve the Sudoku puzzle using recursive depth-first backtracking."""
    grid = [row[:] for row in board]  # never mutate the caller's data
    calls = placements = backtracks = 0
    trace: list[list[int]] = []
    truncated = False
    start = time.perf_counter()
    deadline = start + time_limit_s

    def record(r: int, c: int, v: int) -> None:
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
    return SolveResult(
        solved=solved,
        board=grid if solved else [row[:] for row in board],
        calls=calls,
        placements=placements,
        backtracks=backtracks,
        elapsed_ms=elapsed_ms,
        trace=trace,
        trace_truncated=truncated,
    )
