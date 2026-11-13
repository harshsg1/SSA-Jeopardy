import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Check, Eye, ExternalLink, Lightbulb, Pause, Play, RotateCcw, SkipForward, Star, X } from 'lucide-react';
import type { Question, Session } from '../../types';
import * as E from '../../game/engine';
import { correctAnswerText, isAcceptedAnswer } from '../../lib/answers';
import { playSound } from '../../lib/sound';
import { Avatar, Button, Kbd, formatPoints } from '../ui';
import { MediaPreview } from '../editor/MediaInput';
import { themeStyle } from './Board';
import { TimerBar, useCountdown } from './Timer';

export type Apply = (fn: (s: Session) => Session) => void;

export interface QuestionHandle {
  correct: () => void;
  incorrect: () => void;
  reveal: () => void;
  skip: () => void;
  close: () => void;
  hint: () => void;
  toggleTimer: () => void;
  selectTeam: (index: number) => void;
}

function PromptText({ q, font }: { q: Question; font: string }) {
  if (!q.prompt.trim() && !q.media.image && !q.media.audio && !q.media.video) return <p className="text-2xl italic opacity-50">(This clue has no text yet)</p>;
  const parts = q.type === 'fill_blank' ? q.prompt.split(/(_{2,})/g) : [q.prompt];
  const len = q.prompt.length;
  const size = len > 220 ? 'clamp(20px, 2.6vw, 40px)' : len > 110 ? 'clamp(24px, 3.4vw, 54px)' : 'clamp(28px, 4.6vw, 76px)';
  return (
    <h2 className="text-shadow-game mx-auto max-w-6xl text-balance text-center font-bold uppercase leading-tight" style={{ fontFamily: font, fontSize: size }}>
      {parts.map((p, i) =>
        /^_{2,}$/.test(p) ? (
          <span key={i} className="mx-2 inline-block min-w-[3em] border-b-[0.12em] border-current align-baseline" style={{ color: 'var(--value-color)' }}>
            &nbsp;
          </span>
        ) : (
          <span key={i}>{p}</span>
        ),
      )}
    </h2>
  );
}

