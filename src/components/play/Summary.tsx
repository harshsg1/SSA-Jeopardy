import { useEffect, useMemo } from 'react';
import confetti from 'canvas-confetti';
import { Home, Pencil, RotateCcw, Trophy } from 'lucide-react';
import type { Session } from '../../types';
import * as E from '../../game/engine';
import { allQuestions } from '../../lib/factory';
import { playSound } from '../../lib/sound';
import { navigate } from '../../lib/router';
import { useStore } from '../../store/store';
import { Avatar, Button, formatPoints } from '../ui';

function ScoreChart({ session }: { session: Session }) {
  const series = useMemo(() => {
    const totals: Record<string, number> = Object.fromEntries(session.teams.map((t) => [t.id, 0]));
    const pts: Record<string, number[]> = Object.fromEntries(session.teams.map((t) => [t.id, [0]]));
    for (const e of session.log) {
      if (totals[e.teamId] == null) continue;
      totals[e.teamId] += e.delta;
      for (const t of session.teams) pts[t.id].push(totals[t.id]);
    }
    return pts;
  }, [session]);
  const n = session.log.length + 1;
  if (n < 3) return null;
  const all = Object.values(series).flat();
  const min = Math.min(0, ...all);
  const max = Math.max(100, ...all);
  const W = 600;
  const H = 180;
  const x = (i: number) => (i / (n - 1)) * (W - 20) + 10;
  const y = (v: number) => H - 10 - ((v - min) / (max - min)) * (H - 20);
  return (
    <div className="panel p-4">
      <h3 className="mb-2 font-display text-xl text-gold-500">Score progression</h3>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Score progression chart">
        <line x1="10" x2={W - 10} y1={y(0)} y2={y(0)} stroke="rgba(255,255,255,.25)" strokeDasharray="4 4" />
        {session.teams.map((t) => (
          <polyline key={t.id} fill="none" stroke={t.color} strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" points={series[t.id].map((v, i) => `${x(i)},${y(v)}`).join(' ')} />
        ))}
      </svg>
      <div className="mt-1 flex flex-wrap gap-3 text-sm">
        {session.teams.map((t) => (
          <span key={t.id} className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: t.color }} /> {t.name}
          </span>
        ))}
      </div>
    </div>
  );
}

