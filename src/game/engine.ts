/**
 * Pure game engine. Every function takes a Session and returns a new Session
 * (the input is never mutated), which makes undo, persistence and testing simple.
 */
import type {
  Attempt,
  FinalPhase,
  Game,
  PlayedRecord,
  ScoreEvent,
  ScoreKind,
  Session,
  SessionSnapshot,
  SessionTeam,
  Team,
} from '../types';
import { allQuestions, findQuestion, uid } from '../lib/factory';

const UNDO_LIMIT = 100;

// ---------- helpers ----------

function draft(s: Session): Session {
  return {
    ...s,
    teams: s.teams.map((t) => ({ ...t })),
    played: { ...s.played },
    log: [...s.log],
    current: s.current ? { ...s.current, attempts: [...s.current.attempts] } : null,
    final: s.final
      ? {
          ...s.final,
          wagers: { ...s.final.wagers },
          answers: { ...s.final.answers },
          results: { ...s.final.results },
          shown: { ...s.final.shown },
        }
      : null,
    updatedAt: Date.now(),
  };
}

function snapshotOf(s: Session, label: string): SessionSnapshot {
  return {
    teams: s.teams,
    played: s.played,
    current: s.current,
    log: s.log,
    status: s.status,
    final: s.final,
    activeTeamId: s.activeTeamId,
    label,
  };
}

/** Records the current state on the undo stack, returning a draft to modify. */
function withUndo(s: Session, label: string): Session {
  const d = draft(s);
  d.undo = [...s.undo, snapshotOf(s, label)].slice(-UNDO_LIMIT);
  return d;
}

