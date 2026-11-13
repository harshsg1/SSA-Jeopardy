import { useRef, useState } from 'react';
import { Dices, Flag, Minus, Pause, Play, Plus, RotateCcw, Shuffle, SkipForward, Trophy, Undo2, UserPlus, X } from 'lucide-react';
import type { GameSettings, Session } from '../../types';
import * as E from '../../game/engine';
import { createTeam } from '../../lib/factory';
import { useStore } from '../../store/store';
import { Avatar, Button, IconButton, Kbd, NumberInput, Toggle, confirmDialog, formatPoints, toast } from '../ui';
import { TeamRow } from '../TeamEditor';
import type { Apply } from './QuestionView';

const TABS = ['Scores', 'Game', 'Teams', 'Settings', 'Log'] as const;
type Tab = (typeof TABS)[number];

export const SHORTCUTS: [string, string][] = [
  ['1–9', 'Select team'],
  ['Space', 'Reveal answer'],
  ['C', 'Selected team correct'],
  ['X', 'Selected team incorrect'],
  ['S', 'Skip question'],
  ['I', 'Show hint'],
  ['T', 'Pause / resume timer'],
  ['Esc', 'Return to board'],
  ['R', 'Random question'],
  ['U', 'Undo last scoring action'],
  ['P', 'Pause / resume game'],
  ['H', 'Toggle host panel'],
  ['F', 'Presentation mode (fullscreen)'],
  ['?', 'Show shortcuts'],
];

