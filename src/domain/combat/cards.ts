import type { Stats } from './stats';

export type CardRarity = 'common' | 'rare' | 'epic';
export type CardTag = 'Tấn công' | 'Phòng thủ' | 'Kỹ năng' | 'Tiện ích';

/** Thẻ nâng cấp nhặt khi lên cấp trong một lượt chơi (mất khi hết lượt). */
export interface Card {
  id: string;
  name: string;
  desc: string;
  /** Số lần tối đa được chọn trong một lượt. */
  max: number;
  rarity: CardRarity;
  tag: CardTag;
  /** Biểu tượng hiển thị trên ô nâng cấp. */
  icon: string;
  apply(s: Stats): void;
}

export const RARITY_LABEL: Record<CardRarity, string> = { common: 'Thường', rare: 'Hiếm', epic: 'Sử thi' };

export const CARDS: Card[] = [
  /* ---------- Thường: chỉ số căn bản ---------- */
  { id: 'sucmanh', name: 'Sức Mạnh', desc: '+12% sát thương.', max: 6, rarity: 'common', tag: 'Tấn công', icon: '⚔️', apply: (s) => (s.dmgMult *= 1.12) },
  { id: 'tay_nhanh', name: 'Tay Nhanh', desc: '+10% tốc độ đánh.', max: 5, rarity: 'common', tag: 'Tấn công', icon: '💨', apply: (s) => (s.atkSpeed *= 1.1) },
  { id: 'mat_dai_bang', name: 'Mắt Đại Bàng', desc: '+8% tỉ lệ chí mạng.', max: 5, rarity: 'common', tag: 'Tấn công', icon: '🦅', apply: (s) => (s.crit = Math.min(0.85, s.crit + 0.08)) },
  { id: 'the_luc', name: 'Thể Lực', desc: '+25 máu tối đa và lập tức hồi 25 máu.', max: 5, rarity: 'common', tag: 'Phòng thủ', icon: '❤️', apply: (s) => (s.maxHp += 25) },
  { id: 'giap_mem', name: 'Giáp Mềm', desc: 'Giảm thêm 6% sát thương nhận vào.', max: 5, rarity: 'common', tag: 'Phòng thủ', icon: '🛡️', apply: (s) => (s.reduce = Math.min(0.65, s.reduce + 0.06)) },
  { id: 'hoi_phuc', name: 'Hồi Phục', desc: 'Tự hồi 1 máu mỗi giây.', max: 5, rarity: 'common', tag: 'Phòng thủ', icon: '🌿', apply: (s) => (s.regen += 1) },
  { id: 'chan_gio', name: 'Chân Gió', desc: '+8% tốc độ chạy.', max: 4, rarity: 'common', tag: 'Tiện ích', icon: '👟', apply: (s) => (s.speed *= 1.08) },
  { id: 'tay_hom_chia', name: 'Tay Hòm Chìa', desc: '+20% vàng nhặt được.', max: 4, rarity: 'common', tag: 'Tiện ích', icon: '💰', apply: (s) => (s.goldMult += 0.2) },
  { id: 'nam_cham', name: 'Nam Châm Vàng', desc: 'Hút vàng và bánh chưng từ xa hơn 50%.', max: 3, rarity: 'common', tag: 'Tiện ích', icon: '🧲', apply: (s) => (s.magnet += 0.5) },

  /* ---------- Hiếm: hiệu ứng khi đánh trúng và kỹ năng ---------- */
  { id: 'loi_dieu', name: 'Lôi Điểu', desc: '15% cơ hội đòn đánh phóng sét sang 3 quái gần đó (50% sát thương).', max: 3, rarity: 'rare', tag: 'Tấn công', icon: '⚡', apply: (s) => (s.chainChance += 0.15) },
  { id: 'hoa_an', name: 'Hỏa Ấn', desc: '20% cơ hội đòn đánh thiêu đốt quái 3 giây.', max: 3, rarity: 'rare', tag: 'Tấn công', icon: '🔥', apply: (s) => (s.burnChance += 0.2) },
  { id: 'bang_tam', name: 'Băng Tâm', desc: '25% cơ hội đòn đánh làm chậm quái 35% trong 1,5 giây.', max: 3, rarity: 'rare', tag: 'Tấn công', icon: '❄️', apply: (s) => (s.chillChance += 0.25) },
  { id: 'tho_san', name: 'Thợ Săn Đầu Lĩnh', desc: '+25% sát thương lên quái tinh anh và boss.', max: 3, rarity: 'rare', tag: 'Tấn công', icon: '🎯', apply: (s) => (s.eliteDmg += 0.25) },
  { id: 'tram_yeu_quy', name: 'Trảm Yêu Quyết', desc: 'Sát thương chí mạng +40%.', max: 3, rarity: 'rare', tag: 'Tấn công', icon: '🗡️', apply: (s) => (s.critDmgMul += 0.4) },
  { id: 'van_tien', name: 'Vạn Tiễn Quy Tông', desc: '+25% sát thương vũ khí tầm xa.', max: 3, rarity: 'rare', tag: 'Tấn công', icon: '🏹', apply: (s) => (s.projMult += 0.25) },
  { id: 'cuong_huyet', name: 'Cuồng Huyết', desc: 'Khi dưới 40% máu: +30% sát thương và +20% tốc độ đánh.', max: 2, rarity: 'rare', tag: 'Tấn công', icon: '🩸', apply: (s) => (s.berserk += 1) },
  { id: 'huyet_chien', name: 'Huyết Chiến', desc: 'Một nửa số đòn đánh hồi máu bằng 6% sát thương gây ra.', max: 4, rarity: 'rare', tag: 'Phòng thủ', icon: '🍷', apply: (s) => (s.lifesteal += 0.06) },
  { id: 'kim_giap', name: 'Kim Giáp Lam Sơn', desc: '+35 máu tối đa và giảm 5% sát thương nhận vào.', max: 4, rarity: 'rare', tag: 'Phòng thủ', icon: '🥋', apply: (s) => { s.maxHp += 35; s.reduce = Math.min(0.65, s.reduce + 0.05); } },
  { id: 'noi_cong', name: 'Nội Công', desc: 'Chiêu cuối (Q) hồi nhanh hơn 15%.', max: 4, rarity: 'rare', tag: 'Kỹ năng', icon: '☯️', apply: (s) => (s.ultCdMul *= 0.85) },
  { id: 'khai_son', name: 'Khai Sơn Trận', desc: 'Kỹ năng E hồi nhanh hơn 20% và mạnh hơn 25%.', max: 4, rarity: 'rare', tag: 'Kỹ năng', icon: '⛰️', apply: (s) => { s.eCdMul *= 0.8; s.eDmgMul *= 1.25; } },
  { id: 'phong_loi_bo', name: 'Phong Lôi Bộ', desc: 'Lướt hồi nhanh hơn 28% và +5% tốc độ chạy.', max: 3, rarity: 'rare', tag: 'Kỹ năng', icon: '🌪️', apply: (s) => { s.dashCdMul *= 0.72; s.speed *= 1.05; } },
  { id: 'luot_anh', name: 'Lướt Ảnh Chấn', desc: 'Cuối mỗi cú lướt tạo sóng chấn gây 60 sát thương quanh người.', max: 3, rarity: 'rare', tag: 'Kỹ năng', icon: '🌀', apply: (s) => (s.dashStrike += 60) },
  { id: 'than_toc', name: 'Thần Tốc Chiến Trận', desc: '+10% tốc độ chạy và +10% tốc độ đánh.', max: 3, rarity: 'rare', tag: 'Tiện ích', icon: '🐎', apply: (s) => { s.speed *= 1.1; s.atkSpeed *= 1.1; } },

  /* ---------- Sử thi: thay đổi lối chơi ---------- */
  { id: 'boc_pha_hon', name: 'Bộc Phá Hồn', desc: 'Quái bạn hạ phát nổ, gây sát thương bằng 25% máu tối đa của nó cho quái xung quanh.', max: 2, rarity: 'epic', tag: 'Tấn công', icon: '💥', apply: (s) => (s.deathBlast += 0.25) },
  { id: 'cuong_chien_hon', name: 'Cuồng Chiến Hồn', desc: 'Chiêu cuối Q và kỹ năng E hồi nhanh hơn 18%.', max: 3, rarity: 'epic', tag: 'Kỹ năng', icon: '🔱', apply: (s) => { s.ultCdMul *= 0.82; s.eCdMul *= 0.82; } },
  { id: 'kim_cang_thuan', name: 'Kim Cang Thuẫn', desc: 'Cứ 8 giây nhận lá chắn bằng 12% máu tối đa.', max: 3, rarity: 'epic', tag: 'Phòng thủ', icon: '🔰', apply: (s) => (s.aegis += 0.12) },
  { id: 'long_hon_ho_the', name: 'Long Hồn Hộ Thể', desc: 'Khi bị đánh, phản lại 35% sát thương cho quái tấn công.', max: 3, rarity: 'epic', tag: 'Phòng thủ', icon: '🐉', apply: (s) => (s.thorns += 0.35) },
  { id: 'phuc_sinh', name: 'Phục Sinh Thần Phù', desc: 'Lần đầu gục ngã trong lượt này, lập tức hồi sinh với 50% máu.', max: 1, rarity: 'epic', tag: 'Phòng thủ', icon: '🪶', apply: (s) => (s.extraLife += 1) },
];

