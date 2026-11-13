import { create } from 'zustand';
import { persist, createJSONStorage, type StateStorage } from 'zustand/middleware';
import { get as idbGet, set as idbSet, del as idbDel } from 'idb-keyval';
import type { Game, Prefs, Session } from '../types';
import { cloneGameWithNewIds, normalizeGame } from '../lib/factory';
import { buildCanadaCategory, buildDemoGame, buildPopCultureCategory, buildPunjabiCategory, buildSikhiCategory, buildSportsCategory, buildSsaGame, SSA_600 } from '../lib/templates';

// ---------- IndexedDB storage with debounced writes ----------
// Media (images/audio/video) is stored inline as data URLs, which can exceed
// localStorage quotas, so persistence lives in IndexedDB.

const pending = new Map<string, string>();
let flushTimer: ReturnType<typeof setTimeout> | null = null;
let saveListeners: ((state: 'saving' | 'saved' | 'error') => void)[] = [];

export function onSaveState(fn: (state: 'saving' | 'saved' | 'error') => void) {
  saveListeners.push(fn);
  return () => {
    saveListeners = saveListeners.filter((f) => f !== fn);
  };
}

const emit = (state: 'saving' | 'saved' | 'error') => saveListeners.forEach((f) => f(state));

export async function flushStorage(): Promise<void> {
  if (flushTimer) clearTimeout(flushTimer);
  flushTimer = null;
  const entries = [...pending.entries()];
  pending.clear();
  if (!entries.length) return;
  try {
    await Promise.all(entries.map(([k, v]) => idbSet(k, v)));
    emit('saved');
  } catch (err) {
    console.error('Save failed', err);
    // Fall back to localStorage so data is not lost.
    try {
      entries.forEach(([k, v]) => localStorage.setItem(k, v));
      emit('saved');
    } catch {
      emit('error');
    }
  }
}

const idbStorage: StateStorage = {
  getItem: async (name) => {
    try {
      const v = await idbGet<string>(name);
      return v ?? localStorage.getItem(name);
    } catch {
      return localStorage.getItem(name);
    }
  },
  setItem: (name, value) => {
    pending.set(name, value);
    emit('saving');
    if (flushTimer) clearTimeout(flushTimer);
    flushTimer = setTimeout(flushStorage, 300);
  },
  removeItem: async (name) => {
    await idbDel(name);
  },
};

if (typeof window !== 'undefined') {
  window.addEventListener('pagehide', () => void flushStorage());
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') void flushStorage();
  });
}

// ---------- Store ----------

export interface AppState {
  hydrated: boolean;
  seeded: boolean;
  seededSsa: boolean;
  seededPunjabi: boolean;
  seededCanada: boolean;
  seededSikhi: boolean;
  seededSports: boolean;
  seededPop: boolean;
  seeded600: boolean;
  games: Game[];
  sessions: Session[];
  prefs: Prefs;

  // games
  addGame: (game: Game) => Game;
  updateGame: (id: string, updater: (g: Game) => Game) => void;
  deleteGame: (id: string) => void;
  duplicateGame: (id: string, asTemplate?: boolean) => Game | null;
  importGames: (data: unknown) => { imported: number; errors: string[] };

  // sessions
  addSession: (session: Session) => void;
  updateSession: (id: string, updater: (s: Session) => Session) => void;
  deleteSession: (id: string) => void;
  clearHistory: () => void;

