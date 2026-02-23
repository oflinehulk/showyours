// Procedural audio effects using Web Audio API — no audio files needed

let ctx: AudioContext | null = null;

function getContext(): AudioContext {
  if (!ctx) ctx = new AudioContext();
  return ctx;
}

/** Call from a user gesture handler to unlock audio on iOS */
export async function resumeAudioContext(): Promise<void> {
  const c = getContext();
  if (c.state === 'suspended') await c.resume();
}

/** Rapid low-freq strikes with crescendo */
export function playDrumRoll(durationMs = 2000): void {
  try {
    const c = getContext();
    const now = c.currentTime;
    const dur = durationMs / 1000;
    const strikeCount = Math.floor(durationMs / 50);

    for (let i = 0; i < strikeCount; i++) {
      const t = now + (i / strikeCount) * dur;
      const gain = c.createGain();
      const osc = c.createOscillator();
      osc.type = 'triangle';
      osc.frequency.value = 80 + Math.random() * 40;
      gain.gain.setValueAtTime(0.02 + (i / strikeCount) * 0.12, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.04);
      osc.connect(gain).connect(c.destination);
      osc.start(t);
      osc.stop(t + 0.05);
    }
  } catch { /* audio not available */ }
}

/** Single percussive thud for coin/ball landing */
export function playImpactHit(): void {
  try {
    const c = getContext();
    const now = c.currentTime;

    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(150, now);
    osc.frequency.exponentialRampToValueAtTime(40, now + 0.15);
    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
    osc.connect(gain).connect(c.destination);
    osc.start(now);
    osc.stop(now + 0.25);

    // Noise layer
    const bufferSize = c.sampleRate * 0.1;
    const buffer = c.createBuffer(1, bufferSize, c.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
    }
    const noise = c.createBufferSource();
    noise.buffer = buffer;
    const noiseGain = c.createGain();
    noiseGain.gain.setValueAtTime(0.1, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
    noise.connect(noiseGain).connect(c.destination);
    noise.start(now);
    noise.stop(now + 0.15);
  } catch { /* audio not available */ }
}

/** Three ascending tones for winner reveal */
export function playRevealFlourish(): void {
  try {
    const c = getContext();
    const now = c.currentTime;
    const notes = [523.25, 659.25, 783.99]; // C5, E5, G5

    notes.forEach((freq, i) => {
      const t = now + i * 0.12;
      const osc = c.createOscillator();
      const gain = c.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.15, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
      osc.connect(gain).connect(c.destination);
      osc.start(t);
      osc.stop(t + 0.35);
    });
  } catch { /* audio not available */ }
}

/** Filtered noise sweep for ball exit */
export function playWhoosh(): void {
  try {
    const c = getContext();
    const now = c.currentTime;

    const bufferSize = c.sampleRate * 0.4;
    const buffer = c.createBuffer(1, bufferSize, c.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = c.createBufferSource();
    noise.buffer = buffer;

    const filter = c.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(400, now);
    filter.frequency.exponentialRampToValueAtTime(2000, now + 0.15);
    filter.frequency.exponentialRampToValueAtTime(200, now + 0.35);
    filter.Q.value = 2;

    const gain = c.createGain();
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.2, now + 0.08);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

    noise.connect(filter).connect(gain).connect(c.destination);
    noise.start(now);
    noise.stop(now + 0.4);
  } catch { /* audio not available */ }
}
