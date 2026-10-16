import type { Stats } from './stats';

/** Thẻ nâng cấp nhặt khi lên cấp trong một lượt chơi (mất khi hết lượt). */
export interface Card {
  id: string;
  name: string;
  desc: string;
  /** Số lần tối đa được chọn trong một lượt. */
  max: number;
  apply(s: Stats): void;
}

export const CARDS: Card[] = [
  { id: 'sucmanh', name: 'Sức Mạnh', desc: '+12% sát thương.', max: 8, apply: (s) => (s.dmgMult *= 1.12) },
  { id: 'tay_nhanh', name: 'Tay Nhanh', desc: '+10% tốc độ đánh.', max: 6, apply: (s) => (s.atkSpeed *= 1.1) },
  { id: 'chan_gio', name: 'Chân Gió', desc: '+8% tốc độ chạy.', max: 5, apply: (s) => (s.speed *= 1.08) },
  { id: 'the_luc', name: 'Thể Lực', desc: '+20 máu tối đa và hồi 20 máu.', max: 6, apply: (s) => (s.maxHp += 20) },
  { id: 'mat_dai_bang', name: 'Mắt Đại Bàng', desc: '+8% chí mạng.', max: 5, apply: (s) => (s.crit = Math.min(0.75, s.crit + 0.08)) },
  { id: 'tay_hom_chia', name: 'Tay Hòm Chìa', desc: '+15% vàng nhận được.', max: 5, apply: (s) => (s.goldMult += 0.15) },
  { id: 'giap_mem', name: 'Giáp Mềm', desc: 'Giảm thêm 6% sát thương nhận vào.', max: 5, apply: (s) => (s.reduce = Math.min(0.6, s.reduce + 0.06)) },
  { id: 'noi_cong', name: 'Nội Công', desc: 'Chiêu cuối (Q) hồi nhanh hơn 10%.', max: 5, apply: (s) => (s.ultCdMul *= 0.9) },
  { id: 'hoi_phuc', name: 'Hồi Phục', desc: 'Tự hồi 0,6 máu mỗi giây.', max: 5, apply: (s) => (s.regen += 0.6) },
];

export function cardById(id: string): Card | undefined {
  return CARDS.find((c) => c.id === id);
}

/** Chọn ngẫu nhiên n thẻ khác nhau chưa đạt tối đa. */
export function pickOffer(owned: Record<string, number>, n = 3): string[] {
  const pool = CARDS.filter((c) => (owned[c.id] ?? 0) < c.max).map((c) => c.id);
  const out: string[] = [];
  while (out.length < n && pool.length > 0) out.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
  return out;
}

/** Điểm kinh nghiệm cần để lên cấp kế tiếp. */
export function xpNeed(level: number): number {
  return 8 + 5 * (level - 1);
}
