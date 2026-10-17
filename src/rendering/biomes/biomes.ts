import * as THREE from 'three';
import type { MonsterType, RosterEntry } from '../../domain/data';
import { box, cone, cyl, mat, sph } from '../primitives/shapes';
import { ARENA_R, canvasTex, drumTexture, nhaSan, rng, type Obstacle } from '../world/world-kit';

/** Một bản đồ: khung cảnh dựng sẵn, vật cản, và hàm cập nhật hiệu ứng thời tiết. update trả về độ chớp sáng 0..1 (sét). */
export interface BiomeScene {
  root: THREE.Group;
  obstacles: Obstacle[];
  update(t: number, dt: number, focus: THREE.Vector3): number;
}

export interface BiomeDef {
  id: string;
  name: string;
  desc: string;
  sky: number;
  fog: number;
  fogNear: number;
  fogFar: number;
  hemiSky: number;
  hemiGround: number;
  hemiI: number;
  sun: number;
  sunI: number;
  /** Màu nền của bản đồ nhỏ. */
  mini: string;
  /** Danh sách quái chính của bản đồ này. */
  roster: RosterEntry[];
  /** Loại quái lấp phần còn lại của màn. */
  filler: MonsterType;
  build(): BiomeScene;
}

type Upd = (t: number, dt: number, focus: THREE.Vector3) => number | void;

interface Ctx {
  root: THREE.Group;
  rand: () => number;
  obstacles: Obstacle[];
  upd: Upd[];
}

function ctx(seed: number): Ctx {
  return { root: new THREE.Group(), rand: rng(seed), obstacles: [], upd: [] };
}

function finish(c: Ctx): BiomeScene {
  return {
    root: c.root,
    obstacles: c.obstacles,
    update(t, dt, focus) {
      let flash = 0;
      for (const u of c.upd) flash = Math.max(flash, u(t, dt, focus) || 0);
      return flash;
    },
  };
}

/* ---------- Thành phần dùng chung ---------- */

function flecked(base: string, flecks: string[], rand: () => number, repeat: number, count = 700): THREE.CanvasTexture {
  return canvasTex(128, (g, s) => {
    g.fillStyle = base;
    g.fillRect(0, 0, s, s);
    for (let i = 0; i < count; i++) {
      g.fillStyle = flecks[Math.floor(rand() * flecks.length)];
      g.fillRect(rand() * s, rand() * s, 2, 3);
    }
  }, repeat);
}

/** Mặt đất vô tận và sân đấu tròn. */
function ground(c: Ctx, groundBase: string, groundFlecks: string[], arenaBase: string, arenaFlecks: string[], roughness = 1): void {
  const g = new THREE.Mesh(new THREE.PlaneGeometry(700, 700), new THREE.MeshStandardMaterial({ map: flecked(groundBase, groundFlecks, c.rand, 90), roughness }));
  g.rotation.x = -Math.PI / 2;
  g.receiveShadow = true;
  c.root.add(g);
  const a = new THREE.Mesh(new THREE.CircleGeometry(ARENA_R, 72), new THREE.MeshStandardMaterial({ map: flecked(arenaBase, arenaFlecks, c.rand, 22, 500), roughness }));
  a.rotation.x = -Math.PI / 2;
  a.position.y = 0.02;
  a.receiveShadow = true;
  c.root.add(a);
}

interface Place {
  x: number;
  y: number;
  z: number;
  sx?: number;
  sy?: number;
  sz?: number;
  ry?: number;
  rx?: number;
  rz?: number;
}

function instances(c: Ctx, geo: THREE.BufferGeometry, material: THREE.Material, list: Place[], shadow = false): THREE.InstancedMesh {
  const mesh = new THREE.InstancedMesh(geo, material, Math.max(1, list.length));
  mesh.count = list.length;
  mesh.castShadow = shadow;
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const e = new THREE.Euler();
  const p = new THREE.Vector3();
  const s = new THREE.Vector3();
  list.forEach((it, i) => {
    p.set(it.x, it.y, it.z);
    s.set(it.sx ?? 1, it.sy ?? 1, it.sz ?? 1);
    q.setFromEuler(e.set(it.rx ?? 0, it.ry ?? 0, it.rz ?? 0));
    m.compose(p, q, s);
    mesh.setMatrixAt(i, m);
  });
  c.root.add(mesh);
  return mesh;
}

/** Điểm ngẫu nhiên trong vòng tròn, tránh các vật cản đã có. */
function spot(c: Ctx, minR: number, maxR: number, clear: number, tries = 30): { x: number; z: number } | null {
  for (let i = 0; i < tries; i++) {
    const a = c.rand() * Math.PI * 2;
    const r = minR + Math.sqrt(c.rand()) * (maxR - minR);
    const x = Math.cos(a) * r;
    const z = Math.sin(a) * r;
    if (c.obstacles.every((o) => Math.hypot(o.x - x, o.z - z) > o.r + clear)) return { x, z };
  }
  return null;
}

function rocks(c: Ctx, n: number, color: number, minR = 14, maxR = ARENA_R - 4, scale = 1): void {
  for (let i = 0; i < n; i++) {
    const p = spot(c, minR, maxR, 3);
    if (!p) continue;
    const s = (0.8 + c.rand() * 1.1) * scale;
    const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(s, 0), mat(color));
    rock.position.set(p.x, s * 0.6, p.z);
    rock.rotation.set(c.rand() * 3, c.rand() * 3, c.rand() * 3);
    rock.castShadow = true;
    rock.receiveShadow = true;
    c.root.add(rock);
    c.obstacles.push({ x: p.x, z: p.z, r: s * 0.95 });
  }
}

function fence(c: Ctx, color: number, railColor: number, h = 1.6, n = 200): void {
  const R = ARENA_R + 1.2;
  const list: Place[] = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    list.push({ x: Math.cos(a) * R, y: h / 2, z: Math.sin(a) * R, sy: 1 + (c.rand() - 0.5) * 0.3 });
  }
  instances(c, new THREE.CylinderGeometry(0.12, 0.14, h, 6), mat(color), list, true);
  const rail = new THREE.Mesh(new THREE.TorusGeometry(R, 0.07, 6, 160), mat(railColor));
  rail.rotation.x = Math.PI / 2;
  rail.position.y = h * 0.7;
  c.root.add(rail);
}

function mountains(c: Ctx, color: number, n = 18, snow = false): void {
  const m = mat(color, { flatShading: true });
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + c.rand() * 0.1;
    const h = 30 + c.rand() * 34;
    const r = 18 + c.rand() * 14;
    const d = 175 + c.rand() * 25;
    const mt = new THREE.Mesh(new THREE.ConeGeometry(r, h, 5), m);
    mt.position.set(Math.cos(a) * d, h / 2 - 1, Math.sin(a) * d);
    c.root.add(mt);
    if (snow) {
      const cap = new THREE.Mesh(new THREE.ConeGeometry(r * 0.38, h * 0.3, 5), mat(0xf4f8fc, { flatShading: true }));
      cap.position.set(mt.position.x, h - h * 0.15 - 1, mt.position.z);
      c.root.add(cap);
    }
  }
}

