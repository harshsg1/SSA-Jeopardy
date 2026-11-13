import type {
  BoardTheme,
  Category,
  FinalRound,
  Game,
  GameSettings,
  Question,
  QuestionType,
  Team,
} from '../types';

export const uid = (prefix = ''): string =>
  prefix + Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-4);

export const DEFAULT_VALUES = [100, 200, 300, 400, 500];

export const TEAM_COLORS = [
  '#ef4444', '#3b82f6', '#22c55e', '#f59e0b', '#a855f7', '#ec4899',
  '#14b8a6', '#f97316', '#84cc16', '#06b6d4', '#e11d48', '#6366f1',
];

export const TEAM_AVATARS = ['🦁', '🐯', '🦊', '🐼', '🦉', '🐙', '🦄', '🐸', '🚀', '⚡', '🔥', '🌟', '🎯', '🧠', '🏆', '🎸'];

export const CATEGORY_COLORS = ['', '#1d4ed8', '#7c3aed', '#be123c', '#047857', '#b45309', '#0e7490', '#4338ca', '#9d174d'];

export const FONT_OPTIONS: { label: string; value: string }[] = [
  { label: 'Anton (Game Show)', value: "'Anton', Impact, sans-serif" },
  { label: 'Bebas Neue', value: "'Bebas Neue', Impact, sans-serif" },
  { label: 'Oswald', value: "'Oswald', 'Arial Narrow', sans-serif" },
  { label: 'Inter (Modern)', value: "'Inter', system-ui, sans-serif" },
  { label: 'Merriweather (Serif)', value: "'Merriweather', Georgia, serif" },
  { label: 'Fredoka (Playful)', value: "'Fredoka', 'Comic Sans MS', sans-serif" },
];

export const QUESTION_TYPE_LABELS: Record<QuestionType, string> = {
  standard: 'Standard text',
  image: 'Image',
  audio: 'Audio identification',
  video: 'Video',
  multiple_choice: 'Multiple choice',
  true_false: 'True / False',
  fill_blank: 'Fill in the blank',
};

export function defaultSettings(): GameSettings {
  return {
    mode: 'teams',
    timerEnabled: true,
    timerSeconds: 30,
    negativeScoring: true,
    allowMultipleAttempts: true,
    randomDailyDoubles: false,
    randomDailyDoubleCount: 1,
    ddMinWager: 5,
    ddMaxRule: 'score_or_board_max',
    ddCustomMax: 2000,
    correctPicksNext: true,
    autoRevealOnCorrect: true,
    showHints: true,
  };
}

export function defaultTheme(): BoardTheme {
  return {
    boardColor: '#050a30',
    tileColor: '#0a1a8f',
    valueColor: '#ffcc33',
    textColor: '#ffffff',
    fontFamily: FONT_OPTIONS[0].value,
    backgroundImage: '',
    layout: 'classic',
  };
}

export function defaultFinal(): FinalRound {
  return { enabled: true, category: '', question: '', answer: '', image: '', timerSeconds: 30 };
}

export function createQuestion(value: number, partial: Partial<Question> = {}): Question {
  return {
    id: uid('q_'),
    value,
    type: 'standard',
    prompt: '',
    answer: '',
    altAnswers: [],
    choices: ['', '', '', ''],
    correctChoice: 0,
    media: {},
    hint: '',
    explanation: '',
    links: [],
    difficulty: value <= 200 ? 'easy' : value <= 400 ? 'medium' : 'hard',
    tags: [],
    dailyDouble: false,
    ...partial,
  };
}

export function createCategory(name = 'New Category', rows = 5, values = DEFAULT_VALUES): Category {
  return {
    id: uid('c_'),
    name,
    description: '',
    color: '',
    questions: Array.from({ length: rows }, (_, i) => createQuestion(values[i] ?? (i + 1) * 100)),
  };
}

