import { useEffect, useRef, useState } from 'react';
import { Crown } from 'lucide-react';
import type { Session } from '../../types';
import { leaders, rankings } from '../../game/engine';
import { Avatar, formatPoints } from '../ui';

interface Delta {
  id: number;
  teamId: string;
  delta: number;
}

/** Shows "+200" style floating labels whenever a team's score changes. */
function useScoreDeltas(session: Session) {
  const prev = useRef<Record<string, number>>({});
  const [deltas, setDeltas] = useState<Delta[]>([]);
  const counter = useRef(0);
  useEffect(() => {
    const next: Delta[] = [];
    for (const t of session.teams) {
      const before = prev.current[t.id];
      if (before != null && before !== t.score) next.push({ id: ++counter.current, teamId: t.id, delta: t.score - before });
      prev.current[t.id] = t.score;
    }
    if (next.length) {
      setDeltas((d) => [...d, ...next]);
      const ids = next.map((n) => n.id);
      setTimeout(() => setDeltas((d) => d.filter((x) => !ids.includes(x.id))), 1500);
    }
  }, [session.teams]);
  return deltas;
}

export function Scoreboard({ session, onSelectTeam, compact }: { session: Session; onSelectTeam?: (id: string) => void; compact?: boolean }) {
  const deltas = useScoreDeltas(session);
  const lead = leaders(session);
  const ranks = Object.fromEntries(rankings(session).map((r) => [r.id, r.rank]));
  const font = { fontFamily: session.game.theme.fontFamily };
  return (
    <div className="flex w-full gap-2 overflow-x-auto px-1 pb-1 pt-2.5 sm:gap-3" role="list" aria-label="Scoreboard">
      {session.teams.map((t, i) => {
        const active = session.activeTeamId === t.id;
        const isLeader = lead.includes(t.id);
        return (
          <button
            key={t.id}
            role="listitem"
            type="button"
            onClick={() => onSelectTeam?.(t.id)}
            className={`relative flex min-w-[140px] flex-1 cursor-pointer items-center gap-2 rounded-xl border-2 px-3 transition ${compact ? 'py-1.5' : 'py-2 sm:py-3'} ${
              active ? 'scale-[1.02] shadow-[0_0_24px_-4px] shadow-gold-500/60' : 'opacity-90 hover:opacity-100'
            }`}
            style={{ borderColor: active ? '#ffcc33' : t.color + '88', background: `linear-gradient(135deg, ${t.color}40, rgba(5,10,48,.9))` }}
            aria-label={`${t.name}: ${t.score} points${active ? ', active' : ''}${isLeader ? ', leading' : ''}`}
            title={`Select ${t.name} (key ${i + 1})`}
          >
            <Avatar avatar={t.avatar} color={t.color} size={compact ? 30 : 40} />
            <div className="min-w-0 flex-1 text-left">
              <div className="flex items-center gap-1 truncate text-sm font-bold sm:text-base">
                {isLeader && <Crown size={14} className="shrink-0 text-gold-400" fill="currentColor" aria-hidden />}
                <span className="truncate">{t.name}</span>
                <span className="ml-auto pl-1 text-[10px] font-semibold text-white/40">#{ranks[t.id]}</span>
              </div>
              <div key={t.score} className={`anim-pop leading-none ${t.score < 0 ? 'text-red-400' : 'text-gold-500'} ${compact ? 'text-xl' : 'text-2xl sm:text-3xl'}`} style={font}>
                {formatPoints(t.score)}
              </div>
            </div>
            {active && <span className="absolute -top-2 left-3 rounded bg-gold-500 px-1.5 text-[10px] font-black uppercase text-navy-900">Up next</span>}
            {deltas
              .filter((d) => d.teamId === t.id)
              .map((d) => (
                <span key={d.id} className={`anim-float pointer-events-none absolute -top-3 right-3 text-xl font-black ${d.delta > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {d.delta > 0 ? '+' : ''}
                  {d.delta.toLocaleString()}
                </span>
              ))}
          </button>
        );
      })}
    </div>
  );
}
