/** Dữ liệu chế độ 3D: danh tướng, vũ khí vui nhộn, trang bị, quái vật phương Tây. */

export type HatType = 'non_la' | 'helmet' | 'turban' | 'crown' | 'bun' | 'quan' | 'none';

export interface HumanSpec {
  skin: number;
  hair: number;
  top: number;
  topDark: number;
  pants: number;
  boots: number;
  trim: number;
  hat: HatType;
  hatColor: number;
  plume?: number;
  cape?: number;
  female?: boolean;
  longHair?: boolean;
  /** Tóc dài gợn sóng buông xuống lưng, kèm khăn trùm đỉnh đầu (màu khăn). */
  wavyHair?: number;
  /** Tay áo lửng: nửa trên màu áo, cẳng tay để trần. */
  sleeve34?: boolean;
  /** Váy ngắn quanh hông (màu váy). */
  miniSkirt?: number;
  /** Giày cao gót (màu gót dùng theo màu giày). */
  heels?: boolean;
  /** Hoa tai (màu). */
  earrings?: number;
}

export interface General {
  id: string;
  name: string;
  title: string;
  passive: string;
  hp: number;
  speed: number;
  dmg: number;
  crit: number;
  atkSpeed: number;
  proj: number;
  ult: string;
  ultColor: number;
  /** Kiểu chiêu cuối, quyết định cách thi triển trong arena.ts. */
  ultKind: 'army' | 'rush' | 'dragon' | 'summon' | 'rage' | 'swamp' | 'poem' | 'bamboo' | 'con_son_stream';
  ultCd: number;
  ultDesc: string;
  look: HumanSpec;
}