export function Summary({ session, celebrate }: { session: Session; celebrate?: boolean }) {
  const addSession = useStore((s) => s.addSession);
  const games = useStore((s) => s.games);
  const ranks = E.rankings(session);
  const winners = ranks.filter((r) => r.rank === 1);
  const total = allQuestions(session.game).length;
  const records = Object.values(session.played);
  const answered = records.filter((r) => r.status === 'answered').length;
  const skipped = records.filter((r) => r.status === 'skipped').length;
  const unanswered = records.filter((r) => r.status === 'revealed').length;
  const font = session.game.theme.fontFamily;

  useEffect(() => {
    if (!celebrate) return;
    playSound('win');
    const end = Date.now() + 2200;
    const colors = ['#ffcc33', '#ffffff', '#2f54ff', ...winners.map((w) => w.color)];
    const frame = () => {
      confetti({ particleCount: 5, angle: 60, spread: 70, origin: { x: 0, y: 0.7 }, colors });
      confetti({ particleCount: 5, angle: 120, spread: 70, origin: { x: 1, y: 0.7 }, colors });
      if (!stopped && Date.now() < end) requestAnimationFrame(frame);
    };
    let stopped = false;
    frame();
    return () => {
      stopped = true;
      confetti.reset();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [celebrate, session.id]);

  const playAgain = () => {
    const game = games.find((g) => g.id === session.gameId) ?? session.game;
    const s = E.createSession(game, session.teams.map(({ score: _score, ...t }) => t), { practice: session.practice });
    addSession(s);
    navigate(`/play/${s.id}`);
  };

  const podium = [ranks[1], ranks[0], ranks[2]].filter(Boolean);
  const heights: Record<number, string> = { 1: 'h-36', 2: 'h-24', 3: 'h-16' };

  return (
    <div className="mx-auto max-w-5xl px-4 pb-16 pt-6">
      <div className="text-center">
        <img src="/logo.png" alt="SFU SSA logo" className="mx-auto mb-3 h-20 w-20 rounded-full bg-white object-cover shadow-lg ring-2 ring-gold-500/70" />
        <Trophy className="mx-auto text-gold-500" size={56} />
        <div className="mt-1 text-sm font-bold uppercase tracking-[0.3em] text-blue-200/70">{session.game.title}</div>
        <h1 className="gold-shimmer font-display text-[clamp(40px,8vw,96px)] leading-none">
          {winners.length > 1 ? "IT'S A TIE!" : `${winners[0]?.name ?? 'Nobody'} WINS!`}
        </h1>
        {winners.length > 1 && <p className="mt-1 text-xl">{winners.map((w) => w.name).join(' & ')} share first place.</p>}
      </div>

      {/* podium */}
      <div className="mt-8 flex items-end justify-center gap-3 sm:gap-6">
        {podium.map((t, i) => {
          const place = Math.min(3, ranks.indexOf(t) + 1);
          return (
            <div key={t.id} className="anim-fade-up flex w-28 flex-col items-center sm:w-40" style={{ animationDelay: `${i * 0.15}s` }}>
              <Avatar avatar={t.avatar} color={t.color} size={place === 1 ? 72 : 54} />
              <div className="mt-1 max-w-full truncate font-bold">{t.name}</div>
              <div className={`text-2xl sm:text-3xl ${t.score < 0 ? 'text-red-400' : 'text-gold-500'}`} style={{ fontFamily: font }}>
                {formatPoints(t.score)}
              </div>
              <div className={`mt-2 flex w-full items-start justify-center rounded-t-xl pt-2 font-display text-4xl ${heights[place]}`} style={{ background: `linear-gradient(180deg, ${t.color}, ${t.color}55)` }}>
                {t.rank}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-8 grid gap-4 md:grid-cols-[1fr_280px]">
        <div className="panel overflow-x-auto p-4">
          <h3 className="mb-2 font-display text-xl text-gold-500">Final scores</h3>
          <table className="w-full text-left">
            <thead className="text-xs uppercase text-blue-200/60">
              <tr>
                <th className="py-1 pr-2">#</th>
                <th>{session.game.settings.mode === 'individual' ? 'Player' : 'Team'}</th>
                <th className="text-right">Score</th>
                <th className="text-right">Correct</th>
                <th className="text-right">Incorrect</th>
                <th className="text-right">Accuracy</th>
              </tr>
            </thead>
            <tbody>
              {ranks.map((t) => {
                const st = E.teamStats(session, t.id);
                const tot = st.correct + st.incorrect;
                return (
                  <tr key={t.id} className="border-t border-white/10">
                    <td className="py-2 pr-2 font-display text-xl">{t.rank}</td>
                    <td>
                      <span className="flex items-center gap-2 font-semibold">
                        <Avatar avatar={t.avatar} color={t.color} size={26} /> {t.name}
                      </span>
                    </td>
                    <td className={`text-right font-display text-xl ${t.score < 0 ? 'text-red-400' : 'text-gold-500'}`}>{formatPoints(t.score)}</td>
                    <td className="text-right text-emerald-400">{st.correct}</td>
                    <td className="text-right text-red-400">{st.incorrect}</td>
                    <td className="text-right">{tot ? Math.round((st.correct / tot) * 100) + '%' : '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="panel space-y-2 p-4">
          <h3 className="font-display text-xl text-gold-500">Game stats</h3>
          {[
            ['Duration', E.formatDuration(E.durationMs(session))],
            ['Clues played', `${records.length} of ${total}`],
            ['Answered correctly', answered],
            ['Nobody got it', unanswered],
            ['Skipped', skipped],
            ['Daily Doubles', session.dailyDoubles.length],
            ['Final Jeopardy', session.final ? 'Played' : 'Not played'],
            ['Date', new Date(session.endedAt ?? session.startedAt).toLocaleString()],
          ].map(([k, v]) => (
            <div key={k} className="flex justify-between gap-3 border-b border-white/5 pb-1 text-sm">
              <span className="text-blue-200/70">{k}</span>
              <span className="text-right font-semibold">{v}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-4">
        <ScoreChart session={session} />
      </div>

      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <Button variant="gold" size="lg" icon={<RotateCcw size={18} />} onClick={playAgain}>
          Play again
        </Button>
        <Button size="lg" icon={<Home size={18} />} onClick={() => navigate('/')}>
          Dashboard
        </Button>
        {games.some((g) => g.id === session.gameId) && (
          <Button size="lg" icon={<Pencil size={18} />} onClick={() => navigate(`/edit/${session.gameId}`)}>
            Edit game
          </Button>
        )}
      </div>
    </div>
  );
}
