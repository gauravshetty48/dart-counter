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
    && Array.isArray(g.darts) && Array.isArray(g.history) && Array.isArray(g.finished);
}

export function newGame(names, target, starter = 0) {
  return {
    target,
    players: names.map((name) => ({ name, score: target })),
    starter,          // who threw first (rotates on rematch)
    current: starter, // index of the player at the oche
    darts: [],        // this round's darts: { v, label }
    bust: false,
    finished: [],     // player indices in finishing order: [winner, runner-up, …]
    history: [],      // { p, darts, total, bust, prev } per committed round
    catchUp: null,    // a latecomer taking back-to-back rounds: { player, rounds, resumeAt }
  };
}

export const roundSum = (darts) => darts.reduce((sum, d) => sum + d.v, 0);

// Rounds player `idx` has committed so far (one history entry per round).
export const roundsCompleted = (game, idx) =>
  game.history.filter((h) => h.p === idx).length;

// How many places must be settled before the game ends:
// solo/duel → just the winner; 3+ players → winner AND runner-up.
export const placesNeeded = (playerCount) => (playerCount >= 3 ? 2 : 1);

export const isOver = (game) => game.finished.length >= placesNeeded(game.players.length);

export const winnerIdx = (game) => (game.finished.length > 0 ? game.finished[0] : null);
export const runnerUpIdx = (game) => (game.finished.length > 1 ? game.finished[1] : null);

// 1 for the winner, 2 for the runner-up, … or 0 if the player hasn't checked out.
export const placementOf = (game, idx) => game.finished.indexOf(idx) + 1;

// Next player after `from` (cyclically) who hasn't already finished.
export function nextActive(from, playerCount, finished) {
  for (let step = 1; step <= playerCount; step++) {
    const idx = (from + step) % playerCount;
    if (!finished.includes(idx)) return idx;
  }
  return from;
}

export const isLocked = (game) =>
  isOver(game) || game.bust || game.darts.length >= DARTS_PER_ROUND;

export function withDart(game, value, label) {
  if (isLocked(game)) return game;
  const darts = [...game.darts, { v: value, label }];
  const remaining = game.players[game.current].score - roundSum(darts);
  const next = { ...game, darts };
  if (remaining < 0) return { ...next, bust: true }; // overshot — bust
  if (remaining === 0) return commitRound(next);     // exact checkout — finishes this player
  return next;
}

// Decide who throws next once player `p` has committed a round. A latecomer
// (game.catchUp) keeps the oche for back-to-back rounds until they've drawn
// level with the field, then play hands back to whoever was interrupted.
// The catch-up record is left in place (not cleared) once spent, so that an
// undo across the hand-back point naturally re-arms it; `isCatchingUp` reads
// the live round count to tell whether it's still in effect.
function advance(game, p, playerCount, finished, over) {
  const cu = game.catchUp;
  const done = cu && p === cu.player ? roundsCompleted(game, p) + 1 : 0; // incl. this round
  if (cu && p === cu.player && !over && done <= cu.rounds) {
    if (done < cu.rounds && !finished.includes(p)) {
      return { current: p, catchUp: cu }; // still behind — throw again
    }
    return { current: cu.resumeAt, catchUp: cu }; // drew level (or checked out) — hand back
  }
  // when over, leave the pointer on the last thrower; otherwise advance past finishers
  return { current: over ? p : nextActive(p, playerCount, finished), catchUp: cu };
}

// Shared commit path for both entry modes: subtract the round, log history,
// register a checkout as a finishing place, and pass the oche to the next
// player still in the game.
function applyRound(game, { total, bust, darts }) {
  const p = game.current;
  const prev = game.players[p].score;
  const players = bust
    ? game.players
    : game.players.map((pl, i) => (i === p ? { ...pl, score: prev - total } : pl));
  const checkedOut = !bust && players[p].score === 0;
  const finished = checkedOut ? [...game.finished, p] : game.finished;
  const over = finished.length >= placesNeeded(players.length);
  const { current, catchUp } = advance(game, p, players.length, finished, over);
  return {
    ...game,
    players,
    finished,
    history: [...game.history, { p, darts, total, bust, prev }],
    darts: [],
    bust: false,
    current,
    catchUp,
  };
}

