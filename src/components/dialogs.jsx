import { useEffect, useState } from 'react';
import Modal from './Modal.jsx';
import PresetChips from './PresetChips.jsx';
import Podium from './Podium.jsx';
import {
  parseTarget, statsFor, threeDartAvg, winnerIdx, pendingCatchUp, MAX_NAME,
} from '../lib/game.js';

/** Shared confirm dialog; `request` is { message, confirmLabel, resolve } or null. */
export function ConfirmDialog({ request, onDone }) {
  const answer = (ok) => {
    request?.resolve(ok);
    onDone();
  };
  return (
    <Modal open={Boolean(request)} onClose={() => answer(false)}>
      <p>{request?.message}</p>
      <menu>
        <button type="button" className="btn" onClick={() => answer(false)}>Cancel</button>
        <button type="button" className="btn danger" onClick={() => answer(true)}>
          {request?.confirmLabel ?? 'Confirm'}
        </button>
      </menu>
    </Modal>
  );
}

/** Mid-game target change. Applying restarts the game at the new score. */
export function TargetDialog({ open, target, onApply, onClose }) {
  const [value, setValue] = useState('');
  const [shaking, setShaking] = useState(false);

  useEffect(() => {
    if (open) setValue(String(target));
  }, [open, target]);

  const apply = () => {
    const t = parseTarget(value);
    if (!t) {
      setShaking(true);
      return;
    }
    onApply(t);
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose}>
      <h2>Target score</h2>
      <PresetChips value={value} onPick={(v) => setValue(String(v))} />
      <input
        type="number"
        inputMode="numeric"
        min="1"
        max="9999"
        step="1"
        value={value}
        data-autofocus
        className={shaking ? 'shake' : undefined}
        onAnimationEnd={() => setShaking(false)}
        onChange={(e) => setValue(e.target.value)}
        onFocus={(e) => e.target.select()}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            apply();
          }
        }}
      />
      <p className="hint left">Changing the target restarts the current game.</p>
      <menu>
        <button type="button" className="btn" onClick={onClose}>Cancel</button>
        <button type="button" className="btn primary" onClick={apply}>Apply</button>
      </menu>
    </Modal>
  );
}

/**
 * Add a player to a game already in progress. Explains the catch-up they'll
 * owe, takes a typed name, and offers saved players as one-tap chips.
 */
export function AddPlayerDialog({ open, game, roster = [], onAdd, onClose }) {
  const [name, setName] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      setName('');
      setError('');
    }
  }, [open]);

  const existing = new Set(game.players.map((p) => p.name.toLowerCase()));
  const saved = roster.filter((n) => !existing.has(n.toLowerCase()));
  const rounds = pendingCatchUp(game);

  const submit = (raw) => {
    const clean = String(raw).trim().slice(0, MAX_NAME);
    if (!clean) {
      setError('Enter a name.');
      return;
    }
    if (existing.has(clean.toLowerCase())) {
      setError(`${clean} is already in the game.`);
      return;
    }
    onAdd(clean);
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose}>
      <h2>Add a player</h2>
      <p className="hint left add-desc">
        {rounds > 0
          ? `They'll throw ${rounds} catch-up ${rounds === 1 ? 'round' : 'rounds'} to draw level with everyone, then join the rotation.`
          : 'They’ll join this round at the end of the lineup.'}
      </p>
      <form
        autoComplete="off"
        onSubmit={(e) => {
          e.preventDefault();
          submit(name);
        }}
      >
        <input
          type="text"
          maxLength={MAX_NAME}
          placeholder="Player name…"
          autoComplete="off"
          data-autofocus
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            setError('');
          }}
        />
        {saved.length > 0 && (
          <div className="add-saved">
            <h3 className="roster-title muted">Saved players — tap to add</h3>
            <div className="chips">
              {saved.map((n) => (
                <div className="chip" key={n}>
                  <button type="button" className="chip-add" onClick={() => submit(n)}>
                    {n}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
        {error && <p className="hint left error">{error}</p>}
        <menu>
          <button type="button" className="btn" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn primary">Add</button>
        </menu>
      </form>
    </Modal>
  );
}

/** Celebration when the game ends. Esc reveals the game-over panel behind it. */
export function WinnerDialog({ game, open, onClose, onRematch, onSetup, onUndoDart }) {
  const wIdx = winnerIdx(game);
  if (wIdx == null) return <Modal open={false} onClose={onClose} />;

  const winner = game.players[wIdx];
  const stats = statsFor(game, wIdx);
  return (
    <Modal open={open} onClose={onClose} className="winner-modal">
      <div className="winner-box">
        <div className="trophy">🏆</div>
        <h2>{winner.name} wins!</h2>
        <p className="muted">
          Checked out {game.target} in {stats.dartsCount} darts · 3-dart avg {threeDartAvg(stats) ?? '0'}
        </p>
        {game.players.length > 1 && <Podium game={game} />}
        <menu>
          <button type="button" className="btn primary xl" onClick={onRematch}>Rematch</button>
          <button type="button" className="btn xl" onClick={onSetup}>Change players / score</button>
        </menu>
        <button type="button" className="btn ghost small winner-undo" onClick={onUndoDart}>
          ↩ Mis-entered? Undo
        </button>
      </div>
    </Modal>
  );
}