export const GENERALS: General[] = [
  {
    id: 'tran_hung_dao', name: 'Trần Hưng Đạo', title: 'Hưng Đạo Đại Vương',
    passive: 'Hào khí Đông A: +15% sát thương.',
    hp: 1, speed: 1, dmg: 1.15, crit: 0.05, atkSpeed: 1, proj: 1,
    ult: 'Thiên Quân Vạn Mã', ultColor: 0xffb050, ultKind: 'army', ultCd: 22,
    ultDesc: 'Triệu hồi đạo quân hồn ma của ba lần kháng Nguyên. Hai đợt quân ào qua dải rộng theo hướng chuột (đi rồi quay lại), quét sạch quái trên đường, gây sát thương lớn và hất tung.',
    look: { skin: 0xe8b890, hair: 0x1a1210, top: 0xb3261e, topDark: 0x7a1812, pants: 0x3a2018, boots: 0x201410, trim: 0xe0b23c, hat: 'helmet', hatColor: 0xc89a3a, plume: 0xd02a1e, cape: 0x8a1812 },
  },
  {
    id: 'quang_trung', name: 'Quang Trung', title: 'Hoàng đế Nguyễn Huệ',
    passive: 'Thần tốc: +18% tốc độ chạy, +10% tốc độ đánh.',
    hp: 0.95, speed: 1.18, dmg: 1, crit: 0.05, atkSpeed: 1.1, proj: 1,
    ult: 'Hỏa Nhai Thần Tốc', ultColor: 0xffa020, ultKind: 'rush', ultCd: 20,
    ultDesc: 'Cưỡi Voi Chiến mang đại bác, bộc phát ngọn lửa đỏ rực và lao vút với tốc độ cực nhanh trong 2 giây, bạn lái hướng voi bằng chuột hoặc WASD để tông vào địch: bất tử khi lao, đè nát mọi quái trên đường và thiêu đốt chúng thêm 3 giây.',
    look: { skin: 0xdea67e, hair: 0x1a1210, top: 0xd23a1a, topDark: 0x962410, pants: 0x2a1a14, boots: 0x181010, trim: 0xf0c040, hat: 'turban', hatColor: 0xd01818 },
  },
  {
    id: 'le_loi', name: 'Lê Lợi', title: 'Bình Định Vương',
    passive: 'Lam Sơn kiên cường: +30% máu tối đa.',
    hp: 1.3, speed: 1, dmg: 1, crit: 0.05, atkSpeed: 1, proj: 1,
    ult: 'Bình Ngô Thuận Thiên', ultColor: 0xffd24a, ultKind: 'dragon', ultCd: 28,
    ultDesc: 'Vút Thuận Thiên Kiếm lên trời, gọi linh hồn Rồng Vàng giội kim quang xuống một vùng rộng: ba đợt sát thương cực lớn, mỗi quái chết vì chiêu này rơi gấp đôi vàng.',
    look: { skin: 0xe2ac84, hair: 0x201610, top: 0x2f7a4a, topDark: 0x1f5434, pants: 0x30241a, boots: 0x1c1410, trim: 0xe0b23c, hat: 'helmet', hatColor: 0xa87a30, plume: 0x2f7a4a, cape: 0x1f5434 },
  },
  {
    id: 'hai_ba_trung', name: 'Trưng Trắc', title: 'Hai Bà Trưng',
    passive: 'Hùng khí đôi chị em: +20% chí mạng, +5% sát thương.',
    hp: 0.95, speed: 1, dmg: 1.05, crit: 0.2, atkSpeed: 1, proj: 1,
    ult: 'Mê Linh Triệu Hồi', ultColor: 0xffe08a, ultKind: 'summon', ultCd: 26,
    ultDesc: 'Nổi cồng lệnh: sóng đồng làm choáng quái xung quanh, đồng thời triệu hồi Voi Trắng giậm đất đè quái và Trưng Nhị bắn cung tự động, cùng sát cánh 15 giây.',
    look: { skin: 0xf2c49a, hair: 0x38aad6, top: 0xf2a4b4, topDark: 0xd6788e, pants: 0x2a2630, boots: 0xb0202c, trim: 0xe8c04a, hat: 'none', hatColor: 0x2a7aa6, female: true, wavyHair: 0x2a78a8, sleeve34: true, miniSkirt: 0x24202a, heels: true, earrings: 0xe8c04a },
  },
  {
    id: 'ngo_quyen', name: 'Ngô Quyền', title: 'Tiền Ngô Vương',
    passive: 'Cọc Bạch Đằng: +25% sát thương vũ khí bắn xa.',
    hp: 1, speed: 1, dmg: 1, crit: 0.05, atkSpeed: 1, proj: 1.25,
    ult: 'Trận Đồ Bộc Phá', ultColor: 0x4aa8e8, ultKind: 'swamp', ultCd: 24,
    ultDesc: 'Chỉ chuột để chọn điểm rơi (tầm tối đa 20), giậm chân biến vùng đất quanh điểm đó thành đầm lầy trong 10 giây, các cây cọc nhọn trồi lên từ bùn: quái bước vào bị giảm 60% tốc độ và bị cọc đâm mỗi giây.',
    look: { skin: 0xdfaa80, hair: 0x14100e, top: 0x244f8a, topDark: 0x183560, pants: 0x1e2230, boots: 0x14141a, trim: 0xc8d0e0, hat: 'helmet', hatColor: 0x8a96a8, plume: 0x4aa8e8, cape: 0x183560 },
  },
  {
    id: 'ba_trieu', name: 'Bà Triệu', title: 'Triệu Thị Trinh',
    passive: 'Cưỡi cơn gió mạnh: +10% sát thương, +10% máu, +8% tốc độ chạy.',
    hp: 1.1, speed: 1.08, dmg: 1.1, crit: 0.05, atkSpeed: 1, proj: 1,
    ult: 'Đạp Luồng Sóng Dữ', ultColor: 0xf0d030, ultKind: 'rage', ultCd: 26,
    ultDesc: 'Khoác giáp vàng, bước vào Cuồng Nộ 10 giây: chạy nhanh hơn rất nhiều, miễn nhiễm khống chế, mỗi cú múa vũ khí tạo sóng gió lốc xoáy gây sát thương lan ra cả khu vực.',
    look: { skin: 0xf0c4a0, hair: 0x120c0a, top: 0xe0b020, topDark: 0xa87c10, pants: 0xd8a818, boots: 0x6a3a18, trim: 0xfff0b0, hat: 'bun', hatColor: 0xe0b020, female: true, longHair: true },
  },
  {
    id: 'ly_thuong_kiet', name: 'Lý Thường Kiệt', title: 'Thái úy nhà Lý',
    passive: 'Nam quốc sơn hà: +25% tốc độ đánh.',
    hp: 0.95, speed: 1, dmg: 1, crit: 0.05, atkSpeed: 1.25, proj: 1,
    ult: 'Nam Quốc Sơn Hà', ultColor: 0xc8b8ff, ultKind: 'poem', ultCd: 28,
    ultDesc: 'Lời thơ thần vang thành ba vòng sóng âm kim sắc tầm 18 quanh người: quái chịu sát thương phép lớn và Hoảng Sợ 3 giây (chạy toán loạn, không tấn công được). Boss không bị hoảng sợ.',
    look: { skin: 0xe0b088, hair: 0x181210, top: 0x3a3f4a, topDark: 0x262a32, pants: 0x20242c, boots: 0x14141a, trim: 0xe0b23c, hat: 'quan', hatColor: 0x14141a, cape: 0x262a32 },
  },
  {
    id: 'nguyen_trai', name: 'Nguyễn Trãi', title: 'Ức Trai Tiên Sinh',
    passive: 'Mưu sâu kế hiểm: +12% chí mạng, +5% tốc độ đánh.',
    hp: 0.92, speed: 1.05, dmg: 1, crit: 0.17, atkSpeed: 1.05, proj: 1,
    ult: 'Suối Côn Sơn Bào Mòn', ultColor: 0x2dd4bf, ultKind: 'con_son_stream', ultCd: 24,
    ultDesc: 'Nguyễn Trãi vung quạt trúc niệm thơ, từ dưới chân xuất hiện một dòng suối ngọc xanh biếc Côn Sơn cuộn trào về phía trước trong 4.5 giây: nước cuộn sóng biếc, bọt trắng sương mờ; liên tục gây sát thương, làm chậm 60% và đẩy lùi mạnh mẽ mọi quái vật theo dòng nước.',
    look: { skin: 0xe8c9a4, hair: 0x1a1410, top: 0x2a4a8a, topDark: 0x1a3060, pants: 0x2a2a3a, boots: 0x181418, trim: 0xe0c060, hat: 'quan', hatColor: 0x15151f },
  },
  {
    id: 'phu_dong', name: 'Phù Đổng Thiên Vương', title: 'Thánh Gióng',
    passive: 'Thần lực: +20% sát thương, +20% máu tối đa, chạy chậm hơn 6%.',
    hp: 1.2, speed: 0.94, dmg: 1.2, crit: 0.05, atkSpeed: 0.95, proj: 1,
    ult: 'Nhổ Tre Đằng Ngà', ultColor: 0x8ac84a, ultKind: 'bamboo', ultCd: 26,
    ultDesc: 'Nhổ bụi tre đằng ngà quật ba vòng quanh người (tầm 11, hất văng mạnh) rồi giáng một đòn cuối rộng hơn làm choáng quái 1,5 giây.',
    look: { skin: 0xd9a070, hair: 0x120c0a, top: 0x2a2a30, topDark: 0x4a4a54, pants: 0x2a2a30, boots: 0x1a1a1e, trim: 0xc0c0d0, hat: 'helmet', hatColor: 0x8a8a98, plume: 0xd02a1e, cape: 0x3a1a1a },
  },
];

