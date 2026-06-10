// Pure game logic. Every function returns a new game object (no mutation),
// which is what lets React re-render exactly what changed.

export const PRESETS = [101, 201, 301, 501];
export const DARTS_PER_ROUND = 3;
export const MAX_NAME = 20;

export function cleanNames(value) {
  if (!Array.isArray(value)) return [];
  const seen = new Set();
  const out = [];
  for (const item of value) {
    if (typeof item !== 'string') continue;
    const name = item.trim().slice(0, MAX_NAME);
    if (!name || seen.has(name.toLowerCase())) continue;
    seen.add(name.toLowerCase());
    out.push(name);
  }
  return out;
}

export function parseTarget(value) {
  const n = Math.floor(Number(value));
  return Number.isFinite(n) && n >= 1 && n <= 9999 ? n : null;
}

export function validGame(g) {
  return Boolean(g)
    && Number.isInteger(g.target) && g.target >= 1
    && Array.isArray(g.players) && g.players.length > 0
    && g.players.every((p) => p && typeof p.name === 'string' && Number.isInteger(p.score))
    && Number.isInteger(g.current) && g.current >= 0 && g.current < g.players.length
    && Array.isArray(g.darts) && Array.isArray(g.history);
}

export function newGame(names, target, starter = 0) {
  return {
    target,
    players: names.map((name) => ({ name, score: target })),
    starter,          // who threw first (rotates on rematch)
    current: starter, // index of the player at the oche
    darts: [],        // this round's darts: { v, label }
    bust: false,
    winner: null,     // player index once someone checks out
    history: [],      // { p, darts, total, bust, prev } per committed round
  };
}

export const roundSum = (darts) => darts.reduce((sum, d) => sum + d.v, 0);

export const isLocked = (game) =>
  game.winner != null || game.bust || game.darts.length >= DARTS_PER_ROUND;

export function withDart(game, value, label) {
  if (isLocked(game)) return game;
  const darts = [...game.darts, { v: value, label }];
  const remaining = game.players[game.current].score - roundSum(darts);
  const next = { ...game, darts };
  if (remaining < 0) return { ...next, bust: true }; // overshot — bust
  if (remaining === 0) return commitRound(next);     // exact checkout wins immediately
  return next;
}

export function commitRound(game) {
  const p = game.current;
  const total = roundSum(game.darts);
  const entry = { p, darts: game.darts, total, bust: game.bust, prev: game.players[p].score };
  const players = game.players.map((pl, i) =>
    i === p && !game.bust ? { ...pl, score: pl.score - total } : pl);
  const next = {
    ...game,
    players,
    history: [...game.history, entry],
    darts: [],
    bust: false,
    current: (p + 1) % game.players.length,
  };
  // reaching exactly zero wins, however the round was committed
  return players[p].score === 0 ? { ...next, winner: p } : next;
}

/**
 * Commit a whole round at once from a typed total (scoresheet quick entry).
 * Over the remaining score → bust (round scores 0); exactly 0 left → win.
 */
export function withTotalRound(game, total) {
  if (game.winner != null || game.darts.length > 0) return game;
  if (!Number.isInteger(total) || total < 0 || total > 60 * DARTS_PER_ROUND) return game;
  const p = game.current;
  const prev = game.players[p].score;
  const remaining = prev - total;
  const bust = remaining < 0;
  const next = {
    ...game,
    players: bust
      ? game.players
      : game.players.map((pl, i) => (i === p ? { ...pl, score: remaining } : pl)),
    history: [...game.history, { p, darts: [], total, bust, prev }],
    darts: [],
    bust: false,
    current: (p + 1) % game.players.length,
  };
  return remaining === 0 ? { ...next, winner: p } : next;
}

export function withUndoDart(game) {
  if (game.winner != null || game.darts.length === 0) return game;
  const darts = game.darts.slice(0, -1);
  const bust = game.players[game.current].score - roundSum(darts) < 0;
  return { ...game, darts, bust };
}

export function withUndoRound(game) {
  if (game.history.length === 0) return game;
  const entry = game.history[game.history.length - 1];
  return {
    ...game,
    history: game.history.slice(0, -1),
    players: game.players.map((pl, i) => (i === entry.p ? { ...pl, score: entry.prev } : pl)),
    current: entry.p,
    darts: entry.darts, // restored as editable, so single darts can be fixed
    bust: entry.bust,
    winner: null,
  };
}

export function withUndoWinningDart(game) {
  if (game.winner == null) return game;
  const reverted = withUndoRound(game);
  return { ...reverted, darts: reverted.darts.slice(0, -1), bust: false };
}

export function withTarget(game, target) {
  // remaining scores are relative to the target, so changing it restarts the game
  return {
    ...game,
    target,
    players: game.players.map((p) => ({ ...p, score: target })),
    darts: [],
    history: [],
    bust: false,
    winner: null,
    current: game.starter,
  };
}

export function statsFor(game, idx) {
  let dartsCount = 0;
  let scored = 0;
  let last = null;
  for (const h of game.history) {
    if (h.p !== idx) continue;
    // rounds entered as a bare total carry no dart detail — count them as 3 darts
    dartsCount += h.darts.length > 0 ? h.darts.length : DARTS_PER_ROUND;
    if (!h.bust) scored += h.total;
    last = h;
  }
  return { dartsCount, scored, last };
}

export const threeDartAvg = ({ dartsCount, scored }) =>
  dartsCount ? ((scored / dartsCount) * 3).toFixed(1) : null;

export const roundNumber = (game) =>
  Math.floor(game.history.length / game.players.length) + 1;
