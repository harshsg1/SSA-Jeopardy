import type { ReactNode } from 'react';
import { ArrowLeft } from 'lucide-react';
import { navigate } from '../lib/router';
import { Button, Kbd } from '../components/ui';
import { SHORTCUTS } from '../components/play/HostPanel';
import { Logo } from './Dashboard';

const SECTIONS: [id: string, title: string][] = [
  ['overview', 'The basics'],
  ['setup', 'Before you start'],
  ['turn', 'How a turn works'],
  ['scoring', 'Scoring'],
  ['daily-double', 'Daily Doubles'],
  ['final', 'Final Jeopardy'],
  ['winning', 'Winning the game'],
  ['conduct', 'Fair play'],
  ['host', 'Host guide'],
  ['options', 'Rule options'],
  ['shortcuts', 'Keyboard shortcuts'],
];

function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section id={`rules-${id}`} className="panel scroll-mt-4 p-5 sm:p-6">
      <h2 className="mb-3 font-display text-2xl tracking-wide text-gold-500 sm:text-3xl">{title}</h2>
      <div className="space-y-3 leading-relaxed text-blue-50">{children}</div>
    </section>
  );
}

function Steps({ items }: { items: ReactNode[] }) {
  return (
    <ol className="space-y-2">
      {items.map((item, i) => (
        <li key={i} className="flex gap-3">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gold-500 font-display text-navy-900">{i + 1}</span>
          <span className="pt-0.5">{item}</span>
        </li>
      ))}
    </ol>
  );
}

function Bullets({ items }: { items: ReactNode[] }) {
  return (
    <ul className="list-disc space-y-1.5 pl-5 marker:text-gold-500">
      {items.map((item, i) => (
        <li key={i}>{item}</li>
      ))}
    </ul>
  );
}

function Example({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-xl border border-gold-500/30 bg-gold-500/10 px-4 py-3 text-sm">
      <span className="mr-2 font-bold uppercase tracking-wider text-gold-400">Example</span>
      {children}
    </div>
  );
}

