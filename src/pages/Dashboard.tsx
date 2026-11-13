import { useMemo, useRef, useState } from 'react';
import {
  BarChart3,
  BookOpen,
  Copy,
  Download,
  FileUp,
  LayoutTemplate,
  Pencil,
  Play,
  Plus,
  RotateCcw,
  Search,
  Trash2,
  Trophy,
  Volume2,
  VolumeX,
} from 'lucide-react';
import type { Game } from '../types';
import { useStore } from '../store/store';
import { navigate } from '../lib/router';
import { cloneGameWithNewIds, boardRows } from '../lib/factory';
import { TEMPLATES } from '../lib/templates';
import { downloadJSON, safeFilename } from '../lib/files';
import { progress, rankings } from '../game/engine';
import { Button, IconButton, Modal, confirmDialog, relTime, toast, formatPoints } from '../components/ui';
import { StartGameDialog } from '../components/StartGameDialog';

export function Logo({ size = 'lg' }: { size?: 'lg' | 'sm' }) {
  return (
    <div className="flex items-center gap-3">
      <img
        src="/logo.png"
        alt="SFU SSA logo"
        className={`shrink-0 rounded-full bg-white object-cover shadow-lg ring-2 ring-gold-500/70 ${size === 'lg' ? 'h-14 w-14' : 'h-10 w-10'}`}
      />
      <div className={`font-display leading-none ${size === 'lg' ? 'text-3xl sm:text-4xl' : 'text-2xl'}`}>
        <span className="text-white">SSA </span>
        <span className="gold-shimmer">JEOPARDY</span>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const games = useStore((s) => s.games);
  const sessions = useStore((s) => s.sessions);
  const prefs = useStore((s) => s.prefs);
  const setPrefs = useStore((s) => s.setPrefs);
  const addGame = useStore((s) => s.addGame);
  const deleteGame = useStore((s) => s.deleteGame);
  const duplicateGame = useStore((s) => s.duplicateGame);
  const importGames = useStore((s) => s.importGames);
  const deleteSession = useStore((s) => s.deleteSession);

  const [newOpen, setNewOpen] = useState(false);
  const [startId, setStartId] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<'updated' | 'created' | 'title'>('updated');
  const fileRef = useRef<HTMLInputElement>(null);

  const myGames = useMemo(() => {
    const q = query.toLowerCase().trim();
    const list = games.filter((g) => !g.isTemplate && (!q || g.title.toLowerCase().includes(q) || g.description.toLowerCase().includes(q)));
    return list.sort((a, b) => (sort === 'title' ? a.title.localeCompare(b.title) : sort === 'created' ? b.createdAt - a.createdAt : b.updatedAt - a.updatedAt));
  }, [games, query, sort]);
  const myTemplates = games.filter((g) => g.isTemplate);
  const unfinished = sessions.filter((s) => s.status !== 'finished').sort((a, b) => b.updatedAt - a.updatedAt);
  const recent = sessions.filter((s) => s.status === 'finished' && !s.practice).sort((a, b) => (b.endedAt ?? 0) - (a.endedAt ?? 0)).slice(0, 6);

  const lastPlayed = (gameId: string) => sessions.filter((s) => s.gameId === gameId).reduce((m, s) => Math.max(m, s.updatedAt), 0);

  const createFrom = (g: Game) => {
    addGame(g);
    setNewOpen(false);
    navigate(`/edit/${g.id}`);
  };

  const onImport = async (file: File) => {
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      const { imported, errors } = importGames(data);
      if (imported) toast(`Imported ${imported} game${imported > 1 ? 's' : ''}.`, 'success');
      if (errors.length) toast(errors[0], 'error');
      if (!imported && !errors.length) toast('No games found in file.', 'error');
    } catch {
      toast('That file is not valid JSON.', 'error');
    }
  };

  const remove = async (g: Game) => {
    if (await confirmDialog({ title: 'Delete game?', message: <>“{g.title}” will be permanently deleted. Game history is kept.</>, confirmLabel: 'Delete', danger: true })) {
      deleteGame(g.id);
      toast('Game deleted.');
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 pb-16 pt-5 sm:px-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <Logo />
        <div className="flex flex-wrap items-center gap-2">
          <IconButton label={prefs.soundEnabled ? 'Mute sounds' : 'Enable sounds'} onClick={() => setPrefs({ soundEnabled: !prefs.soundEnabled })}>
            {prefs.soundEnabled ? <Volume2 size={20} /> : <VolumeX size={20} />}
          </IconButton>
          <Button icon={<BookOpen size={16} />} onClick={() => navigate('/rules')}>
            Rules
          </Button>
          <Button icon={<BarChart3 size={16} />} onClick={() => navigate('/stats')}>
            Stats &amp; History
          </Button>
          <Button icon={<FileUp size={16} />} onClick={() => fileRef.current?.click()}>
            Import
          </Button>
          <Button
            icon={<Download size={16} />}
            disabled={!games.length}
            onClick={() => downloadJSON(`ssa-jeopardy-all-games.json`, { app: 'ssa-jeopardy', version: 1, exportedAt: new Date().toISOString(), games })}
          >
            Export all
          </Button>
          <Button variant="gold" icon={<Plus size={18} />} onClick={() => setNewOpen(true)}>
            Create New Game
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0];
              e.target.value = '';
              if (f) void onImport(f);
            }}
          />
        </div>
      </header>

      {/* Hero */}
      <section className="panel relative mt-6 overflow-hidden p-6 sm:p-8">
        <div className="pointer-events-none absolute -right-10 -top-10 grid grid-cols-4 gap-2 opacity-20 rotate-12">
          {Array.from({ length: 16 }).map((_, i) => (
            <div key={i} className="flex h-14 w-20 items-center justify-center rounded bg-royal-600 font-display text-xl text-gold-500">
              ${(i % 5) * 100 + 100}
            </div>
          ))}
        </div>
        <h1 className="font-display text-4xl text-shadow-game sm:text-5xl">
          Host an unforgettable <span className="gold-shimmer">trivia night</span>.
        </h1>
        <p className="mt-2 max-w-2xl text-blue-100">Build custom boards, add teams, and run the whole show — scores, Daily Doubles, Final Jeopardy and all — from one screen.</p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Button variant="gold" size="lg" icon={<Plus size={20} />} onClick={() => setNewOpen(true)}>
            Create New Game
          </Button>
          {unfinished[0] && (
            <Button variant="primary" size="lg" icon={<RotateCcw size={18} />} onClick={() => navigate(`/play/${unfinished[0].id}`)}>
              Resume “{unfinished[0].game.title}”
            </Button>
          )}
        </div>
      </section>

      {/* Unfinished */}
      {unfinished.length > 0 && (
        <section className="mt-8">
          <SectionTitle>Games in progress</SectionTitle>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {unfinished.map((s) => {
              const p = progress(s);
              const lead = rankings(s)[0];
              return (
                <div key={s.id} className="panel p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-bold">{s.game.title}</div>
                      <div className="text-xs text-blue-200/60">
                        {s.practice ? 'Practice · ' : ''}
                        {s.status === 'final' ? 'Final Jeopardy' : `${p.done}/${p.total} clues played`} · {relTime(s.updatedAt)}
                      </div>
                    </div>
                    <IconButton
                      label="Abandon game"
                      onClick={async () => {
                        if (await confirmDialog({ title: 'Abandon this game?', message: 'Progress and scores for this session will be deleted.', confirmLabel: 'Abandon', danger: true }))
                          deleteSession(s.id);
                      }}
                    >
                      <Trash2 size={16} />
                    </IconButton>
                  </div>
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
                    <div className="h-full bg-gold-500" style={{ width: `${p.pct}%` }} />
                  </div>
                  {lead && (
                    <div className="mt-2 text-sm text-blue-100">
                      Leader: <b style={{ color: lead.color }}>{lead.name}</b> {formatPoints(lead.score)}
                    </div>
                  )}
                  <Button variant="primary" className="mt-3 w-full" icon={<Play size={16} />} onClick={() => navigate(`/play/${s.id}`)}>
                    Resume
                  </Button>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* My games */}
      <section className="mt-8">
        <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
          <SectionTitle className="!mb-0">My Saved Games</SectionTitle>
          <div className="flex gap-2">
            <div className="relative">
              <Search size={16} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-blue-200/50" />
              <input className="input !py-1.5 !pl-8" placeholder="Search games" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Search games" />
            </div>
            <select className="input !w-auto !py-1.5" value={sort} onChange={(e) => setSort(e.target.value as typeof sort)} aria-label="Sort games">
              <option value="updated">Last edited</option>
              <option value="created">Date created</option>
              <option value="title">Title</option>
            </select>
          </div>
        </div>
        {myGames.length === 0 ? (
          <div className="panel flex flex-col items-center p-10 text-center">
            <div className="text-5xl">🎲</div>
            <p className="mt-2 text-blue-100">{query ? 'No games match your search.' : 'No games yet. Create one or start from a template.'}</p>
            {!query && (
              <Button variant="gold" className="mt-4" icon={<Plus size={16} />} onClick={() => setNewOpen(true)}>
                Create New Game
              </Button>
            )}
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {myGames.map((g) => (
              <GameCard
                key={g.id}
                game={g}
                lastPlayed={lastPlayed(g.id)}
                onStart={() => setStartId(g.id)}
                onEdit={() => navigate(`/edit/${g.id}`)}
                onDuplicate={() => {
                  duplicateGame(g.id);
                  toast('Game duplicated.', 'success');
                }}
                onTemplate={() => {
                  duplicateGame(g.id, true);
                  toast('Saved as template.', 'success');
                }}
                onExport={() => downloadJSON(`${safeFilename(g.title)}.json`, g)}
                onDelete={() => remove(g)}
              />
            ))}
          </div>
        )}
      </section>

      {/* Recently played */}
      {recent.length > 0 && (
        <section className="mt-8">
          <SectionTitle>Recently Played</SectionTitle>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {recent.map((s) => {
              const winner = rankings(s)[0];
              return (
                <button key={s.id} type="button" onClick={() => navigate(`/summary/${s.id}`)} className="panel flex cursor-pointer items-center gap-3 p-4 text-left transition hover:brightness-125">
                  <Trophy className="shrink-0 text-gold-500" />
                  <div className="min-w-0">
                    <div className="truncate font-bold">{s.game.title}</div>
                    <div className="truncate text-sm text-blue-200/70">
                      {winner ? (
                        <>
                          Winner: <b style={{ color: winner.color }}>{winner.name}</b> · {formatPoints(winner.score)}
                        </>
                      ) : (
                        'No teams'
                      )}
                    </div>
                    <div className="text-xs text-blue-200/50">{relTime(s.endedAt ?? s.updatedAt)}</div>
                  </div>
                </button>
              );
            })}
          </div>
        </section>
      )}

      {/* Templates */}
      <section className="mt-8">
        <SectionTitle>Game Templates</SectionTitle>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {TEMPLATES.map((t) => (
            <button key={t.key} type="button" onClick={() => createFrom(t.build())} className="panel cursor-pointer p-4 text-left transition hover:-translate-y-0.5 hover:brightness-125">
              <div className="text-3xl">{t.emoji}</div>
              <div className="mt-1 font-bold">{t.name}</div>
              <div className="text-sm text-blue-200/70">{t.description}</div>
            </button>
          ))}
        </div>
        {myTemplates.length > 0 && (
          <>
            <h3 className="mb-2 mt-5 font-semibold text-blue-100">My templates</h3>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {myTemplates.map((g) => (
                <div key={g.id} className="panel flex items-center gap-2 p-3">
                  <LayoutTemplate className="shrink-0 text-gold-500" size={20} />
                  <div className="min-w-0 flex-1 truncate font-semibold">{g.title}</div>
                  <Button size="sm" variant="primary" onClick={() => createFrom(cloneGameWithNewIds(g, { isTemplate: false, title: g.title.replace(/ \(Template\)$/, '') }))}>
                    Use
                  </Button>
                  <IconButton label="Edit template" onClick={() => navigate(`/edit/${g.id}`)}>
                    <Pencil size={15} />
                  </IconButton>
                  <IconButton label="Delete template" onClick={() => remove(g)}>
                    <Trash2 size={15} />
                  </IconButton>
                </div>
              ))}
            </div>
          </>
        )}
      </section>

      <NewGameModal open={newOpen} onClose={() => setNewOpen(false)} onCreate={createFrom} templates={myTemplates} />
      {startId && <StartGameDialog gameId={startId} open onClose={() => setStartId(null)} />}
    </div>
  );
}

function SectionTitle({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <h2 className={`mb-3 font-display text-2xl tracking-wide text-gold-500 ${className}`}>{children}</h2>;
}

function GameCard({
  game,
  lastPlayed,
  onStart,
  onEdit,
  onDuplicate,
  onTemplate,
  onExport,
  onDelete,
}: {
  game: Game;
  lastPlayed: number;
  onStart: () => void;
  onEdit: () => void;
  onDuplicate: () => void;
  onTemplate: () => void;
  onExport: () => void;
  onDelete: () => void;
}) {
  const rows = boardRows(game);
  return (
    <div className="panel group flex flex-col overflow-hidden">
      <button type="button" onClick={onEdit} className="cursor-pointer p-3 pb-0" aria-label={`Edit ${game.title}`}>
        <div className="grid gap-1 rounded-lg p-1.5" style={{ background: game.theme.boardColor, gridTemplateColumns: `repeat(${Math.max(1, Math.min(game.categories.length, 8))}, 1fr)` }}>
          {game.categories.slice(0, 8).map((c) => (
            <div key={c.id} className="truncate rounded-sm px-0.5 py-1 text-center text-[9px] font-bold uppercase" style={{ background: c.color || game.theme.tileColor }}>
              {c.name || '—'}
            </div>
          ))}
          {Array.from({ length: Math.min(rows, 3) }).map((_, r) =>
            game.categories.slice(0, 8).map((c) => (
              <div key={c.id + r} className="rounded-sm py-0.5 text-center font-display text-[11px]" style={{ background: c.color || game.theme.tileColor, color: game.theme.valueColor }}>
                {c.questions[r] ? c.questions[r].value : ''}
              </div>
            )),
          )}
        </div>
      </button>
      <div className="flex flex-1 flex-col p-4 pt-3">
        <div className="text-lg font-bold leading-tight">{game.title || 'Untitled Game'}</div>
        {game.description && <p className="mt-0.5 line-clamp-2 text-sm text-blue-200/75">{game.description}</p>}
        <div className="mt-2 text-xs text-blue-200/50">
          {game.categories.length} categories × {rows} rows · Created {new Date(game.createdAt).toLocaleDateString()}
          {lastPlayed > 0 && <> · Played {relTime(lastPlayed)}</>}
        </div>
        <div className="mt-auto flex items-center gap-1 pt-3">
          <Button variant="gold" size="sm" icon={<Play size={14} />} onClick={onStart}>
            Start
          </Button>
          <Button size="sm" icon={<Pencil size={14} />} onClick={onEdit}>
            Edit
          </Button>
          <div className="ml-auto flex">
            <IconButton label="Duplicate" onClick={onDuplicate}>
              <Copy size={16} />
            </IconButton>
            <IconButton label="Save as template" onClick={onTemplate}>
              <LayoutTemplate size={16} />
            </IconButton>
            <IconButton label="Export JSON" onClick={onExport}>
              <Download size={16} />
            </IconButton>
            <IconButton label="Delete" onClick={onDelete} className="hover:!text-red-400">
              <Trash2 size={16} />
            </IconButton>
          </div>
        </div>
      </div>
    </div>
  );
}

function NewGameModal({ open, onClose, onCreate, templates }: { open: boolean; onClose: () => void; onCreate: (g: Game) => void; templates: Game[] }) {
  return (
    <Modal open={open} onClose={onClose} title="Create a new game" wide>
      <p className="mb-3 text-blue-100">Pick a starting point. Everything can be changed in the editor.</p>
      <div className="grid gap-3 sm:grid-cols-2">
        {TEMPLATES.map((t) => (
          <button key={t.key} type="button" onClick={() => onCreate(t.build())} className="flex cursor-pointer items-start gap-3 rounded-xl border border-white/10 bg-white/5 p-4 text-left hover:border-gold-500/60 hover:bg-white/10">
            <span className="text-3xl">{t.emoji}</span>
            <span>
              <span className="block font-bold">{t.name}</span>
              <span className="block text-sm text-blue-200/70">{t.description}</span>
            </span>
          </button>
        ))}
        {templates.map((g) => (
          <button
            key={g.id}
            type="button"
            onClick={() => onCreate(cloneGameWithNewIds(g, { isTemplate: false, title: g.title.replace(/ \(Template\)$/, '') }))}
            className="flex cursor-pointer items-start gap-3 rounded-xl border border-gold-500/20 bg-gold-500/5 p-4 text-left hover:border-gold-500/60"
          >
            <LayoutTemplate className="mt-1 text-gold-500" />
            <span>
              <span className="block font-bold">{g.title}</span>
              <span className="block text-sm text-blue-200/70">My template · {g.categories.length} categories</span>
            </span>
          </button>
        ))}
      </div>
    </Modal>
  );
}
