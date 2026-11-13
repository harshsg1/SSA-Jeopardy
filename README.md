# SSA Jeopardy

A Jeopardy-style trivia game for hosting game nights: build custom boards, add teams, and run the show with scoring, Daily Doubles, Final Jeopardy, a host control panel and a fullscreen presentation mode.

## Play online

https://harshsg1.github.io/SSA-Jeopardy/

The site is rebuilt and published automatically every time `main` is pushed.

## Run it locally

```bash
npm install
npm run dev
```

Then open the address it prints (http://localhost:5173 by default).

## Other commands

```bash
npm run build   # production build into dist/
npm test        # unit tests for the game rules
```

## Notes

- Built with React, TypeScript, Vite and Tailwind CSS.
- Games and scores are saved in the browser (IndexedDB) on the device you use. Use Export / Import on the dashboard to back up or move games.
- The game rules live in `src/game/engine.ts`, separate from the UI.
