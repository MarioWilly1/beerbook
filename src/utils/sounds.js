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