export function commitRound(game) {
  return applyRound(game, { total: roundSum(game.darts), bust: game.bust, darts: game.darts });
}

/**
 * Commit a whole round at once from a typed total (scoresheet quick entry).
 * Over the remaining score → bust (round scores 0); exactly 0 left → checkout.
 */
export function withTotalRound(game, total) {
  if (isOver(game) || game.darts.length > 0) return game;
  if (!Number.isInteger(total) || total < 0 || total > 60 * DARTS_PER_ROUND) return game;
  const bust = total > game.players[game.current].score;
  return applyRound(game, { total, bust, darts: [] });
}

export function withUndoDart(game) {
  if (isOver(game) || game.darts.length === 0) return game;
  const darts = game.darts.slice(0, -1);
  const bust = game.players[game.current].score - roundSum(darts) < 0;
  return { ...game, darts, bust };
}

export function withUndoRound(game) {
  if (game.history.length === 0) return game;
  const entry = game.history[game.history.length - 1];
  const wasCheckout = !entry.bust && entry.prev - entry.total === 0;
  return {
    ...game,
    history: game.history.slice(0, -1),
    players: game.players.map((pl, i) => (i === entry.p ? { ...pl, score: entry.prev } : pl)),
    // un-finish that player if the undone round was their checkout
    finished: wasCheckout ? game.finished.filter((i) => i !== entry.p) : game.finished,
    current: entry.p,
    darts: entry.darts, // restored as editable, so single darts can be fixed
    bust: entry.bust,
  };
}

export function withUndoWinningDart(game) {
  if (game.finished.length === 0) return game;
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
    finished: [],
    current: game.starter,
    catchUp: null,
  };
}

// True while a latecomer still owes catch-up rounds. The catch-up record sticks
// around after it's spent (so undo can re-arm it), so test the live round count
// rather than the mere presence of the record.
export const isCatchingUp = (game) =>
  Boolean(game.catchUp) && roundsCompleted(game, game.catchUp.player) < game.catchUp.rounds;

// A latecomer may only join during the opening two rounds — i.e. before anyone
// has banked a third round — and only between turns (no half-entered darts) and
// not while a previous latecomer is still catching up.
export function canAddPlayer(game) {
  if (!validGame(game) || isOver(game)) return false;
  if (game.darts.length > 0 || game.bust || isCatchingUp(game)) return false;
  const maxDone = Math.max(0, ...game.players.map((_, i) => roundsCompleted(game, i)));
  return maxDone <= 2;
}

// How many catch-up rounds a newcomer would owe if added right now: one for
// every round the whole field has already completed (the minimum round count).
export const pendingCatchUp = (game) =>
  Math.min(...game.players.map((_, i) => roundsCompleted(game, i)));

// Add `name` to a game in progress. The newcomer takes the oche immediately and
// throws their catch-up rounds back-to-back to draw level, then slots in at the
// end of the rotation. With nothing to catch up they simply join the current
// round last. No-ops (returns the same game) if the add isn't allowed.
export function addPlayer(game, name) {
  if (!canAddPlayer(game)) return game;
  const clean = String(name ?? '').trim().slice(0, MAX_NAME);
  if (!clean || game.players.some((p) => p.name.toLowerCase() === clean.toLowerCase())) return game;
  const idx = game.players.length;
  const players = [...game.players, { name: clean, score: game.target }];
  const rounds = pendingCatchUp(game);
  if (rounds === 0) return { ...game, players }; // joins the current round, no catch-up
  return {
    ...game,
    players,
    catchUp: { player: idx, rounds, resumeAt: game.current },
    current: idx,
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

// The round the current thrower is about to play (each player's Nth entry is
// their round N), so the label stays correct even when finishers are skipped.
export const roundNumber = (game) => roundsCompleted(game, game.current) + 1;
