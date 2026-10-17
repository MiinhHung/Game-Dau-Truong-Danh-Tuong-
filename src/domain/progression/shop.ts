import { GEARS, MAX_WEAPON_LEVEL, WEAPONS, upgradeCost, type GearSlot } from '../data';
import { writeSave, type Save3D } from '../../infrastructure/persistence/save-repository';

export interface ShopResult {
  ok: boolean;
  msg: string;
}

const fail = (msg: string): ShopResult => ({ ok: false, msg });
const done = (save: Save3D, msg: string): ShopResult => {
  writeSave(save);
  return { ok: true, msg };
};

export function selectGeneral(save: Save3D, id: string): ShopResult {
  save.general = id;
  return done(save, 'Đã chọn tướng.');
}

export function buyWeapon(save: Save3D, id: string): ShopResult {
  const w = WEAPONS.find((x) => x.id === id);
  if (!w) return fail('Không có vũ khí này.');
  if (id in save.weapons) return fail('Con đã có vũ khí này.');
  if (save.gold < w.price) return fail('Không đủ vàng.');
  save.gold -= w.price;
  save.weapons[id] = 0;
  save.weapon = id;
  return done(save, `Đã mua ${w.name}.`);
}

export function selectWeapon(save: Save3D, id: string): ShopResult {
  if (!(id in save.weapons)) return fail('Chưa sở hữu vũ khí này.');
  save.weapon = id;
  return done(save, 'Đã đổi vũ khí.');
}

export function upgradeWeapon(save: Save3D, id: string): ShopResult {
  const w = WEAPONS.find((x) => x.id === id);
  if (!w || !(id in save.weapons)) return fail('Chưa sở hữu vũ khí này.');
  const lv = save.weapons[id];
  if (lv >= MAX_WEAPON_LEVEL) return fail('Đã đạt cấp tối đa.');
  const cost = upgradeCost(w, lv);
  if (save.gold < cost) return fail('Không đủ vàng.');
  save.gold -= cost;
  save.weapons[id] = lv + 1;
  return done(save, `${w.name} lên +${lv + 1}.`);
}

export function buyGear(save: Save3D, id: string): ShopResult {
  const g = GEARS.find((x) => x.id === id);
  if (!g) return fail('Không có trang bị này.');
  if (save.ownedGear.includes(id)) return fail('Con đã có món này.');
  if (save.gold < g.price) return fail('Không đủ vàng.');
  save.gold -= g.price;
  save.ownedGear.push(id);
  save.equipped[g.slot] = id;
  return done(save, `Đã mua và mang ${g.name}.`);
}

export function equipGear(save: Save3D, id: string): ShopResult {
  const g = GEARS.find((x) => x.id === id);
  if (!g || !save.ownedGear.includes(id)) return fail('Chưa sở hữu món này.');
  save.equipped[g.slot] = id;
  return done(save, `Đã mang ${g.name}.`);
}

export function unequipSlot(save: Save3D, slot: GearSlot): ShopResult {
  save.equipped[slot] = null;
  return done(save, 'Đã tháo trang bị.');
}
