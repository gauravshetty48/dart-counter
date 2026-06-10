# 🎯 Dart Counter

A darts scorer built with **React + Vite** that runs entirely in your browser.
No backend, no accounts — game data lives in `localStorage`.

## Features

- **Any starting score** — presets for 101 / 201 / 301 / 501 plus a custom field,
  changeable at any time (including mid-game via the `Target ✎` button).
- **Bowling-style scoresheet** — players as rows, rounds as columns, and the
  remaining score pinned on the right. The current player's cell is live.
- **Two entry modes**, toggleable mid-game:
  - *Quick totals* (default): type the 3-dart total straight into the
    highlighted cell and press Enter.
  - *Dart-by-dart*: a keypad (1–20, Bull 25, Miss) with Double/Triple modifiers.
- **Standard rules**: hitting exactly zero wins; a round total that goes over
  the remaining score is a *bust* — the round scores nothing, the cell is marked
  BUST, and the turn passes (no double-out requirement).
- **Undo everything** — the last dart before committing, or roll back the whole
  last round from the history panel.
- **Saved players** — anyone you add is remembered in `localStorage`, so next
  game they're one tap away.
- **Refresh-proof** — an in-progress game survives page reloads. Rematch rotates
  who throws first.

## Run locally

```sh
npm install
npm run dev      # → http://localhost:5173
```

Other scripts:

```sh
npm run build    # production build into dist/
npm run preview  # serve the production build locally
```

## Deploy

`npm run build` outputs a fully static site in `dist/` — any static host works.

**Netlify:** a `netlify.toml` is included (build `npm run build`, publish `dist`).
Connect the repo, or build locally and drag `dist/` onto
<https://app.netlify.com/drop>, or use the CLI:

```sh
npm run build
netlify deploy --prod --dir dist
```

**Firebase Hosting** (a `firebase.json` pointing at `dist/` is included):

```sh
npm install -g firebase-tools
firebase login
firebase use --add        # pick or create a project
npm run build
firebase deploy
```

## Project structure

```
src/
  main.jsx                 # entry point
  App.jsx                  # state reducer + localStorage persistence
  index.css                # theme & layout
  lib/
    game.js                # pure game logic (immutable, easily testable)
    storage.js             # localStorage helpers + keys
  components/
    SetupScreen.jsx        # target score, lineup, saved-player roster
    GameScreen.jsx         # topbar, dialogs, keyboard shortcuts
    ScoreSheet.jsx         # bowling-style grid: players × rounds + remaining
    EntryPanel.jsx         # entry-mode toggle, hints, undo round
    Keypad.jsx             # dart-by-dart entry with Double/Triple
    Modal.jsx              # native <dialog> wrapper
    dialogs.jsx            # confirm / target / winner dialogs
    PresetChips.jsx        # 101 / 201 / 301 / 501 quick picks
```

All game rules live in `src/lib/game.js` as pure functions over an immutable
game object; `App.jsx` wires them into a `useReducer` store. UI components are
presentational and dispatch actions.

## Scoring notes

- A dart is worth `number × multiplier`. Bull is 25, double-bull 50 (there is no
  triple bull, so the 25 key is disabled while Triple is active). Max round: 180.
- A **bust** (round total exceeding the remaining score) freezes the keypad; the
  player's score stays where it started and the turn passes.
- **Changing the target mid-game** resets every player to the new score after a
  warning, since remaining scores are relative to the target.
- Keyboard shortcuts on desktop: `D` double, `T` triple, `Backspace` undo dart,
  `Enter` end turn.

## Data & privacy

Everything stays in your browser's `localStorage` under these keys:

| Key                   | Holds                                  |
| --------------------- | -------------------------------------- |
| `dart-counter:roster` | Player names you've used before        |
| `dart-counter:lineup` | The lineup prefilled on the setup page |
| `dart-counter:target` | The last starting score you used       |
| `dart-counter:game`   | The in-progress game (for resume)      |

Nothing ever leaves your device. Clearing site data resets the app.