function addScore(d: Session, teamId: string, delta: number, kind: ScoreKind, label: string, questionId?: string) {
  const team = d.teams.find((t) => t.id === teamId);
  if (!team) return;
  team.score += delta;
  const ev: ScoreEvent = { id: uid('e_'), teamId, delta, kind, label, questionId, ts: Date.now() };
  d.log.push(ev);
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function getQuestion(s: Session, questionId: string) {
  return findQuestion(s.game, questionId);
}

export function isDailyDouble(s: Session, questionId: string) {
  return s.dailyDoubles.includes(questionId);
}

export function boardMaxValue(game: Game): number {
  return allQuestions(game).reduce((m, q) => Math.max(m, q.value), 0);
}

// ---------- session lifecycle ----------

export function resolveDailyDoubles(game: Game): string[] {
  const qs = allQuestions(game);
  const designated = qs.filter((q) => q.dailyDouble).map((q) => q.id);
  if (!game.settings.randomDailyDoubles) return designated;
  const pool = shuffle(qs.filter((q) => !q.dailyDouble).map((q) => q.id));
  const extra = Math.max(0, Math.min(pool.length, game.settings.randomDailyDoubleCount));
  return [...designated, ...pool.slice(0, extra)];
}

export function createSession(game: Game, teams: Team[], opts: { practice?: boolean } = {}): Session {
  if (teams.length === 0) throw new Error('At least one team or player is required.');
  const now = Date.now();
  return {
    id: uid('s_'),
    gameId: game.id,
    game: structuredClone(game),
    practice: !!opts.practice,
    teams: teams.map((t) => ({ ...t, score: 0 })),
    activeTeamId: teams[0].id,
    played: {},
    dailyDoubles: resolveDailyDoubles(game),
    current: null,
    log: [],
    undo: [],
    status: 'playing',
    final: null,
    startedAt: now,
    updatedAt: now,
    endedAt: null,
    paused: false,
    pausedAt: null,
    pausedMs: 0,
  };
}

export function remainingQuestionIds(s: Session): string[] {
  return allQuestions(s.game)
    .map((q) => q.id)
    .filter((id) => !s.played[id]);
}

export function progress(s: Session) {
  const total = allQuestions(s.game).length;
  const done = Object.keys(s.played).length;
  return { total, done, remaining: total - done, pct: total ? Math.round((done / total) * 100) : 100 };
}

// ---------- team management ----------

export function setActiveTeam(s: Session, teamId: string | null): Session {
  const d = draft(s);
  d.activeTeamId = teamId && d.teams.some((t) => t.id === teamId) ? teamId : d.activeTeamId;
  return d;
}

export function addTeam(s: Session, team: Team): Session {
  const d = draft(s);
  d.teams.push({ ...team, score: 0 });
  if (!d.activeTeamId) d.activeTeamId = team.id;
  return d;
}

export function updateTeam(s: Session, teamId: string, patch: Partial<Team>): Session {
  const d = draft(s);
  d.teams = d.teams.map((t) => (t.id === teamId ? { ...t, ...patch, id: t.id } : t));
  return d;
}

export function removeTeam(s: Session, teamId: string): Session {
  if (s.teams.length <= 1) return s;
  const d = withUndo(s, 'Remove team');
  d.teams = d.teams.filter((t) => t.id !== teamId);
  if (d.activeTeamId === teamId) d.activeTeamId = d.teams[0]?.id ?? null;
  if (d.current?.ddTeamId === teamId) d.current.ddTeamId = d.activeTeamId;
  return d;
}

export function moveTeam(s: Session, from: number, to: number): Session {
  if (from === to || to < 0 || to >= s.teams.length) return s;
  const d = draft(s);
  const [t] = d.teams.splice(from, 1);
  d.teams.splice(to, 0, t);
  return d;
}

// ---------- scoring (manual) ----------

export function adjustScore(s: Session, teamId: string, delta: number, label = 'Manual adjustment'): Session {
  if (!Number.isFinite(delta) || delta === 0) return s;
  const d = withUndo(s, label);
  addScore(d, teamId, delta, 'manual', label);
  return d;
}

export function setScore(s: Session, teamId: string, score: number): Session {
  const team = s.teams.find((t) => t.id === teamId);
  if (!team || !Number.isFinite(score) || team.score === score) return s;
  const d = withUndo(s, `Set ${team.name} score`);
  addScore(d, teamId, score - team.score, 'set', `Score set to ${score}`);
  return d;
}

// ---------- question flow ----------

export function openQuestion(s: Session, questionId: string): Session {
  if (s.status !== 'playing' || s.current || s.played[questionId]) return s;
  if (!getQuestion(s, questionId)) return s;
  const d = draft(s);
  const dd = isDailyDouble(s, questionId);
  d.current = {
    questionId,
    phase: dd ? 'dd_splash' : 'question',
    wager: null,
    ddTeamId: dd ? s.activeTeamId ?? s.teams[0]?.id ?? null : null,
    attempts: [],
    revealed: false,
    hintShown: false,
    openedAt: Date.now(),
  };
  return d;
}

export function ddToWager(s: Session): Session {
  if (s.current?.phase !== 'dd_splash') return s;
  const d = draft(s);
  d.current!.phase = 'dd_wager';
  return d;
}

export function setDDTeam(s: Session, teamId: string): Session {
  if (!s.current || s.current.attempts.length) return s;
  const d = draft(s);
  d.current!.ddTeamId = teamId;
  return d;
}

export function wagerLimits(s: Session, teamId: string): { min: number; max: number } {
  const team = s.teams.find((t) => t.id === teamId);
  const score = team?.score ?? 0;
  const { ddMinWager, ddMaxRule, ddCustomMax } = s.game.settings;
  let max: number;
  if (ddMaxRule === 'custom') max = Math.max(0, ddCustomMax);
  else if (ddMaxRule === 'score_only') max = Math.max(score, 0);
  else max = Math.max(score, boardMaxValue(s.game));
  const min = Math.min(Math.max(0, ddMinWager), max);
  return { min, max };
}

export function validateWager(s: Session, teamId: string, amount: number): string | null {
  if (!Number.isFinite(amount) || !Number.isInteger(amount)) return 'Enter a whole number.';
  const { min, max } = wagerLimits(s, teamId);
  if (amount < min) return `Minimum wager is ${min}.`;
  if (amount > max) return `Maximum wager is ${max}.`;
  return null;
}

export function submitWager(s: Session, amount: number): Session {
  const c = s.current;
  if (!c || c.phase !== 'dd_wager' || !c.ddTeamId) return s;
  if (validateWager(s, c.ddTeamId, amount)) return s;
  const d = draft(s);
  d.current!.wager = amount;
  d.current!.phase = 'question';
  return d;
}

/** Point value at stake for the current question. */
export function currentStake(s: Session): number {
  const c = s.current;
  if (!c) return 0;
  if (c.wager != null) return c.wager;
  return getQuestion(s, c.questionId)?.question.value ?? 0;
}

export function eligibleTeams(s: Session): SessionTeam[] {
  const c = s.current;
  if (!c) return [];
  if (c.ddTeamId) return c.attempts.length ? [] : s.teams.filter((t) => t.id === c.ddTeamId);
  if (c.attempts.some((a) => a.correct)) return [];
  if (!s.game.settings.allowMultipleAttempts && c.attempts.length) return [];
  return s.teams.filter((t) => !c.attempts.some((a) => a.teamId === t.id));
}

export function markCorrect(s: Session, teamId: string): Session {
  const c = s.current;
  if (!c || c.phase !== 'question') return s;
  if (!eligibleTeams(s).some((t) => t.id === teamId)) return s;
  const q = getQuestion(s, c.questionId)!;
  const team = s.teams.find((t) => t.id === teamId)!;
  const stake = currentStake(s);
  const d = withUndo(s, `${team.name} correct`);
  d.current!.attempts.push({ teamId, correct: true });
  addScore(d, teamId, stake, 'correct', `${q.category.name} ${q.question.value}${c.wager != null ? ' (DD)' : ''}`, c.questionId);
  if (s.game.settings.correctPicksNext) d.activeTeamId = teamId;
  if (s.game.settings.autoRevealOnCorrect) d.current!.revealed = true;
  return d;
}

export function markIncorrect(s: Session, teamId: string): Session {
  const c = s.current;
  if (!c || c.phase !== 'question') return s;
  if (!eligibleTeams(s).some((t) => t.id === teamId)) return s;
  const q = getQuestion(s, c.questionId)!;
  const team = s.teams.find((t) => t.id === teamId)!;
  const stake = currentStake(s);
  const d = withUndo(s, `${team.name} incorrect`);
  d.current!.attempts.push({ teamId, correct: false });
  const delta = s.game.settings.negativeScoring ? -stake : 0;
  addScore(d, teamId, delta, 'incorrect', `${q.category.name} ${q.question.value}${c.wager != null ? ' (DD)' : ''}`, c.questionId);
  if (eligibleTeams(d).length === 0) d.current!.revealed = true;
  return d;
}

export function revealAnswer(s: Session): Session {
  if (!s.current || s.current.revealed) return s;
  const d = draft(s);
  d.current!.revealed = true;
  if (d.current!.phase !== 'question') d.current!.phase = 'question';
  return d;
}

export function showHint(s: Session): Session {
  if (!s.current || s.current.hintShown) return s;
  const d = draft(s);
  d.current!.hintShown = true;
  return d;
}

/** True when closing the question should leave the tile unplayed (nothing happened yet). */
export function isUntouched(s: Session): boolean {
  const c = s.current;
  return !!c && c.attempts.length === 0 && !c.revealed;
}

/** Return to the board. Untouched questions are returned to the board; otherwise they are marked played. */
export function closeQuestion(s: Session): Session {
  const c = s.current;
  if (!c) return s;
  const d = draft(s);
  if (!isUntouched(s)) {
    const rec: PlayedRecord = {
      status: c.attempts.some((a: Attempt) => a.correct) ? 'answered' : 'revealed',
      attempts: c.attempts,
      wager: c.wager ?? undefined,
    };
    d.played[c.questionId] = rec;
  }
  d.current = null;
  return d;
}

export function skipQuestion(s: Session, questionId?: string): Session {
  const id = questionId ?? s.current?.questionId;
  if (!id || (s.played[id] && !s.current)) return s;
  const d = withUndo(s, 'Skip question');
  d.played[id] = { status: 'skipped', attempts: d.current?.attempts ?? [] };
  if (d.current?.questionId === id) d.current = null;
  return d;
}

/** Marks a played tile as available again (host override). */
export function reopenTile(s: Session, questionId: string): Session {
  if (!s.played[questionId] || s.current) return s;
  const d = withUndo(s, 'Reopen tile');
  delete d.played[questionId];
  return d;
}

export function randomQuestionId(s: Session): string | null {
  const ids = remainingQuestionIds(s);
  return ids.length ? ids[Math.floor(Math.random() * ids.length)] : null;
}

export function randomTeamId(s: Session): string | null {
  return s.teams.length ? s.teams[Math.floor(Math.random() * s.teams.length)].id : null;
}

// ---------- undo ----------

export function undo(s: Session): Session {
  const snap = s.undo[s.undo.length - 1];
  if (!snap) return s;
  return {
    ...s,
    teams: snap.teams,
    played: snap.played,
    current: snap.current,
    log: snap.log,
    status: snap.status,
    final: snap.final,
    activeTeamId: snap.activeTeamId,
    undo: s.undo.slice(0, -1),
    updatedAt: Date.now(),
  };
}

// ---------- pause ----------

export function pause(s: Session): Session {
  if (s.paused) return s;
  return { ...s, paused: true, pausedAt: Date.now(), updatedAt: Date.now() };
}

export function resume(s: Session): Session {
  if (!s.paused) return s;
  const extra = s.pausedAt ? Date.now() - s.pausedAt : 0;
  return { ...s, paused: false, pausedAt: null, pausedMs: s.pausedMs + extra, updatedAt: Date.now() };
}

export function restart(s: Session): Session {
  const fresh = createSession(s.game, s.teams, { practice: s.practice });
  return { ...fresh, id: s.id };
}

// ---------- final round ----------

export function finalEnabled(s: Session): boolean {
  const f = s.game.finalRound;
  return f.enabled && !!f.question.trim();
}

export function startFinal(s: Session): Session {
  if (s.status !== 'playing') return s;
  if (!finalEnabled(s)) return finishGame(s);
  const d = withUndo(s, 'Start Final Jeopardy');
  d.current = null;
  d.status = 'final';
  d.final = { phase: 'category', wagers: {}, answers: {}, results: {}, shown: {}, answerRevealed: false };
  return d;
}

export function finalMaxWager(s: Session, teamId: string): number {
  return Math.max(0, s.teams.find((t) => t.id === teamId)?.score ?? 0);
}

export function setFinalPhase(s: Session, phase: FinalPhase): Session {
  if (!s.final) return s;
  const d = draft(s);
  d.final!.phase = phase;
  return d;
}

export function validateFinalWager(s: Session, teamId: string, amount: number): string | null {
  if (!Number.isFinite(amount) || !Number.isInteger(amount)) return 'Enter a whole number.';
  if (amount < 0) return 'Wager cannot be negative.';
  const max = finalMaxWager(s, teamId);
  if (amount > max) return `Maximum wager is ${max}.`;
  return null;
}

export function setFinalWager(s: Session, teamId: string, amount: number): Session {
  if (!s.final || validateFinalWager(s, teamId, amount)) return s;
  const d = draft(s);
  d.final!.wagers[teamId] = amount;
  return d;
}

export function clearFinalWager(s: Session, teamId: string): Session {
  if (!s.final) return s;
  const d = draft(s);
  delete d.final!.wagers[teamId];
  return d;
}

export function setFinalAnswer(s: Session, teamId: string, answer: string): Session {
  if (!s.final) return s;
  const d = draft(s);
  d.final!.answers[teamId] = answer;
  return d;
}

export function allWagersIn(s: Session): boolean {
  return !!s.final && s.teams.every((t) => s.final!.wagers[t.id] != null);
}

export function showFinalResponse(s: Session, teamId: string): Session {
  if (!s.final) return s;
  const d = draft(s);
  d.final!.shown[teamId] = true;
  return d;
}

export function judgeFinal(s: Session, teamId: string, correct: boolean): Session {
  if (!s.final || s.final.results[teamId]) return s;
  const team = s.teams.find((t) => t.id === teamId);
  if (!team) return s;
  const wager = s.final.wagers[teamId] ?? 0;
  const d = withUndo(s, `Final: ${team.name} ${correct ? 'correct' : 'incorrect'}`);
  d.final!.results[teamId] = correct ? 'correct' : 'incorrect';
  d.final!.shown[teamId] = true;
  const delta = correct ? wager : s.game.settings.negativeScoring ? -wager : 0;
  addScore(d, teamId, delta, correct ? 'final_correct' : 'final_incorrect', 'Final Jeopardy');
  return d;
}

export function revealFinalAnswer(s: Session): Session {
  if (!s.final) return s;
  const d = draft(s);
  d.final!.answerRevealed = true;
  return d;
}

/** Order teams are revealed in: lowest score first, like the TV show. */
export function finalRevealOrder(s: Session): SessionTeam[] {
  return [...s.teams].sort((a, b) => a.score - b.score);
}

export function finishGame(s: Session): Session {
  if (s.status === 'finished') return s;
  const d = withUndo(s, 'End game');
  d.current = null;
  if (d.paused) {
    d.pausedMs += d.pausedAt ? Date.now() - d.pausedAt : 0;
    d.paused = false;
    d.pausedAt = null;
  }
  d.status = 'finished';
  if (d.final) d.final.phase = 'done';
  d.endedAt = Date.now();
  return d;
}

// ---------- stats ----------

export function rankings(s: Session): (SessionTeam & { rank: number })[] {
  const sorted = [...s.teams].sort((a, b) => b.score - a.score);
  let rank = 0;
  let prev: number | null = null;
  return sorted.map((t, i) => {
    if (t.score !== prev) rank = i + 1;
    prev = t.score;
    return { ...t, rank };
  });
}

export function leaders(s: Session): string[] {
  if (!s.teams.length) return [];
  const top = Math.max(...s.teams.map((t) => t.score));
  if (top === 0 && s.log.length === 0) return [];
  return s.teams.filter((t) => t.score === top).map((t) => t.id);
}

export function teamStats(s: Session, teamId: string) {
  let correct = 0;
  let incorrect = 0;
  for (const e of s.log) {
    if (e.teamId !== teamId) continue;
    if (e.kind === 'correct' || e.kind === 'final_correct') correct++;
    if (e.kind === 'incorrect' || e.kind === 'final_incorrect') incorrect++;
  }
  return { correct, incorrect };
}

export function durationMs(s: Session, now = Date.now()): number {
  const end = s.endedAt ?? now;
  const pausedNow = s.paused && s.pausedAt ? now - s.pausedAt : 0;
  return Math.max(0, end - s.startedAt - s.pausedMs - pausedNow);
}

export function formatDuration(ms: number): string {
  const total = Math.floor(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const sec = total % 60;
  return h ? `${h}h ${m}m ${sec}s` : `${m}m ${sec.toString().padStart(2, '0')}s`;
}