/** Hạt bay quanh người chơi (mưa, tuyết, tro, đom đóm...). */
function particles(c: Ctx, o: { n: number; w: number; h: number; color: number; size: number; vy: number; vx?: number; vz?: number; wob?: number; opacity?: number; additive?: boolean }): void {
  const pos = new Float32Array(o.n * 3);
  for (let i = 0; i < o.n; i++) {
    pos[i * 3] = (c.rand() - 0.5) * o.w;
    pos[i * 3 + 1] = c.rand() * o.h;
    pos[i * 3 + 2] = (c.rand() - 0.5) * o.w;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const pts = new THREE.Points(
    geo,
    new THREE.PointsMaterial({ color: o.color, size: o.size, transparent: true, opacity: o.opacity ?? 0.85, depthWrite: false, blending: o.additive ? THREE.AdditiveBlending : THREE.NormalBlending }),
  );
  pts.frustumCulled = false;
  c.root.add(pts);
  c.upd.push((t, dt, f) => {
    const a = geo.getAttribute('position') as THREE.BufferAttribute;
    const hw = o.w / 2;
    for (let i = 0; i < o.n; i++) {
      let x = a.getX(i) + (o.vx ?? 0) * dt + (o.wob ? Math.sin(t * 0.9 + i) * o.wob * dt : 0);
      let y = a.getY(i) + o.vy * dt;
      let z = a.getZ(i) + (o.vz ?? 0) * dt + (o.wob ? Math.cos(t * 0.7 + i * 1.3) * o.wob * dt : 0);
      if (x - f.x > hw) x -= o.w;
      else if (x - f.x < -hw) x += o.w;
      if (z - f.z > hw) z -= o.w;
      else if (z - f.z < -hw) z += o.w;
      if (y < 0) y += o.h;
      else if (y > o.h) y -= o.h;
      a.setXYZ(i, x, y, z);
    }
    a.needsUpdate = true;
  });
}

function deadTree(c: Ctx, x: number, z: number, scale: number, color = 0x3a2a22): THREE.Group {
  const g = new THREE.Group();
  const wood = mat(color);
  g.add(cyl(0.18 * scale, 0.32 * scale, 4.2 * scale, wood, 0, 2.1 * scale, 0, 6));
  for (let i = 0; i < 4; i++) {
    const a = i * 1.7 + c.rand();
    const br = cyl(0.04 * scale, 0.12 * scale, 2.2 * scale, wood, 0, 0, 0, 5);
    br.position.set(Math.cos(a) * 0.5 * scale, (2.8 + i * 0.35) * scale, Math.sin(a) * 0.5 * scale);
    br.rotation.set(Math.sin(a) * 0.9, 0, -Math.cos(a) * 0.9);
    g.add(br);
  }
  g.position.set(x, 0, z);
  g.rotation.y = c.rand() * 6;
  c.root.add(g);
  return g;
}

function pine(scale: number, color = 0x2f6a4a): THREE.Group {
  const g = new THREE.Group();
  g.add(cyl(0.2 * scale, 0.28 * scale, 1.2 * scale, mat(0x5a3a22), 0, 0.6 * scale, 0, 6));
  for (let i = 0; i < 4; i++) g.add(cone((1.7 - i * 0.35) * scale, 1.6 * scale, mat(color), 0, (1.6 + i * 1.0) * scale, 0, 7));
  return g;
}

/** Quái vật và hiệu ứng ngoài sân: rừng cây xung quanh bằng instance. */
function treeBelt(c: Ctx, geo: THREE.BufferGeometry, material: THREE.Material, n: number, minH: number, maxH: number, from = ARENA_R + 4, span = 36): void {
  const list: Place[] = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + c.rand() * 0.05;
    const r = from + c.rand() * span;
    list.push({ x: Math.cos(a) * r, y: 0, z: Math.sin(a) * r, sy: minH + c.rand() * (maxH - minH), sx: 0.8 + c.rand() * 0.6, sz: 0.8 + c.rand() * 0.6, ry: c.rand() * 6 });
  }
  instances(c, geo, material, list, true);
}

/* ---------- 1. Làng Trống Đồng (ban ngày) ---------- */

function village(): BiomeScene {
  const c = ctx(77);
  ground(c, '#5b9a45', ['#4f8a3b', '#69a84f', '#58963f', '#74b457'], '#c4a574', ['#a98a5c', '#d6bb8c', '#b79a68'], 1);
  const drum = new THREE.Mesh(new THREE.CircleGeometry(12, 64), new THREE.MeshStandardMaterial({ map: drumTexture(), roughness: 0.7, transparent: true }));
  drum.rotation.x = -Math.PI / 2;
  drum.position.y = 0.04;
  drum.receiveShadow = true;
  c.root.add(drum);

  const bronze = mat(0xc8963e, { metalness: 0.65, roughness: 0.4 });
  const mon = new THREE.Group();
  mon.add(cyl(2.5, 2.2, 0.5, bronze, 0, 0.25, 0, 20));
  mon.add(cyl(2.1, 1.6, 0.9, bronze, 0, 0.95, 0, 20));
  mon.add(cyl(2.6, 2.1, 0.25, bronze, 0, 1.52, 0, 20));
  const rim = new THREE.Mesh(new THREE.TorusGeometry(2.35, 0.1, 8, 28), bronze);
  rim.rotation.x = Math.PI / 2;
  rim.position.y = 1.65;
  mon.add(rim);
  mon.add(cone(0.35, 0.6, mat(0xf0c870, { metalness: 0.6 }), 0, 1.95, 0, 12));
  c.root.add(mon);
  c.obstacles.push({ x: 0, z: 0, r: 2.7 });

  const houses: [number, number, number][] = [[-38, -30, 0.5], [42, -28, -0.4], [-44, 26, 2.5], [40, 38, 3.5], [0, -56, 0], [-8, 54, 3.1]];
  for (const [x, z, ry] of houses) {
    const h = nhaSan();
    h.position.set(x, 0, z);
    h.rotation.y = ry;
    c.root.add(h);
    c.obstacles.push({ x, z, r: 3.1 });
    const lx = x + Math.cos(ry) * 3.2;
    const lz = z - Math.sin(ry) * 3.2;
    c.root.add(cyl(0.05, 0.05, 2.2, mat(0x4a3018), lx, 1.1, lz, 5));
    c.root.add(sph(0.3, mat(0xd02a1a, { emissive: 0xff3010, emissiveIntensity: 0.9 }), lx, 2.35, lz, 1, 1.2, 1, 10));
  }

  const pondX = -20;
  const pondZ = 28;
  const pond = new THREE.Mesh(new THREE.CircleGeometry(6.5, 32), new THREE.MeshStandardMaterial({ color: 0x3a8ad0, roughness: 0.15, metalness: 0.2, transparent: true, opacity: 0.9 }));
  pond.rotation.x = -Math.PI / 2;
  pond.position.set(pondX, 0.06, pondZ);
  c.root.add(pond);
  const bank = new THREE.Mesh(new THREE.RingGeometry(6.4, 7.6, 32), new THREE.MeshStandardMaterial({ color: 0x8a7a50, roughness: 1 }));
  bank.rotation.x = -Math.PI / 2;
  bank.position.set(pondX, 0.05, pondZ);
  c.root.add(bank);
  for (let i = 0; i < 11; i++) {
    const a = c.rand() * Math.PI * 2;
    const r = c.rand() * 5.2;
    const px = pondX + Math.cos(a) * r;
    const pz = pondZ + Math.sin(a) * r;
    c.root.add(cyl(0.7, 0.7, 0.04, mat(0x2f8a3a), px, 0.1, pz, 10));
    if (i % 2 === 0) c.root.add(cone(0.2, 0.4, mat(0xf070a8), px, 0.3, pz, 6));
  }
  c.obstacles.push({ x: pondX, z: pondZ, r: 6.7 });
  rocks(c, 14, 0x8a8a92);

  const grass: Place[] = [];
  const flowers: Place[] = [];
  for (let i = 0; i < 900; i++) {
    const a = c.rand() * Math.PI * 2;
    const r = Math.sqrt(c.rand()) * (ARENA_R - 1);
    grass.push({ x: Math.cos(a) * r, y: 0.25, z: Math.sin(a) * r, sy: 0.7 + c.rand() * 0.9, ry: c.rand() * 3 });
    if (i % 5 === 0) flowers.push({ x: Math.cos(a) * r + 0.3, y: 0.55, z: Math.sin(a) * r });
  }
  instances(c, new THREE.ConeGeometry(0.15, 0.4, 4), mat(0x6aa04f), grass);
  instances(c, new THREE.SphereGeometry(0.1, 5, 4), mat(0xf4e060), flowers);
  fence(c, 0x9ab04a, 0x7a8a38);
  treeBelt(c, new THREE.CylinderGeometry(0.16, 0.2, 1, 6), mat(0x4a9a3a), 700, 7, 14, ARENA_R + 4, 34);
  treeBelt(c, new THREE.ConeGeometry(1.1, 1.6, 6), mat(0x6dbb4f), 160, 1, 1.6, ARENA_R + 6, 30);

  for (let i = 0; i < 6; i++) {
    const a = 0.3 + i * 1.05;
    const f = new THREE.Mesh(
      new THREE.PlaneGeometry(30, 16),
      new THREE.MeshStandardMaterial({
        map: canvasTex(64, (g, s) => {
          g.fillStyle = '#9fcf4a';
          g.fillRect(0, 0, s, s);
          g.fillStyle = '#7fb23a';
          for (let y = 0; y < s; y += 8) g.fillRect(0, y, s, 3);
        }, 6),
        roughness: 1,
      }),
    );
    f.rotation.x = -Math.PI / 2;
    f.rotation.z = a;
    f.position.set(Math.cos(a) * 118, 0.03, Math.sin(a) * 118);
    c.root.add(f);
  }
  mountains(c, 0x6a8aa0);

  const clouds: THREE.Group[] = [];
  const cm = mat(0xffffff, { flatShading: false, emissive: 0xaaaaaa, emissiveIntensity: 0.4 });
  for (let i = 0; i < 10; i++) {
    const cl = new THREE.Group();
    for (let k = 0; k < 4; k++) cl.add(sph(3 + c.rand() * 2, cm, k * 3.2 - 5, c.rand() * 1.2, c.rand() * 2, 1.3, 0.7, 1, 8));
    cl.position.set((c.rand() - 0.5) * 300, 44 + c.rand() * 12, (c.rand() - 0.5) * 300);
    c.root.add(cl);
    clouds.push(cl);
  }
  c.upd.push((_t, dt) => {
    for (const cl of clouds) {
      cl.position.x += dt * 1.2;
      if (cl.position.x > 170) cl.position.x = -170;
    }
  });
  // Phấn hoa và lá tre bay
  particles(c, { n: 160, w: 70, h: 14, color: 0xf4e68a, size: 0.22, vy: 0.25, vx: 0.8, wob: 1.5, opacity: 0.7 });
  particles(c, { n: 60, w: 70, h: 16, color: 0x8ac84a, size: 0.3, vy: -0.8, vx: 1.2, wob: 2.5, opacity: 0.9 });
  return finish(c);
}

