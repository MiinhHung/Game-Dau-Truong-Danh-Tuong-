import * as THREE from 'three';
import type { MonsterDef } from '../domain/data';
import type { MonsterRig, Rig } from '../rendering/models/models';
import type { Loadout, PlayerInfo } from '../infrastructure/network/net-client';
import type { Stats } from '../domain/combat/stats';

export type Role = 'solo' | 'host' | 'client';

/** Một thẻ nâng cấp đang được mời chọn, kèm thông tin hiển thị. */
export interface OfferItem {
  name: string;
  desc: string;
  level: string;
  rarity: 'common' | 'rare' | 'epic';
  icon: string;
  tag: string;
  /** Số lần đã chọn thẻ này trong lượt. */
  owned: number;
  max: number;
}

export interface Hud {
  setHp(hp: number, max: number): void;
  setWave(text: string): void;
  setGold(run: number, total: number): void;
  setKills(n: number): void;
  setCooldowns(atk: number, dash: number, ult: number, e: number, remDash?: number, remUlt?: number, remE?: number): void;
  setLoadout(weapon: string, ult: string, e: string): void;
  /** Cấp và tiến độ kinh nghiệm (0..1) của bạn. */
  setXp(level: number, ratio: number): void;
  /** Dòng các mối nguy của chế độ vô tận; rỗng thì ẩn. */
  setHazards(text: string): void;
  /** Dòng tóm tắt các thẻ đã chọn. */
  setCards(text: string): void;
  /** Hiện 3 thẻ để chọn khi lên cấp; truyền null để ẩn. pick nhận chỉ số thẻ. */
  showCards(items: OfferItem[] | null, pick: (i: number) => void): void;
  setBoss(name: string | null, ratio: number): void;
  banner(text: string, sub?: string): void;
  pop(x: number, y: number, text: string, cls: string): void;
  hint(text: string): void;
  /** Danh sách đồng đội với thanh máu; ẩn khi chơi một mình. */
  setTeam(rows: { name: string; hp: number; max: number; alive: boolean; you: boolean }[]): void;
  /** Tên hiển thị trên đầu đồng đội. Truyền text = null để ẩn. */
  tag(id: string, text: string | null, x: number, y: number): void;
  clearTags(): void;
  setGeneral?(generalId: string): void;
  setPaused?(p: boolean): void;
  setStats?(stats: { dmg: number; atkSpd: number; def: number; crit: number; spd: number; cdr: number }): void;
  setPendingLevels?(count: number): void;
  toggleLevelupPopover?(): void;
  isLevelupPopoverOpen?(): boolean;
}

export interface RunResult {
  wave: number;
  gold: number;
  kills: number;
  bestWave: number;
  /** Số người chơi trong trận (1 nếu chơi một mình). */
  players: number;
}

export interface Link {
  relay(to: 'host' | 'all' | string, d: unknown): void;
}

export interface StartOpts {
  role: Role;
  myId: string;
  hostId: string;
  players: PlayerInfo[];
  link?: Link;
}

export interface Actor {
  id: string;
  name: string;
  local: boolean;
  loadout: Loadout | null;
  stats: Stats;
  pos: THREE.Vector3;
  /** Vị trí đích để nội suy cho người chơi từ xa. */
  tgt: THREE.Vector3;
  yaw: number;
  hp: number;
  alive: boolean;
  moving: boolean;
  invulnUntil: number;
  atkReady: number;
  dashReady: number;
  ultReady: number;
  dashT: number;
  dashDir: THREE.Vector3;
  dashSeq: number;
  ultSeq: number;
  attackAnim: { t: number; dur: number; kind: string };
  spinT: number;
  flashHurt: number;
  moveAnim: number;
  aim: THREE.Vector3;
  hold: boolean;
  runGold: number;
  /** Hồi chiêu và trạng thái của kỹ năng phụ E. */
  eReady: number;
  eSeq: number;
  dmgBuffUntil: number;
  guardUntil: number;
  /** Tụ lực của kỹ năng E (0..1) và lá chắn hấp thụ sát thương (Lê Lợi). */
  eCharge: number;
  shield: number;
  shieldUntil: number;
  /** Giây đồng đội đã đứng cạnh để cứu (khi gục). */
  reviveT: number;
  reviveFx?: number;
  /** Số lần đã dùng Phục Sinh Thần Phù trong lượt. */
  livesUsed?: number;
  /** Thời điểm nhận lá chắn Kim Cang Thuẫn kế tiếp. */
  aegisAt?: number;
  level: number;
  /** Kinh nghiệm hiện có (ở máy khách là tỉ lệ 0..1 nhận từ chủ phòng). */
  xp: number;
  cards: Record<string, number>;
  /** Ba thẻ đang chờ chọn (chủ phòng giữ cho mọi người chơi). */
  offer: string[] | null;
  pendingLevels: number;
  root: THREE.Group;
  rig: Rig;
  weaponModel: THREE.Group | null;
  bodyMats: THREE.MeshStandardMaterial[];
  shadow: THREE.Mesh;
  placed: boolean;
  // trạng thái chiêu cuối
  rageUntil: number;
  /** Lao đi bằng voi (Quang Trung, Trưng Trắc): chạy ở máy người điều khiển. */
  chain: { left: number; dir: THREE.Vector3; speed: number } | null;
  chainUntil: number;
  chainNext: number;
  chainHit: Set<Mon>;
  mountUntil: number;
  fxMount: boolean;
  mount: THREE.Group | null;
  fxRage: boolean;
}

