import type { Game } from '../types';

export interface Issue {
  level: 'error' | 'warning';
  message: string;
  questionId?: string;
  categoryId?: string;
}

export function validateGame(game: Game): Issue[] {
  const issues: Issue[] = [];
  if (!game.title.trim()) issues.push({ level: 'warning', message: 'Game has no title.' });
  if (game.categories.length === 0) issues.push({ level: 'error', message: 'Add at least one category.' });
  const total = game.categories.reduce((n, c) => n + c.questions.length, 0);
  if (game.categories.length && total === 0) issues.push({ level: 'error', message: 'Add at least one question.' });
  game.categories.forEach((c, ci) => {
    const cname = c.name.trim() || `Category ${ci + 1}`;
    if (!c.name.trim()) issues.push({ level: 'warning', message: `Category ${ci + 1} has no name.`, categoryId: c.id });
    c.questions.forEach((q, qi) => {
      const where = `${cname} · ${q.value}`;
      if (!q.prompt.trim()) issues.push({ level: 'warning', message: `${where}: question text is empty.`, questionId: q.id, categoryId: c.id });
      if (q.type === 'multiple_choice') {
        const filled = q.choices.filter((x) => x.trim());
        if (filled.length < 2) issues.push({ level: 'warning', message: `${where}: needs at least 2 choices.`, questionId: q.id });
        else if (!q.choices[q.correctChoice]?.trim()) issues.push({ level: 'warning', message: `${where}: correct choice is empty.`, questionId: q.id });
      } else if (q.type !== 'true_false' && !q.answer.trim()) {
        issues.push({ level: 'warning', message: `${where}: answer is empty.`, questionId: q.id, categoryId: c.id });
      }
      if (q.type === 'image' && !q.media.image) issues.push({ level: 'warning', message: `${where}: image question has no image.`, questionId: q.id });
      if (q.type === 'audio' && !q.media.audio) issues.push({ level: 'warning', message: `${where}: audio question has no audio.`, questionId: q.id });
      if (q.type === 'video' && !q.media.video) issues.push({ level: 'warning', message: `${where}: video question has no video.`, questionId: q.id });
      if (!Number.isFinite(q.value) || q.value < 0) issues.push({ level: 'error', message: `${cname} row ${qi + 1}: invalid point value.`, questionId: q.id });
    });
  });
  const f = game.finalRound;
  if (f.enabled && (!f.question.trim() || !f.answer.trim()))
    issues.push({ level: 'warning', message: 'Final Jeopardy is enabled but its question or answer is empty (it will be skipped if the question is empty).' });
  return issues;
}

export function questionHasIssue(issues: Issue[], questionId: string) {
  return issues.some((i) => i.questionId === questionId);
}