/* ---------- 2. Nghĩa Địa Sương Mù ---------- */

function graveyard(): BiomeScene {
  const c = ctx(1201);
  ground(c, '#454660', ['#3a3b52', '#52536e', '#40415c'], '#5e5e72', ['#50505f', '#70708a', '#585870']);
  // Hầm mộ ở giữa sân
  const stone = mat(0x6a6a78);
  const dark = mat(0x2a2a34);
  const crypt = new THREE.Group();
  crypt.add(box(5.4, 2.6, 4.4, stone, 0, 1.3, 0));
  crypt.add(box(5.9, 0.3, 4.9, mat(0x585866), 0, 2.75, 0));
  crypt.add(box(4.6, 1.0, 3.6, stone, 0, 3.4, 0));
  crypt.add(cone(3.2, 1.6, mat(0x585866), 0, 4.7, 0, 4).rotateY(Math.PI / 4));
  crypt.add(box(1.4, 1.9, 0.2, dark, 0, 0.95, 2.25));
  crypt.add(cyl(0.7, 0.7, 0.2, dark, 0, 1.9, 2.25, 14).rotateX(Math.PI / 2));
  for (const x of [-2.4, 2.4]) crypt.add(cyl(0.25, 0.3, 2.8, mat(0x7a7a88), x, 1.4, 2.4, 8));
  c.root.add(crypt);
  c.obstacles.push({ x: 0, z: 0, r: 3.9 });
  // Bia mộ
  const stones: Place[] = [];
  const crosses: Place[] = [];
  for (let i = 0; i < 70; i++) {
    const p = spot(c, 8, ARENA_R - 3, 1.6, 8);
    if (!p) continue;
    const h = 0.9 + c.rand() * 0.9;
    stones.push({ x: p.x, y: h / 2, z: p.z, sy: h, ry: c.rand() * 0.6 - 0.3, rz: (c.rand() - 0.5) * 0.25 });
    if (i % 4 === 0) crosses.push({ x: p.x, y: h + 0.25, z: p.z });
    if (i % 3 === 0) c.obstacles.push({ x: p.x, z: p.z, r: 0.6 });
  }
  instances(c, new THREE.BoxGeometry(0.8, 1, 0.22), mat(0x7a7a86), stones, true);
  instances(c, new THREE.BoxGeometry(0.6, 0.12, 0.14), mat(0x7a7a86), crosses, true);
  for (let i = 0; i < 18; i++) {
    const p = spot(c, 12, ARENA_R - 3, 3);
    if (!p) continue;
    deadTree(c, p.x, p.z, 1.1 + c.rand() * 0.6, 0x2a2a34);
    c.obstacles.push({ x: p.x, z: p.z, r: 0.7 });
  }
  rocks(c, 8, 0x55556a);
  fence(c, 0x2a2a34, 0x3c3c48, 2.0, 160);
  // Hàng cây chết xa
  treeBelt(c, new THREE.CylinderGeometry(0.2, 0.4, 1, 5), mat(0x23232c), 240, 6, 13, ARENA_R + 5, 40);
  mountains(c, 0x3a3a52, 14);
  // Trăng nhợt
  const moon = new THREE.Mesh(new THREE.SphereGeometry(14, 24, 16), new THREE.MeshBasicMaterial({ color: 0xdfe6ff, fog: false }));
  moon.position.set(-120, 90, -170);
  c.root.add(moon);
  // Sương mù dưới đất
  const mist: THREE.Mesh[] = [];
  for (let i = 0; i < 14; i++) {
    const m = new THREE.Mesh(new THREE.CircleGeometry(14 + c.rand() * 8, 20), new THREE.MeshBasicMaterial({ color: 0xa8b0d8, transparent: true, opacity: 0.16, depthWrite: false }));
    m.rotation.x = -Math.PI / 2;
    m.position.set((c.rand() - 0.5) * ARENA_R * 1.7, 0.5 + c.rand() * 0.6, (c.rand() - 0.5) * ARENA_R * 1.7);
    c.root.add(m);
    mist.push(m);
  }
  // Ma trơi
  const wisps: THREE.Mesh[] = [];
  for (let i = 0; i < 26; i++) {
    const w = new THREE.Mesh(new THREE.SphereGeometry(0.28, 8, 6), new THREE.MeshBasicMaterial({ color: i % 3 ? 0x7af0c8 : 0x9ab0ff, transparent: true, opacity: 0.8 }));
    w.position.set((c.rand() - 0.5) * ARENA_R * 1.8, 1.5, (c.rand() - 0.5) * ARENA_R * 1.8);
    c.root.add(w);
    wisps.push(w);
  }
  c.upd.push((t) => {
    mist.forEach((m, i) => {
      m.position.x += Math.sin(t * 0.1 + i) * 0.01;
      (m.material as THREE.MeshBasicMaterial).opacity = 0.13 + Math.sin(t * 0.5 + i) * 0.04;
    });
    wisps.forEach((w, i) => {
      w.position.y = 1.4 + Math.sin(t * 1.3 + i * 1.7) * 0.6;
      w.position.x += Math.cos(t * 0.4 + i) * 0.012;
      w.position.z += Math.sin(t * 0.35 + i * 2) * 0.012;
      w.scale.setScalar(0.8 + Math.sin(t * 3 + i) * 0.25);
    });
  });
  particles(c, { n: 120, w: 70, h: 8, color: 0xb8c0ff, size: 0.18, vy: 0.2, vx: 0.4, wob: 1.2, opacity: 0.5, additive: true });
  return finish(c);
}

/* ---------- 3. Rừng Trăng Máu ---------- */

