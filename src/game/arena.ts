import * as THREE from 'three';
import { settings, saveSettings } from '../infrastructure/persistence/settings-repository';
import { showTouch, touch } from '../ui/input/touch-controls';
import { ESKILLS, Q_SKILLS, GENERALS, MAX_WEAPON_LEVEL, MONSTERS, TRUNG_NHI_LOOK, comboFor, waveComposition, type MonsterType } from '../domain/data';
import { CARDS, cardById, pickOffer, xpNeed } from '../domain/combat/cards';
import { checkAchievements, ensureQuests, questAdd } from '../domain/progression/quests';
import { ambience } from '../infrastructure/audio/ambience-engine';
import { HAZARDS, HAZARD_FROM, hazardById, hazardText } from '../rendering/fx/hazards';
import { applyAvatar } from '../rendering/loaders/glb-avatar';
import { box, buildBanhChung, buildBow, buildCoin, buildElephant, buildHuman, buildMonster, buildProjectile, buildWeaponModel, cone, cyl, flashMaterials, sph, tintEvolved, type Rig } from '../rendering/models/models';
import { attachGearToRig } from '../rendering/items/gear-models';
import type { PlayerInfo } from '../infrastructure/network/net-client';
import { loadoutOf, writeSave, type Save3D } from '../infrastructure/persistence/save-repository';
import { sfx, resumeAudio, type SfxName } from '../infrastructure/audio/sfx-engine';
import { computeStats, type StatSource } from '../domain/combat/stats';
import { animateSwamp, buildSwamp } from '../rendering/shaders/swamp';
import { createWaterShaderMaterial } from '../rendering/shaders/water-shader';
import { createDissolveMaterial } from '../rendering/shaders/dissolve-shader';
import { getSoftGlowTex, getShockwaveRingTex, getSmokePuffTex, getSpiritPetalTex } from '../rendering/fx/vfx-textures';
import { AimIndicator, makeESkillFx } from '../rendering/fx/eskill-fx';
import { BIOMES, biomeIndexForWave } from '../rendering/biomes/biomes';
import { ARENA_R, buildArenaWorld, type ArenaWorld } from '../rendering/world/arena-world';
import { MinimapRenderer } from './systems/minimap-renderer';
import { ArenaCamera } from './camera/arena-camera';
import { DropSystem } from './systems/drop-system';
import {
  VIS,
  type Actor,
  type Cloud,
  type Coin,
  type Fx,
  type Hud,
  type Link,
  type Mon,
  type Proj,
  type Role,
  type RunResult,
  type Snap,
  type SnapEvent,
  type StartOpts,
  type View,
  type Vis,
  type Zone,
} from './types';

export type { Hud, RunResult, StartOpts, Link } from './types';

const UP = new THREE.Vector3(0, 1, 0);
const MON_TYPES = Object.keys(MONSTERS) as MonsterType[];
const WAVE_STATES = ['intro', 'fight', 'break'] as const;
const r2 = (n: number): number => Math.round(n * 100) / 100;
const typing = (): boolean => {
  const el = document.activeElement;
  return !!el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA');
};

/** Đồng minh triệu hồi (Trưng Nhị): phần hiển thị dùng chung cho chủ phòng và máy khách. */
interface SummonLike {
  root: THREE.Group;
  kind: 0 | 1; // 0: Trưng Nhị, 1: Voi Trắng
  rig: Rig | null;
  legs: THREE.Group[];
  shadow: THREE.Mesh;
  pos: THREE.Vector3;
  yaw: number;
  shotAt: number;
  phase: number;
}
interface Summon extends SummonLike {
  id: number;
  owner: Actor;
  life: number;
  atkReady: number;
}
interface SummonView extends SummonLike {
  tgt: THREE.Vector3;
}

/* ---------- Đấu trường ---------- */

const SWAMP_RANGE = 20;
const EMOTE_KEYS = ['KeyZ', 'KeyX', 'KeyC', 'KeyV'];
const EMOTES = ['Theo tôi!', 'Cần hồi máu!', 'Cẩn thận!', 'Được!'];
const AFFIX_NAMES = ['', 'Nhanh', 'Nổ', 'Hồi Máu', 'Giáp Dày'];
const AFFIX_COLORS = [0, 0x40e0ff, 0xff8a20, 0x60ff80, 0xc8c8e0];

const CONTROL_CODES = new Set([
  'KeyW', 'KeyA', 'KeyS', 'KeyD',
  'KeyQ', 'KeyE', 'KeyM', 'KeyB',
  'Space', 'ShiftLeft', 'ShiftRight',
  'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight',
  'Digit1', 'Digit2', 'Digit3',
  'KeyZ', 'KeyX', 'KeyC', 'KeyV',
  'Escape',
  'Backspace',
]);

/**
 * Xử lý chuẩn hóa mã phím khi người chơi bật Unikey / EVKey / bộ gõ tiếng Việt.
 * Ngăn chặn triệt để lỗi nuốt phím (A+S tạo 'á'), kẹt phím (di chuyển không dừng), và xung đột ký tự có dấu.
 */
function normalizeKeyCode(e: KeyboardEvent): string {
  // 1. Ưu tiên hàng đầu: e.code phần cứng bàn phím nếu hợp lệ và không phải Process/Unidentified
  if (e.code && e.code !== 'Process' && e.code !== 'Unidentified') {
    return e.code;
  }

  // 2. Dự phòng theo keyCode vật lý chuẩn trên bàn phím
  const kc = e.keyCode || e.which;
  if (kc === 87) return 'KeyW';
  if (kc === 65) return 'KeyA';
  if (kc === 83) return 'KeyS';
  if (kc === 68) return 'KeyD';
  if (kc === 81) return 'KeyQ';
  if (kc === 69) return 'KeyE';
  if (kc === 66) return 'KeyB';
  if (kc === 32) return 'Space';
  if (kc === 16) return 'ShiftLeft';
  if (kc === 27) return 'Escape';
  if (kc === 77) return 'KeyM';
  if (kc === 38) return 'ArrowUp';
  if (kc === 40) return 'ArrowDown';
  if (kc === 37) return 'ArrowLeft';
  if (kc === 39) return 'ArrowRight';
  if (kc === 49) return 'Digit1';
  if (kc === 50) return 'Digit2';
  if (kc === 51) return 'Digit3';

  // 3. Xử lý chính xác khi Unikey / EVKey can thiệp tạo ký tự Telex/VNI:
  const k = (e.key || '').toLowerCase();

  // Phím W: gõ w sinh ra 'w', hoặc móc Telex 'ư', 'ă', 'ơ' và các biến thể dấu
  if (
    k === 'w' ||
    k === 'ư' || k === 'ă' || k === 'ơ' ||
    k === 'ứ' || k === 'ừ' || k === 'ử' || k === 'ữ' || k === 'ự' ||
    k === 'ắ' || k === 'ằ' || k === 'ẳ' || k === 'ẵ' || k === 'ặ' ||
    k === 'ớ' || k === 'ờ' || k === 'ở' || k === 'ỡ' || k === 'ợ'
  ) {
    return 'KeyW';
  }

  // Phím S: trong Telex gõ 's' sau nguyên âm tạo dấu sắc (á, é, í, ó, ú, ý, ắ, ấ, ế, ố, ớ, ứ)
  if (
    k === 's' ||
    k === 'á' || k === 'é' || k === 'í' || k === 'ó' || k === 'ú' || k === 'ý' ||
    k === 'ắ' || k === 'ấ' || k === 'ế' || k === 'ố' || k === 'ớ' || k === 'ứ'
  ) {
    return 'KeyS';
  }

  // Phím A: 'a', hoặc 'â' (do gõ aa trong Telex), hoặc các biến thể dấu của a
  if (
    k === 'a' || k === 'â' ||
    k === 'à' || k === 'ả' || k === 'ã' || k === 'ạ' ||
    k === 'ầ' || k === 'ẩ' || k === 'ẫ' || k === 'ậ' || k === 'ấ'
  ) {
    return 'KeyA';
  }

  // Phím D: 'd', hoặc 'đ' (do gõ dd trong Telex)
  if (k === 'd' || k === 'đ') return 'KeyD';

  // Phím E: 'e', hoặc 'ê' (do gõ ee trong Telex), hoặc các biến thể dấu của e
  if (
    k === 'e' || k === 'ê' ||
    k === 'è' || k === 'ẻ' || k === 'ẽ' || k === 'ẹ' ||
    k === 'ề' || k === 'ể' || k === 'ễ' || k === 'ệ' || k === 'ế'
  ) {
    return 'KeyE';
  }

  if (k === 'b') return 'KeyB';
  if (k === 'q') return 'KeyQ';
  if (k === 'm') return 'KeyM';
  if (k === '1') return 'Digit1';
  if (k === '2') return 'Digit2';
  if (k === '3') return 'Digit3';
  if (k === 'z') return 'KeyZ';
  if (k === 'x') return 'KeyX';
  if (k === 'c') return 'KeyC';
  if (k === 'v') return 'KeyV';
  if (k === ' ' || k === 'spacebar') return 'Space';
  if (k === 'shift') return 'ShiftLeft';
  if (k === 'escape') return 'Escape';
  if (k === 'backspace') return 'Backspace';

  return e.code || '';
}

export class Arena {
  scene = new THREE.Scene();
  private cam = new ArenaCamera();

  get camera(): THREE.PerspectiveCamera {
    return this.cam.camera;
  }
  get shake(): number {
    return this.cam.shake;
  }
  set shake(v: number) {
    this.cam.shake = v;
  }

  private world: ArenaWorld;
  private save!: Save3D;

  // vai trò mạng
  private role: Role = 'solo';
  private link?: Link;
  private hostId = '';
  private actors = new Map<string, Actor>();
  private me!: Actor;
  private evq: SnapEvent[] = [];
  private snapTimer = 0;
  private inputTimer = 0;
  private nextId = 1;

  private time = 0;
  private paused = false;
  private over = false;
  private active = false;

  // trò chơi (chủ phòng và chơi một mình)
  private mons: Mon[] = [];
  private projs: Proj[] = [];
  private zones: Zone[] = [];
  private clouds: Cloud[] = [];
  private camTarget = new THREE.Vector3();
  private offerOpen = false;
  private emoteReady = 0;
  /** Mối nguy đang có của chế độ vô tận (từ màn 21). */
  private hazards: string[] = [];
  private ambBiome = -1;
  private lastTeamKills = 0;
  private mapEventT = 10;
  private frenzyUntil = 0;
  private moodUntil = 0;
  /** Giây còn lại của khoảnh khắc khựng hình khi đánh chí mạng hoặc hạ quái lớn (chỉ chơi một mình). */
  private hitStop = 0;
  private offerIds: string[] = [];
  private aimMarker: THREE.Group | null = null;
  private minimap = new MinimapRenderer();
  private summons: Summon[] = [];
  private summonViews = new Map<number, SummonView>();
  private armies: { start: THREE.Vector3; dir: THREE.Vector3; travelled: number; len: number; width: number; speed: number; owner: Actor; hit: Set<Mon> }[] = [];
  private conSonStreams: {
    start: THREE.Vector3;
    dir: THREE.Vector3;
    len: number;
    width: number;
    t: number;
    dur: number;
    tick: number;
    owner: Actor;
    group: THREE.Group;
    waterSurface: THREE.Mesh;
    foamLeft: THREE.Mesh;
    foamRight: THREE.Mesh;
    petals: { m: THREE.Mesh; offAlong: number; offSide: number; speed: number; rotSpd: number }[];
  }[] = [];
  private dropSystem = new DropSystem(this.scene);
  get coins(): Coin[] {
    return this.dropSystem.coins;
  }
  set coins(list: Coin[]) {
    this.dropSystem.coins = list;
  }
  private fxs: Fx[] = [];
  private timers: { at: number; fn: () => void }[] = [];
  private wave = 0;
  private waveState: (typeof WAVE_STATES)[number] = 'intro';
  private stateT = 0;
  private queue: MonsterType[] = [];
  private spawnTimer = 0;
  private kills = 0;
  private dirty = 0;

  // hiển thị ở máy khách
  private monViews = new Map<number, Mon>();
  private projViews = new Map<number, View>();
  private coinViews = new Map<number, View>();
  private zoneViews = new Map<number, View>();
  private cloudViews = new Map<number, View>();

  // nhập liệu
  private keys = new Set<string>();
  private mouse = new THREE.Vector2(0, 0);
  private mouseDown = false;
  /** Kỹ năng E định hướng: đang hiện vòng nhắm, tụ lực, và chặn đòn đánh thường sau khi xác nhận. */
  private eAiming = false;
  private eAimTouch = false;
  private eWasDown = false;
  private eMouseWas = false;
  private eCharging = 0;
  private eSuppress = false;
  /** Kỹ năng Q định hướng: đang hiện vòng nhắm và chặn đòn đánh thường sau khi xác nhận. */
  private qAiming = false;
  private qAimTouch = false;
  private qWasDown = false;
  private qMouseWas = false;
  private qSuppress = false;
  private aimInd: AimIndicator | null = null;
  /** Thành lũy Lý Thường Kiệt đang dựng, và số lần Nguyễn Trãi đã trúng mỗi quái (chủ phòng). */
  private forts: { pos: THREE.Vector3; r: number; until: number; tick: number; owner: Actor }[] = [];
  private shaken = new WeakMap<Mon, number>();
  private ray = new THREE.Raycaster();
  private plane = new THREE.Plane(UP, 0);

  private coinTemplate = buildCoin();
  private partGeo = new THREE.PlaneGeometry(0.3, 0.3);
  private partMats = new Map<number, THREE.MeshBasicMaterial>();
  private barGeo = new THREE.PlaneGeometry(1.4, 0.14);
  private barBg = new THREE.MeshBasicMaterial({ color: 0x120c08, depthTest: false, transparent: true });
  private barFg = new THREE.MeshBasicMaterial({ color: 0xd8382c, depthTest: false, transparent: true });
  private lastLabelHp = '';

  constructor(
    private canvas: HTMLCanvasElement,
    private hud: Hud,
    private onOver: (r: RunResult) => void,
    private onPause: () => void,
  ) {
    this.world = buildArenaWorld(this.scene);
  }

  get online(): boolean {
    return this.role !== 'solo';
  }

  /* ---------- Vòng đời ---------- */

  start(save: Save3D, opts?: StartOpts): void {
    this.save = save;
    this.clearAll();
    const o: StartOpts = opts ?? {
      role: 'solo',
      myId: 'me',
      hostId: 'me',
      players: [{ id: 'me', name: GENERALS.find((g) => g.id === save.general)?.name ?? 'Danh tướng', loadout: loadoutOf(save) }],
    };
    this.role = o.role;
    this.link = o.link;
    this.hostId = o.hostId;
    this.time = 0;
    this.over = false;
    this.paused = false;
    this.wave = 0;
    this.offerOpen = false;
    this.hazards = [];
    this.hud.setHazards('');
    this.hud.showCards(null, () => {});
    this.hud.setCards('');
    this.world.setBiome(0);
    this.kills = 0;
    this.nextId = 1;
    this.evq = [];
    this.snapTimer = 0;
    this.inputTimer = 0;

    const n = o.players.length;
    o.players.forEach((p, i) => {
      const a = this.makeActor(p, p.id === o.myId, i, n);
      this.actors.set(a.id, a);
      if (a.local) this.me = a;
    });
    if (!this.me) throw new Error('Không tìm thấy người chơi của bạn trong danh sách.');

    this.active = true;
    touch.onPause = () => this.onPause();
    showTouch(true);
    this.attach();
    this.hud.setGold(0, save.gold);
    this.hud.setKills(0);
    this.hud.setGeneral?.(this.me.stats.general.id);
    this.hud.setLoadout(this.me.stats.weapon.name + (this.evo(this.me) ? ' ★' : ''), this.me.stats.general.ult, ESKILLS[this.me.stats.general.id]?.name ?? '');
    this.refreshChips();
    this.hud.setTeam([]);
    this.syncTeam();
    ensureQuests(save);
    this.lastTeamKills = 0;
    if (!save.totals.played.includes(save.general)) save.totals.played.push(save.general);
    save.runs += 1;
    writeSave(save);
    if (this.role !== 'client') this.nextWave();
    else {
      this.waveState = 'intro';
      this.hud.setWave('Đang vào trận...');
    }
  }

  stop(): void {
    this.active = false;
    showTouch(false);
    ambience.stop();
    this.ambBiome = -1;
    this.offerOpen = false;
    this.hud.showCards(null, () => {});
    if (this.aimMarker) this.aimMarker.visible = false;
    this.cancelEAim();
    this.cancelQAim();
    this.detach();
    this.flushSave();
    this.clearAll();
    this.hud.clearTags();
    this.hud.setTeam([]);
  }

  setPaused(p: boolean): void {
    if (this.online) return; // trận nhiều người không thể tạm dừng
    this.paused = p;
    this.cancelEAim();
    this.cancelQAim();
    if (p) this.keys.clear();
    this.mouseDown = false;
    this.hud.setPaused?.(p);
  }

  /** Gọi sau khi mua hoặc đổi trang bị trong lúc tạm dừng (chỉ chơi một mình). */
  refreshLoadout(): void {
    const a = this.me;
    const ratio = a.hp / a.stats.maxHp;
    a.stats = computeStats(this.save);
    a.hp = Math.max(1, Math.min(a.stats.maxHp, ratio * a.stats.maxHp));
    this.attachWeapon(a);
    attachGearToRig(a.rig, this.save.equipped);
    this.hud.setGeneral?.(a.stats.general.id);
    this.hud.setLoadout(a.stats.weapon.name + (this.evo(a) ? ' ★' : ''), a.stats.general.ult, ESKILLS[a.stats.general.id]?.name ?? '');
    this.hud.setHp(a.hp, a.stats.maxHp);
  }

  resize(w: number, h: number): void {
    this.cam.resize(w, h);
  }

  private flushSave(): void {
    if (this.save) writeSave(this.save);
    this.dirty = 0;
  }

  private clearAll(): void {
    this.forts = [];
    this.cancelEAim();
    this.cancelQAim();
    for (const a of this.actors.values()) this.scene.remove(a.root, a.shadow);
    this.actors.clear();
    for (const s of this.summons) this.scene.remove(s.root, s.shadow);
    this.summons = [];
    for (const v of this.summonViews.values()) this.scene.remove(v.root, v.shadow);
    this.summonViews.clear();
    for (const m of this.mons) this.scene.remove(m.rig.group);
    for (const m of this.monViews.values()) this.scene.remove(m.rig.group);
    for (const p of this.projs) this.scene.remove(p.obj);
    for (const z of this.zones) this.scene.remove(z.fill, z.ring);
    for (const c of this.clouds) this.scene.remove(c.mesh);
    for (const c of this.coins) this.scene.remove(c.mesh);
    for (const v of [...this.projViews.values(), ...this.coinViews.values(), ...this.cloudViews.values()]) this.scene.remove(v.obj);
    for (const v of this.zoneViews.values()) this.scene.remove(v.fill!, v.ring!);
    for (const f of this.fxs) f.end();
    for (const s of this.conSonStreams) this.scene.remove(s.group);
    this.conSonStreams = [];
    this.mons = [];
    this.projs = [];
    this.zones = [];
    this.clouds = [];
    this.armies = [];
    this.coins = [];
    this.fxs = [];
    this.timers = [];
    this.queue = [];
    this.monViews.clear();
    this.projViews.clear();
    this.coinViews.clear();
    this.zoneViews.clear();
    this.cloudViews.clear();
  }

  /* ---------- Nhập liệu ---------- */

  private onKeyDown = (e: KeyboardEvent): void => {
    if (typing()) return;
    const code = normalizeKeyCode(e);
    if (!code) return;

    // Chặn mặc định các phím điều khiển khi đang trong trận để Unikey không can thiệp/bỏ dấu
    if (CONTROL_CODES.has(code) || code === 'Backspace') {
      e.preventDefault();
    }
    if (code === 'Backspace') return;

    if (code === 'Escape') {
      if (e.repeat) return;
      if (this.hud.isLevelupPopoverOpen?.()) {
        this.hud.toggleLevelupPopover?.();
        return;
      }
      if (!this.over) this.onPause();
      return;
    }
    if (this.paused) return;
    if (code === 'KeyB' && !e.repeat && this.active && !this.over) {
      this.hud.toggleLevelupPopover?.();
      return;
    }
    if (code === 'KeyM' && !e.repeat && this.active) {
      this.hud.banner(ambience.toggleMute() ? 'Đã tắt âm nền' : 'Đã bật âm nền', 'Nhấn M để đổi');
      return;
    }
    if (this.online && !e.repeat && EMOTE_KEYS.includes(code)) {
      this.emote(EMOTE_KEYS.indexOf(code));
      return;
    }
    if (this.offerOpen && /^Digit[1-3]$/.test(code)) {
      if (!this.hud.isLevelupPopoverOpen || this.hud.isLevelupPopoverOpen()) {
        this.pickCard(Number(code.slice(5)) - 1);
        return;
      }
    }
    if (CONTROL_CODES.has(code)) {
      this.keys.add(code);
    }
  };

  private onKeyUp = (e: KeyboardEvent): void => {
    if (typing()) return;
    const code = normalizeKeyCode(e);
    if (CONTROL_CODES.has(code)) {
      e.preventDefault();
    }
    if (code) this.keys.delete(code);
    if (e.code && e.code !== 'Process' && e.code !== 'Unidentified') {
      this.keys.delete(e.code);
    }
  };

  private onBlur = (): void => {
    this.keys.clear();
    this.mouseDown = false;
  };

  private onVisibilityChange = (): void => {
    if (document.hidden) {
      this.keys.clear();
      this.mouseDown = false;
    }
  };

  private onComposition = (e: CompositionEvent): void => {
    if (!typing()) {
      e.preventDefault();
    }
  };

  private onBeforeInput = (e: InputEvent): void => {
    if (!typing()) {
      e.preventDefault();
    }
  };

  private onMouseMove = (e: MouseEvent): void => {
    const r = this.canvas.getBoundingClientRect();
    this.mouse.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
  };
  private onMouseDown = (e: MouseEvent): void => {
    if (e.button === 0) this.mouseDown = true;
    else if (e.button === 2) {
      if (this.eAiming) this.cancelEAim();
      if (this.qAiming) this.cancelQAim();
    }
    resumeAudio();
  };
  private onContextMenu = (e: MouseEvent): void => {
    e.preventDefault();
  };
  private onWheel = (e: WheelEvent): void => {
    e.preventDefault();
    settings.zoom = Math.max(9, Math.min(36, settings.zoom * Math.exp(e.deltaY * 0.0012)));
    saveSettings();
  };
  private onMouseUp = (e: MouseEvent): void => {
    if (e.button === 0) this.mouseDown = false;
  };

  private attach(): void {
    this.detach();
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    window.addEventListener('blur', this.onBlur);
    document.addEventListener('visibilitychange', this.onVisibilityChange);
    window.addEventListener('compositionstart', this.onComposition);
    window.addEventListener('compositionupdate', this.onComposition);
    window.addEventListener('compositionend', this.onComposition);
    window.addEventListener('beforeinput', this.onBeforeInput as EventListener);
    window.addEventListener('mousemove', this.onMouseMove);
    this.canvas.addEventListener('mousedown', this.onMouseDown);
    this.canvas.addEventListener('contextmenu', this.onContextMenu);
    this.canvas.addEventListener('wheel', this.onWheel, { passive: false });
    window.addEventListener('mouseup', this.onMouseUp);
  }

  private detach(): void {
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    window.removeEventListener('blur', this.onBlur);
    document.removeEventListener('visibilitychange', this.onVisibilityChange);
    window.removeEventListener('compositionstart', this.onComposition);
    window.removeEventListener('compositionupdate', this.onComposition);
    window.removeEventListener('compositionend', this.onComposition);
    window.removeEventListener('beforeinput', this.onBeforeInput as EventListener);
    window.removeEventListener('mousemove', this.onMouseMove);
    this.canvas.removeEventListener('mousedown', this.onMouseDown);
    this.canvas.removeEventListener('contextmenu', this.onContextMenu);
    this.canvas.removeEventListener('wheel', this.onWheel);
    window.removeEventListener('mouseup', this.onMouseUp);
    this.keys.clear();
    this.mouseDown = false;
  }

  /* ---------- Người chơi ---------- */