  setPrefs: (patch: Partial<Prefs>) => void;
}

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      hydrated: false,
      seeded: false,
      seededSsa: false,
      seededPunjabi: false,
      seededCanada: false,
      seededSikhi: false,
      seededSports: false,
      seededPop: false,
      seeded600: false,
      games: [],
      sessions: [],
      prefs: { soundEnabled: true, volume: 0.6, musicEnabled: true },

      addGame: (game) => {
        set((s) => ({ games: [game, ...s.games] }));
        return game;
      },
      updateGame: (id, updater) =>
        set((s) => ({
          games: s.games.map((g) => (g.id === id ? { ...updater(g), id: g.id, updatedAt: Date.now() } : g)),
        })),
      deleteGame: (id) => set((s) => ({ games: s.games.filter((g) => g.id !== id) })),
      duplicateGame: (id, asTemplate = false) => {
        const src = get().games.find((g) => g.id === id);
        if (!src) return null;
        const copy = cloneGameWithNewIds(src, {
          title: asTemplate ? `${src.title} (Template)` : `${src.title} (Copy)`,
          isTemplate: asTemplate,
        });
        set((s) => ({ games: [copy, ...s.games] }));
        return copy;
      },
      importGames: (data) => {
        const errors: string[] = [];
        const list: unknown[] = Array.isArray(data)
          ? data
          : data && typeof data === 'object' && Array.isArray((data as any).games)
            ? (data as any).games
            : [data];
        const imported: Game[] = [];
        list.forEach((raw, i) => {
          const r = raw as any;
          if (!r || typeof r !== 'object' || !Array.isArray(r.categories)) {
            errors.push(`Item ${i + 1}: not a valid game (missing "categories").`);
            return;
          }
          try {
            const g = normalizeGame(r);
            // Always import as a new game so nothing is overwritten.
            imported.push(cloneGameWithNewIds(g, { title: g.title || 'Imported Game' }));
          } catch (e) {
            errors.push(`Item ${i + 1}: ${(e as Error).message}`);
          }
        });
        if (imported.length) set((s) => ({ games: [...imported, ...s.games] }));
        return { imported: imported.length, errors };
      },

      addSession: (session) => set((s) => ({ sessions: [session, ...s.sessions] })),
      updateSession: (id, updater) =>
        set((s) => ({ sessions: s.sessions.map((x) => (x.id === id ? updater(x) : x)) })),
      deleteSession: (id) => set((s) => ({ sessions: s.sessions.filter((x) => x.id !== id) })),
      clearHistory: () => set((s) => ({ sessions: s.sessions.filter((x) => x.status !== 'finished') })),

      setPrefs: (patch) => set((s) => ({ prefs: { ...s.prefs, ...patch } })),
    }),
    {
      name: 'ssa-jeopardy-v1',
      version: 1,
      storage: createJSONStorage(() => idbStorage),
      partialize: (s) => ({ games: s.games, sessions: s.sessions, prefs: s.prefs, seeded: s.seeded, seededSsa: s.seededSsa, seededPunjabi: s.seededPunjabi, seededCanada: s.seededCanada, seededSikhi: s.seededSikhi, seededSports: s.seededSports, seededPop: s.seededPop, seeded600: s.seeded600 }),
      onRehydrateStorage: () => (state, error) => {
        if (error) console.error('Failed to load saved data', error);
        useStore.setState({ hydrated: true });
        const st = state ?? useStore.getState();
        if (!st.seeded) {
          // First run: ship a playable demo game.
          useStore.setState((s) => ({ seeded: true, games: [...s.games, buildDemoGame()] }));
        } else if (state) {
          useStore.setState({ games: state.games.map(normalizeGame) });
        }
        if (!useStore.getState().seededSsa) {
          useStore.setState((s) => ({ seededSsa: true, seededPunjabi: true, seededCanada: true, seededSikhi: true, seededSports: true, seededPop: true, seeded600: true, games: [buildSsaGame(), ...s.games] }));
        }
        // Add later-added categories to an already-saved SSA game (each runs once).
        const additions = [
          ['seededPunjabi', 'Punjabi Culture', buildPunjabiCategory],
          ['seededCanada', 'Canada', buildCanadaCategory],
          ['seededSikhi', 'Sikhi', buildSikhiCategory],
          ['seededSports', 'Sports', buildSportsCategory],
          ['seededPop', 'Pop Culture & Entertainment', buildPopCultureCategory],
        ] as const;
        for (const [flag, name, build] of additions) {
          if (useStore.getState()[flag]) continue;
          useStore.setState((s) => ({
            [flag]: true,
            games: s.games.map((g) =>
              g.title === 'SSA Jeopardy Night' && !g.categories.some((c) => c.name === name)
                ? { ...g, categories: [...g.categories, build()], updatedAt: Date.now() }
                : g,
            ),
          }));
        }
        // Fill blank $600 clues in saved SSA games (runs once; never overwrites written clues).
        if (!useStore.getState().seeded600) {
          useStore.setState((s) => ({
            seeded600: true,
            games: s.games.map((g) => {
              if (g.title !== 'SSA Jeopardy Night') return g;
              let changed = false;
              const categories = g.categories.map((c) => {
                const clue = SSA_600[c.name];
                if (!clue) return c;
                const idx = c.questions.findIndex((q) => q.value === 600 && !q.prompt.trim() && !q.answer.trim());
                if (idx < 0) return c;
                changed = true;
                return { ...c, questions: c.questions.map((q, i) => (i === idx ? { ...q, ...clue, altAnswers: clue.altAnswers ?? [], difficulty: 'hard' as const } : q)) };
              });
              return changed ? { ...g, categories, updatedAt: Date.now() } : g;
            }),
          }));
        }
      },
    },
  ),
);