/** Trưng Nhị, người em được Trưng Trắc triệu hồi. */
export const TRUNG_NHI_LOOK: HumanSpec = {
  skin: 0xf0c4a0, hair: 0x120c0a, top: 0xd870a8, topDark: 0x9a3a78, pants: 0xe8b0d0, boots: 0x6a3a28,
  trim: 0xf0d080, hat: 'bun', hatColor: 0xd870a8, female: true, longHair: true,
};

export type WeaponKind = 'slam' | 'spin' | 'boomerang' | 'pierce' | 'bonk';

export interface Weapon {
  id: string;
  name: string;
  desc: string;
  price: number;
  tier: number;
  kind: WeaponKind;
  dmg: number;
  cd: number;
  range: number;
  radius: number;
  knock: number;
}

export const WEAPONS: Weapon[] = [
  { id: 'dep_lao', name: 'Dép Lào Huyền Thoại', desc: 'Tầm xa. Phóng đôi dép lào bay vút ra rồi quay trở về tay như boomerang, xuyên qua mọi quái trên đường đi.', price: 0, tier: 1, kind: 'boomerang', dmg: 26, cd: 0.55, range: 13, radius: 1, knock: 3 },
  { id: 'ghe_nhua', name: 'Ghế Nhựa Quốc Dân', desc: 'Cận chiến, đánh diện rộng. Mỗi đòn đập ghế xuống đất, gây choáng cả đám quái phía trước khoảng 1 giây.', price: 0, tier: 1, kind: 'slam', dmg: 40, cd: 0.85, range: 3.9, radius: 3.9, knock: 5 },
  { id: 'non_la', name: 'Nón Lá Phi Tiêu', desc: 'Tầm xa. Phi nón lá xoay tít xuyên qua tối đa 3 quái trên đường bay.', price: 300, tier: 1, kind: 'pierce', dmg: 24, cd: 0.38, range: 20, radius: 0.9, knock: 2 },
  { id: 'choi_chit', name: 'Chổi Chít', desc: 'Cận chiến, quét một vòng đánh mọi quái xung quanh, đẩy lùi mạnh và làm chậm 2 giây.', price: 450, tier: 2, kind: 'spin', dmg: 32, cd: 0.9, range: 5.8, radius: 5.8, knock: 11 },
  { id: 'muoi_canh', name: 'Muôi Canh', desc: 'Cận chiến, sát thương chí mạng. Cốc Đầu: 20% xác suất gây chí mạng, sát thương gấp 2,5 lần đòn thường.', price: 550, tier: 2, kind: 'bonk', dmg: 62, cd: 0.6, range: 3.3, radius: 1.8, knock: 4 },
  { id: 'phong_lon', name: 'Phóng Lợn', desc: 'Tầm vừa đến xa. Phóng chú lợn bay thẳng một đường, đâm xuyên mọi kẻ địch. Trúng đòn là chảy máu: mất máu mỗi giây theo % máu tối đa, cộng dồn, kéo dài tối đa 15 giây.', price: 800, tier: 3, kind: 'pierce', dmg: 46, cd: 1.0, range: 15, radius: 1.1, knock: 4 },
  { id: 'dieu_cay', name: 'Điếu Cày Long Trượng', desc: 'Tầm xa. Rít một hơi, phả ra cục khói gây sát thương. Say Khói: 15% xác suất làm chậm quái 30% trong 2 giây và gây choáng.', price: 750, tier: 3, kind: 'pierce', dmg: 34, cd: 0.5, range: 17, radius: 1.1, knock: 1 },
];

