import { useMemo } from 'react';
import { ArrowLeft, Trash2, Trophy } from 'lucide-react';
import { useStore } from '../store/store';
import { navigate } from '../lib/router';
import * as E from '../game/engine';
import { Button, IconButton, confirmDialog, formatPoints, toast } from '../components/ui';
import { Logo } from './Dashboard';

export default function Stats() {
  const sessions = useStore((s) => s.sessions);
  const games = useStore((s) => s.games);
  const deleteSession = useStore((s) => s.deleteSession);
  const clearHistory = useStore((s) => s.clearHistory);

  const finished = useMemo(() => sessions.filter((s) => s.status === 'finished' && !s.practice).sort((a, b) => (b.endedAt ?? 0) - (a.endedAt ?? 0)), [sessions]);

  const stats = useMemo(() => {
    const wins: Record<string, { name: string; wins: number; games: number; points: number; correct: number; incorrect: number }> = {};
    let clues = 0;
    let duration = 0;
    let correct = 0;
    let incorrect = 0;
    const perGame: Record<string, { title: string; plays: number }> = {};
    for (const s of finished) {
      clues += Object.keys(s.played).length;
      duration += E.durationMs(s);
      perGame[s.gameId] ??= { title: s.game.title, plays: 0 };
      perGame[s.gameId].plays++;
      const ranks = E.rankings(s);
      for (const t of ranks) {
        const key = t.name.trim().toLowerCase();
        const st = E.teamStats(s, t.id);
        wins[key] ??= { name: t.name, wins: 0, games: 0, points: 0, correct: 0, incorrect: 0 };
        wins[key].games++;
        wins[key].points += t.score;
        wins[key].correct += st.correct;
        wins[key].incorrect += st.incorrect;
        if (t.rank === 1) wins[key].wins++;
        correct += st.correct;
        incorrect += st.incorrect;
      }
    }
    return {
      clues,
      duration,
      correct,
      incorrect,
      leaderboard: Object.values(wins).sort((a, b) => b.wins - a.wins || b.points - a.points),
      perGame: Object.values(perGame).sort((a, b) => b.plays - a.plays),
    };
  }, [finished]);

  const cards: [string, string | number][] = [
    ['Saved games', games.filter((g) => !g.isTemplate).length],
    ['Games completed', finished.length],
    ['Clues played', stats.clues],
    ['Total play time', E.formatDuration(stats.duration)],
    ['Avg. game length', finished.length ? E.formatDuration(stats.duration / finished.length) : '—'],
    ['Answer accuracy', stats.correct + stats.incorrect ? Math.round((stats.correct / (stats.correct + stats.incorrect)) * 100) + '%' : '—'],
  ];

  return (
    <div className="mx-auto max-w-6xl px-4 pb-16 pt-5 sm:px-6">
      <header className="flex items-center justify-between gap-3">
        <Logo size="sm" />
        <Button icon={<ArrowLeft size={16} />} onClick={() => navigate('/')}>
          Dashboard
        </Button>
      </header>
      <h1 className="mt-6 font-display text-4xl text-gold-500">Statistics &amp; History</h1>

      <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        {cards.map(([k, v]) => (
          <div key={k} className="panel p-4">
            <div className="font-display text-3xl">{v}</div>
            <div className="text-sm text-blue-200/70">{k}</div>
          </div>
        ))}
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <div className="panel overflow-x-auto p-4">
          <h2 className="mb-2 font-display text-xl text-gold-500">All-time leaderboard</h2>
          {stats.leaderboard.length === 0 ? (
            <p className="text-blue-200/60">Finish a game to see team records.</p>
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="text-xs uppercase text-blue-200/60">
                <tr>
                  <th className="py-1">Team</th>
                  <th className="text-right">Wins</th>
                  <th className="text-right">Games</th>
                  <th className="text-right">Points</th>
                  <th className="text-right">Accuracy</th>
                </tr>
              </thead>
              <tbody>
                {stats.leaderboard.map((t) => (
                  <tr key={t.name} className="border-t border-white/10">
                    <td className="py-1.5 font-semibold">{t.name}</td>
                    <td className="text-right text-gold-500">{t.wins}</td>
                    <td className="text-right">{t.games}</td>
                    <td className="text-right">{formatPoints(t.points)}</td>
                    <td className="text-right">{t.correct + t.incorrect ? Math.round((t.correct / (t.correct + t.incorrect)) * 100) + '%' : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        <div className="panel p-4">
          <h2 className="mb-2 font-display text-xl text-gold-500">Most played games</h2>
          {stats.perGame.length === 0 ? (
            <p className="text-blue-200/60">No completed games yet.</p>
          ) : (
            <div className="space-y-1.5">
              {stats.perGame.map((g) => (
                <div key={g.title} className="flex items-center gap-2 text-sm">
                  <span className="w-40 truncate font-semibold">{g.title}</span>
                  <div className="h-3 flex-1 overflow-hidden rounded-full bg-white/10">
                    <div className="h-full bg-royal-500" style={{ width: `${(g.plays / stats.perGame[0].plays) * 100}%` }} />
                  </div>
                  <span className="w-6 text-right">{g.plays}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="mt-6 flex items-center justify-between">
        <h2 className="font-display text-2xl text-gold-500">Game history</h2>
        {finished.length > 0 && (
          <Button
            size="sm"
            variant="subtle"
            icon={<Trash2 size={14} />}
            onClick={async () => {
              if (await confirmDialog({ title: 'Clear history?', message: 'All completed game records will be deleted. Saved games are not affected.', confirmLabel: 'Clear', danger: true })) {
                clearHistory();
                toast('History cleared.');
              }
            }}
          >
            Clear history
          </Button>
        )}
      </div>
      <div className="mt-2 space-y-2">
        {finished.length === 0 && <div className="panel p-6 text-center text-blue-200/60">No completed games yet. Play one to build your history!</div>}
        {finished.map((s) => {
          const ranks = E.rankings(s);
          return (
            <div key={s.id} className="panel flex flex-wrap items-center gap-3 p-3">
              <Trophy className="text-gold-500" size={20} />
              <button type="button" className="min-w-0 flex-1 cursor-pointer text-left" onClick={() => navigate(`/summary/${s.id}`)}>
                <div className="truncate font-bold hover:underline">{s.game.title}</div>
                <div className="truncate text-sm text-blue-200/70">
                  {ranks.map((t) => `${t.rank}. ${t.name} (${formatPoints(t.score)})`).join(' · ')}
                </div>
              </button>
              <div className="text-right text-xs text-blue-200/50">
                <div>{new Date(s.endedAt ?? s.startedAt).toLocaleString()}</div>
                <div>{E.formatDuration(E.durationMs(s))}</div>
              </div>
              <IconButton label="Delete record" onClick={() => deleteSession(s.id)}>
                <Trash2 size={16} />
              </IconButton>
            </div>
          );
        })}
      </div>
    </div>
  );
}