export interface Mon {
  id: number;
  def: MonsterDef;
  rig: MonsterRig;
  hp: number;
  maxHp: number;
  pos: THREE.Vector3;
  kb: THREE.Vector3;
  yaw: number;
  phase: number;
  atkReady: number;
  windup: number;
  flashUntil: number;
  spawnAt: number;
  t1: number;
  t2: number;
  stopUntil: number;
  leapEnd: number;
  leapDir: THREE.Vector3;
  leapHit: boolean;
  stunUntil: number;
  fearUntil: number;
  slowUntil: number;
  slowMul: number;
  bleedUntil: number;
  bleedTick: number;
  bleedPct: number;
  bleedOwner: Actor | null;
  bleeding?: boolean;
  stunned?: boolean;
  birds?: THREE.Group;
  /** Tiền tố tinh anh: 0 không có, 1 Nhanh, 2 Nổ, 3 Hồi Máu, 4 Giáp Dày. */
  affix: number;
  affixShown?: boolean;
  /** Vùng cảnh báo đỏ dưới chân khi quái chuẩn bị đánh. */
  tele?: THREE.Group;
  /** Độ méo khi trúng đòn (0..1), làm mượt theo thời gian. */
  sq?: number;
  healT?: number;
  burnUntil: number;
  burnTick: number;
  burnOwner: Actor | null;
  goldMarkUntil: number;
  burning?: boolean;
  /** Bị hất tung đến thời điểm này (chỉ để hiển thị). */
  airUntil?: number;
  dmgMul: number;
  speedMul: number;
  baseScale: number;
  bar?: { grp: THREE.Group; fg: THREE.Mesh };
  dead: boolean;
  // chỉ dùng ở máy khách
  remoteYaw?: number;
  tgt?: THREE.Vector3;
  boss?: boolean;
  enraged?: boolean;
}

export type ProjKind = 'water' | 'boomerang' | 'bone' | 'fire' | 'pierce';
export const VIS = ['dep', 'water', 'non', 'lon', 'bone', 'fireball', 'smoke', 'arrow', 'orb', 'orbg', 'snow'] as const;
export type Vis = (typeof VIS)[number];

export interface Proj {
  id: number;
  obj: THREE.Object3D;
  kind: ProjKind;
  vis: Vis;
  owner: Actor | null;
  friendly: boolean;
  vel: THREE.Vector3;
  dmg: number;
  radius: number;
  travelled: number;
  range: number;
  maxHit?: number;
  /** Đạn của vũ khí đã tiến hóa (ánh vàng). */
  evo?: boolean;
  back: boolean;
  hit: Set<Mon>;
  from?: THREE.Vector3;
  to?: THREE.Vector3;
  t?: number;
  dur?: number;
  arc?: number;
  dead: boolean;
}

export interface Zone {
  id: number;
  pos: THREE.Vector3;
  r: number;
  t: number;
  dur: number;
  dmg: number;
  color: number;
  fill: THREE.Mesh;
  ring: THREE.Mesh;
  /** Loại sự kiện bản đồ tạo ra vùng này (sét, băng, thiên thạch). */
  kind?: string;
  /** Sát thương lên quái khi vùng nổ (sự kiện bản đồ gây hại cả quái). */
  monDmg?: number;
}

export interface Cloud {
  id: number;
  pos: THREE.Vector3;
  r: number;
  t: number;
  tick: number;
  dmg: number;
  owner: Actor | null;
  mesh: THREE.Object3D;
  /** Đầm lầy của Ngô Quyền: làm chậm và đâm cọc, khác với mây hôi sầu riêng. */
  swamp?: boolean;
}

export interface Coin {
  id: number;
  mesh: THREE.Object3D;
  vel: THREE.Vector3;
  value: number;
  age: number;
  heal?: boolean;
}

export interface Fx {
  t: number;
  dur: number;
  update(k: number, dt: number): void;
  end(): void;
}

/** Đối tượng chỉ để hiển thị ở máy khách, vị trí lấy từ bản chụp của chủ phòng. */
export interface View {
  obj: THREE.Object3D;
  tgt: THREE.Vector3;
  vis?: Vis;
  heal?: boolean;
  fill?: THREE.Mesh;
  ring?: THREE.Mesh;
  r?: number;
  t?: number;
  dur?: number;
  ry?: number;
  flat?: boolean;
  placed: boolean;
}

export type SnapEvent = (string | number)[];

export interface Snap {
  k: 'snap';
  w: number;
  ws: number;
  kills: number;
  pl: number[][];
  mo: number[][];
  pr: number[][];
  co: number[][];
  zo: number[][];
  cl: number[][];
  sm: number[][];
  ev: SnapEvent[];
  ids: string[];
}
