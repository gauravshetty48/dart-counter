import { useEffect, useRef } from 'react';
import { roundSum, statsFor, threeDartAvg, isOver, placementOf } from '../lib/game.js';

const MEDALS = ['🥇', '🥈', '🥉'];

/**
 * Bowling-style scoresheet: one row per player, one column per round,
 * remaining score pinned on the right. The current player's cell for the
 * current round is "live" — in total mode it's a direct input.
 */
export default function ScoreSheet({
  game, entryMode, draft, onDraftChange, onCommitTotal, shakeCell, onShakeEnd,
}) {
  const wrapRef = useRef(null);
  const over = isOver(game);
  const entriesByPlayer = game.players.map((_, p) => game.history.filter((h) => h.p === p));
  // finishers stop throwing, so entry counts go uneven — size the grid to the
  // busiest player, leaving room for the current thrower's live cell.
  const maxEntries = Math.max(0, ...entriesByPlayer.map((e) => e.length));
  const totalRounds = Math.max(maxEntries, over ? 0 : entriesByPlayer[game.current].length + 1);

  // keep the latest round column in view as the sheet grows
  useEffect(() => {
    const wrap = wrapRef.current;
    if (wrap) wrap.scrollLeft = wrap.scrollWidth;
  }, [totalRounds, game.current]);

  const renderCommitted = (entry, r) => {
    const checkout = !entry.bust && entry.prev === entry.total;
    const title = entry.bust
      ? `Threw ${entry.total} — bust`
      : entry.darts.length
        ? entry.darts.map((d) => d.label).join(' ')
        : undefined;
    return (
      <td key={r} className={`cell${entry.bust ? ' bust' : ''}${checkout ? ' checkout' : ''}`} title={title}>
        {entry.bust ? 'BUST' : entry.total}
      </td>
    );
  };

  const renderActive = (r) => (
    <td key={r} className="cell active">
      {entryMode === 'total' ? (
        <input
          key={game.history.length}
          className={`cell-input${shakeCell ? ' shake' : ''}`}
          type="text"
          inputMode="numeric"
          autoFocus
          maxLength={3}
          value={draft}
          placeholder="·"
          aria-label="Round total"
          onAnimationEnd={onShakeEnd}
          onChange={(e) => onDraftChange(e.target.value.replace(/\D/g, ''))}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              onCommitTotal();
            }
          }}
        />
      ) : (
        <span className={`cell-live${game.bust ? ' bust' : ''}`}>
          {game.bust ? 'BUST' : game.darts.length ? roundSum(game.darts) : '·'}
        </span>
      )}
    </td>
  );

  return (
    <section className="card sheet-card" aria-label="Scoresheet">
      <div className="sheet-wrap" ref={wrapRef}>
        <table className="sheet">
          <thead>
            <tr>
              <th className="col-name">Player</th>
              {Array.from({ length: totalRounds }, (_, r) => <th key={r}>R{r + 1}</th>)}
              <th className="col-remain">Remaining</th>
            </tr>
          </thead>
          <tbody>
            {game.players.map((player, p) => {
              const entries = entriesByPlayer[p];
              const place = placementOf(game, p); // 1 = winner, 2 = runner-up, 0 = still in
              const isCurrent = !over && p === game.current;
              const medal = place ? MEDALS[place - 1] || `#${place}` : '';
              const rowClass = isCurrent ? 'current' : place === 1 ? 'winner' : place ? 'placed' : undefined;
              const avg = threeDartAvg(statsFor(game, p));
              return (
                <tr key={`${p}-${player.name}`} className={rowClass}>
                  <th className="col-name" scope="row">
                    <span className="sheet-name">{medal ? `${medal} ` : ''}{player.name}</span>
                    <span className="sheet-sub">{avg != null ? `avg ${avg}` : ' '}</span>
                  </th>
                  {Array.from({ length: totalRounds }, (_, r) => {
                    if (entries[r]) return renderCommitted(entries[r], r);
                    if (isCurrent && r === entries.length) return renderActive(r);
                    return <td key={r} className="cell empty" />;
                  })}
                  <td className="col-remain">
                    {/* keyed on the score so the pop animation replays on every change */}
                    <span className={`remain${place ? ' winner' : ''}`} key={player.score}>
                      {player.score}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
