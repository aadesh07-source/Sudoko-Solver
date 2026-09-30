from fastapi.testclient import TestClient
from app.main import app
from app.samples import SAMPLES

client = TestClient(app)

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


def test_t14_health():
    res = client.get("/api/health")
    assert res.status_code == 200
    assert res.json() == {"status": "ok"}


def test_t14_samples():
    res = client.get("/api/samples")
    assert res.status_code == 200
    data = res.json()
    assert isinstance(data, list)
    assert len(data) >= 3
    sample_ids = [s["id"] for s in data]
    assert "classic" in sample_ids
    assert "medium" in sample_ids
    assert "hard" in sample_ids


def test_random_puzzle_endpoint():
    for diff in ["classic", "medium", "hard"]:
        res = client.get(f"/api/puzzle/random?difficulty={diff}")
        assert res.status_code == 200
        data = res.json()
        assert "board" in data
        assert len(data["board"]) == 9
        assert len(data["board"][0]) == 9
        assert data["name"].lower() == diff


def test_t1_solve_api():
    res = client.post("/api/solve", json={"board": CLASSIC_BOARD, "include_trace": True})
    assert res.status_code == 200
    data = res.json()
    assert data["solved"] is True
    assert data["solution"] == CLASSIC_SOLUTION
    assert data["stats"]["calls"] > 0
    assert data["stats"]["placements"] > 0
    assert data["stats"]["backtracks"] > 0
    assert data["stats"]["empty_cells"] == 51
    assert isinstance(data["trace"], list)
    assert len(data["trace"]) > 0


def test_t5_duplicate_conflict():
    board = [row[:] for row in CLASSIC_BOARD]
    board[0][8] = 5  # Duplicate 5 in row 0 (col 0 is 5)
    res = client.post("/api/solve", json={"board": board})
    assert res.status_code == 422
    data = res.json()
    assert data["detail"]["code"] == "INVALID_PUZZLE"
    conflicts = data["detail"]["conflicts"]
    assert [0, 0] in conflicts
    assert [0, 8] in conflicts


def test_t6_wrong_shape():
    # Only 8 rows
    bad_board = CLASSIC_BOARD[:8]
    res = client.post("/api/solve", json={"board": bad_board})
    assert res.status_code == 422


def test_t7_value_out_of_range():
    board = [row[:] for row in CLASSIC_BOARD]
    board[0][0] = 10
    res = client.post("/api/solve", json={"board": board})
    assert res.status_code == 422


def test_t8_unsolvable_api():
    res = client.post("/api/solve", json={"board": UNSOLVABLE_BOARD})
    assert res.status_code == 200
    data = res.json()
    assert data["solved"] is False
    assert data["solution"] is None
    assert data["stats"]["calls"] > 0
