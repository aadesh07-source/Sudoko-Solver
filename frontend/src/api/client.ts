const BASE = import.meta.env.VITE_API_URL ?? ''; // empty: use the Vite dev proxy

export interface Stats {
  calls: number;
  placements: number;
  backtracks: number;
  elapsed_ms: number;
  empty_cells: number;
}

export interface SolveResponse {
  solved: boolean;
  solution: number[][] | null;
  stats: Stats;
  trace: number[][] | null;
  trace_truncated: boolean;
}

export interface Sample {
  id: string;
  name: string;
  board: number[][];
}

export interface ApiError {
  status: number;
  detail: {
    code?: string;
    message?: string;
    conflicts?: number[][];
  } | string;
}

export async function solve(board: number[][]): Promise<SolveResponse> {
  const res = await fetch(`${BASE}/api/solve`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ board, include_trace: true, max_trace: 20000 }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw { status: res.status, detail: data.detail } as ApiError;
  }
  return data;
}

export async function fetchSamples(): Promise<Sample[]> {
  const res = await fetch(`${BASE}/api/samples`);
  if (!res.ok) {
    throw new Error('Failed to fetch samples');
  }
  return res.json();
}

export async function fetchRandomPuzzle(difficulty: string = 'classic'): Promise<Sample> {
  const res = await fetch(`${BASE}/api/puzzle/random?difficulty=${encodeURIComponent(difficulty)}`);
  if (!res.ok) {
    throw new Error('Failed to fetch random puzzle');
  }
  return res.json();
}
