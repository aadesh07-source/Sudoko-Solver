from app.core.solver import solve_sudoku
from app.core.validation import find_conflicts
from app.samples import SAMPLES

CLASSIC_BOARD = [
    [5, 3, 0, 0, 7, 0, 0, 0, 0],
    [6, 0, 0, 1, 9, 5, 0, 0, 0],
    [0, 9, 8, 0, 0, 0, 0, 6, 0],
    [8, 0, 0, 0, 6, 0, 0, 0, 3],
    [4, 0, 0, 8, 0, 3, 0, 0, 1],
    [7, 0, 0, 0, 2, 0, 0, 0, 6],
    [0, 6, 0, 0, 0, 0, 2, 8, 0],
    [0, 0, 0, 4, 1, 9, 0, 0, 5],
    [0, 0, 0, 0, 8, 0, 0, 7, 9],
]

CLASSIC_SOLUTION = [
    [5, 3, 4, 6, 7, 8, 9, 1, 2],
    [6, 7, 2, 1, 9, 5, 3, 4, 8],
    [1, 9, 8, 3, 4, 2, 5, 6, 7],
    [8, 5, 9, 7, 6, 1, 4, 2, 3],
    [4, 2, 6, 8, 5, 3, 7, 9, 1],
    [7, 1, 3, 9, 2, 4, 8, 5, 6],
    [9, 6, 1, 5, 3, 7, 2, 8, 4],
    [2, 8, 7, 4, 1, 9, 6, 3, 5],
    [3, 4, 5, 2, 8, 6, 1, 7, 9],
]

UNSOLVABLE_BOARD = [
    [1, 2, 3, 4, 5, 6, 7, 8, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 9],
    [0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0],
]


def is_valid_solution(board: list[list[int]], givens: list[list[int]]) -> bool:
    digits = set(range(1, 10))
    # Rows
    for r in range(9):
        if set(board[r]) != digits:
            return False
    # Columns
    for c in range(9):
        if {board[r][c] for r in range(9)} != digits:
            return False
    # Boxes
    for br in range(0, 9, 3):
        for bc in range(0, 9, 3):
            if {board[r][c] for r in range(br, br + 3) for c in range(bc, bc + 3)} != digits:
                return False
    # Preserves givens
    for r in range(9):
        for c in range(9):
            if givens[r][c] != 0 and board[r][c] != givens[r][c]:
                return False
    return True


def test_t1_solve_classic_sample():
    res = solve_sudoku(CLASSIC_BOARD)
    assert res.solved is True
    assert res.board == CLASSIC_SOLUTION


def test_t2_already_solved_grid():
    res = solve_sudoku(CLASSIC_SOLUTION)
    assert res.solved is True
    assert res.board == CLASSIC_SOLUTION
    assert res.calls == 1
    assert res.backtracks == 0


def test_t3_one_blank():
    board = [row[:] for row in CLASSIC_SOLUTION]
    board[0][2] = 0  # Was 4
    res = solve_sudoku(board)
    assert res.solved is True
    assert res.board[0][2] == 4
    assert res.board == CLASSIC_SOLUTION


def test_t4_empty_board():
    empty = [[0] * 9 for _ in range(9)]
    res = solve_sudoku(empty)
    assert res.solved is True
    assert is_valid_solution(res.board, empty)


def test_t8_unsolvable_puzzle():
    res = solve_sudoku(UNSOLVABLE_BOARD)
    assert res.solved is False


def test_t9_hard_puzzle():
    hard_sample = next(s for s in SAMPLES if s.id == "hard")
    res = solve_sudoku(hard_sample.board, time_limit_s=10.0)
    assert res.solved is True
    assert is_valid_solution(res.board, hard_sample.board)
    assert res.calls > 0
    assert res.placements > 0


def test_t10_trace_truncation():
    res = solve_sudoku(CLASSIC_BOARD, record_trace=True, max_trace=50)
    assert res.solved is True
    assert len(res.trace) == 50
    assert res.trace_truncated is True


def test_t11_replay_property():
    res = solve_sudoku(CLASSIC_BOARD, record_trace=True, max_trace=100000)
    assert res.solved is True
    assert res.trace_truncated is False

    replayed = [row[:] for row in CLASSIC_BOARD]
    for r, c, val in res.trace:
        replayed[r][c] = val
    assert replayed == CLASSIC_SOLUTION


def test_t12_solution_check():
    res = solve_sudoku(CLASSIC_BOARD)
    assert is_valid_solution(res.board, CLASSIC_BOARD)


def test_t13_input_not_mutated():
    original = [row[:] for row in CLASSIC_BOARD]
    solve_sudoku(CLASSIC_BOARD)
    assert CLASSIC_BOARD == original


def test_t15_determinism():
    res1 = solve_sudoku(CLASSIC_BOARD, record_trace=True)
    res2 = solve_sudoku(CLASSIC_BOARD, record_trace=True)
    assert res1.solved == res2.solved
    assert res1.board == res2.board
    assert res1.calls == res2.calls
    assert res1.placements == res2.placements
    assert res1.backtracks == res2.backtracks
    assert res1.trace == res2.trace
