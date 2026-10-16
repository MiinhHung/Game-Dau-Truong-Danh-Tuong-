/** Cài đặt người chơi, nhớ giữa các lần chơi (localStorage). */
export interface Settings {
  /** Âm lượng hiệu ứng (0..1). */
  sfx: number;
  /** Âm lượng nhạc nền (0..1). */
  music: number;
  /** Khoảng cách camera (9 gần nhất, 36 xa nhất). */
  zoom: number;
}

const KEY = 'honviet_arena3d_settings';

function load(): Settings {
  const d: Settings = { sfx: 1, music: 0.9, zoom: 20 };
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? 'null') as Partial<Settings> | null;
    if (raw && typeof raw === 'object') {
      const n = (v: unknown, lo: number, hi: number, def: number): number => (typeof v === 'number' && Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : def);
      d.sfx = n(raw.sfx, 0, 1, d.sfx);
      d.music = n(raw.music, 0, 1, d.music);
      d.zoom = n(raw.zoom, 9, 36, d.zoom);
    }
  } catch {
    /* dùng mặc định */
  }
  return d;
}

export const settings: Settings = load();

let timer = 0;
export function saveSettings(): void {
  window.clearTimeout(timer);
  timer = window.setTimeout(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(settings));
    } catch {
      /* bỏ qua */
    }
  }, 300);
}