export const MAX_WEAPON_LEVEL = 5;

/** Kỹ năng phụ (phím E) của từng tướng, hồi chiêu ngắn hơn chiêu cuối Q. */
export type EAim = 'self' | 'line' | 'cone' | 'circle';

export interface ESkill {
  name: string;
  desc: string;
  cd: number;
  /** Cách nhắm: tự thi triển, đường thẳng, hình quạt, hoặc điểm rơi hình tròn. */
  aim: EAim;
  /** Tầm thi triển (đường thẳng, quạt: chiều dài; vòng tròn: tầm tối đa tới điểm chọn). */
  range: number;
  /** Bề ngang đường thẳng, hoặc bán kính vùng nổ của kỹ năng vòng tròn. */
  size?: number;
  /** Nửa góc mở của hình quạt (radian). */
  half?: number;
  /** Giữ chuột để tụ lực tối đa bao nhiêu giây; chiều dài cộng thêm khi đầy lực. */
  charge?: { sec: number; extra: number };
}

export const ESKILLS: Record<string, ESkill> = {
  tran_hung_dao: { name: 'Hỏa Thuyền Phá Trận', desc: 'Triệu hồi hạm đội chiến thuyền lửa hình mũi tên xé toạc màn sương và sóng nước Bạch Đằng, để lại đường lửa thiêu đốt và chuỗi nổ tung áp đảo quân địch.', cd: 12, aim: 'line', range: 24, size: 6.5 },
  quang_trung: { name: 'Thần Tốc Hỏa Pháo', desc: 'Bộc phát khí thế thần tốc đại phá quân Thanh, phóng xung lực hỏa long pháo xé toạc không gian với tốc độ cực đại, xuyên thủng và thiêu đốt đội hình địch trong biển lửa bão táp.', cd: 10, aim: 'line', range: 20, size: 6.0 },
  le_loi: { name: 'Kim Quang Hộ Thể', desc: 'Ngưng tụ Hoàng Long Lam Sơn và long khí hoàng đế, tạo hộ thể hoàng kim bán kính 3.5m tồn tại 6 giây: giảm 50% sát thương, tạo lá chắn 35% máu tối đa, hất văng và làm choáng quái xung quanh.', cd: 16, aim: 'self', range: 0 },
  hai_ba_trung: { name: 'Cồng Mê Linh', desc: 'Dấu cộng xanh lá xoay quanh người, hồi 30% máu tối đa cho bạn và đồng đội trong tầm 10.', cd: 18, aim: 'self', range: 0 },
  ba_trieu: { name: 'Cuồng Phong Chưởng', desc: 'Tụ khí ngàn dặm, tung bão tố chưởng phong hình cánh cung xé gió. Giữ chuột để tụ lực: tầm xa lên tới 26m, thổi bay và đẩy lùi kẻ địch với uy lực kinh thiên động địa.', cd: 9, aim: 'cone', range: 15, half: 0.65, charge: { sec: 1.2, extra: 11 } },
  ngo_quyen: { name: 'Bạch Đằng Thủy Trận', desc: 'Kêu gọi thủy triều sông Bạch Đằng: Làn đại hồng thủy cuộn trào cùng Thủy Long thần thoại và hàng cọc gỗ bọc sắt nhô lên từ lòng sông, hất tung và nghiền nát quân địch.', cd: 11, aim: 'line', range: 22, size: 5.5 },
  nguyen_trai: { name: 'Quân Trung Từ Mệnh', desc: 'Phóng ba luồng chữ khí xuyên qua mọi kẻ địch trên đường bay. Trúng đủ 3 lần sẽ rơi vào trạng thái Dao Động, gây ít sát thương hơn 40% trong 6 giây.', cd: 10, aim: 'line', range: 18, size: 2.4 },
  phu_dong: { name: 'Thần Tre Giáng Thế', desc: 'Cây tre khổng lồ từ trên cao giáng xuống điểm chỉ định (tầm 14), gây sát thương diện rộng và làm choáng 1,6 giây.', cd: 12, aim: 'circle', range: 14, size: 5 },
  ly_thuong_kiet: { name: 'Xây Thành Thăng Long', desc: 'Dựng thành lũy tại điểm chỉ định (tầm 12) trong 5 giây. Đồng minh bên trong hồi máu theo thời gian, nhận ít hơn 40% sát thương, và kẻ địch đánh vào sẽ bị phản lại một phần sát thương.', cd: 16, aim: 'circle', range: 12, size: 4.5 },
};

