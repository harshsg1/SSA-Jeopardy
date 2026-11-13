import { describe, expect, it } from 'vitest';
import * as E from './engine';
import { createGame, createTeam } from '../lib/factory';
import { buildDemoGame } from '../lib/templates';
import { isAcceptedAnswer } from '../lib/answers';

function setup(mod?: (g: ReturnType<typeof createGame>) => void) {
  const game = buildDemoGame();
  game.categories.forEach((c) => c.questions.forEach((q) => (q.dailyDouble = false)));
  mod?.(game);
  const teams = [createTeam(0, 'A'), createTeam(1, 'B'), createTeam(2, 'C')];
  return { game, teams, s: E.createSession(game, teams) };
}

describe('engine', () => {
  it('awards and deducts points, prevents double selection', () => {
    const { game, teams, s: s0 } = setup();
    const q = game.categories[0].questions[0]; // 100
    let s = E.openQuestion(s0, q.id);
    expect(s.current?.phase).toBe('question');
    s = E.markIncorrect(s, teams[0].id);
    expect(s.teams[0].score).toBe(-100);
    s = E.markIncorrect(s, teams[0].id); // already attempted → ignored
    expect(s.teams[0].score).toBe(-100);
    s = E.markCorrect(s, teams[1].id);
    expect(s.teams[1].score).toBe(100);
    expect(s.activeTeamId).toBe(teams[1].id);
    expect(s.current?.revealed).toBe(true);
    s = E.markCorrect(s, teams[2].id); // already answered → ignored
    expect(s.teams[2].score).toBe(0);
    s = E.closeQuestion(s);
    expect(s.played[q.id].status).toBe('answered');
    expect(E.openQuestion(s, q.id)).toBe(s);
    expect(E.progress(s).done).toBe(1);
  });

  it('undoes scoring actions in order', () => {
    const { game, teams, s: s0 } = setup();
    let s = E.openQuestion(s0, game.categories[1].questions[2].id);
    s = E.markIncorrect(s, teams[0].id);
    s = E.markCorrect(s, teams[1].id);
    s = E.undo(s);
    expect(s.teams[1].score).toBe(0);
    expect(s.teams[0].score).toBe(-300);
    expect(s.current?.attempts.length).toBe(1);
    s = E.undo(s);
    expect(s.teams[0].score).toBe(0);
    s = E.adjustScore(s, teams[2].id, 250);
    expect(s.teams[2].score).toBe(250);
    s = E.setScore(s, teams[2].id, 1000);
    expect(s.teams[2].score).toBe(1000);
    s = E.undo(E.undo(s));
    expect(s.teams[2].score).toBe(0);
  });

  it('respects disabled negative scoring and single-attempt rule', () => {
    const { game, teams, s: s0 } = setup((g) => {
      g.settings.negativeScoring = false;
      g.settings.allowMultipleAttempts = false;
    });
    let s = E.openQuestion(s0, game.categories[0].questions[1].id);
    s = E.markIncorrect(s, teams[0].id);
    expect(s.teams[0].score).toBe(0);
    expect(s.current?.revealed).toBe(true);
    expect(E.eligibleTeams(s)).toHaveLength(0);
  });

  it('untouched questions return to the board; skip marks played', () => {
    const { game, s: s0 } = setup();
    const id = game.categories[0].questions[0].id;
    let s = E.closeQuestion(E.openQuestion(s0, id));
    expect(s.played[id]).toBeUndefined();
    s = E.skipQuestion(E.openQuestion(s, id));
    expect(s.played[id].status).toBe('skipped');
    s = E.reopenTile(s, id);
    expect(s.played[id]).toBeUndefined();
  });

  it('handles Daily Double wagers with limits', () => {
    const { game, teams, s: s0 } = setup((g) => {
      g.categories[0].questions[3].dailyDouble = true;
    });
    const ddId = game.categories[0].questions[3].id;
    expect(s0.dailyDoubles).toEqual([ddId]);
    let s = E.openQuestion(s0, ddId);
    expect(s.current?.phase).toBe('dd_splash');
    s = E.ddToWager(s);
    const lim = E.wagerLimits(s, teams[0].id);
    expect(lim).toEqual({ min: 5, max: 500 });
    expect(E.validateWager(s, teams[0].id, 600)).toBeTruthy();
    expect(E.submitWager(s, 600)).toBe(s);
    s = E.submitWager(s, 450);
    expect(s.current?.phase).toBe('question');
    // Only the DD team can answer
    expect(E.markCorrect(s, teams[1].id)).toBe(s);
    s = E.markIncorrect(s, teams[0].id);
    expect(s.teams[0].score).toBe(-450);
    expect(s.current?.revealed).toBe(true);
  });

  it('random daily doubles are generated', () => {
    const { s } = setup((g) => {
      g.settings.randomDailyDoubles = true;
      g.settings.randomDailyDoubleCount = 2;
    });
    expect(s.dailyDoubles).toHaveLength(2);
    expect(new Set(s.dailyDoubles).size).toBe(2);
  });

  it('runs Final Jeopardy and finishes with rankings', () => {
    const { teams, s: s0 } = setup();
    let s = E.adjustScore(s0, teams[0].id, 1000);
    s = E.adjustScore(s, teams[1].id, 500);
    s = E.startFinal(s);
    expect(s.status).toBe('final');
    expect(E.validateFinalWager(s, teams[1].id, 600)).toBeTruthy();
    expect(E.validateFinalWager(s, teams[2].id, 1)).toBeTruthy(); // score 0 → max 0
    s = E.setFinalWager(s, teams[0].id, 800);
    s = E.setFinalWager(s, teams[1].id, 500);
    expect(E.allWagersIn(s)).toBe(false);
    s = E.setFinalWager(s, teams[2].id, 0);
    expect(E.allWagersIn(s)).toBe(true);
    s = E.setFinalAnswer(s, teams[0].id, 'telephone');
    expect(E.finalRevealOrder(s).map((t) => t.name)).toEqual(['C', 'B', 'A']);
    s = E.judgeFinal(s, teams[0].id, false);
    s = E.judgeFinal(s, teams[1].id, true);
    s = E.judgeFinal(s, teams[1].id, false); // ignored, already judged
    expect(s.teams.find((t) => t.id === teams[0].id)!.score).toBe(200);
    expect(s.teams.find((t) => t.id === teams[1].id)!.score).toBe(1000);
    s = E.finishGame(s);
    expect(s.status).toBe('finished');
    expect(E.rankings(s)[0].name).toBe('B');
    expect(E.teamStats(s, teams[1].id)).toEqual({ correct: 1, incorrect: 0 });
    expect(E.leaders(s)).toEqual([teams[1].id]);
  });

  it('skips final when disabled', () => {
    const { s: s0 } = setup((g) => (g.finalRound.enabled = false));
    expect(E.startFinal(s0).status).toBe('finished');
  });

  it('matches answers leniently', () => {
    const game = buildDemoGame();
    const mars = game.categories[0].questions[0];
    expect(isAcceptedAnswer(mars, 'What is Mars?')).toBe(true);
    expect(isAcceptedAnswer(mars, 'mars')).toBe(true);
    expect(isAcceptedAnswer(mars, 'Venus')).toBe(false);
    const mito = game.categories[0].questions[3];
    expect(isAcceptedAnswer(mito, 'mitocondria')).toBe(true);
    const mc = game.categories[1].questions[2];
    expect(isAcceptedAnswer(mc, 'africa')).toBe(true);
    const letter = { ...mars, answer: 'A', altAnswers: [] };
    expect(isAcceptedAnswer(letter, 'a')).toBe(true);
    expect(isAcceptedAnswer(letter, 'b')).toBe(false);
  });
});
