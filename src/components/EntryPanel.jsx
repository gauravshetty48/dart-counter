import Keypad from './Keypad.jsx';
import { roundSum } from '../lib/game.js';

/**
 * Input controls for the current player's round. Two modes:
 * 'total' — type the 3-dart sum straight into the scoresheet cell;
 * 'darts' — dart-by-dart keypad with Double/Triple modifiers.
 */
export default function EntryPanel({
  game, mult, entryMode, effectiveMode, dispatch, onEndTurn, onUndoRound, onCommitTotal, error,
}) {
  const player = game.players[game.current];
  const left = player.score - roundSum(game.darts);
  const canToggle = game.darts.length === 0 && !game.bust;

  return (
    <section className="card turn-panel">
      <div className="turn-title" aria-live="polite">
        <span className="turn-name">{player.name}</span>
        <span className={`turn-left${game.bust ? ' bust' : ''}`}>
          {game.bust ? 'Bust — round scores 0' : `${left} left`}
        </span>
      </div>

      <div className="entry-actions">
        <button
          type="button"
          className="btn small"
          disabled={!canToggle}
          title={canToggle ? undefined : 'Finish this round first'}
          onClick={() => dispatch({ type: 'entry/mode' })}
        >
          {entryMode === 'total' ? '🎯 Dart-by-dart' : '🔢 Quick totals'}
        </button>
        <button
          type="button"
          className="btn small"
          disabled={game.history.length === 0}
          onClick={onUndoRound}
        >
          ↩ Undo last round
        </button>
      </div>

      {effectiveMode === 'total' ? (
        <>
          <p className={`hint left${error ? ' error' : ''}`}>
            {error || `Type ${player.name}'s 3-dart total into the highlighted cell, then press Enter. Anything over ${left} is a bust.`}
          </p>
          <button type="button" className="btn primary xl" onClick={onCommitTotal}>
            Score round ▸
          </button>
        </>
      ) : (
        <Keypad game={game} mult={mult} dispatch={dispatch} onEndTurn={onEndTurn} />
      )}
    </section>
  );
}