/** Kỹ năng chiêu cuối (phím Q) có tầm định hướng cần vòng/dải chỉ thị kiểu MOBA. */
export const Q_SKILLS: Record<string, ESkill> = {
  con_son_stream: { name: 'Suối Côn Sơn Bào Mòn', desc: 'Dòng suối ngọc Côn Sơn cuộn sóng đẩy lùi và làm chậm địch', cd: 24, aim: 'line', range: 22, size: 6.5 },
  swamp: { name: 'Trận Đồ Bộc Phá', desc: 'Vùng đầm lầy cọc nhọn Bạch Đằng làm chậm và gây sát thương', cd: 24, aim: 'circle', range: 20, size: 7.5 },
  army: { name: 'Thiên Quân Vạn Mã', desc: 'Đạo quân hồn ma ba lần kháng Nguyên quét sạch hàng ngũ địch', cd: 22, aim: 'line', range: 46, size: 7 },
};

/** Cấp +5: vũ khí tiến hóa, đổi sang ánh vàng và có thêm sức mạnh riêng. */
export const EVOLVE: Record<string, string> = {
  dep_lao: 'Ném ba chiếc dép thay vì hai.',
  ghe_nhua: 'Vùng đập rộng hơn 25%.',
  non_la: 'Phi hai chiếc nón một lần, mỗi chiếc xuyên thêm 2 quái.',
  choi_chit: 'Vùng quét rộng hơn 20% và quét thêm một vòng thứ hai (60% sát thương).',
  muoi_canh: 'Đánh nhanh hơn 20%.',
  phong_lon: 'Phóng hai chú lợn một lần.',
  dieu_cay: 'Phả hai cục khói, mỗi cục xuyên được 3 quái.',
};

/** Combo: một tướng cầm đúng vũ khí hợp vía sẽ mạnh thêm. */
export interface Combo {
  id: string;
  general: string;
  weapon: string;
  name: string;
  desc: string;
}

export const COMBOS: Combo[] = [
  { id: 'khoi_me_linh', general: 'hai_ba_trung', weapon: 'dieu_cay', name: 'Khói Mê Linh', desc: 'Say Khói lên 35% và choáng 1,8 giây.' },
  { id: 'dep_lua', general: 'quang_trung', weapon: 'dep_lao', name: 'Dép Lửa Tây Sơn', desc: 'Dép trúng quái làm quái bốc cháy.' },
  { id: 'non_hung_dao', general: 'tran_hung_dao', weapon: 'non_la', name: 'Nón Hưng Đạo', desc: 'Nón lá xuyên được 5 quái.' },
  { id: 'coc_lam_son', general: 'le_loi', weapon: 'muoi_canh', name: 'Cốc Lam Sơn', desc: 'Cốc Đầu chí mạng 30%, gấp 3 lần.' },
  { id: 'quet_giap_vang', general: 'ba_trieu', weapon: 'choi_chit', name: 'Quét Giáp Vàng', desc: 'Vùng quét rộng hơn 15%, làm chậm tới 65%.' },
  { id: 'lon_bach_dang', general: 'ngo_quyen', weapon: 'phong_lon', name: 'Lợn Bạch Đằng', desc: 'Chảy máu cộng dồn tới 9% máu tối đa mỗi giây.' },
  { id: 'ghe_nam_quoc', general: 'ly_thuong_kiet', weapon: 'ghe_nhua', name: 'Ghế Nam Quốc', desc: 'Đập ghế choáng 1,6 giây.' },
];

