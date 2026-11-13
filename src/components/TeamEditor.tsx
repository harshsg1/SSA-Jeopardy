import { useRef, useState } from 'react';
import { ArrowDown, ArrowUp, GripVertical, ImagePlus, Plus, Shuffle, Trash2 } from 'lucide-react';
import type { Team } from '../types';
import { createTeam, TEAM_AVATARS, TEAM_COLORS } from '../lib/factory';
import { imageFileToDataURL } from '../lib/files';
import { Avatar, Button, IconButton, toast } from './ui';
import { moveItem, useDragReorder } from './dnd';

export function TeamRow({
  team,
  index,
  count,
  onChange,
  onRemove,
  onMove,
  extra,
  dragProps,
  label = 'team',
}: {
  team: Team;
  index: number;
  count: number;
  onChange: (patch: Partial<Team>) => void;
  onRemove?: () => void;
  onMove: (to: number) => void;
  extra?: React.ReactNode;
  dragProps?: Record<string, unknown>;
  label?: string;
}) {
  const [picker, setPicker] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  return (
    <div
      {...dragProps}
      className="group relative flex flex-wrap items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] p-2 data-[over]:border-gold-500 data-[dragging]:opacity-40"
    >
      <span className="cursor-grab text-blue-200/40 active:cursor-grabbing" title="Drag to reorder">
        <GripVertical size={18} />
      </span>
      <button type="button" onClick={() => setPicker((p) => !p)} title="Change avatar" className="cursor-pointer">
        <Avatar avatar={team.avatar} color={team.color} size={38} />
      </button>
      <input
        className="input min-w-0 flex-1 !py-1.5 font-semibold"
        value={team.name}
        maxLength={40}
        aria-label={`${label} name`}
        onChange={(e) => onChange({ name: e.target.value })}
        onBlur={(e) => !e.target.value.trim() && onChange({ name: `${label === 'player' ? 'Player' : 'Team'} ${index + 1}` })}
      />
      <input
        type="color"
        value={team.color}
        aria-label={`${label} color`}
        onChange={(e) => onChange({ color: e.target.value })}
        className="h-9 w-10 cursor-pointer rounded-lg border border-white/20 bg-transparent p-0.5"
      />
      {extra}
      <div className="flex items-center">
        <IconButton label="Move up" disabled={index === 0} onClick={() => onMove(index - 1)}>
          <ArrowUp size={16} />
        </IconButton>
        <IconButton label="Move down" disabled={index === count - 1} onClick={() => onMove(index + 1)}>
          <ArrowDown size={16} />
        </IconButton>
        {onRemove && (
          <IconButton label={`Remove ${label}`} disabled={count <= 1} onClick={onRemove} className="hover:!text-red-400">
            <Trash2 size={16} />
          </IconButton>
        )}
      </div>
      {picker && (
        <div className="anim-fade-up mt-1 flex w-full flex-wrap items-center gap-1 rounded-lg bg-navy-950/70 p-2">
          {TEAM_AVATARS.map((a) => (
            <button
              key={a}
              type="button"
              className={`h-9 w-9 cursor-pointer rounded-lg text-xl hover:bg-white/10 ${team.avatar === a ? 'bg-white/15 ring-2 ring-gold-500' : ''}`}
              onClick={() => {
                onChange({ avatar: a });
                setPicker(false);
              }}
            >
              {a}
            </button>
          ))}
          <div className="mx-1 flex gap-1">
            {TEAM_COLORS.slice(0, 8).map((c) => (
              <button key={c} type="button" aria-label={`Color ${c}`} className="h-6 w-6 cursor-pointer rounded-full border-2 border-white/30" style={{ background: c }} onClick={() => onChange({ color: c })} />
            ))}
          </div>
          <Button size="sm" icon={<ImagePlus size={14} />} onClick={() => fileRef.current?.click()}>
            Upload logo
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            hidden
            onChange={async (e) => {
              const f = e.target.files?.[0];
              e.target.value = '';
              if (!f) return;
              try {
                onChange({ avatar: await imageFileToDataURL(f, 256) });
                setPicker(false);
              } catch (err) {
                toast((err as Error).message, 'error');
              }
            }}
          />
        </div>
      )}
    </div>
  );
}

export function TeamListEditor({ teams, onChange, mode = 'teams' }: { teams: Team[]; onChange: (teams: Team[]) => void; mode?: 'teams' | 'individual' }) {
  const label = mode === 'individual' ? 'player' : 'team';
  const { itemProps } = useDragReorder((from, to) => onChange(moveItem(teams, from, to)), 'teams');
  const add = () => {
    const t = createTeam(teams.length, `${mode === 'individual' ? 'Player' : 'Team'} ${teams.length + 1}`);
    onChange([...teams, t]);
  };
  return (
    <div className="space-y-2">
      {teams.map((t, i) => (
        <TeamRow
          key={t.id}
          team={t}
          index={i}
          count={teams.length}
          label={label}
          dragProps={itemProps(i)}
          onChange={(patch) => onChange(teams.map((x) => (x.id === t.id ? { ...x, ...patch } : x)))}
          onRemove={() => onChange(teams.filter((x) => x.id !== t.id))}
          onMove={(to) => onChange(moveItem(teams, i, to))}
        />
      ))}
      <div className="flex flex-wrap gap-2 pt-1">
        <Button icon={<Plus size={16} />} onClick={add}>
          Add {label}
        </Button>
        {teams.length > 1 && (
          <Button
            variant="subtle"
            icon={<Shuffle size={16} />}
            onClick={() => {
              const a = [...teams];
              for (let i = a.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [a[i], a[j]] = [a[j], a[i]];
              }
              onChange(a);
            }}
          >
            Shuffle order
          </Button>
        )}
      </div>
    </div>
  );
}
