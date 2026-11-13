import { useEffect, useState } from 'react';
import { LOGO_URL } from '../../lib/assets';
import { Check, Eye, EyeOff, Lock, Pause, Play, Trophy, X } from 'lucide-react';
import type { Session, SessionTeam } from '../../types';
import * as E from '../../game/engine';
import { playSound, startThinkMusic, stopMusic } from '../../lib/sound';
import { Avatar, Button, Modal, formatPoints } from '../ui';
import { themeStyle } from './Board';
import { TimerBar, useCountdown } from './Timer';
import type { Apply } from './QuestionView';

function PrivateEntry({
  team,
  kind,
  max,
  validate,
  onSubmit,
  onClose,
}: {
  team: SessionTeam;
  kind: 'wager' | 'answer';
  max?: number;
  validate?: (n: number) => string | null;
  onSubmit: (value: string) => void;
  onClose: () => void;
}) {
  const [text, setText] = useState('');
  const [show, setShow] = useState(false);
  const error = kind === 'wager' && text !== '' ? validate?.(Number(text)) ?? null : null;
  const ok = text.trim() !== '' && !error;
  return (
    <Modal
      open
      onClose={onClose}
      title={
        <span className="flex items-center gap-2">
          <Avatar avatar={team.avatar} color={team.color} size={28} /> {team.name}: private {kind}
        </span>
      }
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="gold" icon={<Lock size={16} />} disabled={!ok} onClick={() => ok && onSubmit(text.trim())}>
            Lock in
          </Button>
        </>
      }
    >
      <p className="mb-3 text-blue-100">
        {kind === 'wager' ? (
          <>
            Only <b style={{ color: team.color }}>{team.name}</b> should look. You have {formatPoints(team.score)} — wager from 0 to {max}.
          </>
        ) : (
          <>
            Only <b style={{ color: team.color }}>{team.name}</b> should look. Type your final answer.
          </>
        )}
      </p>
      <div className="flex gap-2">
        <input
          autoFocus
          className="input !py-3 text-xl"
          type={show ? (kind === 'wager' ? 'number' : 'text') : 'password'}
          inputMode={kind === 'wager' ? 'numeric' : 'text'}
          autoComplete="off"
          value={text}
          aria-label={`${team.name} ${kind}`}
          placeholder={kind === 'wager' ? 'Wager (hidden)' : 'Answer (hidden)'}
          onChange={(e) => setText(kind === 'wager' ? e.target.value.replace(/[^\d]/g, '') : e.target.value)}
          onKeyDown={(e) => {
            e.stopPropagation();
            if (e.key === 'Enter' && ok) onSubmit(text.trim());
          }}
        />
        <Button onClick={() => setShow((s) => !s)} aria-label={show ? 'Hide' : 'Show'}>
          {show ? <EyeOff size={18} /> : <Eye size={18} />}
        </Button>
      </div>
      <div className="mt-1 h-5 text-sm text-red-300" role="alert">
        {error}
      </div>
    </Modal>
  );
}