export function comboFor(generalId: string, weaponId: string): Combo | undefined {
  return COMBOS.find((c) => c.general === generalId && c.weapon === weaponId);
}

export function upgradeCost(w: Weapon, level: number): number {
  return Math.round(80 * w.tier * Math.pow(level + 1, 1.6));
}

export type GearSlot = 'head' | 'body' | 'feet' | 'charm';

export interface Gear {
  id: string;
  slot: GearSlot;
  name: string;
  desc: string;
  price: number;
  hp?: number;
  reduce?: number;
  speed?: number;
  gold?: number;
  dmg?: number;
  crit?: number;
}

export const SLOT_LABEL: Record<GearSlot, string> = { head: 'Mũ', body: 'Giáp', feet: 'Giày', charm: 'Bùa' };

export const GEARS: Gear[] = [
  { id: 'non_la', slot: 'head', name: 'Nón Lá', desc: '+20 máu tối đa.', price: 100, hp: 20 },
  { id: 'mu_dong', slot: 'head', name: 'Mũ Giáp Đồng', desc: '+55 máu tối đa.', price: 380, hp: 55 },
  { id: 'mu_rong', slot: 'head', name: 'Mũ Rồng Vàng', desc: '+120 máu tối đa.', price: 1150, hp: 120 },
  { id: 'ao_tu_than', slot: 'body', name: 'Áo Tứ Thân', desc: 'Giảm 10% sát thương nhận vào.', price: 150, reduce: 0.1 },
  { id: 'giap_tre', slot: 'body', name: 'Giáp Tre Ép', desc: 'Giảm 20% sát thương nhận vào.', price: 520, reduce: 0.2 },
  { id: 'giap_long', slot: 'body', name: 'Giáp Long Lân', desc: 'Giảm 32% sát thương nhận vào.', price: 1500, reduce: 0.32 },
  { id: 'dep_cao_su', slot: 'feet', name: 'Dép Cao Su', desc: '+8% tốc độ chạy.', price: 120, speed: 0.08 },
  { id: 'giay_gio', slot: 'feet', name: 'Giày Gió Tre', desc: '+16% tốc độ chạy.', price: 450, speed: 0.16 },
  { id: 'hai_than_toc', slot: 'feet', name: 'Hài Thần Tốc', desc: '+26% tốc độ chạy.', price: 1300, speed: 0.26 },
  { id: 'bua_may_man', slot: 'charm', name: 'Bùa May Mắn', desc: '+15% vàng nhặt được.', price: 220, gold: 0.15 },
  { id: 'trong_dong_mini', slot: 'charm', name: 'Trống Đồng Mini', desc: '+15% sát thương.', price: 650, dmg: 0.15 },
  { id: 'ngoc_rong', slot: 'charm', name: 'Ngọc Rồng', desc: '+15% sát thương, +10% chí mạng, +10% vàng.', price: 1700, dmg: 0.15, crit: 0.1, gold: 0.1 },
];

export type MonsterType =
  | 'zombie' | 'skeleton' | 'werewolf' | 'vampire' | 'ghost' | 'franken' | 'dragon'
  | 'lich' | 'goblin' | 'scarecrow' | 'mummy' | 'banshee' | 'bat' | 'witch' | 'imp' | 'golem' | 'yeti' | 'snowman' | 'ice_wolf' | 'hellhound' | 'demon' | 'lava_golem' | 'colossus';

export interface MonsterDef {
  id: MonsterType;
  name: string;
  hp: number;
  atk: number;
  speed: number;
  radius: number;
  gold: [number, number];
  range: number;
  cd: number;
  boss?: boolean;
  /** Kiểu hành vi và hoạt ảnh dùng chung với một loại quái gốc (mặc định là chính nó). */
  ai?: MonsterType;
  /** Loại đạn của quái bắn xa. */
  shot?: 'bone' | 'fireball' | 'orb' | 'orbg' | 'snow';
  /** Màu tia vỡ khi quái chết. */
  color?: number;
}

