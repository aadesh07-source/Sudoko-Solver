from pydantic import BaseModel, Field, field_validator


class SolveRequest(BaseModel):
    board: list[list[int]]
    include_trace: bool = False
    max_trace: int = Field(20000, ge=0, le=100000)

    @field_validator("board")
    @classmethod
    def check_board(cls, v: list[list[int]]) -> list[list[int]]:
        if len(v) != 9 or any(len(row) != 9 for row in v):
            raise ValueError("board must be 9 rows of 9 values")
        if any(not isinstance(x, int) or not (0 <= x <= 9) for row in v for x in row):
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