export function createTeam(index: number, name?: string): Team {
  return {
    id: uid('t_'),
    name: name ?? `Team ${index + 1}`,
    color: TEAM_COLORS[index % TEAM_COLORS.length],
    avatar: TEAM_AVATARS[index % TEAM_AVATARS.length],
  };
}

export function createGame(partial: Partial<Game> = {}): Game {
  const now = Date.now();
  return {
    id: uid('g_'),
    title: 'Untitled Game',
    description: '',
    createdAt: now,
    updatedAt: now,
    isTemplate: false,
    categories: Array.from({ length: 6 }, (_, i) => createCategory(`Category ${i + 1}`)),
    finalRound: defaultFinal(),
    settings: defaultSettings(),
    theme: defaultTheme(),
    teams: [createTeam(0), createTeam(1), createTeam(2)],
    notes: '',
    ...partial,
  };
}

/** Deep clone with fresh IDs for everything (used by duplicate & templates). */
export function cloneGameWithNewIds(game: Game, overrides: Partial<Game> = {}): Game {
  const now = Date.now();
  const copy: Game = structuredClone(game);
  copy.id = uid('g_');
  copy.createdAt = now;
  copy.updatedAt = now;
  copy.categories = copy.categories.map((c) => ({
    ...c,
    id: uid('c_'),
    questions: c.questions.map((q) => ({ ...q, id: uid('q_') })),
  }));
  copy.teams = copy.teams.map((t) => ({ ...t, id: uid('t_') }));
  return { ...copy, ...overrides };
}

export function boardRows(game: Pick<Game, 'categories'>): number {
  return game.categories.reduce((m, c) => Math.max(m, c.questions.length), 0);
}

export function allQuestions(game: Pick<Game, 'categories'>): Question[] {
  return game.categories.flatMap((c) => c.questions);
}

export function findQuestion(game: Pick<Game, 'categories'>, questionId: string) {
  for (const category of game.categories) {
    const question = category.questions.find((q) => q.id === questionId);
    if (question) return { category, question };
  }
  return null;
}

/** Fill missing fields so older / imported data always matches the current schema. */
export function normalizeGame(raw: any): Game {
  const base = createGame();
  const g: Game = {
    ...base,
    ...raw,
    settings: { ...defaultSettings(), ...(raw?.settings ?? {}) },
    theme: { ...defaultTheme(), ...(raw?.theme ?? {}) },
    finalRound: { ...defaultFinal(), ...(raw?.finalRound ?? {}) },
    teams: Array.isArray(raw?.teams) ? raw.teams.map((t: any, i: number) => ({ ...createTeam(i), ...t })) : base.teams,
    notes: typeof raw?.notes === 'string' ? raw.notes : '',
    isTemplate: !!raw?.isTemplate,
  };
  g.categories = (Array.isArray(raw?.categories) ? raw.categories : []).map((c: any) => ({
    id: typeof c?.id === 'string' ? c.id : uid('c_'),
    name: String(c?.name ?? 'Category'),
    description: String(c?.description ?? ''),
    color: String(c?.color ?? ''),
    questions: (Array.isArray(c?.questions) ? c.questions : []).map((q: any, i: number) => {
      const value = Number.isFinite(Number(q?.value)) ? Number(q.value) : (i + 1) * 100;
      const merged = { ...createQuestion(value), ...q, value };
      merged.id = typeof q?.id === 'string' ? q.id : uid('q_');
      merged.altAnswers = Array.isArray(q?.altAnswers) ? q.altAnswers.map(String) : [];
      merged.choices = Array.isArray(q?.choices) ? q.choices.map(String) : ['', '', '', ''];
      merged.tags = Array.isArray(q?.tags) ? q.tags.map(String) : [];
      merged.links = Array.isArray(q?.links) ? q.links.filter((l: any) => l && l.url) : [];
      merged.media = typeof q?.media === 'object' && q.media ? q.media : {};
      merged.prompt = String(merged.prompt ?? '');
      merged.answer = String(merged.answer ?? '');
      return merged as Question;
    }),
  }));
  return g;
}