export function QuestionView({ session, apply, registerHandle }: { session: Session; apply: Apply; registerHandle: (h: QuestionHandle | null) => void }) {
  const c = session.current!;
  const found = E.getQuestion(session, c.questionId)!;
  const { question: q, category } = found;
  const settings = session.game.settings;
  const font = session.game.theme.fontFamily;
  const isDD = c.ddTeamId != null;
  const eligible = E.eligibleTeams(session);
  const stake = E.currentStake(session);
  const answered = c.attempts.some((a) => a.correct);
  const done = c.revealed || eligible.length === 0;

  // Which team the C / X shortcuts apply to.
  const [answeringId, setAnsweringId] = useState<string | null>(null);
  const answering = eligible.find((t) => t.id === answeringId) ?? eligible.find((t) => t.id === session.activeTeamId) ?? eligible[0] ?? null;

  const timerOn = settings.timerEnabled && c.phase === 'question';
  const timer = useCountdown(settings.timerSeconds, { autoStart: true, paused: session.paused || !timerOn || done });

  // --- sounds on phase changes ---
  useEffect(() => {
    if (c.phase === 'dd_splash') playSound('dailyDouble');
    else if (c.phase === 'question' && !c.revealed && c.attempts.length === 0) playSound('reveal');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [c.phase, c.questionId]);

  const correct = (teamId?: string) => {
    const id = teamId ?? answering?.id;
    if (!id || c.phase !== 'question' || !eligible.some((t) => t.id === id)) return;
    playSound('correct');
    apply((s) => E.markCorrect(s, id));
  };
  const incorrect = (teamId?: string) => {
    const id = teamId ?? answering?.id;
    if (!id || c.phase !== 'question' || !eligible.some((t) => t.id === id)) return;
    playSound('incorrect');
    setAnsweringId(null);
    apply((s) => E.markIncorrect(s, id));
    if (settings.timerEnabled && settings.allowMultipleAttempts && !isDD) timer.reset();
  };
  const reveal = () => {
    if (c.phase === 'dd_splash') return apply(E.ddToWager);
    if (c.phase === 'dd_wager') return;
    if (!c.revealed) {
      playSound('reveal');
      apply(E.revealAnswer);
    }
  };
  const close = () => apply(E.closeQuestion);
  const skip = () => apply((s) => E.skipQuestion(s));
  const hint = () => q.hint && settings.showHints && apply(E.showHint);

  useEffect(() => {
    registerHandle({
      correct: () => correct(),
      incorrect: () => incorrect(),
      reveal,
      skip,
      close,
      hint,
      toggleTimer: timer.toggle,
      selectTeam: (i) => {
        const t = session.teams[i];
        if (!t) return;
        if (c.phase === 'dd_wager' || c.phase === 'dd_splash') apply((s) => E.setDDTeam(s, t.id));
        else if (eligible.some((e) => e.id === t.id)) setAnsweringId(t.id);
      },
    });
    return () => registerHandle(null);
  });

  return (
    <div className="anim-zoom fixed inset-0 z-40 flex flex-col" style={themeStyle(session.game)} role="dialog" aria-modal="true" aria-label="Question">
      {/* header */}
      <div className="flex items-center justify-between gap-3 px-4 py-3 sm:px-8">
        <div className="flex min-w-0 items-center gap-3">
          <span className="truncate rounded-lg px-3 py-1 text-lg font-bold uppercase sm:text-2xl" style={{ background: category.color || 'var(--tile)', fontFamily: font }}>
            {category.name}
          </span>
          {isDD && (
            <span className="flex items-center gap-1 rounded-lg bg-gold-500 px-2 py-1 text-sm font-black uppercase text-navy-900">
              <Star size={14} fill="currentColor" /> Daily Double
            </span>
          )}
        </div>
        <div className="shrink-0 text-3xl sm:text-5xl" style={{ fontFamily: font, color: 'var(--value-color)' }}>
          {c.phase === 'question' ? formatPoints(stake) : formatPoints(q.value)}
        </div>
      </div>

      {timerOn && !done && (
        <div className="px-4 sm:px-8">
          <TimerBar fraction={timer.fraction} seconds={timer.seconds} running={timer.running} />
        </div>
      )}

      {/* body */}
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-5 overflow-y-auto px-4 py-4 sm:px-10">
        {c.phase === 'dd_splash' && (
          <button type="button" onClick={() => apply(E.ddToWager)} className="anim-dd cursor-pointer text-center">
            <div className="gold-shimmer font-display text-[clamp(56px,13vw,220px)] leading-none">DAILY DOUBLE</div>
            <div className="mt-4 text-lg opacity-80">Click or press Space to place a wager</div>
          </button>
        )}

        {c.phase === 'dd_wager' && <WagerForm session={session} apply={apply} />}

        {c.phase === 'question' && (
          <>
            {q.media.image && <img src={q.media.image} alt="Clue" className="max-h-[38vh] max-w-full rounded-xl object-contain shadow-2xl" />}
            {q.media.video && (
              <div className="w-full max-w-3xl">
                <MediaPreview kind="video" src={q.media.video} className="!max-h-[42vh]" />
              </div>
            )}
            {q.media.audio && (
              <div className="w-full max-w-xl rounded-xl bg-black/40 p-3">
                <MediaPreview kind="audio" src={q.media.audio} />
              </div>
            )}
            <PromptText q={q} font={font} />

            {q.type === 'multiple_choice' && (
              <div className="grid w-full max-w-4xl gap-3 sm:grid-cols-2">
                {q.choices.map((ch, i) =>
                  ch.trim() ? (
                    <div
                      key={i}
                      className={`flex items-center gap-3 rounded-xl border-2 px-4 py-3 text-xl font-semibold transition sm:text-2xl ${
                        c.revealed && i === q.correctChoice ? 'border-emerald-400 bg-emerald-500/30' : c.revealed ? 'border-white/10 opacity-50' : 'border-white/25 bg-black/25'
                      }`}
                    >
                      <span className="font-display" style={{ color: 'var(--value-color)' }}>
                        {String.fromCharCode(65 + i)}
                      </span>
                      {ch}
                    </div>
                  ) : null,
                )}
              </div>
            )}
            {q.type === 'true_false' && (
              <div className="flex gap-4">
                {['True', 'False'].map((v, i) => (
                  <div
                    key={v}
                    className={`rounded-xl border-2 px-8 py-3 text-2xl font-bold sm:text-3xl ${
                      c.revealed && i === q.correctChoice ? 'border-emerald-400 bg-emerald-500/30' : c.revealed ? 'border-white/10 opacity-50' : 'border-white/25 bg-black/25'
                    }`}
                  >
                    {v}
                  </div>
                ))}
              </div>
            )}

            {c.hintShown && q.hint && (
              <div className="anim-fade-up flex items-center gap-2 rounded-xl bg-amber-500/20 px-4 py-2 text-lg text-amber-100">
                <Lightbulb size={20} /> Hint: {q.hint}
              </div>
            )}

            {session.practice && !done && <PracticeInput q={q} onResult={(ok) => (ok ? correct(session.teams[0].id) : incorrect(session.teams[0].id))} />}

            {c.revealed && (
              <div className="anim-fade-up w-full max-w-4xl rounded-2xl border-2 bg-black/45 p-4 text-center sm:p-6" style={{ borderColor: 'var(--value-color)' }}>
                <div className="text-sm font-bold uppercase tracking-widest opacity-70">Answer</div>
                <div className="text-shadow-game mt-1 text-[clamp(26px,4vw,64px)] font-bold leading-tight" style={{ fontFamily: font, color: 'var(--value-color)' }}>
                  {correctAnswerText(q) || '—'}
                </div>
                {q.altAnswers.length > 0 && <div className="mt-1 text-sm opacity-70">Also accepted: {q.altAnswers.join(' · ')}</div>}
                {q.explanation && <p className="mx-auto mt-3 max-w-2xl text-lg opacity-90">{q.explanation}</p>}
                {q.links.length > 0 && (
                  <div className="mt-2 flex flex-wrap justify-center gap-3 text-sm">
                    {q.links.map((l, i) => (
                      <a key={i} href={l.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-blue-300 underline">
                        <ExternalLink size={13} /> {l.label || l.url}
                      </a>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* host controls */}
      <div className="border-t border-white/15 bg-black/55 px-3 py-3 backdrop-blur sm:px-6">
        {c.phase === 'question' && !session.practice && (
          <div className="mb-3 flex flex-wrap justify-center gap-2">
            {session.teams.map((t, i) => {
              const attempt = c.attempts.find((a) => a.teamId === t.id);
              const can = eligible.some((e) => e.id === t.id);
              const selected = answering?.id === t.id;
              if (isDD && t.id !== c.ddTeamId) return null;
              return (
                <div
                  key={t.id}
                  className={`flex items-center gap-2 rounded-xl border-2 py-1 pl-2 pr-1 transition ${selected ? 'border-gold-500 bg-white/10' : 'border-white/10'} ${!can && !attempt ? 'opacity-40' : ''}`}
                >
                  <button type="button" className="flex cursor-pointer items-center gap-2" disabled={!can} onClick={() => setAnsweringId(t.id)} title={`Select ${t.name} (${i + 1})`}>
                    <Avatar avatar={t.avatar} color={t.color} size={28} />
                    <span className="max-w-32 truncate font-semibold">{t.name}</span>
                  </button>
                  {attempt ? (
                    <span className={`mr-1 flex items-center gap-1 rounded-lg px-2 py-1 text-sm font-bold ${attempt.correct ? 'bg-emerald-600' : 'bg-red-600'}`}>
                      {attempt.correct ? <Check size={14} /> : <X size={14} />}
                      {attempt.correct ? `+${stake}` : settings.negativeScoring ? `-${stake}` : '0'}
                    </span>
                  ) : (
                    <span className="flex gap-1">
                      <button type="button" disabled={!can} onClick={() => correct(t.id)} aria-label={`${t.name} correct`} className="cursor-pointer rounded-lg bg-emerald-600 p-2 hover:bg-emerald-500 disabled:opacity-30">
                        <Check size={18} />
                      </button>
                      <button type="button" disabled={!can} onClick={() => incorrect(t.id)} aria-label={`${t.name} incorrect`} className="cursor-pointer rounded-lg bg-red-600 p-2 hover:bg-red-500 disabled:opacity-30">
                        <X size={18} />
                      </button>
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}
        <div className="flex flex-wrap items-center justify-center gap-2">
          <Button size="sm" icon={<ArrowLeft size={15} />} variant={done ? 'gold' : 'ghost'} onClick={close}>
            {E.isUntouched(session) ? 'Back (keep tile)' : 'Return to board'} <Kbd>Esc</Kbd>
          </Button>
          {c.phase === 'question' && !c.revealed && (
            <Button size="sm" variant="primary" icon={<Eye size={15} />} onClick={reveal}>
              Reveal answer <Kbd>Space</Kbd>
            </Button>
          )}
          {c.phase === 'question' && q.hint && settings.showHints && !c.hintShown && !c.revealed && (
            <Button size="sm" icon={<Lightbulb size={15} />} onClick={hint}>
              Hint <Kbd>I</Kbd>
            </Button>
          )}
          {timerOn && !done && (
            <>
              <Button size="sm" icon={timer.running ? <Pause size={15} /> : <Play size={15} />} onClick={timer.toggle}>
                {timer.running ? 'Pause timer' : 'Resume timer'} <Kbd>T</Kbd>
              </Button>
              <Button size="sm" icon={<RotateCcw size={15} />} onClick={timer.reset}>
                Reset
              </Button>
            </>
          )}
          {!answered && !c.revealed && (
            <Button size="sm" icon={<SkipForward size={15} />} onClick={skip}>
              Skip <Kbd>S</Kbd>
            </Button>
          )}
          {c.phase === 'question' && !session.practice && !done && (
            <span className="hidden items-center gap-1 text-xs opacity-60 lg:flex">
              <Kbd>C</Kbd> correct <Kbd>X</Kbd> incorrect <Kbd>1-9</Kbd> team
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function WagerForm({ session, apply }: { session: Session; apply: Apply }) {
  const c = session.current!;
  const team = session.teams.find((t) => t.id === c.ddTeamId) ?? session.teams[0];
  const { min, max } = E.wagerLimits(session, team.id);
  const [text, setText] = useState('');
  const amount = text === '' ? NaN : Number(text);
  const error = text === '' ? null : E.validateWager(session, team.id, amount);
  const submit = () => {
    if (text !== '' && !error) apply((s) => E.submitWager(s, amount));
  };
  const presets = useMemo(() => [...new Set([min, Math.round(max / 2 / 100) * 100, max].filter((v) => v >= min && v <= max))], [min, max]);
  return (
    <div className="anim-fade-up w-full max-w-xl rounded-2xl bg-black/50 p-6 text-center">
      <div className="gold-shimmer font-display text-5xl">DAILY DOUBLE</div>
      {!session.practice && session.teams.length > 1 && (
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          {session.teams.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => apply((s) => E.setDDTeam(s, t.id))}
              className={`flex cursor-pointer items-center gap-2 rounded-xl border-2 px-3 py-1.5 font-semibold ${t.id === team.id ? 'border-gold-500 bg-white/15' : 'border-white/15 opacity-70'}`}
            >
              <Avatar avatar={t.avatar} color={t.color} size={24} /> {t.name}
            </button>
          ))}
        </div>
      )}
      <p className="mt-4 text-lg">
        <b style={{ color: team.color }}>{team.name}</b> has {formatPoints(team.score)}. Wager between <b>{min}</b> and <b>{max}</b>.
      </p>
      <input
        autoFocus
        type="number"
        inputMode="numeric"
        className="input mt-3 !py-3 text-center font-display !text-4xl"
        placeholder="Wager"
        value={text}
        min={min}
        max={max}
        aria-label="Wager amount"
        aria-invalid={!!error}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          e.stopPropagation();
          if (e.key === 'Enter') submit();
        }}
      />
      <div className="mt-2 flex justify-center gap-2">
        {presets.map((p) => (
          <Button key={p} size="sm" onClick={() => setText(String(p))}>
            {p === max ? `True Daily Double (${p})` : p}
          </Button>
        ))}
      </div>
      <div className="mt-1 h-5 text-sm text-red-300" role="alert">
        {error}
      </div>
      <Button variant="gold" size="lg" className="mt-2" disabled={text === '' || !!error} onClick={submit}>
        Lock in wager &amp; show clue
      </Button>
    </div>
  );
}

function PracticeInput({ q, onResult }: { q: Question; onResult: (ok: boolean) => void }) {
  const [text, setText] = useState('');
  const options = q.type === 'multiple_choice' ? q.choices.filter((c) => c.trim()) : q.type === 'true_false' ? ['True', 'False'] : null;
  if (options)
    return (
      <div className="flex flex-wrap justify-center gap-2">
        {options.map((o) => (
          <Button key={o} variant="primary" onClick={() => onResult(isAcceptedAnswer(q, o))}>
            Answer: {o}
          </Button>
        ))}
      </div>
    );
  return (
    <form
      className="flex w-full max-w-xl gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        if (text.trim()) onResult(isAcceptedAnswer(q, text));
      }}
    >
      <input autoFocus className="input !py-3 text-xl" placeholder="Type your answer…" value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.stopPropagation()} aria-label="Your answer" />
      <Button type="submit" variant="gold" disabled={!text.trim()}>
        Check
      </Button>
    </form>
  );
}
