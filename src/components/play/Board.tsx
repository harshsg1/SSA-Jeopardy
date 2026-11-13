import type { CSSProperties, ReactNode } from 'react';
import { Check, SkipForward } from 'lucide-react';
import type { Game, PlayedRecord } from '../../types';
import { boardRows } from '../../lib/factory';

export function themeStyle(game: Game): CSSProperties {
  const t = game.theme;
  return {
    '--board-bg': t.boardColor,
    '--tile': t.tileColor,
    '--value-color': t.valueColor,
    '--text-color': t.textColor,
    '--board-font': t.fontFamily,
    backgroundColor: t.boardColor,
    backgroundImage: t.backgroundImage ? `linear-gradient(rgba(0,0,0,.45), rgba(0,0,0,.45)), url("${t.backgroundImage}")` : undefined,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    color: t.textColor,
  } as CSSProperties;
}

export function BoardGrid({
  game,
  played = {},
  onSelect,
  disabled,
  highlight,
}: {
  game: Game;
  played?: Record<string, PlayedRecord>;
  onSelect?: (questionId: string) => void;
  disabled?: boolean;
  highlight?: string | null;
}) {
  const rows = boardRows(game);
  const cols = game.categories.length;
  const modern = game.theme.layout === 'modern';
  const font = { fontFamily: game.theme.fontFamily };
  const gap = modern ? 'gap-2 sm:gap-3' : 'gap-1 sm:gap-1.5';

  if (!cols || !rows) return <div className="flex h-full items-center justify-center text-xl opacity-70">This board has no clues yet.</div>;

  return (
    <div className="h-full w-full overflow-x-auto">
      <div
        className={`grid h-full ${gap} ${modern ? '' : 'rounded-md bg-black p-1 sm:p-1.5'}`}
        style={{
          gridTemplateColumns: `repeat(${cols}, minmax(${cols > 6 ? 96 : 84}px, 1fr))`,
          gridTemplateRows: `minmax(56px, 1.15fr) repeat(${rows}, minmax(48px, 1fr))`,
          minWidth: cols * (cols > 6 ? 100 : 88),
        }}
      >
        {game.categories.map((c) => (
          <div
            key={c.id}
            title={c.description || undefined}
            className={`flex flex-col items-center justify-center overflow-hidden px-1.5 py-1 text-center ${modern ? 'rounded-xl shadow-lg' : 'border-b-4 border-black'}`}
            style={{ background: c.color || 'var(--tile)', ...font }}
          >
            <span
              className="text-shadow-game line-clamp-3 font-bold uppercase leading-tight"
              style={{ fontSize: `clamp(11px, ${Math.min(2.1, 11 / cols)}vw, 30px)`, color: 'var(--text-color)' }}
            >
              {c.name || '—'}
            </span>
          </div>
        ))}
        {Array.from({ length: rows }).map((_, r) =>
          game.categories.map((c, ci) => {
            const q = c.questions[r];
            if (!q) return <div key={c.id + r} className={modern ? '' : 'bg-black'} style={{ gridColumn: ci + 1, gridRow: r + 2 }} />;
            const rec = played[q.id];
            const isHighlighted = highlight === q.id;
            return (
              <button
                key={q.id}
                type="button"
                disabled={!!rec || disabled || !onSelect}
                onClick={() => onSelect?.(q.id)}
                aria-label={rec ? `${c.name} ${q.value} — played` : `${c.name} for ${q.value}`}
                className={`tile flex items-center justify-center ${modern ? 'rounded-xl shadow-md' : ''} ${onSelect && !rec ? 'cursor-pointer' : ''} ${
                  isHighlighted ? 'anim-pulse-ring z-10 ring-4 ring-gold-500' : ''
                }`}
                style={{
                  gridColumn: ci + 1,
                  gridRow: r + 2,
                  background: rec ? 'rgba(0,0,10,0.55)' : c.color || 'var(--tile)',
                  ...(modern && !rec ? { backgroundImage: 'linear-gradient(160deg, rgba(255,255,255,.14), rgba(0,0,0,.18))' } : {}),
                }}
              >
                {rec ? (
                  <span className="flex items-center gap-1 text-xs opacity-35">
                    {rec.status === 'skipped' ? <SkipForward size={16} /> : <Check size={18} />}
                  </span>
                ) : (
                  <span className="text-shadow-game" style={{ ...font, color: 'var(--value-color)', fontSize: `clamp(18px, ${Math.min(4, 22 / cols)}vw, 64px)`, lineHeight: 1 }}>
                    ${q.value.toLocaleString()}
                  </span>
                )}
              </button>
            );
          }),
        )}
      </div>
    </div>
  );
}

export function BoardFrame({ game, children, className = '' }: { game: Game; children: ReactNode; className?: string }) {
  return (
    <div className={`h-full w-full ${className}`} style={themeStyle(game)}>
      {children}
    </div>
  );
}

export function BoardPreview({ game }: { game: Game }) {
  return (
    <BoardFrame game={game} className="rounded-xl p-3">
      <div className="flex h-full flex-col gap-2">
        <div className="text-center text-xl font-bold" style={{ fontFamily: game.theme.fontFamily, color: game.theme.valueColor }}>
          {game.title}
        </div>
        <div className="min-h-0 flex-1">
          <BoardGrid game={game} />
        </div>
      </div>
    </BoardFrame>
  );
}