function bloodForest(): BiomeScene {
  const c = ctx(3303);
  ground(c, '#5e2c34', ['#4c2028', '#743640', '#5a2830'], '#7a3c40', ['#64303a', '#90505a', '#70383e']);
  // Bàn thờ đá và pha lê máu ở giữa
  const stone = mat(0x3a2e34);
  const altar = new THREE.Group();
  altar.add(cyl(3.6, 4.0, 0.6, stone, 0, 0.3, 0, 8));
  altar.add(cyl(2.4, 2.8, 0.8, stone, 0, 1.0, 0, 8));
  const crystal = new THREE.Mesh(new THREE.OctahedronGeometry(1.2, 0), new THREE.MeshStandardMaterial({ color: 0xff2a3a, emissive: 0xff1020, emissiveIntensity: 1.4, flatShading: true }));
  crystal.scale.set(0.8, 1.8, 0.8);
  crystal.position.y = 3.2;
  altar.add(crystal);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    altar.add(cyl(0.3, 0.4, 3.2 + (i % 2), stone, Math.cos(a) * 5, 1.6, Math.sin(a) * 5, 6));
  }
  c.root.add(altar);
  c.obstacles.push({ x: 0, z: 0, r: 4.2 });
  for (let i = 0; i < 40; i++) {
    const p = spot(c, 10, ARENA_R - 3, 3.5);
    if (!p) continue;
    deadTree(c, p.x, p.z, 1.2 + c.rand() * 0.9, 0x1e1214);
    c.obstacles.push({ x: p.x, z: p.z, r: 0.8 });
  }
  rocks(c, 10, 0x4a3a40);
  // Nấm đỏ phát sáng
  const shrooms: Place[] = [];
  for (let i = 0; i < 90; i++) {
    const a = c.rand() * Math.PI * 2;
    const r = c.rand() * (ARENA_R - 2);
    shrooms.push({ x: Math.cos(a) * r, y: 0.25, z: Math.sin(a) * r, sx: 0.6 + c.rand(), sy: 0.6 + c.rand(), sz: 0.6 + c.rand() });
  }
  instances(c, new THREE.SphereGeometry(0.3, 8, 5, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0xd02a3a, emissive: 0x8a0a1a, emissiveIntensity: 0.9 }), shrooms);
  fence(c, 0x1e1214, 0x2e1c20, 2.2, 160);
  treeBelt(c, new THREE.CylinderGeometry(0.25, 0.5, 1, 5), mat(0x180e10), 320, 8, 17, ARENA_R + 4, 44);
  mountains(c, 0x3a1a24, 14);
  // Trăng máu khổng lồ
  const moon = new THREE.Mesh(new THREE.SphereGeometry(26, 28, 20), new THREE.MeshBasicMaterial({ color: 0xff4030, fog: false }));
  moon.position.set(-110, 95, -190);
  c.root.add(moon);
  const halo = new THREE.Mesh(new THREE.SphereGeometry(36, 24, 16), new THREE.MeshBasicMaterial({ color: 0xff2010, transparent: true, opacity: 0.18, fog: false, depthWrite: false }));
  halo.position.copy(moon.position);
  c.root.add(halo);
  // Dơi
  const bats: THREE.Group[] = [];
  const wingM = new THREE.MeshBasicMaterial({ color: 0x120a0c, side: THREE.DoubleSide });
  for (let i = 0; i < 16; i++) {
    const b = new THREE.Group();
    b.add(sph(0.14, wingM, 0, 0, 0, 1, 1, 1.4, 6));
    for (const s of [-1, 1]) {
      const w = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 0.28), wingM);
      w.geometry.translate(s * 0.35, 0, 0);
      w.name = s < 0 ? 'wl' : 'wr';
      w.rotation.x = -Math.PI / 2;
      b.add(w);
    }
    c.root.add(b);
    bats.push(b);
  }
  c.upd.push((t, _dt, f) => {
    crystal.rotation.y = t * 0.8;
    (crystal.material as THREE.MeshStandardMaterial).emissiveIntensity = 1.1 + Math.sin(t * 2) * 0.4;
    bats.forEach((b, i) => {
      const a = t * (0.5 + (i % 4) * 0.1) + i * 2.1;
      const r = 14 + (i % 5) * 5;
      b.position.set(f.x + Math.cos(a) * r, 9 + (i % 4) * 2 + Math.sin(t * 2 + i) * 0.8, f.z + Math.sin(a) * r);
      b.rotation.y = -a;
      const flap = Math.sin(t * 16 + i) * 0.8;
      for (const ch of b.children) {
        if (ch.name === 'wl') ch.rotation.z = flap;
        else if (ch.name === 'wr') ch.rotation.z = -flap;
      }
    });
  });
  particles(c, { n: 140, w: 70, h: 14, color: 0xff6a4a, size: 0.2, vy: 0.5, vx: 0.5, wob: 1.5, opacity: 0.7, additive: true });
  return finish(c);
}

/* ---------- 4. Đồi Giông Bão ---------- */

function storm(): BiomeScene {
  const c = ctx(5505);
  ground(c, '#3e5048', ['#33443c', '#4c6258', '#3a4c44'], '#5e6a68', ['#505c5a', '#74827e', '#5a6866'], 0.55);
  // Tháp Tesla ở giữa và quanh sân
  const metal = mat(0x6a7480, { metalness: 0.7, roughness: 0.4 });
  const tesla: { orb: THREE.Mesh; x: number; z: number }[] = [];
  const tower = (x: number, z: number, h: number) => {
    const g = new THREE.Group();
    g.add(cyl(1.4, 1.8, 0.6, metal, 0, 0.3, 0, 8));
    g.add(cyl(0.6, 1.0, h, metal, 0, h / 2 + 0.6, 0, 8));
    for (let i = 0; i < 3; i++) {
      const r = new THREE.Mesh(new THREE.TorusGeometry(1.0 - i * 0.18, 0.1, 6, 18), mat(0xb08a4a, { metalness: 0.8 }));
      r.rotation.x = Math.PI / 2;
      r.position.y = h * (0.55 + i * 0.15);
      g.add(r);
    }
    const orb = new THREE.Mesh(new THREE.SphereGeometry(0.9, 14, 10), new THREE.MeshStandardMaterial({ color: 0x9ae0ff, emissive: 0x40b0ff, emissiveIntensity: 1.6 }));
    orb.position.y = h + 1.4;
    g.add(orb);
    g.position.set(x, 0, z);
    c.root.add(g);
    c.obstacles.push({ x, z, r: 1.8 });
    tesla.push({ orb, x, z });
  };
  tower(0, 0, 8);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + 0.3;
    tower(Math.cos(a) * 42, Math.sin(a) * 42, 6 + (i % 2) * 2);
  }
  // Trụ đá đổ nát và container
  for (let i = 0; i < 16; i++) {
    const p = spot(c, 10, ARENA_R - 3, 3);
    if (!p) continue;
    const h = 2 + c.rand() * 3;
    const col = cyl(0.7, 0.8, h, mat(0x6a7078), p.x, h / 2, p.z, 7);
    col.rotation.z = (c.rand() - 0.5) * 0.2;
    c.root.add(col);
    c.obstacles.push({ x: p.x, z: p.z, r: 0.9 });
  }
  rocks(c, 12, 0x555e66);
  fence(c, 0x4a5258, 0x5a6268, 1.8, 180);
  treeBelt(c, new THREE.ConeGeometry(1.2, 1, 6), mat(0x2a4a3a), 260, 4, 9, ARENA_R + 4, 40);
  mountains(c, 0x3a4658, 16);
  // Mây đen
  const clouds: THREE.Group[] = [];
  const cm = new THREE.MeshStandardMaterial({ color: 0x3a3e48, roughness: 1, emissive: 0x15171c });
  for (let i = 0; i < 14; i++) {
    const cl = new THREE.Group();
    for (let k = 0; k < 5; k++) cl.add(sph(5 + c.rand() * 3, cm, k * 4.5 - 8, c.rand() * 1.5, c.rand() * 3, 1.4, 0.6, 1, 8));
    cl.position.set((c.rand() - 0.5) * 320, 48 + c.rand() * 10, (c.rand() - 0.5) * 320);
    c.root.add(cl);
    clouds.push(cl);
  }
  // Tia sét
  const boltMat = new THREE.LineBasicMaterial({ color: 0xe8f4ff, fog: false });
  const bolt = new THREE.Line(new THREE.BufferGeometry(), boltMat);
  bolt.frustumCulled = false;
  bolt.visible = false;
  c.root.add(bolt);
  let nextBolt = 3 + c.rand() * 3;
  let boltAge = 9;
  const arcs: THREE.Line[] = tesla.map(() => {
    const l = new THREE.Line(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({ color: 0x8ae0ff }));
    l.frustumCulled = false;
    c.root.add(l);
    return l;
  });
  c.upd.push((t, dt, f) => {
    for (const cl of clouds) {
      cl.position.x += dt * 2.2;
      if (cl.position.x > 170) cl.position.x = -170;
    }
    tesla.forEach((tw, i) => {
      (tw.orb.material as THREE.MeshStandardMaterial).emissiveIntensity = 1.2 + Math.sin(t * 6 + i) * 0.6;
      // Hồ quang nhấp nháy quanh quả cầu
      const pts: THREE.Vector3[] = [];
      const top = tw.orb.getWorldPosition(new THREE.Vector3());
      const a = Math.random() * Math.PI * 2;
      for (let k = 0; k <= 5; k++) pts.push(top.clone().add(new THREE.Vector3(Math.cos(a) * k * 0.45 + (Math.random() - 0.5) * 0.4, -k * 0.2 + (Math.random() - 0.5) * 0.4, Math.sin(a) * k * 0.45 + (Math.random() - 0.5) * 0.4)));
      arcs[i].geometry.setFromPoints(pts);
      arcs[i].visible = Math.sin(t * 9 + i * 3) > -0.2;
    });
    nextBolt -= dt;
    if (nextBolt <= 0) {
      nextBolt = 2.5 + Math.random() * 5;
      boltAge = 0;
      const bx = f.x + (Math.random() - 0.5) * 60;
      const bz = f.z + (Math.random() - 0.5) * 60;
      const pts: THREE.Vector3[] = [];
      let x = bx;
      let z = bz;
      for (let y = 55; y >= 0; y -= 5) {
        pts.push(new THREE.Vector3(x, y, z));
        x += (Math.random() - 0.5) * 5;
        z += (Math.random() - 0.5) * 5;
      }
      bolt.geometry.setFromPoints(pts);
    }
    boltAge += dt;
    bolt.visible = boltAge < 0.22;
    return boltAge < 0.35 ? Math.max(0, 1 - boltAge / 0.35) * (Math.sin(boltAge * 60) > -0.4 ? 1 : 0.3) : 0;
  });
  particles(c, { n: 1500, w: 80, h: 34, color: 0xc4dcf4, size: 0.2, vy: -34, vx: -3, opacity: 0.75 });
  return finish(c);
}

