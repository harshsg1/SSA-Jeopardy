import type { Question } from '../types';

const STRIP_PREFIX = /^(what|who|where|when|which)\s+(is|are|was|were)\s+/i;

export function normalizeAnswer(s: string): string {
  const base = s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(STRIP_PREFIX, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const withoutArticles = base.replace(/\b(the|a|an)\b/g, ' ').replace(/\s+/g, ' ').trim();
  // Keep the article when it is the whole answer (e.g. the answer "A").
  return withoutArticles || base;
}

function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  const dp = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let prev = dp[0];
    dp[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = dp[j];
      dp[j] = Math.min(dp[j] + 1, dp[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = tmp;
    }
  }
  return dp[b.length];
}

/** The text form of a question's correct answer (handles MC / TF). */
export function correctAnswerText(q: Question): string {
  if (q.type === 'multiple_choice') return q.choices[q.correctChoice] ?? q.answer;
  if (q.type === 'true_false') return q.correctChoice === 0 ? 'True' : 'False';
  return q.answer;
}

/** Lenient check of a typed response against the answer and alternatives (used in practice mode). */
export function isAcceptedAnswer(q: Question, response: string): boolean {
  const r = normalizeAnswer(response);
  if (!r) return false;
  const accepted = [correctAnswerText(q), q.answer, ...q.altAnswers].map(normalizeAnswer).filter(Boolean);
  return accepted.some((a) => {
    if (a === r) return true;
    const tolerance = a.length >= 8 ? 2 : a.length >= 5 ? 1 : 0;
    return levenshtein(a, r) <= tolerance;
  });
}
