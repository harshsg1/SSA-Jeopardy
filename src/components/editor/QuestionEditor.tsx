import { useState } from 'react';
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Plus, Star, Trash2, X } from 'lucide-react';
import type { Category, Difficulty, Question, QuestionType } from '../../types';
import { QUESTION_TYPE_LABELS } from '../../lib/factory';
import { isValidUrl } from '../../lib/files';
import { Button, Field, IconButton, Modal, NumberInput, Toggle, toast } from '../ui';
import { MediaInput } from './MediaInput';

function ChipInput({ values, onChange, placeholder }: { values: string[]; onChange: (v: string[]) => void; placeholder: string }) {
  const [text, setText] = useState('');
  const add = () => {
    const t = text.trim();
    if (!t) return;
    if (!values.some((v) => v.toLowerCase() === t.toLowerCase())) onChange([...values, t]);
    setText('');
  };
  return (
    <div className="rounded-xl border border-white/15 bg-navy-950/60 p-1.5">
      <div className="flex flex-wrap gap-1.5">
        {values.map((v) => (
          <span key={v} className="inline-flex items-center gap-1 rounded-lg bg-royal-600/50 px-2 py-0.5 text-sm">
            {v}
            <button type="button" aria-label={`Remove ${v}`} className="cursor-pointer opacity-70 hover:opacity-100" onClick={() => onChange(values.filter((x) => x !== v))}>
              <X size={12} />
            </button>
          </span>
        ))}
        <input
          className="min-w-32 flex-1 bg-transparent px-1 py-0.5 outline-none placeholder:text-blue-200/35"
          value={text}
          placeholder={placeholder}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ',') {
              e.preventDefault();
              add();
            } else if (e.key === 'Backspace' && !text && values.length) onChange(values.slice(0, -1));
          }}
          onBlur={add}
        />
      </div>
    </div>
  );
}

