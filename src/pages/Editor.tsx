import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, ArrowLeft, Check, Download, Loader2, Play, Save, Trash2 } from 'lucide-react';
import type { Game, GameSettings, BoardTheme } from '../types';
import { flushStorage, onSaveState, useStore } from '../store/store';
import { navigate } from '../lib/router';
import { downloadJSON, safeFilename } from '../lib/files';
import { FONT_OPTIONS } from '../lib/factory';
import { validateGame } from '../lib/validate';
import { Button, Field, NumberInput, Toggle, toast } from '../components/ui';
import { BoardEditor } from '../components/editor/BoardEditor';
import { MediaInput } from '../components/editor/MediaInput';
import { TeamListEditor } from '../components/TeamEditor';
import { StartGameDialog } from '../components/StartGameDialog';
import { BoardPreview } from '../components/play/Board';

const TABS = ['Board', 'Final Jeopardy', 'Teams', 'Rules', 'Appearance', 'Notes'] as const;
type Tab = (typeof TABS)[number];

function SaveIndicator() {
  const [state, setState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  useEffect(() => onSaveState(setState), []);
  if (state === 'saving')
    return (
      <span className="flex items-center gap-1 text-sm text-blue-200/70">
        <Loader2 size={14} className="animate-spin" /> Saving…
      </span>
    );
  if (state === 'error') return <span className="text-sm text-red-400">Save failed</span>;
  return (
    <span className="flex items-center gap-1 text-sm text-emerald-400">
      <Check size={14} /> All changes saved
    </span>
  );
}

export default function Editor({ gameId }: { gameId: string }) {
  const game = useStore((s) => s.games.find((g) => g.id === gameId));
  const updateGame = useStore((s) => s.updateGame);
  const [tab, setTab] = useState<Tab>('Board');
  const [starting, setStarting] = useState(false);
  const issues = useMemo(() => (game ? validateGame(game) : []), [game]);

  // Ctrl/Cmd+S = save now
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        void flushStorage().then(() => toast('Game saved.', 'success'));
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  if (!game)
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3">
        <p className="text-xl">Game not found.</p>
        <Button variant="gold" onClick={() => navigate('/')}>
          Back to dashboard
        </Button>
      </div>
    );

  const update = (fn: (g: Game) => Game) => updateGame(game.id, fn);
  const setSettings = (patch: Partial<GameSettings>) => update((g) => ({ ...g, settings: { ...g.settings, ...patch } }));
  const setTheme = (patch: Partial<BoardTheme>) => update((g) => ({ ...g, theme: { ...g.theme, ...patch } }));

  return (
    <div className="mx-auto max-w-[1600px] px-3 pb-16 pt-4 sm:px-6">
      <header className="sticky top-0 z-30 -mx-3 mb-4 flex flex-wrap items-center gap-3 border-b border-white/10 bg-navy-900/85 px-3 py-3 backdrop-blur sm:-mx-6 sm:px-6">
        <Button variant="subtle" size="sm" icon={<ArrowLeft size={16} />} onClick={() => navigate('/')}>
          Dashboard
        </Button>
        <input
          className="min-w-0 flex-1 rounded-lg bg-transparent px-2 py-1 font-display text-2xl tracking-wide outline-none hover:bg-white/5 focus:bg-white/5 sm:text-3xl"
          value={game.title}
          aria-label="Game title"
          placeholder="Game title"
          maxLength={80}
          onChange={(e) => update((g) => ({ ...g, title: e.target.value }))}
        />
        <SaveIndicator />
        <Button size="sm" icon={<Save size={15} />} onClick={() => void flushStorage().then(() => toast('Game saved.', 'success'))}>
          Save
        </Button>
        <Button size="sm" icon={<Download size={15} />} onClick={() => downloadJSON(`${safeFilename(game.title)}.json`, game)}>
          Export
        </Button>
        <Button variant="gold" icon={<Play size={16} />} onClick={() => setStarting(true)}>
          Play
        </Button>
      </header>

      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-start">
        <textarea
          className="input min-h-11 flex-1 resize-y"
          rows={1}
          placeholder="Game description (optional)"
          value={game.description}
          onChange={(e) => update((g) => ({ ...g, description: e.target.value }))}
          aria-label="Game description"
        />
        {issues.length > 0 && (
          <details className="rounded-xl border border-amber-400/30 bg-amber-500/10 px-3 py-2 text-sm lg:w-96">
            <summary className="flex cursor-pointer items-center gap-1.5 font-semibold text-amber-300">
              <AlertTriangle size={15} /> {issues.length} item{issues.length > 1 ? 's' : ''} to review
            </summary>
            <ul className="mt-1 max-h-48 space-y-0.5 overflow-y-auto text-amber-100/90">
              {issues.map((i, k) => (
                <li key={k}>• {i.message}</li>
              ))}
            </ul>
          </details>
        )}
      </div>

      <nav className="mb-4 flex gap-1 overflow-x-auto rounded-xl bg-white/5 p-1" role="tablist">
        {TABS.map((t) => (
          <button
            key={t}
            role="tab"
            aria-selected={tab === t}
            type="button"
            onClick={() => setTab(t)}
            className={`shrink-0 cursor-pointer rounded-lg px-4 py-2 font-semibold transition ${tab === t ? 'bg-gold-500 text-navy-900' : 'text-blue-100 hover:bg-white/10'}`}
          >
            {t}
          </button>
        ))}
      </nav>

      {tab === 'Board' && <BoardEditor game={game} update={update} issues={issues} />}

      {tab === 'Final Jeopardy' && (
        <div className="panel max-w-3xl space-y-4 p-5">
          <Toggle
            checked={game.finalRound.enabled}
            onChange={(enabled) => update((g) => ({ ...g, finalRound: { ...g.finalRound, enabled } }))}
            label="Include Final Jeopardy"
            description="After the board is cleared, every team privately wagers and answers one last question."
          />
          <Field label="Final category">
            <input className="input" value={game.finalRound.category} placeholder="e.g. Famous Inventions" onChange={(e) => update((g) => ({ ...g, finalRound: { ...g.finalRound, category: e.target.value } }))} />
          </Field>
          <Field label="Final question">
            <textarea className="input min-h-24" value={game.finalRound.question} onChange={(e) => update((g) => ({ ...g, finalRound: { ...g.finalRound, question: e.target.value } }))} />
          </Field>
          <Field label="Correct answer">
            <input className="input" value={game.finalRound.answer} onChange={(e) => update((g) => ({ ...g, finalRound: { ...g.finalRound, answer: e.target.value } }))} />
          </Field>
          <Field label="Image (optional)">
            <MediaInput kind="image" value={game.finalRound.image || undefined} onChange={(image) => update((g) => ({ ...g, finalRound: { ...g.finalRound, image: image ?? '' } }))} />
          </Field>
          <Field label="Thinking time (seconds)">
            <NumberInput className="!w-32" value={game.finalRound.timerSeconds} min={5} max={600} onChange={(timerSeconds) => update((g) => ({ ...g, finalRound: { ...g.finalRound, timerSeconds } }))} />
          </Field>
        </div>
      )}

      {tab === 'Teams' && (
        <div className="panel max-w-3xl p-5">
          <div className="mb-3 inline-flex rounded-xl bg-white/5 p-1">
            {(['teams', 'individual'] as const).map((m) => (
              <button key={m} type="button" onClick={() => setSettings({ mode: m })} className={`cursor-pointer rounded-lg px-3 py-1.5 font-semibold ${game.settings.mode === m ? 'bg-gold-500 text-navy-900' : 'text-blue-100'}`}>
                {m === 'teams' ? 'Team mode' : 'Individual players'}
              </button>
            ))}
          </div>
          <p className="mb-3 text-sm text-blue-200/70">This roster is pre-filled when you start the game. You can still change it before and during play.</p>
          <TeamListEditor teams={game.teams} onChange={(teams) => update((g) => ({ ...g, teams }))} mode={game.settings.mode} />
        </div>
      )}

      {tab === 'Rules' && (
        <div className="grid max-w-5xl gap-4 md:grid-cols-2">
          <div className="panel space-y-1 p-5">
            <h3 className="mb-2 font-display text-xl text-gold-500">Scoring</h3>
            <Toggle checked={game.settings.negativeScoring} onChange={(negativeScoring) => setSettings({ negativeScoring })} label="Negative scoring" description="Deduct points for incorrect answers." />
            <Toggle checked={game.settings.allowMultipleAttempts} onChange={(allowMultipleAttempts) => setSettings({ allowMultipleAttempts })} label="Allow multiple attempts" description="Other teams may try after a wrong answer." />
            <Toggle checked={game.settings.correctPicksNext} onChange={(correctPicksNext) => setSettings({ correctPicksNext })} label="Correct team picks next" description="The team that answers correctly becomes the active team." />
            <Toggle checked={game.settings.autoRevealOnCorrect} onChange={(autoRevealOnCorrect) => setSettings({ autoRevealOnCorrect })} label="Auto-reveal answer when correct" />
            <Toggle checked={game.settings.showHints} onChange={(showHints) => setSettings({ showHints })} label="Allow hints" description="Show the hint button for clues that have one." />
          </div>
          <div className="panel space-y-3 p-5">
            <h3 className="font-display text-xl text-gold-500">Timer</h3>
            <Toggle checked={game.settings.timerEnabled} onChange={(timerEnabled) => setSettings({ timerEnabled })} label="Question timer" description="Turn off to play without timers." />
            {game.settings.timerEnabled && (
              <Field label="Seconds per question">
                <NumberInput className="!w-32" value={game.settings.timerSeconds} min={3} max={600} onChange={(timerSeconds) => setSettings({ timerSeconds })} />
              </Field>
            )}
          </div>
          <div className="panel space-y-3 p-5 md:col-span-2">
            <h3 className="font-display text-xl text-gold-500">Daily Doubles</h3>
            <p className="text-sm text-blue-200/70">
              Mark specific clues as Daily Doubles in the question editor ({game.categories.flatMap((c) => c.questions).filter((q) => q.dailyDouble).length} designated), and/or add random ones at game start.
            </p>
            <Toggle checked={game.settings.randomDailyDoubles} onChange={(randomDailyDoubles) => setSettings({ randomDailyDoubles })} label="Random Daily Doubles" />
            <div className="grid gap-3 sm:grid-cols-4">
              {game.settings.randomDailyDoubles && (
                <Field label="Random count">
                  <NumberInput value={game.settings.randomDailyDoubleCount} min={0} max={20} onChange={(randomDailyDoubleCount) => setSettings({ randomDailyDoubleCount })} />
                </Field>
              )}
              <Field label="Minimum wager">
                <NumberInput value={game.settings.ddMinWager} min={0} onChange={(ddMinWager) => setSettings({ ddMinWager })} />
              </Field>
              <Field label="Maximum wager rule">
                <select className="input" value={game.settings.ddMaxRule} onChange={(e) => setSettings({ ddMaxRule: e.target.value as GameSettings['ddMaxRule'] })}>
                  <option value="score_or_board_max">Score or top board value</option>
                  <option value="score_only">Current score only</option>
                  <option value="custom">Fixed maximum</option>
                </select>
              </Field>
              {game.settings.ddMaxRule === 'custom' && (
                <Field label="Fixed maximum">
                  <NumberInput value={game.settings.ddCustomMax} min={0} onChange={(ddCustomMax) => setSettings({ ddCustomMax })} />
                </Field>
              )}
            </div>
          </div>
        </div>
      )}

      {tab === 'Appearance' && (
        <div className="grid gap-4 lg:grid-cols-[380px_1fr]">
          <div className="panel space-y-4 p-5">
            <Field label="Layout">
              <div className="flex gap-2">
                {(['classic', 'modern'] as const).map((l) => (
                  <button key={l} type="button" onClick={() => setTheme({ layout: l })} className={`flex-1 cursor-pointer rounded-xl border px-3 py-2 font-semibold capitalize ${game.theme.layout === l ? 'border-gold-500 bg-gold-500/15' : 'border-white/15'}`}>
                    {l}
                  </button>
                ))}
              </div>
            </Field>
            <div className="grid grid-cols-2 gap-3">
              {(
                [
                  ['boardColor', 'Background'],
                  ['tileColor', 'Tiles'],
                  ['valueColor', 'Values'],
                  ['textColor', 'Text'],
                ] as const
              ).map(([k, label]) => (
                <Field key={k} label={label}>
                  <div className="flex items-center gap-2">
                    <input type="color" value={game.theme[k]} onChange={(e) => setTheme({ [k]: e.target.value })} className="h-9 w-12 cursor-pointer rounded-lg border border-white/20 bg-transparent p-0.5" aria-label={`${label} color`} />
                    <span className="font-mono text-xs text-blue-200/60">{game.theme[k]}</span>
                  </div>
                </Field>
              ))}
            </div>
            <Field label="Font">
              <select className="input" value={game.theme.fontFamily} onChange={(e) => setTheme({ fontFamily: e.target.value })} style={{ fontFamily: game.theme.fontFamily }}>
                {FONT_OPTIONS.map((f) => (
                  <option key={f.value} value={f.value} style={{ fontFamily: f.value }}>
                    {f.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Background image">
              <MediaInput kind="image" value={game.theme.backgroundImage || undefined} onChange={(v) => setTheme({ backgroundImage: v ?? '' })} />
            </Field>
            <Button
              size="sm"
              variant="subtle"
              icon={<Trash2 size={14} />}
              onClick={() => setTheme({ boardColor: '#050a30', tileColor: '#0a1a8f', valueColor: '#ffcc33', textColor: '#ffffff', fontFamily: FONT_OPTIONS[0].value, backgroundImage: '', layout: 'classic' })}
            >
              Reset to classic look
            </Button>
          </div>
          <div className="panel overflow-hidden p-3">
            <div className="mb-2 text-sm font-semibold text-blue-200/70">Live preview</div>
            <div className="h-[460px]">
              <BoardPreview game={game} />
            </div>
          </div>
        </div>
      )}

      {tab === 'Notes' && (
        <div className="panel max-w-3xl p-5">
          <Field label="Host notes (private — never shown to players)">
            <textarea className="input min-h-64" value={game.notes} onChange={(e) => update((g) => ({ ...g, notes: e.target.value }))} placeholder="Reminders, tie-breaker questions, prize info…" />
          </Field>
        </div>
      )}

      <StartGameDialog gameId={game.id} open={starting} onClose={() => setStarting(false)} />
    </div>
  );
}
