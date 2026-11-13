import { useMemo, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  AudioLines,
  CheckSquare,
  Film,
  GripVertical,
  Image as ImageIcon,
  ListChecks,
  Minus,
  MoreVertical,
  Plus,
  Star,
  TextCursorInput,
  Trash2,
  Type,
} from 'lucide-react';
import type { Category, Game, Question, QuestionType } from '../../types';
import { boardRows, CATEGORY_COLORS, createCategory, createQuestion, DEFAULT_VALUES } from '../../lib/factory';
import { questionHasIssue, type Issue } from '../../lib/validate';
import { Button, IconButton, confirmDialog, toast } from '../ui';
import { moveItem, useDragReorder } from '../dnd';
import { QuestionEditor } from './QuestionEditor';

export const TYPE_ICONS: Record<QuestionType, typeof Type> = {
  standard: Type,
  image: ImageIcon,
  audio: AudioLines,
  video: Film,
  multiple_choice: ListChecks,
  true_false: CheckSquare,
  fill_blank: TextCursorInput,
};

type Update = (fn: (g: Game) => Game) => void;

export function BoardEditor({ game, update, issues }: { game: Game; update: Update; issues: Issue[] }) {
  const [editing, setEditing] = useState<{ catId: string; qId: string } | null>(null);
  const rows = boardRows(game);

  const setCategories = (fn: (cats: Category[]) => Category[]) => update((g) => ({ ...g, categories: fn(g.categories) }));
  const updateCategory = (id: string, patch: Partial<Category>) => setCategories((cs) => cs.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  const updateQuestion = (catId: string, qId: string, patch: Partial<Question>) =>
    setCategories((cs) => cs.map((c) => (c.id === catId ? { ...c, questions: c.questions.map((q) => (q.id === qId ? { ...q, ...patch } : q)) } : c)));

  const catDnd = useDragReorder((from, to) => setCategories((cs) => moveItem(cs, from, to)), 'cats');

  // Ordered list of all questions for prev/next navigation in the editor modal.
  const flat = useMemo(() => game.categories.flatMap((c) => c.questions.map((q) => ({ catId: c.id, qId: q.id }))), [game.categories]);

  const rowValue = (r: number) => {
    const vals = game.categories.map((c) => c.questions[r]?.value).filter((v): v is number => v != null);
    return vals.length && vals.every((v) => v === vals[0]) ? vals[0] : null;
  };

  const addCategory = () => {
    const values = Array.from({ length: Math.max(rows, 1) }, (_, r) => rowValue(r) ?? DEFAULT_VALUES[r] ?? (r + 1) * 100);
    setCategories((cs) => [...cs, createCategory(`Category ${cs.length + 1}`, Math.max(rows, 1), values)]);
    setTimeout(() => document.getElementById('board-scroll')?.scrollTo({ left: 99999, behavior: 'smooth' }), 50);
  };

  const addRow = () => {
    const prev = rowValue(rows - 1) ?? 0;
    const step = rows >= 2 ? (rowValue(rows - 1) ?? 0) - (rowValue(rows - 2) ?? 0) || 100 : 100;
    setCategories((cs) => cs.map((c) => ({ ...c, questions: [...c.questions, createQuestion(prev + step)] })));
  };

  const removeRow = async () => {
    if (rows <= 1) return;
    const hasContent = game.categories.some((c) => c.questions.length === rows && (c.questions[rows - 1].prompt || c.questions[rows - 1].answer));
    if (hasContent && !(await confirmDialog({ title: 'Remove last row?', message: 'Questions in the bottom row will be deleted.', confirmLabel: 'Remove row', danger: true }))) return;
    setCategories((cs) => cs.map((c) => (c.questions.length === rows ? { ...c, questions: c.questions.slice(0, -1) } : c)));
  };

  const deleteCategory = async (c: Category) => {
    if (await confirmDialog({ title: 'Delete category?', message: <>“{c.name}” and its {c.questions.length} questions will be deleted.</>, confirmLabel: 'Delete', danger: true }))
      setCategories((cs) => cs.filter((x) => x.id !== c.id));
  };

  const setRowValue = (r: number, value: number) =>
    setCategories((cs) => cs.map((c) => ({ ...c, questions: c.questions.map((q, i) => (i === r ? { ...q, value } : q)) })));

  const editingCat = editing && game.categories.find((c) => c.id === editing.catId);
  const editingQ = editingCat?.questions.find((q) => q.id === editing!.qId);
  const flatIndex = editing ? flat.findIndex((f) => f.qId === editing.qId) : -1;

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <Button variant="primary" size="sm" icon={<Plus size={15} />} onClick={addCategory}>
          Add category
        </Button>
        <Button size="sm" icon={<Plus size={15} />} onClick={addRow}>
          Add row
        </Button>
        <Button size="sm" icon={<Minus size={15} />} onClick={removeRow} disabled={rows <= 1}>
          Remove row
        </Button>
        <Button
          size="sm"
          variant="subtle"
          onClick={() => {
            setCategories((cs) => cs.map((c) => ({ ...c, questions: c.questions.map((q, i) => ({ ...q, value: DEFAULT_VALUES[i] ?? (i + 1) * 100 })) })));
            toast('Point values reset to 100–500.');
          }}
        >
          Reset values
        </Button>
        <span className="ml-auto text-sm text-blue-200/60">
          {game.categories.length} categories · {rows} rows · drag headers or clues to reorder
        </span>
      </div>

      {rows > 0 && (
        <div className="mb-3 flex flex-wrap items-center gap-2 rounded-xl bg-white/5 p-2 text-sm">
          <span className="font-semibold text-blue-100">Row values:</span>
          {Array.from({ length: rows }).map((_, r) => (
            <input
              key={r}
              type="number"
              min={0}
              step={100}
              aria-label={`Row ${r + 1} value`}
              className="input !w-24 !py-1 text-center font-display text-gold-500"
              placeholder="mixed"
              value={rowValue(r) ?? ''}
              onChange={(e) => {
                const n = Number(e.target.value);
                if (e.target.value !== '' && Number.isFinite(n) && n >= 0) setRowValue(r, Math.round(n));
              }}
            />
          ))}
          <span className="text-blue-200/50">(sets all categories; edit a clue for custom values)</span>
        </div>
      )}

      <div id="board-scroll" className="overflow-x-auto pb-3">
        <div className="flex min-w-min gap-3">
          {game.categories.map((c, ci) => (
            <CategoryColumn
              key={c.id}
              category={c}
              index={ci}
              count={game.categories.length}
              game={game}
              issues={issues}
              dragProps={catDnd.itemProps(ci)}
              onUpdate={(patch) => updateCategory(c.id, patch)}
              onDelete={() => deleteCategory(c)}
              onMove={(to) => setCategories((cs) => moveItem(cs, ci, to))}
              onOpen={(qId) => setEditing({ catId: c.id, qId })}
              onAddQuestion={() => {
                const last = c.questions[c.questions.length - 1]?.value ?? 0;
                const q = createQuestion(rowValue(c.questions.length) ?? last + 100);
                updateCategory(c.id, { questions: [...c.questions, q] });
                setEditing({ catId: c.id, qId: q.id });
              }}
            />
          ))}
          <button
            type="button"
            onClick={addCategory}
            className="flex w-40 shrink-0 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-white/15 text-blue-200/60 hover:border-gold-500/60 hover:text-gold-400"
          >
            <Plus size={28} />
            <span className="mt-1 font-semibold">Add category</span>
          </button>
        </div>
      </div>

      {editingCat && editingQ && (
        <QuestionEditor
          category={editingCat}
          question={editingQ}
          index={editingCat.questions.indexOf(editingQ)}
          onChange={(patch) => updateQuestion(editingCat.id, editingQ.id, patch)}
          onClose={() => setEditing(null)}
          hasPrev={flatIndex > 0}
          hasNext={flatIndex < flat.length - 1}
          onNavigate={(dir) => {
            const next = flat[flatIndex + dir];
            if (next) setEditing(next);
          }}
          onMove={(dir) => {
            const i = editingCat.questions.indexOf(editingQ);
            updateCategory(editingCat.id, { questions: moveItem(editingCat.questions, i, i + dir) });
          }}
          onDelete={async () => {
            if (await confirmDialog({ title: 'Delete question?', message: 'This clue will be removed from the board.', confirmLabel: 'Delete', danger: true })) {
              updateCategory(editingCat.id, { questions: editingCat.questions.filter((q) => q.id !== editingQ.id) });
              setEditing(null);
            }
          }}
        />
      )}
    </div>
  );
}

