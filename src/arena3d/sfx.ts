import { settings } from './settings';

/** Âm thanh đơn giản tạo bằng WebAudio, không cần tệp. */
let actx: AudioContext | null = null;
let lastCoinSfx = 0;

export function resumeAudio(): void {
  try {
    if (!actx) actx = new AudioContext();
    if (actx.state === 'suspended') void actx.resume();
  } catch {
    /* thiết bị không hỗ trợ âm thanh */
  }
}

/** Bối cảnh âm thanh dùng chung (tạo khi cần), hoặc null nếu thiết bị không hỗ trợ. */
export function audioCtx(): AudioContext | null {
  try {
    if (!actx) actx = new AudioContext();
    if (actx.state === 'suspended') void actx.resume();
    return actx;
  } catch {
    return null;
  }
}

function beep(freq: number, dur: number, type: OscillatorType, vol: number, slide = 0): void {
  vol *= settings.sfx;
  if (vol <= 0.0005) return;
  try {
    if (!actx) actx = new AudioContext();
    if (actx.state === 'suspended') void actx.resume();
    const t = actx.currentTime;
    const o = actx.createOscillator();
    const g = actx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g);
    g.connect(actx.destination);
    o.start(t);
    o.stop(t + dur + 0.02);
  } catch {
    /* thiết bị không hỗ trợ âm thanh */
  }
}

export const sfx = {
  hit: () => beep(180, 0.08, 'square', 0.05, -80),
  boom: () => beep(110, 0.35, 'sawtooth', 0.09, -70),
  hurt: () => beep(240, 0.2, 'sawtooth', 0.08, -150),
  swing: () => beep(420, 0.08, 'triangle', 0.05, -200),
  coin: () => {
    const n = performance.now();
    if (n - lastCoinSfx < 45) return;
    lastCoinSfx = n;
    beep(880, 0.07, 'sine', 0.05, 500);
  },
  win: () => [523, 659, 784].forEach((f, i) => window.setTimeout(() => beep(f, 0.18, 'triangle', 0.07), i * 90)),
  dash: () => beep(300, 0.12, 'sine', 0.05, 400),
  chat: () => beep(660, 0.06, 'sine', 0.04),
};

export type SfxName = keyof typeof sfx;
