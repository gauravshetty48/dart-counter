import { roundsCompleted, statsFor, threeDartAvg, restRanking } from '../lib/game.js';

const MEDALS = ['🥇', '🥈', '🥉'];
const MEDAL_CLASSES = ['gold', 'silver', 'bronze'];
const ORDINALS = ['', '1st', '2nd', '3rd'];
const ordinal = (place) => ORDINALS[place] || `${place}th`;

/**
 * Full post-game standings, not just the podium finishers: the explicit
 * top 3 (medal, the round they checked out on, their average) followed by
 * everyone else in ascending order of how much they had left when the game
 * ended (average, plus that leftover score). The player trailing furthest
 * behind gets a joker tag.
 */
export default function Podium({ game }) {
  const rest = restRanking(game);
  const jokerIdx = rest.length > 0 ? rest[rest.length - 1] : null;

  return (
    <ol className="podium">
      {game.finished.map((i, idx) => {
        const place = idx + 1;
        const avg = threeDartAvg(statsFor(game, i));
        return (
          <li key={i} className={MEDAL_CLASSES[idx]}>
            <span className="podium-medal">{MEDALS[idx] || `#${place}`}</span>
            <div className="podium-main">
              <span className="podium-name">
                <span className="podium-name-text">{game.players[i].name}</span>
              </span>
              <span className="podium-detail">
                Round {roundsCompleted(game, i)} · avg {avg ?? '—'}
              </span>
            </div>
            <span className="podium-place muted">{ordinal(place)}</span>
          </li>
        );
      })}
      {rest.map((i, idx) => {
        const place = game.finished.length + idx + 1;
        const avg = threeDartAvg(statsFor(game, i));
        const isJoker = i === jokerIdx;
        return (
          <li key={i} className={isJoker ? 'joker' : undefined}>
            <span className="podium-medal muted">#{place}</span>
            <div className="podium-main">
              <span className="podium-name">
                <span className="podium-name-text">{game.players[i].name}</span>
                {isJoker && <span className="joker-tag">🃏 Joker</span>}
              </span>
              <span className="podium-detail">
                avg {avg ?? '—'} · {game.players[i].score} left
              </span>
            </div>
            <span className="podium-place muted">{ordinal(place)}</span>
          </li>
        );
      })}
    </ol>
  );
}
