from fastapi import APIRouter, HTTPException
from .schemas import SolveRequest, SolveResponse, Stats, Sample
from .samples import SAMPLES, get_random_puzzle
from .core.solver import solve_sudoku, SolveLimitExceeded
from .core.validation import find_conflicts

router = APIRouter(prefix="/api")


@router.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@router.get("/samples", response_model=list[Sample])
def samples() -> list[Sample]:
    return SAMPLES


@router.get("/puzzle/random", response_model=Sample)
def random_puzzle(difficulty: str = "classic") -> Sample:
    return get_random_puzzle(difficulty)


# Plain "def" (not "async def"): FastAPI runs it in a worker thread pool,
# so CPU-bound solve computation does not block the event loop.
@router.post("/solve", response_model=SolveResponse)
def solve(req: SolveRequest) -> SolveResponse:
    conflicts = find_conflicts(req.board)
    if conflicts:
        raise HTTPException(
            status_code=422,
            detail={
                "code": "INVALID_PUZZLE",
                "message": "The puzzle has duplicate digits in a row, column, or box.",
                "conflicts": conflicts,
            },
        )

    try:
        res = solve_sudoku(
            req.board,
            record_trace=req.include_trace,
            max_trace=req.max_trace,
        )
    except SolveLimitExceeded:
        raise HTTPException(
            status_code=408,
            detail={
                "code": "LIMIT_EXCEEDED",
                "message": "The search exceeded its time or step limit.",
            },
        )

    empty = sum(1 for row in req.board for v in row if v == 0)
    return SolveResponse(
        solved=res.solved,
        solution=res.board if res.solved else None,
        stats=Stats(
            calls=res.calls,
            placements=res.placements,
            backtracks=res.backtracks,
            elapsed_ms=round(res.elapsed_ms, 3),
            empty_cells=empty,
        ),
        trace=res.trace if req.include_trace else None,
        trace_truncated=res.trace_truncated,
    )
