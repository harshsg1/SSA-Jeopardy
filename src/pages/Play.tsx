import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowLeft, Keyboard, Maximize, Minimize, Pause, Play as PlayIcon, Settings2, Shuffle, Trophy, Undo2 } from 'lucide-react';
import type { Session } from '../types';
import { useStore } from '../store/store';
import { navigate } from '../lib/router';
import * as E from '../game/engine';
import { playSound, stopMusic } from '../lib/sound';
import { Button, IconButton, Kbd, Modal, confirmDialog, toast } from '../components/ui';
import { BoardGrid, themeStyle } from '../components/play/Board';
import { Scoreboard } from '../components/play/Scoreboard';
import { QuestionView, type QuestionHandle } from '../components/play/QuestionView';
import { FinalRound } from '../components/play/FinalRound';
import { HostPanel, SHORTCUTS } from '../components/play/HostPanel';
import { Summary } from '../components/play/Summary';

function isTypingTarget(t: EventTarget | null) {
  const el = t as HTMLElement | null;
  return !!el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.isContentEditable);
}

export default function Play({ sessionId }: { sessionId: string }) {
  const session = useStore((s) => s.sessions.find((x) => x.id === sessionId));
  const updateSession = useStore((s) => s.updateSession);
  const initialStatus = useRef(session?.status);

  const apply = useCallback((fn: (s: Session) => Session) => updateSession(sessionId, fn), [sessionId, updateSession]);

  if (!session)
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3">
        <p className="text-xl">This game session no longer exists.</p>
        <Button variant="gold" onClick={() => navigate('/')}>
          Back to dashboard
        </Button>
      </div>
    );

  if (session.status === 'finished')
    return (
      <div className="min-h-full">
        <Summary session={session} celebrate={initialStatus.current !== 'finished'} />
        {session.undo.length > 0 && initialStatus.current !== 'finished' && (
          <div className="pb-8 text-center">
            <Button variant="subtle" size="sm" icon={<Undo2 size={14} />} onClick={() => apply(E.undo)}>
              Undo — go back to the game
            </Button>
          </div>
        )}
      </div>
    );

  return <LiveGame session={session} apply={apply} />;
}