/* ---------- 5. Cao Nguyên Băng Giá ---------- */

function snowland(): BiomeScene {
  const c = ctx(7707);
  ground(c, '#e6eef6', ['#d4e2ee', '#f4f8fc', '#c8d8e8'], '#c8dcec', ['#b4cce0', '#dcecf8', '#a8c4dc'], 0.7);
  // Tượng băng ở giữa
  const ice = new THREE.MeshStandardMaterial({ color: 0x9ad8f8, emissive: 0x3a90c0, emissiveIntensity: 0.55, transparent: true, opacity: 0.85, flatShading: true, roughness: 0.15, metalness: 0.2 });
  const center = new THREE.Group();
  center.add(cyl(3.2, 3.6, 0.7, mat(0xb8d0e4), 0, 0.35, 0, 10));
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    const sp = cone(0.7, 3.4 + (i % 2) * 1.6, ice, Math.cos(a) * 1.6, 2.2 + (i % 2) * 0.8, Math.sin(a) * 1.6, 5);
    sp.rotation.z = Math.cos(a) * 0.25;
    sp.rotation.x = -Math.sin(a) * 0.25;
    center.add(sp);
  }
  center.add(cone(1.1, 5.4, ice, 0, 3.4, 0, 5));
  c.root.add(center);
  c.obstacles.push({ x: 0, z: 0, r: 3.6 });
  // Tinh thể băng
  for (let i = 0; i < 22; i++) {
    const p = spot(c, 9, ARENA_R - 3, 3);
    if (!p) continue;
    const h = 1.6 + c.rand() * 2.4;
    const cr = new THREE.Mesh(new THREE.OctahedronGeometry(0.8 + c.rand() * 0.5, 0), ice);
    cr.scale.set(0.7, h / 1.3, 0.7);
    cr.position.set(p.x, h / 2, p.z);
    cr.rotation.y = c.rand() * 3;
    cr.castShadow = true;
    c.root.add(cr);
    c.obstacles.push({ x: p.x, z: p.z, r: 0.9 });
  }
  // Ao đóng băng
  const lake = new THREE.Mesh(new THREE.CircleGeometry(9, 36), new THREE.MeshStandardMaterial({ color: 0x8ac4e8, roughness: 0.08, metalness: 0.3 }));
  lake.rotation.x = -Math.PI / 2;
  lake.position.set(26, 0.06, -24);
  c.root.add(lake);
  c.obstacles.push({ x: 26, z: -24, r: 9 });
  // Thông tuyết
  for (let i = 0; i < 26; i++) {
    const p = spot(c, 14, ARENA_R - 3, 3.5);
    if (!p) continue;
    const t = pine(1.2 + c.rand() * 0.8, i % 3 ? 0x2f6a52 : 0x3a7a60);
    t.position.set(p.x, 0, p.z);
    c.root.add(t);
    const capm = mat(0xf4f8fc);
    for (let k = 0; k < 3; k++) {
      const cap = cone((1.2 - k * 0.3) * 0.7, 0.5, capm, p.x, (2.2 + k * 1.0) * (1.2 + 0) , p.z, 7);
      cap.position.y = 2.5 + k * 1.1;
      cap.scale.setScalar(1.2);
      c.root.add(cap);
    }
    c.obstacles.push({ x: p.x, z: p.z, r: 0.7 });
  }
  rocks(c, 10, 0xaab8c8);
  fence(c, 0x9ab0c4, 0xb4c8d8, 1.5, 180);
  // Rừng thông xa
  const treeList: Place[] = [];
  const snowList: Place[] = [];
  for (let i = 0; i < 260; i++) {
    const a = (i / 260) * Math.PI * 2 + c.rand() * 0.05;
    const r = ARENA_R + 5 + c.rand() * 44;
    const s = 3 + c.rand() * 4;
    treeList.push({ x: Math.cos(a) * r, y: s * 0.8, z: Math.sin(a) * r, sx: s * 0.45, sy: s, sz: s * 0.45 });
    snowList.push({ x: Math.cos(a) * r, y: s * 1.55, z: Math.sin(a) * r, sx: s * 0.2, sy: s * 0.4, sz: s * 0.2 });
  }
  instances(c, new THREE.ConeGeometry(1, 1.6, 6), mat(0x2a5a44), treeList, true);
  instances(c, new THREE.ConeGeometry(1, 1.2, 6), mat(0xf0f6fb), snowList);
  mountains(c, 0x8aa0b8, 18, true);
  // Cực quang
  const aurora: THREE.Mesh[] = [];
  for (let i = 0; i < 3; i++) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(260, 40, 24, 1), new THREE.MeshBasicMaterial({ color: i === 1 ? 0x7af0b8 : 0x8ab8ff, transparent: true, opacity: 0.16, side: THREE.DoubleSide, depthWrite: false, fog: false, blending: THREE.AdditiveBlending }));
    m.position.set(0, 70 + i * 6, -170 - i * 18);
    c.root.add(m);
    aurora.push(m);
  }
  c.upd.push((t) => {
    aurora.forEach((m, i) => {
      const pos = m.geometry.getAttribute('position') as THREE.BufferAttribute;
      for (let k = 0; k < pos.count; k++) pos.setY(k, (k < 25 ? 20 : -20) + Math.sin(t * 0.6 + pos.getX(k) * 0.04 + i) * 6);
      pos.needsUpdate = true;
    });
  });
  particles(c, { n: 700, w: 80, h: 30, color: 0xffffff, size: 0.22, vy: -2.2, vx: -1.2, wob: 2.5, opacity: 0.9 });
  return finish(c);
}

