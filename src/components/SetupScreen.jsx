import { useState } from 'react';
import PresetChips from './PresetChips.jsx';
import { parseTarget, MAX_NAME } from '../lib/game.js';

export default function SetupScreen({ lineup, roster, lastTarget, dispatch }) {
  const [targetStr, setTargetStr] = useState(String(lastTarget));
  const [name, setName] = useState('');
  const [hint, setHint] = useState('');
  const [shakeTarget, setShakeTarget] = useState(false);
  const [shakeName, setShakeName] = useState(false);

  const addPlayer = (raw) => {
    const newName = String(raw).trim().slice(0, MAX_NAME);
    if (!newName) {
      setShakeName(true);
      return false;
    }
    if (lineup.some((n) => n.toLowerCase() === newName.toLowerCase())) {
      setHint(`${newName} is already in the game.`);
      setShakeName(true);
      return false;
    }
    dispatch({ type: 'lineup/add', name: newName });
    setHint('');
    return true;
  };

  const start = () => {
    const target = parseTarget(targetStr);
    if (!target) {
      setHint('Enter a starting score between 1 and 9999.');
      setShakeTarget(true);
      return;
    }
    if (lineup.length === 0) {
      setHint('Add at least one player to start.');
      setShakeName(true);
      return;
    }
    dispatch({ type: 'game/start', target });
  };

  const inLineup = new Set(lineup.map((n) => n.toLowerCase()));
  const savedPlayers = roster.filter((n) => !inLineup.has(n.toLowerCase()));

  return (
    <main className="view">
      <header className="brand">
        <h1>🎯 Dart Counter</h1>
        <p className="tagline">Pick a starting score, add your players, throw.</p>
      </header>

      <section className="card">
        <h2>Starting score</h2>
        <PresetChips value={targetStr} onPick={(v) => setTargetStr(String(v))} />
        <label className="field">
          <span className="muted">Custom score</span>
          <input
            type="number"
            inputMode="numeric"
            min="1"
            max="9999"
            step="1"
            value={targetStr}
            className={shakeTarget ? 'shake' : undefined}
            onAnimationEnd={() => setShakeTarget(false)}
            onChange={(e) => setTargetStr(e.target.value)}
          />
        </label>
      </section>

      <section className="card">
        <h2>
          Players <span className="muted">{lineup.length ? `(${lineup.length})` : ''}</span>
        </h2>
        <ol className="lineup">
          {lineup.length === 0 && <li className="empty">No players yet — add one below.</li>}
          {lineup.map((player, i) => (
            <li key={player}>
              <span className="l-index muted">{i + 1}.</span>
              <span className="l-name">{player}</span>
              <button
                type="button"
                className="btn ghost small"
                title={`Remove ${player} from this game`}
                onClick={() => dispatch({ type: 'lineup/remove', index: i })}
              >
                ✕
              </button>
            </li>
          ))}
        </ol>

        <form
          className="add-player-form"
          autoComplete="off"
          onSubmit={(e) => {
            e.preventDefault();
            if (addPlayer(name)) setName('');
          }}
        >
          <input
            type="text"
            maxLength={MAX_NAME}
            placeholder="Add a player…"
            autoComplete="off"
            value={name}
            className={shakeName ? 'shake' : undefined}
            onAnimationEnd={() => setShakeName(false)}
            onChange={(e) => setName(e.target.value)}
          />
          <button type="submit" className="btn">Add</button>
        </form>

        {savedPlayers.length > 0 && (
          <div>
            <h3 className="roster-title muted">Saved players — tap to add</h3>
            <div className="chips">
              {savedPlayers.map((saved) => (
                <div className="chip" key={saved}>
                  <button
                    type="button"
                    className="chip-add"
                    title={`Add ${saved} to this game`}
                    onClick={() => addPlayer(saved)}
                  >
                    {saved}
                  </button>
                  <button
                    type="button"
                    className="chip-x"
                    title={`Forget ${saved}`}
                    onClick={() => dispatch({ type: 'roster/forget', name: saved })}
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      <button type="button" className="btn primary xl" onClick={start}>Start game</button>
      <p className="hint">{hint}</p>
    </main>
  );
}
