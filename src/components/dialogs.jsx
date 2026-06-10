import { useEffect, useState } from 'react';
import Modal from './Modal.jsx';
import PresetChips from './PresetChips.jsx';
import { parseTarget, statsFor, threeDartAvg } from '../lib/game.js';

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

/** Celebration on an exact checkout. Esc reveals the game-over panel behind it. */
export function WinnerDialog({ game, open, onClose, onRematch, onSetup, onUndoDart }) {
  const winner = game.winner != null ? game.players[game.winner] : null;
  if (!winner) return <Modal open={false} onClose={onClose} />;

  const stats = statsFor(game, game.winner);
  return (
    <Modal open={open} onClose={onClose} className="winner-modal">
      <div className="winner-box">
        <div className="trophy">🏆</div>
        <h2>{winner.name} wins!</h2>
        <p className="muted">
          Checked out {game.target} in {stats.dartsCount} darts · 3-dart avg {threeDartAvg(stats) ?? '0'}
        </p>
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
