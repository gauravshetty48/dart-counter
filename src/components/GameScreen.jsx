import { useEffect, useState } from 'react';
import ScoreSheet from './ScoreSheet.jsx';
import EntryPanel from './EntryPanel.jsx';
import { TargetDialog, WinnerDialog } from './dialogs.jsx';
import { roundNumber, DARTS_PER_ROUND } from '../lib/game.js';

export default function GameScreen({ game, mult, entryMode, dispatch, confirm }) {
  const [targetOpen, setTargetOpen] = useState(false);
  const [winnerDismissed, setWinnerDismissed] = useState(false);
  const [draft, setDraft] = useState('');       // total-mode cell value while typing
  const [entryError, setEntryError] = useState('');
  const [shakeCell, setShakeCell] = useState(false);

  const over = game.winner != null;
  const player = game.players[game.current];

  // an undone round can put keypad darts back even while in total mode —
  // render dart-mode controls until that round is resolved
  const effectiveMode = game.darts.length > 0 || game.bust ? 'darts' : entryMode;

  // re-arm the winner dialog on every transition: a new win must always show it,
  // even if a previous dialog was dismissed or closed via its own buttons
  useEffect(() => {
    setWinnerDismissed(false);
  }, [over]);

  // new active cell → clean slate for typing
  useEffect(() => {
    setDraft('');
    setEntryError('');
  }, [game.current, game.history.length]);

  const commitTotal = () => {
    if (over) return;
    const total = draft === '' ? NaN : Number(draft);
    if (!Number.isInteger(total) || total < 0 || total > 60 * DARTS_PER_ROUND) {
      setEntryError(total > 60 * DARTS_PER_ROUND
        ? 'Max for 3 darts is 180.'
        : 'Enter the round total first (0–180).');
      setShakeCell(true);
      return;
    }
    dispatch({ type: 'game/total', total });
  };

  const endTurn = async () => {
    if (over) return;
    if (game.darts.length === 0
      && !(await confirm(`End ${player.name}'s turn with no darts scored?`, 'End turn'))) return;
    dispatch({ type: 'game/endTurn' });
  };

  const newGame = async () => {
    const inProgress = !over && (game.history.length > 0 || game.darts.length > 0);
    if (inProgress
      && !(await confirm('Abandon the current game and go back to setup?', 'Abandon game'))) return;
    dispatch({ type: 'game/toSetup' });
  };

  const undoRound = async () => {
    if (game.history.length === 0) return;
    if (!over && game.darts.length > 0
      && !(await confirm(`Undoing the last round will also clear ${player.name}'s darts from this round. Continue?`, 'Undo round'))) return;
    dispatch({ type: 'game/undoRound' });
  };

  // desktop shortcuts (dart-by-dart mode only — in total mode the cell input owns the keyboard)
  useEffect(() => {
    const onKey = (e) => {
      if (over || effectiveMode !== 'darts' || document.querySelector('dialog[open]')) return;
      const tag = (e.target.tagName || '').toLowerCase();
      if (tag === 'input' || tag === 'textarea' || tag === 'select') return;
      if (e.key === 'Backspace') {
        e.preventDefault();
        dispatch({ type: 'game/undoDart' });
      } else if (e.key === 'Enter' && tag !== 'button') {
        e.preventDefault();
        endTurn();
      } else if (e.key === 'd' || e.key === 'D') {
        dispatch({ type: 'game/mult', mult: 2 });
      } else if (e.key === 't' || e.key === 'T') {
        dispatch({ type: 'game/mult', mult: 3 });
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  });

  return (
    <main className="view game-view">
      <header className="topbar">
        <button
          type="button"
          className="btn ghost"
          title="Change the target score"
          onClick={() => setTargetOpen(true)}
        >
          Target {game.target} ✎
        </button>
        <span className="round">{over ? 'Game over' : `Round ${roundNumber(game)}`}</span>
        <button type="button" className="btn ghost" onClick={newGame}>New game</button>
      </header>

      <div className="game-grid">
        <ScoreSheet
          game={game}
          entryMode={effectiveMode}
          draft={draft}
          onDraftChange={(v) => { setDraft(v); setEntryError(''); }}
          onCommitTotal={commitTotal}
          shakeCell={shakeCell}
          onShakeEnd={() => setShakeCell(false)}
        />

        {over ? (
          <section className="card turn-panel">
            <div className="turn-title">
              <span className="turn-name">🏆 {game.players[game.winner].name} wins!</span>
            </div>
            <div className="stack">
              <button type="button" className="btn primary xl" onClick={() => dispatch({ type: 'game/rematch' })}>
                Rematch
              </button>
              <button type="button" className="btn xl" onClick={() => dispatch({ type: 'game/toSetup' })}>
                Change players / score
              </button>
              <button type="button" className="btn ghost small" onClick={undoRound}>
                ↩ Undo last round
              </button>
            </div>
          </section>
        ) : (
          <EntryPanel
            game={game}
            mult={mult}
            entryMode={entryMode}
            effectiveMode={effectiveMode}
            dispatch={dispatch}
            onEndTurn={endTurn}
            onUndoRound={undoRound}
            onCommitTotal={commitTotal}
            error={entryError}
          />
        )}
      </div>

      <TargetDialog
        open={targetOpen}
        target={game.target}
        onApply={(target) => dispatch({ type: 'game/target', target })}
        onClose={() => setTargetOpen(false)}
      />
      <WinnerDialog
        game={game}
        open={over && !winnerDismissed}
        onClose={() => setWinnerDismissed(true)}
        onRematch={() => dispatch({ type: 'game/rematch' })}
        onSetup={() => dispatch({ type: 'game/toSetup' })}
        onUndoDart={() => dispatch({ type: 'game/undoWinningDart' })}
      />
    </main>
  );
}
