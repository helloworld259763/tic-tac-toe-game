import { useCallback, useEffect, useState } from 'react';
import { AnimatePresence, MotionConfig, motion } from 'motion/react';
import {
  applyMove,
  fadingCell,
  isOver,
  MAX_MARKS,
  newGame,
  other,
  pickMove,
  type GameState,
  type Level,
  type Mode,
  type Player,
} from './lib/game';
import { sfx } from './lib/sound';

type Opponent = 'ai' | 'local';

const color = (p: Player) => (p === 'X' ? 'var(--color-x)' : 'var(--color-o)');

function Mark({ player, fading }: { player: Player; fading: boolean }) {
  const c = color(player);
  return (
    <motion.svg
      viewBox="0 0 100 100"
      className="h-3/5 w-3/5"
      fill="none"
      stroke={c}
      strokeWidth={9}
      strokeLinecap="round"
      style={{ filter: `drop-shadow(0 0 7px ${c})` }}
      initial={{ opacity: 0, scale: 0.85 }}
      animate={{ opacity: fading ? 0.28 : 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.6 }}
      transition={{ duration: 0.25 }}
    >
      {player === 'X' ? (
        <>
          <motion.path d="M24 24 L76 76" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.22 }} />
          <motion.path d="M76 24 L24 76" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.22, delay: 0.12 }} />
        </>
      ) : (
        <motion.circle cx="50" cy="50" r="27" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.4 }} />
      )}
    </motion.svg>
  );
}