/* ---------- 6. Núi Lửa Rồng Lửa ---------- */

function volcano(): BiomeScene {
  const c = ctx(9909);
  ground(c, '#4a2a20', ['#3a1e16', '#62382a', '#4c2c22'], '#5e3a2a', ['#4a2a1c', '#7a4a34', '#5c3624']);
  const lavaMat = new THREE.MeshStandardMaterial({ color: 0xff5a10, emissive: 0xff3a00, emissiveIntensity: 1.3, roughness: 0.5 });
  const pools: THREE.Mesh[] = [];
  const pool = (x: number, z: number, r: number) => {
    const rim = new THREE.Mesh(new THREE.RingGeometry(r, r + 1.3, 28), new THREE.MeshStandardMaterial({ color: 0x1a0c08, roughness: 1 }));
    rim.rotation.x = -Math.PI / 2;
    rim.position.set(x, 0.07, z);
    c.root.add(rim);
    const l = new THREE.Mesh(new THREE.CircleGeometry(r, 28), lavaMat);
    l.rotation.x = -Math.PI / 2;
    l.position.set(x, 0.09, z);
    c.root.add(l);
    pools.push(l);
    c.obstacles.push({ x, z, r: r + 0.4 });
  };
  // Hố dung nham ở giữa là cái bệ đá với ngọn lửa
  const altar = new THREE.Group();
  altar.add(cyl(3.4, 3.9, 0.7, mat(0x2a1a14), 0, 0.35, 0, 8));
  const flame = cone(1.2, 3.4, new THREE.MeshStandardMaterial({ color: 0xff7a20, emissive: 0xff4a00, emissiveIntensity: 1.6, transparent: true, opacity: 0.9 }), 0, 2.5, 0, 7);
  altar.add(flame);
  c.root.add(altar);
  c.obstacles.push({ x: 0, z: 0, r: 3.6 });
  pool(-30, 18, 7);
  pool(32, 24, 6);
  pool(10, -38, 8);
  pool(-38, -26, 5);
  // Đá núi lửa nhọn
  for (let i = 0; i < 22; i++) {
    const p = spot(c, 10, ARENA_R - 3, 3);
    if (!p) continue;
    const h = 2 + c.rand() * 4;
    const r = new THREE.Mesh(new THREE.ConeGeometry(0.9 + c.rand() * 0.8, h, 5), mat(0x2e1c16, { flatShading: true }));
    r.position.set(p.x, h / 2, p.z);
    r.rotation.y = c.rand() * 3;
    r.castShadow = true;
    c.root.add(r);
    c.obstacles.push({ x: p.x, z: p.z, r: 1.0 });
  }
  rocks(c, 8, 0x3a2a24);
  fence(c, 0x1a0c08, 0x2a1810, 2.0, 180);
  // Núi lửa khổng lồ phía sau với miệng phát sáng
  const vol = new THREE.Mesh(new THREE.ConeGeometry(70, 100, 12, 1, true), mat(0x2a1a16, { flatShading: true }));
  vol.position.set(0, 48, -190);
  c.root.add(vol);
  const crater = new THREE.Mesh(new THREE.CircleGeometry(16, 20), new THREE.MeshBasicMaterial({ color: 0xff6a20, fog: false }));
  crater.rotation.x = -Math.PI / 2;
  crater.position.set(0, 98, -190);
  c.root.add(crater);
  mountains(c, 0x3a2420, 16);
  particles(c, { n: 260, w: 70, h: 24, color: 0xff7a20, size: 0.3, vy: 3.2, vx: 0.8, wob: 2.2, opacity: 0.95, additive: true });
  particles(c, { n: 240, w: 80, h: 28, color: 0x6a5a56, size: 0.35, vy: -1.4, vx: 1.4, wob: 1.5, opacity: 0.55 });
  c.upd.push((t) => {
    lavaMat.emissiveIntensity = 1.1 + Math.sin(t * 2.4) * 0.35;
    flame.scale.set(1 + Math.sin(t * 9) * 0.12, 1 + Math.sin(t * 7) * 0.15, 1 + Math.cos(t * 8) * 0.12);
  });
  return finish(c);
}

/* ---------- 7. Đầm Lầy Bạch Đằng ---------- */

function bachDang(): BiomeScene {
  const c = ctx(6606);
  ground(c, '#56684a', ['#4a5c40', '#62784e', '#586a46'], '#8c7c58', ['#7a6a48', '#a09068', '#867650']);
  // dòng sông bao quanh sân, mực nước dập dềnh theo thủy triều
  const water = new THREE.Mesh(new THREE.RingGeometry(ARENA_R + 0.8, 360, 72), new THREE.MeshStandardMaterial({ color: 0x3a7a88, roughness: 0.18, metalness: 0.25, transparent: true, opacity: 0.93 }));
  water.rotation.x = -Math.PI / 2;
  water.position.y = 0.05;
  c.root.add(water);
  for (const [x, z, r] of [[-28, 22, 7], [32, -24, 6], [-34, -26, 5]] as const) {
    const p = new THREE.Mesh(new THREE.CircleGeometry(r, 28), new THREE.MeshStandardMaterial({ color: 0x3a7a88, roughness: 0.15, metalness: 0.25, transparent: true, opacity: 0.92 }));
    p.rotation.x = -Math.PI / 2;
    p.position.set(x, 0.06, z);
    c.root.add(p);
    c.obstacles.push({ x, z, r: r + 0.3 });
  }
  // đài cọc nhọn ở giữa sân và cột cờ
  const wood = mat(0x6a4a2a);
  const tip = mat(0x4a3018);
  const hub = new THREE.Group();
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    const st = new THREE.Group();
    st.add(cyl(0.2, 0.26, 3.2, wood, 0, 1.6, 0, 6));
    st.add(cone(0.2, 0.7, tip, 0, 3.5, 0, 6));
    st.position.set(Math.cos(a) * 2.8, 0, Math.sin(a) * 2.8);
    st.rotation.set(Math.sin(a) * 0.35, 0, -Math.cos(a) * 0.35);
    hub.add(st);
  }
  hub.add(cyl(0.14, 0.18, 7, wood, 0, 3.5, 0, 6));
  hub.add(box(0.05, 1.3, 2.2, mat(0xb3261e), 0, 6.2, 1.2));
  c.root.add(hub);
  c.obstacles.push({ x: 0, z: 0, r: 3.6 });
  // thuyền chiến đắm
  const boat = (x: number, z: number, ry: number, obstacle: boolean): void => {
    const g = new THREE.Group();
    g.add(box(8, 1.3, 2.6, mat(0x5a3e22), 0, 0.5, 0));
    g.add(box(2.2, 1.3, 2.2, mat(0x5a3e22), 4.7, 0.9, 0).rotateZ(0.25));
    g.add(box(2.2, 1.3, 2.2, mat(0x5a3e22), -4.7, 0.9, 0).rotateZ(-0.25));
    g.add(cyl(0.16, 0.2, 7, wood, 0.5, 4, 0, 6));
    g.add(box(0.05, 3.4, 3.2, mat(0x8a6a4a), 0.5, 4.6, 0));
    g.position.set(x, 0, z);
    g.rotation.set(0, ry, 0.08);
    c.root.add(g);
    if (obstacle) c.obstacles.push({ x, z, r: 4 });
  };
  boat(-40, -12, 0.4, true);
  boat(38, 16, -0.7, true);
  boat(8, 52, 1.5, true);
  for (let i = 0; i < 7; i++) {
    const a = c.rand() * Math.PI * 2;
    boat(Math.cos(a) * (ARENA_R + 12 + c.rand() * 30), Math.sin(a) * (ARENA_R + 12 + c.rand() * 30), c.rand() * 6, false);
  }
  // cọc ngầm cắm dưới sông
  const stakes: Place[] = [];
  for (let i = 0; i < 280; i++) {
    const a = c.rand() * Math.PI * 2;
    const r = ARENA_R + 3 + c.rand() * 60;
    const h = 2.2 + c.rand() * 3;
    stakes.push({ x: Math.cos(a) * r, y: h / 2 - 0.3, z: Math.sin(a) * r, sy: h, rx: (c.rand() - 0.5) * 0.3, rz: (c.rand() - 0.5) * 0.3 });
  }
  instances(c, new THREE.ConeGeometry(0.24, 1, 5), mat(0x5a3e22), stakes, true);
  // lau sậy
  const reeds: Place[] = [];
  for (let i = 0; i < 700; i++) {
    const a = c.rand() * Math.PI * 2;
    const r = 40 + c.rand() * 60;
    const h = 1.4 + c.rand() * 1.6;
    reeds.push({ x: Math.cos(a) * r, y: h / 2, z: Math.sin(a) * r, sy: h, rz: (c.rand() - 0.5) * 0.25 });
  }
  instances(c, new THREE.ConeGeometry(0.1, 1, 4), mat(0x9aa860), reeds);
  rocks(c, 8, 0x6a7468);
  treeBelt(c, new THREE.CylinderGeometry(0.18, 0.32, 1, 6), mat(0x4a3a28), 150, 4, 8, ARENA_R + 6, 44);
  treeBelt(c, new THREE.ConeGeometry(1.5, 1.5, 6), mat(0x35603a), 150, 1, 1.5, ARENA_R + 6, 44);
  mountains(c, 0x5a7a78, 14);
  const mist: THREE.Mesh[] = [];
  for (let i = 0; i < 12; i++) {
    const m = new THREE.Mesh(new THREE.CircleGeometry(14 + c.rand() * 8, 20), new THREE.MeshBasicMaterial({ color: 0xe0f0ee, transparent: true, opacity: 0.16, depthWrite: false }));
    m.rotation.x = -Math.PI / 2;
    m.position.set((c.rand() - 0.5) * ARENA_R * 1.7, 0.7 + c.rand() * 0.6, (c.rand() - 0.5) * ARENA_R * 1.7);
    c.root.add(m);
    mist.push(m);
  }
  c.upd.push((t) => {
    water.position.y = 0.05 + Math.sin(t * 0.5) * 0.06;
    mist.forEach((m, i) => {
      m.position.x += Math.sin(t * 0.1 + i) * 0.012;
      (m.material as THREE.MeshBasicMaterial).opacity = 0.13 + Math.sin(t * 0.5 + i) * 0.04;
    });
  });
  particles(c, { n: 90, w: 70, h: 5, color: 0xd8f070, size: 0.26, vy: 0.1, wob: 1.4, opacity: 0.85, additive: true });
  particles(c, { n: 400, w: 80, h: 30, color: 0xbcd4e0, size: 0.1, vy: -22, vx: -2, opacity: 0.35 });
  return finish(c);
}

