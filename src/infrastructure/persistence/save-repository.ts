import { GEARS, GENERALS, MAX_WEAPON_LEVEL, WEAPONS, type GearSlot } from '../../domain/data';
import type { Loadout } from '../network/net-client';
import { STORAGE_KEYS } from '../../config/storage-keys';

const KEY = STORAGE_KEYS.SAVE_DATA;

export interface Save3D {
  version: 1;
  gold: number;
  general: string;
  weapon: string;
  /** Vũ khí đã sở hữu và cấp nâng cấp. */
  weapons: Record<string, number>;
  ownedGear: string[];
  equipped: Record<GearSlot, string | null>;
  bestWave: number;
  kills: number;
  runs: number;
  /** Nhiệm vụ ngày: ngày tạo (YYYY-MM-DD) và tiến độ từng nhiệm vụ. */
  quests: { day: string; items: { id: string; progress: number; claimed: boolean }[] };
  /** Thành tích đã mở khóa. */
  achv: Record<string, boolean>;
  /** Số liệu cộng dồn cho thành tích. */
  totals: { bosses: number; titans: number; elites: number; goldEarned: number; ults: number; played: string[] };
}

export function defaultSave(): Save3D {
  return {
    version: 1,
    gold: 120,
    general: 'tran_hung_dao',
    weapon: 'dep_lao',
    weapons: { dep_lao: 0, ghe_nhua: 0 },
    ownedGear: [],
    equipped: { head: null, body: null, feet: null, charm: null },
    bestWave: 0,
    kills: 0,
    runs: 0,
    quests: { day: '', items: [] },
    achv: {},
    totals: { bosses: 0, titans: 0, elites: 0, goldEarned: 0, ults: 0, played: [] },
  };
}

function num(v: unknown, d: number, min: number, max: number): number {
  return typeof v === 'number' && Number.isFinite(v) ? Math.min(max, Math.max(min, Math.floor(v))) : d;
}

/** Kiểm tra dữ liệu lưu, loại bỏ mục không hợp lệ thay vì làm hỏng cả bản lưu. */
export function sanitize(raw: unknown): Save3D {
  const d = defaultSave();
  if (!raw || typeof raw !== 'object') return d;
  const r = raw as Record<string, unknown>;
  if (r.version !== 1) return d;
  const s: Save3D = { ...d };
  s.gold = num(r.gold, d.gold, 0, 99_999_999);
  s.bestWave = num(r.bestWave, 0, 0, 9999);
  s.kills = num(r.kills, 0, 0, 99_999_999);
  s.runs = num(r.runs, 0, 0, 999_999);
  s.weapons = { ...d.weapons };
  if (r.weapons && typeof r.weapons === 'object') {
    for (const w of WEAPONS) {
      const lv = (r.weapons as Record<string, unknown>)[w.id];
      if (typeof lv === 'number') s.weapons[w.id] = num(lv, 0, 0, MAX_WEAPON_LEVEL);
    }
  }
  s.ownedGear = Array.isArray(r.ownedGear) ? (r.ownedGear as unknown[]).filter((id): id is string => typeof id === 'string' && GEARS.some((g) => g.id === id)) : [];
  s.equipped = { head: null, body: null, feet: null, charm: null };
  const eq = (r.equipped ?? {}) as Record<string, unknown>;
  for (const slot of ['head', 'body', 'feet', 'charm'] as GearSlot[]) {
    const id = eq[slot];
    if (typeof id === 'string' && s.ownedGear.includes(id) && GEARS.find((g) => g.id === id)?.slot === slot) s.equipped[slot] = id;
  }
  const q = r.quests as { day?: unknown; items?: unknown } | undefined;
  if (q && typeof q.day === 'string' && Array.isArray(q.items)) {
    s.quests = {
      day: q.day,
      items: (q.items as Record<string, unknown>[])
        .filter((i) => i && typeof i.id === 'string')
        .slice(0, 3)
        .map((i) => ({ id: i.id as string, progress: num(i.progress, 0, 0, 999_999), claimed: i.claimed === true })),
    };
  }
  if (r.achv && typeof r.achv === 'object') {
    for (const [k, v] of Object.entries(r.achv as Record<string, unknown>)) if (v === true) s.achv[k.slice(0, 40)] = true;
  }
  const t = r.totals as Record<string, unknown> | undefined;
  if (t && typeof t === 'object') {
    s.totals = {
      bosses: num(t.bosses, 0, 0, 999_999),
      titans: num(t.titans, 0, 0, 999_999),
      elites: num(t.elites, 0, 0, 99_999_999),
      goldEarned: num(t.goldEarned, 0, 0, 999_999_999),
      ults: num(t.ults, 0, 0, 99_999_999),
      played: Array.isArray(t.played) ? (t.played as unknown[]).filter((x): x is string => typeof x === 'string' && GENERALS.some((g) => g.id === x)) : [],
    };
  }
  s.general = typeof r.general === 'string' && GENERALS.some((g) => g.id === r.general) ? r.general : d.general;
  s.weapon = typeof r.weapon === 'string' && r.weapon in s.weapons ? r.weapon : d.weapon;
  return s;
}

export function loadSave(): Save3D {
  try {
    const txt = localStorage.getItem(KEY);
    return txt ? sanitize(JSON.parse(txt)) : defaultSave();
  } catch {
    return defaultSave();
  }
}

export function writeSave(s: Save3D): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    /* trình duyệt chặn bộ nhớ: bỏ qua, game vẫn chạy được */
  }
}

/** Phần cấu hình gửi cho máy chủ và đồng đội: đủ để họ tính chỉ số chiến đấu của bạn. */
export function loadoutOf(save: Save3D): Loadout {
  return { general: save.general, weapon: save.weapon, weapons: { ...save.weapons }, equipped: { ...save.equipped } };
}
