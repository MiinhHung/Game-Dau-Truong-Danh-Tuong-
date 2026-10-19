import { GEARS, GENERALS, WEAPONS, type General, type Gear, type GearSlot, type Weapon } from '../data';

/** Phần dữ liệu cần để tính chỉ số: dùng được cho bản lưu lẫn cấu hình gửi qua mạng. */
export interface StatSource {
  general: string;
  weapon: string;
  weapons: Record<string, number>;
  equipped: Record<GearSlot, string | null>;
}

export interface Stats {
  general: General;
  weapon: Weapon;
  weaponLevel: number;
  maxHp: number;
  speed: number;
  dmgMult: number;
  projMult: number;
  crit: number;
  atkSpeed: number;
  reduce: number;
  goldMult: number;
  /** Hệ số thời gian hồi chiêu Q (thẻ Nội Công làm nhỏ đi). */
  ultCdMul: number;
  /** Hệ số thời gian hồi chiêu E. */
  eCdMul: number;
  /** Hệ số sát thương kỹ năng E. */
  eDmgMul: number;
  /** Hệ số hồi chiêu Lướt. */
  dashCdMul: number;
  /** Hút máu (tỉ lệ 0..1). */
  lifesteal: number;
  /** Sát thương chí mạng (mặc định 1.5). */
  critDmgMul: number;
  /** Tỉ lệ phản đòn khi bị đánh. */
  thorns: number;
  /** Máu tự hồi mỗi giây (thẻ Hồi Phục). */
  regen: number;
  /** Hệ số tầm hút vàng và bánh chưng (thẻ Nam Châm Vàng). */
  magnet: number;
  /** Xác suất đòn đánh phóng sét sang quái gần (Lôi Điểu). */
  chainChance: number;
  /** Xác suất đòn đánh thiêu đốt (Hỏa Ấn). */
  burnChance: number;
  /** Xác suất đòn đánh làm chậm (Băng Tâm). */
  chillChance: number;
  /** Sát thương cộng thêm lên quái tinh anh và boss (Thợ Săn Đầu Lĩnh). */
  eliteDmg: number;
  /** Số cấp Cuồng Huyết: mạnh hơn khi máu thấp. */
  berserk: number;
  /** Sát thương sóng chấn cuối mỗi cú lướt (Lướt Ảnh Chấn). */
  dashStrike: number;
  /** Tỉ lệ máu tối đa của quái bị hạ dùng làm sát thương nổ (Bộc Phá Hồn). */
  deathBlast: number;
  /** Lá chắn định kỳ theo tỉ lệ máu tối đa (Kim Cang Thuẫn). */
  aegis: number;
  /** Số lần hồi sinh trong lượt (Phục Sinh Thần Phù). */
  extraLife: number;
}

export function gearOf(src: StatSource, slot: GearSlot): Gear | null {
  const id = src.equipped[slot];
  return id ? (GEARS.find((g) => g.id === id) ?? null) : null;
}

export function computeStats(src: StatSource): Stats {
  const general = GENERALS.find((g) => g.id === src.general) ?? GENERALS[0];
  const weapon = WEAPONS.find((w) => w.id === src.weapon) ?? WEAPONS[0];
  const weaponLevel = Math.max(0, Math.min(5, src.weapons[weapon.id] ?? 0));
  const head = gearOf(src, 'head');
  const body = gearOf(src, 'body');
  const feet = gearOf(src, 'feet');
  const charm = gearOf(src, 'charm');
  return {
    general,
    weapon,
    weaponLevel,
    maxHp: Math.round(100 * general.hp + (head?.hp ?? 0)),
    speed: 6.2 * general.speed * (1 + (feet?.speed ?? 0)),
    dmgMult: general.dmg * (1 + 0.15 * weaponLevel) * (1 + (charm?.dmg ?? 0)),
    projMult: general.proj,
    crit: Math.min(0.75, general.crit + (charm?.crit ?? 0)),
    atkSpeed: general.atkSpeed,
    reduce: Math.min(0.6, body?.reduce ?? 0),
    goldMult: 1 + (charm?.gold ?? 0),
    ultCdMul: 1,
    eCdMul: 1,
    eDmgMul: 1,
    dashCdMul: 1,
    lifesteal: 0,
    critDmgMul: 1.5,
    thorns: 0,
    regen: 0,
    magnet: 1,
    chainChance: 0,
    burnChance: 0,
    chillChance: 0,
    eliteDmg: 0,
    berserk: 0,
    dashStrike: 0,
    deathBlast: 0,
    aegis: 0,
    extraLife: 0,
  };
}
