import { PRESETS } from '../lib/game.js';

export default function PresetChips({ value, onPick }) {
  return (
    <div className="presets">
      {PRESETS.map((preset) => (
        <button
          key={preset}
          type="button"
          className={`btn preset${Number(value) === preset ? ' active' : ''}`}
          onClick={() => onPick(preset)}
        >
          {preset}
        </button>
      ))}
    </div>
  );
}
