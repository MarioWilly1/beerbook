let audioCtx = null;

function ctx() {
  if (!audioCtx || audioCtx.state === "closed") {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioCtx.state === "suspended") audioCtx.resume();
  return audioCtx;
}

export const isSoundEnabled = () =>
  localStorage.getItem("sounds_enabled") === "true";

// Glass clink: noise burst (impact) + ring tone (E6) + upper harmonic
export function soundClink() {
  if (!isSoundEnabled()) return;
  try {
    const c = ctx();
    const now = c.currentTime;

    // Impact — filtered white noise with sharp decay
    const bufLen = Math.floor(c.sampleRate * 0.04);
    const buf = c.createBuffer(1, bufLen, c.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufLen; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufLen, 8);
    }
    const noise = c.createBufferSource();
    noise.buffer = buf;
    const hpf = c.createBiquadFilter();
    hpf.type = "highpass";
    hpf.frequency.value = 2400;
    const noiseGain = c.createGain();
    noiseGain.gain.setValueAtTime(0.32, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
    noise.connect(hpf);
    hpf.connect(noiseGain);
    noiseGain.connect(c.destination);
    noise.start(now);

    // Ring — E6 (1318.5 Hz), long fade
    const ring = c.createOscillator();
    const ringGain = c.createGain();
    ring.type = "sine";
    ring.frequency.setValueAtTime(1318.5, now);
    ringGain.gain.setValueAtTime(0.2, now);
    ringGain.gain.exponentialRampToValueAtTime(0.001, now + 0.58);
    ring.connect(ringGain);
    ringGain.connect(c.destination);
    ring.start(now);
    ring.stop(now + 0.58);

    // Upper harmonic — fades faster
    const harm = c.createOscillator();
    const harmGain = c.createGain();
    harm.type = "sine";
    harm.frequency.setValueAtTime(2637, now);
    harmGain.gain.setValueAtTime(0.07, now);
    harmGain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
    harm.connect(harmGain);
    harmGain.connect(c.destination);
    harm.start(now);
    harm.stop(now + 0.18);
  } catch (_) {}
}

// Sophisticated level-up: C major 7th arpeggio (C4 E4 G4 B4), piano-like
export function soundLevelUp() {
  if (!isSoundEnabled()) return;
  try {
    const c = ctx();
    const now = c.currentTime;
    [261.63, 329.63, 392.0, 493.88].forEach((freq, i) => {
      const osc = c.createOscillator();
      const g = c.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, now + i * 0.07);
      g.gain.setValueAtTime(0, now + i * 0.07);
      g.gain.linearRampToValueAtTime(0.17, now + i * 0.07 + 0.015);
      g.gain.exponentialRampToValueAtTime(0.001, now + i * 0.07 + 0.55);
      osc.connect(g);
      g.connect(c.destination);
      osc.start(now + i * 0.07);
      osc.stop(now + i * 0.07 + 0.55);
    });
  } catch (_) {}
}

// Prestigio: impacto grave + acorde ascendente (C4-E4-G4-C5-E5) con brillo
// final — más grande y triunfal que soundLevelUp, para el momento de mayor
// peso del sistema de progresión.
export function soundPrestige() {
  if (!isSoundEnabled()) return;
  try {
    const c = ctx();
    const now = c.currentTime;

    // Impacto grave inicial
    const sub = c.createOscillator();
    const subGain = c.createGain();
    sub.type = "sine";
    sub.frequency.setValueAtTime(90, now);
    sub.frequency.exponentialRampToValueAtTime(45, now + 0.35);
    subGain.gain.setValueAtTime(0.28, now);
    subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
    sub.connect(subGain);
    subGain.connect(c.destination);
    sub.start(now);
    sub.stop(now + 0.4);

    // Arpegio ascendente triunfal
    [261.63, 329.63, 392.0, 523.25, 659.25].forEach((freq, i) => {
      const t = now + 0.12 + i * 0.09;
      const osc = c.createOscillator();
      const g = c.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(freq, t);
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.16, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.7);
      osc.connect(g);
      g.connect(c.destination);
      osc.start(t);
      osc.stop(t + 0.7);
    });

    // Brillo final sostenido (acorde completo)
    const chordAt = now + 0.65;
    [523.25, 659.25, 784.0, 1046.5].forEach((freq, i) => {
      const osc = c.createOscillator();
      const g = c.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, chordAt);
      g.gain.setValueAtTime(0, chordAt);
      g.gain.linearRampToValueAtTime(0.1, chordAt + 0.03);
      g.gain.exponentialRampToValueAtTime(0.001, chordAt + 1.1);
      osc.connect(g);
      g.connect(c.destination);
      osc.start(chordAt + i * 0.015);
      osc.stop(chordAt + 1.1);
    });
  } catch (_) {}
}

// Achievement: A major chord (A5 C#6 E6), brief and warm
export function soundAchievement() {
  if (!isSoundEnabled()) return;
  try {
    const c = ctx();
    const now = c.currentTime;
    [880, 1108.73, 1318.5].forEach((freq, i) => {
      const osc = c.createOscillator();
      const g = c.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, now + i * 0.05);
      g.gain.setValueAtTime(0, now + i * 0.05);
      g.gain.linearRampToValueAtTime(0.13, now + i * 0.05 + 0.01);
      g.gain.exponentialRampToValueAtTime(0.001, now + i * 0.05 + 0.32);
      osc.connect(g);
      g.connect(c.destination);
      osc.start(now + i * 0.05);
      osc.stop(now + i * 0.05 + 0.32);
    });
  } catch (_) {}
}