/* ---------- 8. Hang Phong Nha ---------- */

function phongNha(): BiomeScene {
  const c = ctx(8808);
  ground(c, '#3a4048', ['#2e343c', '#464e58', '#343a44'], '#4a525e', ['#3c4450', '#5a6470', '#444c58']);
  // trần hang: nửa mái vòm úp ngược nhìn từ bên trong
  const dome = new THREE.Mesh(new THREE.SphereGeometry(190, 28, 16, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0x242c36, roughness: 1, side: THREE.BackSide, flatShading: true }));
  c.root.add(dome);
  // nhũ đá treo và măng đá ngoài sân
  const hang: Place[] = [];
  for (let i = 0; i < 260; i++) {
    const a = c.rand() * Math.PI * 2;
    const r = Math.sqrt(c.rand()) * 150;
    const h = 6 + c.rand() * 12;
    hang.push({ x: Math.cos(a) * r, y: 36 - h / 2, z: Math.sin(a) * r, sx: 0.8 + c.rand() * 1.4, sy: h, sz: 0.8 + c.rand() * 1.4, rx: Math.PI });
  }
  instances(c, new THREE.ConeGeometry(1.1, 1, 6), mat(0x5a626e, { flatShading: true }), hang);
  const spikes: Place[] = [];
  for (let i = 0; i < 180; i++) {
    const a = c.rand() * Math.PI * 2;
    const r = ARENA_R + 3 + c.rand() * 70;
    const h = 3 + c.rand() * 11;
    spikes.push({ x: Math.cos(a) * r, y: h / 2, z: Math.sin(a) * r, sx: 0.8 + c.rand(), sy: h, sz: 0.8 + c.rand() });
  }
  instances(c, new THREE.ConeGeometry(1.1, 1, 6), mat(0x565e6a, { flatShading: true }), spikes, true);
  // cột đá giữa sân và tinh thể phát sáng
  const stoneM = mat(0x6a727e, { flatShading: true });
  const pillar = new THREE.Group();
  pillar.add(cyl(2.4, 3.4, 36, stoneM, 0, 18, 0, 9));
  pillar.add(cyl(3.6, 4.2, 1.2, stoneM, 0, 0.6, 0, 9));
  c.root.add(pillar);
  c.obstacles.push({ x: 0, z: 0, r: 3.9 });
  const crystalMats = [0x40e0ff, 0xff60d0, 0x70ff90].map((col) => new THREE.MeshStandardMaterial({ color: col, emissive: col, emissiveIntensity: 1.1, flatShading: true, transparent: true, opacity: 0.92 }));
  const lights: THREE.PointLight[] = [];
  for (let i = 0; i < 14; i++) {
    const p = i === 0 ? { x: 5, z: 1 } : spot(c, 8, ARENA_R - 4, 4);
    if (!p) continue;
    const mt = crystalMats[i % 3];
    const g = new THREE.Group();
    for (let k = 0; k < 4; k++) {
      const h = 1.2 + c.rand() * 2.2;
      const cr = new THREE.Mesh(new THREE.OctahedronGeometry(0.5, 0), mt);
      cr.scale.set(0.7, h, 0.7);
      cr.position.set((c.rand() - 0.5) * 1.6, h * 0.5, (c.rand() - 0.5) * 1.6);
      cr.rotation.set((c.rand() - 0.5) * 0.4, c.rand() * 3, (c.rand() - 0.5) * 0.4);
      g.add(cr);
    }
    g.position.set(p.x, 0, p.z);
    c.root.add(g);
    c.obstacles.push({ x: p.x, z: p.z, r: 1.4 });
    if (i < 5) {
      const l = new THREE.PointLight(mt.color.getHex(), 18, 30, 1.6);
      l.position.set(p.x, 2, p.z);
      c.root.add(l);
      lights.push(l);
    }
  }
  // măng đá thấp trong sân
  for (let i = 0; i < 16; i++) {
    const p = spot(c, 8, ARENA_R - 3, 3);
    if (!p) continue;
    const h = 2 + c.rand() * 3.5;
    const s = new THREE.Mesh(new THREE.ConeGeometry(0.9 + c.rand() * 0.5, h, 6), stoneM);
    s.position.set(p.x, h / 2, p.z);
    s.castShadow = true;
    c.root.add(s);
    c.obstacles.push({ x: p.x, z: p.z, r: 1 });
  }
  // sông ngầm
  for (const [x, z, r] of [[-30, 24, 9], [34, -30, 7]] as const) {
    const pool = new THREE.Mesh(new THREE.CircleGeometry(r, 30), new THREE.MeshStandardMaterial({ color: 0x0c3a4a, emissive: 0x0a3a50, emissiveIntensity: 0.5, roughness: 0.1, metalness: 0.3 }));
    pool.rotation.x = -Math.PI / 2;
    pool.position.set(x, 0.06, z);
    c.root.add(pool);
    c.obstacles.push({ x, z, r: r + 0.3 });
  }
  rocks(c, 14, 0x4a525e);
  particles(c, { n: 170, w: 70, h: 14, color: 0x7ae8ff, size: 0.3, vy: 0.15, wob: 1.6, opacity: 0.85, additive: true });
  particles(c, { n: 60, w: 70, h: 30, color: 0xcfe8ff, size: 0.12, vy: -14, opacity: 0.7 });
  c.upd.push((t) => {
    crystalMats.forEach((mt, i) => (mt.emissiveIntensity = 0.9 + Math.sin(t * 1.6 + i * 2) * 0.35));
    lights.forEach((l, i) => (l.intensity = 14 + Math.sin(t * 1.4 + i * 1.7) * 5));
  });
  return finish(c);
}