function Segment<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: { value: T; text: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-sm text-slate-400">{label}</span>
      <div className="flex rounded-xl border border-edge bg-panel p-1">
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            aria-pressed={value === o.value}
            onClick={() => onChange(o.value)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-x ${
              value === o.value ? 'bg-slate-100 text-ink' : 'text-slate-300 hover:text-white'
            }`}
          >
            {o.text}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function App() {
  const [opponent, setOpponent] = useState<Opponent>('ai');
  const [mode, setMode] = useState<Mode>('classic');
  const [level, setLevel] = useState<Level>('hard');
  const [muted, setMuted] = useState(false);
  const [starter, setStarter] = useState<Player>('X');
  const [game, setGame] = useState<GameState>(() => newGame('X'));
  const [scores, setScores] = useState({ X: 0, O: 0, draws: 0 });

  const over = isOver(game);
  const aiTurn = opponent === 'ai' && game.turn === 'O' && !over;
  const fading = fadingCell(game, mode);

  const commit = useCallback(
    (index: number) => {
      const next = applyMove(game, index, mode);
      if (next === game) return;
      setGame(next);
      const vanished = mode === 'vanishing' && game.queues[game.turn].length >= MAX_MARKS;
      if (next.winner) {
        sfx.win();
        setScores((s) => ({ ...s, [next.winner as Player]: s[next.winner as Player] + 1 }));
      } else if (next.draw) {
        sfx.draw();
        setScores((s) => ({ ...s, draws: s.draws + 1 }));
      } else {
        sfx.place(game.turn);
        if (vanished) setTimeout(() => sfx.vanish(), 120);
      }
    },
    [game, mode],
  );

  useEffect(() => {
    if (!aiTurn) return;
    const t = setTimeout(() => commit(pickMove(game, level, mode)), 520);
    return () => clearTimeout(t);
  }, [aiTurn, game, level, mode, commit]);

  const startRound = (first: Player) => {
    sfx.reset();
    setStarter(first);
    setGame(newGame(first));
  };

  const reconfigure = (apply: () => void) => {
    apply();
    setScores({ X: 0, O: 0, draws: 0 });
    startRound('X');
  };

  const toggleSound = () => {
    const next = !muted;
    setMuted(next);
    sfx.setMuted(next);
  };

  const name = (p: Player) => (opponent === 'ai' ? (p === 'X' ? 'You' : 'Aether') : `Player ${p}`);

  let status: string;
  if (game.winner) status = opponent === 'ai' && game.winner === 'X' ? 'You win' : `${name(game.winner)} wins`;
  else if (game.draw) status = 'Draw';
  else if (aiTurn) status = 'Aether is thinking…';
  else status = opponent === 'ai' ? 'Your move' : `${name(game.turn)} to move`;

  return (
    <MotionConfig reducedMotion="user">
      <main className="mx-auto flex min-h-screen w-full max-w-md flex-col gap-6 px-5 py-8">
        <header>
          <h1 className="text-4xl font-extrabold tracking-tight">Aether Grid</h1>
          <p className="mt-1 text-slate-400">Tic-tac-toe with a computer that plays to win.</p>
        </header>

        <section aria-label="Score" className="grid grid-cols-3 gap-3">
          {(['X', 'draws', 'O'] as const).map((k) => {
            const active = !over && k !== 'draws' && game.turn === k;
            return (
              <div
                key={k}
                className="rounded-xl border bg-panel px-3 py-2 text-center"
                style={{ borderColor: active ? color(k as Player) : 'var(--color-edge)' }}
              >
                <div className="text-xs text-slate-400">{k === 'draws' ? 'Draws' : name(k)}</div>
                <div className="font-mono text-2xl font-semibold" style={{ color: k === 'draws' ? undefined : color(k) }}>
                  {k === 'draws' ? scores.draws : scores[k]}
                </div>
              </div>
            );
          })}
        </section>

        <p aria-live="polite" className="text-center text-lg font-semibold">
          {status}
        </p>

        <div
          className="grid grid-cols-3 gap-2.5 rounded-3xl p-3"
          style={{ background: 'radial-gradient(circle at 50% 40%, rgba(56,225,255,0.09), transparent 70%)' }}
        >
          {game.board.map((cell, i) => {
            const inLine = game.line?.includes(i) ?? false;
            const blocked = over || cell !== null || aiTurn;
            const r = Math.floor(i / 3) + 1;
            const c = (i % 3) + 1;
            return (
              <button
                key={i}
                type="button"
                disabled={blocked}
                onClick={() => commit(i)}
                aria-label={`Row ${r}, column ${c}, ${cell ?? 'empty'}${i === fading ? ', will vanish next move' : ''}`}
                className="flex aspect-square items-center justify-center rounded-2xl border border-edge bg-panel transition-colors enabled:hover:bg-[#131a29] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-x"
                style={
                  inLine && game.winner
                    ? { borderColor: color(game.winner), boxShadow: `0 0 18px ${color(game.winner)}55` }
                    : undefined
                }
              >
                <AnimatePresence>{cell && <Mark key={cell} player={cell} fading={i === fading} />}</AnimatePresence>
              </button>
            );
          })}
        </div>

        {mode === 'vanishing' && (
          <p className="text-center text-sm text-slate-400">
            Each player keeps {MAX_MARKS} marks. Placing a fourth removes your oldest, shown faded.
          </p>
        )}

        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => startRound(over ? other(starter) : starter)}
            className="flex-1 rounded-xl bg-slate-100 py-2.5 font-semibold text-ink transition-colors hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-x"
          >
            New round
          </button>
          <button
            type="button"
            onClick={() => reconfigure(() => undefined)}
            className="rounded-xl border border-edge px-4 py-2.5 font-medium text-slate-300 transition-colors hover:text-white focus-visible:outline-2 focus-visible:outline-x"
          >
            Reset scores
          </button>
          <button
            type="button"
            aria-pressed={!muted}
            onClick={toggleSound}
            className="rounded-xl border border-edge px-4 py-2.5 font-medium text-slate-300 transition-colors hover:text-white focus-visible:outline-2 focus-visible:outline-x"
          >
            {muted ? 'Sound off' : 'Sound on'}
          </button>
        </div>

        <section aria-label="Settings" className="flex flex-col gap-3 border-t border-edge pt-5">
          <Segment
            label="Play against"
            value={opponent}
            options={[
              { value: 'ai', text: 'Computer' },
              { value: 'local', text: 'A friend' },
            ]}
            onChange={(v) => reconfigure(() => setOpponent(v))}
          />
          <Segment
            label="Rules"
            value={mode}
            options={[
              { value: 'classic', text: 'Classic' },
              { value: 'vanishing', text: 'Vanishing' },
            ]}
            onChange={(v) => reconfigure(() => setMode(v))}
          />
          {opponent === 'ai' && (
            <Segment
              label="Difficulty"
              value={level}
              options={[
                { value: 'easy', text: 'Easy' },
                { value: 'medium', text: 'Medium' },
                { value: 'hard', text: 'Hard' },
              ]}
              onChange={(v) => reconfigure(() => setLevel(v))}
            />
          )}
        </section>
      </main>
    </MotionConfig>
  );
}