export const MONSTERS: Record<MonsterType, MonsterDef> = {
  zombie: { id: 'zombie', name: 'Xác Sống', hp: 55, atk: 9, speed: 2.3, radius: 0.55, gold: [4, 7], range: 1.5, cd: 1.1 },
  skeleton: { id: 'skeleton', name: 'Bộ Xương', hp: 38, atk: 8, speed: 2.8, radius: 0.5, gold: [6, 9], range: 13, cd: 1.7 },
  werewolf: { id: 'werewolf', name: 'Người Sói', hp: 85, atk: 13, speed: 3.9, radius: 0.7, gold: [9, 13], range: 1.7, cd: 1.0 },
  vampire: { id: 'vampire', name: 'Ma Cà Rồng', hp: 100, atk: 12, speed: 3.2, radius: 0.55, gold: [12, 16], range: 1.5, cd: 1.0 },
  ghost: { id: 'ghost', name: 'Bóng Ma', hp: 60, atk: 9, speed: 3.0, radius: 0.55, gold: [8, 11], range: 1.5, cd: 1.2 },
  franken: { id: 'franken', name: 'Quái Nhân Frankenstein', hp: 280, atk: 22, speed: 1.9, radius: 0.95, gold: [35, 45], range: 2.2, cd: 1.6 },
  dragon: { id: 'dragon', name: 'Rồng Lửa Phương Tây', hp: 1500, atk: 26, speed: 2.6, radius: 2.0, gold: [220, 260], range: 3.4, cd: 1.8, boss: true },
  goblin: { id: 'goblin', name: 'Yêu Tinh Goblin', hp: 30, atk: 6, speed: 4.3, radius: 0.42, gold: [4, 6], range: 1.3, cd: 0.9, ai: 'zombie', color: 0x6aa84a },
  scarecrow: { id: 'scarecrow', name: 'Bù Nhìn Ma', hp: 75, atk: 10, speed: 2.0, radius: 0.6, gold: [6, 9], range: 1.6, cd: 1.2, ai: 'zombie', color: 0xd8b850 },
  mummy: { id: 'mummy', name: 'Xác Ướp', hp: 130, atk: 15, speed: 1.7, radius: 0.65, gold: [9, 13], range: 1.6, cd: 1.3, ai: 'zombie', color: 0xd8cca0 },
  banshee: { id: 'banshee', name: 'Nữ Quỷ Gào Thét', hp: 55, atk: 10, speed: 2.6, radius: 0.55, gold: [10, 14], range: 12, cd: 1.9, ai: 'skeleton', shot: 'orb', color: 0xc090ff },
  bat: { id: 'bat', name: 'Dơi Quỷ', hp: 22, atk: 5, speed: 5.2, radius: 0.4, gold: [3, 5], range: 1.2, cd: 0.8, ai: 'ghost', color: 0x6a4a7a },
  witch: { id: 'witch', name: 'Phù Thủy', hp: 65, atk: 11, speed: 2.4, radius: 0.55, gold: [12, 16], range: 13, cd: 1.9, ai: 'skeleton', shot: 'orbg', color: 0xa0ff40 },
  imp: { id: 'imp', name: 'Tiểu Quỷ', hp: 40, atk: 9, speed: 4.4, radius: 0.45, gold: [8, 12], range: 1.4, cd: 0.9, ai: 'werewolf', color: 0xff5a30 },
  golem: { id: 'golem', name: 'Người Đá', hp: 360, atk: 20, speed: 1.6, radius: 1.1, gold: [30, 40], range: 2.2, cd: 1.7, ai: 'franken', color: 0x9a9aa2 },
  yeti: { id: 'yeti', name: 'Người Tuyết Khổng Lồ', hp: 320, atk: 21, speed: 2.0, radius: 1.0, gold: [32, 42], range: 2.2, cd: 1.5, ai: 'franken', color: 0xe8f0f8 },
  snowman: { id: 'snowman', name: 'Người Tuyết Ma', hp: 52, atk: 9, speed: 2.2, radius: 0.55, gold: [9, 12], range: 12, cd: 1.8, ai: 'skeleton', shot: 'snow', color: 0xffffff },
  ice_wolf: { id: 'ice_wolf', name: 'Sói Băng', hp: 78, atk: 12, speed: 4.1, radius: 0.7, gold: [10, 14], range: 1.7, cd: 1.0, ai: 'werewolf', color: 0xbfe0ff },
  hellhound: { id: 'hellhound', name: 'Chó Địa Ngục', hp: 95, atk: 14, speed: 4.2, radius: 0.75, gold: [12, 17], range: 1.7, cd: 1.0, ai: 'werewolf', color: 0xff7a20 },
  demon: { id: 'demon', name: 'Quỷ Lửa', hp: 110, atk: 15, speed: 2.7, radius: 0.7, gold: [18, 24], range: 13, cd: 1.6, ai: 'skeleton', shot: 'fireball', color: 0xff4a20 },
  lava_golem: { id: 'lava_golem', name: 'Người Dung Nham', hp: 420, atk: 24, speed: 1.7, radius: 1.2, gold: [38, 48], range: 2.3, cd: 1.6, ai: 'franken', color: 0xff6a20 },
  lich: { id: 'lich', name: 'Vua Xương Lich', hp: 1900, atk: 24, speed: 2.2, radius: 1.4, gold: [240, 280], range: 16, cd: 1.9, boss: true, color: 0xb060ff },
  colossus: { id: 'colossus', name: 'Titan Đá Khổng Lồ', hp: 2600, atk: 30, speed: 1.9, radius: 2.6, gold: [260, 300], range: 3.6, cd: 1.9, boss: true, ai: 'franken', color: 0xaaaabb },
};

