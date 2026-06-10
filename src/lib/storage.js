// localStorage keys are shared with the v1 vanilla app, so saved players
// and an in-progress game carry over across the rewrite.
export const LS = {
  roster: 'dart-counter:roster',         // names ever used, most recent first
  lineup: 'dart-counter:lineup',         // names queued for the next game
  target: 'dart-counter:target',         // last used starting score
  game: 'dart-counter:game',             // in-progress game, resumed on reload
  entryMode: 'dart-counter:entry-mode',  // 'total' (type round sum) or 'darts' (keypad)
};

export function lsGet(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw == null ? fallback : JSON.parse(raw);
  } catch {
    return fallback;
  }
}

export function lsSet(key, val) {
  try {
    if (val == null) localStorage.removeItem(key);
    else localStorage.setItem(key, JSON.stringify(val));
  } catch {
    // storage unavailable — the app still works for this session
  }
}
