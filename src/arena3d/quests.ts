import { MONSTERS, WEAPONS, MAX_WEAPON_LEVEL, type MonsterType } from './data';
import type { Save3D } from './save';

/** Nhiệm vụ ngày: mỗi ngày (giờ máy) có 3 nhiệm vụ cố định theo ngày, làm ở mọi lượt chơi trong ngày. */

interface Template {
  stat: string;
  goals: number[];
  reward: (g: number) => number;
  text: (g: number) => string;
  /** 'max': tiến độ lấy giá trị lớn nhất đạt được thay vì cộng dồn. */
  mode?: 'max';
}

const TYPES: MonsterType[] = ['zombie', 'skeleton', 'goblin', 'werewolf', 'ghost', 'bat', 'imp'];

const TEMPLATES: Template[] = [
  { stat: 'kills', goals: [60, 100, 160], reward: (g) => Math.round(g * 2.5), text: (g) => `Hạ ${g} quái` },
  { stat: 'elite', goals: [5, 8, 12], reward: (g) => g * 30, text: (g) => `Hạ ${g} quái tinh anh` },
  { stat: 'wave', goals: [6, 8, 10], reward: (g) => g * 40, text: (g) => `Đạt màn ${g} trong một lượt chơi`, mode: 'max' },
  { stat: 'gold', goals: [400, 700, 1000], reward: (g) => Math.round(g * 0.5), text: (g) => `Nhặt ${g} vàng` },
  { stat: 'ult', goals: [10, 16, 24], reward: (g) => g * 14, text: (g) => `Dùng chiêu cuối (Q) ${g} lần` },
  { stat: 'crit', goals: [30, 50, 80], reward: (g) => g * 5, text: (g) => `Đánh chí mạng ${g} lần` },
  ...TYPES.map<Template>((t) => ({ stat: `kill:${t}`, goals: [15, 25], reward: (g) => g * 14, text: (g) => `Hạ ${g} ${MONSTERS[t].name}` })),
];

export function todayKey(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

function parse(id: string): { tpl: Template; goal: number } | null {
  const [stat, g] = id.split('|');
  const tpl = TEMPLATES.find((t) => t.stat === stat);
  const goal = Number(g);
  return tpl && Number.isFinite(goal) ? { tpl, goal } : null;
}

export function questText(id: string): string {
  const p = parse(id);
  return p ? p.tpl.text(p.goal) : id;
}

export function questGoal(id: string): number {
  return parse(id)?.goal ?? 1;
}

export function questReward(id: string): number {
  const p = parse(id);
  return p ? p.tpl.reward(p.goal) : 0;
}

/** Tạo lại nhiệm vụ nếu đã sang ngày mới. */
export function ensureQuests(save: Save3D): void {
  const day = todayKey();
  if (save.quests.day === day && save.quests.items.length > 0) return;
  let seed = hash(day);
  const next = (): number => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  const pool = [...TEMPLATES];
  const items: Save3D['quests']['items'] = [];
  for (let i = 0; i < 3; i++) {
    const t = pool.splice(Math.floor(next() * pool.length), 1)[0];
    const goal = t.goals[Math.floor(next() * t.goals.length)];
    items.push({ id: `${t.stat}|${goal}`, progress: 0, claimed: false });
  }
  save.quests = { day, items };
}

/** Cộng tiến độ cho các nhiệm vụ cùng loại. Trả về true nếu có thay đổi. */
export function questAdd(save: Save3D, stat: string, n = 1): boolean {
  ensureQuests(save);
  let changed = false;
  for (const q of save.quests.items) {
    const p = parse(q.id);
    if (!p || p.tpl.stat !== stat || q.progress >= p.goal) continue;
    q.progress = Math.min(p.goal, p.tpl.mode === 'max' ? Math.max(q.progress, n) : q.progress + n);
    changed = true;
  }
  return changed;
}

/* ---------- Thành tích ---------- */

export interface Achievement {
  id: string;
  name: string;
  desc: string;
  reward: number;
  check(s: Save3D): boolean;
}

export const ACHIEVEMENTS: Achievement[] = [
  { id: 'kills100', name: 'Tân Binh', desc: 'Hạ tổng cộng 100 quái.', reward: 100, check: (s) => s.kills >= 100 },
  { id: 'kills1000', name: 'Sát Quái', desc: 'Hạ tổng cộng 1.000 quái.', reward: 400, check: (s) => s.kills >= 1000 },
  { id: 'kills10000', name: 'Vạn Quái', desc: 'Hạ tổng cộng 10.000 quái.', reward: 2000, check: (s) => s.kills >= 10000 },
  { id: 'wave10', name: 'Vững Bước', desc: 'Đạt tới màn 10.', reward: 300, check: (s) => s.bestWave >= 10 },
  { id: 'wave20', name: 'Bền Gan', desc: 'Đạt tới màn 20.', reward: 800, check: (s) => s.bestWave >= 20 },
  { id: 'wave30', name: 'Bất Khuất', desc: 'Đạt tới màn 30.', reward: 2000, check: (s) => s.bestWave >= 30 },
  { id: 'dragon', name: 'Săn Rồng', desc: 'Hạ một boss.', reward: 300, check: (s) => s.totals.bosses >= 1 },
  { id: 'titan', name: 'Diệt Titan', desc: 'Hạ Titan Đá Khổng Lồ.', reward: 600, check: (s) => s.totals.titans >= 1 },
  { id: 'elite50', name: 'Thợ Săn Tinh Anh', desc: 'Hạ 50 quái tinh anh.', reward: 300, check: (s) => s.totals.elites >= 50 },
  { id: 'rich', name: 'Nhà Giàu', desc: 'Nhặt tổng cộng 5.000 vàng.', reward: 300, check: (s) => s.totals.goldEarned >= 5000 },
  { id: 'ult100', name: 'Nội Công Thâm Hậu', desc: 'Dùng chiêu cuối 100 lần.', reward: 300, check: (s) => s.totals.ults >= 100 },
  { id: 'evolve', name: 'Tiến Hóa', desc: `Nâng một vũ khí lên cấp +${MAX_WEAPON_LEVEL}.`, reward: 500, check: (s) => WEAPONS.some((w) => (s.weapons[w.id] ?? 0) >= MAX_WEAPON_LEVEL) },
  { id: 'allgen', name: 'Đủ Mặt Danh Tướng', desc: 'Chơi đủ 7 danh tướng.', reward: 600, check: (s) => s.totals.played.length >= 7 },
];

/** Tin nhắn thành tích mới mở khóa, để sảnh hiện thông báo. */
export const pendingAchievements: string[] = [];

/** Mở khóa các thành tích đã đạt và cộng vàng thưởng. Trả về danh sách vừa mở. */
export function checkAchievements(save: Save3D): Achievement[] {
  const got: Achievement[] = [];
  for (const a of ACHIEVEMENTS) {
    if (save.achv[a.id] || !a.check(save)) continue;
    save.achv[a.id] = true;
    save.gold += a.reward;
    got.push(a);
    pendingAchievements.push(`Thành tích ${a.name}: +${a.reward} vàng`);
  }
  return got;
}