export function cardById(id: string): Card | undefined {
  return CARDS.find((c) => c.id === id);
}

/** Trọng số độ hiếm; thẻ sử thi dễ ra hơn khi lên cấp cao. */
function rarityWeight(r: CardRarity, level: number): number {
  if (r === 'common') return 60;
  if (r === 'rare') return 30;
  return 8 + Math.min(14, Math.max(0, level - 5));
}

/** Chọn ngẫu nhiên n thẻ khác nhau chưa đạt tối đa, theo trọng số độ hiếm. */
export function pickOffer(owned: Record<string, number>, n = 3, level = 1): string[] {
  const pool = CARDS.filter((c) => (owned[c.id] ?? 0) < c.max);
  const out: string[] = [];
  while (out.length < n && pool.length > 0) {
    const total = pool.reduce((t, c) => t + rarityWeight(c.rarity, level), 0);
    let roll = Math.random() * total;
    let idx = 0;
    for (; idx < pool.length - 1; idx++) {
      roll -= rarityWeight(pool[idx].rarity, level);
      if (roll <= 0) break;
    }
    out.push(pool.splice(idx, 1)[0].id);
  }
  return out;
}

/** Áp lại toàn bộ thẻ đã chọn lên bộ chỉ số mới tính (sau khi đổi trang bị giữa trận). */
export function reapplyCards(s: Stats, owned: Record<string, number>): void {
  for (const [id, n] of Object.entries(owned)) {
    const c = cardById(id);
    if (c) for (let i = 0; i < n; i++) c.apply(s);
  }
}

/** Điểm kinh nghiệm cần để lên cấp kế tiếp. */
export function xpNeed(level: number): number {
  return 8 + 5 * (level - 1);
}