export function HostPanel({
  session,
  apply,
  onClose,
  onRandomQuestion,
  onUndo,
  onEnd,
  onFinal,
}: {
  session: Session;
  apply: Apply;
  onClose: () => void;
  onRandomQuestion: () => void;
  onUndo: () => void;
  onEnd: () => void;
  onFinal: () => void;
}) {
  const [tab, setTab] = useState<Tab>('Scores');
  const [amount, setAmount] = useState(100);
  const prefs = useStore((s) => s.prefs);
  const setPrefs = useStore((s) => s.setPrefs);
  const p = E.progress(session);
  const settings = session.game.settings;
  const setSettings = (patch: Partial<GameSettings>) => apply((s) => ({ ...s, game: { ...s.game, settings: { ...s.game.settings, ...patch } } }));
  const lastUndo = session.undo[session.undo.length - 1];
  const label = settings.mode === 'individual' ? 'player' : 'team';

  return (
    <aside className="anim-fade-up fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col border-l border-white/15 bg-navy-900/97 text-white shadow-2xl backdrop-blur" aria-label="Host control panel">
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
        <h2 className="font-display text-2xl text-gold-500">Host Controls</h2>
        <IconButton label="Close host panel" onClick={onClose}>
          <X size={20} />
        </IconButton>
      </div>
      <div className="flex gap-1 border-b border-white/10 px-2 py-1.5" role="tablist">
        {TABS.map((t) => (
          <button key={t} role="tab" aria-selected={tab === t} type="button" onClick={() => setTab(t)} className={`flex-1 cursor-pointer rounded-lg px-2 py-1.5 text-sm font-semibold ${tab === t ? 'bg-gold-500 text-navy-900' : 'hover:bg-white/10'}`}>
            {t}
          </button>
        ))}
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        {tab === 'Scores' && (
          <>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-blue-200/80">Amount</span>
              <NumberInput className="!w-28 !py-1.5" value={amount} min={1} max={1000000} step={100} onChange={setAmount} aria-label="Adjustment amount" />
              {[100, 200, 500].map((v) => (
                <Button key={v} size="sm" variant={amount === v ? 'primary' : 'ghost'} onClick={() => setAmount(v)}>
                  {v}
                </Button>
              ))}
            </div>
            <div className="space-y-2">
              {session.teams.map((t) => (
                <div key={t.id} className={`rounded-xl border-2 p-2.5 ${session.activeTeamId === t.id ? 'border-gold-500 bg-gold-500/10' : 'border-white/10 bg-white/[0.03]'}`}>
                  <div className="flex items-center gap-2">
                    <Avatar avatar={t.avatar} color={t.color} size={32} />
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-semibold">{t.name}</div>
                    </div>
                    <ScoreEdit score={t.score} onSet={(v) => apply((s) => E.setScore(s, t.id, v))} name={t.name} />
                  </div>
                  <div className="mt-2 flex gap-1.5">
                    <Button size="sm" variant="success" className="flex-1" icon={<Plus size={14} />} onClick={() => apply((s) => E.adjustScore(s, t.id, amount, 'Host award'))} aria-label={`Award ${amount} to ${t.name}`}>
                      {amount}
                    </Button>
                    <Button size="sm" variant="danger" className="flex-1" icon={<Minus size={14} />} onClick={() => apply((s) => E.adjustScore(s, t.id, -amount, 'Host deduction'))} aria-label={`Deduct ${amount} from ${t.name}`}>
                      {amount}
                    </Button>
                    <Button size="sm" variant={session.activeTeamId === t.id ? 'gold' : 'ghost'} onClick={() => apply((s) => E.setActiveTeam(s, t.id))}>
                      {session.activeTeamId === t.id ? 'Active' : 'Set active'}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <Button
                className="flex-1"
                icon={<Dices size={16} />}
                onClick={() => {
                  const id = E.randomTeamId(session);
                  if (id) {
                    apply((s) => E.setActiveTeam(s, id));
                    toast(`${session.teams.find((t) => t.id === id)?.name} is up!`);
                  }
                }}
              >
                Random {label}
              </Button>
              <Button className="flex-1" icon={<Undo2 size={16} />} disabled={!lastUndo} onClick={onUndo}>
                Undo
              </Button>
            </div>
            {lastUndo && <p className="text-xs text-blue-200/50">Undo will revert: {lastUndo.label}</p>}
          </>
        )}

        {tab === 'Game' && (
          <>
            <div>
              <div className="mb-1 flex justify-between text-sm">
                <span className="font-semibold">Progress</span>
                <span>
                  {p.done}/{p.total} clues · {p.pct}%
                </span>
              </div>
              <div className="h-2.5 overflow-hidden rounded-full bg-white/10">
                <div className="h-full bg-gold-500 transition-all" style={{ width: `${p.pct}%` }} />
              </div>
              <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-0.5 text-xs text-blue-200/70">
                {session.game.categories.map((c) => (
                  <div key={c.id} className="flex justify-between gap-2">
                    <span className="truncate">{c.name}</span>
                    <span>{c.questions.filter((q) => !session.played[q.id]).length} left</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Button icon={session.paused ? <Play size={16} /> : <Pause size={16} />} onClick={() => apply(session.paused ? E.resume : E.pause)}>
                {session.paused ? 'Resume game' : 'Pause game'}
              </Button>
              <Button icon={<Shuffle size={16} />} disabled={session.status !== 'playing' || !!session.current || p.remaining === 0} onClick={onRandomQuestion}>
                Random clue
              </Button>
              <Button icon={<Undo2 size={16} />} disabled={!lastUndo} onClick={onUndo}>
                Undo last
              </Button>
              <Button
                icon={<RotateCcw size={16} />}
                onClick={async () => {
                  if (await confirmDialog({ title: 'Restart game?', message: 'All scores and played clues will be reset.', confirmLabel: 'Restart', danger: true })) {
                    apply(E.restart);
                    toast('Game restarted.');
                  }
                }}
              >
                Restart
              </Button>
              {session.status === 'playing' && (
                <Button variant="primary" icon={<Trophy size={16} />} onClick={onFinal} className="col-span-2">
                  {E.finalEnabled(session) ? 'Go to Final Jeopardy' : 'Finish game & show results'}
                </Button>
              )}
              <Button variant="danger" icon={<Flag size={16} />} onClick={onEnd} className="col-span-2">
                End game now
              </Button>
            </div>

            {session.status === 'playing' && (
              <div>
                <h3 className="mb-1 text-sm font-semibold text-blue-200/80">Clues (host view — answers &amp; Daily Doubles visible)</h3>
                <div className="max-h-72 space-y-1 overflow-y-auto pr-1 text-sm">
                  {session.game.categories.map((c) => (
                    <details key={c.id} className="rounded-lg bg-white/5 px-2 py-1">
                      <summary className="cursor-pointer font-semibold">{c.name}</summary>
                      {c.questions.map((q) => {
                        const rec = session.played[q.id];
                        return (
                          <div key={q.id} className="flex items-center gap-2 border-t border-white/5 py-1">
                            <span className="w-12 font-display text-gold-500">{q.value}</span>
                            <span className={`min-w-0 flex-1 truncate ${rec ? 'line-through opacity-50' : ''}`} title={q.prompt}>
                              {E.isDailyDouble(session, q.id) ? '★ ' : ''}
                              {q.answer || q.prompt || '(empty)'}
                            </span>
                            {rec ? (
                              <Button size="sm" variant="subtle" onClick={() => apply((s) => E.reopenTile(s, q.id))} disabled={!!session.current}>
                                Reopen
                              </Button>
                            ) : (
                              <>
                                <Button size="sm" variant="subtle" disabled={!!session.current} onClick={() => (apply((s) => E.openQuestion(s, q.id)), onClose())}>
                                  Open
                                </Button>
                                <IconButton label="Skip this clue" disabled={!!session.current} onClick={() => apply((s) => E.skipQuestion(s, q.id))}>
                                  <SkipForward size={14} />
                                </IconButton>
                              </>
                            )}
                          </div>
                        );
                      })}
                    </details>
                  ))}
                </div>
              </div>
            )}

            {session.game.notes && (
              <div className="rounded-xl bg-amber-500/10 p-3 text-sm">
                <div className="mb-1 font-semibold text-amber-300">Host notes</div>
                <p className="whitespace-pre-wrap text-amber-100/90">{session.game.notes}</p>
              </div>
            )}
          </>
        )}

        {tab === 'Teams' && (
          <>
            <div className="space-y-2">
              {session.teams.map((t, i) => (
                <TeamRow
                  key={t.id}
                  team={t}
                  index={i}
                  count={session.teams.length}
                  label={label}
                  onChange={(patch) => apply((s) => E.updateTeam(s, t.id, patch))}
                  onMove={(to) => apply((s) => E.moveTeam(s, i, to))}
                  onRemove={async () => {
                    if (await confirmDialog({ title: `Remove ${t.name}?`, message: `Their score of ${formatPoints(t.score)} will be removed from the game.`, confirmLabel: 'Remove', danger: true }))
                      apply((s) => E.removeTeam(s, t.id));
                  }}
                />
              ))}
            </div>
            {!session.practice && (
              <Button icon={<UserPlus size={16} />} onClick={() => apply((s) => E.addTeam(s, createTeam(s.teams.length, `${label === 'player' ? 'Player' : 'Team'} ${s.teams.length + 1}`)))}>
                Add {label}
              </Button>
            )}
          </>
        )}

        {tab === 'Settings' && (
          <>
            <div className="rounded-xl bg-white/5 p-2">
              <Toggle checked={prefs.soundEnabled} onChange={(soundEnabled) => setPrefs({ soundEnabled })} label="Sound effects" />
              <Toggle checked={prefs.musicEnabled} onChange={(musicEnabled) => setPrefs({ musicEnabled })} label="Final Jeopardy music" />
              <label className="flex items-center gap-3 px-2 py-2">
                <span className="w-16 font-medium">Volume</span>
                <input type="range" min={0} max={1} step={0.05} value={prefs.volume} onChange={(e) => setPrefs({ volume: Number(e.target.value) })} className="flex-1 accent-yellow-400" aria-label="Volume" />
                <span className="w-10 text-right text-sm">{Math.round(prefs.volume * 100)}%</span>
              </label>
            </div>
            <div className="rounded-xl bg-white/5 p-2">
              <Toggle checked={settings.timerEnabled} onChange={(timerEnabled) => setSettings({ timerEnabled })} label="Question timer" />
              {settings.timerEnabled && (
                <label className="flex items-center gap-3 px-2 py-1">
                  <span className="font-medium">Seconds</span>
                  <NumberInput className="!w-24 !py-1" value={settings.timerSeconds} min={3} max={600} onChange={(timerSeconds) => setSettings({ timerSeconds })} />
                </label>
              )}
              <Toggle checked={settings.negativeScoring} onChange={(negativeScoring) => setSettings({ negativeScoring })} label="Negative scoring" />
              <Toggle checked={settings.allowMultipleAttempts} onChange={(allowMultipleAttempts) => setSettings({ allowMultipleAttempts })} label="Allow multiple attempts" />
              <Toggle checked={settings.correctPicksNext} onChange={(correctPicksNext) => setSettings({ correctPicksNext })} label="Correct team picks next" />
              <Toggle checked={settings.autoRevealOnCorrect} onChange={(autoRevealOnCorrect) => setSettings({ autoRevealOnCorrect })} label="Auto-reveal on correct" />
              <Toggle checked={settings.showHints} onChange={(showHints) => setSettings({ showHints })} label="Allow hints" />
            </div>
            <div>
              <h3 className="mb-1 text-sm font-semibold text-blue-200/80">Keyboard shortcuts</h3>
              <div className="grid grid-cols-1 gap-1 text-sm">
                {SHORTCUTS.map(([k, d]) => (
                  <div key={k} className="flex items-center justify-between">
                    <span className="text-blue-100">{d}</span>
                    <Kbd>{k}</Kbd>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {tab === 'Log' && (
          <div className="space-y-1">
            {session.log.length === 0 && <p className="text-blue-200/60">No scoring yet.</p>}
            {[...session.log].reverse().map((e) => {
              const t = session.teams.find((x) => x.id === e.teamId);
              return (
                <div key={e.id} className="flex items-center gap-2 rounded-lg bg-white/5 px-2 py-1.5 text-sm">
                  <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: t?.color ?? '#888' }} />
                  <span className="w-24 shrink-0 truncate font-semibold">{t?.name ?? 'Removed'}</span>
                  <span className="min-w-0 flex-1 truncate text-blue-200/70">{e.label}</span>
                  <span className={`font-display ${e.delta > 0 ? 'text-emerald-400' : e.delta < 0 ? 'text-red-400' : 'text-blue-200/50'}`}>
                    {e.delta > 0 ? '+' : ''}
                    {e.delta}
                  </span>
                  <span className="w-12 text-right text-xs text-blue-200/40">{new Date(e.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </aside>
  );
}

function ScoreEdit({ score, onSet, name }: { score: number; onSet: (v: number) => void; name: string }) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState('');
  const cancelled = useRef(false);
  if (!editing)
    return (
      <button
        type="button"
        title="Click to edit score"
        aria-label={`Edit ${name} score, currently ${score}`}
        onClick={() => {
          setText(String(score));
          cancelled.current = false;
          setEditing(true);
        }}
        className={`cursor-pointer rounded-lg px-2 py-0.5 font-display text-2xl hover:bg-white/10 ${score < 0 ? 'text-red-400' : 'text-gold-500'}`}
      >
        {formatPoints(score)}
      </button>
    );
  const commit = () => {
    if (cancelled.current) return;
    cancelled.current = true;
    const n = Number(text);
    if (text.trim() !== '' && Number.isFinite(n)) onSet(Math.round(n));
    else toast('Enter a valid number.', 'error');
    setEditing(false);
  };
  return (
    <input
      autoFocus
      type="number"
      className="input !w-28 !py-1 text-right font-display text-xl"
      value={text}
      aria-label={`${name} score`}
      onChange={(e) => setText(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        e.stopPropagation();
        if (e.key === 'Enter') commit();
        if (e.key === 'Escape') {
          cancelled.current = true;
          setEditing(false);
        }
      }}
    />
  );
}
