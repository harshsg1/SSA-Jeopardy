import { useMemo, useState } from 'react';
import { AlertTriangle, GraduationCap, Play, User, Users } from 'lucide-react';
import type { Team } from '../types';
import { useStore } from '../store/store';
import { createTeam } from '../lib/factory';
import { validateGame } from '../lib/validate';
import { createSession } from '../game/engine';
import { navigate } from '../lib/router';
import { Button, Modal, Toggle, toast } from './ui';
import { TeamListEditor } from './TeamEditor';

export function StartGameDialog({ gameId, open, onClose }: { gameId: string; open: boolean; onClose: () => void }) {
  const game = useStore((s) => s.games.find((g) => g.id === gameId));
  if (!open || !game) return null;
  return <Inner key={gameId} gameId={gameId} onClose={onClose} />;
}

function Inner({ gameId, onClose }: { gameId: string; onClose: () => void }) {
  const game = useStore((s) => s.games.find((g) => g.id === gameId))!;
  const updateGame = useStore((s) => s.updateGame);
  const addSession = useStore((s) => s.addSession);
  const [teams, setTeams] = useState<Team[]>(() => (game.teams.length ? game.teams : [createTeam(0), createTeam(1)]));
  const [mode, setMode] = useState(game.settings.mode);
  const [practice, setPractice] = useState(false);
  const issues = useMemo(() => validateGame(game), [game]);
  const errors = issues.filter((i) => i.level === 'error');

  const start = () => {
    const cleaned = teams.map((t, i) => ({ ...t, name: t.name.trim() || `${mode === 'individual' ? 'Player' : 'Team'} ${i + 1}` }));
    if (!practice && cleaned.length === 0) return toast('Add at least one team.', 'error');
    if (errors.length) return toast(errors[0].message, 'error');
    // Remember roster & mode for next time.
    updateGame(game.id, (g) => ({ ...g, teams: cleaned, settings: { ...g.settings, mode } }));
    const playGame = { ...game, settings: { ...game.settings, mode } };
    const sessionTeams = practice ? [{ ...createTeam(0, 'Practice'), avatar: '🎓' }] : cleaned;
    const session = createSession(playGame, sessionTeams, { practice });
    addSession(session);
    onClose();
    navigate(`/play/${session.id}`);
  };

  return (
    <Modal
      open
      onClose={onClose}
      wide
      title={<>Start “{game.title}”</>}
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="gold" size="lg" icon={<Play size={18} />} onClick={start} disabled={errors.length > 0}>
            {practice ? 'Start practice' : 'Start game'}
          </Button>
        </>
      }
    >
      <div className="grid gap-5 md:grid-cols-[1fr_260px]">
        <div>
          {!practice ? (
            <>
              <div className="mb-3 inline-flex rounded-xl bg-white/5 p-1">
                {(['teams', 'individual'] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setMode(m)}
                    className={`flex cursor-pointer items-center gap-2 rounded-lg px-3 py-1.5 font-semibold ${mode === m ? 'bg-gold-500 text-navy-900' : 'text-blue-100'}`}
                  >
                    {m === 'teams' ? <Users size={16} /> : <User size={16} />}
                    {m === 'teams' ? 'Teams' : 'Individual players'}
                  </button>
                ))}
              </div>
              <TeamListEditor teams={teams} onChange={setTeams} mode={mode} />
            </>
          ) : (
            <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-blue-100">
              <GraduationCap className="mb-2 text-gold-500" />
              <p className="font-semibold text-white">Practice mode</p>
              <p className="mt-1 text-sm">
                Play solo: type your answer for each clue and it is checked automatically against the correct and accepted alternative answers. Scores are kept for the
                practice run only and don’t appear in game statistics.
              </p>
            </div>
          )}
        </div>
        <div className="space-y-3">
          <Toggle checked={practice} onChange={setPractice} label="Practice mode" description="Solo study run with automatic answer checking." />
          <div className="rounded-xl bg-white/5 p-3 text-sm text-blue-100">
            <div className="font-semibold text-white">Rules</div>
            <ul className="mt-1 list-disc space-y-0.5 pl-4">
              <li>Timer: {game.settings.timerEnabled ? `${game.settings.timerSeconds}s` : 'off'}</li>
              <li>Negative scoring: {game.settings.negativeScoring ? 'on' : 'off'}</li>
              <li>Multiple attempts: {game.settings.allowMultipleAttempts ? 'yes' : 'no'}</li>
              <li>Final Jeopardy: {game.finalRound.enabled && game.finalRound.question.trim() ? 'yes' : 'no'}</li>
            </ul>
          </div>
          {issues.length > 0 && (
            <div className="max-h-48 overflow-y-auto rounded-xl border border-amber-400/30 bg-amber-500/10 p-3 text-sm">
              <div className="mb-1 flex items-center gap-1.5 font-semibold text-amber-300">
                <AlertTriangle size={15} /> {issues.length} issue{issues.length > 1 ? 's' : ''}
              </div>
              <ul className="space-y-0.5 text-amber-100/90">
                {issues.slice(0, 8).map((i, k) => (
                  <li key={k}>• {i.message}</li>
                ))}
                {issues.length > 8 && <li>…and {issues.length - 8} more</li>}
              </ul>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