export default function Rules() {
  return (
    <div className="mx-auto max-w-6xl px-4 pb-16 pt-5 sm:px-6">
      <header className="flex items-center justify-between gap-3">
        <Logo size="sm" />
        <Button icon={<ArrowLeft size={16} />} onClick={() => navigate('/')}>
          Dashboard
        </Button>
      </header>

      <div className="mt-6">
        <h1 className="font-display text-4xl sm:text-5xl">
          Rules &amp; <span className="gold-shimmer">How to Play</span>
        </h1>
        <p className="mt-2 max-w-3xl text-blue-100">
          Everything players and the host need to know: how the board works, how points are won and lost, Daily Doubles, Final Jeopardy, and how to run the game from this app.
        </p>
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-[220px_1fr]">
        <nav className="panel h-fit p-3 lg:sticky lg:top-4" aria-label="Rules sections">
          <div className="mb-1 px-2 text-xs font-semibold uppercase tracking-wider text-blue-200/70">On this page</div>
          <div className="flex flex-wrap gap-1 lg:flex-col">
            {SECTIONS.map(([id, title]) => (
              <button
                key={id}
                type="button"
                onClick={() => document.getElementById(`rules-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                className="cursor-pointer rounded-lg px-2 py-1.5 text-left text-sm font-medium text-blue-100 hover:bg-white/10 hover:text-white"
              >
                {title}
              </button>
            ))}
          </div>
        </nav>

        <div className="space-y-5">
          <Section id="overview" title="The basics">
            <p>
              Jeopardy is a trivia game played on a board of categories. Each category is a column, and each column holds clues worth increasing point values — the higher the value, the harder
              the clue. Teams take turns choosing clues, answer to win points, and lose points for wrong answers. The team with the most points after Final Jeopardy wins.
            </p>
            <div className="grid gap-3 sm:grid-cols-3">
              {[
                ['Pick', 'Choose a category and a point value from the board.'],
                ['Answer', 'Give the correct response before time runs out.'],
                ['Score', 'Right answers add the clue’s value. Wrong answers subtract it.'],
              ].map(([t, d]) => (
                <div key={t} className="rounded-xl bg-white/5 p-3">
                  <div className="font-display text-xl text-gold-500">{t}</div>
                  <div className="text-sm text-blue-100">{d}</div>
                </div>
              ))}
            </div>
          </Section>

          <Section id="setup" title="Before you start">
            <Bullets
              items={[
                <>Split into teams (or play as individuals). Each team picks a name; the host adds them on the Start Game screen.</>,
                <>Choose one spokesperson per team. Teammates may discuss quietly, but only the spokesperson’s answer counts.</>,
                <>One person acts as host. The host reads clues, judges answers, and controls the board. The host does not play.</>,
                <>Every team starts at $0. The team listed first chooses the first clue (the host can also pick a random team).</>,
                <>Put phones and notes away — no looking anything up.</>,
              ]}
            />
          </Section>

          <Section id="turn" title="How a turn works">
            <Steps
              items={[
                <>
                  The team marked <b>“Up next”</b> on the scoreboard picks a clue by naming a category and value — for example, “Sikhi for 300.”
                </>,
                <>The host opens the clue and reads it aloud. The timer starts.</>,
                <>
                  The first team to signal (raise a hand, buzz, or call out their team name) gets to answer. The host decides who was first and selects that team.
                </>,
                <>
                  If the answer is <b>correct</b>, that team wins the clue’s value and chooses the next clue.
                </>,
                <>
                  If the answer is <b>incorrect</b>, that team loses the clue’s value, and the other teams get a chance to answer. Each team may only try once per clue.
                </>,
                <>If nobody gets it, or time runs out, the host reveals the answer. No more points are awarded, and the team that picked last picks again.</>,
                <>The clue disappears from the board. Play continues until every clue has been played.</>,
              ]}
            />
            <p className="text-sm text-blue-200/80">
              Answering in the form of a question (“What is…?”) is the TV tradition. It is optional here unless your host says otherwise before the game begins.
            </p>
          </Section>

          <Section id="scoring" title="Scoring">
            <Bullets
              items={[
                <>
                  <b>Correct answer:</b> add the clue’s point value to your score.
                </>,
                <>
                  <b>Incorrect answer:</b> subtract the clue’s point value. Scores can go below zero.
                </>,
                <>
                  <b>No answer:</b> if your team doesn’t attempt a clue, your score doesn’t change. If you’re unsure, staying quiet is safer than guessing.
                </>,
                <>
                  <b>Close answers:</b> the host decides whether an answer is close enough. Spelling doesn’t matter for spoken answers; first names are usually not required unless the clue asks.
                </>,
                <>
                  <b>Host’s ruling is final.</b> If the host makes a mistake, they can undo the last score or adjust any team’s points by hand.
                </>,
              ]}
            />
            <Example>
              Team A picks “Sports for 400” and answers wrong: Team A goes from $600 to $200. Team B then answers correctly: Team B goes from $300 to $700 and picks the next clue.
            </Example>
          </Section>

          <Section id="daily-double" title="Daily Doubles">
            <p>
              A Daily Double is a hidden clue. Nobody knows where it is until a team picks it. When it appears, <b>only the team that picked it</b> may answer — no other team can steal.
            </p>
            <Steps
              items={[
                <>Before seeing the clue, the team decides how many points to wager.</>,
                <>
                  The minimum wager is <b>$5</b>. The maximum is the team’s current score <b>or</b> the highest clue value on the board, whichever is larger — so a team with a low or negative
                  score can still bet.
                </>,
                <>The host locks in the wager and reveals the clue.</>,
                <>
                  A correct answer <b>adds</b> the wager. An incorrect answer (or no answer) <b>subtracts</b> the wager.
                </>,
              ]}
            />
            <Example>
              A team with $1,200 hits a Daily Double and wagers $1,000. If they’re right they jump to $2,200; if they’re wrong they drop to $200. Betting everything is called a “true Daily
              Double.”
            </Example>
          </Section>

          <Section id="final" title="Final Jeopardy">
            <p>
              After the board is cleared, every team plays one last clue. This is where the game is often won or lost, because each team secretly bets on themselves.
            </p>
            <Steps
              items={[
                <>The host reveals only the Final Jeopardy category.</>,
                <>
                  Each team <b>secretly</b> enters a wager from $0 up to their current score. Other teams must look away while a team types its wager. Teams with $0 or less can only wager $0, but
                  still get to answer.
                </>,
                <>Once every wager is locked in, the host reveals the clue and the timer starts (30 seconds by default).</>,
                <>Each team secretly enters its answer before time runs out.</>,
                <>
                  The host reveals responses one team at a time, starting with the lowest score. A correct answer <b>adds</b> that team’s wager; an incorrect answer <b>subtracts</b> it.
                </>,
                <>The host reveals the correct answer and the final standings.</>,
              ]}
            />
            <Example>
              Going into the final, Team A has $2,000 and Team B has $1,500. Team A wagers $1,100; Team B wagers everything. Both are correct: Team A finishes with $3,100 and Team B with $3,000.
              If Team A had been wrong, they’d finish with $900 and Team B would win.
            </Example>
            <p className="text-sm text-blue-200/80">Wagers and answers can’t be changed once responses start being revealed.</p>
          </Section>

          <Section id="winning" title="Winning the game">
            <Bullets
              items={[
                <>The team with the highest score after Final Jeopardy wins.</>,
                <>If teams finish with the same top score, they share first place — or the host can ask a tie-breaker question, with the first correct answer winning.</>,
                <>The results screen shows final rankings, each team’s correct and incorrect answers, and how long the game took.</>,
              ]}
            />
          </Section>

          <Section id="conduct" title="Fair play">
            <Bullets
              items={[
                <>No phones, notes, or outside help during clues.</>,
                <>Don’t shout out answers when it isn’t your team’s turn to answer — the host may deduct points or skip the clue.</>,
                <>Wait for the host to finish reading the clue before signalling.</>,
                <>Once your spokesperson starts answering, that answer counts. No changing it after the host has ruled.</>,
                <>Be respectful to the host and other teams. It’s a game — have fun with it.</>,
              ]}
            />
          </Section>

          <Section id="host" title="Host guide">
            <p>The host runs the whole game from one screen. Here is what each part does.</p>
            <Bullets
              items={[
                <>
                  <b>Opening a clue:</b> click any value on the board. Played clues go dark and can’t be picked again.
                </>,
                <>
                  <b>Judging answers:</b> each team has a green ✓ and red ✗ button under the clue. Press ✓ to award points or ✗ to deduct them. Teams that have already tried are marked.
                </>,
                <>
                  <b>Reveal answer:</b> shows the answer without awarding points. Use it when nobody gets the clue.
                </>,
                <>
                  <b>Skip:</b> removes a clue from the board with no points changing.
                </>,
                <>
                  <b>Back (keep tile):</b> if you opened a clue by mistake and nothing has happened yet, going back leaves it on the board.
                </>,
                <>
                  <b>Undo:</b> reverses the last scoring action. You can undo several steps in a row.
                </>,
                <>
                  <b>Host panel</b> (the gold <b>Host</b> button): add or subtract any amount, type in an exact score, choose the active team or a random one, add or remove teams mid-game, change
                  the timer and sound, see every answer and where the Daily Doubles are, and end the game or jump to Final Jeopardy.
                </>,
                <>
                  <b>Present:</b> switches to fullscreen with the editing controls hidden, for a projector or TV. Keyboard shortcuts keep working.
                </>,
                <>
                  <b>Pause:</b> freezes the game and the timer.
                </>,
                <>
                  <b>Saving:</b> the game saves itself after every action. If the page is closed or refreshed, pick it up again from “Games in progress” on the dashboard.
                </>,
              ]}
            />
            <p className="text-sm text-blue-200/80">
              The host panel shows answers and Daily Double locations. Don’t open it while the screen is being projected unless you’re comfortable with players seeing it.
            </p>
          </Section>

          <Section id="options" title="Rule options">
            <p>
              The rules above are the defaults. The host can change them for each game in the editor under <b>Rules</b>, or during a game in the host panel under <b>Settings</b>. Tell the
              players before you start if you’ve changed any of these.
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="text-xs uppercase text-blue-200/60">
                  <tr>
                    <th className="py-1 pr-3">Option</th>
                    <th className="pr-3">Default</th>
                    <th>What it changes</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ['Negative scoring', 'On', 'When off, wrong answers cost nothing — including Daily Doubles and Final Jeopardy.'],
                    ['Allow multiple attempts', 'On', 'When off, only one team may try each clue; a wrong answer ends it.'],
                    ['Correct team picks next', 'On', 'When off, the host chooses who picks each clue.'],
                    ['Question timer', '30 seconds', 'Can be changed or turned off to play without a clock.'],
                    ['Hints', 'On', 'Lets the host show a hint for clues that have one.'],
                    ['Random Daily Doubles', 'Off', 'Adds Daily Doubles in random spots each time the game starts.'],
                    ['Daily Double wager limits', '$5 minimum', 'The minimum and maximum wager rules can be changed.'],
                    ['Team or individual mode', 'Teams', 'Play as teams or as individual players.'],
                  ].map(([o, d, w]) => (
                    <tr key={o} className="border-t border-white/10 align-top">
                      <td className="py-2 pr-3 font-semibold">{o}</td>
                      <td className="pr-3 text-gold-400">{d}</td>
                      <td className="text-blue-100">{w}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p>
              <b>Practice mode</b> (on the Start Game screen) is a solo run: you type each answer and it’s checked automatically. Practice games aren’t counted in statistics.
            </p>
          </Section>

          <Section id="shortcuts" title="Keyboard shortcuts">
            <p>These work during a live game, including in presentation mode.</p>
            <div className="grid gap-x-8 gap-y-1.5 sm:grid-cols-2">
              {SHORTCUTS.map(([k, d]) => (
                <div key={k} className="flex items-center justify-between gap-3 border-b border-white/5 pb-1.5">
                  <span>{d}</span>
                  <Kbd>{k}</Kbd>
                </div>
              ))}
            </div>
          </Section>
        </div>
      </div>
    </div>
  );
}