  private makeActor(info: PlayerInfo, local: boolean, idx: number, n: number): Actor {
    const src: StatSource = local ? this.save : (info.loadout ?? loadoutOf(this.save));
    const stats = computeStats(src);
    const root = new THREE.Group();
    const rig = buildHuman(stats.general.look);
    root.add(rig.group);
    const bodyMats = flashMaterials(rig.group);
    applyAvatar(rig, stats.general.id, (m) => bodyMats.push(...m));
    const shadow = new THREE.Mesh(new THREE.CircleGeometry(0.7, 20), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.25 }));
    shadow.rotation.x = -Math.PI / 2;
    this.scene.add(root, shadow);
    const x = (idx - (n - 1) / 2) * 2.4;
    const a: Actor = {
      id: info.id,
      name: info.name,
      local,
      loadout: info.loadout,
      stats,
      pos: new THREE.Vector3(x, 0, 9),
      tgt: new THREE.Vector3(x, 0, 9),
      yaw: Math.PI,
      hp: stats.maxHp,
      alive: true,
      moving: false,
      invulnUntil: 1.2,
      atkReady: 0,
      dashReady: 0,
      ultReady: 0,
      dashT: 0,
      dashDir: new THREE.Vector3(),
      dashSeq: 0,
      ultSeq: 0,
      attackAnim: { t: 9, dur: 0.35, kind: '' },
      spinT: 0,
      flashHurt: 0,
      moveAnim: 0,
      aim: new THREE.Vector3(x, 0, 0),
      hold: false,
      runGold: 0,
      eReady: 0,
      eSeq: 0,
      dmgBuffUntil: 0,
      guardUntil: 0,
      eCharge: 0,
      shield: 0,
      shieldUntil: 0,
      reviveT: 0,
      level: 1,
      xp: 0,
      cards: {},
      offer: null,
      pendingLevels: 0,
      root,
      rig,
      weaponModel: null,
      bodyMats,
      shadow,
      placed: false,
      rageUntil: 0,
      chain: null,
      chainUntil: 0,
      chainNext: 0,
      chainHit: new Set(),
      mountUntil: 0,
      fxMount: false,
      mount: null,
      fxRage: false,
    };
    this.attachWeapon(a);
    attachGearToRig(a.rig, src.equipped);
    root.position.copy(a.pos);
    return a;
  }

  private attachWeapon(a: Actor): void {
    if (a.weaponModel) a.rig.hand.remove(a.weaponModel);
    a.weaponModel = buildWeaponModel(a.stats.weapon.id);
    if (this.evo(a)) tintEvolved(a.weaponModel);
    a.rig.hand.add(a.weaponModel);
  }

  private aliveActors(): Actor[] {
    return [...this.actors.values()].filter((a) => a.alive);
  }

  private nearestActor(p: THREE.Vector3): Actor | null {
    let best: Actor | null = null;
    let bd = Infinity;
    for (const a of this.actors.values()) {
      if (!a.alive) continue;
      const d = (a.pos.x - p.x) ** 2 + (a.pos.z - p.z) ** 2;
      if (d < bd) {
        bd = d;
        best = a;
      }
    }
    return best;
  }

  private dirOf(a: Actor): THREE.Vector3 {
    return new THREE.Vector3(Math.sin(a.yaw), 0, Math.cos(a.yaw));
  }

  private updateAim(a: Actor): void {
    if (touch.enabled && performance.now() - touch.lastUse < 4000) {
      let best: { x: number; z: number } | null = null;
      let bd = 30 * 30;
      const list: { pos: THREE.Vector3; dead?: boolean }[] = this.role === 'client' ? [...this.monViews.values()] : this.mons;
      for (const m of list) {
        if (m.dead) continue;
        const d2 = (m.pos.x - a.pos.x) ** 2 + (m.pos.z - a.pos.z) ** 2;
        if (d2 < bd) {
          bd = d2;
          best = m.pos;
        }
      }
      if (best) a.aim.set(best.x, 0, best.z);
      else if (touch.moveX !== 0 || touch.moveY !== 0) a.aim.set(a.pos.x + touch.moveX * 8, 0, a.pos.z + touch.moveY * 8);
      return;
    }
    this.ray.setFromCamera(this.mouse, this.camera);
    const hit = new THREE.Vector3();
    if (this.ray.ray.intersectPlane(this.plane, hit)) a.aim.copy(hit);
  }

  private aimDir(a: Actor): THREE.Vector3 {
    const d = new THREE.Vector3(a.aim.x - a.pos.x, 0, a.aim.z - a.pos.z);
    if (d.lengthSq() < 0.01) return this.dirOf(a);
    return d.normalize();
  }

  private hurtActor(a: Actor, amount: number, from?: THREE.Vector3): void {
    if (!a.alive || this.over || this.time < a.invulnUntil || a.dashT > 0) return;
    const fort = this.inFort(a);
    let dmg = Math.max(1, Math.round(amount * (1 - a.stats.reduce) * (a.guardUntil > this.time ? 0.4 : 1) * (fort ? 0.6 : 1)));
    if (fort && from) {
      const hit = this.mons.find((m) => !m.dead && m.pos.distanceTo(from) < 2.5);
      if (hit) this.damageMon(hit, amount * 0.5, a.pos, 3, this.forts[0]?.owner ?? a, false);
    }
    if ((a.stats.thorns ?? 0) > 0 && from) {
      const hit = this.mons.find((m) => !m.dead && m.pos.distanceTo(from) < 3.5);
      if (hit) {
        this.damageMon(hit, Math.max(6, Math.round(dmg * a.stats.thorns)), a.pos, 2, a, false);
        this.popAt(a.pos, 'Phản sát', 'crit', 2.0);
      }
    }
    if (a.shield > 0 && this.time < a.shieldUntil) {
      const soak = Math.min(a.shield, dmg);
      a.shield -= soak;
      dmg -= soak;
      if (dmg <= 0) {
        a.invulnUntil = this.time + 0.3;
        this.popAt(a.pos, 'Hấp thụ', 'heal', 2.2);
        return;
      }
    }
    a.hp -= dmg;
    a.invulnUntil = this.time + 0.55;
    a.flashHurt = 0.2;
    this.popAt(a.pos, `-${dmg}`, 'hurt', 2.2);
    if (a.local) {
      this.shake = Math.max(this.shake, 0.35);
      sfx.hurt();
    }
    this.emit(['u', a.id]);
    if (from && !(a.rageUntil > this.time)) {
      const k = new THREE.Vector3().subVectors(a.pos, from).setY(0).normalize().multiplyScalar(0.8);
      a.pos.add(k);
      if (!a.local) {
        a.tgt.add(k);
        this.emit(['k', a.id, r2(k.x), r2(k.z)]);
      }
    }
    if (a.hp <= 0) {
      a.hp = 0;
      a.alive = false;
      this.emit(['d', a.id]);
      a.reviveT = 0;
      if (a.local && this.online) this.hud.hint('Bạn đã gục ngã. Đồng đội đứng cạnh bạn 3 giây để cứu, hoặc chờ hết màn.');
      if (this.aliveActors().length === 0) this.gameOver();
    }
    this.syncTeam();
  }

  private gameOver(): void {
    if (this.over) return;
    this.over = true;
    this.save.bestWave = Math.max(this.save.bestWave, this.wave);
    this.achieve();
    this.flushSave();
    sfx.hurt();
    this.hud.setBoss(null, 0);
    if (this.role === 'host') {
      const golds: Record<string, number> = {};
      for (const a of this.actors.values()) golds[a.id] = a.runGold;
      this.link?.relay('all', { k: 'over', wave: this.wave, kills: this.kills, golds });
    }
    this.onOver({ wave: this.wave, gold: this.me.runGold, kills: this.kills, bestWave: this.save.bestWave, players: this.actors.size });
  }

  private doDash(a: Actor): void {
    if (this.time < a.dashReady || a.dashT > 0 || !a.alive) return;
    let d = a === this.me ? this.moveInput() : new THREE.Vector3();
    if (d.lengthSq() === 0) d = this.dirOf(a);
    a.dashDir.copy(d).normalize();
    a.dashT = 0.2;
    a.dashReady = this.time + 2.2 * (a.stats.dashCdMul ?? 1);
    a.invulnUntil = Math.max(a.invulnUntil, this.time + 0.35);
    a.dashSeq++;
    sfx.dash();
    this.ring(a.pos, 1.6, 0xffffff, 0.3);
  }

  /** Chủ phòng và chơi một mình: thi triển chiêu cuối riêng của từng tướng cho người chơi a. */
  private doUlt(a: Actor): void {
    if (this.time < a.ultReady || !a.alive) return;
    const g = a.stats.general;
    a.ultReady = this.time + g.ultCd * a.stats.ultCdMul;
    this.bannerAll(
      g.ult,
      g.ultKind === 'con_son_stream'
        ? 'Côn Sơn suối chảy rì rầm, ta nghe như tiếng đàn cầm bên tai'
        : g.ultKind === 'poem'
          ? 'Nam quốc sơn hà Nam đế cư, tiệt nhiên định phận tại thiên thư'
          : a.name,
    );
    this.playSfx('boom');
    if (a.local) this.localUltStart(a);
    switch (g.ultKind) {
      case 'army': this.ultArmy(a); break;
      case 'rush': this.ultRush(a); break;
      case 'dragon': this.ultDragon(a); break;
      case 'summon': this.ultSummon(a); break;
      case 'rage': this.ultRage(a); break;
      case 'swamp': this.ultSwamp(a); break;
      case 'poem': this.ultPoem(a); break;
      case 'proclaim': this.ultProclaim(a); break;
      case 'bamboo': this.ultBamboo(a); break;
      case 'con_son_stream': this.ultConSonStream(a); break;
    }
  }

  /** Thông số cú lao bằng voi: voi chiến của Quang Trung nhanh và dài, voi trắng của Trưng Trắc ngắn hơn. */
  private rushParams(kind: string): { speed: number; dur: number } {
    return kind === 'rush' ? { speed: 24, dur: 2.2 } : { speed: 26, dur: 0.7 };
  }

  /** Phần chiêu cuối chạy ở máy của người điều khiển: lao bằng voi, tăng tốc chạy. */
  private localUltStart(a: Actor): void {
    const k = a.stats.general.ultKind;
    if (k === 'rage') a.rageUntil = this.time + 10;
    if (k === 'rush') {
      const p = this.rushParams(k);
      const d = this.aimDir(a);
      a.chain = { left: p.dur, dir: d.clone(), speed: p.speed };
      a.yaw = Math.atan2(d.x, d.z);
      a.mountUntil = this.time + p.dur + 0.35;
    }
  }

  private stepChain(a: Actor, dt: number): void {
    const c = a.chain;
    if (!c) return;
    // Lái voi: hướng về chuột (hoặc theo phím WASD nếu đang bấm), quay tối đa 3,4 rad/giây.
    const inp = this.moveInput();
    const want = inp.lengthSq() > 0 ? inp.clone().normalize() : this.aimDir(a);
    let diff = Math.atan2(want.x, want.z) - Math.atan2(c.dir.x, c.dir.z);
    diff = Math.atan2(Math.sin(diff), Math.cos(diff));
    const turn = Math.max(-3.4 * dt, Math.min(3.4 * dt, diff));
    const ang = Math.atan2(c.dir.x, c.dir.z) + turn;
    c.dir.set(Math.sin(ang), 0, Math.cos(ang));
    a.yaw = ang;
    a.pos.addScaledVector(c.dir, c.speed * dt);
    c.left -= dt;
    a.invulnUntil = Math.max(a.invulnUntil, this.time + 0.2);
    if (c.left <= 0) a.chain = null;
  }

  private applyStun(m: Mon, sec: number): void {
    m.stunUntil = Math.max(m.stunUntil, this.time + (m.def.boss ? sec * 0.25 : sec));
    m.windup = 0;
  }

  private applyFear(m: Mon, sec: number): void {
    if (m.def.boss) return;
    m.fearUntil = Math.max(m.fearUntil, this.time + sec);
    m.windup = 0;
  }

  /**
   * Trần Hưng Đạo: Thiên Quân Vạn Mã. Hai đợt quân hồn ma ào qua một dải rộng:
   * đợt đầu theo hướng chuột, đợt sau từ đầu bên kia quay trở lại.
   */
  private ultArmy(a: Actor): void {
    const dir = this.aimDir(a);
    const len = 46;
    const speed = 30;
    const width = 7;
    const start = a.pos.clone().addScaledVector(dir, -3).setY(0);
    const end = start.clone().addScaledVector(dir, len);
    this.ring(a.pos, 4, a.stats.general.ultColor, 0.5);
    this.addShake(0.5);
    this.sendArmy(a, start, dir, len, speed, width);
    this.later(1.0, () => this.sendArmy(a, end, dir.clone().multiplyScalar(-1), len, speed, width));
  }

  private sendArmy(a: Actor, start: THREE.Vector3, dir: THREE.Vector3, len: number, speed: number, width: number): void {
    this.fxArmy(start.x, start.z, dir.x, dir.z, speed, len, width);
    this.emit(['c', r2(start.x), r2(start.z), r2(dir.x), r2(dir.z), speed, len, width]);
    this.playSfx('boom');
    this.armies.push({ start: start.clone(), dir: dir.clone(), travelled: 0, len, width, speed, owner: a, hit: new Set() });
  }

  private updateArmies(dt: number): void {
    for (const ar of this.armies) {
      ar.travelled += ar.speed * dt;
      for (const m of this.mons) {
        if (m.dead || ar.hit.has(m)) continue;
        const rx = m.pos.x - ar.start.x;
        const rz = m.pos.z - ar.start.z;
        const along = rx * ar.dir.x + rz * ar.dir.z;
        const side = Math.abs(rx * ar.dir.z - rz * ar.dir.x);
        if (along > ar.travelled - 5 && along < ar.travelled + 2 && side < ar.width + m.def.radius) {
          ar.hit.add(m);
          this.damageMon(m, 140, new THREE.Vector3(m.pos.x - ar.dir.x * 2, 0, m.pos.z - ar.dir.z * 2), 11, ar.owner);
        }
      }
    }
    this.armies = this.armies.filter((ar) => ar.travelled < ar.len + 6);
  }

  /** Hình ảnh đạo quân hồn ma chạy qua. Chỉ là hiệu ứng, sát thương do chủ phòng tính. */
  private fxArmy(sx: number, sz: number, dx: number, dz: number, speed: number, len: number, width: number): void {
    const dir = new THREE.Vector3(dx, 0, dz).normalize();
    const side = new THREE.Vector3(-dir.z, 0, dir.x);
    const ghost = new THREE.MeshStandardMaterial({ color: 0xffe0a0, emissive: 0xff9a30, emissiveIntensity: 0.9, transparent: true, opacity: 0.0, flatShading: true });
    const rig = buildHuman(GENERALS.find((g) => g.id === 'tran_hung_dao')!.look);
    rig.group.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (mesh.isMesh) mesh.material = ghost;
    });
    rig.armR.rotation.x = -1.25;
    rig.armL.rotation.x = 0.5;
    const spear = new THREE.Group();
    spear.add(cyl(0.04, 0.04, 2.6, ghost, 0, 0, 1.0, 6).rotateX(Math.PI / 2));
    spear.add(cone(0.1, 0.4, ghost, 0, 0, 2.4, 6).rotateX(Math.PI / 2));
    rig.hand.add(spear);
    const perRow = 7;
    const rows = 3;
    const soldiers: { g: THREE.Object3D; off: THREE.Vector3; phase: number }[] = [];
    for (let r = 0; r < rows; r++) {
      for (let i = 0; i < perRow; i++) {
        const g = rig.group.clone();
        const lateral = (i - (perRow - 1) / 2) * ((width * 2) / (perRow - 1)) + (r % 2) * 0.9;
        const off = side.clone().multiplyScalar(lateral).addScaledVector(dir, -r * 2.0);
        g.scale.setScalar(1.2);
        g.rotation.y = Math.atan2(dir.x, dir.z);
        g.position.set(sx + off.x, 0, sz + off.z);
        this.scene.add(g);
        soldiers.push({ g, off, phase: Math.random() * 6 });
      }
    }
    const dur = len / speed + 0.5;
    this.fxs.push({
      t: 0,
      dur,
      update: (k) => {
        const el = k * dur;
        const travelled = Math.min(len, speed * el);
        ghost.opacity = 0.7 * Math.min(1, el / 0.15) * Math.min(1, (dur - el) / 0.4);
        for (const s of soldiers) {
          s.g.position.set(sx + s.off.x + dir.x * travelled, Math.abs(Math.sin(el * 15 + s.phase)) * 0.3, sz + s.off.z + dir.z * travelled);
        }
        if (Math.random() < 0.7) this.fxBurst(sx + dir.x * travelled + side.x * (Math.random() - 0.5) * width * 2, 0.4, sz + dir.z * travelled + side.z * (Math.random() - 0.5) * width * 2, 0xffb050, 1, 3, 0.7);
      },
      end: () => {
        for (const s of soldiers) this.scene.remove(s.g);
        ghost.dispose();
      },
    });
  }

  private applyBurn(m: Mon, sec: number, owner: Actor): void {
    m.burnUntil = Math.max(m.burnUntil, this.time + sec);
    m.burnOwner = owner;
    m.burnTick = Math.min(m.burnTick || this.time + 0.1, this.time + 0.1);
  }

  /**
   * Quang Trung và Trưng Trắc: cưỡi voi lao về hướng chuột. Việc di chuyển do máy người chơi xử lý,
   * ở đây chỉ tính sát thương dọc đường (xem updateSim).
   */
  private ultRush(a: Actor): void {
    const p = this.rushParams(a.stats.general.ultKind);
    a.chainUntil = this.time + p.dur + 0.1;
    a.chainHit.clear();
    a.chainNext = 0;
    a.mountUntil = this.time + p.dur + 0.35;
    a.invulnUntil = Math.max(a.invulnUntil, this.time + p.dur + 0.3);
    this.ring(a.pos, 4, a.stats.general.ultColor, 0.5);
    this.burst(a.pos.clone().setY(1), a.stats.general.ultColor, 24, 9, 1.1);
    this.addShake(0.5);
  }

  /** Lê Lợi: Bình Ngô Thuận Thiên. Rồng Vàng giội kim quang ba đợt, quái chết dưới chiêu rơi gấp đôi vàng. */
  private ultDragon(a: Actor): void {
    const r = 13;
    const c = a.pos.clone().setY(0);
    this.ring(c, 3, 0xffd24a, 0.5);
    this.fxDragon(c.x, c.z, r, 2.8);
    this.emit(['y', r2(c.x), r2(c.z), r, 2.8]);
    for (const delay of [0.95, 1.45, 1.95]) {
      this.later(delay, () => {
        this.ring(c, r, 0xffd24a, 0.7);
        this.ring(c, r * 0.55, 0xffffff, 0.5);
        this.burst(c.clone().setY(1.2), 0xffd24a, 40, 12, 1.1);
        this.addShake(0.7);
        this.playSfx('boom');
        for (const m of this.mons) {
          if (m.dead || m.pos.distanceTo(c) > r + m.def.radius) continue;
          m.goldMarkUntil = this.time + 8;
          this.damageMon(m, 130, c, 5, a);
        }
      });
    }
  }

  /** Trưng Trắc: Mê Linh Triệu Hồi. Cồng vang làm choáng quái, Voi Trắng và Trưng Nhị cùng ra trận. */
  private ultSummon(a: Actor): void {
    this.ring(a.pos, 11, 0xffe08a, 0.8);
    this.ring(a.pos, 6, 0xffffff, 0.5);
    this.burst(a.pos.clone().setY(1.5), 0xffe08a, 30, 9, 1);
    this.addShake(0.5);
    for (const m of this.mons) {
      if (m.dead || m.pos.distanceTo(a.pos) > 11 + m.def.radius) continue;
      this.damageMon(m, 40, a.pos, 8, a);
      this.applyStun(m, 1.5);
    }
    this.summons = this.summons.filter((s) => {
      if (s.owner !== a) return true;
      this.scene.remove(s.root, s.shadow);
      return false;
    });
    const side = (k: 0 | 1): void => {
      const pos = a.pos.clone().add(new THREE.Vector3(k === 0 ? -2.4 : 3.8, 0, k === 0 ? 0.5 : -0.5));
      const vis = this.makeSummonVisual(k);
      vis.root.position.copy(pos);
      this.summons.push({ ...vis, id: this.nextId++, owner: a, pos, yaw: a.yaw, shotAt: -9, phase: 0, life: 15, atkReady: this.time + 0.6 });
      this.ring(pos, 2.8, 0xf0a0d0, 0.6);
      this.burst(pos.clone().setY(1), 0xf0a0d0, 20, 7, 1);
      this.popAt(pos, k === 0 ? 'Trưng Nhị!' : 'Voi Trắng!', 'crit', 3);
    };
    side(0);
    side(1);
  }

  private makeSummonVisual(kind: 0 | 1): { root: THREE.Group; kind: 0 | 1; rig: Rig | null; legs: THREE.Group[]; shadow: THREE.Mesh } {
    const root = new THREE.Group();
    let rig: Rig | null = null;
    let legs: THREE.Group[] = [];
    if (kind === 0) {
      rig = buildHuman(TRUNG_NHI_LOOK);
      rig.hand.add(buildBow());
      rig.armR.rotation.x = -1.35;
      rig.armL.rotation.x = -1.2;
      rig.group.scale.setScalar(1.05);
      root.add(rig.group);
    } else {
      const el = buildElephant(true);
      el.scale.setScalar(1.15);
      legs = el.userData.legs as THREE.Group[];
      root.add(el);
    }
    const shadow = new THREE.Mesh(new THREE.CircleGeometry(kind === 0 ? 0.7 : 2, 20), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.25 }));
    shadow.rotation.x = -Math.PI / 2;
    this.scene.add(root, shadow);
    return { root, kind, rig, legs, shadow };
  }

  private animSummon(s: SummonLike, dt: number, moving: boolean): void {
    s.root.position.set(s.pos.x, 0, s.pos.z);
    s.root.rotation.y = s.yaw;
    s.shadow.position.set(s.pos.x, 0.05, s.pos.z);
    if (moving) s.phase += dt * (s.kind === 0 ? 11 : 8);
    const sw = moving ? Math.sin(s.phase) * 0.7 : 0;
    const act = this.time - s.shotAt < (s.kind === 0 ? 0.18 : 0.3);
    if (s.kind === 0 && s.rig) {
      s.rig.legL.rotation.x = sw;
      s.rig.legR.rotation.x = -sw;
      s.rig.armR.rotation.x = act ? -1.55 : -1.35;
      s.rig.armL.rotation.x = act ? -1.7 : -1.2;
      s.rig.group.position.y = Math.sin(this.time * 2.2 + s.pos.x) * 0.03;
    } else {
      s.legs.forEach((l, i) => (l.rotation.x = Math.sin(s.phase + (i % 2) * Math.PI) * 0.6));
      s.root.position.y = act ? 0.35 : Math.abs(Math.sin(s.phase)) * 0.08;
    }
  }

  /** Trưng Nhị đi theo chủ, bắn cung vào quái gần nhất. Voi Trắc xông vào quái gần, giậm đất gây sát thương lan và làm choáng. */
  private updateSummons(dt: number): void {
    const t = this.time;
    for (const s of this.summons) {
      s.life -= dt;
      if (s.life <= 0 || !s.owner.alive) {
        this.ring(s.pos, 2.2, 0xf0a0d0, 0.5);
        this.burst(s.pos.clone().setY(1), 0xf0a0d0, 16, 6, 0.9);
        this.scene.remove(s.root, s.shadow);
        s.life = -1;
        continue;
      }
      const o = s.owner;
      const before = s.pos.clone();
      const range = s.kind === 0 ? 24 : 12;
      let best: Mon | null = null;
      let bd = range * range;
      for (const m of this.mons) {
        if (m.dead) continue;
        const d2 = (m.pos.x - s.pos.x) ** 2 + (m.pos.z - s.pos.z) ** 2;
        if (d2 < bd) {
          bd = d2;
          best = m;
        }
      }
      if (s.kind === 0) {
        const fwd = new THREE.Vector3(Math.sin(o.yaw), 0, Math.cos(o.yaw));
        const right = new THREE.Vector3(Math.cos(o.yaw), 0, -Math.sin(o.yaw));
        const want = o.pos.clone().addScaledVector(right, -2.3).addScaledVector(fwd, -0.6);
        s.pos.lerp(want, 1 - Math.exp(-5 * dt));
        this.pushOutObstacles(s.pos, 0.4);
        if (best) {
          const dx = best.pos.x - s.pos.x;
          const dz = best.pos.z - s.pos.z;
          s.yaw = Math.atan2(dx, dz);
          if (t >= s.atkReady) {
            s.atkReady = t + 0.55;
            s.shotAt = t;
            const dir = new THREE.Vector3(dx, 0, dz).normalize();
            const from = s.pos.clone().setY(1.5).addScaledVector(dir, 0.9);
            this.addProj('arrow', 'water', from, dir.clone().multiplyScalar(32), 30, 0.5, 28, o);
          }
        } else s.yaw = o.yaw;
      } else {
        const goal = best ? best.pos : o.pos.clone().addScaledVector(new THREE.Vector3(Math.cos(o.yaw), 0, -Math.sin(o.yaw)), 3.8);
        const dx = goal.x - s.pos.x;
        const dz = goal.z - s.pos.z;
        const dist = Math.hypot(dx, dz);
        if (dist > (best ? 2.2 : 0.6)) {
          s.pos.x += (dx / dist) * 11 * dt;
          s.pos.z += (dz / dist) * 11 * dt;
          s.yaw = Math.atan2(dx, dz);
        }
        this.pushOutObstacles(s.pos, 1.2);
        if (best && t >= s.atkReady && dist < 3.6) {
          s.atkReady = t + 0.9;
          s.shotAt = t;
          const c = s.pos.clone().setY(0);
          this.ring(c, 4.2, 0xfff0c0, 0.4);
          this.burst(c.clone().setY(0.4), 0xd8c8a0, 14, 6, 0.7);
          this.addShake(0.3);
          for (const m of this.mons) {
            if (m.dead || m.pos.distanceTo(c) > 4.2 + m.def.radius) continue;
            this.damageMon(m, 55, c, 7, o);
            this.applyStun(m, 0.7);
          }
        }
      }
      this.animSummon(s, dt, before.distanceTo(s.pos) / Math.max(dt, 0.001) > 0.6);
    }
    this.summons = this.summons.filter((s) => s.life > 0);
  }

  /** Hình ảnh Rồng Vàng uốn lượn giáng xuống và Thuận Thiên Kiếm trên trời. Chỉ là hiệu ứng. */
  private fxDragon(x: number, z: number, r: number, dur: number): void {
    const gold = new THREE.MeshStandardMaterial({ color: 0xffd24a, emissive: 0xffa010, emissiveIntensity: 1.1, transparent: true, opacity: 0, flatShading: true });
    const segs = 18;
    const body: THREE.Mesh[] = [];
    for (let i = 0; i < segs; i++) {
      const s = sph(0.75 - i * 0.027, gold, 0, 0, 0, 1, 1, 1, 10);
      s.castShadow = false;
      body.push(s);
      this.scene.add(s);
    }
    const head = new THREE.Group();
    head.add(box(0.9, 0.7, 1.2, gold, 0, 0, 0.2));
    head.add(box(0.6, 0.3, 0.7, gold, 0, -0.15, 0.95));
    for (const sx of [-1, 1]) {
      head.add(cone(0.1, 0.8, gold, sx * 0.3, 0.55, -0.1, 5).rotateX(-0.6));
      head.add(cyl(0.025, 0.025, 1.6, gold, sx * 0.35, -0.1, 1.3, 4).rotateX(Math.PI / 2 - 0.2));
      head.add(sph(0.09, new THREE.MeshBasicMaterial({ color: 0xffffff }), sx * 0.35, 0.15, 0.7, 1, 1, 1, 6));
    }
    this.scene.add(head);
    const beam = new THREE.Mesh(
      new THREE.CylinderGeometry(r * 0.45, r * 0.45, 24, 28, 1, true),
      new THREE.MeshBasicMaterial({ color: 0xffe080, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending }),
    );
    beam.position.set(x, 12, z);
    this.scene.add(beam);
    const sword = new THREE.Group();
    sword.add(box(0.16, 2.6, 0.05, gold, 0, 1.3, 0));
    sword.add(cone(0.11, 0.5, gold, 0, 2.85, 0, 4));
    sword.add(box(0.8, 0.12, 0.12, gold, 0, 0.05, 0));
    sword.position.set(x, 4.2, z);
    this.scene.add(sword);
    const pathAt = (tt: number, spin: number): THREE.Vector3 => {
      const th = tt * Math.PI * 5 + spin;
      const rho = r * 0.85 * (1 - 0.35 * Math.min(1, tt));
      return new THREE.Vector3(x + Math.cos(th) * rho, 14 * Math.pow(1 - Math.min(1, tt), 1.7) + 1.8 + Math.sin(th * 2) * 0.6, z + Math.sin(th) * rho);
    };
    this.fxs.push({
      t: 0,
      dur,
      update: (k) => {
        const el = k * dur;
        const tHead = Math.min(1, el / 1.5);
        const spin = Math.max(0, el - 1.5) * 2.2;
        gold.opacity = 0.85 * Math.min(1, el / 0.3) * Math.min(1, (dur - el) / 0.5);
        (beam.material as THREE.MeshBasicMaterial).opacity = 0.2 * Math.min(1, el / 0.4) * Math.min(1, (dur - el) / 0.6);
        for (let i = 0; i < segs; i++) {
          body[i].position.copy(pathAt(Math.max(0, tHead - i * 0.03), spin));
        }
        const hp = pathAt(tHead, spin);
        head.position.copy(hp);
        head.lookAt(pathAt(Math.min(1, tHead + 0.02), spin + 0.06));
        sword.position.y = 4.2 + Math.sin(el * 3) * 0.25;
        sword.rotation.y = el * 2;
      },
      end: () => {
        for (const s of body) this.scene.remove(s);
        this.scene.remove(head, beam, sword);
        gold.dispose();
      },
    });
  }

  /** Bà Triệu: Đạp Luồng Sóng Dữ (Cuồng Nộ Giáp Vàng). */
  private ultRage(a: Actor): void {
    a.rageUntil = this.time + 10;
    a.invulnUntil = Math.max(a.invulnUntil, this.time + 0.5);
    this.ring(a.pos, 6, a.stats.general.ultColor, 0.7);
    this.ring(a.pos, 3, 0xffffff, 0.4);
    this.burst(a.pos.clone().setY(1), 0xf0d030, 36, 9, 1);
    this.addShake(0.5);
    this.popAt(a.pos, 'Cuồng nộ!', 'crit', 2.8);
  }

  /** Sóng gió lốc xoáy mỗi lần Bà Triệu đánh trong lúc Cuồng Nộ. */
  private whirlwind(a: Actor): void {
    this.ring(a.pos, 8, 0xf0d030, 0.55);
    this.ring(a.pos, 4.5, 0xffffff, 0.35);
    this.burst(a.pos.clone().setY(1.2), 0xf0e080, 14, 9, 0.9);
    for (const m of this.mons) {
      if (!m.dead && m.pos.distanceTo(a.pos) < 8 + m.def.radius) this.damageMon(m, a.stats.weapon.dmg * 0.55, a.pos, 6, a);
    }
  }

  /** Ngô Quyền: Trận Đồ Bộc Phá. Giậm chân, bùn lan ra và các cây cọc nhọn trồi lên khắp vùng. */
  private ultSwamp(a: Actor): void {
    const r = 7.5;
    // Đầm lầy rơi đúng điểm chuột chỉ, trong tầm tối đa SWAMP_RANGE tính từ người chơi
    const center = this.swampCenter(a);
    const face = new THREE.Vector3(center.x - a.pos.x, 0, center.z - a.pos.z);
    if (face.lengthSq() > 0.25) a.yaw = Math.atan2(face.x, face.z);
    a.attackAnim = { t: 0, dur: 0.6, kind: 'stomp' };
    this.emit(['a', a.id, 'stomp', 0.6, 0]);
    this.later(0.3, () => {
      const id = this.nextId++;
      const group = buildSwamp(id, r);
      group.position.set(center.x, 0, center.z);
      this.scene.add(group);
      animateSwamp(group, 0, 10);
      this.clouds.push({ id, pos: center.clone(), r, t: 10, tick: 0.35, dmg: 55, owner: a, mesh: group, swamp: true });
      this.ring(center, r, 0x7a6a3a, 0.7);
      this.ring(center, r * 0.55, 0x4aa8e8, 0.6);
      this.burst(center.clone().setY(0.4), 0x5a4a2a, 36, 9, 1.1);
      this.burst(center.clone().setY(0.4), 0x4aa8e8, 16, 7, 0.8);
      this.addShake(0.7);
      this.playSfx('boom');
    });
  }

  /** Điểm rơi của chiêu Ngô Quyền: vị trí chuột, kẹp trong tầm với từ chân người chơi. */
  private swampCenter(a: Actor): THREE.Vector3 {
    const v = new THREE.Vector3(a.aim.x - a.pos.x, 0, a.aim.z - a.pos.z);
    const len = v.length();
    if (len > SWAMP_RANGE) v.multiplyScalar(SWAMP_RANGE / len);
    const c = new THREE.Vector3(a.pos.x + v.x, 0, a.pos.z + v.z);
    const rr = Math.hypot(c.x, c.z);
    const lim = ARENA_R - 3;
    if (rr > lim) c.multiplyScalar(lim / rr);
    return c;
  }

  /** Vòng chỉ định chiêu: chỉ hiển thị khi người chơi chủ động bật ngắm kỹ năng, không tự hiện vĩnh viễn trên sàn. */
  private updateAimMarker(): void {
    if (this.aimMarker) this.aimMarker.visible = false;
  }

  /**
   * Nguyễn Trãi: Suối Côn Sơn Bào Mòn.
   * Nguyễn Trãi vung quạt trúc niệm thơ, từ chân tuôn trào dòng suối ngọc xanh biếc cuộn sóng,
   * bọt nước trắng và sương mờ dài 22m rộng 6.5m tồn tại 4.5 giây:
   * liên tục gây sát thương, làm chậm 60% và ĐẨY LÙI MẠNH MẼ quái vật dọc theo dòng nước.
   */
  private ultConSonStream(a: Actor): void {
    const dir = this.aimDir(a);
    const len = 22;
    const width = 6.5;
    const dur = 4.5;
    const start = a.pos.clone().setY(0);

    const group = new THREE.Group();
    group.position.set(start.x, 0, start.z);
    group.rotation.y = Math.atan2(-dir.z, dir.x);

    // 1. Lòng suối ngọc Côn Sơn
    const riverbed = new THREE.Mesh(
      new THREE.PlaneGeometry(len, width + 0.4),
      new THREE.MeshBasicMaterial({ color: 0x064e3b, side: THREE.DoubleSide }),
    );
    riverbed.rotation.x = -Math.PI / 2;
    riverbed.position.set(len / 2, 0.08, 0);

    // 2. Mặt nước ngọc bích phát sáng đa tầng với Shader động
    const waterMat = createWaterShaderMaterial({
      colorDeep: 0x064e3b,
      colorShallow: 0x2dd4bf,
      foamColor: 0xf0fdfa,
      speed: 3.2,
      waveFrequency: 6.0,
      waveHeight: 0.08,
      opacity: 0.85,
    });
    const waterSurface = new THREE.Mesh(
      new THREE.PlaneGeometry(len, width, 40, 20),
      waterMat,
    );
    waterSurface.rotation.x = -Math.PI / 2;
    waterSurface.position.set(len / 2, 0.12, 0);

    const waterCurrent = new THREE.Mesh(
      new THREE.PlaneGeometry(len, width * 0.75),
      new THREE.MeshBasicMaterial({ color: 0x5eead4, transparent: true, opacity: 0.5, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending }),
    );
    waterCurrent.rotation.x = -Math.PI / 2;
    waterCurrent.position.set(len / 2, 0.14, 0);

    // 3. Hai dải bọt sóng trắng cuộn dọc hai bên bờ suối
    const foamLeft = new THREE.Mesh(
      new THREE.PlaneGeometry(len, 0.65),
      new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.85, side: THREE.DoubleSide, depthWrite: false }),
    );
    foamLeft.rotation.x = -Math.PI / 2;
    foamLeft.position.set(len / 2, 0.15, -width / 2 + 0.3);

    const foamRight = new THREE.Mesh(
      new THREE.PlaneGeometry(len, 0.65),
      new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.85, side: THREE.DoubleSide, depthWrite: false }),
    );
    foamRight.rotation.x = -Math.PI / 2;
    foamRight.position.set(len / 2, 0.15, width / 2 - 0.3);

    group.add(riverbed, waterSurface, waterCurrent, foamLeft, foamRight);

    // 4. Màn sương Côn Sơn huyền ảo bốc lên từ mặt suối (dùng soft smoke sprite thay vì quả cầu)
    const mistMat = new THREE.MeshBasicMaterial({
      map: getSmokePuffTex(),
      color: 0xccfbf1,
      transparent: true,
      opacity: 0.35,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
    });
    for (let sm = 0; sm < 14; sm++) {
      const mistMesh = new THREE.Mesh(new THREE.PlaneGeometry(2.4 + Math.random() * 0.8, 2.4 + Math.random() * 0.8), mistMat);
      mistMesh.rotation.x = -Math.PI / 2;
      mistMesh.position.set(2 + sm * 1.5, 0.4 + Math.random() * 0.4, (Math.random() - 0.5) * (width - 1.5));
      group.add(mistMesh);
    }

    // 5. Cánh hoa sen hồng và lá trúc xanh trôi dạt cuồn cuộn theo dòng nước
    const petalTex = getSpiritPetalTex();
    const lotusMat = new THREE.MeshBasicMaterial({ map: petalTex, color: 0xf472b6, transparent: true, opacity: 0.9, side: THREE.DoubleSide, depthWrite: false });
    const leafMat = new THREE.MeshBasicMaterial({ map: petalTex, color: 0x34d399, transparent: true, opacity: 0.9, side: THREE.DoubleSide, depthWrite: false });
    const petals: { m: THREE.Mesh; offAlong: number; offSide: number; speed: number; rotSpd: number }[] = [];
    for (let p = 0; p < 24; p++) {
      const isLotus = p % 2 === 0;
      const petMesh = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.35), isLotus ? lotusMat : leafMat);
      petMesh.rotation.x = -Math.PI / 2;

      const offAlong = Math.random() * len;
      const offSide = (Math.random() - 0.5) * (width - 1.2);
      petMesh.position.set(offAlong, 0.18, offSide);
      group.add(petMesh);

      petals.push({
        m: petMesh,
        offAlong,
        offSide,
        speed: 13 + Math.random() * 5,
        rotSpd: (Math.random() - 0.5) * 5,
      });
    }

    this.scene.add(group);
    this.addShake(0.5);
    this.ring(start, 5.0, 0x2dd4bf, 0.8);
    this.burst(start.clone().setY(1.0), 0x2dd4bf, 36, 10, 1.2);

    this.conSonStreams.push({
      start,
      dir,
      len,
      width,
      t: dur,
      dur,
      tick: 0,
      owner: a,
      group,
      waterSurface,
      foamLeft,
      foamRight,
      petals,
    });
  }

  private updateConSonStreams(dt: number): void {
    for (const s of this.conSonStreams) {
      s.t -= dt;
      s.tick -= dt;
      const fade = Math.min(1, s.t / 0.5);

      // Hoạt ảnh mặt nước và bọt sóng
      const pulse = 1 + Math.sin(this.time * 12) * 0.12;
      s.foamLeft.scale.set(1, pulse, 1);
      s.foamRight.scale.set(1, pulse, 1);
      if (s.waterSurface.material instanceof THREE.ShaderMaterial) {
        s.waterSurface.material.uniforms.uTime.value = this.time;
        s.waterSurface.material.uniforms.uOpacity.value = 0.85 * fade;
      } else {
        (s.waterSurface.material as THREE.MeshBasicMaterial).opacity = 0.65 * fade;
      }
      (s.foamLeft.material as THREE.MeshBasicMaterial).opacity = 0.85 * fade;
      (s.foamRight.material as THREE.MeshBasicMaterial).opacity = 0.85 * fade;

      // Cánh hoa và lá trúc cuốn trôi theo dòng nước
      for (const p of s.petals) {
        p.offAlong = (p.offAlong + p.speed * dt) % s.len;
        const wobble = Math.sin(this.time * 6 + p.offAlong) * 0.35;
        p.m.position.set(p.offAlong, 0.18 + Math.sin(this.time * 8 + p.offAlong) * 0.04, p.offSide + wobble);
        p.m.rotation.y += p.rotSpd * dt;
        (p.m.material as THREE.MeshBasicMaterial).opacity = fade;
      }

      // Tác dụng lên quái vật trong dòng suối: Sát thương + Làm chậm + ĐẨY LÙI MẠNH MẼ
      const doTickDamage = s.tick <= 0;
      for (const m of this.mons) {
        if (m.dead) continue;
        const rx = m.pos.x - s.start.x;
        const rz = m.pos.z - s.start.z;
        const along = rx * s.dir.x + rz * s.dir.z;
        const side = Math.abs(rx * s.dir.z - rz * s.dir.x);

        if (along >= -0.5 && along <= s.len + 0.5 && side <= s.width / 2 + m.def.radius) {
          // 1. ĐẨY LÙI MẠNH MẼ: Dòng nước cuộn trào quét sạch quái vật về phía sau!
          const pushStep = 15.0 * dt;
          m.pos.addScaledVector(s.dir, pushStep);
          const rr = Math.hypot(m.pos.x, m.pos.z);
          const lim = ARENA_R - 1.5;
          if (rr > lim) m.pos.multiplyScalar(lim / rr);

          // 2. Làm chậm 60%
          this.applySlow(m, 0.35, 0.4);

          // 3. Bào mòn gây sát thương
          if (doTickDamage) {
            this.damageMon(m, 38, m.pos, 0.2, s.owner);
            if (Math.random() < 0.25) this.fxBurst(m.pos.x, 0.5, m.pos.z, 0x5eead4, 2, 3, 0.5);
          }
        }
      }

      if (doTickDamage) s.tick = 0.28;

      if (s.t <= 0) {
        this.scene.remove(s.group);
        s.group.traverse((o) => {
          const mesh = o as THREE.Mesh;
          if (mesh.geometry) mesh.geometry.dispose();
          if (mesh.material) {
            if (Array.isArray(mesh.material)) mesh.material.forEach((m) => m.dispose());
            else mesh.material.dispose();
          }
        });
      }
    }
    this.conSonStreams = this.conSonStreams.filter((s) => s.t > 0);
  }

  /** Nguyễn Trãi: Bình Ngô Đại Cáo. Hỗ trợ cả đội, làm quái hoảng sợ. */
  private ultProclaim(a: Actor): void {
    const r = 16;
    this.ring(a.pos, r, 0x9ad0ff, 0.9);
    this.ring(a.pos, r * 0.6, 0xffffff, 0.7);
    this.burst(a.pos.clone().setY(1.4), 0x9ad0ff, 36, 11, 1.1);
    this.addShake(0.5);
    for (const pl of this.actors.values()) {
      if (!pl.alive || pl.pos.distanceTo(a.pos) > r) continue;
      pl.dmgBuffUntil = this.time + 8;
      pl.guardUntil = Math.max(pl.guardUntil, this.time + 3);
      const heal = Math.round(pl.stats.maxHp * 0.15);
      pl.hp = Math.min(pl.stats.maxHp, pl.hp + heal);
      this.popAt(pl.pos, `+${heal}`, 'heal', 2.6);
      this.ring(pl.pos, 2.4, 0x9ad0ff, 0.6);
    }
    for (const m of this.mons) {
      if (m.dead || m.pos.distanceTo(a.pos) > r + m.def.radius) continue;
      this.damageMon(m, 110, a.pos, 6, a);
      if (!m.dead) {
        this.applyFear(m, 2.5);
        this.applySlow(m, 4, 0.6);
      }
    }
  }

  /** Phù Đổng Thiên Vương: Nhổ Tre Đằng Ngà. Ba vòng quật rồi một đòn cuối làm choáng. */
  private ultBamboo(a: Actor): void {
    a.attackAnim = { t: 0, dur: 0.6, kind: 'slam' };
    this.emit(['a', a.id, 'slam', 0.6, 0]);
    this.mapFx('bamboo', a.pos.x, a.pos.z, 1.4);
    const R = 11;
    for (let i = 0; i < 3; i++) {
      this.later(0.25 + i * 0.45, () => {
        this.ring(a.pos, R, 0x8ac84a, 0.55);
        this.ring(a.pos, R * 0.6, 0xe8ffc8, 0.4);
        this.burst(a.pos.clone().setY(1.2), 0x8ac84a, 22, 10, 1);
        this.addShake(0.5);
        this.playSfx('boom');
        for (const m of this.mons) {
          if (!m.dead && m.pos.distanceTo(a.pos) < R + m.def.radius) this.damageMon(m, 150, a.pos, 14, a);
        }
      });
    }
    this.later(1.75, () => {
      this.ring(a.pos, 14, 0xb8e060, 0.8);
      this.burst(a.pos.clone().setY(0.6), 0xb8e060, 40, 12, 1.2);
      this.addShake(0.8);
      this.playSfx('boom');
      for (const m of this.mons) {
        if (m.dead || m.pos.distanceTo(a.pos) > 14 + m.def.radius) continue;
        this.damageMon(m, 200, a.pos, 18, a);
        if (!m.dead) this.applyStun(m, 1.5);
      }
    });
  }

  /** Lý Thường Kiệt: Nam Quốc Sơn Hà. */
  private ultPoem(a: Actor): void {
    const base = 150 * a.stats.dmgMult;
    for (let i = 0; i < 3; i++) {
      this.later(i * 0.55, () => {
        this.ring(a.pos, 30, 0xf0d070, 0.9);
        this.ring(a.pos, 20, 0xc8b8ff, 0.8);
        this.ring(a.pos, 10, 0xffffff, 0.7);
        this.burst(a.pos.clone().setY(1.2), 0xf0d070, 30, 11, 1);
        this.addShake(0.6);
        this.playSfx('boom');
        for (const m of this.mons) {
          if (m.dead || m.pos.distanceTo(a.pos) > 34) continue;
          this.damageMon(m, base, a.pos, 2, a, false);
          if (i === 0) this.applyFear(m, 5);
        }
      });
    }
  }

  private moveInput(): THREE.Vector3 {
    const v = new THREE.Vector3();
    if (typing()) return v;

    const k = this.keys;
    if (k.has('KeyW') || k.has('ArrowUp')) v.z -= 1;
    if (k.has('KeyS') || k.has('ArrowDown')) v.z += 1;
    if (k.has('KeyA') || k.has('ArrowLeft')) v.x -= 1;
    if (k.has('KeyD') || k.has('ArrowRight')) v.x += 1;
    if (touch.enabled && (touch.moveX !== 0 || touch.moveY !== 0)) {
      v.x += touch.moveX;
      v.z += touch.moveY;
    }
    return v.lengthSq() > 0 ? v.normalize() : v;
  }

  private pushOutObstacles(p: THREE.Vector3, r: number): void {
    for (const o of this.world.obstacles) {
      const dx = p.x - o.x;
      const dz = p.z - o.z;
      const d = Math.hypot(dx, dz);
      const min = o.r + r;
      if (d < min && d > 0.0001) {
        p.x = o.x + (dx / d) * min;
        p.z = o.z + (dz / d) * min;
      }
    }
    const rr = Math.hypot(p.x, p.z);
    const lim = ARENA_R - r;
    if (rr > lim) {
      p.x = (p.x / rr) * lim;
      p.z = (p.z / rr) * lim;
    }
  }

  /* ---------- Tấn công ---------- */

  /** Cộng tiến độ nhiệm vụ ngày cho người chơi này. */
  private qAdd(stat: string, n = 1): void {
    if (!this.save) return;
    questAdd(this.save, stat, n);
    this.dirty += 0.1;
  }

  /** Mở khóa thành tích đạt được. */
  private achieve(): void {
    if (this.save && checkAchievements(this.save).length > 0) this.flushSave();
  }

  private has(h: string): boolean {
    return this.hazards.includes(h);
  }

  /** Chủ phòng và chơi một mình: từ màn 21 mỗi màn thêm một mối nguy mới. */
  private addHazard(): void {
    const left = HAZARDS.filter((h) => !this.has(h.id));
    if (left.length === 0) return;
    const h = left[Math.floor(Math.random() * left.length)];
    this.hazards.push(h.id);
    this.hud.setHazards(hazardText(this.hazards));
    this.emit(['H', ...this.hazards]);
    this.bannerAll(`Mối nguy: ${h.name}`, `${h.desc} Vàng thưởng tăng 10%.`);
  }

  /** Mã combo đang có hiệu lực của người chơi (tướng và vũ khí hợp vía), hoặc null. */
  private combo(a: Actor | null): string | null {
    return a ? (comboFor(a.stats.general.id, a.stats.weapon.id)?.id ?? null) : null;
  }

  /** Vũ khí đã nâng tới cấp tối đa thì tiến hóa. */
  private evo(a: Actor | null): boolean {
    return !!a && a.stats.weaponLevel >= MAX_WEAPON_LEVEL;
  }

  private dealMultiplier(owner: Actor | null): number {
    const o = owner ?? this.me;
    const k = o.stats.weapon.kind;
    const ranged = k === 'boomerang' || k === 'pierce';
    return o.stats.dmgMult * (ranged ? o.stats.projMult : 1) * (o.dmgBuffUntil > this.time ? 1.25 : 1);
  }

  private damageMon(m: Mon, base: number, from: THREE.Vector3, knock: number, owner: Actor | null, useStats = true): void {
    if (m.dead) return;
    const o = owner ?? this.me;
    let dmg = base * (useStats ? this.dealMultiplier(owner) : 1) * (0.9 + Math.random() * 0.2);
    const crit = useStats && Math.random() < o.stats.crit;
    if (crit) dmg *= (o.stats.critDmgMul ?? 2);
    if (m.affix === 4) dmg *= 0.65;
    dmg = Math.max(1, Math.round(dmg));
    m.hp -= dmg;
    if (o.alive && (o.stats.lifesteal ?? 0) > 0 && Math.random() < 0.45) {
      const heal = Math.max(1, Math.round(dmg * o.stats.lifesteal));
      o.hp = Math.min(o.stats.maxHp, o.hp + heal);
      this.popAt(o.pos, `+${heal}`, 'heal', 2.0);
    }
    m.flashUntil = this.time + 0.09;
    if (knock > 0) {
      const k = new THREE.Vector3().subVectors(m.pos, from).setY(0);
      if (k.lengthSq() < 0.0001) k.set(Math.random() - 0.5, 0, Math.random() - 0.5);
      k.normalize().multiplyScalar(knock * (m.def.boss ? 0.15 : (m.def.ai ?? m.def.id) === 'franken' ? 0.5 : 1));
      m.kb.add(k);
    }
    this.popAt(m.pos, crit ? `${dmg}!` : String(dmg), crit ? 'crit' : 'dmg', 2.2 * (m.def.boss ? 1.8 : 1));
    if (crit && o.local) {
      this.qAdd('crit');
      this.addShake(0.14);
      if (this.role === 'solo') this.hitStop = Math.max(this.hitStop, 0.055);
    }
    this.burst(m.pos.clone().setY(1.2), crit ? 0xffd24a : 0xffffff, crit ? 8 : 4, 4, 0.6);
    this.playSfx('hit');
    this.showBar(m);
    if (m.hp <= 0) this.killMon(m, o);
  }

  private showBar(m: Mon): void {
    if (m.def.boss) return;
    if (!m.bar) {
      const grp = new THREE.Group();
      const bg = new THREE.Mesh(this.barGeo, this.barBg);
      const fg = new THREE.Mesh(this.barGeo, this.barFg);
      bg.renderOrder = 10;
      fg.renderOrder = 11;
      fg.position.z = 0.01;
      grp.add(bg, fg);
      grp.position.y = 2.5;
      m.rig.group.add(grp);
      m.bar = { grp, fg };
    }
    const k = Math.max(0, m.hp / m.maxHp);
    m.bar.fg.scale.x = Math.max(0.001, k);
    m.bar.fg.position.x = -0.7 * (1 - k);
  }

  private killMon(m: Mon, owner: Actor): void {
    if (m.dead) return;
    m.dead = true;
    this.kills++;
    if (owner.local) this.save.kills++;
    this.hud.setKills(this.kills);
    this.playSfx('boom');
    const def = m.def;
    this.qAdd('kills');
    this.qAdd(`kill:${def.id}`);
    if (m.affix) {
      this.qAdd('elite');
      this.save.totals.elites++;
    }
    if (def.boss) {
      this.save.totals.bosses++;
      if (def.id === 'colossus') this.save.totals.titans++;
      this.achieve();
    }
    this.grantXp(owner, (def.boss ? 25 : Math.max(1, Math.round(def.hp / 35))) * (m.affix ? 2 : 1));
    if (m.affix === 2) {
      const at = m.pos.clone();
      this.ring(at, 4, 0xff8a20, 0.5);
      this.burst(at.clone().setY(0.8), 0xff8a20, 24, 9, 1.1);
      this.addShake(0.4);
      for (const pl of this.actors.values()) {
        if (pl.alive && pl.pos.distanceTo(at) < 4) this.hurtActor(pl, def.atk * m.dmgMul * 1.8, at);
      }
    }
    const color = def.color ?? (def.id === 'ghost' ? 0xaaccff : def.id === 'zombie' ? 0x7ea36e : def.id === 'dragon' ? 0xff6a2a : def.id === 'vampire' ? 0x901020 : 0xe8e0c8);
    this.burst(m.pos.clone().setY(1), color, def.boss ? 60 : 14, def.boss ? 12 : 6, def.boss ? 1.6 : 1);
    if (def.boss) this.addShake(1);
    else if (m.affix || def.radius >= 0.95) this.addShake(0.28);
    if (this.role === 'solo' && owner.local && (def.boss || m.affix || def.radius >= 0.95)) this.hitStop = Math.max(this.hitStop, def.boss ? 0.16 : 0.08);
    this.shrinkAway(m);
    const waveGold = 1 + 0.05 * (this.wave - 1);
    const base = def.gold[0] + Math.random() * (def.gold[1] - def.gold[0]);
    const dbl = m.goldMarkUntil > this.time ? 2 : 1;
    if (dbl > 1) this.popAt(m.pos, 'Vàng x2', 'crit', 3.2);
    const total = Math.max(1, Math.round(base * waveGold * owner.stats.goldMult * dbl * (m.affix ? 1.8 : 1) * (1 + 0.1 * this.hazards.length)));
    const n = Math.max(1, Math.min(def.boss ? 24 : 8, Math.round(total / (def.boss ? 10 : 4))));
    for (let i = 0; i < n; i++) this.spawnCoin(m.pos, Math.ceil(total / n));
    if (!this.has('kiet_suc') && (def.boss || Math.random() < 0.07)) this.spawnHeal(m.pos);
  }

  private shrinkAway(m: Mon): void {
    const g = m.rig.group;
    const dissolveMats: THREE.ShaderMaterial[] = [];
    const edgeCol = m.def.boss ? 0xff0044 : (m.affix ? 0xa855f7 : 0xff5500);

    g.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const meshChild = child as THREE.Mesh;
        let baseCol = 0x555555;
        if (meshChild.material) {
          const mCol = (meshChild.material as any).color;
          if (mCol && typeof mCol.getHex === 'function') {
            baseCol = mCol.getHex();
          }
        }
        const dMat = createDissolveMaterial(baseCol, edgeCol);
        dissolveMats.push(dMat);
        meshChild.material = dMat;
      }
    });

    this.fxs.push({
      t: 0,
      dur: 0.65,
      update: (k) => {
        for (const mat of dissolveMats) {
          mat.uniforms.uProgress.value = k * 1.05;
        }
        // Tro than hồng phát sáng bay lượn từ xác quái
        if (Math.random() < 0.65) {
          const emberPos = m.pos.clone().add(new THREE.Vector3(
            (Math.random() - 0.5) * 1.2,
            k * 1.6 + Math.random() * 0.4,
            (Math.random() - 0.5) * 1.2,
          ));
          this.burst(emberPos, edgeCol, 2, 1.8, 0.4);
        }
      },
      end: () => {
        for (const mat of dissolveMats) {
          mat.dispose();
        }
        this.scene.remove(g);
      },
    });
  }

  private spawnCoin(at: THREE.Vector3, value: number): void {
    this.dropSystem.spawnCoin(at, value);
  }

  private spawnHeal(at: THREE.Vector3): void {
    this.dropSystem.spawnHeal(at);
  }

  private animFor(kind: string): { kind: string; dur: number; spin: boolean } {
    switch (kind) {
      case 'slam': return { kind: 'slam', dur: 0.4, spin: false };
      case 'spin': return { kind: 'spin', dur: 0.55, spin: true };
      case 'bonk': return { kind: 'slam', dur: 0.32, spin: false };
      case 'boomerang': return { kind: 'throw', dur: 0.22, spin: false };
      case 'pierce': return { kind: 'throw', dur: 0.24, spin: false };
      default: return { kind: 'throw', dur: 0.3, spin: false };
    }
  }

  /** Máy khách: chỉ chạy hoạt ảnh và tính hồi chiêu cục bộ, việc gây sát thương do chủ phòng xử lý. */
  private clientAttack(a: Actor): void {
    if (this.time < a.atkReady || a.dashT > 0 || a.spinT > 0 || !a.alive) return;
    const w = a.stats.weapon;
    a.atkReady = this.time + (w.cd * (w.id === 'muoi_canh' && this.evo(a) ? 0.8 : 1)) / a.stats.atkSpeed;
    const d = this.aimDir(a);
    a.yaw = Math.atan2(d.x, d.z);
    const an = this.animFor(w.kind);
    a.attackAnim = { t: 0, dur: an.dur, kind: an.kind };
    if (an.spin) a.spinT = an.dur;
    sfx.swing();
  }

  /** Chủ phòng và chơi một mình: người chơi a tung đòn đánh thường. */
  private tryAttack(a: Actor): void {
    if (this.time < a.atkReady || a.dashT > 0 || a.spinT > 0 || !a.alive) return;
    const w = a.stats.weapon;
    a.atkReady = this.time + (w.cd * (w.id === 'muoi_canh' && this.evo(a) ? 0.8 : 1)) / a.stats.atkSpeed;
    const d = this.aimDir(a);
    a.yaw = Math.atan2(d.x, d.z);
    sfx.swing();
    const an = this.animFor(w.kind);
    a.attackAnim = { t: 0, dur: an.dur, kind: an.kind };
    if (an.spin) a.spinT = an.dur;
    this.emit(['a', a.id, an.kind, an.dur, an.spin ? 1 : 0]);
    if (a.rageUntil > this.time) this.later(0.12, () => this.whirlwind(a));

    const origin = a.pos.clone();
    switch (w.kind) {
      case 'slam': {
        // Ghế nhựa: đập xuống đất, quét rộng phía trước, làm choáng
        const big = this.evo(a) ? 1.25 : 1;
        const stunSec = this.combo(a) === 'ghe_nam_quoc' ? 1.6 : 1;
        this.later(0.2, () => {
          const dir = new THREE.Vector3(Math.sin(a.yaw), 0, Math.cos(a.yaw));
          const p = origin.clone().addScaledVector(dir, 2.3);
          this.ring(p, w.radius * big, 0xe03030, 0.45);
          this.ring(p, w.radius * big * 0.55, 0xffffff, 0.35);
          this.burst(p.clone().setY(0.5), 0xd8262a, 16, 7, 1);
          this.burst(p.clone().setY(0.3), 0xcdbf9a, 14, 5, 1);
          this.addShake(0.5);
          this.playSfx('boom');
          for (const m of this.mons) {
            if (m.dead) continue;
            const v = new THREE.Vector3().subVectors(m.pos, origin).setY(0);
            const dist = v.length();
            if (dist > w.range * big + m.def.radius + 0.4) continue;
            const ang = Math.abs(Math.atan2(v.x, v.z) - Math.atan2(dir.x, dir.z));
            const wrap = Math.min(ang, Math.PI * 2 - ang);
            if (wrap < Math.PI * 0.6 || dist < 1.8) {
              this.damageMon(m, w.dmg, origin, w.knock, a);
              if (!m.dead) this.applyStun(m, stunSec);
            }
          }
        });
        break;
      }
      case 'spin': {
        // Chổi chít: quét vòng tròn, đẩy lùi và làm chậm; tiến hóa thì quét thêm vòng nữa
        const R = w.radius * (this.combo(a) === 'quet_giap_vang' ? 1.15 : 1) * (this.evo(a) ? 1.2 : 1);
        const slowMul = this.combo(a) === 'quet_giap_vang' ? 0.35 : 0.5;
        const sweep = (dmgMul: number): void => {
          this.ring(a.pos, R, 0xd8b860, 0.5);
          this.ring(a.pos, R * 0.65, 0xf2e3a0, 0.4);
          // bụi và rơm tung theo đường quét của đầu chổi
          for (let i = 0; i < 12; i++) {
            this.later(i * 0.03, () => {
              const ang = a.yaw + (i / 12) * Math.PI * 2;
              const at = a.pos.clone().add(new THREE.Vector3(Math.sin(ang), 0, Math.cos(ang)).multiplyScalar(R * 0.72));
              this.burst(at.setY(0.4), i % 2 ? 0xe2c868 : 0xcdbf9a, 4, 4, 0.9);
            });
          }
          this.burst(a.pos.clone().setY(0.9), 0xe2c868, 24, 8, 1);
          this.addShake(0.4);
          this.playSfx('boom');
          for (const m of this.mons) {
            if (m.dead || m.pos.distanceTo(a.pos) >= R + m.def.radius) continue;
            this.damageMon(m, w.dmg * dmgMul, a.pos, w.knock, a);
            if (!m.dead) this.applySlow(m, 2, slowMul);
          }
        };
        this.later(0.2, () => sweep(1));
        if (this.evo(a)) this.later(0.55, () => sweep(0.6));
        break;
      }
      case 'bonk': {
        // Muôi canh: cốc đầu con quái gần nhất phía trước, mặc định 20% chí mạng gấp 2,5 lần
        const cb = this.combo(a) === 'coc_lam_son';
        this.later(0.16, () => {
          const dir = new THREE.Vector3(Math.sin(a.yaw), 0, Math.cos(a.yaw));
          let best: Mon | null = null;
          let bd = Infinity;
          for (const m of this.mons) {
            if (m.dead) continue;
            const v = new THREE.Vector3().subVectors(m.pos, a.pos).setY(0);
            const dist = v.length();
            if (dist > w.range + m.def.radius) continue;
            const ang = Math.abs(Math.atan2(v.x, v.z) - Math.atan2(dir.x, dir.z));
            if (Math.min(ang, Math.PI * 2 - ang) > 0.95 && dist > 1.4) continue;
            if (dist < bd) {
              bd = dist;
              best = m;
            }
          }
          const spot = a.pos.clone().addScaledVector(dir, 2.1);
          this.ring(spot, 1.6, 0xdde2e8, 0.25);
          if (!best) return;
          const crit = Math.random() < (cb ? 0.3 : 0.2);
          if (crit) {
            this.popAt(best.pos, 'CỐC ĐẦU!', 'crit', 3.4);
            this.burst(best.pos.clone().setY(2), 0xffd24a, 18, 8, 1);
            this.ring(best.pos, 2.2, 0xffd24a, 0.4);
            this.addShake(0.55);
          }
          this.damageMon(best, w.dmg * (crit ? (cb ? 3 : 2.5) : 1), a.pos, w.knock * (crit ? 2 : 1), a);
        });
        break;
      }
      case 'boomerang': {
        // Dép lào: một đôi dép bay xòe hai bên rồi quay về
        for (const off of this.evo(a) ? [-0.3, 0, 0.3] : [-0.2, 0.2]) {
          const dd = d.clone().applyAxisAngle(UP, off);
          const pos = origin.clone().setY(1.6).addScaledVector(dd, 0.8);
          this.addProj('dep', 'boomerang', pos, dd.multiplyScalar(17), w.dmg, 0.95, w.range, a);
        }
        break;
      }
      case 'pierce': {
        const evo = this.evo(a);
        if (w.id === 'non_la') {
          const hits = (this.combo(a) === 'non_hung_dao' ? 5 : 3) + (evo ? 2 : 0);
          for (const off of evo ? [-0.15, 0.15] : [0]) {
            const dd = d.clone().applyAxisAngle(UP, off);
            const pos = origin.clone().setY(1.6).addScaledVector(dd, 1.0);
            const p = this.addProj('non', 'pierce', pos, dd.multiplyScalar(26), w.dmg, w.radius, w.range, a);
            p.maxHit = hits;
          }
        } else if (w.id === 'phong_lon') {
          for (const off of evo ? [-0.12, 0.12] : [0]) {
            const dd = d.clone().applyAxisAngle(UP, off);
            const pos = origin.clone().setY(1.4).addScaledVector(dd, 1.0);
            const p = this.addProj('lon', 'pierce', pos, dd.multiplyScalar(20), w.dmg, w.radius, w.range, a);
            p.maxHit = 99;
          }
        } else {
          for (const off of evo ? [-0.1, 0.1] : [0]) {
            const dd = d.clone().applyAxisAngle(UP, off);
            const pos = origin.clone().setY(1.7).addScaledVector(dd, 1.0);
            const p = this.addProj('smoke', 'pierce', pos, dd.multiplyScalar(16), w.dmg, w.radius, w.range, a);
            p.maxHit = evo ? 3 : 2;
            this.burst(pos.clone(), 0xc8c8cc, 8, 3, 1);
          }
        }
        break;
      }
    }
  }

  private addProj(vis: Vis, kind: Proj['kind'], pos: THREE.Vector3, vel: THREE.Vector3, dmg: number, radius: number, range: number, owner: Actor | null, friendly = true): Proj {
    const obj = buildProjectile(vis);
    const evolved = friendly && this.evo(owner);
    if (evolved) tintEvolved(obj);
    obj.position.copy(pos);
    if (vel.lengthSq() > 0 && (vis === 'lon' || vis === 'arrow' || vis === 'fireball')) obj.lookAt(pos.clone().add(vel));
    this.scene.add(obj);
    const p: Proj = { id: this.nextId++, obj, kind, vis, owner, friendly, vel, dmg, radius, travelled: 0, range, back: false, hit: new Set(), dead: false, evo: evolved };
    this.projs.push(p);
    return p;
  }

  private applySlow(m: Mon, sec: number, mul: number): void {
    if (this.time < m.slowUntil && m.slowMul < mul) {
      m.slowUntil = Math.max(m.slowUntil, this.time + sec);
      return;
    }
    m.slowUntil = this.time + sec;
    m.slowMul = mul;
  }

  /** Chảy máu của Phóng Lợn: cộng dồn mỗi lần trúng, kéo dài tối đa 15 giây, trừ theo % máu tối đa của quái. */
  private applyBleed(m: Mon, o: Actor): void {
    if (this.time >= m.bleedUntil) m.bleedPct = 0;
    m.bleedPct = Math.min(this.combo(o) === 'lon_bach_dang' ? 0.09 : 0.06, m.bleedPct + 0.015) * (m.def.boss && m.bleedPct === 0 ? 0.2 : 1);
    m.bleedUntil = this.time + 15;
    m.bleedOwner = o;
    if (m.bleedTick < this.time) m.bleedTick = this.time + 0.5;
    this.burst(m.pos.clone().setY(1.3), 0xc01020, 8, 4, 0.8);
  }

  /** Hiệu ứng phụ của vũ khí tầm xa khi trúng quái. */
  private onWeaponHit(m: Mon, o: Actor, pos: THREE.Vector3): void {
    const id = o.stats.weapon.id;
    if (id === 'dep_lao') {
      if (this.combo(o) === 'dep_lua') this.applyBurn(m, 2.5, o);
    } else if (id === 'phong_lon') this.applyBleed(m, o);
    else if (id === 'dieu_cay') {
      this.burst(pos.clone(), 0xbcbcc0, 8, 3, 1);
      const cb = this.combo(o) === 'khoi_me_linh';
      if (Math.random() < (cb ? 0.35 : 0.15)) {
        this.applySlow(m, 2, 0.7);
        this.applyStun(m, cb ? 1.8 : 1);
        this.popAt(m.pos, 'Say khói!', 'crit', 3);
        this.burst(m.pos.clone().setY(1.8), 0xe8e8a0, 10, 4, 1);
      }
    }
  }

  /* ---------- Hiệu ứng: chạy tại máy và phát cho đồng đội ---------- */

  private get hasRemotes(): boolean {
    return this.role === 'host' && this.actors.size > 1;
  }

  private emit(ev: SnapEvent): void {
    if (this.hasRemotes) this.evq.push(ev);
  }

  private later(sec: number, fn: () => void): void {
    this.timers.push({ at: this.time + sec, fn });
  }

  private playSfx(name: SfxName): void {
    sfx[name]();
    this.emit(['f', name]);
  }

  private addShake(v: number): void {
    this.cam.addShake(v);
    this.emit(['s', r2(v)]);
  }

  private bannerAll(text: string, sub?: string): void {
    this.hud.banner(text, sub);
    this.emit(['n', text, sub ?? '']);
  }

  private ring(at: THREE.Vector3, radius: number, color: number, dur: number): void {
    this.fxRing(at.x, at.z, radius, color, dur);
    this.emit(['r', r2(at.x), r2(at.z), r2(radius), color, dur]);
  }

  private burst(at: THREE.Vector3, color: number, n: number, speed: number, size: number): void {
    this.fxBurst(at.x, at.y, at.z, color, n, speed, size);
    this.emit(['b', r2(at.x), r2(at.y), r2(at.z), color, n, speed, size]);
  }

  private popAt(world: THREE.Vector3, text: string, cls: string, height: number): void {
    this.fxPop(world.x, world.z, text, cls, height);
    this.emit(['p', r2(world.x), r2(world.z), text, cls, height]);
  }

  private partMat(color: number): THREE.MeshBasicMaterial {
    let m = this.partMats.get(color);
    if (!m) {
      m = new THREE.MeshBasicMaterial({
        color,
        map: getSoftGlowTex(),
        transparent: true,
        opacity: 0.95,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
      });
      this.partMats.set(color, m);
    }
    return m;
  }

  private fxBurst(x: number, y: number, z: number, color: number, n: number, speed: number, size: number): void {
    if (this.fxs.length > 260) return;
    for (let i = 0; i < n; i++) {
      const mesh = new THREE.Mesh(this.partGeo, this.partMat(color));
      mesh.position.set(x, y, z);
      mesh.scale.setScalar(size * (0.6 + Math.random() * 0.8));
      const v = new THREE.Vector3((Math.random() - 0.5) * 2, Math.random() * 1.4 + 0.2, (Math.random() - 0.5) * 2).normalize().multiplyScalar(speed * (0.4 + Math.random() * 0.8));
      this.scene.add(mesh);
      this.fxs.push({
        t: 0,
        dur: 0.45 + Math.random() * 0.4,
        update: (k, dt) => {
          v.y -= 18 * dt;
          mesh.position.addScaledVector(v, dt);
          if (mesh.position.y < 0.07) {
            mesh.position.y = 0.07;
            v.multiplyScalar(0.4);
            v.y = Math.abs(v.y) * 0.3;
          }
          mesh.quaternion.copy(this.camera.quaternion);
          mesh.scale.multiplyScalar(Math.max(0.01, 1 - dt * 1.6 * k));
        },
        end: () => this.scene.remove(mesh),
      });
    }
  }

  /** Hiệu ứng riêng của kỹ năng E từng tướng, chạy ở máy này và phát cho đồng đội. */
  private fxE(id: string, x: number, z: number, dx: number, dz: number, p = 0): void {
    const fx = makeESkillFx(id, this.scene, x, z, dx, dz, p);
    if (fx) this.fxs.push(fx);
  }

  private emitE(id: string, x: number, z: number, dx: number, dz: number, p = 0): void {
    this.fxE(id, x, z, dx, dz, p);
    this.emit(['e', id, r2(x), r2(z), r2(dx), r2(dz), r2(p)]);
  }

  private stake(x: number, z: number): void {
    this.fxStake(x, z);
    this.emit(['t', r2(x), r2(z)]);
  }

  private fxStake(x: number, z: number): void {
    const m = new THREE.Mesh(new THREE.ConeGeometry(0.22, 1.4, 6), this.partMat(0x8a5a2a));
    m.position.set(x, -0.7, z);
    this.scene.add(m);
    this.fxs.push({
      t: 0,
      dur: 0.5,
      update: (k) => {
        m.position.y = -0.7 + 1.4 * Math.sin(Math.PI * Math.min(1, k * 1.15));
      },
      end: () => this.scene.remove(m),
    });
  }

  private fxRing(x: number, z: number, radius: number, color: number, dur: number): void {
    const m = new THREE.MeshBasicMaterial({
      color,
      map: getShockwaveRingTex(),
      transparent: true,
      opacity: 0.92,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const geo = new THREE.PlaneGeometry(2, 2);
    const mesh = new THREE.Mesh(geo, m);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(x, 0.12, z);
    this.scene.add(mesh);
    this.fxs.push({
      t: 0,
      dur,
      update: (k) => {
        mesh.scale.setScalar(Math.max(0.1, radius * (0.2 + 0.8 * Math.sqrt(k))));
        m.opacity = 0.92 * (1 - k);
      },
      end: () => {
        this.scene.remove(mesh);
        geo.dispose();
        m.dispose();
      },
    });
  }

  private fxPop(x: number, z: number, text: string, cls: string, height: number): void {
    const v = new THREE.Vector3(x, height, z).project(this.camera);
    if (v.z > 1) return;
    this.hud.pop((v.x * 0.5 + 0.5) * this.canvas.clientWidth + (Math.random() - 0.5) * 18, (-v.y * 0.5 + 0.5) * this.canvas.clientHeight, text, cls);
  }

  private addZone(pos: THREE.Vector3, r: number, dur: number, dmg: number, color: number, opt?: { kind?: string; monDmg?: number }): void {
    const { fill, ring } = this.makeZoneMeshes(pos.x, pos.z, r, color);
    this.zones.push({ id: this.nextId++, pos: pos.clone(), r, t: 0, dur, dmg, color, fill, ring, kind: opt?.kind, monDmg: opt?.monDmg });
    sfx.hit();
  }

  private makeZoneMeshes(x: number, z: number, r: number, color: number): { fill: THREE.Mesh; ring: THREE.Mesh } {
    const fill = new THREE.Mesh(new THREE.CircleGeometry(1, 36), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.35, depthWrite: false, side: THREE.DoubleSide }));
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.94, 1, 40), new THREE.MeshBasicMaterial({ color: 0xff3a2a, transparent: true, opacity: 0.9, depthWrite: false, side: THREE.DoubleSide }));
    for (const m of [fill, ring]) {
      m.rotation.x = -Math.PI / 2;
      m.position.set(x, 0.1, z);
      this.scene.add(m);
    }
    ring.scale.setScalar(r);
    fill.scale.setScalar(0.01);
    return { fill, ring };
  }

  /* ---------- Quái vật ---------- */

  private spawnMon(type: MonsterType, at?: THREE.Vector3): void {
    const def = MONSTERS[type];
    const rig = buildMonster(type);
    const alive = this.aliveActors();
    const anchor = alive.length ? alive[Math.floor(Math.random() * alive.length)].pos : new THREE.Vector3();
    const ang = Math.random() * Math.PI * 2;
    const dist = 24 + Math.random() * 12;
    let x = anchor.x + Math.cos(ang) * dist;
    let z = anchor.z + Math.sin(ang) * dist;
    if (at) {
      x = at.x;
      z = at.z;
    }
    const rr = Math.hypot(x, z);
    const lim = ARENA_R - 3;
    if (rr > lim) {
      x = (x / rr) * lim;
      z = (z / rr) * lim;
    }
    const w = this.wave;
    const n = this.actors.size;
    const hpMul = (1 + 0.14 * (w - 1)) * (1 + 0.6 * (n - 1));
    const mon: Mon = {
      id: this.nextId++, def, rig, hp: def.hp * hpMul, maxHp: def.hp * hpMul, pos: new THREE.Vector3(x, 0, z), kb: new THREE.Vector3(), yaw: 0, phase: Math.random() * 6,
      atkReady: this.time + 1, windup: 0, flashUntil: 0, spawnAt: this.time, t1: this.time + 2 + Math.random() * 3, t2: this.time + 4, stopUntil: 0,
      leapEnd: 0, leapDir: new THREE.Vector3(), leapHit: false, stunUntil: 0, fearUntil: 0, slowUntil: 0, slowMul: 0.4, bleedUntil: 0, bleedTick: 0, bleedPct: 0, bleedOwner: null, burnUntil: 0, burnTick: 0, burnOwner: null, goldMarkUntil: 0, affix: 0, dmgMul: 1 + 0.06 * (w - 1), speedMul: 1 + Math.min(0.25, 0.01 * (w - 1)), baseScale: rig.group.scale.x, dead: false,
    };
    if (this.has('cuong_no')) mon.speedMul *= 1.2;
    if (this.has('giap_sat')) {
      mon.hp *= 1.35;
      mon.maxHp *= 1.35;
    }
    if (this.has('doc_dia')) mon.dmgMul *= 1.3;
    const eliteChance = Math.min(0.3, 0.05 + 0.02 * w) + (this.has('tinh_anh_hoa') ? 0.2 : 0);
    if (!def.boss && w >= 2 && Math.random() < eliteChance) this.setAffix(mon, 1 + Math.floor(Math.random() * 4));
    rig.group.position.copy(mon.pos);
    rig.group.scale.setScalar(0.01);
    this.scene.add(rig.group);
    this.mons.push(mon);
    if (mon.affix) this.popAt(mon.pos, `Tinh anh: ${AFFIX_NAMES[mon.affix]}`, 'crit', 3.6);
    this.ring(mon.pos, 1.6 * Math.max(1, def.radius), 0x7a4a9a, 0.5);
    if (def.boss) {
      this.bannerAll(def.name, 'Boss xuất hiện');
      this.playSfx('boom');
      this.addShake(0.8);
    }
  }

  /** Gán tiền tố tinh anh cho quái (chủ phòng và chơi một mình). */
  private setAffix(m: Mon, k: number): void {
    m.affix = k;
    m.baseScale *= 1.18;
    if (k === 1) m.speedMul *= 1.45;
    if (k === 4) {
      m.hp *= 1.5;
      m.maxHp *= 1.5;
    }
    this.showAffix(m);
  }

  /** Màu phát sáng, vòng chân và viên ngọc trên đầu cho quái tinh anh (cả hai phía). */
  private showAffix(m: Mon): void {
    if (!m.affix || m.affixShown) return;
    m.affixShown = true;
    const col = AFFIX_COLORS[m.affix];
    if (this.role === 'client') m.baseScale *= 1.18;
    for (const mt of m.rig.mats) {
      mt.userData.baseEmissive = col;
      mt.userData.baseIntensity = 0.55;
      mt.emissive.setHex(col);
      mt.emissiveIntensity = 0.55;
    }
    const g = m.rig.group;
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.85, 1.05, 28), new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.9, side: THREE.DoubleSide, depthWrite: false }));
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.08;
    ring.scale.setScalar(Math.max(1, m.def.radius * 1.5));
    g.add(ring);
    const top = (new THREE.Box3().setFromObject(g).max.y - g.position.y) / Math.max(0.01, g.scale.x);
    const gem = new THREE.Mesh(new THREE.OctahedronGeometry(0.2, 0), new THREE.MeshBasicMaterial({ color: col }));
    gem.position.y = Math.max(2.2, top) + 0.5;
    gem.name = 'gem';
    g.add(gem);
  }

  /** Chuyển sang bản đồ của màn hiện tại và đưa mọi người về vùng giữa sân. */
  private enterBiome(): void {
    const idx = biomeIndexForWave(this.wave);
    if (idx === this.world.biome) return;
    this.world.setBiome(idx);
    let i = 0;
    const n = this.actors.size;
    for (const a of this.actors.values()) {
      const x = (i++ - (n - 1) / 2) * 2.4;
      if (a.local || this.role !== 'client') {
        a.pos.set(x, 0, 9);
        a.tgt.set(x, 0, 9);
        a.chain = null;
      }
    }
    this.ring(new THREE.Vector3(0, 0, 9), 12, 0xffffff, 0.9);
  }

  private nextWave(): void {
    this.wave++;
    this.waveState = 'intro';
    this.stateT = 2.4;
    this.enterBiome();
    this.mapEventT = 9 + Math.random() * 4;
    if (this.wave === HAZARD_FROM) this.bannerAll('Chế độ vô tận', 'Từ giờ mỗi màn thêm một mối nguy');
    if (this.wave >= HAZARD_FROM) this.addHazard();
    this.qAdd('wave', this.wave);
    this.achieve();
    const def = BIOMES[this.world.biome];
    const comp = waveComposition(this.wave, def);
    const list: MonsterType[] = [];
    for (const c of comp) for (let i = 0; i < c.count; i++) list.push(c.type);
    const boss = list.filter((t) => MONSTERS[t].boss);
    const rest = list.filter((t) => !MONSTERS[t].boss);
    // Nhiều người chơi thì thêm quái
    const extra = Math.floor(rest.length * 0.55 * (this.actors.size - 1));
    for (let i = 0; i < extra; i++) rest.push(rest[Math.floor(Math.random() * rest.length)]);
    for (let i = rest.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [rest[i], rest[j]] = [rest[j], rest[i]];
    }
    this.queue = [...rest, ...boss];
    this.spawnTimer = 0;
    const names = comp.map((c) => `${MONSTERS[c.type].name} x${c.count}`).join(', ');
    this.bannerAll(`Màn ${this.wave}: ${def.name}`, names);
    this.hud.setWave(`Màn ${this.wave} · ${def.name}`);
    this.save.bestWave = Math.max(this.save.bestWave, this.wave);
    this.hud.hint('');
  }

  private updateWave(dt: number): void {
    if (this.waveState === 'intro') {
      this.stateT -= dt;
      if (this.stateT <= 0) this.waveState = 'fight';
      return;
    }
    if (this.waveState === 'fight') {
      this.spawnTimer -= dt;
      if (this.spawnTimer <= 0 && this.queue.length > 0 && this.mons.filter((m) => !m.dead).length < 26 + 6 * (this.actors.size - 1)) {
        const n = this.wave > 6 || this.actors.size > 2 ? 2 : 1;
        for (let i = 0; i < n && this.queue.length > 0; i++) this.spawnMon(this.queue.shift()!);
        this.spawnTimer = 0.55;
      }
      if (this.queue.length === 0 && this.mons.every((m) => m.dead)) this.beginBreak();
      return;
    }
    this.stateT -= dt;
    if (this.stateT <= 0) this.nextWave();
  }

  private beginBreak(): void {
    this.waveState = 'break';
    this.stateT = 7;
    let myBonus = 0;
    for (const a of this.actors.values()) {
      const bonus = Math.round((25 + 12 * this.wave) * a.stats.goldMult);
      if (a.local) myBonus = bonus;
      if (a.alive) {
        for (let i = 0; i < 10; i++) this.spawnCoin(a.pos, Math.ceil(bonus / 10));
        if (!this.has('kiet_suc')) a.hp = Math.min(a.stats.maxHp, a.hp + a.stats.maxHp * 0.25);
      } else {
        // Đồng đội gục ngã được hồi sinh sau mỗi màn
        a.alive = true;
        a.hp = Math.ceil(a.stats.maxHp * 0.5);
        a.invulnUntil = this.time + 2;
        this.emit(['v', a.id]);
        if (a.local) this.reviveLocal();
      }
    }
    this.bannerAll(`Hoàn thành màn ${this.wave}`, `Thưởng ${myBonus} vàng`);
    this.hud.hint(this.online ? 'Nghỉ giữa trận. Đồng đội gục ngã đã được hồi sinh.' : 'Nghỉ giữa trận. Nhấn Esc để mở cửa hàng và mua trang bị.');
    this.playSfx('win');
    this.syncTeam();
  }

  /** Co-op: đồng đội còn sống đứng cạnh người gục 3 giây thì cứu được. */
  private updateRevive(dt: number): void {
    if (this.actors.size < 2 || this.over) return;
    for (const a of this.actors.values()) {
      if (a.alive) {
        a.reviveT = 0;
        continue;
      }
      let near = false;
      for (const o of this.actors.values()) if (o !== a && o.alive && o.pos.distanceTo(a.pos) < 3.4) near = true;
      a.reviveT = near ? a.reviveT + dt : Math.max(0, a.reviveT - dt * 1.5);
      if (near && this.time >= (a.reviveFx ?? 0)) {
        a.reviveFx = this.time + 0.45;
        this.ring(a.pos, 1 + 2.2 * Math.min(1, a.reviveT / 3), 0x7aff9a, 0.5);
      }
      if (a.reviveT >= 3) {
        a.reviveT = 0;
        a.alive = true;
        a.hp = Math.ceil(a.stats.maxHp * 0.4);
        a.invulnUntil = this.time + 2.5;
        this.emit(['v', a.id]);
        this.popAt(a.pos, 'Hồi sinh!', 'heal', 3);
        this.burst(a.pos.clone().setY(1), 0x7aff9a, 24, 7, 1);
        if (a.local) this.reviveLocal();
        this.syncTeam();
      }
    }
  }

  private reviveLocal(): void {
    this.hud.hint('');
  }

  private updateMon(m: Mon, dt: number): void {
    const def = m.def;
    const t = this.time;
    const target = this.nearestActor(m.pos);
    const tp = target ? target.pos : m.pos;
    const toP = new THREE.Vector3(tp.x - m.pos.x, 0, tp.z - m.pos.z);
    const dist = Math.max(0.001, toP.length());
    toP.divideScalar(dist);

    const age = t - m.spawnAt;
    const baseScale = m.baseScale;
    if (age < 0.5) {
      m.rig.group.scale.setScalar(Math.max(0.01, (age / 0.5) * baseScale));
      m.rig.group.position.copy(m.pos);
      return;
    }
    if (Math.abs(m.rig.group.scale.x - baseScale) > 0.001) m.rig.group.scale.setScalar(baseScale);

    if (m.kb.lengthSq() > 0.02) {
      m.pos.addScaledVector(m.kb, dt);
      m.kb.multiplyScalar(Math.pow(0.002, dt));
    } else m.kb.set(0, 0, 0);

    if (m.affix === 3 && t >= (m.healT ?? 0)) {
      m.healT = t + 1;
      this.ring(m.pos, 7, 0x60ff80, 0.5);
      for (const o of this.mons) {
        if (o === m || o.dead || o.hp >= o.maxHp || o.pos.distanceTo(m.pos) > 7) continue;
        o.hp = Math.min(o.maxHp, o.hp + o.maxHp * 0.06);
        this.burst(o.pos.clone().setY(1.4), 0x60ff80, 3, 3, 0.7);
      }
    }
    if (t < m.bleedUntil && t >= m.bleedTick) {
      m.bleedTick = t + 0.5;
      this.burst(m.pos.clone().setY(1.2), 0xc01020, 3, 3, 0.7);
      this.damageMon(m, Math.max(1, Math.round(m.maxHp * m.bleedPct * 0.5)), m.pos, 0, m.bleedOwner, false);
      if (m.dead) return;
    }
    if (t < m.burnUntil && t >= m.burnTick) {
      m.burnTick = t + 0.5;
      this.burst(m.pos.clone().setY(1.2), 0xff6a20, 2, 3, 0.7);
      if (m.burnOwner) this.damageMon(m, 24, m.pos, 0, m.burnOwner);
      if (m.dead) return;
    }
    if (t < m.stunUntil) {
      m.windup = 0;
      this.animMon(m, dt, false, target ? target.pos : null);
      return;
    }
    let speed = 0;
    const spd = def.speed * m.speedMul * (def.boss && m.hp < m.maxHp * 0.4 ? 1.2 : 1);
    const enr = def.boss && m.hp < m.maxHp * 0.4 ? 0.7 : 1;
    const winding = m.windup > 0;
    let moveDir = toP;
    const stopped = t < m.stopUntil;
    const feared = t < m.fearUntil;
    if (feared) m.windup = 0;

    if (target && !feared) {
      const meleeStep = (range: number, windTime: number, power: number): void => {
        if (winding) {
          if (t >= m.windup) {
            m.windup = 0;
            const hitT = this.nearestActor(m.pos);
            if (hitT && m.pos.distanceTo(hitT.pos) < range + 0.7) this.hurtActor(hitT, def.atk * m.dmgMul * power, m.pos);
            this.burst(m.pos.clone().addScaledVector(toP, def.radius + 0.4).setY(0.9), 0xff6a4a, 5, 4, 0.6);
          }
        } else if (dist > range * 0.85) speed = spd;
        else if (t >= m.atkReady) {
          m.windup = t + windTime;
          m.atkReady = t + def.cd * enr;
        }
      };

      switch (def.ai ?? def.id) {
        case 'zombie':
        case 'ghost':
          meleeStep(def.range, 0.45, 1);
          break;
        case 'vampire':
          if (!winding && t >= m.t1 && dist > 5) {
            const behind = this.dirOf(target).multiplyScalar(-2.4);
            this.burst(m.pos.clone().setY(1), 0x901020, 14, 5, 0.9);
            m.pos.set(target.pos.x + behind.x, 0, target.pos.z + behind.z);
            this.burst(m.pos.clone().setY(1), 0x901020, 14, 5, 0.9);
            m.t1 = t + 4 + Math.random() * 2;
            m.atkReady = Math.min(m.atkReady, t + 0.3);
          }
          meleeStep(def.range, 0.35, 1);
          break;
        case 'skeleton':
          if (winding) {
            if (t >= m.windup) {
              m.windup = 0;
              const pos = m.pos.clone().setY(1.4);
              const shot = def.shot ?? 'bone';
              this.addProj(shot, shot === 'bone' ? 'bone' : 'fire', pos, toP.clone().multiplyScalar(shot === 'bone' ? 11 : 10), def.atk * m.dmgMul * (shot === 'fireball' ? 1.1 : 1), shot === 'bone' ? 0.5 : 0.6, 26, null, false);
            }
          } else {
            if (dist > 11) speed = spd;
            else if (dist < 6) {
              speed = spd * 0.7;
              moveDir = toP.clone().multiplyScalar(-1);
            }
            if (t >= m.atkReady && dist < def.range) {
              m.windup = t + 0.35;
              m.atkReady = t + def.cd;
            }
          }
          break;
        case 'werewolf':
          if (m.leapEnd > t) {
            m.pos.addScaledVector(m.leapDir, 14 * dt);
            if (!m.leapHit) {
              const hitT = this.nearestActor(m.pos);
              if (hitT && m.pos.distanceTo(hitT.pos) < 1.5) {
                m.leapHit = true;
                this.hurtActor(hitT, def.atk * m.dmgMul * 1.3, m.pos);
              }
            }
            moveDir = m.leapDir;
          } else if (winding) {
            if (t >= m.windup) {
              m.windup = 0;
              m.leapDir.copy(toP);
              m.leapEnd = t + 0.45;
              m.leapHit = false;
              this.burst(m.pos.clone().setY(0.4), 0xb89868, 8, 4, 0.7);
            }
          } else if (dist < 10 && dist > 3.2 && t >= m.t1) {
            m.windup = t + 0.5;
            m.t1 = t + 3.4 + Math.random() * 1.5;
          } else {
            meleeStep(def.range, 0.35, 1);
          }
          break;
        case 'franken':
          if (!stopped) {
            if (t >= m.t1 && dist < 6.5 && !winding) {
              this.addZone(m.pos, Math.min(8, Math.max(3.9, def.radius * 3.6)), 0.9, def.atk * m.dmgMul * 1.4, def.color ?? 0xff8a2a);
              m.t1 = t + 5;
              m.stopUntil = t + 0.9;
              m.rig.arms.forEach((arm) => (arm.rotation.x = -2.8));
            } else meleeStep(def.range, 0.5, 1);
          }
          break;
        case 'lich':
          if (!stopped) {
            if (dist > 11) speed = spd;
            else if (dist < 6) {
              speed = spd * 0.7;
              moveDir = toP.clone().multiplyScalar(-1);
            }
            if (t >= m.atkReady && dist < 20) {
              m.atkReady = t + def.cd * enr;
              m.stopUntil = t + 0.55;
              const n = enr < 1 ? 7 : 5;
              this.later(0.4, () => {
                if (m.dead) return;
                const tgt = this.nearestActor(m.pos);
                if (!tgt) return;
                const base = Math.atan2(tgt.pos.x - m.pos.x, tgt.pos.z - m.pos.z);
                for (let i = 0; i < n; i++) {
                  const ang = base + (i - (n - 1) / 2) * 0.22;
                  const dd = new THREE.Vector3(Math.sin(ang), 0, Math.cos(ang));
                  this.addProj('orb', 'fire', m.pos.clone().setY(2.6).addScaledVector(dd, 1.6), dd.multiplyScalar(11), def.atk * m.dmgMul * 0.9, 0.7, 30, null, false);
                }
                this.playSfx('boom');
              });
            } else if (t >= m.t1) {
              m.t1 = t + 10 * enr;
              m.stopUntil = t + 0.9;
              this.ring(m.pos, 6, 0xb060ff, 0.7);
              this.popAt(m.pos, 'Xương trỗi dậy!', 'crit', 4.4);
              const cnt = enr < 1 ? 4 : 3;
              for (let i = 0; i < cnt && this.mons.filter((x) => !x.dead).length < 40; i++) {
                const ang = (i / cnt) * Math.PI * 2;
                this.spawnMon('skeleton', new THREE.Vector3(m.pos.x + Math.cos(ang) * 4, 0, m.pos.z + Math.sin(ang) * 4));
              }
            } else if (t >= m.t2) {
              m.t2 = t + 6.5 * enr;
              this.addZone(target.pos, 3.8, 1.0, def.atk * m.dmgMul * 1.2, 0xb060ff);
            }
          }
          break;
        case 'dragon':
          if (!stopped) {
            if (dist > 9) speed = spd;
            else if (dist < 5.5) {
              speed = spd * 0.6;
              moveDir = toP.clone().multiplyScalar(-1);
            }
            if (winding) {
              if (t >= m.windup) {
                m.windup = 0;
                const hitT = this.nearestActor(m.pos);
                if (hitT && m.pos.distanceTo(hitT.pos) < def.range + 0.8) this.hurtActor(hitT, def.atk * m.dmgMul, m.pos);
              }
            } else if (t >= m.t1) {
              const n = m.hp < m.maxHp * 0.4 ? 5 : 3;
              m.t1 = t + 3.8 * enr;
              m.stopUntil = t + 0.6;
              this.later(0.45, () => {
                if (m.dead) return;
                const tgt = this.nearestActor(m.pos);
                if (!tgt) return;
                const base = Math.atan2(tgt.pos.x - m.pos.x, tgt.pos.z - m.pos.z);
                for (let i = 0; i < n; i++) {
                  const ang = base + (i - (n - 1) / 2) * 0.28;
                  const d = new THREE.Vector3(Math.sin(ang), 0, Math.cos(ang));
                  const pos = m.pos.clone().setY(3.6).addScaledVector(d, 3);
                  this.addProj('fireball', 'fire', pos, d.multiplyScalar(12), def.atk * m.dmgMul * 0.8, 0.7, 34, null, false);
                }
                this.playSfx('boom');
              });
            } else if (t >= m.t2) {
              m.t2 = t + 6 * enr;
              m.stopUntil = t + 1.1;
              this.addZone(m.pos, 6.2, 1.0, def.atk * m.dmgMul * 1.5, 0xff6a2a);
              this.addZone(target.pos, 3.2, 1.0, def.atk * m.dmgMul * 0.9, 0xff6a2a);
            } else if (dist < def.range + 0.5 && t >= m.atkReady) {
              m.windup = t + 0.5;
              m.atkReady = t + def.cd * enr;
            }
          }
          break;
      }
    }

    if (feared && target) {
      moveDir = toP.clone().multiplyScalar(-1);
      speed = spd * 1.2;
    }
    if (t < m.slowUntil) speed *= m.slowMul;
    if (t < this.frenzyUntil) speed *= 1.25;
    if (speed > 0 && !stopped) {
      m.pos.addScaledVector(moveDir, speed * dt);
      m.phase += dt * speed * 2.4;
    }
    if ((def.ai ?? def.id) !== 'ghost') this.pushOutObstacles(m.pos, def.radius);
    for (const o of this.mons) {
      if (o === m || o.dead) continue;
      const dx = m.pos.x - o.pos.x;
      const dz = m.pos.z - o.pos.z;
      const d = Math.hypot(dx, dz);
      const min = (def.radius + o.def.radius) * 0.9;
      if (d < min && d > 0.001) {
        const push = ((min - d) / 2) * Math.min(1, dt * 8);
        m.pos.x += (dx / d) * push;
        m.pos.z += (dz / d) * push;
      }
    }
    for (const a of this.actors.values()) {
      if (!a.alive) continue;
      const pd = Math.hypot(m.pos.x - a.pos.x, m.pos.z - a.pos.z);
      if (pd < def.radius + 0.35 && pd > 0.001) {
        const k = (def.radius + 0.35 - pd) * 0.5;
        m.pos.x += ((m.pos.x - a.pos.x) / pd) * k;
        m.pos.z += ((m.pos.z - a.pos.z) / pd) * k;
      }
    }

    this.animMon(m, dt, speed > 0 || m.leapEnd > t, target ? target.pos : null);
  }

  /**
   * Cảnh báo trước đòn đánh: quái cận chiến hiện vòng đỏ đúng tầm đánh, quái bắn xa và quái vồ hiện vệt đỏ theo hướng đòn.
   * Quái đập vùng (Frankenstein, người đá...) đã có vòng cảnh báo riêng khi đập nên không vẽ thêm.
   */
  private updateTelegraph(m: Mon, on: boolean): void {
    const ai = m.def.ai ?? m.def.id;
    const circle = ai === 'zombie' || ai === 'ghost' || ai === 'vampire' || ai === 'dragon';
    const line = ai === 'skeleton' || ai === 'werewolf';
    if (!circle && !line) return;
    const g = m.rig.group;
    if (on && !m.tele) {
      const tele = new THREE.Group();
      const mk = (geo: THREE.BufferGeometry, name: string, opacity: number): THREE.Mesh => {
        const mesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: 0xff3a2a, transparent: true, opacity, depthWrite: false, side: THREE.DoubleSide }));
        mesh.name = name;
        mesh.rotation.x = -Math.PI / 2;
        mesh.renderOrder = 4;
        tele.add(mesh);
        return mesh;
      };
      mk(new THREE.CircleGeometry(1, 32), 'fill', 0.22);
      mk(new THREE.RingGeometry(0.93, 1, 40), 'ring', 0.8);
      const ln = mk(new THREE.PlaneGeometry(1, 1), 'line', 0.28);
      ln.geometry.translate(0, 0.5, 0);
      ln.rotation.x = Math.PI / 2;
      g.add(tele);
      m.tele = tele;
    }
    const tele = m.tele;
    if (!tele) return;
    tele.visible = on;
    if (!on) return;
    const pulse = 0.75 + Math.sin(this.time * 24) * 0.25;
    const s = Math.max(0.01, m.baseScale);
    tele.position.y = (0.09 - g.position.y) / s;
    const fill = tele.getObjectByName('fill') as THREE.Mesh;
    const ring = tele.getObjectByName('ring') as THREE.Mesh;
    const lineM = tele.getObjectByName('line') as THREE.Mesh;
    fill.visible = ring.visible = circle;
    lineM.visible = line;
    if (circle) {
      const R = (m.def.range + (ai === 'dragon' ? 0.8 : 0.7)) / s;
      fill.scale.set(R, R, 1);
      ring.scale.set(R, R, 1);
      (fill.material as THREE.MeshBasicMaterial).opacity = 0.16 + 0.12 * pulse;
    } else {
      const len = ai === 'skeleton' ? 11 : 6.5;
      // PlaneGeometry nằm trong mặt phẳng XY nên sau khi xoay -90 độ quanh X, trục Y của nó chạy dọc theo +Z
      lineM.scale.set(0.9 / s, len / s, 1);
      (lineM.material as THREE.MeshBasicMaterial).opacity = 0.18 + 0.2 * pulse;
    }
  }

  /** Vòng chim bay quanh đầu quái đang choáng. */
  private updateBirds(m: Mon, on: boolean): void {
    const g = m.rig.group;
    if (on && !m.birds) {
      const box3 = new THREE.Box3().setFromObject(g);
      const top = (box3.max.y - g.position.y) / Math.max(0.01, g.scale.x);
      const grp = new THREE.Group();
      grp.position.y = Math.max(1.8, top) + 0.1;
      const body = new THREE.MeshBasicMaterial({ color: 0xffe14a });
      const wing = new THREE.MeshBasicMaterial({ color: 0xffb020, side: THREE.DoubleSide });
      const beak = new THREE.MeshBasicMaterial({ color: 0xff7a1a });
      for (let i = 0; i < 3; i++) {
        const bird = new THREE.Group();
        bird.add(new THREE.Mesh(new THREE.SphereGeometry(0.11, 8, 6), body));
        const head = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 6), body);
        head.position.set(0, 0.07, 0.1);
        bird.add(head);
        const bk = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.09, 5), beak);
        bk.rotation.x = Math.PI / 2;
        bk.position.set(0, 0.07, 0.19);
        bird.add(bk);
        for (const s of [-1, 1]) {
          const w = new THREE.Mesh(new THREE.PlaneGeometry(0.2, 0.1), wing);
          w.geometry.translate(s * 0.1, 0, 0);
          w.name = s < 0 ? 'wl' : 'wr';
          w.rotation.x = -Math.PI / 2;
          bird.add(w);
        }
        grp.add(bird);
      }
      g.add(grp);
      m.birds = grp;
    }
    const grp = m.birds;
    if (!grp) return;
    grp.visible = on;
    if (!on) return;
    const t = this.time;
    const inv = 1 / Math.max(0.01, g.scale.x);
    grp.scale.setScalar(inv * m.baseScale);
    grp.children.forEach((bird, i) => {
      const ang = t * 4.2 + (i * Math.PI * 2) / 3;
      bird.position.set(Math.cos(ang) * 0.6, Math.sin(t * 6 + i * 2) * 0.05, Math.sin(ang) * 0.6);
      bird.rotation.y = -ang;
      const flap = Math.sin(t * 28 + i) * 0.7;
      for (const c of bird.children) {
        if (c.name === 'wl') c.rotation.z = flap;
        else if (c.name === 'wr') c.rotation.z = -flap;
      }
    });
  }

  private animMon(m: Mon, dt: number, moving: boolean, look: THREE.Vector3 | null): void {
    const g = m.rig.group;
    const t = this.time;
    this.updateBirds(m, this.role === 'client' ? !!m.stunned : t < m.stunUntil);
    this.updateTelegraph(m, m.windup > 0 && !(this.role === 'client' ? !!m.stunned : t < m.stunUntil));
    let targetYaw = m.yaw;
    if (m.remoteYaw !== undefined) targetYaw = m.remoteYaw;
    else if (m.leapEnd > t) targetYaw = Math.atan2(m.leapDir.x, m.leapDir.z);
    else if (look) targetYaw = Math.atan2(look.x - m.pos.x, look.z - m.pos.z);
    let dy = targetYaw - m.yaw;
    while (dy > Math.PI) dy -= Math.PI * 2;
    while (dy < -Math.PI) dy += Math.PI * 2;
    m.yaw += dy * Math.min(1, dt * 9);
    g.position.set(m.pos.x, m.rig.baseY + (m.rig.float ? Math.sin(t * 2.2 + m.phase) * 0.18 : 0), m.pos.z);
    g.rotation.y = m.yaw;
    const sw = moving ? Math.sin(m.phase) * 0.75 : 0;
    m.rig.legs.forEach((l, i) => {
      l.rotation.x = i % 2 === 0 ? sw : -sw;
    });
    const winding = m.windup > 0;
    switch (m.def.ai ?? m.def.id) {
      case 'zombie':
        m.rig.arms.forEach((a) => (a.rotation.x = winding ? -2.6 : -1.35 + Math.sin(m.phase * 0.5) * 0.12));
        break;
      case 'skeleton':
        m.rig.arms.forEach((a, i) => (a.rotation.x = winding && i === 1 ? -1.6 : moving ? (i === 0 ? -sw : sw) : -0.1));
        break;
      case 'vampire':
        m.rig.arms.forEach((a, i) => (a.rotation.x = winding ? -2.2 : i === 0 ? -sw * 0.6 : sw * 0.6));
        if (m.rig.extra.cape) m.rig.extra.cape.rotation.x = 0.08 + (moving ? 0.25 : 0);
        break;
      case 'franken':
        if (t < m.stopUntil) m.rig.arms.forEach((a) => (a.rotation.x = -2.8));
        else m.rig.arms.forEach((a) => (a.rotation.x = winding ? -2.3 : -1.2 + Math.sin(m.phase * 0.5) * 0.1));
        break;
      case 'ghost':
        if (m.def.id === 'bat') {
          const flap = Math.sin(t * 20 + m.phase) * 0.9;
          m.rig.arms[0].rotation.z = flap;
          m.rig.arms[1].rotation.z = -flap;
          m.rig.extra.body.rotation.x = 0.25;
        } else {
          m.rig.arms.forEach((a, i) => (a.position.y = 0.9 + Math.sin(t * 3 + i * 2) * 0.1));
          m.rig.extra.body.rotation.z = Math.sin(t * 2 + m.phase) * 0.08;
        }
        break;
      case 'werewolf': {
        const crouch = winding || m.leapEnd > t;
        g.position.y = crouch ? -0.2 : 0;
        g.rotation.x = m.leapEnd > t ? -0.35 : 0;
        if (m.rig.head) m.rig.head.rotation.x = crouch ? 0.3 : 0;
        if (m.rig.extra.tail) m.rig.extra.tail.rotation.z = Math.sin(t * 8) * 0.3;
        break;
      }
      case 'lich': {
        const cast = winding || t < m.stopUntil;
        m.rig.arms.forEach((arm, i) => (arm.rotation.x = cast ? -2.4 : -0.6 + Math.sin(t * 2 + i) * 0.08));
        g.position.y += Math.sin(t * 1.6 + m.phase) * 0.12;
        break;
      }
      case 'dragon': {
        const flap = Math.sin(t * 3.2) * 0.5;
        m.rig.extra.wingL.rotation.z = flap;
        m.rig.extra.wingR.rotation.z = -flap;
        if (m.rig.head) m.rig.head.rotation.x = winding || t < m.stopUntil ? -0.45 : 0.1;
        g.position.y = Math.abs(Math.sin(m.phase * 0.5)) * 0.1;
        break;
      }
    }
    if (m.affixShown) {
      const gem = g.getObjectByName('gem');
      if (gem) {
        gem.rotation.y = t * 3;
        gem.position.y += Math.sin(t * 4 + m.phase) * 0.004;
      }
    }
    const hitNow = t < m.flashUntil;
    m.sq = (m.sq ?? 0) + ((hitNow ? 1 : 0) - (m.sq ?? 0)) * Math.min(1, dt * 22);
    if (t - m.spawnAt >= 0.5) {
      const sq = m.sq;
      g.scale.set(m.baseScale * (1 + 0.14 * sq), m.baseScale * (1 - 0.18 * sq), m.baseScale * (1 + 0.14 * sq));
    }
    const flashing = t < m.flashUntil;
    for (const mt of m.rig.mats) {
      mt.emissive.setHex(flashing ? 0xffffff : (mt.userData.baseEmissive ?? mt.emissive.getHex()));
      if (mt.userData.baseEmissive === undefined && !flashing) mt.userData.baseEmissive = mt.emissive.getHex();
      mt.emissiveIntensity = flashing ? 0.9 : (mt.userData.baseIntensity ?? mt.emissiveIntensity);
      if (mt.userData.baseIntensity === undefined && !flashing) mt.userData.baseIntensity = mt.emissiveIntensity;
    }
    if (m.bar) m.bar.grp.quaternion.copy(this.camera.quaternion).premultiply(g.quaternion.clone().invert());
  }

  /* ---------- Cập nhật chung ---------- */

  update(dtRaw: number): void {
    const dt = Math.min(dtRaw, 0.05);
    this.world.update(this.time, dt, this.camTarget);
    if (!this.active) return;
    if (this.hitStop > 0) {
      this.hitStop -= dtRaw;
    }
    if (this.paused || this.over) {
      if (this.over) for (const a of this.actors.values()) this.animActor(a, dt);
      this.updateCamera(dt);
      return;
    }
    this.time += dt;
    if (this.world.biome !== this.ambBiome) {
      this.ambBiome = this.world.biome;
      ambience.setBiome(this.ambBiome);
    }
    if (this.moodUntil > 0 && this.time > this.moodUntil) {
      this.moodUntil = 0;
      this.world.clearMood();
    }
    if (this.role === 'client') this.updateClient(dt);
    else this.updateSim(dt);
    this.updateFx(dt);
    this.updateHud();
    this.updateCamera(dt);
    this.updateAimMarker();
    this.drawMinimap(dt);
  }

  /** Chạy mô phỏng đầy đủ: chơi một mình và chủ phòng. */
  private updateSim(dt: number): void {
    this.updateLocal(this.me, dt);
    for (const a of this.actors.values()) {
      if (a.local) continue;
      if (!a.placed) {
        a.pos.copy(a.tgt);
        a.placed = true;
      }
      a.pos.lerp(a.tgt, 1 - Math.exp(-16 * dt));
      if (a.moving) a.moveAnim += dt * a.stats.speed * 1.7;
      if (a.alive && a.hold) this.tryAttack(a);
    }
    for (const a of this.actors.values()) {
      if (a.alive && this.time < a.chainUntil) {
        const fire = a.stats.general.ultKind === 'rush';
        for (const m of this.mons) {
          if (m.dead || a.chainHit.has(m)) continue;
          if (m.pos.distanceTo(a.pos) < 3.2 + m.def.radius) {
            a.chainHit.add(m);
            this.damageMon(m, fire ? 150 : 90, a.pos, 10, a);
            if (fire) this.applyBurn(m, 3, a);
            else this.applyStun(m, 1.6);
          }
        }
        if (this.time >= a.chainNext) {
          a.chainNext = this.time + 0.07;
          const muzzle = a.pos.clone().addScaledVector(this.dirOf(a), 2.4);
          muzzle.y = 2.9;
          if (fire) {
            this.burst(muzzle, 0xff5a10, 4, 7, 1.2);
            this.burst(a.pos.clone().setY(0.4), 0xffb030, 2, 4, 1);
          } else this.burst(a.pos.clone().setY(0.4), 0xfff4e0, 2, 4, 0.9);
        }
      }
      a.fxRage = this.time < a.rageUntil;
      a.fxMount = this.time < a.mountUntil;
    }
    for (const a of this.actors.values()) this.animActor(a, dt);

    for (let i = this.timers.length - 1; i >= 0; i--) {
      if (this.time >= this.timers[i].at) {
        const fn = this.timers[i].fn;
        this.timers.splice(i, 1);
        fn();
      }
    }

    this.updateWave(dt);
    this.updateMapEvents(dt);
    this.updateRevive(dt);
    for (const m of this.mons) if (!m.dead) this.updateMon(m, dt);
    this.mons = this.mons.filter((m) => !m.dead);
    for (const m of this.mons) {
      if (m.airUntil && this.time < m.airUntil) m.rig.group.position.y = Math.sin(Math.PI * (1 - (m.airUntil - this.time) / 0.9)) * 3.2;
    }
    this.updateForts(dt);
    this.updateProjs(dt);
    this.updateZones(dt);
    this.updateClouds(dt);
    this.updateArmies(dt);
    this.updateConSonStreams(dt);
    this.updateSummons(dt);
    this.updateCoins(dt);

    if (this.waveState === 'break' && !this.has('kiet_suc')) for (const a of this.actors.values()) if (a.alive) a.hp = Math.min(a.stats.maxHp, a.hp + dt * 2);
    for (const a of this.actors.values()) if (a.alive && a.stats.regen > 0) a.hp = Math.min(a.stats.maxHp, a.hp + a.stats.regen * dt);
    this.dirty += dt;
    if (this.dirty > 1.5) this.flushSave();

    if (this.role === 'host') {
      this.snapTimer += dt;
      if (this.snapTimer >= 1 / 15) {
        this.snapTimer = 0;
        this.link?.relay('all', this.buildSnap());
      }
    }
  }

  /** Điều khiển người chơi cục bộ: di chuyển, lướt, nhắm, đánh. */
  private updateLocal(a: Actor, dt: number): void {
    this.updateAim(a);
    const input = this.moveInput();
    if (a.alive && a.chain) {
      this.stepChain(a, dt);
      this.pushOutObstacles(a.pos, 0.5);
      a.moving = true;
      a.moveAnim += dt * 14;
      a.hold = false;
      return;
    }
    if (a.alive) {
      if (a.dashT > 0) {
        a.dashT -= dt;
        a.pos.addScaledVector(a.dashDir, 24 * dt);
        if (Math.random() < 0.7) this.fxBurst(a.pos.x, 0.3, a.pos.z, 0xffffff, 1, 1, 0.5);
      } else if (input.lengthSq() > 0) {
        const spd = a.stats.speed * (a.rageUntil > this.time ? 1.6 : 1);
        a.pos.addScaledVector(input, spd * dt);
        a.moveAnim += dt * spd * 1.7;
      }
      this.pushOutObstacles(a.pos, 0.5);
      a.moving = input.lengthSq() > 0 && a.dashT <= 0;

      if (!typing()) {
        if (this.keys.has('ShiftLeft') || this.keys.has('ShiftRight') || this.keys.has('Space') || touch.dash) this.doDash(a);
        this.updateQAim(a, dt);
        this.updateEAim(a, dt);
      } else {
        this.cancelEAim();
        this.cancelQAim();
      }
      if (!this.mouseDown) {
        this.eSuppress = false;
        this.qSuppress = false;
      }
      const holding = !typing() && ((this.mouseDown && !this.eAiming && !this.qAiming && !this.eSuppress && !this.qSuppress) || touch.attack);
      a.hold = holding;
      if (holding) {
        if (this.role === 'client') this.clientAttack(a);
        else this.tryAttack(a);
      }
      if (a.attackAnim.t < a.attackAnim.dur || holding || this.eAiming || this.qAiming) {
        const d = this.aimDir(a);
        a.yaw = Math.atan2(d.x, d.z);
      } else if (input.lengthSq() > 0) {
        a.yaw = Math.atan2(input.x, input.z);
      }
    } else {
      a.moving = false;
      a.hold = false;
      this.cancelEAim();
      this.cancelQAim();
    }
  }

  private cancelEAim(): void {
    this.eAiming = false;
    this.eCharging = 0;
    if (!this.qAiming) this.aimInd?.hide();
  }

  private cancelQAim(): void {
    this.qAiming = false;
    if (!this.eAiming) this.aimInd?.hide();
  }

  /**
   * Kỹ năng E định hướng: nhấn E để hiện vòng chọn tầm (kiểu MOBA), rê chuột để chỉnh hướng,
   * nhấn chuột trái để thi triển (Bà Triệu: giữ chuột để tụ lực, thả để tung). E hoặc Esc để hủy.
   * Cảm ứng: giữ nút E để nhắm tự động, thả tay để thi triển.
   */
  private updateEAim(a: Actor, dt: number): void {
    const es = ESKILLS[a.stats.general.id];
    const down = this.keys.has('KeyE') || touch.e;
    const rising = down && !this.eWasDown;
    const falling = !down && this.eWasDown;
    this.eWasDown = down;
    const clickDown = this.mouseDown && !this.eMouseWas;
    const clickUp = !this.mouseDown && this.eMouseWas;
    this.eMouseWas = this.mouseDown;
    if (!es) return;
    if (es.aim === 'self') {
      if (rising) this.pressE(a);
      return;
    }
    const cast = (): void => {
      a.eCharge = Math.max(0, Math.min(1, this.eCharging / (es.charge?.sec ?? 1)));
      this.cancelEAim();
      this.eSuppress = true;
      this.pressE(a);
    };
    if (!this.eAiming) {
      if (rising && this.time >= a.eReady) {
        this.cancelQAim();
        this.eAiming = true;
        this.eAimTouch = touch.e;
        this.eCharging = 0;
        this.eSuppress = true;
      }
      if (!this.eAiming) return;
    } else if (rising && !this.eAimTouch) {
      this.cancelEAim();
      return;
    } else if (this.keys.has('Escape')) {
      this.cancelEAim();
      return;
    }
    if (!this.aimInd) this.aimInd = new AimIndicator(this.scene);
    if (es.charge && (this.eAimTouch ? touch.e : this.mouseDown)) this.eCharging = Math.min(es.charge.sec, this.eCharging + dt);
    this.aimInd.show(es, a.pos, a.aim, es.charge ? this.eCharging / es.charge.sec : 0);
    if (this.eAimTouch) {
      if (falling) cast();
    } else if (es.charge ? clickUp : clickDown) cast();
  }

  /**
   * Kỹ năng Q (Chiêu Cuối) định hướng: nếu chiêu cuối có tầm định hướng (như Suối Côn Sơn Bào Mòn của Nguyễn Trãi,
   * Trận Đồ Bộc Phá của Ngô Quyền, Thiên Quân Vạn Mã của Trần Hưng Đạo), nhấn Q để hiện vòng/dải chỉ thị (MOBA),
   * rê chuột để chỉnh hướng, nhấn chuột trái để thi triển. Nhấn Q lần nữa hoặc Esc để hủy.
   * Nếu chiêu cuối là dạng bản thân (cuồng nộ, triệu hồi, hào quang), bấm Q sẽ kích hoạt ngay.
   */
  private updateQAim(a: Actor, dt: number): void {
    const qs = Q_SKILLS[a.stats.general.ultKind];
    const down = this.keys.has('KeyQ') || touch.q;
    const rising = down && !this.qWasDown;
    const falling = !down && this.qWasDown;
    this.qWasDown = down;
    const clickDown = this.mouseDown && !this.qMouseWas;
    this.qMouseWas = this.mouseDown;

    // Chiêu cuối không có vùng định hướng (kích hoạt ngay lập tức)
    if (!qs) {
      if (rising) this.pressUlt(a);
      return;
    }

    const cast = (): void => {
      this.cancelQAim();
      this.qSuppress = true;
      this.pressUlt(a);
    };

    if (!this.qAiming) {
      if (rising && this.time >= a.ultReady) {
        this.cancelEAim();
        this.qAiming = true;
        this.qAimTouch = touch.q;
        this.qSuppress = true;
      }
      if (!this.qAiming) return;
    } else if (rising && !this.qAimTouch) {
      this.cancelQAim();
      return;
    } else if (this.keys.has('Escape')) {
      this.cancelQAim();
      return;
    }

    if (!this.aimInd) this.aimInd = new AimIndicator(this.scene);
    this.aimInd.show(qs, a.pos, a.aim, 0);

    if (this.qAimTouch) {
      if (falling) cast();
    } else if (clickDown) {
      cast();
    }
  }

  private pressE(a: Actor): void {
    const es = ESKILLS[a.stats.general.id];
    if (!es || !a.alive) return;
    if (this.role === 'client') {
      if (this.time < a.eReady) return;
      a.eReady = this.time + es.cd * a.stats.ultCdMul * (a.stats.eCdMul ?? 1);
      a.eSeq++;
    } else this.doE(a);
  }

  /** Quái trong hình chữ nhật: bắt đầu từ o, hướng d, dài len, rộng width. Trả về kèm khoảng cách dọc đường. */
  private inRect(o: THREE.Vector3, d: THREE.Vector3, len: number, width: number): { m: Mon; t: number }[] {
    const out: { m: Mon; t: number }[] = [];
    for (const m of this.mons) {
      if (m.dead) continue;
      const vx = m.pos.x - o.x;
      const vz = m.pos.z - o.z;
      const t = vx * d.x + vz * d.z;
      const side = Math.abs(vx * d.z - vz * d.x);
      if (t > -m.def.radius && t < len + m.def.radius && side < width / 2 + m.def.radius) out.push({ m, t: Math.max(0, t) });
    }
    return out;
  }

  /** Điểm rơi của kỹ năng vòng tròn: vị trí chuột kẹp trong tầm range từ chân người chơi. */
  private eTarget(a: Actor, range: number): THREE.Vector3 {
    const v = new THREE.Vector3(a.aim.x - a.pos.x, 0, a.aim.z - a.pos.z);
    const len = v.length();
    if (len > range) v.multiplyScalar(range / len);
    const c = new THREE.Vector3(a.pos.x + v.x, 0, a.pos.z + v.z);
    const rr = Math.hypot(c.x, c.z);
    const lim = ARENA_R - 1.5;
    if (rr > lim) c.multiplyScalar(lim / rr);
    return c;
  }

  private inFort(a: Actor): boolean {
    return this.forts.some((f) => this.time < f.until && Math.hypot(a.pos.x - f.pos.x, a.pos.z - f.pos.z) < f.r);
  }

  /** Thành lũy của Lý Thường Kiệt: hồi máu đồng minh bên trong (giảm sát thương và phản đòn xử lý ở hurtActor). */
  private updateForts(dt: number): void {
    if (this.forts.length === 0) return;
    for (const f of this.forts) {
      f.tick -= dt;
      if (f.tick > 0) continue;
      f.tick = 0.5;
      for (const pl of this.actors.values()) {
        if (!pl.alive || this.time >= f.until || Math.hypot(pl.pos.x - f.pos.x, pl.pos.z - f.pos.z) >= f.r) continue;
        const heal = Math.max(1, Math.round(pl.stats.maxHp * 0.03));
        if (pl.hp < pl.stats.maxHp) {
          pl.hp = Math.min(pl.stats.maxHp, pl.hp + heal);
          this.popAt(pl.pos, `+${heal}`, 'heal', 2.6);
        }
      }
    }
    this.forts = this.forts.filter((f) => this.time < f.until);
  }

  /** Chủ phòng và chơi một mình: kỹ năng phụ E riêng của từng tướng. Hướng và điểm rơi lấy từ vị trí nhắm lúc xác nhận. */
  private doE(a: Actor): void {
    const es = ESKILLS[a.stats.general.id];
    if (!es || !a.alive || this.time < a.eReady) return;
    a.eReady = this.time + es.cd * a.stats.ultCdMul * (a.stats.eCdMul ?? 1);
    this.popAt(a.pos, es.name, 'crit', 3.6);
    this.playSfx('boom');
    const near = (p: THREE.Vector3, r: number): Mon[] => this.mons.filter((m) => !m.dead && m.pos.distanceTo(p) < r + m.def.radius);
    const dir = this.aimDir(a);
    const from = a.pos.clone().setY(0);
    switch (a.stats.general.id) {
      case 'tran_hung_dao': {
        this.emitE('tran_hung_dao', from.x, from.z, dir.x, dir.z);
        this.addShake(0.65);
        for (const { m, t } of this.inRect(from, dir, es.range, es.size ?? 6.5)) {
          this.later(t / 24, () => {
            if (m.dead) return;
            this.damageMon(m, 90, from, 6, a);
            if (!m.dead) this.applyBurn(m, 3, a);
          });
        }
        const boomPt = from.clone().addScaledVector(dir, es.range * 0.85);
        this.later(1.0, () => {
          this.addShake(0.5);
          for (const m of near(boomPt, 6.5)) {
            if (m.dead) continue;
            this.damageMon(m, 70, boomPt, 8, a);
            if (!m.dead) this.applyBurn(m, 3, a);
          }
        });
        break;
      }
      case 'quang_trung': {
        this.emitE('quang_trung', from.x, from.z, dir.x, dir.z);
        this.addShake(0.7);
        for (const { m, t } of this.inRect(from, dir, es.range, es.size ?? 6.0)) {
          this.later(t / 55, () => {
            if (m.dead) return;
            this.damageMon(m, 85, from, 8, a);
            if (!m.dead) this.applyBurn(m, 3, a);
          });
        }
        const boomPt = from.clone().addScaledVector(dir, es.range);
        this.later(0.36, () => {
          this.addShake(0.65);
          this.burst(boomPt.clone().setY(1.2), 0xff3b00, 36, 12, 1.4);
          for (const m of near(boomPt, 6.5)) {
            if (m.dead) return;
            this.damageMon(m, 75, boomPt, 10, a);
            if (!m.dead) this.applyBurn(m, 3, a);
          }
        });
        break;
      }
      case 'le_loi':
        a.guardUntil = this.time + 6;
        a.shield = Math.round(a.stats.maxHp * 0.45);
        a.shieldUntil = this.time + 6;
        this.emitE('le_loi', from.x, from.z, dir.x, dir.z);
        this.addShake(0.5);
        this.ring(a.pos, 5.0, 0xffd700, 0.7);
        for (const m of near(a.pos, 5.0)) {
          if (m.dead) continue;
          this.damageMon(m, 60, a.pos, 10, a);
          if (!m.dead) this.applyStun(m, 0.8);
        }
        break;
      case 'hai_ba_trung':
        this.emitE('hai_ba_trung', from.x, from.z, dir.x, dir.z);
        for (const pl of this.actors.values()) {
          if (!pl.alive || pl.pos.distanceTo(a.pos) > 10) continue;
          const heal = Math.round(pl.stats.maxHp * 0.3);
          pl.hp = Math.min(pl.stats.maxHp, pl.hp + heal);
          this.popAt(pl.pos, `+${heal}`, 'heal', 2.6);
        }
        break;
      case 'ba_trieu': {
        const ch = Math.max(0, Math.min(1, a.eCharge));
        const len = es.range + (es.charge?.extra ?? 0) * ch;
        const half = es.half ?? 0.65;
        this.emitE('ba_trieu', from.x, from.z, dir.x, dir.z, ch);
        this.addShake(0.4 + ch * 0.5);
        const base = Math.atan2(dir.x, dir.z);
        for (const m of near(from, len)) {
          const v = new THREE.Vector3().subVectors(m.pos, from).setY(0);
          const d = v.length();
          if (d > 2) {
            let ang = Math.abs(Math.atan2(v.x, v.z) - base);
            if (ang > Math.PI) ang = Math.PI * 2 - ang;
            if (ang > half) continue;
          }
          this.later(d / 28, () => {
            if (m.dead) return;
            this.damageMon(m, 65 + 75 * ch, from, 15 + 15 * ch, a);
          });
        }
        break;
      }
      case 'ngo_quyen': {
        this.emitE('ngo_quyen', from.x, from.z, dir.x, dir.z);
        this.addShake(0.6);
        for (const { m, t } of this.inRect(from, dir, es.range, es.size ?? 5.5)) {
          this.later(t / 22, () => {
            if (m.dead) return;
            this.damageMon(m, 95, from, 8, a);
            if (m.dead) return;
            this.applyStun(m, 1.4);
            m.airUntil = this.time + 1.1;
          });
        }
        break;
      }
      case 'nguyen_trai': {
        this.emitE('nguyen_trai', from.x, from.z, dir.x, dir.z);
        for (let i = 0; i < 3; i++) {
          for (const { m, t } of this.inRect(from, dir, es.range, es.size ?? 2.4)) {
            this.later(i * 0.18 + t / 32, () => {
              if (m.dead) return;
              this.damageMon(m, 30, from, 1.5, a);
              if (m.dead) return;
              const n = (this.shaken.get(m) ?? 0) + 1;
              if (n >= 3) {
                this.shaken.delete(m);
                m.dmgMul *= 0.6;
                this.popAt(m.pos, 'Dao Động', 'crit', 2.8);
                this.later(6, () => {
                  m.dmgMul /= 0.6;
                });
              } else this.shaken.set(m, n);
            });
          }
        }
        break;
      }
      case 'phu_dong': {
        const c = this.eTarget(a, es.range);
        const r = es.size ?? 5;
        this.emitE('phu_dong', c.x, c.z, dir.x, dir.z);
        this.ring(c, r, 0x8ac84a, 0.7);
        this.later(0.7, () => {
          this.addShake(0.8);
          this.burst(c.clone().setY(0.6), 0x8ac84a, 30, 10, 1.1);
          for (const m of near(c, r)) {
            this.damageMon(m, 110, c, 6, a);
            if (!m.dead) this.applyStun(m, 1.6);
          }
        });
        break;
      }
      case 'ly_thuong_kiet': {
        const c = this.eTarget(a, es.range);
        const r = es.size ?? 4.5;
        this.emitE('ly_thuong_kiet', c.x, c.z, dir.x, dir.z);
        this.forts.push({ pos: c, r, until: this.time + 5, tick: 0, owner: a });
        this.addShake(0.4);
        break;
      }
    }
  }

  /** Nhắn nhanh trong co-op: chữ nổi trên đầu nhân vật cho cả phòng thấy. */
  private emote(i: number): void {
    if (this.time < this.emoteReady || !this.me.alive || i < 0 || i >= EMOTES.length) return;
    this.emoteReady = this.time + 1.2;
    if (this.role === 'client') this.link?.relay('host', { k: 'emo', i });
    else this.popAt(this.me.pos, EMOTES[i], 'crit', 3.9);
  }

  private pressUlt(a: Actor): void {
    if (a.alive && this.time >= a.ultReady) {
      this.qAdd('ult');
      this.save.totals.ults++;
    }
    if (this.role === 'client') {
      if (this.time < a.ultReady) return;
      a.ultReady = this.time + a.stats.general.ultCd * a.stats.ultCdMul;
      a.ultSeq++;
      this.localUltStart(a);
    } else this.doUlt(a);
  }

  /** Máy khách: nội suy vị trí các đối tượng từ bản chụp của chủ phòng và gửi thao tác. */
  private updateClient(dt: number): void {
    this.updateLocal(this.me, dt);
    this.me.fxRage = this.time < this.me.rageUntil;
    this.me.fxMount = this.time < this.me.mountUntil;
    const k = 1 - Math.exp(-14 * dt);
    for (const a of this.actors.values()) {
      if (a.local) continue;
      if (!a.placed) {
        a.pos.copy(a.tgt);
        a.placed = true;
      }
      const before = a.pos.clone();
      a.pos.lerp(a.tgt, k);
      a.moving = before.distanceTo(a.pos) / Math.max(dt, 0.001) > 0.6;
      if (a.moving) a.moveAnim += dt * a.stats.speed * 1.7;
    }
    for (const a of this.actors.values()) this.animActor(a, dt);

    for (const m of this.monViews.values()) {
      const before = m.pos.clone();
      m.pos.lerp(m.tgt!, k);
      const sp = before.distanceTo(m.pos) / Math.max(dt, 0.001);
      m.phase += dt * sp * 2.4;
      const age = this.time - m.spawnAt;
      if (age < 0.4) m.rig.group.scale.setScalar(Math.max(0.01, (age / 0.4) * m.baseScale));
      else if (Math.abs(m.rig.group.scale.x - m.baseScale) > 0.001) m.rig.group.scale.setScalar(m.baseScale);
      if (m.burning && Math.random() < dt * 9) this.fxBurst(m.pos.x, 1.2, m.pos.z, 0xff6a20, 1, 3, 0.7);
      if (m.bleeding && Math.random() < dt * 8) this.fxBurst(m.pos.x, 1.2, m.pos.z, 0xc01020, 1, 2.5, 0.6);
      this.animMon(m, dt, sp > 0.5 || m.leapEnd > this.time, null);
    }
    for (const v of this.summonViews.values()) {
      const before = v.pos.clone();
      v.pos.lerp(v.tgt, k);
      this.animSummon(v, dt, before.distanceTo(v.pos) / Math.max(dt, 0.001) > 0.6);
    }
    for (const v of this.projViews.values()) {
      v.obj.position.lerp(v.tgt, k);
      switch (v.vis) {
        case 'dep': v.obj.rotation.y += dt * 18; break;
        case 'non': v.obj.rotation.y += dt * 22; break;
        case 'smoke': {
          const age = ((v.obj.userData.age as number) ?? 0) + dt;
          v.obj.userData.age = age;
          v.obj.scale.setScalar(0.7 + Math.min(1, age / 0.9) * 1.1);
          if (Math.random() < dt * 14) this.fxBurst(v.obj.position.x, v.obj.position.y, v.obj.position.z, 0xc4c4c8, 1, 1.2, 0.9);
          break;
        }
        case 'bone': v.obj.rotation.z += dt * 12; break;
        case 'fireball': v.obj.scale.setScalar(1 + Math.sin(this.time * 18) * 0.12); break;
        default: v.obj.rotation.y = v.ry ?? 0;
      }
    }
    for (const v of this.coinViews.values()) {
      v.obj.position.lerp(v.tgt, k);
      if (v.heal) v.obj.rotation.y += dt * 2;
      else v.obj.rotation.z += dt * 5;
    }
    for (const v of this.zoneViews.values()) {
      v.t = Math.min(v.dur ?? 1, (v.t ?? 0) + dt);
      v.fill!.scale.setScalar(Math.max(0.01, (v.r ?? 1) * (v.t / (v.dur ?? 1))));
    }
    for (const v of this.cloudViews.values()) {
      if (v.flat) {
        v.t = (v.t ?? 0) + dt;
        v.dur = (v.dur ?? 0) - dt;
        animateSwamp(v.obj as THREE.Group, v.t, Math.max(0, v.dur));
      } else v.obj.scale.y = 0.9 + Math.sin(this.time * 4) * 0.1;
    }

    this.inputTimer += dt;
    if (this.inputTimer >= 0.05) {
      this.inputTimer = 0;
      const a = this.me;
      this.link?.relay('host', {
        k: 'in',
        x: r2(a.pos.x), z: r2(a.pos.z), yaw: r2(a.yaw), mv: a.moving ? 1 : 0,
        ax: r2(a.aim.x), az: r2(a.aim.z), hold: a.hold ? 1 : 0, dash: a.dashSeq, ult: a.ultSeq, e: a.eSeq, ec: r2(a.eCharge),
      });
    }
  }

  /* ---------- Mạng: chủ phòng nhận thao tác, máy khách nhận bản chụp ---------- */

  /** Gọi khi nhận dữ liệu chuyển tiếp trong trận. */
  onNetMessage(from: string, d: { k: string } & Record<string, unknown>): void {
    if (!this.active) return;
    if (this.role === 'host' && d.k === 'emo') {
      const a = this.actors.get(from);
      const i = typeof d.i === 'number' ? d.i : -1;
      if (a && a.alive && i >= 0 && i < EMOTES.length) this.popAt(a.pos, EMOTES[i], 'crit', 3.9);
      return;
    }
    if (this.role === 'host' && d.k === 'card') {
      const a = this.actors.get(from);
      if (a && !a.local && typeof d.i === 'number') this.chooseCard(a, d.i);
      return;
    }
    if (this.role === 'host' && d.k === 'in') {
      const a = this.actors.get(from);
      if (!a || a.local) return;
      const n = (v: unknown): number => (typeof v === 'number' && Number.isFinite(v) ? v : 0);
      const x = n(d.x);
      const z = n(d.z);
      const rr = Math.hypot(x, z);
      const lim = ARENA_R - 0.5;
      if (a.alive) {
        a.tgt.set(rr > lim ? (x / rr) * lim : x, 0, rr > lim ? (z / rr) * lim : z);
        a.yaw = n(d.yaw);
        a.moving = n(d.mv) === 1;
        a.aim.set(n(d.ax), 0, n(d.az));
        a.hold = n(d.hold) === 1;
      } else a.hold = false;
      if (n(d.dash) > a.dashSeq) {
        a.dashSeq = n(d.dash);
        a.invulnUntil = Math.max(a.invulnUntil, this.time + 0.35);
        this.ring(a.pos, 1.6, 0xffffff, 0.3);
      }
      if (n(d.ult) > a.ultSeq) {
        a.ultSeq = n(d.ult);
        this.doUlt(a);
      }
      if (n(d.e) > a.eSeq) {
        a.eSeq = n(d.e);
        a.eCharge = Math.max(0, Math.min(1, n(d.ec)));
        this.doE(a);
      }
    } else if (this.role === 'client' && from === this.hostId) {
      if (d.k === 'snap') this.applySnap(d as unknown as Snap);
      else if (d.k === 'over') this.finishClient(d as unknown as { wave: number; kills: number; golds: Record<string, number> });
    }
  }

  /** Một người chơi rời trận (chủ phòng xử lý). */
  onPlayerLeft(id: string): void {
    const a = this.actors.get(id);
    if (!a || a.local) return;
    this.scene.remove(a.root, a.shadow);
    this.actors.delete(id);
    this.hud.tag(id, null, 0, 0);
    this.syncTeam();
    if (this.role === 'host' && !this.over && this.aliveActors().length === 0) this.gameOver();
  }

  private finishClient(d: { wave: number; kills: number; golds: Record<string, number> }): void {
    if (this.over) return;
    this.over = true;
    this.wave = d.wave;
    this.save.bestWave = Math.max(this.save.bestWave, d.wave);
    this.save.kills += Math.round(d.kills / Math.max(1, this.actors.size));
    this.achieve();
    this.flushSave();
    this.hud.setBoss(null, 0);
    this.onOver({ wave: d.wave, gold: this.me.runGold, kills: d.kills, bestWave: this.save.bestWave, players: this.actors.size });
  }

  private buildSnap(): Snap {
    const ids: string[] = [];
    const pl: number[][] = [];
    for (const a of this.actors.values()) {
      ids.push(a.id);
      pl.push([r2(a.pos.x), r2(a.pos.z), r2(a.yaw), Math.ceil(a.hp), a.stats.maxHp, a.alive ? 1 : 0, a.moving ? 1 : 0, (a.fxRage ? 1 : 0) | (a.fxMount ? 2 : 0), a.level, r2(a.xp / xpNeed(a.level))]);
    }
    const mo = this.mons.filter((m) => !m.dead).map((m) => {
      const flags =
        (m.windup > 0 ? 1 : 0) | (this.time < m.flashUntil ? 2 : 0) | (this.time < m.stopUntil ? 4 : 0) | (m.leapEnd > this.time ? 8 : 0) | (m.def.boss ? 16 : 0) | (m.def.boss && m.hp < m.maxHp * 0.4 ? 32 : 0) | (this.time < m.burnUntil ? 64 : 0) | (this.time < m.bleedUntil ? 128 : 0) | (this.time < m.stunUntil ? 256 : 0) | (m.affix << 9);
      return [m.id, MON_TYPES.indexOf(m.def.id), r2(m.pos.x), r2(m.pos.z), r2(m.yaw), r2(Math.max(0, m.hp / m.maxHp)), flags];
    });
    const pr = this.projs.filter((p) => !p.dead).map((p) => [p.id, VIS.indexOf(p.vis), r2(p.obj.position.x), r2(p.obj.position.y), r2(p.obj.position.z), r2(Math.atan2(p.vel.x, p.vel.z)), p.evo ? 1 : 0]);
    const co = this.coins.map((c) => [c.id, c.heal ? 1 : 0, r2(c.mesh.position.x), r2(c.mesh.position.y), r2(c.mesh.position.z)]);
    const zo = this.zones.map((z) => [z.id, r2(z.pos.x), r2(z.pos.z), r2(z.r), r2(z.t), z.dur, z.color]);
    const cl = this.clouds.map((c) => [c.id, r2(c.pos.x), r2(c.pos.z), r2(c.r), c.swamp ? 1 : 0, r2(Math.max(0, c.t))]);
    const sm = this.summons.map((s) => [s.id, r2(s.pos.x), r2(s.pos.z), r2(s.yaw), this.time - s.shotAt < 0.3 ? 1 : 0, s.kind]);
    const ev = this.evq;
    this.evq = [];
    return { k: 'snap', w: this.wave, ws: WAVE_STATES.indexOf(this.waveState), kills: this.kills, pl, mo, pr, co, zo, cl, sm, ev, ids };
  }

  private applySnap(s: Snap): void {
    if (s.w !== this.wave) {
      this.wave = s.w;
      this.world.setBiome(biomeIndexForWave(s.w));
      this.qAdd('wave', s.w);
      this.save.bestWave = Math.max(this.save.bestWave, s.w);
      this.achieve();
    }
    this.wave = s.w;
    const ws = WAVE_STATES[s.ws] ?? 'fight';
    if (ws !== this.waveState && ws === 'break') this.hud.hint('Nghỉ giữa trận. Đồng đội gục ngã đã được hồi sinh.');
    else if (ws !== this.waveState && ws !== 'break') this.hud.hint('');
    this.waveState = ws;
    if (s.kills > this.lastTeamKills) {
      this.qAdd('kills', s.kills - this.lastTeamKills);
      this.lastTeamKills = s.kills;
    }
    if (s.kills !== this.kills) {
      this.kills = s.kills;
      this.hud.setKills(this.kills);
    }
    this.hud.setWave(`Màn ${s.w} · ${BIOMES[this.world.biome].name}`);

    s.ids.forEach((id, i) => {
      const a = this.actors.get(id);
      const row = s.pl[i];
      if (!a || !row) return;
      a.hp = row[3];
      a.stats.maxHp = row[4];
      a.level = row[8] ?? 1;
      a.xp = row[9] ?? 0;
      a.alive = row[5] === 1;
      const fl = row[7] ?? 0;
      if (!a.local) {
        a.fxRage = !!(fl & 1);
        a.fxMount = !!(fl & 2);
      }
      if (!a.local) {
        a.tgt.set(row[0], 0, row[1]);
        a.yaw = row[2];
      }
    });
    this.syncTeam();

    // quái vật
    const seen = new Set<number>();
    for (const row of s.mo) {
      const [id, ti, x, z, yaw, hpr, flags] = row;
      seen.add(id);
      let m = this.monViews.get(id);
      if (!m) m = this.createMonView(id, MON_TYPES[ti], x, z);
      m.tgt!.set(x, 0, z);
      m.remoteYaw = yaw;
      m.hp = hpr * m.maxHp;
      m.windup = flags & 1 ? 1 : 0;
      m.flashUntil = flags & 2 ? this.time + 0.1 : 0;
      m.stopUntil = flags & 4 ? this.time + 0.25 : 0;
      m.leapEnd = flags & 8 ? this.time + 0.25 : 0;
      m.leapDir.set(Math.sin(yaw), 0, Math.cos(yaw));
      m.boss = !!(flags & 16);
      m.burning = !!(flags & 64);
      m.bleeding = !!(flags & 128);
      m.stunned = !!(flags & 256);
      const af = (flags >> 9) & 7;
      if (af && !m.affix) {
        m.affix = af;
        this.showAffix(m);
      }
      m.enraged = !!(flags & 32);
      if (hpr < 0.999) this.showBar(m);
    }
    for (const [id, m] of this.monViews) {
      if (!seen.has(id)) {
        this.shrinkAway(m);
        this.monViews.delete(id);
      }
    }

    this.syncViews(this.projViews, s.pr, (row) => {
      const vis = VIS[row[1]] ?? 'shard';
      const obj = buildProjectile(vis);
      if (row[6]) tintEvolved(obj);
      obj.position.set(row[2], row[3], row[4]);
      this.scene.add(obj);
      return { obj, tgt: new THREE.Vector3(), vis, placed: false };
    }, (v, row) => {
      v.tgt.set(row[2], row[3], row[4]);
      v.ry = row[5];
    });
    this.syncViews(this.coinViews, s.co, (row) => {
      const obj = row[1] ? buildBanhChung() : this.coinTemplate.clone();
      obj.position.set(row[2], row[3], row[4]);
      this.scene.add(obj);
      return { obj, tgt: new THREE.Vector3(), heal: !!row[1], placed: false };
    }, (v, row) => v.tgt.set(row[2], row[3], row[4]));
    this.syncViews(this.zoneViews, s.zo, (row) => {
      const { fill, ring } = this.makeZoneMeshes(row[1], row[2], row[3], row[6]);
      return { obj: fill, tgt: new THREE.Vector3(), fill, ring, r: row[3], t: row[4], dur: row[5], placed: true };
    }, (v, row) => {
      v.t = row[4];
    });
    this.syncViews(this.cloudViews, s.cl, (row) => {
      const swamp = row[4] === 1;
      if (swamp) {
        const group = buildSwamp(row[0], row[3]);
        group.position.set(row[1], 0, row[2]);
        this.scene.add(group);
        animateSwamp(group, 10 - row[5], row[5]);
        return { obj: group, tgt: new THREE.Vector3(), flat: true, t: 10 - row[5], dur: row[5], placed: true };
      }
      const mesh = new THREE.Mesh(new THREE.SphereGeometry(1, 14, 8), new THREE.MeshBasicMaterial({ color: 0xb4d040, transparent: true, opacity: 0.28, depthWrite: false }));
      mesh.scale.set(row[3], 0.9, row[3]);
      mesh.position.set(row[1], 0.7, row[2]);
      this.scene.add(mesh);
      return { obj: mesh, tgt: new THREE.Vector3(), placed: true };
    }, (v, row) => {
      if (v.flat) v.dur = row[5];
    });

    const seenSummons = new Set<number>();
    for (const row of s.sm ?? []) {
      const [id, x, z, yaw, shot, kind] = row;
      seenSummons.add(id);
      let v = this.summonViews.get(id);
      if (!v) {
        const vis = this.makeSummonVisual(kind === 1 ? 1 : 0);
        v = { ...vis, pos: new THREE.Vector3(x, 0, z), tgt: new THREE.Vector3(x, 0, z), yaw, shotAt: -9, phase: 0 };
        vis.root.position.copy(v.pos);
        this.summonViews.set(id, v);
        this.fxRing(x, z, 2.5, 0xf0a0d0, 0.6);
      }
      v.tgt.set(x, 0, z);
      v.yaw = yaw;
      if (shot) v.shotAt = this.time;
    }
    for (const [id, v] of this.summonViews) {
      if (!seenSummons.has(id)) {
        this.fxRing(v.pos.x, v.pos.z, 2.2, 0xf0a0d0, 0.5);
        this.scene.remove(v.root, v.shadow);
        this.summonViews.delete(id);
      }
    }

    for (const ev of s.ev) this.applyEvent(ev);
  }

  private syncViews(map: Map<number, View>, rows: number[][], make: (row: number[]) => View, update: (v: View, row: number[]) => void): void {
    const seen = new Set<number>();
    for (const row of rows) {
      seen.add(row[0]);
      let v = map.get(row[0]);
      if (!v) {
        v = make(row);
        map.set(row[0], v);
      }
      update(v, row);
      if (!v.placed) {
        v.obj.position.copy(v.tgt);
        v.placed = true;
      }
    }
    for (const [id, v] of map) {
      if (!seen.has(id)) {
        this.scene.remove(v.obj);
        if (v.ring) this.scene.remove(v.ring);
        map.delete(id);
      }
    }
  }

  private createMonView(id: number, type: MonsterType, x: number, z: number): Mon {
    const def = MONSTERS[type];
    const rig = buildMonster(type);
    const m: Mon = {
      id, def, rig, hp: def.hp, maxHp: def.hp, pos: new THREE.Vector3(x, 0, z), kb: new THREE.Vector3(), yaw: 0, phase: Math.random() * 6,
      atkReady: 0, windup: 0, flashUntil: 0, spawnAt: this.time, t1: 0, t2: 0, stopUntil: 0, leapEnd: 0, leapDir: new THREE.Vector3(), leapHit: false, stunUntil: 0, fearUntil: 0, slowUntil: 0, slowMul: 0.4, bleedUntil: 0, bleedTick: 0, bleedPct: 0, bleedOwner: null, burnUntil: 0, burnTick: 0, burnOwner: null, goldMarkUntil: 0, affix: 0,
      dmgMul: 1, speedMul: 1, baseScale: rig.group.scale.x, dead: false, tgt: new THREE.Vector3(x, 0, z),
    };
    rig.group.position.copy(m.pos);
    rig.group.scale.setScalar(0.01);
    this.scene.add(rig.group);
    this.monViews.set(id, m);
    return m;
  }

  private applyEvent(ev: SnapEvent): void {
    const me = this.me;
    switch (ev[0]) {
      case 'r': this.fxRing(ev[1] as number, ev[2] as number, ev[3] as number, ev[4] as number, ev[5] as number); break;
      case 'b': this.fxBurst(ev[1] as number, ev[2] as number, ev[3] as number, ev[4] as number, ev[5] as number, ev[6] as number, ev[7] as number); break;
      case 'p': this.fxPop(ev[1] as number, ev[2] as number, String(ev[3]), String(ev[4]), ev[5] as number); break;
      case 's': this.shake = Math.max(this.shake, ev[1] as number); break;
      case 'n': this.hud.banner(String(ev[1]), ev[2] ? String(ev[2]) : undefined); break;
      case 'f': if (String(ev[1]) in sfx) sfx[ev[1] as SfxName](); break;
      case 'H': {
        this.hazards = ev.slice(1).map(String).filter((id) => !!hazardById(id));
        this.hud.setHazards(hazardText(this.hazards));
        break;
      }
      case 'e': this.fxE(String(ev[1]), ev[2] as number, ev[3] as number, ev[4] as number, ev[5] as number, (ev[6] as number) || 0); break;
      case 'E': this.fxEvent(String(ev[1]), ev[2] as number, ev[3] as number, ev[4] as number); break;
      case 'M': this.startMood(String(ev[1]), ev[2] as number); break;
      case 'L': {
        if (String(ev[1]) === me.id) this.presentOffer(ev.slice(2).map(String));
        break;
      }
      case 'C': {
        const a = this.actors.get(String(ev[1]));
        if (a) this.applyCard(a, String(ev[2]));
        break;
      }
      case 't': this.fxStake(ev[1] as number, ev[2] as number); break;
      case 'y': this.fxDragon(ev[1] as number, ev[2] as number, ev[3] as number, ev[4] as number); break;
      case 'c': this.fxArmy(ev[1] as number, ev[2] as number, ev[3] as number, ev[4] as number, ev[5] as number, ev[6] as number, ev[7] as number); break;
      case 'a': {
        const a = this.actors.get(String(ev[1]));
        if (a && !a.local) {
          a.attackAnim = { t: 0, dur: ev[3] as number, kind: String(ev[2]) };
          if (ev[4] === 1) a.spinT = ev[3] as number;
          sfx.swing();
        }
        break;
      }
      case 'u': {
        const a = this.actors.get(String(ev[1]));
        if (a) {
          a.flashHurt = 0.2;
          if (a === me) {
            this.shake = Math.max(this.shake, 0.35);
            sfx.hurt();
          }
        }
        break;
      }
      case 'k': {
        const a = this.actors.get(String(ev[1]));
        if (a === me) me.pos.add(new THREE.Vector3(ev[2] as number, 0, ev[3] as number));
        break;
      }
      case 'd': {
        const a = this.actors.get(String(ev[1]));
        if (a) a.alive = false;
        if (a === me) this.hud.hint('Bạn đã gục ngã. Đồng đội còn sống sẽ cứu bạn sau màn này.');
        break;
      }
      case 'v': {
        const a = this.actors.get(String(ev[1]));
        if (a) a.alive = true;
        if (a === me) this.hud.hint('');
        break;
      }
      case 'g': {
        if (String(ev[1]) === me.id) {
          const v = ev[2] as number;
          me.runGold += v;
          this.save.gold += v;
          this.qAdd('gold', v);
          this.save.totals.goldEarned += v;
          this.dirty += 0.2;
          sfx.coin();
        }
        break;
      }
    }
  }

  /* ---------- Hoạt ảnh người chơi, đạn, vật phẩm ---------- */

  private animActor(a: Actor, dt: number): void {
    const r = a.rig;
    const t = this.time;
    a.root.position.copy(a.pos);
    a.shadow.position.set(a.pos.x, 0.05, a.pos.z);
    let yawVis = a.yaw;
    if (a.spinT > 0) {
      a.spinT -= dt;
      yawVis += (1 - Math.max(0, a.spinT) / 0.55) * Math.PI * 2;
    }
    a.root.rotation.y = yawVis;
    a.root.rotation.x += ((!a.alive ? -1.45 : 0) - a.root.rotation.x) * Math.min(1, dt * 8);
    const sw = a.moving ? Math.sin(a.moveAnim) * 0.8 : 0;
    r.legL.rotation.x = sw;
    r.legR.rotation.x = -sw;
    r.armL.rotation.x = -sw * 0.8;
    r.group.position.y = a.moving ? Math.abs(Math.sin(a.moveAnim)) * 0.06 : Math.sin(t * 2) * 0.02;
    if (a.fxMount && !a.mount) {
      a.mount = buildElephant(false);
      a.root.add(a.mount);
    }
    if (a.mount) {
      a.mount.visible = a.fxMount;
      if (a.fxMount) {
        r.group.position.y += 3.15;
        const legs = a.mount.userData.legs as THREE.Group[];
        legs.forEach((leg, i) => (leg.rotation.x = Math.sin(a.moveAnim * 1.2 + (i % 2) * Math.PI) * 0.7));
      }
    }
    r.torso.rotation.x = 0;
    if (r.cape) r.cape.rotation.x = 0.08 + (a.moving ? 0.3 : 0.05) + Math.sin(t * 6) * 0.03;

    const an = a.attackAnim;
    an.t += dt;
    let arm = -0.9 + (a.moving ? sw * 0.2 : 0);
    const p = Math.min(1, an.t / an.dur);
    if (p < 1) {
      switch (an.kind) {
        case 'slam':
          arm = p < 0.45 ? -0.9 + (-2.8 + 0.9) * (p / 0.45) : -2.8 + (0.3 + 2.8) * Math.min(1, (p - 0.45) / 0.2);
          r.torso.rotation.x = p < 0.45 ? -0.2 : 0.35;
          break;
        case 'spin':
          arm = a.stats.weapon.id === 'choi_chit' ? -1.2 : -1.5;
          r.torso.rotation.x = a.stats.weapon.id === 'choi_chit' ? 0.32 : 0.15;
          break;
        case 'throw':
          arm = p < 0.5 ? -0.9 + -1.6 * (p / 0.5) : -2.5 + 2.1 * ((p - 0.5) / 0.5);
          break;
        case 'shoot':
          arm = -1.55 + 0.4 * p;
          break;
        case 'stomp': {
          const lift = p < 0.5 ? p / 0.5 : Math.max(0, 1 - (p - 0.5) / 0.12);
          r.legR.rotation.x = -1.35 * lift;
          r.torso.rotation.x = p < 0.5 ? -0.12 * lift : 0.28 * (1 - Math.min(1, (p - 0.5) / 0.3));
          arm = -1.9 * lift - 0.9 * (1 - lift);
          break;
        }
      }
    }
    r.armR.rotation.x = arm;
    r.armR.rotation.z = -0.1;
    if (r.avatar) {
      r.avatar.rotation.x = r.torso.rotation.x * 0.8;
      r.avatar.rotation.z = a.moving ? Math.sin(a.moveAnim) * 0.05 : 0;
      r.avatar.position.y = a.moving ? Math.abs(Math.sin(a.moveAnim)) * 0.05 : 0;
    }
    if (a.weaponModel && a.stats.weapon.id === 'choi_chit') {
      const sweeping = p < 1 && an.kind === 'spin';
      a.weaponModel.rotation.x += ((sweeping ? 1.05 : 0) - a.weaponModel.rotation.x) * Math.min(1, dt * 18);
    }

    a.flashHurt = Math.max(0, a.flashHurt - dt);
    const inv = t < a.invulnUntil && a.flashHurt <= 0;
    r.group.visible = this.over || !a.alive || !(inv && Math.floor(t * 18) % 2 === 0 && t > 1.3);
    const glow = a.flashHurt > 0 ? [0xff2020, 0.8] : a.fxRage ? [0xc09010, 0.6 + Math.sin(t * 12) * 0.15] : [0, 0];
    for (const m of a.bodyMats) {
      m.emissive.setHex(glow[0]);
      m.emissiveIntensity = glow[1];
    }
    // Tên trên đầu đồng đội
    if (!a.local && this.online) {
      const v = new THREE.Vector3(a.pos.x, 3.0, a.pos.z).project(this.camera);
      this.hud.tag(a.id, v.z < 1 ? a.name : null, (v.x * 0.5 + 0.5) * this.canvas.clientWidth, (-v.y * 0.5 + 0.5) * this.canvas.clientHeight);
    }
  }

  private updateProjs(dt: number): void {
    for (const p of this.projs) {
      if (p.dead) continue;
      switch (p.kind) {
        case 'water':
        case 'bone':
        case 'fire': {
          const step = p.vel.clone().multiplyScalar(dt);
          p.obj.position.add(step);
          p.travelled += step.length();
          if (p.kind === 'bone') p.obj.rotation.z += dt * 12;
          if (p.kind === 'fire') p.obj.scale.setScalar(1 + Math.sin(this.time * 18) * 0.12);
          const pos = p.obj.position;
          let remove = p.travelled >= p.range || Math.hypot(pos.x, pos.z) > ARENA_R + 2;
          if (!remove && p.friendly) {
            for (const m of this.mons) {
              if (m.dead) continue;
              if (Math.hypot(m.pos.x - pos.x, m.pos.z - pos.z) < m.def.radius + p.radius) {
                this.damageMon(m, p.dmg, pos, (p.owner ?? this.me).stats.weapon.knock, p.owner);
                remove = true;
                break;
              }
            }
          } else if (!remove) {
            for (const a of this.actors.values()) {
              if (!a.alive) continue;
              if (Math.hypot(a.pos.x - pos.x, a.pos.z - pos.z) < 0.6 + p.radius && this.time >= a.invulnUntil && a.dashT <= 0) {
                this.hurtActor(a, p.dmg, pos);
                remove = true;
                break;
              }
            }
          }
          if (remove) this.killProj(p, p.kind === 'fire');
          break;
        }
        case 'boomerang': {
          p.obj.rotation.y += dt * 18;
          const owner = p.owner ?? this.me;
          if (p.back) {
            const to = owner.pos.clone().setY(1.6).sub(p.obj.position);
            if (to.length() < 1.1) {
              this.killProj(p, false);
              break;
            }
            p.vel.copy(to.normalize().multiplyScalar(19));
          }
          const step = p.vel.clone().multiplyScalar(dt);
          p.obj.position.add(step);
          p.travelled += step.length();
          if (!p.back && p.travelled >= p.range) {
            p.back = true;
            p.hit.clear();
          }
          for (const m of this.mons) {
            if (m.dead || p.hit.has(m)) continue;
            if (Math.hypot(m.pos.x - p.obj.position.x, m.pos.z - p.obj.position.z) < m.def.radius + p.radius) {
              p.hit.add(m);
              this.damageMon(m, p.dmg, p.obj.position, owner.stats.weapon.knock, p.owner);
              this.onWeaponHit(m, owner, p.obj.position);
            }
          }
          break;
        }
        case 'pierce': {
          const step = p.vel.clone().multiplyScalar(dt);
          p.obj.position.add(step);
          p.travelled += step.length();
          const pos = p.obj.position;
          if (p.vis === 'smoke') {
            p.obj.scale.setScalar(0.7 + Math.min(1, p.travelled / p.range) * 1.1);
            if (Math.random() < dt * 16) this.burst(pos.clone(), 0xc4c4c8, 1, 1.2, 0.9);
          } else if (p.vis === 'non') p.obj.rotation.y += dt * 22;
          const owner = p.owner ?? this.me;
          let remove = p.travelled >= p.range || Math.hypot(pos.x, pos.z) > ARENA_R + 2;
          if (!remove) {
            for (const m of this.mons) {
              if (m.dead || p.hit.has(m)) continue;
              if (Math.hypot(m.pos.x - pos.x, m.pos.z - pos.z) < m.def.radius + p.radius) {
                p.hit.add(m);
                this.damageMon(m, p.dmg, pos, owner.stats.weapon.knock, p.owner);
                this.onWeaponHit(m, owner, pos);
                if (p.hit.size >= (p.maxHit ?? 99)) {
                  remove = true;
                  break;
                }
              }
            }
          }
          if (remove) {
            if (p.vis === 'smoke') this.burst(pos.clone(), 0xc4c4c8, 10, 3, 1.1);
            this.killProj(p, false);
          }
          break;
        }
      }
    }
    this.projs = this.projs.filter((p) => !p.dead);
  }

  private killProj(p: Proj, spark: boolean): void {
    p.dead = true;
    if (spark) this.burst(p.obj.position.clone(), 0xff8a30, 8, 5, 0.8);
    this.scene.remove(p.obj);
  }

  private updateZones(dt: number): void {
    for (const z of this.zones) {
      z.t += dt;
      const k = Math.min(1, z.t / z.dur);
      z.fill.scale.setScalar(Math.max(0.01, z.r * k));
      if (z.t >= z.dur) {
        for (const a of this.actors.values()) {
          if (z.dmg > 0 && a.alive && Math.hypot(a.pos.x - z.pos.x, a.pos.z - z.pos.z) < z.r + 0.3) this.hurtActor(a, z.dmg, z.pos);
        }
        if (z.monDmg) {
          for (const m of this.mons) {
            if (!m.dead && Math.hypot(m.pos.x - z.pos.x, m.pos.z - z.pos.z) < z.r + m.def.radius) this.damageMon(m, z.monDmg, z.pos, 5, null, false);
          }
        }
        if (z.kind === 'bolt' || z.kind === 'ice' || z.kind === 'splash') this.mapFx(z.kind, z.pos.x, z.pos.z, 1);
        this.ring(z.pos, z.r, z.color, 0.4);
        this.burst(z.pos.clone().setY(0.5), z.color, 14, 7, 1);
        this.addShake(0.45);
        this.playSfx('boom');
        this.scene.remove(z.fill, z.ring);
        z.r = -1;
      }
    }
    this.zones = this.zones.filter((z) => z.r >= 0);
  }

  private updateClouds(dt: number): void {
    for (const c of this.clouds) {
      c.t -= dt;
      c.tick -= dt;
      if (c.swamp) {
        animateSwamp(c.mesh as THREE.Group, 10 - c.t, c.t);
        const inside = this.mons.filter((m) => !m.dead && Math.hypot(m.pos.x - c.pos.x, m.pos.z - c.pos.z) < c.r + m.def.radius);
        for (const m of inside) this.applySlow(m, 0.25, 0.4);
        if (c.tick <= 0) {
          c.tick = 1;
          this.ring(c.pos, c.r, 0x4aa8e8, 0.5);
          for (const m of inside) {
            this.stake(m.pos.x, m.pos.z);
            this.damageMon(m, c.dmg, c.pos, 0.2, c.owner);
          }
        }
      } else {
        c.mesh.scale.y = 0.9 + Math.sin(this.time * 4) * 0.1;
        if (c.tick <= 0) {
          c.tick = 0.5;
          for (const m of this.mons) {
            if (!m.dead && Math.hypot(m.pos.x - c.pos.x, m.pos.z - c.pos.z) < c.r + m.def.radius) this.damageMon(m, c.dmg, c.pos, 0.3, c.owner);
          }
        }
      }
      if (c.t <= 0) this.scene.remove(c.mesh);
    }
    this.clouds = this.clouds.filter((c) => c.t > 0);
  }

  private creditGold(a: Actor, value: number): void {
    a.runGold += value;
    if (a.local) {
      this.save.gold += value;
      this.qAdd('gold', value);
      this.save.totals.goldEarned += value;
      this.dirty += 0.2;
      sfx.coin();
    } else this.emit(['g', a.id, value]);
  }

  private updateCoins(dt: number): void {
    this.dropSystem.update(dt, {
      nearestActor: (p) => this.nearestActor(p),
      creditGold: (near, val) => this.creditGold(near, val),
      onHeal: (near, val) => {
        const heal = Math.round(near.stats.maxHp * val);
        near.hp = Math.min(near.stats.maxHp, near.hp + heal);
        this.popAt(near.pos, `+${heal}`, 'heal', 2.4);
      },
    });
  }

  private updateFx(dt: number): void {
    for (const f of this.fxs) {
      f.t += dt;
      f.update(Math.min(1, f.t / f.dur), dt);
    }
    for (const f of this.fxs) if (f.t >= f.dur) f.end();
    this.fxs = this.fxs.filter((f) => f.t < f.dur);
  }

  private syncTeam(): void {
    if (this.actors.size < 2) {
      this.hud.setTeam([]);
      return;
    }
    this.hud.setTeam([...this.actors.values()].map((a) => ({ name: a.name, hp: a.hp, max: a.stats.maxHp, alive: a.alive, you: a.local })));
  }

  private updateHud(): void {
    const a = this.me;
    this.hud.setHp(a.hp, a.stats.maxHp);
    const w = a.stats.weapon;
    const atkCd = w.cd / a.stats.atkSpeed;
    const dashCd = 2.2 * (a.stats.dashCdMul ?? 1);
    const ultCd = a.stats.general.ultCd * a.stats.ultCdMul;
    const eCd = (ESKILLS[a.stats.general.id]?.cd ?? 10) * a.stats.ultCdMul * (a.stats.eCdMul ?? 1);

    const remAtk = Math.max(0, a.atkReady - this.time);
    const remDash = Math.max(0, a.dashReady - this.time);
    const remUlt = Math.max(0, a.ultReady - this.time);
    const remE = Math.max(0, a.eReady - this.time);

    this.hud.setCooldowns(
      1 - remAtk / atkCd,
      1 - remDash / dashCd,
      1 - remUlt / ultCd,
      1 - remE / eCd,
      remDash,
      remUlt,
      remE,
    );
    this.hud.setXp(a.level, this.role === 'client' ? a.xp : a.xp / xpNeed(a.level));
    this.hud.setGold(a.runGold, this.save.gold);
    this.hud.setStats?.({
      dmg: Math.round(w.dmg * a.stats.dmgMult),
      atkSpd: +(a.stats.atkSpeed).toFixed(2),
      def: Math.round(a.stats.reduce * 100),
      crit: Math.round(a.stats.crit * 100),
      spd: Math.round(a.stats.speed * 85),
      cdr: Math.round((1 - a.stats.ultCdMul) * 100),
    });
    this.hud.setPendingLevels?.(a.pendingLevels);
    let boss: Mon | undefined;
    if (this.role === 'client') boss = [...this.monViews.values()].find((m) => m.boss);
    else boss = this.mons.find((m) => m.def.boss && !m.dead);
    this.hud.setBoss(boss ? boss.def.name : null, boss ? boss.hp / boss.maxHp : 0);
    if (this.online) {
      const key = this.actors.size > 1 ? [...this.actors.values()].map((x) => `${Math.ceil(x.hp)}${x.alive ? 1 : 0}`).join(',') : '';
      if (key !== this.lastLabelHp) {
        this.lastLabelHp = key;
        this.syncTeam();
      }
    }
  }

  private updateCamera(dt: number): void {
    let focus = this.me;
    if (!focus.alive) focus = this.aliveActors()[0] ?? this.me;
    this.cam.update(dt, focus.pos, settings.zoom, this.world.sun);
    this.camTarget.copy(this.cam.target);
  }

  /* ---------- Sự kiện bản đồ ---------- */

  /** Chủ phòng và chơi một mình: cứ 13 đến 21 giây trong lúc đánh, bản đồ lại tung ra một sự kiện riêng. */
  private updateMapEvents(dt: number): void {
    if (this.waveState !== 'fight' || this.over) return;
    this.mapEventT -= dt;
    if (this.mapEventT > 0) return;
    this.mapEventT = (13 + Math.random() * 8) * (this.has('su_kien_day') ? 0.5 : 1);
    this.runMapEvent(this.world.biome);
  }

  private randomSpot(near: THREE.Vector3, radius: number): THREE.Vector3 {
    const ang = Math.random() * Math.PI * 2;
    const r = Math.sqrt(Math.random()) * radius;
    const p = new THREE.Vector3(near.x + Math.cos(ang) * r, 0, near.z + Math.sin(ang) * r);
    const rr = Math.hypot(p.x, p.z);
    const lim = ARENA_R - 3;
    if (rr > lim) p.multiplyScalar(lim / rr);
    return p;
  }

  /** Một đòn đánh của sự kiện: 40% nhắm thẳng vào người chơi, còn lại rơi quanh họ. */
  private strike(kind: 'bolt' | 'ice' | 'meteor' | 'splash' | 'rock', r: number, dur: number, dmg: number, color: number): void {
    const alive = this.aliveActors();
    if (alive.length === 0) return;
    const target = alive[Math.floor(Math.random() * alive.length)];
    const pos = Math.random() < 0.4 ? this.randomSpot(target.pos, 1.5) : this.randomSpot(target.pos, 11);
    this.addZone(pos, r, dur, dmg, color, { kind, monDmg: dmg * 3 });
    if (kind === 'meteor' || kind === 'rock') this.mapFx(kind, pos.x, pos.z, dur);
  }

  private runMapEvent(biome: number): void {
    const w = this.wave;
    const alive = this.aliveActors();
    if (alive.length === 0) return;
    switch (biome) {
      case 0: {
        this.bannerAll('Mưa vàng!', 'Vàng rơi quanh bạn, nhặt nhanh');
        for (const pl of alive) {
          for (let i = 0; i < 8; i++) this.spawnCoin(this.randomSpot(pl.pos, 7), 2 + w);
        }
        break;
      }
      case 1: {
        this.bannerAll('Mồ ma trỗi dậy!', 'Sương dày lên, quái chui ra từ mộ');
        this.startMood('fog', 9);
        this.emit(['M', 'fog', 9]);
        const pool: MonsterType[] = ['skeleton', 'ghost', 'mummy', 'zombie'];
        for (let i = 0; i < 4 && this.mons.filter((m) => !m.dead).length < 36; i++) this.spawnMon(pool[Math.floor(Math.random() * pool.length)]);
        break;
      }
      case 2: {
        this.bannerAll('Trăng máu thịnh!', 'Quái hung hăng và nhanh hơn 25%');
        this.frenzyUntil = this.time + 8;
        this.startMood('red', 8);
        this.emit(['M', 'red', 8]);
        break;
      }
      case 3: {
        this.bannerAll('Giông sét!', 'Tránh vòng xanh, sét cũng đánh trúng quái');
        for (let i = 0; i < 7; i++) this.later(i * 0.45, () => this.strike('bolt', 2.6, 1.1, 18 + 2 * w, 0x9ad8ff));
        break;
      }
      case 4: {
        this.bannerAll('Băng nứt!', 'Gai băng trồi lên, đánh trúng cả quái');
        this.startMood('snowfog', 9);
        this.emit(['M', 'snowfog', 9]);
        for (let i = 0; i < 6; i++) this.later(i * 0.5, () => this.strike('ice', 3, 1.3, 16 + 2 * w, 0xa8e0ff));
        break;
      }
      case 6: {
        this.bannerAll('Sóng dữ!', 'Nước dâng, tránh các vòng xanh, sóng cũng đánh trúng quái');
        for (let i = 0; i < 6; i++) this.later(i * 0.5, () => this.strike('splash', 3.4, 1.3, 14 + 2 * w, 0x4aa8e8));
        break;
      }
      case 7: {
        this.bannerAll('Sập đá!', 'Đá rơi từ trần hang xuống các vòng xám');
        for (let i = 0; i < 8; i++) this.later(i * 0.45, () => this.strike('rock', 3, 1.4, 20 + 2 * w, 0xb0b4bc));
        break;
      }
      case 5: {
        this.bannerAll('Mưa thiên thạch!', 'Chạy khỏi vòng đỏ, thiên thạch cũng đập quái');
        for (let i = 0; i < 9; i++) this.later(i * 0.45, () => this.strike('meteor', 3.4, 1.5, 22 + 2 * w, 0xff6a2a));
        break;
      }
    }
  }

  /** Thời tiết tạm thời (cả hai phía): thu hẹp tầm nhìn và nhuộm màu bầu trời. */
  private startMood(kind: string, dur: number): void {
    if (kind === 'red') this.world.setMood(0.8, 0xff2020, 0.3);
    else if (kind === 'snowfog') this.world.setMood(0.3, 0xeef4ff, 0.35);
    else this.world.setMood(0.35, 0x8890b0, 0.25);
    this.moodUntil = this.time + dur;
  }

  /** Hiệu ứng hình ảnh của sự kiện: chạy ở máy này và phát cho đồng đội. */
  private mapFx(kind: string, x: number, z: number, dur: number): void {
    this.fxEvent(kind, x, z, dur);
    this.emit(['E', kind, x, z, dur]);
  }

  private fxEvent(kind: string, x: number, z: number, dur: number): void {
    if (kind === 'bolt') {
      const pts: THREE.Vector3[] = [];
      let px = x + (Math.random() - 0.5) * 7;
      let pz = z + (Math.random() - 0.5) * 7;
      for (let y = 60; y > 1; y -= 6) {
        pts.push(new THREE.Vector3(px, y, pz));
        const pull = 1 - y / 60;
        px += (x - px) * pull * 0.5 + (Math.random() - 0.5) * 3;
        pz += (z - pz) * pull * 0.5 + (Math.random() - 0.5) * 3;
      }
      pts.push(new THREE.Vector3(x, 0.2, z));
      const geo = new THREE.BufferGeometry().setFromPoints(pts);
      const mat = new THREE.LineBasicMaterial({ color: 0xe8f4ff, transparent: true });
      const line = new THREE.Line(geo, mat);
      line.frustumCulled = false;
      this.scene.add(line);
      this.world.kick(0.7);
      this.fxBurst(x, 0.5, z, 0xbfe4ff, 18, 8, 0.9);
      this.fxs.push({
        t: 0,
        dur: 0.3,
        update: (k) => {
          mat.opacity = 1 - k;
          line.visible = Math.sin(k * 45) > -0.3;
        },
        end: () => {
          this.scene.remove(line);
          geo.dispose();
          mat.dispose();
        },
      });
    } else if (kind === 'ice') {
      const g = new THREE.Group();
      const iceM = new THREE.MeshStandardMaterial({ color: 0x9ad8f8, emissive: 0x3a90c0, emissiveIntensity: 0.6, transparent: true, opacity: 0.9, flatShading: true });
      const spikes: THREE.Mesh[] = [];
      for (let i = 0; i < 7; i++) {
        const a = (i / 7) * Math.PI * 2;
        const r = i === 0 ? 0 : 1.7;
        const h = i === 0 ? 3.4 : 2 + Math.random();
        const s = new THREE.Mesh(new THREE.ConeGeometry(0.55, h, 5), iceM);
        s.position.set(Math.cos(a) * r, -h, Math.sin(a) * r);
        s.userData.h = h;
        s.castShadow = true;
        g.add(s);
        spikes.push(s);
      }
      g.position.set(x, 0, z);
      this.scene.add(g);
      this.fxBurst(x, 0.6, z, 0xc8ecff, 22, 9, 1);
      this.fxs.push({
        t: 0,
        dur: 1.4,
        update: (k) => {
          const rise = k < 0.2 ? k / 0.2 : k > 0.75 ? Math.max(0, 1 - (k - 0.75) / 0.25) : 1;
          for (const s of spikes) s.position.y = -(s.userData.h as number) + (s.userData.h as number) * 0.5 * rise * 2 - 0.05 * 0;
        },
        end: () => {
          this.scene.remove(g);
          iceM.dispose();
          for (const s of spikes) s.geometry.dispose();
        },
      });
    } else if (kind === 'splash') {
      const mt = new THREE.MeshBasicMaterial({ color: 0x8ad0ff, transparent: true, opacity: 0.55, side: THREE.DoubleSide, depthWrite: false });
      const geo = new THREE.CylinderGeometry(1.2, 2.2, 1, 16, 1, true);
      const col = new THREE.Mesh(geo, mt);
      col.position.set(x, 0.5, z);
      this.scene.add(col);
      this.fxBurst(x, 0.8, z, 0xbfe4ff, 26, 9, 1.1);
      this.fxs.push({
        t: 0,
        dur: 0.7,
        update: (k) => {
          col.scale.set(1 + k * 0.6, 1 + Math.sin(k * Math.PI) * 5, 1 + k * 0.6);
          col.position.y = col.scale.y * 0.5;
          mt.opacity = 0.55 * (1 - k);
        },
        end: () => {
          this.scene.remove(col);
          geo.dispose();
          mt.dispose();
        },
      });
    } else if (kind === 'rock') {
      const geo = new THREE.DodecahedronGeometry(1.1, 0);
      const rock = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: 0x8a8e98, flatShading: true }));
      rock.castShadow = true;
      const from = new THREE.Vector3(x + 2, 38, z);
      const to = new THREE.Vector3(x, 1, z);
      this.scene.add(rock);
      this.fxs.push({
        t: 0,
        dur: Math.max(0.4, dur),
        update: (k) => {
          rock.position.lerpVectors(from, to, k * k);
          rock.rotation.x += 0.15;
          rock.rotation.z += 0.1;
        },
        end: () => {
          this.scene.remove(rock);
          geo.dispose();
          this.fxBurst(x, 0.8, z, 0xb0b4bc, 24, 10, 1.1);
          this.shake = Math.max(this.shake, 0.4);
        },
      });
    } else if (kind === 'bamboo') {
      const pivot = new THREE.Group();
      const green = new THREE.MeshStandardMaterial({ color: 0x7ab840, roughness: 0.6, flatShading: true });
      const stalk = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.26, 12, 8), green);
      stalk.rotation.z = Math.PI / 2;
      stalk.position.set(6.3, 1.6, 0);
      pivot.add(stalk);
      const nodeM = new THREE.MeshStandardMaterial({ color: 0x4a8a2a, flatShading: true });
      for (let i = 1; i < 5; i++) {
        const n = new THREE.Mesh(new THREE.TorusGeometry(0.26, 0.06, 6, 12), nodeM);
        n.rotation.y = Math.PI / 2;
        n.position.set(i * 2.4, 1.6, 0);
        pivot.add(n);
      }
      for (let i = 0; i < 6; i++) {
        const leaf = new THREE.Mesh(new THREE.ConeGeometry(0.18, 1.3, 4), green);
        leaf.position.set(11.6 + (i % 3) * 0.25, 1.6, 0);
        leaf.rotation.set(0, i * 1.05, Math.PI / 2 + (i - 2.5) * 0.3);
        pivot.add(leaf);
      }
      pivot.position.set(x, 0, z);
      this.scene.add(pivot);
      this.fxs.push({
        t: 0,
        dur: dur,
        update: (k) => {
          pivot.rotation.y = k * Math.PI * 6;
        },
        end: () => {
          this.scene.remove(pivot);
          stalk.geometry.dispose();
          green.dispose();
          nodeM.dispose();
        },
      });
    } else if (kind === 'meteor') {
      const g = new THREE.Group();
      const core = new THREE.Mesh(new THREE.SphereGeometry(0.9, 10, 8), new THREE.MeshStandardMaterial({ color: 0xff7a20, emissive: 0xff4a08, emissiveIntensity: 1.6, flatShading: true }));
      const tail = new THREE.Mesh(new THREE.ConeGeometry(0.8, 4.5, 8), new THREE.MeshBasicMaterial({ color: 0xffa040, transparent: true, opacity: 0.55, depthWrite: false }));
      tail.position.set(0, 2.6, 0);
      g.add(core, tail);
      const from = new THREE.Vector3(x + 15, 42, z - 10);
      const to = new THREE.Vector3(x, 0.8, z);
      const dir = new THREE.Vector3().subVectors(from, to).normalize();
      g.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
      this.scene.add(g);
      this.fxs.push({
        t: 0,
        dur: Math.max(0.4, dur),
        update: (k) => {
          const e = k * k;
          g.position.lerpVectors(from, to, e);
          core.rotation.y += 0.2;
        },
        end: () => {
          this.scene.remove(g);
          core.geometry.dispose();
          tail.geometry.dispose();
          this.fxBurst(x, 0.8, z, 0xff8a30, 26, 11, 1.2);
          this.shake = Math.max(this.shake, 0.4);
        },
      });
    }
  }

  /* ---------- Lên cấp và thẻ nâng cấp ---------- */

  /** Chủ phòng và chơi một mình: cộng kinh nghiệm. Người hạ quái nhận đủ, đồng đội nhận một nửa. */
  private grantXp(killer: Actor, amount: number): void {
    for (const a of this.actors.values()) {
      if (!a.alive && a !== killer) continue;
      a.xp += a === killer ? amount : Math.ceil(amount * 0.5);
      while (a.xp >= xpNeed(a.level)) {
        a.xp -= xpNeed(a.level);
        a.level++;
        a.pendingLevels++;
        this.popAt(a.pos, 'Lên cấp!', 'crit', 3.4);
        this.ring(a.pos, 3.2, 0xffe08a, 0.6);
        if (!a.offer) this.makeOffer(a);
      }
    }
  }

  private makeOffer(a: Actor): void {
    const ids = pickOffer(a.cards, 3);
    if (ids.length === 0) {
      a.pendingLevels = 0;
      return;
    }
    a.offer = ids;
    if (a.local) this.presentOffer(ids);
    else this.emit(['L', a.id, ...ids]);
  }

  /** Hiện ba thẻ cho người chơi cục bộ. */
  private presentOffer(ids: string[]): void {
    const items = ids.flatMap((id) => {
      const c = cardById(id);
      if (!c) return [];
      const n = this.me.cards[id] ?? 0;
      return [{ name: c.name, desc: c.desc, level: n ? `Cấp ${n + 1}/${c.max}` : 'Mới' }];
    });
    if (items.length === 0) return;
    this.offerIds = ids;
    this.offerOpen = true;
    this.hud.setXp(this.me.level, this.role === 'client' ? this.me.xp : this.me.xp / xpNeed(this.me.level));
    this.hud.showCards(items, (i) => this.pickCard(i));
  }

  private pickCard(i: number): void {
    if (this.paused) return;
    if (!this.offerOpen || i < 0 || i >= this.offerIds.length) return;
    this.offerOpen = false;
    this.hud.showCards(null, () => {});
    if (this.role === 'client') this.link?.relay('host', { k: 'card', i });
    else this.chooseCard(this.me, i);
  }

  /** Chủ phòng và chơi một mình: áp dụng thẻ người chơi đã chọn rồi mời thẻ tiếp nếu còn lượt lên cấp dồn. */
  private chooseCard(a: Actor, i: number): void {
    const id = a.offer?.[i];
    if (!id) return;
    a.offer = null;
    this.applyCard(a, id);
    this.emit(['C', a.id, id]);
    a.pendingLevels = Math.max(0, a.pendingLevels - 1);
    if (a.pendingLevels > 0) this.makeOffer(a);
  }

  /** Dòng nhỏ dưới thanh kinh nghiệm: combo đang có và các thẻ đã chọn. */
  private refreshChips(): void {
    const me = this.me;
    if (!me) return;
    const cb = comboFor(me.stats.general.id, me.stats.weapon.id);
    const parts: string[] = [];
    if (cb) parts.push(`Combo ${cb.name}`);
    if (this.evo(me)) parts.push('Vũ khí tiến hóa ★');
    parts.push(...CARDS.filter((x) => me.cards[x.id]).map((x) => `${x.name} ×${me.cards[x.id]}`));
    this.hud.setCards(parts.join(' · '));
  }

  private applyCard(a: Actor, id: string): void {
    const c = cardById(id);
    if (!c) return;
    a.cards[id] = (a.cards[id] ?? 0) + 1;
    c.apply(a.stats);
    if (id === 'the_luc' && this.role !== 'client') a.hp = Math.min(a.stats.maxHp, a.hp + 20);
    if (a.local) this.refreshChips();
  }

  /** Bản đồ nhỏ góc màn hình: người chơi (trắng là bạn), quái (đỏ), boss (cam). */
  private drawMinimap(dt: number): void {
    const mons = this.role === 'client' ? [...this.monViews.values()] : this.mons;
    this.minimap.draw(dt, this.world, ARENA_R, this.actors, this.me, mons);
  }

  /** Dùng cho kiểm thử trong console. */
  debug() {
    const me = this.me;
    return {
      role: this.role,
      wave: this.wave,
      hp: me?.hp ?? 0,
      gold: me?.runGold ?? 0,
      kills: this.kills,
      mons: this.role === 'client' ? this.monViews.size : this.mons.length,
      state: this.waveState,
      weapon: me?.stats.weapon.id,
      players: [...this.actors.values()].map((a) => ({ id: a.id, name: a.name, hp: a.hp, alive: a.alive, x: a.pos.x, z: a.pos.z, gold: a.runGold, weapon: a.stats.weapon.id })),
      views: { mons: this.monViews.size, projs: this.projViews.size, coins: this.coinViews.size },
      over: this.over,
      kill: () => this.mons.forEach((m) => this.killMon(m, this.me)),
      teleportMon: () => this.mons.forEach((m, i) => m.pos.set(me.pos.x + Math.sin(me.yaw) * 2.6 + ((i % 3) - 1) * 0.8, 0, me.pos.z + Math.cos(me.yaw) * 2.6 + (i % 2) * 0.6)),
      forceWave: (n: number) => {
        this.wave = n - 1;
        this.mons.forEach((m) => this.scene.remove(m.rig.group));
        this.mons = [];
        this.nextWave();
      },
      setWeaponId: (id: string) => {
        this.save.weapon = id;
        this.refreshLoadout();
      },
      fullHeal: () => {
        for (const a of this.actors.values()) a.hp = a.stats.maxHp;
      },
      killActor: (id: string) => {
        const a = this.actors.get(id);
        if (a) this.hurtActor(a, 99999);
      },
    };
  }
}