function CategoryColumn({
  category: c,
  index,
  count,
  game,
  issues,
  dragProps,
  onUpdate,
  onDelete,
  onMove,
  onOpen,
  onAddQuestion,
}: {
  category: Category;
  index: number;
  count: number;
  game: Game;
  issues: Issue[];
  dragProps: Record<string, unknown>;
  onUpdate: (patch: Partial<Category>) => void;
  onDelete: () => void;
  onMove: (to: number) => void;
  onOpen: (qId: string) => void;
  onAddQuestion: () => void;
}) {
  const [menu, setMenu] = useState(false);
  const qDnd = useDragReorder((from, to) => onUpdate({ questions: moveItem(c.questions, from, to) }), 'q-' + c.id);
  const bg = c.color || game.theme.tileColor;
  return (
    <div {...dragProps} className="flex w-52 shrink-0 flex-col gap-2 rounded-xl border-2 border-transparent data-[over]:border-gold-500 data-[dragging]:opacity-40 sm:w-56">
      <div className="relative rounded-xl p-2 shadow-lg" style={{ background: bg }}>
        <div className="flex items-center gap-1">
          <span className="cursor-grab text-white/50 active:cursor-grabbing" title="Drag to reorder">
            <GripVertical size={16} />
          </span>
          <input
            className="min-w-0 flex-1 rounded bg-transparent px-1 py-1 text-center font-bold uppercase tracking-wide text-white outline-none focus:bg-black/25"
            value={c.name}
            placeholder="CATEGORY NAME"
            aria-label="Category name"
            maxLength={60}
            onChange={(e) => onUpdate({ name: e.target.value })}
            onDragStart={(e) => e.preventDefault()}
            draggable={false}
          />
          <IconButton label="Category options" onClick={() => setMenu((m) => !m)}>
            <MoreVertical size={16} />
          </IconButton>
        </div>
        {c.description && !menu && <p className="mt-1 line-clamp-2 px-1 text-center text-xs text-white/70">{c.description}</p>}
        {menu && (
          <div className="anim-fade-up mt-2 space-y-2 rounded-lg bg-navy-950/90 p-2" onMouseDown={(e) => e.stopPropagation()}>
            <textarea
              className="input min-h-14 text-sm"
              placeholder="Category description (optional)"
              value={c.description}
              onChange={(e) => onUpdate({ description: e.target.value })}
              draggable={false}
              onDragStart={(e) => e.preventDefault()}
            />
            <div className="flex flex-wrap items-center gap-1">
              {CATEGORY_COLORS.map((col) => (
                <button
                  key={col || 'default'}
                  type="button"
                  aria-label={col ? `Color ${col}` : 'Default color'}
                  title={col ? col : 'Board default'}
                  onClick={() => onUpdate({ color: col })}
                  className={`h-6 w-6 cursor-pointer rounded-full border-2 ${c.color === col ? 'border-gold-500' : 'border-white/30'}`}
                  style={{ background: col || game.theme.tileColor }}
                />
              ))}
              <input type="color" aria-label="Custom category color" value={c.color || game.theme.tileColor} onChange={(e) => onUpdate({ color: e.target.value })} className="h-6 w-8 cursor-pointer rounded bg-transparent" />
            </div>
            <div className="flex items-center justify-between">
              <div className="flex">
                <IconButton label="Move left" disabled={index === 0} onClick={() => onMove(index - 1)}>
                  <ArrowLeft size={16} />
                </IconButton>
                <IconButton label="Move right" disabled={index === count - 1} onClick={() => onMove(index + 1)}>
                  <ArrowRight size={16} />
                </IconButton>
              </div>
              <Button size="sm" variant="danger" icon={<Trash2 size={13} />} onClick={onDelete}>
                Delete
              </Button>
            </div>
          </div>
        )}
      </div>

      {c.questions.map((q, qi) => {
        const Icon = TYPE_ICONS[q.type];
        const issue = questionHasIssue(issues, q.id);
        return (
          <button
            key={q.id}
            type="button"
            {...qDnd.itemProps(qi)}
            onClick={() => onOpen(q.id)}
            className="group relative cursor-pointer rounded-xl border-2 border-transparent p-2.5 text-left shadow transition hover:brightness-125 data-[over]:border-gold-500 data-[dragging]:opacity-40"
            style={{ background: bg }}
          >
            <div className="flex items-center justify-between">
              <span className="font-display text-2xl" style={{ color: game.theme.valueColor }}>
                ${q.value}
              </span>
              <span className="flex items-center gap-1 text-white/60">
                {q.dailyDouble && <Star size={14} className="text-gold-400" fill="currentColor" aria-label="Daily Double" />}
                <Icon size={14} aria-label={q.type} />
              </span>
            </div>
            <p className={`mt-1 line-clamp-2 text-xs ${q.prompt ? 'text-white/85' : 'italic text-white/40'}`}>{q.prompt || 'Click to add clue…'}</p>
            {q.answer && <p className="mt-0.5 truncate text-[11px] text-gold-400/80">→ {q.answer}</p>}
            {issue && <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-amber-400" title="Incomplete" />}
          </button>
        );
      })}
      <button type="button" onClick={onAddQuestion} className="flex cursor-pointer items-center justify-center gap-1 rounded-xl border border-dashed border-white/15 py-2 text-sm text-blue-200/60 hover:border-gold-500/50 hover:text-gold-400">
        <Plus size={14} /> Add clue
      </button>
    </div>
  );
}
