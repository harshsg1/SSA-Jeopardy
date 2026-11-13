// Core domain types for SSA Jeopardy.

export type QuestionType =
  | 'standard'
  | 'image'
  | 'audio'
  | 'video'
  | 'multiple_choice'
  | 'true_false'
  | 'fill_blank';

export type Difficulty = 'easy' | 'medium' | 'hard';

export interface LinkRef {
  label: string;
  url: string;
}

export interface QuestionMedia {
  image?: string; // URL or data URL
  audio?: string;
  video?: string; // URL, data URL, or YouTube link
}

export interface Question {
  id: string;
  value: number;
  type: QuestionType;
  prompt: string;
  answer: string;
  altAnswers: string[];
  choices: string[]; // multiple choice options
  correctChoice: number; // index into choices (MC) / 0 = True, 1 = False (T/F)
  media: QuestionMedia;
  hint: string;
  explanation: string;
  links: LinkRef[];
  difficulty: Difficulty;
  tags: string[];
  dailyDouble: boolean;
}

export interface Category {
  id: string;
  name: string;
  description: string;
  color: string; // '' = use board default
  questions: Question[];
}

export interface FinalRound {
  enabled: boolean;
  category: string;
  question: string;
  answer: string;
  image?: string;
  timerSeconds: number;
}

export type WagerMaxRule = 'score_or_board_max' | 'score_only' | 'custom';

export interface GameSettings {
  mode: 'teams' | 'individual';
  timerEnabled: boolean;
  timerSeconds: number;
  negativeScoring: boolean;
  allowMultipleAttempts: boolean;
  randomDailyDoubles: boolean;
  randomDailyDoubleCount: number;
  ddMinWager: number;
  ddMaxRule: WagerMaxRule;
  ddCustomMax: number;
  correctPicksNext: boolean; // team answering correctly becomes active team
  autoRevealOnCorrect: boolean;
  showHints: boolean;
}

export type BoardLayout = 'classic' | 'modern';

export interface BoardTheme {
  boardColor: string;
  tileColor: string;
  valueColor: string;
  textColor: string;
  fontFamily: string;
  backgroundImage: string;
  layout: BoardLayout;
}

export interface Team {
  id: string;
  name: string;
  color: string;
  avatar: string; // emoji or image data URL
}

export interface Game {
  id: string;
  title: string;
  description: string;
  createdAt: number;
  updatedAt: number;
  isTemplate: boolean;
  categories: Category[];
  finalRound: FinalRound;
  settings: GameSettings;
  theme: BoardTheme;
  teams: Team[];
  notes: string;
}

// ---------- Live session ----------

export interface SessionTeam extends Team {
  score: number;
}

export type ScoreKind = 'correct' | 'incorrect' | 'manual' | 'final_correct' | 'final_incorrect' | 'set';

export interface ScoreEvent {
  id: string;
  teamId: string;
  delta: number;
  kind: ScoreKind;
  questionId?: string;
  label: string;
  ts: number;
}

export interface Attempt {
  teamId: string;
  correct: boolean;
}

export interface PlayedRecord {
  status: 'answered' | 'skipped' | 'revealed';
  attempts: Attempt[];
  wager?: number;
}

export type CurrentPhase = 'dd_splash' | 'dd_wager' | 'question';

export interface CurrentQuestion {
  questionId: string;
  phase: CurrentPhase;
  wager: number | null;
  ddTeamId: string | null;
  attempts: Attempt[];
  revealed: boolean;
  hintShown: boolean;
  openedAt: number;
}

export type FinalPhase = 'category' | 'wager' | 'question' | 'reveal' | 'done';

export interface FinalState {
  phase: FinalPhase;
  wagers: Record<string, number>;
  answers: Record<string, string>;
  results: Record<string, 'correct' | 'incorrect'>;
  shown: Record<string, boolean>;
  answerRevealed: boolean;
}

export type SessionStatus = 'playing' | 'final' | 'finished';

export interface SessionSnapshot {
  teams: SessionTeam[];
  played: Record<string, PlayedRecord>;
  current: CurrentQuestion | null;
  log: ScoreEvent[];
  status: SessionStatus;
  final: FinalState | null;
  activeTeamId: string | null;
  label: string;
}

export interface Session {
  id: string;
  gameId: string;
  game: Game; // snapshot taken when the game started
  practice: boolean;
  teams: SessionTeam[];
  activeTeamId: string | null;
  played: Record<string, PlayedRecord>;
  dailyDoubles: string[];
  current: CurrentQuestion | null;
  log: ScoreEvent[];
  undo: SessionSnapshot[];
  status: SessionStatus;
  final: FinalState | null;
  startedAt: number;
  updatedAt: number;
  endedAt: number | null;
  paused: boolean;
  pausedAt: number | null;
  pausedMs: number;
}

export interface Prefs {
  soundEnabled: boolean;
  volume: number; // 0..1
  musicEnabled: boolean;
}
