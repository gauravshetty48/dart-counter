import { roundsCompleted, statsFor, threeDartAvg, restRanking } from '../lib/game.js';

const MEDALS = ['🥇', '🥈', '🥉'];
const MEDAL_CLASSES = ['gold', 'silver', 'bronze'];
const ORDINALS = ['1st', '2nd', '3rd'];

/**
 * Full post-game standings as a table: rank, name, the round they were on,
 * their average, and how much they had left when the game ended (0 for the
 * top 3, who checked out). The player trailing furthest behind is ranked
 * last as "Joker" instead of a plain number.
 */
export default function Podium({ game }) {
  const rest = restRanking(game);
  const jokerIdx = rest.length > 0 ? rest[rest.length - 1] : null;

  const rows = [
    ...game.finished.map((i, idx) => ({ i, idx, top: true })),
    ...rest.map((i, idx) => ({ i, idx, top: false })),
  ];

  return (
    <table className="podium">
      <colgroup>
        <col className="col-rank" />
        <col />
        <col className="col-stat" />
        <col className="col-stat" />
        <col className="col-stat" />
      </colgroup>
      <thead>
        <tr>
          <th />
          <th className="col-name-head">Player</th>
          <th className="col-stat-head">Rd</th>
          <th className="col-stat-head">Avg</th>
          <th className="col-stat-head">Left</th>
        </tr>
      </thead>
      <tbody>
        {rows.map(({ i, idx, top }) => {
          const avg = threeDartAvg(statsFor(game, i));
          const isJoker = !top && i === jokerIdx;
          const rowClass = top ? MEDAL_CLASSES[idx] : isJoker ? 'joker' : undefined;
          return (
            <tr key={i} className={rowClass}>
              <td className="podium-rank">
                {top ? (
                  <>{MEDALS[idx]} {ORDINALS[idx]}</>
                ) : isJoker ? (
                  <span className="joker-tag">🃏 Joker</span>
                ) : (
                  idx + game.finished.length + 1
                )}
              </td>
              <td className="podium-name">{game.players[i].name}</td>
              <td className="podium-stat">{roundsCompleted(game, i)}</td>
              <td className="podium-stat">{avg ?? '—'}</td>
              <td className="podium-stat">{game.players[i].score}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
