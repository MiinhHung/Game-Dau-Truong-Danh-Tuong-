import { STORAGE_KEYS } from '../../config/storage-keys';
import { GAME_CONSTANTS } from '../../config/game-constants';
import type { QualityLevel, QualitySetting } from '../../rendering/postfx/quality';

/** Cài đặt người chơi, nhớ giữa các lần chơi (localStorage). */
export interface Settings {
  /** Âm lượng hiệu ứng (0..1). */
  sfx: number;
  /** Âm lượng nhạc nền (0..1). */
  music: number;
  /** Khoảng cách camera (9 gần nhất, 36 xa nhất). */
  zoom: number;
  /** Mức chất lượng đồ họa; 'auto' tự hạ khi máy chạy không kịp. */
  quality: QualitySetting;
  /** Mức mà chế độ Tự động đã chọn, để lần sau mở game vào thẳng mức đó. */
  autoLevel: QualityLevel;
}

const KEY = STORAGE_KEYS.SETTINGS;
const SETTINGS: QualitySetting[] = ['auto', 'high', 'medium', 'low'];
const LEVELS: QualityLevel[] = ['high', 'medium', 'low'];

function load(): Settings {
  const d: Settings = { sfx: 1, music: 0.9, zoom: GAME_CONSTANTS.CAMERA_ZOOM_DEFAULT, quality: 'auto', autoLevel: 'medium' };
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? 'null') as Partial<Settings> | null;
    if (raw && typeof raw === 'object') {
      const n = (v: unknown, lo: number, hi: number, def: number): number => (typeof v === 'number' && Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : def);
      d.sfx = n(raw.sfx, 0, 1, d.sfx);
      d.music = n(raw.music, 0, 1, d.music);
      d.zoom = n(raw.zoom, GAME_CONSTANTS.CAMERA_ZOOM_MIN, GAME_CONSTANTS.CAMERA_ZOOM_MAX, d.zoom);
      if (SETTINGS.includes(raw.quality as QualitySetting)) d.quality = raw.quality as QualitySetting;
      if (LEVELS.includes(raw.autoLevel as QualityLevel)) d.autoLevel = raw.autoLevel as QualityLevel;
    }
  } catch {
    /* dùng mặc định */
  }
  return d;
}

export const settings: Settings = load();

/** Mức chất lượng thực đang dùng (Tự động thì lấy mức đã tự chọn). */
export function effectiveQuality(): QualityLevel {
  return settings.quality === 'auto' ? settings.autoLevel : settings.quality;
}

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
