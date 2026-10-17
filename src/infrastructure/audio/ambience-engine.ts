import { audioCtx } from './sfx-engine';
import { settings } from '../persistence/settings-repository';

/**
 * Âm thanh nền theo bản đồ, tạo bằng WebAudio (không cần tệp): tiếng gió, mưa, lửa, nhịp trống, chim, chuông...
 * cùng vài nốt nhạc thưa theo thang âm riêng của từng bản đồ. Phím M bật hoặc tắt.
 */

const MUTE_KEY = 'honviet_arena3d_mute';

interface Group {
  gain: GainNode;
  stops: (() => void)[];
  timers: number[];
}

let master: GainNode | null = null;
let noiseBuf: AudioBuffer | null = null;
let current: Group | null = null;
let currentBiome = -1;
let muted = (() => {
  try {
    return localStorage.getItem(MUTE_KEY) === '1';
  } catch {
    return false;
  }
})();

function noise(c: AudioContext): AudioBuffer {
  if (!noiseBuf) {
    noiseBuf = c.createBuffer(1, c.sampleRate * 2, c.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  return noiseBuf;
}

function masterNode(c: AudioContext): GainNode {
  if (!master) {
    master = c.createGain();
    master.gain.value = muted ? 0 : settings.music;
    master.connect(c.destination);
  }
  return master;
}

/** Tiếng ồn lọc, có thể nhấp nhô chậm (gió, mưa, lửa). */
function layerNoise(c: AudioContext, g: Group, type: BiquadFilterType, freq: number, q: number, vol: number, lfo?: { rate: number; depth: number }): GainNode {
  const src = c.createBufferSource();
  src.buffer = noise(c);
  src.loop = true;
  const f = c.createBiquadFilter();
  f.type = type;
  f.frequency.value = freq;
  f.Q.value = q;
  const gain = c.createGain();
  gain.gain.value = vol;
  src.connect(f);
  f.connect(gain);
  gain.connect(g.gain);
  src.start();
  g.stops.push(() => {
    src.stop();
    src.disconnect();
  });
  if (lfo) {
    const o = c.createOscillator();
    o.frequency.value = lfo.rate;
    const og = c.createGain();
    og.gain.value = vol * lfo.depth;
    o.connect(og);
    og.connect(gain.gain);
    o.start();
    g.stops.push(() => {
      o.stop();
      o.disconnect();
    });
  }
  return gain;
}

/** Âm kéo dài ở tần số thấp (nền rờn rợn). */
function drone(c: AudioContext, g: Group, freq: number, type: OscillatorType, cutoff: number, vol: number): void {
  const o = c.createOscillator();
  o.type = type;
  o.frequency.value = freq;
  const f = c.createBiquadFilter();
  f.type = 'lowpass';
  f.frequency.value = cutoff;
  const gain = c.createGain();
  gain.gain.value = vol;
  o.connect(f);
  f.connect(gain);
  gain.connect(g.gain);
  o.start();
  g.stops.push(() => {
    o.stop();
    o.disconnect();
  });
}

/** Nốt ngắn có bao biên độ. */
function tone(c: AudioContext, g: Group, freq: number, dur: number, type: OscillatorType, vol: number, glideTo?: number): void {
  const t = c.currentTime;
  const o = c.createOscillator();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (glideTo) o.frequency.exponentialRampToValueAtTime(Math.max(20, glideTo), t + dur);
  const gain = c.createGain();
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(vol, t + Math.min(0.05, dur * 0.3));
  gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(gain);
  gain.connect(g.gain);
  o.start(t);
  o.stop(t + dur + 0.05);
}

/** Tia ồn ngắn (tiếng nổ lách tách, sấm). */
function burstNoise(c: AudioContext, g: Group, type: BiquadFilterType, freq: number, dur: number, vol: number): void {
  const t = c.currentTime;
  const src = c.createBufferSource();
  src.buffer = noise(c);
  const f = c.createBiquadFilter();
  f.type = type;
  f.frequency.value = freq;
  const gain = c.createGain();
  gain.gain.setValueAtTime(vol, t);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(f);
  f.connect(gain);
  gain.connect(g.gain);
  src.start(t, Math.random());
  src.stop(t + dur + 0.05);
}

/** Gọi lặp với khoảng cách ngẫu nhiên. */
function every(g: Group, minMs: number, maxMs: number, fn: () => void): void {
  const tick = (): void => {
    fn();
    g.timers.push(window.setTimeout(tick, minMs + Math.random() * (maxMs - minMs)));
  };
  g.timers.push(window.setTimeout(tick, minMs * 0.5 + Math.random() * minMs));
}

const pick = <T,>(a: T[]): T => a[Math.floor(Math.random() * a.length)];

function build(c: AudioContext, g: Group, biome: number): void {
  switch (biome) {
    case 0: {
      // Làng: gió nhẹ, chim hót, nốt ngũ cung
      layerNoise(c, g, 'bandpass', 520, 0.6, 0.05, { rate: 0.12, depth: 0.7 });
      every(g, 900, 2600, () => {
        const f = 2200 + Math.random() * 1400;
        tone(c, g, f, 0.09, 'sine', 0.035, f * 1.35);
        window.setTimeout(() => tone(c, g, f * 1.2, 0.08, 'sine', 0.03, f * 0.95), 110);
      });
      const pent = [293.7, 329.6, 392, 440, 523.3, 587.3];
      every(g, 1400, 3200, () => tone(c, g, pick(pent), 1.3, 'triangle', 0.035));
      break;
    }
    case 1: {
      // Nghĩa địa: rờn rợn, gió lạnh, tiếng cú xa
      drone(c, g, 55, 'sawtooth', 160, 0.05);
      layerNoise(c, g, 'bandpass', 300, 0.8, 0.05, { rate: 0.08, depth: 0.8 });
      every(g, 5000, 11000, () => tone(c, g, 420, 0.9, 'sine', 0.04, 300));
      const dark = [110, 116.5, 164.8, 220, 233];
      every(g, 2200, 4800, () => tone(c, g, pick(dark), 2.2, 'triangle', 0.03));
      break;
    }
    case 2: {
      // Trăng máu: tim đập, hơi thở nặng, dơi rít
      drone(c, g, 65, 'sawtooth', 140, 0.04);
      layerNoise(c, g, 'lowpass', 260, 0.7, 0.045, { rate: 0.2, depth: 0.6 });
      every(g, 1100, 1100, () => {
        tone(c, g, 62, 0.16, 'sine', 0.11, 40);
        window.setTimeout(() => tone(c, g, 58, 0.16, 'sine', 0.08, 38), 230);
      });
      every(g, 4000, 9000, () => tone(c, g, 3000 + Math.random() * 800, 0.12, 'sine', 0.025, 4200));
      break;
    }
    case 3: {
      // Giông bão: mưa, gió, sấm xa
      layerNoise(c, g, 'highpass', 2800, 0.5, 0.085);
      layerNoise(c, g, 'bandpass', 420, 0.5, 0.045, { rate: 0.15, depth: 0.7 });
      every(g, 5000, 11000, () => {
        burstNoise(c, g, 'lowpass', 140, 2.2, 0.28);
        window.setTimeout(() => burstNoise(c, g, 'lowpass', 90, 1.6, 0.2), 320);
      });
      break;
    }
    case 4: {
      // Băng giá: gió rít, chuông băng thưa
      layerNoise(c, g, 'bandpass', 760, 0.7, 0.07, { rate: 0.1, depth: 0.7 });
      layerNoise(c, g, 'highpass', 4500, 0.4, 0.015, { rate: 0.2, depth: 0.5 });
      const chime = [880, 987.8, 1174.7, 1318.5, 1568];
      every(g, 1800, 4200, () => {
        const f = pick(chime);
        tone(c, g, f, 2.4, 'sine', 0.03);
        tone(c, g, f * 2.01, 1.6, 'sine', 0.012);
      });
      break;
    }
    case 5: {
      // Núi lửa: lửa lách tách, rung chuyển, trống trận
      layerNoise(c, g, 'lowpass', 110, 0.8, 0.09, { rate: 0.3, depth: 0.5 });
      drone(c, g, 45, 'sawtooth', 120, 0.05);
      layerNoise(c, g, 'highpass', 1800, 0.5, 0.012, { rate: 0.5, depth: 0.9 });
      every(g, 120, 520, () => burstNoise(c, g, 'highpass', 2200 + Math.random() * 1800, 0.05, 0.05));
      let beat = 0;
      every(g, 1400, 1400, () => {
        beat++;
        tone(c, g, 82, 0.35, 'sine', beat % 4 === 1 ? 0.16 : 0.1, 38);
      });
      break;
    }
    case 6: {
      // Bạch Đằng: sóng vỗ, ếch nhái và côn trùng, tiếng trống xa
      layerNoise(c, g, 'lowpass', 380, 0.6, 0.06, { rate: 0.18, depth: 0.8 });
      layerNoise(c, g, 'bandpass', 900, 0.8, 0.02, { rate: 0.1, depth: 0.7 });
      every(g, 600, 1800, () => {
        const f = 1800 + Math.random() * 900;
        tone(c, g, f, 0.07, 'square', 0.014);
        window.setTimeout(() => tone(c, g, f * 1.04, 0.07, 'square', 0.012), 90);
      });
      every(g, 3500, 8000, () => tone(c, g, 130, 0.5, 'sine', 0.05, 70));
      break;
    }
    case 7: {
      // Phong Nha: nhỏ giọt vang vọng, gió hang trầm
      drone(c, g, 50, 'sawtooth', 130, 0.04);
      layerNoise(c, g, 'bandpass', 220, 0.9, 0.05, { rate: 0.07, depth: 0.7 });
      every(g, 700, 2400, () => {
        const f = 900 + Math.random() * 700;
        tone(c, g, f, 0.35, 'sine', 0.05, f * 0.8);
        window.setTimeout(() => tone(c, g, f * 0.98, 0.5, 'sine', 0.018, f * 0.8), 160);
      });
      break;
    }
  }
}

function dispose(g: Group, c: AudioContext, fade = 1.2): void {
  g.timers.forEach((t) => window.clearTimeout(t));
  g.timers.length = 0;
  g.gain.gain.cancelScheduledValues(c.currentTime);
  g.gain.gain.setValueAtTime(g.gain.gain.value, c.currentTime);
  g.gain.gain.linearRampToValueAtTime(0, c.currentTime + fade);
  window.setTimeout(() => {
    for (const s of g.stops) {
      try {
        s();
      } catch {
        /* nguồn đã dừng */
      }
    }
    g.gain.disconnect();
  }, fade * 1000 + 100);
}

export const ambience = {
  /** Chuyển sang âm nền của bản đồ (cross-fade). Gọi lại với cùng bản đồ thì bỏ qua. */
  setBiome(biome: number): void {
    if (biome === currentBiome && current) return;
    const c = audioCtx();
    if (!c) return;
    currentBiome = biome;
    if (current) dispose(current, c);
    const gain = c.createGain();
    gain.gain.value = 0;
    gain.connect(masterNode(c));
    const g: Group = { gain, stops: [], timers: [] };
    build(c, g, biome);
    gain.gain.linearRampToValueAtTime(1, c.currentTime + 1.5);
    current = g;
  },
  stop(): void {
    const c = audioCtx();
    if (current && c) dispose(current, c, 0.6);
    current = null;
    currentBiome = -1;
  },
  toggleMute(): boolean {
    muted = !muted;
    try {
      localStorage.setItem(MUTE_KEY, muted ? '1' : '0');
    } catch {
      /* bỏ qua */
    }
    const c = audioCtx();
    if (c && master) master.gain.setTargetAtTime(muted ? 0 : settings.music, c.currentTime, 0.1);
    return muted;
  },
  /** Áp dụng lại âm lượng nhạc nền từ cài đặt. */
  applyVolume(): void {
    const c = audioCtx();
    if (c && master) master.gain.setTargetAtTime(muted ? 0 : settings.music, c.currentTime, 0.05);
  },
  get muted(): boolean {
    return muted;
  },
};