export interface WaveSpawn {
  type: MonsterType;
  count: number;
}

export interface RosterEntry {
  type: MonsterType;
  /** Tỉ lệ trong tổng số quái của màn. */
  share: number;
  /** Màn tối thiểu để loại quái này xuất hiện. */
  from: number;
}

export interface WaveBias {
  /** Danh sách quái chính của bản đồ hiện tại. */
  roster?: RosterEntry[];
  /** Loại quái lấp phần còn lại. */
  filler?: MonsterType;
}

const DEFAULT_ROSTER: RosterEntry[] = [
  { type: 'franken', share: 0.1, from: 6 },
  { type: 'vampire', share: 0.16, from: 5 },
  { type: 'ghost', share: 0.14, from: 4 },
  { type: 'werewolf', share: 0.18, from: 3 },
  { type: 'skeleton', share: 0.22, from: 2 },
];

/** Boss xoay vòng: màn 5 Rồng Lửa, 10 Titan Đá, 15 Vua Xương, rồi lặp lại. */
export const BOSS_CYCLE: MonsterType[] = ['dragon', 'colossus', 'lich'];

export function bossTypeForWave(n: number): MonsterType {
  return BOSS_CYCLE[(Math.floor(n / 5) - 1) % BOSS_CYCLE.length];
}

/**
 * Thành phần quái của từng màn. Bản đồ quyết định danh sách quái chính; mỗi màn bỏ bớt một loại phụ nên hai màn
 * cùng bản đồ vẫn khác nhau. Cứ 5 màn có boss xoay vòng Rồng Lửa, Titan Đá, Vua Xương.
 */
export function waveComposition(n: number, bias: WaveBias = {}): WaveSpawn[] {
  const total = Math.round(8 + n * 2.5);
  const out: WaveSpawn[] = [];
  let left = total;
  let active = (bias.roster ?? DEFAULT_ROSTER).filter((e) => n >= e.from);
  if (active.length >= 4) {
    const skip = (n * 5 + 1) % active.length;
    if (active[skip].share < 0.3) active = active.filter((_, i) => i !== skip);
  }
  for (const e of active) {
    const c = Math.min(left, Math.max(1, Math.round(total * e.share * (1 + Math.min(0.5, n * 0.02)))));
    left -= c;
    if (c > 0) out.push({ type: e.type, count: c });
  }
  if (left > 0) {
    const f = bias.filler ?? 'zombie';
    const same = out.find((o) => o.type === f);
    if (same) same.count += left;
    else out.push({ type: f, count: left });
  }
  if (n % 5 === 0) out.push({ type: bossTypeForWave(n), count: 1 });
  return out;
}

/**
 * Sức mạnh quái theo màn và số người chơi (dùng chung cho game và tools/balance.mjs).
 * Máu và sát thương có thêm thành phần bậc hai: sức mạnh người chơi tăng theo cấp số nhân nhờ thẻ cộng dồn,
 * nếu quái chỉ tăng tuyến tính thì từ màn 10 trở đi quái chết quá nhanh và gần như không gây nguy hiểm.
 */
export function monsterScaling(wave: number, players = 1): { hp: number; dmg: number; speed: number } {
  const k = Math.max(0, wave - 1);
  return {
    hp: (1 + 0.18 * k + 0.009 * k * k) * (1 + 0.6 * (players - 1)),
    dmg: 1 + 0.1 * k + 0.0035 * k * k,
    speed: 1 + Math.min(0.3, 0.012 * k),
  };
}

/** Nhịp ra quái: số quái tối đa cùng lúc, số con mỗi lượt và khoảng cách giữa các lượt. */
export function spawnPacing(wave: number, players = 1): { maxAlive: number; perTick: number; interval: number } {
  return {
    maxAlive: 30 + Math.min(14, wave) + 6 * (players - 1),
    perTick: wave >= 4 || players > 2 ? 2 : 1,
    interval: Math.max(0.35, 0.55 - 0.01 * wave),
  };
}