export const BIOMES: BiomeDef[] = [
  {
    id: 'lang', name: 'Làng Trống Đồng', desc: 'Sân làng ban ngày, gió mang phấn hoa và lá tre. Goblin, bù nhìn ma, xác sống và bộ xương lang thang.',
    sky: 0xbfe0ee, fog: 0xbfe0ee, fogNear: 70, fogFar: 210, hemiSky: 0xffffff, hemiGround: 0x5a7a3a, hemiI: 1.05, sun: 0xfff0d0, sunI: 2.4, mini: '#5b9a45',
    roster: [{ type: 'goblin', share: 0.24, from: 1 }, { type: 'scarecrow', share: 0.14, from: 1 }, { type: 'skeleton', share: 0.14, from: 2 }, { type: 'werewolf', share: 0.12, from: 4 }], filler: 'zombie', build: village,
  },
  {
    id: 'nghia_dia', name: 'Nghĩa Địa Sương Mù', desc: 'Đêm tím, sương dày, ma trơi lập lòe. Xác ướp, bộ xương, bóng ma và nữ quỷ gào thét trỗi dậy từ mộ. Boss Vua Xương (màn 15, 30, 45...).',
    sky: 0x44445e, fog: 0x565678, fogNear: 22, fogFar: 125, hemiSky: 0x9aa0d0, hemiGround: 0x2a2a3a, hemiI: 1.15, sun: 0xb8c0ff, sunI: 1.9, mini: '#4a4a62',
    roster: [{ type: 'skeleton', share: 0.18, from: 1 }, { type: 'mummy', share: 0.15, from: 1 }, { type: 'ghost', share: 0.16, from: 1 }, { type: 'banshee', share: 0.12, from: 3 }, { type: 'scarecrow', share: 0.08, from: 2 }, { type: 'vampire', share: 0.08, from: 6 }], filler: 'zombie', build: graveyard,
  },
  {
    id: 'trang_mau', name: 'Rừng Trăng Máu', desc: 'Trăng đỏ phủ rừng chết, dơi lượn trên đầu. Dơi quỷ, người sói, ma cà rồng và phù thủy săn mồi.',
    sky: 0x2a0a12, fog: 0x401018, fogNear: 28, fogFar: 135, hemiSky: 0xff8a8a, hemiGround: 0x2a0808, hemiI: 1.25, sun: 0xff7a68, sunI: 2.1, mini: '#6a1a22',
    roster: [{ type: 'bat', share: 0.28, from: 1 }, { type: 'werewolf', share: 0.18, from: 1 }, { type: 'vampire', share: 0.14, from: 3 }, { type: 'witch', share: 0.12, from: 3 }, { type: 'goblin', share: 0.06, from: 1 }], filler: 'bat', build: bloodForest,
  },
  {
    id: 'giong_bao', name: 'Đồi Giông Bão', desc: 'Mưa xối, sét đánh, tháp Tesla phóng điện. Tiểu quỷ, người đá và Frankenstein bước ra từ phòng thí nghiệm. Boss Titan Đá (màn 10, 25, 40...).',
    sky: 0x39414f, fog: 0x4a5462, fogNear: 22, fogFar: 125, hemiSky: 0xb0c0d8, hemiGround: 0x2a3038, hemiI: 1.15, sun: 0xd0e0f8, sunI: 1.8, mini: '#3a4a5a',
    roster: [{ type: 'imp', share: 0.22, from: 1 }, { type: 'golem', share: 0.12, from: 3 }, { type: 'franken', share: 0.1, from: 4 }, { type: 'skeleton', share: 0.1, from: 1 }, { type: 'witch', share: 0.08, from: 5 }], filler: 'zombie', build: storm,
  },
  {
    id: 'bang_tuyet', name: 'Cao Nguyên Băng Giá', desc: 'Tuyết rơi dưới cực quang. Sói băng, người tuyết ma, người tuyết khổng lồ và bóng ma lang thang trong gió lạnh.',
    sky: 0xdce8f4, fog: 0xdce8f4, fogNear: 40, fogFar: 170, hemiSky: 0xe8f4ff, hemiGround: 0x9ab0c8, hemiI: 1.15, sun: 0xfff4e8, sunI: 2.0, mini: '#cfe0ee',
    roster: [{ type: 'ice_wolf', share: 0.24, from: 1 }, { type: 'snowman', share: 0.16, from: 1 }, { type: 'yeti', share: 0.1, from: 4 }, { type: 'ghost', share: 0.12, from: 2 }, { type: 'vampire', share: 0.08, from: 6 }], filler: 'ice_wolf', build: snowland,
  },
  {
    id: 'nui_lua', name: 'Núi Lửa Rồng Lửa', desc: 'Dung nham, tro bụi và tàn lửa bay. Chó địa ngục, tiểu quỷ, quỷ lửa, người dung nham, cùng Rồng Lửa (boss, màn 5, 20, 35...).',
    sky: 0x3a1810, fog: 0x4a2010, fogNear: 28, fogFar: 135, hemiSky: 0xff9a60, hemiGround: 0x301008, hemiI: 1.15, sun: 0xff8a40, sunI: 2.2, mini: '#6a2a14',
    roster: [{ type: 'hellhound', share: 0.22, from: 1 }, { type: 'imp', share: 0.18, from: 1 }, { type: 'demon', share: 0.12, from: 2 }, { type: 'lava_golem', share: 0.1, from: 3 }, { type: 'werewolf', share: 0.08, from: 1 }, { type: 'franken', share: 0.05, from: 6 }], filler: 'imp', build: volcano,
  },
  {
    id: 'bach_dang', name: 'Đầm Lầy Bạch Đằng', desc: 'Sông nước sương khói, cọc nhọn cắm dưới triều, thuyền chiến đắm. Bóng ma, bộ xương, goblin đầm lầy, phù thủy và nữ quỷ.',
    sky: 0x9ab8b0, fog: 0xa8c4bc, fogNear: 24, fogFar: 140, hemiSky: 0xdff4ee, hemiGround: 0x405a4a, hemiI: 1.1, sun: 0xffe6c0, sunI: 1.9, mini: '#3e7070',
    roster: [{ type: 'ghost', share: 0.16, from: 1 }, { type: 'skeleton', share: 0.2, from: 1 }, { type: 'goblin', share: 0.18, from: 1 }, { type: 'witch', share: 0.1, from: 3 }, { type: 'banshee', share: 0.1, from: 3 }], filler: 'zombie', build: bachDang,
  },
  {
    id: 'phong_nha', name: 'Hang Phong Nha', desc: 'Hang động nhũ đá, tinh thể phát sáng và sông ngầm. Dơi quỷ, goblin, xác ướp, nữ quỷ và người đá.',
    sky: 0x0c1218, fog: 0x141c26, fogNear: 12, fogFar: 80, hemiSky: 0x7a90b8, hemiGround: 0x1c2430, hemiI: 1.15, sun: 0x9ab8ff, sunI: 1.5, mini: '#2a3a4a',
    roster: [{ type: 'bat', share: 0.26, from: 1 }, { type: 'goblin', share: 0.18, from: 1 }, { type: 'mummy', share: 0.12, from: 2 }, { type: 'banshee', share: 0.1, from: 3 }, { type: 'golem', share: 0.1, from: 4 }], filler: 'zombie', build: phongNha,
  },
];

/** Màn thường xoay vòng 7 bản đồ; màn có boss (5, 10, 15...) dùng bản đồ riêng của boss: Núi Lửa (Rồng Lửa), Giông Bão (Titan Đá), Nghĩa Địa (Vua Xương). */
const CYCLE = [0, 1, 2, 3, 4, 6, 7];
const BOSS_BIOME = [5, 3, 1];

export function biomeIndexForWave(wave: number): number {
  if (wave <= 0) return 0;
  if (wave % 5 === 0) return BOSS_BIOME[(wave / 5 - 1) % BOSS_BIOME.length];
  const k = wave - Math.floor(wave / 5) - 1;
  return CYCLE[k % CYCLE.length];
}
