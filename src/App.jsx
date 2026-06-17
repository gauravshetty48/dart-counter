import { useCallback, useEffect, useReducer, useState } from 'react';
import { LS, lsGet, lsSet } from './lib/storage.js';
import {
  cleanNames, parseTarget, validGame, newGame, withDart, withTotalRound, withUndoDart,
  withUndoRound, withUndoWinningDart, withTarget, commitRound, addPlayer, isLocked, isOver,
  nextActive, MAX_NAME,
} from './lib/game.js';
import SetupScreen from './components/SetupScreen.jsx';
import GameScreen from './components/GameScreen.jsx';
import { ConfirmDialog } from './components/dialogs.jsx';

function initialState() {
  let game = lsGet(LS.game, null);
  // migrate pre-runner-up saves: rebuild `finished` from checked-out players
  if (game && Array.isArray(game.players) && !Array.isArray(game.finished)) {
    const zeros = game.players.map((p, i) => (p?.score === 0 ? i : -1)).filter((i) => i >= 0);
    const ordered = game.winner != null
      ? [game.winner, ...zeros.filter((i) => i !== game.winner)]
      : zeros;
    game = { ...game, finished: ordered };
  }
  if (game && !Number.isInteger(game.starter)) game = { ...game, starter: 0 };
  // never leave the oche on a player who has already finished
  if (game && Array.isArray(game.finished) && game.finished.includes(game.current)) {
    game = { ...game, current: nextActive(game.current, game.players.length, game.finished) };
  }
  if (!validGame(game) || isOver(game)) game = null; // resume unfinished games only
  const entryMode = lsGet(LS.entryMode, 'total');
  return {
    view: game ? 'game' : 'setup',
    roster: cleanNames(lsGet(LS.roster, [])),
    lineup: cleanNames(lsGet(LS.lineup, [])),
    lastTarget: parseTarget(lsGet(LS.target, 301)) ?? 301,
    game,
    mult: 1, // keypad multiplier: 1, 2 (double) or 3 (triple)
    entryMode: entryMode === 'darts' ? 'darts' : 'total', // scoresheet quick totals vs keypad
  };
}

function reducer(state, action) {
  switch (action.type) {
    case 'lineup/add': {
      const name = String(action.name ?? '').trim().slice(0, MAX_NAME);
      if (!name || state.lineup.some((n) => n.toLowerCase() === name.toLowerCase())) return state;
      return { ...state, lineup: [...state.lineup, name] };
    }
    case 'lineup/remove':
      return { ...state, lineup: state.lineup.filter((_, i) => i !== action.index) };
    case 'roster/forget':
      return { ...state, roster: state.roster.filter((n) => n !== action.name) };

    case 'game/start':
      return {
        ...state,
        roster: cleanNames([...state.lineup, ...state.roster]), // remember everyone
        lastTarget: action.target,
        game: newGame([...state.lineup], action.target, 0),
        mult: 1,
        view: 'game',
      };

    case 'entry/mode': {
      // switching mid-round would orphan half-entered darts
      if (state.game && (state.game.darts.length > 0 || state.game.bust)) return state;
      return { ...state, entryMode: state.entryMode === 'total' ? 'darts' : 'total' };
    }
  }

  if (!state.game) return state; // remaining actions need an active game

  switch (action.type) {
    case 'game/dart': {
      const game = withDart(state.game, action.value, action.label);
      return game === state.game ? state : { ...state, game, mult: 1 };
    }
    case 'game/total': {
      const game = withTotalRound(state.game, action.total);
      return game === state.game ? state : { ...state, game, mult: 1 };
    }
    case 'game/addPlayer': {
      const game = addPlayer(state.game, action.name);
      if (game === state.game) return state;
      // remember the newcomer for future games, like the setup roster does
      return { ...state, game, roster: cleanNames([action.name, ...state.roster]), mult: 1 };
    }
    case 'game/mult':
      if (isLocked(state.game)) return state;
      return { ...state, mult: state.mult === action.mult ? 1 : action.mult };
    case 'game/undoDart':
      return { ...state, game: withUndoDart(state.game) };
    case 'game/endTurn':
      if (isOver(state.game)) return state;
      return { ...state, game: commitRound(state.game), mult: 1 };
    case 'game/undoRound':
      return { ...state, game: withUndoRound(state.game), mult: 1 };
    case 'game/undoWinningDart':
      return { ...state, game: withUndoWinningDart(state.game), mult: 1 };
    case 'game/rematch': {
      const names = state.game.players.map((p) => p.name);
      const starter = (state.game.starter + 1) % names.length; // loser's consolation: rotate who starts
      return { ...state, game: newGame(names, state.game.target, starter), mult: 1 };
    }
    case 'game/target':
      return { ...state, lastTarget: action.target, game: withTarget(state.game, action.target), mult: 1 };
    case 'game/toSetup':
      return {
        ...state,
        lineup: state.game.players.map((p) => p.name),
        game: null,
        view: 'setup',
      };
    default:
      return state;
  }
}

export default function App() {
  const [state, dispatch] = useReducer(reducer, undefined, initialState);

  // async confirm(), rendered as a shared <dialog>
  const [confirmReq, setConfirmReq] = useState(null);
  const confirm = useCallback((message, confirmLabel = 'Confirm') =>
    new Promise((resolve) => setConfirmReq({ message, confirmLabel, resolve })), []);

  useEffect(() => lsSet(LS.roster, state.roster), [state.roster]);
  useEffect(() => lsSet(LS.lineup, state.lineup), [state.lineup]);
  useEffect(() => lsSet(LS.target, state.lastTarget), [state.lastTarget]);
  useEffect(() => lsSet(LS.game, state.game), [state.game]);
  useEffect(() => lsSet(LS.entryMode, state.entryMode), [state.entryMode]);

  return (
    <>
      {state.view === 'game' && state.game ? (
        <GameScreen
          game={state.game}
          mult={state.mult}
          entryMode={state.entryMode}
          roster={state.roster}
          dispatch={dispatch}
          confirm={confirm}
        />
      ) : (
        <SetupScreen
          lineup={state.lineup}
          roster={state.roster}
          lastTarget={state.lastTarget}
          dispatch={dispatch}
        />
      )}
      <ConfirmDialog request={confirmReq} onDone={() => setConfirmReq(null)} />
    </>
  );
}
