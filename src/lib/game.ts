export type Player = 'X' | 'O';
export type Cell = Player | null;
export type Mode = 'classic' | 'vanishing';
export type Level = 'easy' | 'medium' | 'hard';

export interface GameState {
  board: Cell[];
  /** Cell indexes each player has marked, oldest first. */
  queues: Record<Player, number[]>;
  turn: Player;
  winner: Player | null;
  line: number[] | null;
  draw: boolean;
}

export const MAX_MARKS = 3;

export const LINES: number[][] = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8],
  [0, 3, 6], [1, 4, 7], [2, 5, 8],
  [0, 4, 8], [2, 4, 6],
];

export const other = (p: Player): Player => (p === 'X' ? 'O' : 'X');

export function newGame(first: Player = 'X'): GameState {
  return {
    board: Array<Cell>(9).fill(null),
    queues: { X: [], O: [] },
    turn: first,
    winner: null,
    line: null,
    draw: false,
  };
}

export function findLine(board: Cell[]): { winner: Player; line: number[] } | null {
  for (const line of LINES) {
    const [a, b, c] = line;
    const v = board[a];
    if (v && v === board[b] && v === board[c]) return { winner: v, line };
  }
  return null;
}

export function isOver(s: GameState): boolean {
  return s.winner !== null || s.draw;
}

export function legalMoves(s: GameState): number[] {
  const out: number[] = [];
  s.board.forEach((c, i) => {
    if (c === null) out.push(i);
  });
  return out;
}

/** In vanishing mode: the cell that disappears when the player to move places their next mark. */
export function fadingCell(s: GameState, mode: Mode): number | null {
  if (mode !== 'vanishing' || isOver(s)) return null;
  const q = s.queues[s.turn];
  return q.length >= MAX_MARKS ? q[0] : null;
}

export function applyMove(s: GameState, index: number, mode: Mode): GameState {
  if (isOver(s) || s.board[index] !== null) return s;
  const board = s.board.slice();
  const queues = { X: s.queues.X.slice(), O: s.queues.O.slice() };
  const p = s.turn;
  board[index] = p;
  queues[p].push(index);
  if (mode === 'vanishing' && queues[p].length > MAX_MARKS) {
    const oldest = queues[p].shift() as number;
    board[oldest] = null;
  }
  const hit = findLine(board);
  const draw = !hit && mode === 'classic' && board.every((c) => c !== null);
  return {
    board,
    queues,
    turn: other(p),
    winner: hit ? hit.winner : null,
    line: hit ? hit.line : null,
    draw,
  };
}

function search(s: GameState, mode: Mode, me: Player, depth: number, maxDepth: number, alpha: number, beta: number): number {
  if (s.winner) return s.winner === me ? 100 - depth : depth - 100;
  if (s.draw || depth >= maxDepth) return 0;
  const moves = legalMoves(s);
  if (s.turn === me) {
    let best = -Infinity;
    for (const m of moves) {
      best = Math.max(best, search(applyMove(s, m, mode), mode, me, depth + 1, maxDepth, alpha, beta));
      alpha = Math.max(alpha, best);
      if (alpha >= beta) break;
    }
    return best;
  }
  let best = Infinity;
  for (const m of moves) {
    best = Math.min(best, search(applyMove(s, m, mode), mode, me, depth + 1, maxDepth, alpha, beta));
    beta = Math.min(beta, best);
    if (alpha >= beta) break;
  }
  return best;
}

const pick = <T,>(xs: T[]): T => xs[Math.floor(Math.random() * xs.length)];

/** Chooses a move for the player whose turn it is. */
export function pickMove(s: GameState, level: Level, mode: Mode): number {
  const moves = legalMoves(s);
  if (level === 'easy') return pick(moves);
  if (level === 'medium' && Math.random() < 0.35) return pick(moves);
  const maxDepth = mode === 'classic' ? 9 : 7;
  let bestScore = -Infinity;
  let best: number[] = [];
  for (const m of moves) {
    const sc = search(applyMove(s, m, mode), mode, s.turn, 1, maxDepth, -Infinity, Infinity);
    if (sc > bestScore) {
      bestScore = sc;
      best = [m];
    } else if (sc === bestScore) {
      best.push(m);
    }
  }
  return pick(best);
}
