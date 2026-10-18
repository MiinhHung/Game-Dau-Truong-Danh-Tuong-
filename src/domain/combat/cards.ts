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
  // 1. Chỉ số căn bản
  { id: 'sucmanh', name: 'Sức Mạnh', desc: '+14% sát thương đòn đánh.', max: 6, apply: (s) => (s.dmgMult *= 1.14) },
  { id: 'tay_nhanh', name: 'Tay Nhanh', desc: '+12% tốc độ đánh.', max: 5, apply: (s) => (s.atkSpeed *= 1.12) },
  { id: 'chan_gio', name: 'Chân Gió', desc: '+10% tốc độ chạy.', max: 5, apply: (s) => (s.speed *= 1.1) },
  { id: 'the_luc', name: 'Thể Lực', desc: '+25 máu tối đa và lập tức hồi 25 máu.', max: 5, apply: (s) => (s.maxHp += 25) },
  { id: 'mat_dai_bang', name: 'Mắt Đại Bàng', desc: '+10% tỉ lệ chí mạng.', max: 5, apply: (s) => (s.crit = Math.min(0.85, s.crit + 0.1)) },
  { id: 'tay_hom_chia', name: 'Tay Hòm Chìa', desc: '+20% vàng nhặt được.', max: 4, apply: (s) => (s.goldMult += 0.2) },
  { id: 'giap_mem', name: 'Giáp Mềm', desc: 'Giảm thêm 8% sát thương nhận vào.', max: 5, apply: (s) => (s.reduce = Math.min(0.65, s.reduce + 0.08)) },
  { id: 'noi_cong', name: 'Nội Công', desc: 'Chiêu cuối (Q) hồi nhanh hơn 15%.', max: 5, apply: (s) => (s.ultCdMul *= 0.85) },
  { id: 'hoi_phuc', name: 'Hồi Phục', desc: 'Tự hồi +0.8 máu mỗi giây.', max: 5, apply: (s) => (s.regen += 0.8) },

  // 2. Nhóm nâng cấp kỹ năng E, Lướt, Q chuyên sâu
  { id: 'khai_son', name: 'Khai Sơn Trận (Kỹ Năng E)', desc: 'Kỹ năng E hồi nhanh hơn 20% và tăng 25% uy lực sát thương.', max: 4, apply: (s) => { s.eCdMul = (s.eCdMul ?? 1) * 0.8; s.eDmgMul = (s.eDmgMul ?? 1) * 1.25; } },
  { id: 'phong_loi_bo', name: 'Phong Lôi Bộ (Lướt)', desc: 'Lướt hồi nhanh hơn 28%, tăng 15% tốc chạy trong 1.5 giây sau khi lướt.', max: 3, apply: (s) => { s.dashCdMul = (s.dashCdMul ?? 1) * 0.72; s.speed *= 1.05; } },
  { id: 'cuong_chien_hon', name: 'Cuồng Chiến Hồn (Q & E)', desc: 'Cả chiêu cuối Q và kỹ năng E hồi nhanh hơn 15%.', max: 4, apply: (s) => { s.ultCdMul *= 0.85; s.eCdMul = (s.eCdMul ?? 1) * 0.85; } },
  { id: 'huyet_chien', name: 'Huyết Chiến (Hút Máu)', desc: 'Đòn đánh hồi máu bằng 6% lượng sát thương gây ra.', max: 4, apply: (s) => { s.lifesteal = (s.lifesteal ?? 0) + 0.06; } },
  { id: 'tram_yeu_quy', name: 'Trảm Yêu Quyết (Chí Mạng)', desc: 'Sát thương khi nổ chí mạng tăng từ 150% lên 190%.', max: 3, apply: (s) => { s.critDmgMul = (s.critDmgMul ?? 1.5) + 0.4; } },
  { id: 'long_hon_ho_the', name: 'Long Hồn (Phản Đòn)', desc: 'Khi nhận sát thương, phản lại 35% sát thương ra xung quanh.', max: 3, apply: (s) => { s.thorns = (s.thorns ?? 0) + 0.35; } },
  { id: 'van_tien', name: 'Vạn Tiễn Quy Tông', desc: 'Vũ khí tầm xa bắn thêm +1 tia đạn.', max: 2, apply: (s) => { s.projMult += 1; } },
  { id: 'kim_giap', name: 'Kim Giáp Lam Sơn', desc: '+35 máu tối đa và giảm 5% sát thương nhận vào.', max: 4, apply: (s) => { s.maxHp += 35; s.reduce = Math.min(0.65, s.reduce + 0.05); } },
  { id: 'than_toc', name: 'Thần Tốc Chiến Trận', desc: '+12% tốc độ chạy và +12% tốc độ đánh.', max: 4, apply: (s) => { s.speed *= 1.12; s.atkSpeed *= 1.12; } },
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