export function QuestionEditor({
  category,
  question,
  index,
  onChange,
  onDelete,
  onMove,
  onNavigate,
  hasPrev,
  hasNext,
  onClose,
}: {
  category: Category;
  question: Question;
  index: number;
  onChange: (patch: Partial<Question>) => void;
  onDelete: () => void;
  onMove: (dir: -1 | 1) => void;
  onNavigate: (dir: -1 | 1) => void;
  hasPrev: boolean;
  hasNext: boolean;
  onClose: () => void;
}) {
  const q = question;
  const [linkLabel, setLinkLabel] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const setType = (type: QuestionType) => {
    const patch: Partial<Question> = { type };
    if (type === 'true_false') {
      patch.correctChoice = q.correctChoice > 1 ? 0 : q.correctChoice;
      patch.answer = (patch.correctChoice ?? q.correctChoice) === 0 ? 'True' : 'False';
    }
    if (type === 'multiple_choice' && q.choices.length < 2) patch.choices = ['', '', '', ''];
    onChange(patch);
  };

  return (
    <Modal
      open
      wide
      onClose={onClose}
      title={
        <span className="flex items-center gap-2">
          <span className="rounded-md px-2 py-0.5 text-sm" style={{ background: category.color || '#1d3bd1' }}>
            {category.name || 'Category'}
          </span>
          <span className="font-display text-xl text-gold-500">${q.value}</span>
        </span>
      }
      footer={
        <>
          <Button variant="danger" size="sm" icon={<Trash2 size={14} />} onClick={onDelete} className="mr-auto">
            Delete question
          </Button>
          <Button size="sm" icon={<ArrowUp size={14} />} onClick={() => onMove(-1)} disabled={index === 0}>
            Move up
          </Button>
          <Button size="sm" icon={<ArrowDown size={14} />} onClick={() => onMove(1)} disabled={index === category.questions.length - 1}>
            Move down
          </Button>
          <Button size="sm" icon={<ArrowLeft size={14} />} onClick={() => onNavigate(-1)} disabled={!hasPrev}>
            Prev
          </Button>
          <Button size="sm" onClick={() => onNavigate(1)} disabled={!hasNext}>
            Next <ArrowRight size={14} />
          </Button>
          <Button variant="gold" onClick={onClose}>
            Done
          </Button>
        </>
      }
    >
      <div className="grid gap-4 md:grid-cols-[1fr_240px]">
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-[1fr_130px]">
            <Field label="Question type">
              <select className="input" value={q.type} onChange={(e) => setType(e.target.value as QuestionType)}>
                {Object.entries(QUESTION_TYPE_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Points">
              <NumberInput value={q.value} min={0} max={1000000} step={100} onChange={(value) => onChange({ value })} />
            </Field>
          </div>

          <Field label={q.type === 'fill_blank' ? 'Clue (use ____ for the blank)' : 'Clue / question'}>
            <textarea className="input min-h-24" value={q.prompt} placeholder="e.g. This planet is known as the Red Planet." onChange={(e) => onChange({ prompt: e.target.value })} />
          </Field>

          {q.type === 'multiple_choice' && (
            <Field label="Choices (select the correct one)">
              <div className="space-y-1.5">
                {q.choices.map((c, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <input type="radio" name={`correct-${q.id}`} checked={q.correctChoice === i} onChange={() => onChange({ correctChoice: i, answer: c })} className="h-4 w-4 accent-yellow-400" aria-label={`Mark choice ${i + 1} correct`} />
                    <span className="w-5 font-bold text-gold-500">{String.fromCharCode(65 + i)}</span>
                    <input
                      className="input !py-1.5"
                      value={c}
                      placeholder={`Choice ${i + 1}`}
                      onChange={(e) => {
                        const choices = q.choices.map((x, k) => (k === i ? e.target.value : x));
                        onChange({ choices, ...(i === q.correctChoice ? { answer: e.target.value } : {}) });
                      }}
                    />
                    <IconButton
                      label="Remove choice"
                      disabled={q.choices.length <= 2}
                      onClick={() => {
                        const choices = q.choices.filter((_, k) => k !== i);
                        const correctChoice = q.correctChoice === i ? 0 : q.correctChoice > i ? q.correctChoice - 1 : q.correctChoice;
                        onChange({ choices, correctChoice, answer: choices[correctChoice] ?? '' });
                      }}
                    >
                      <X size={16} />
                    </IconButton>
                  </div>
                ))}
                {q.choices.length < 8 && (
                  <Button size="sm" icon={<Plus size={14} />} onClick={() => onChange({ choices: [...q.choices, ''] })}>
                    Add choice
                  </Button>
                )}
              </div>
            </Field>
          )}

          {q.type === 'true_false' ? (
            <Field label="Correct answer">
              <div className="flex gap-2">
                {['True', 'False'].map((v, i) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => onChange({ correctChoice: i, answer: v })}
                    className={`flex-1 cursor-pointer rounded-xl border px-4 py-2 font-bold ${q.correctChoice === i ? 'border-gold-500 bg-gold-500 text-navy-900' : 'border-white/15 bg-white/5'}`}
                  >
                    {v}
                  </button>
                ))}
              </div>
            </Field>
          ) : q.type !== 'multiple_choice' ? (
            <Field label="Correct answer">
              <input className="input" value={q.answer} placeholder="e.g. Mars" onChange={(e) => onChange({ answer: e.target.value })} />
            </Field>
          ) : null}

          {q.type !== 'true_false' && (
            <Field label="Accepted alternative answers" hint="Press Enter after each. Used for practice-mode auto-checking and shown to the host.">
              <ChipInput values={q.altAnswers} onChange={(altAnswers) => onChange({ altAnswers })} placeholder="e.g. What is Mars" />
            </Field>
          )}

          <div className="grid gap-3 sm:grid-cols-1">
            <Field label="Image">
              <MediaInput kind="image" value={q.media.image} onChange={(image) => onChange({ media: { ...q.media, image } })} />
            </Field>
            {(q.type === 'audio' || q.media.audio) && (
              <Field label="Audio clip">
                <MediaInput kind="audio" value={q.media.audio} onChange={(audio) => onChange({ media: { ...q.media, audio } })} />
              </Field>
            )}
            {(q.type === 'video' || q.media.video) && (
              <Field label="Video clip">
                <MediaInput kind="video" value={q.media.video} onChange={(video) => onChange({ media: { ...q.media, video } })} />
              </Field>
            )}
            {q.type !== 'audio' && q.type !== 'video' && !q.media.audio && !q.media.video && (
              <div className="flex gap-2">
                <Button size="sm" onClick={() => setType('audio')}>
                  + Audio clip
                </Button>
                <Button size="sm" onClick={() => setType('video')}>
                  + Video clip
                </Button>
              </div>
            )}
          </div>

          <Field label="Hint (host can reveal during play)">
            <input className="input" value={q.hint} onChange={(e) => onChange({ hint: e.target.value })} placeholder="Optional" />
          </Field>
          <Field label="Explanation / fun fact (shown with the answer)">
            <textarea className="input min-h-16" value={q.explanation} onChange={(e) => onChange({ explanation: e.target.value })} placeholder="Optional" />
          </Field>
          <Field label="Links & references">
            <div className="space-y-1.5">
              {q.links.map((l, i) => (
                <div key={i} className="flex items-center gap-2 rounded-lg bg-white/5 px-2 py-1 text-sm">
                  <a href={l.url} target="_blank" rel="noreferrer" className="flex-1 truncate text-blue-300 underline">
                    {l.label || l.url}
                  </a>
                  <IconButton label="Remove link" onClick={() => onChange({ links: q.links.filter((_, k) => k !== i) })}>
                    <X size={14} />
                  </IconButton>
                </div>
              ))}
              <div className="flex flex-col gap-1.5 sm:flex-row">
                <input className="input !py-1.5 sm:w-40" placeholder="Label" value={linkLabel} onChange={(e) => setLinkLabel(e.target.value)} />
                <input className="input !py-1.5" placeholder="https://…" value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} />
                <Button
                  size="sm"
                  onClick={() => {
                    const url = linkUrl.trim();
                    if (!isValidUrl(url) || url.startsWith('data:')) return toast('Enter a valid http(s) URL.', 'error');
                    onChange({ links: [...q.links, { label: linkLabel.trim(), url }] });
                    setLinkLabel('');
                    setLinkUrl('');
                  }}
                >
                  Add
                </Button>
              </div>
            </div>
          </Field>
        </div>

        <aside className="space-y-4">
          <div className={`rounded-xl border p-2 ${q.dailyDouble ? 'border-gold-500 bg-gold-500/10' : 'border-white/10'}`}>
            <Toggle checked={q.dailyDouble} onChange={(dailyDouble) => onChange({ dailyDouble })} label="Daily Double" description="Team wagers before seeing the clue." />
            {q.dailyDouble && (
              <div className="flex items-center gap-1.5 px-2 pb-1 text-sm text-gold-400">
                <Star size={14} fill="currentColor" /> Hidden from players until selected
              </div>
            )}
          </div>
          <Field label="Difficulty">
            <div className="flex gap-1">
              {(['easy', 'medium', 'hard'] as Difficulty[]).map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => onChange({ difficulty: d })}
                  className={`flex-1 cursor-pointer rounded-lg px-2 py-1.5 text-sm font-semibold capitalize ${
                    q.difficulty === d ? (d === 'easy' ? 'bg-emerald-600' : d === 'medium' ? 'bg-amber-600' : 'bg-red-600') : 'bg-white/5'
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>
          </Field>
          <Field label="Tags">
            <ChipInput values={q.tags} onChange={(tags) => onChange({ tags })} placeholder="Add tag" />
          </Field>
          <div className="rounded-xl bg-navy-950/60 p-3 text-sm text-blue-200/70">
            Question {index + 1} of {category.questions.length} in <b className="text-white">{category.name || 'this category'}</b>. Changes save automatically.
          </div>
        </aside>
      </div>
    </Modal>
  );
}
