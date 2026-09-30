Board = list[list[int]]


def find_conflicts(board: Board) -> list[list[int]]:
    """Return [row, col] pairs of givens that duplicate a digit in a row, column, or box."""
    bad = set()
    units: list[list[tuple[int, int]]] = []
    # Rows
    units += [[(r, c) for c in range(9)] for r in range(9)]
    # Columns
    units += [[(r, c) for r in range(9)] for c in range(9)]
    # 3x3 boxes
    for br in range(0, 9, 3):
        for bc in range(0, 9, 3):
            units.append([(r, c) for r in range(br, br + 3)
                                 for c in range(bc, bc + 3)])

    for unit in units:
        seen: dict[int, tuple[int, int]] = {}
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