function LiveGame({ session, apply }: { session: Session; apply: (fn: (s: Session) => Session) => void }) {
  const [panel, setPanel] = useState(false);
  const [presentation, setPresentation] = useState(false);
  const [help, setHelp] = useState(false);
  const [highlight, setHighlight] = useState<string | null>(null);
  const qHandle = useRef<QuestionHandle | null>(null);
  const p = E.progress(session);
  const boardDone = session.status === 'playing' && p.remaining === 0 && !session.current;

  // ---- presentation / fullscreen ----
  const togglePresentation = useCallback(async () => {
    if (!presentation) {
      setPresentation(true);
      setPanel(false);
      try {
        await document.documentElement.requestFullscreen?.();
      } catch {
        /* fullscreen may be blocked; presentation layout still applies */
      }
    } else {
      setPresentation(false);
      if (document.fullscreenElement) await document.exitFullscreen().catch(() => {});
    }
  }, [presentation]);

  useEffect(() => {
    const on = () => {
      if (!document.fullscreenElement) setPresentation(false);
    };
    document.addEventListener('fullscreenchange', on);
    return () => document.removeEventListener('fullscreenchange', on);
  }, []);

  useEffect(
    () => () => {
      stopMusic();
      if (document.fullscreenElement) void document.exitFullscreen().catch(() => {});
    },
    [],
  );

  // ---- actions ----
  const undo = useCallback(() => {
    const last = session.undo[session.undo.length - 1];
    if (!last) return toast('Nothing to undo.');
    apply(E.undo);
    toast(`Undone: ${last.label}`);
  }, [session.undo, apply]);

  const select = useCallback(
    (id: string) => {
      if (session.paused) return;
      playSound('select');
      apply((s) => E.openQuestion(s, id));
    },
    [apply, session.paused],
  );

  const randomQuestion = useCallback(() => {
    if (session.current || session.status !== 'playing' || session.paused) return;
    const id = E.randomQuestionId(session);
    if (!id) return toast('No clues left.');
    setPanel(false);
    setHighlight(id);
    playSound('select');
    setTimeout(() => {
      setHighlight(null);
      apply((s) => E.openQuestion(s, id));
    }, 900);
  }, [session, apply]);

  const goFinal = useCallback(async () => {
    const remaining = E.progress(session).remaining;
    const hasFinal = E.finalEnabled(session);
    if (remaining > 0 && !(await confirmDialog({ title: hasFinal ? 'Start Final Jeopardy?' : 'Finish the game?', message: `${remaining} clue${remaining > 1 ? 's are' : ' is'} still on the board.`, confirmLabel: 'Continue' }))) return;
    setPanel(false);
    apply(E.startFinal);
  }, [session, apply]);

  const endGame = useCallback(async () => {
    if (await confirmDialog({ title: 'End game now?', message: 'The game will finish with the current scores and show the results.', confirmLabel: 'End game', danger: true })) {
      setPanel(false);
      apply(E.finishGame);
    }
  }, [apply]);

  // ---- keyboard shortcuts ----
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (isTypingTarget(e.target) || e.metaKey || e.altKey) return;
      if (e.ctrlKey && e.key.toLowerCase() !== 'z') return;
      const k = e.key.toLowerCase();
      const q = qHandle.current;
      if (k === '?' || (k === '/' && e.shiftKey)) return setHelp((h) => !h);
      if (k === 'h') return setPanel((x) => !x);
      if (k === 'f') return void togglePresentation();
      if (k === 'p') return apply(session.paused ? E.resume : E.pause);
      if (k === 'u' || (e.ctrlKey && k === 'z')) return undo();
      if (session.paused) return;
      if (/^[1-9]$/.test(k)) {
        const i = Number(k) - 1;
        if (q) q.selectTeam(i);
        else if (session.teams[i]) apply((s) => E.setActiveTeam(s, s.teams[i].id));
        return;
      }
      if (q) {
        if (k === ' ' || k === 'enter') {
          e.preventDefault();
          if (session.current?.revealed && k === 'enter') q.close();
          else q.reveal();
        } else if (k === 'c') q.correct();
        else if (k === 'x') q.incorrect();
        else if (k === 's') q.skip();
        else if (k === 'i') q.hint();
        else if (k === 't') q.toggleTimer();
        else if (k === 'escape' || k === 'b') q.close();
      } else if (session.status === 'playing') {
        if (k === 'r') randomQuestion();
        else if (k === 'escape') setPanel(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [session, apply, undo, randomQuestion, togglePresentation]);

  const font = session.game.theme.fontFamily;

  return (
    <div className="flex h-full flex-col overflow-hidden" style={themeStyle(session.game)}>
      {/* top bar (hidden in presentation mode) */}
      {!presentation ? (
        <header className="flex flex-wrap items-center gap-2 border-b border-white/10 bg-black/40 px-3 py-2">
          <IconButton label="Save & exit to dashboard" onClick={() => navigate('/')}>
            <ArrowLeft size={20} />
          </IconButton>
          <img src="/logo.png" alt="SFU SSA logo" className="h-9 w-9 shrink-0 rounded-full bg-white object-cover ring-2 ring-gold-500/70" />
          <h1 className="min-w-0 flex-1 truncate text-xl sm:text-2xl" style={{ fontFamily: font, color: 'var(--value-color)' }}>
            {session.game.title}
            {session.practice && <span className="ml-2 rounded bg-emerald-600 px-1.5 py-0.5 align-middle font-sans text-xs font-bold text-white">PRACTICE</span>}
          </h1>
          <span className="hidden text-sm opacity-70 sm:inline">
            {session.status === 'final' ? 'Final round' : `${p.done}/${p.total} played`}
          </span>
          <Button size="sm" icon={<Undo2 size={15} />} disabled={!session.undo.length} onClick={undo}>
            <span className="hidden sm:inline">Undo</span>
          </Button>
          <Button size="sm" icon={session.paused ? <PlayIcon size={15} /> : <Pause size={15} />} onClick={() => apply(session.paused ? E.resume : E.pause)}>
            <span className="hidden sm:inline">{session.paused ? 'Resume' : 'Pause'}</span>
          </Button>
          {session.status === 'playing' && (
            <Button size="sm" icon={<Shuffle size={15} />} disabled={p.remaining === 0} onClick={randomQuestion}>
              <span className="hidden md:inline">Random</span>
            </Button>
          )}
          <IconButton label="Keyboard shortcuts" onClick={() => setHelp(true)}>
            <Keyboard size={18} />
          </IconButton>
          <Button size="sm" icon={<Maximize size={15} />} onClick={togglePresentation}>
            <span className="hidden sm:inline">Present</span>
          </Button>
          <Button size="sm" variant="gold" icon={<Settings2 size={15} />} onClick={() => setPanel(true)}>
            Host
          </Button>
        </header>
      ) : (
        <div className="group fixed right-0 top-0 z-[45] p-2">
          <div className="flex gap-1 rounded-xl bg-black/60 p-1 opacity-0 transition group-hover:opacity-100 focus-within:opacity-100">
            <IconButton label="Undo (U)" onClick={undo}>
              <Undo2 size={18} />
            </IconButton>
            <IconButton label="Host panel (H)" onClick={() => setPanel(true)}>
              <Settings2 size={18} />
            </IconButton>
            <IconButton label="Exit presentation (F)" onClick={togglePresentation}>
              <Minimize size={18} />
            </IconButton>
          </div>
        </div>
      )}

      {session.status === 'final' ? (
        <div className="min-h-0 flex-1">
          <FinalRound session={session} apply={apply} />
        </div>
      ) : (
        <>
          {presentation && (
            <div className="flex items-center justify-center gap-3 px-4 pt-3 text-[clamp(22px,3.2vw,52px)] leading-none" style={{ fontFamily: font, color: 'var(--value-color)' }}>
              <img src="/logo.png" alt="SFU SSA logo" className="h-[1.3em] w-[1.3em] shrink-0 rounded-full bg-white object-cover ring-2 ring-gold-500/70" />
              {session.game.title}
            </div>
          )}
          <main className={`min-h-0 flex-1 ${presentation ? 'p-3 sm:p-5' : 'p-2 sm:p-4'}`}>
            <BoardGrid game={session.game} played={session.played} onSelect={select} disabled={session.paused || !!highlight} highlight={highlight} />
          </main>
        </>
      )}

      {/* scoreboard */}
      {!(session.status === 'final') && (
        <footer className="border-t border-white/10 bg-black/45 px-2 pb-2 pt-1 sm:px-4">
          <Scoreboard session={session} onSelectTeam={(id) => apply((s) => E.setActiveTeam(s, id))} compact={!presentation && session.teams.length > 5} />
        </footer>
      )}

      {session.current && <QuestionView key={session.current.questionId} session={session} apply={apply} registerHandle={(h) => (qHandle.current = h)} />}

      {/* board cleared */}
      {boardDone && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="panel anim-zoom max-w-lg !bg-navy-900 p-8 text-center text-white">
            <Trophy className="mx-auto text-gold-500" size={48} />
            <h2 className="mt-2 font-display text-4xl text-gold-500">Board cleared!</h2>
            <p className="mt-1 text-blue-100">{E.finalEnabled(session) ? 'Time for the final round.' : 'All clues have been played.'}</p>
            <div className="mt-5 flex flex-wrap justify-center gap-2">
              <Button variant="gold" size="lg" onClick={() => apply(E.startFinal)}>
                {E.finalEnabled(session) ? 'Start Final Jeopardy' : 'Show final results'}
              </Button>
              <Button icon={<Undo2 size={16} />} disabled={!session.undo.length} onClick={undo}>
                Undo
              </Button>
              <Button icon={<Settings2 size={16} />} onClick={() => setPanel(true)}>
                Host
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* paused */}
      {session.paused && (
        <div className="fixed inset-0 z-[48] flex flex-col items-center justify-center bg-navy-950/90 text-white backdrop-blur">
          <Pause size={64} className="text-gold-500" />
          <div className="mt-2 font-display text-6xl">GAME PAUSED</div>
          <Button variant="gold" size="lg" className="mt-6" icon={<PlayIcon size={20} />} onClick={() => apply(E.resume)}>
            Resume <Kbd>P</Kbd>
          </Button>
        </div>
      )}

      {panel && (
        <>
          <div className="fixed inset-0 z-[49] bg-black/40" onClick={() => setPanel(false)} />
          <HostPanel session={session} apply={apply} onClose={() => setPanel(false)} onRandomQuestion={randomQuestion} onUndo={undo} onEnd={endGame} onFinal={goFinal} />
        </>
      )}

      <Modal open={help} onClose={() => setHelp(false)} title="Keyboard shortcuts">
        <div className="grid gap-1.5">
          {SHORTCUTS.map(([k, d]) => (
            <div key={k} className="flex items-center justify-between">
              <span>{d}</span>
              <Kbd>{k}</Kbd>
            </div>
          ))}
        </div>
        <a href="#/rules" target="_blank" rel="noreferrer" className="mt-4 block text-center font-semibold text-gold-400 underline">
          Full rules &amp; how to play (opens in a new tab)
        </a>
      </Modal>
    </div>
  );
}
