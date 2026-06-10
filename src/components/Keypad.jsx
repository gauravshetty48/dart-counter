import { DARTS_PER_ROUND, roundSum, isLocked } from '../lib/game.js';

const NUMBERS = Array.from({ length: 20 }, (_, i) => i + 1);

/** Dart-by-dart entry: slots for the round's darts plus the 1–20 keypad. */
export default function Keypad({ game, mult, dispatch, onEndTurn }) {
  const total = roundSum(game.darts);
  const locked = isLocked(game);
  const prefix = mult === 2 ? 'D' : mult === 3 ? 'T' : '';

  const throwDart = (value, label) => dispatch({ type: 'game/dart', value, label });

  const endTurnLabel = game.bust
    ? 'Bust — next player ▸'
    : game.darts.length === DARTS_PER_ROUND
      ? 'Next player ▸'
      : 'End turn ▸';
  const endTurnClass = game.bust
    ? 'btn danger xl'
    : game.darts.length === DARTS_PER_ROUND
      ? 'btn primary xl pulse'
      : 'btn xl';

  return (
    <>
      <div className="slots">
        {Array.from({ length: DARTS_PER_ROUND }, (_, i) => {
          const dart = game.darts[i];
          return dart ? (
            <div className="slot filled" key={i}>
              <span className="slot-label">{dart.label}</span>
              <span className="slot-val">{dart.v}</span>
            </div>
          ) : (
            <div className="slot" key={i}><span className="muted">·</span></div>
          );
        })}
        <div className={`slot total${game.bust ? ' bust' : ''}`}>
          <span className="slot-label">{game.bust ? 'BUST' : total}</span>
          <span className="slot-val">round</span>
        </div>
      </div>

      <div className="mods">
        <button
          type="button"
          className={`btn mod mod-2${mult === 2 ? ' active' : ''}`}
          disabled={locked}
          onClick={() => dispatch({ type: 'game/mult', mult: 2 })}
        >
          Double ×2
        </button>
        <button
          type="button"
          className={`btn mod mod-3${mult === 3 ? ' active' : ''}`}
          disabled={locked}
          onClick={() => dispatch({ type: 'game/mult', mult: 3 })}
        >
          Triple ×3
        </button>
      </div>

      <div className="numpad">
        {NUMBERS.map((n) => (
          <button
            key={n}
            type="button"
            className="btn pad-key"
            disabled={locked}
            onClick={() => throwDart(n * mult, `${prefix}${n}`)}
          >
            {n}
          </button>
        ))}
      </div>

      <div className="pad-row">
        <button type="button" className="btn pad-key" disabled={locked} onClick={() => throwDart(0, '0')}>
          Miss
        </button>
        <button
          type="button"
          className="btn pad-key"
          disabled={locked || mult === 3} /* no triple-25 on a dartboard */
          onClick={() => throwDart(mult === 2 ? 50 : 25, mult === 2 ? 'D25' : '25')}
        >
          Bull 25
        </button>
        <button
          type="button"
          className="btn pad-key"
          disabled={game.darts.length === 0}
          onClick={() => dispatch({ type: 'game/undoDart' })}
        >
          ⌫ Undo
        </button>
      </div>

      <button type="button" className={endTurnClass} onClick={onEndTurn}>{endTurnLabel}</button>
    </>
  );
}