export function FinalRound({ session, apply }: { session: Session; apply: Apply }) {
  const f = session.final!;
  const fr = session.game.finalRound;
  const font = session.game.theme.fontFamily;
  const [entry, setEntry] = useState<{ teamId: string; kind: 'wager' | 'answer' } | null>(null);
  const timer = useCountdown(fr.timerSeconds, { autoStart: true, paused: session.paused || f.phase !== 'question' });

  useEffect(() => {
    if (f.phase === 'category') playSound('dailyDouble');
    if (f.phase === 'question' && !session.paused) startThinkMusic(fr.timerSeconds);
    else stopMusic();
    return stopMusic;
  }, [f.phase, session.paused, fr.timerSeconds]);

  useEffect(() => {
    if (timer.expired) stopMusic();
  }, [timer.expired]);

  const entryTeam = entry && session.teams.find((t) => t.id === entry.teamId);
  const order = E.finalRevealOrder(session);
  const allJudged = session.teams.every((t) => f.results[t.id]);
  const nextToJudge = order.find((t) => !f.results[t.id]);

  return (
    <div className="flex h-full flex-col" style={themeStyle(session.game)}>
      <div className="px-4 pt-4 text-center">
        <img src={LOGO_URL} alt="SFU SSA logo" className="mx-auto mb-2 h-14 w-14 rounded-full bg-white object-cover ring-2 ring-gold-500/70" />
        <div className="gold-shimmer font-display text-[clamp(32px,6vw,84px)] leading-none">FINAL JEOPARDY</div>
        <div className="mx-auto mt-2 inline-block rounded-lg px-4 py-1 text-xl font-bold uppercase sm:text-3xl" style={{ background: 'var(--tile)', fontFamily: font }}>
          {fr.category || 'Final Category'}
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-5 overflow-y-auto px-4 py-4">
        {f.phase === 'category' && (
          <div className="anim-zoom max-w-2xl text-center">
            <p className="text-xl opacity-90 sm:text-2xl">Each {session.game.settings.mode === 'individual' ? 'player' : 'team'} will secretly wager up to their current score, then answer one last clue.</p>
            <Button variant="gold" size="lg" className="mt-6" onClick={() => apply((s) => E.setFinalPhase(s, 'wager'))}>
              Collect wagers
            </Button>
          </div>
        )}

        {(f.phase === 'question' || f.phase === 'reveal') && (
          <div className="anim-fade-up w-full max-w-5xl text-center">
            {fr.image && <img src={fr.image} alt="" className="mx-auto mb-4 max-h-[30vh] rounded-xl object-contain" />}
            <h2 className="text-shadow-game text-balance font-bold uppercase leading-tight" style={{ fontFamily: font, fontSize: 'clamp(24px, 3.8vw, 60px)' }}>
              {fr.question}
            </h2>
            {f.phase === 'question' && (
              <div className="mx-auto mt-5 flex max-w-2xl items-center gap-2">
                <div className="flex-1">
                  <TimerBar fraction={timer.fraction} seconds={timer.seconds} running={timer.running} />
                </div>
                <Button size="sm" onClick={timer.toggle} aria-label="Toggle timer">
                  {timer.running ? <Pause size={15} /> : <Play size={15} />}
                </Button>
              </div>
            )}
            {f.answerRevealed && (
              <div className="anim-zoom mx-auto mt-5 max-w-3xl rounded-2xl border-2 bg-black/45 p-4" style={{ borderColor: 'var(--value-color)' }}>
                <div className="text-sm font-bold uppercase tracking-widest opacity-70">Correct answer</div>
                <div className="text-[clamp(26px,4vw,56px)] font-bold" style={{ fontFamily: font, color: 'var(--value-color)' }}>
                  {fr.answer || '—'}
                </div>
              </div>
            )}
          </div>
        )}

        {/* team cards */}
        {f.phase !== 'category' && (
          <div className="grid w-full max-w-6xl gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {(f.phase === 'reveal' ? order : session.teams).map((t) => {
              const wager = f.wagers[t.id];
              const answer = f.answers[t.id];
              const result = f.results[t.id];
              const shown = f.shown[t.id];
              const max = E.finalMaxWager(session, t.id);
              return (
                <div
                  key={t.id}
                  className={`rounded-2xl border-2 bg-black/45 p-4 transition ${f.phase === 'reveal' && nextToJudge?.id === t.id ? 'anim-pulse-ring' : ''}`}
                  style={{ borderColor: result === 'correct' ? '#34d399' : result === 'incorrect' ? '#f87171' : t.color }}
                >
                  <div className="flex items-center gap-2">
                    <Avatar avatar={t.avatar} color={t.color} size={36} />
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-bold">{t.name}</div>
                      <div key={t.score} className={`anim-pop font-display text-2xl ${t.score < 0 ? 'text-red-400' : 'text-gold-500'}`}>
                        {formatPoints(t.score)}
                      </div>
                    </div>
                    {result && (result === 'correct' ? <Check className="text-emerald-400" size={28} /> : <X className="text-red-400" size={28} />)}
                  </div>

                  {f.phase === 'wager' && (
                    <div className="mt-3">
                      {wager != null ? (
                        <div className="flex items-center justify-between rounded-lg bg-emerald-600/25 px-3 py-2">
                          <span className="flex items-center gap-2 font-semibold text-emerald-300">
                            <Lock size={16} /> Wager locked
                          </span>
                          <Button size="sm" variant="subtle" onClick={() => apply((s) => E.clearFinalWager(s, t.id))}>
                            Change
                          </Button>
                        </div>
                      ) : max === 0 ? (
                        <Button className="w-full" onClick={() => apply((s) => E.setFinalWager(s, t.id, 0))}>
                          No points to wager — lock in $0
                        </Button>
                      ) : (
                        <Button variant="primary" className="w-full" onClick={() => setEntry({ teamId: t.id, kind: 'wager' })}>
                          Enter wager privately
                        </Button>
                      )}
                    </div>
                  )}

                  {f.phase === 'question' && (
                    <div className="mt-3">
                      {answer ? (
                        <div className="flex items-center justify-between rounded-lg bg-emerald-600/25 px-3 py-2">
                          <span className="flex items-center gap-2 font-semibold text-emerald-300">
                            <Lock size={16} /> Answer locked
                          </span>
                          <Button size="sm" variant="subtle" onClick={() => setEntry({ teamId: t.id, kind: 'answer' })}>
                            Change
                          </Button>
                        </div>
                      ) : (
                        <Button variant="primary" className="w-full" onClick={() => setEntry({ teamId: t.id, kind: 'answer' })}>
                          Enter answer privately
                        </Button>
                      )}
                    </div>
                  )}

                  {f.phase === 'reveal' && (
                    <div className="mt-3 space-y-2">
                      {!shown ? (
                        <Button variant="primary" className="w-full" icon={<Eye size={16} />} onClick={() => (playSound('reveal'), apply((s) => E.showFinalResponse(s, t.id)))}>
                          Reveal {t.name}’s response
                        </Button>
                      ) : (
                        <>
                          <div className="anim-fade-up rounded-lg bg-white/10 px-3 py-2">
                            <div className="text-xs uppercase opacity-60">Answer</div>
                            <div className="text-lg font-bold">{answer || <i className="opacity-60">No answer submitted</i>}</div>
                            <div className="mt-1 text-xs uppercase opacity-60">Wager</div>
                            <div className="font-display text-xl" style={{ color: 'var(--value-color)' }}>
                              {formatPoints(wager ?? 0)}
                            </div>
                          </div>
                          {!result ? (
                            <div className="flex gap-2">
                              <Button variant="success" className="flex-1" icon={<Check size={16} />} onClick={() => (playSound('correct'), apply((s) => E.judgeFinal(s, t.id, true)))}>
                                Correct
                              </Button>
                              <Button variant="danger" className="flex-1" icon={<X size={16} />} onClick={() => (playSound('incorrect'), apply((s) => E.judgeFinal(s, t.id, false)))}>
                                Incorrect
                              </Button>
                            </div>
                          ) : (
                            <div className={`text-center font-bold ${result === 'correct' ? 'text-emerald-400' : 'text-red-400'}`}>
                              {result === 'correct' ? `+${wager ?? 0}` : session.game.settings.negativeScoring ? `-${wager ?? 0}` : '±0'}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* controls */}
      <div className="flex flex-wrap items-center justify-center gap-2 border-t border-white/15 bg-black/55 px-4 py-3">
        {f.phase === 'wager' && (
          <>
            <span className="text-sm opacity-70">
              {Object.keys(f.wagers).length}/{session.teams.length} wagers locked
            </span>
            <Button variant="gold" size="lg" disabled={!E.allWagersIn(session)} onClick={() => apply((s) => E.setFinalPhase(s, 'question'))}>
              Reveal the final clue
            </Button>
          </>
        )}
        {f.phase === 'question' && (
          <>
            <span className="text-sm opacity-70">
              {session.teams.filter((t) => f.answers[t.id]).length}/{session.teams.length} answers locked
            </span>
            <Button variant="gold" size="lg" onClick={() => apply((s) => E.setFinalPhase(s, 'reveal'))}>
              Time’s up — reveal responses
            </Button>
          </>
        )}
        {f.phase === 'reveal' && (
          <>
            {!f.answerRevealed && (
              <Button variant="primary" icon={<Eye size={16} />} onClick={() => (playSound('reveal'), apply(E.revealFinalAnswer))}>
                Reveal correct answer
              </Button>
            )}
            <Button variant="gold" size="lg" icon={<Trophy size={18} />} disabled={!allJudged} onClick={() => apply(E.finishGame)}>
              {allJudged ? 'Show final results' : 'Judge every response to finish'}
            </Button>
          </>
        )}
      </div>

      {entry && entryTeam && (
        <PrivateEntry
          key={entry.teamId + entry.kind}
          team={entryTeam}
          kind={entry.kind}
          max={E.finalMaxWager(session, entryTeam.id)}
          validate={(n) => E.validateFinalWager(session, entryTeam.id, n)}
          onClose={() => setEntry(null)}
          onSubmit={(value) => {
            apply((s) => (entry.kind === 'wager' ? E.setFinalWager(s, entry.teamId, Number(value)) : E.setFinalAnswer(s, entry.teamId, value)));
            setEntry(null);
          }}
        />
      )}
    </div>
  );
}
