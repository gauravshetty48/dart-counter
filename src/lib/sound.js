// Tiny WebAudio synth for game feedback — no audio files to ship or load.

let ctx = null;
function getCtx() {
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) return null;
  if (!ctx) ctx = new AudioCtx();
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

function tone(audio, freq, startTime, duration, { type = 'sine', gain = 0.2 } = {}) {
  const osc = audio.createOscillator();
  const amp = audio.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  amp.gain.setValueAtTime(0, startTime);
  amp.gain.linearRampToValueAtTime(gain, startTime + 0.015);
  amp.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
  osc.connect(amp).connect(audio.destination);
  osc.start(startTime);
  osc.stop(startTime + duration + 0.02);
}

// A player has checked out — bright ascending three-note chime.
export function playVictorySound() {
  const audio = getCtx();
  if (!audio) return;
  const now = audio.currentTime;
  [523.25, 659.25, 783.99].forEach((freq, i) => { // C5, E5, G5
    tone(audio, freq, now + i * 0.09, 0.22, { type: 'triangle', gain: 0.18 });
  });
}

// The game just ended — soft descending close-out tone.
export function playGameOverSound() {
  const audio = getCtx();
  if (!audio) return;
  const now = audio.currentTime;
  [783.99, 587.33, 392.0].forEach((freq, i) => { // G5, D5, G4
    tone(audio, freq, now + i * 0.11, 0.3, { type: 'sine', gain: 0.16 });
  });
}
