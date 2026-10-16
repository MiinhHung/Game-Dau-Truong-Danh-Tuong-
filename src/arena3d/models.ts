import * as THREE from 'three';
import type { HumanSpec, MonsterType } from './data';

/* ---------- Tiện ích dựng khối ---------- */

export function mat(color: number, o: THREE.MeshStandardMaterialParameters = {}): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.82, metalness: 0.05, flatShading: true, ...o });
}

function shadowed<T extends THREE.Mesh>(m: T): T {
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

export function box(w: number, h: number, d: number, m: THREE.Material, x = 0, y = 0, z = 0): THREE.Mesh {
  const mesh = shadowed(new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m));
  mesh.position.set(x, y, z);
  return mesh;
}

export function sph(r: number, m: THREE.Material, x = 0, y = 0, z = 0, sx = 1, sy = 1, sz = 1, seg = 14): THREE.Mesh {
  const mesh = shadowed(new THREE.Mesh(new THREE.SphereGeometry(r, seg, Math.max(6, Math.floor(seg * 0.7))), m));
  mesh.position.set(x, y, z);
  mesh.scale.set(sx, sy, sz);
  return mesh;
}

export function cyl(rt: number, rb: number, h: number, m: THREE.Material, x = 0, y = 0, z = 0, seg = 10): THREE.Mesh {
  const mesh = shadowed(new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), m));
  mesh.position.set(x, y, z);
  return mesh;
}

export function cone(r: number, h: number, m: THREE.Material, x = 0, y = 0, z = 0, seg = 8): THREE.Mesh {
  const mesh = shadowed(new THREE.Mesh(new THREE.ConeGeometry(r, h, seg), m));
  mesh.position.set(x, y, z);
  return mesh;
}

function pivot(x: number, y: number, z: number): THREE.Group {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  return g;
}

/** Danh sách vật liệu có thể nháy sáng khi trúng đòn. */
export function flashMaterials(root: THREE.Object3D): THREE.MeshStandardMaterial[] {
  const out: THREE.MeshStandardMaterial[] = [];
  root.traverse((o) => {
    const m = (o as THREE.Mesh).material;
    if (m && (m as THREE.MeshStandardMaterial).isMeshStandardMaterial && !out.includes(m as THREE.MeshStandardMaterial)) out.push(m as THREE.MeshStandardMaterial);
  });
  return out;
}

/* ---------- Người ---------- */

export interface Rig {
  group: THREE.Group;
  torso: THREE.Group;
  head: THREE.Group;
  armL: THREE.Group;
  armR: THREE.Group;
  legL: THREE.Group;
  legR: THREE.Group;
  hand: THREE.Group;
  cape?: THREE.Mesh;
  /** Model .glb thay cho hình khối (xem glbAvatar.ts). */
  avatar?: THREE.Group;
}

export interface HumanOpts {
  boxHead?: boolean;
  thin?: number;
  eyeColor?: number;
}

export function buildHuman(spec: HumanSpec, opts: HumanOpts = {}): Rig {
  const g = new THREE.Group();
  const skin = mat(spec.skin);
  const top = mat(spec.top);
  const topDark = mat(spec.topDark);
  const pants = mat(spec.pants);
  const boots = mat(spec.boots);
  const trim = mat(spec.trim, { metalness: 0.5, roughness: 0.4 });
  const hair = mat(spec.hair);
  const eye = mat(opts.eyeColor ?? 0x15110e, opts.eyeColor ? { emissive: opts.eyeColor, emissiveIntensity: 0.9 } : {});
  const thin = opts.thin ?? 1;

  const torso = pivot(0, 1.15, 0);
  torso.add(box(0.62 * thin, 0.72, 0.36 * thin, top));
  torso.add(box(0.64 * thin, 0.08, 0.38 * thin, trim, 0, -0.3, 0));
  torso.add(box(0.5 * thin, 0.1, 0.375 * thin, trim, 0, 0.24, 0));
  torso.add(sph(0.17, topDark, -0.38 * thin, 0.3, 0));
  torso.add(sph(0.17, topDark, 0.38 * thin, 0.3, 0));
  g.add(torso);

  const head = pivot(0, 1.8, 0);
  if (opts.boxHead) {
    head.add(box(0.5, 0.5, 0.46, skin, 0, 0.05, 0));
  } else {
    head.add(sph(0.22, skin, 0, 0, 0, 1, 1.05, 1));
  }
  head.add(box(0.06, 0.06, 0.04, eye, -0.08, 0.03, 0.2));
  head.add(box(0.06, 0.06, 0.04, eye, 0.08, 0.03, 0.2));
  if (spec.hat !== 'bun') head.add(sph(0.235, hair, 0, 0.1, -0.07, 1, 0.72, 1));
  if (spec.longHair && spec.wavyHair === undefined) head.add(box(0.42, 0.62, 0.12, hair, 0, -0.25, -0.17));
  if (spec.wavyHair !== undefined) {
    const hairD = mat(spec.wavyHair, { roughness: 0.55 });
    const scarf = mat(spec.wavyHair, { roughness: 0.7 });
    // khăn trùm đỉnh đầu
    head.add(sph(0.245, scarf, 0, 0.1, -0.05, 1, 0.62, 1.02, 14));
    head.add(sph(0.06, scarf, 0, 0.03, -0.27, 1, 0.7, 0.8, 8));
    // mái ngôi giữa và hai lọn mềm ôm mặt
    head.add(sph(0.2, hair, -0.09, 0.14, 0.1, 1, 0.5, 0.7, 10));
    head.add(sph(0.2, hair, 0.09, 0.14, 0.1, 1, 0.5, 0.7, 10));
    for (const s of [-1, 1]) {
      const lock = box(0.1, 0.62, 0.12, hair, s * 0.24, -0.22, 0.0);
      lock.rotation.z = s * 0.06;
      head.add(lock);
      head.add(sph(0.075, hair, s * 0.25, -0.55, 0.0, 1, 1.4, 1, 8));
    }
    // dải tóc dài gợn sóng sau lưng, xếp lớp so le
    for (let i = 0; i < 5; i++) {
      const y = -0.12 - i * 0.17;
      const wave = Math.sin(i * 1.7) * 0.05;
      const w = 0.42 - i * 0.03;
      head.add(sph(0.2, i % 2 ? hairD : hair, wave, y, -0.2, w / 0.2, 0.95, 0.5, 10));
      head.add(sph(0.1, i % 2 ? hair : hairD, wave - 0.17, y - 0.04, -0.19, 1, 1.5, 0.6, 8));
      head.add(sph(0.1, i % 2 ? hair : hairD, wave + 0.17, y - 0.04, -0.19, 1, 1.5, 0.6, 8));
    }
    if (spec.earrings !== undefined) {
      const ring = mat(spec.earrings, { metalness: 0.7, roughness: 0.3 });
      for (const s of [-1, 1]) head.add(sph(0.035, ring, s * 0.225, -0.08, 0.02, 1, 1.3, 1, 6));
    }
  }
  g.add(head);

  // Mũ
  const hatM = mat(spec.hatColor, { metalness: spec.hat === 'helmet' || spec.hat === 'crown' ? 0.55 : 0.05, roughness: 0.5 });
  switch (spec.hat) {
    case 'helmet': {
      const dome = shadowed(new THREE.Mesh(new THREE.SphereGeometry(0.27, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), hatM));
      dome.position.y = 0.07;
      head.add(dome);
      head.add(cyl(0.29, 0.29, 0.035, hatM, 0, 0.06, 0, 14));
      if (spec.plume !== undefined) {
        const pl = cone(0.07, 0.34, mat(spec.plume), 0, 0.38, -0.05);
        pl.rotation.x = -0.35;
        head.add(pl);
      }
      break;
    }
    case 'turban': {
      const ring = shadowed(new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.075, 8, 16), hatM));
      ring.position.y = 0.13;
      ring.rotation.x = Math.PI / 2;
      head.add(ring);
      head.add(sph(0.17, hatM, 0, 0.2, 0, 1, 0.8, 1));
      head.add(box(0.1, 0.3, 0.05, hatM, 0.2, 0.0, -0.1));
      break;
    }
    case 'crown': {
      head.add(cyl(0.23, 0.22, 0.1, hatM, 0, 0.22, 0, 10));
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2;
        head.add(cone(0.04, 0.14, hatM, Math.cos(a) * 0.2, 0.34, Math.sin(a) * 0.2, 5));
      }
      break;
    }
    case 'bun': {
      head.add(sph(0.235, hair, 0, 0.06, -0.025, 1, 0.78, 1));
      head.add(sph(0.14, hair, 0, 0.3, -0.06));
      const band = shadowed(new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.03, 6, 16), mat(spec.trim, { metalness: 0.5 })));
      band.position.y = 0.1;
      band.rotation.x = Math.PI / 2;
      head.add(band);
      break;
    }
    case 'quan': {
      head.add(box(0.5, 0.08, 0.34, hatM, 0, 0.26, 0));
      head.add(box(0.5, 0.04, 0.1, hatM, 0.46, 0.26, -0.02));
      head.add(box(0.5, 0.04, 0.1, hatM, -0.46, 0.26, -0.02));
      break;
    }
    case 'non_la': {
      head.add(cone(0.52, 0.3, hatM, 0, 0.26, 0, 16));
      break;
    }
    default:
      break;
  }

  // Chân
  const mkLeg = (sx: number): THREE.Group => {
    const p = pivot(0.16 * sx * thin, 0.84, 0);
    if (!spec.female) p.add(box(0.22 * thin, 0.7, 0.24 * thin, pants, 0, -0.35, 0));
    else p.add(box(0.16, 0.7, 0.18, skin, 0, -0.35, 0));
    if (spec.heels) {
      p.add(box(0.15, 0.08, 0.3, boots, 0, -0.7, 0.07));
      p.add(box(0.15, 0.1, 0.12, boots, 0, -0.74, -0.04));
      p.add(cyl(0.025, 0.02, 0.18, boots, 0, -0.78, -0.1, 6));
      p.add(box(0.13, 0.06, 0.1, boots, 0, -0.68, 0.2));
    } else p.add(box(0.26 * thin, 0.18, 0.36 * thin, boots, 0, -0.74, 0.04));
    return p;
  };
  const legL = mkLeg(-1);
  const legR = mkLeg(1);
  g.add(legL, legR);
  if (spec.female) {
    const mini = spec.miniSkirt !== undefined;
    const skirt = shadowed(new THREE.Mesh(new THREE.CylinderGeometry(mini ? 0.33 : 0.31, mini ? 0.42 : 0.5, mini ? 0.3 : 0.62, 14), mat(mini ? (spec.miniSkirt as number) : spec.topDark)));
    skirt.position.y = mini ? 0.9 : 0.88;
    g.add(skirt);
  }

  // Tay
  const mkArm = (sx: number): THREE.Group => {
    const p = pivot(0.4 * sx * thin, 1.46, 0);
    if (spec.sleeve34) {
      p.add(box(0.19 * thin, 0.38, 0.19 * thin, top, 0, -0.17, 0));
      p.add(box(0.15 * thin, 0.3, 0.15 * thin, skin, 0, -0.45, 0));
    } else {
      p.add(box(0.17 * thin, 0.6, 0.17 * thin, top, 0, -0.28, 0));
      p.add(box(0.19 * thin, 0.08, 0.19 * thin, trim, 0, -0.5, 0));
    }
    p.add(sph(0.1, skin, 0, -0.64, 0));
    return p;
  };
  const armL = mkArm(-1);
  const armR = mkArm(1);
  const hand = pivot(0, -0.64, 0);
  armR.add(hand);
  g.add(armL, armR);

  let capeMesh: THREE.Mesh | undefined;
  if (spec.cape !== undefined) {
    capeMesh = shadowed(new THREE.Mesh(new THREE.BoxGeometry(0.62, 1.0, 0.05), mat(spec.cape, { side: THREE.DoubleSide })));
    capeMesh.position.set(0, 1.05, -0.24);
    capeMesh.rotation.x = 0.08;
    g.add(capeMesh);
  }

  return { group: g, torso, head, armL, armR, legL, legR, hand, cape: capeMesh };
}

/* ---------- Vũ khí dân dã (dựng dọc trục +Z, gốc ở chỗ cầm) ---------- */

/** Thanh tròn nối hai điểm (dây dép, nan ghế...). */
function bar(a: THREE.Vector3, b: THREE.Vector3, r: number, m: THREE.Material): THREE.Mesh {
  const len = a.distanceTo(b);
  const mesh = shadowed(new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, 8), m));
  mesh.position.copy(a).add(b).multiplyScalar(0.5);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3().subVectors(b, a).normalize());
  return mesh;
}

const v3 = (x: number, y: number, z: number): THREE.Vector3 => new THREE.Vector3(x, y, z);

/** Đường viền bàn chân (mũi hướng +y), dùng để đùn khối đế dép. */
function footShape(k: number): THREE.Shape {
  const s = new THREE.Shape();
  s.moveTo(0, -0.46 * k);
  s.bezierCurveTo(0.14 * k, -0.46 * k, 0.17 * k, -0.3 * k, 0.15 * k, -0.14 * k);
  s.bezierCurveTo(0.14 * k, 0.0, 0.2 * k, 0.1 * k, 0.22 * k, 0.22 * k);
  s.bezierCurveTo(0.24 * k, 0.38 * k, 0.12 * k, 0.47 * k, 0, 0.47 * k);
  s.bezierCurveTo(-0.12 * k, 0.47 * k, -0.24 * k, 0.38 * k, -0.22 * k, 0.22 * k);
  s.bezierCurveTo(-0.2 * k, 0.1 * k, -0.14 * k, 0.0, -0.15 * k, -0.14 * k);
  s.bezierCurveTo(-0.17 * k, -0.3 * k, -0.14 * k, -0.46 * k, 0, -0.46 * k);
  return s;
}

function footSlab(k: number, depth: number, m: THREE.Material): THREE.Mesh {
  const geo = new THREE.ExtrudeGeometry(footShape(k), { depth, bevelEnabled: true, bevelThickness: 0.012, bevelSize: 0.012, bevelSegments: 2, curveSegments: 16 });
  geo.rotateX(Math.PI / 2);
  return shadowed(new THREE.Mesh(geo, m));
}

function strapTube(pts: THREE.Vector3[], m: THREE.Material): THREE.Mesh {
  return shadowed(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 10, 0.022, 6, false), m));
}

/** Dép lào cao su: đế trắng đùn theo bàn chân, lớp mặt xanh, quai chữ V và núm xỏ ngón. Đế nằm trên mặt phẳng XZ, mũi dép hướng +Z. */
function slipper(): THREE.Group {
  const g = new THREE.Group();
  const white = mat(0xf2efe6, { roughness: 0.5, flatShading: false });
  const blue = mat(0x1f6fc8, { roughness: 0.42, flatShading: false });
  g.add(footSlab(1, 0.07, white));
  const top = footSlab(0.95, 0.045, blue);
  top.position.y = 0.045;
  g.add(top);
  const post = new THREE.Vector3(0, 0.1, 0.2);
  g.add(shadowed(new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.04, 0.12, 8), blue)).translateX(0).translateY(0.1).translateZ(0.2));
  for (const s of [-1, 1]) {
    g.add(strapTube([post.clone().setY(0.17), v3(s * 0.08, 0.17, 0.1), v3(s * 0.15, 0.12, 0.0), v3(s * 0.19, 0.05, -0.04)], blue));
  }
  return g;
}

/** Ghế nhựa quốc dân: ghế đỏ có lưng tựa nan dọc, bốn chân loe. */
function plasticChair(): THREE.Group {
  const g = new THREE.Group();
  const red = mat(0xd8262a, { roughness: 0.32, metalness: 0.02, flatShading: false });
  const dark = mat(0xa81a1e, { roughness: 0.4, flatShading: false });
  g.add(box(0.92, 0.07, 0.86, red, 0, 0, 0));
  g.add(box(0.96, 0.05, 0.05, dark, 0, -0.01, 0.45));
  g.add(box(0.96, 0.05, 0.05, dark, 0, -0.01, -0.45));
  // lưng tựa: khung và các nan dọc
  g.add(box(0.9, 0.07, 0.08, red, 0, 0.88, -0.42));
  g.add(box(0.07, 0.9, 0.08, red, -0.45, 0.45, -0.42));
  g.add(box(0.07, 0.9, 0.08, red, 0.45, 0.45, -0.42));
  for (let i = -3; i <= 3; i++) g.add(box(0.07, 0.62, 0.05, red, i * 0.12, 0.56, -0.43));
  g.add(box(0.9, 0.07, 0.08, red, 0, 0.2, -0.42));
  // chân
  for (const [x, z, sx, sz] of [[-0.38, 0.36, -0.1, 0.1], [0.38, 0.36, 0.1, 0.1], [-0.38, -0.36, -0.1, -0.1], [0.38, -0.36, 0.1, -0.1]] as const) {
    g.add(bar(v3(x, 0, z), v3(x + sx, -0.82, z + sz), 0.05, red));
    g.add(sph(0.055, dark, x + sx, -0.84, z + sz, 1, 0.5, 1, 6));
  }
  g.add(bar(v3(-0.38, -0.4, 0.36), v3(0.38, -0.4, 0.36), 0.025, dark));
  g.add(bar(v3(-0.38, -0.4, -0.36), v3(0.38, -0.4, -0.36), 0.025, dark));
  return g;
}

/** Nón lá: chóp nón bằng lá cọ khô có nhiều vòng nan, quai lụa đỏ. Trục nón là +Y. */
function nonLa(): THREE.Group {
  const g = new THREE.Group();
  const R = 0.78;
  const H = 0.46;
  const straw = new THREE.MeshStandardMaterial({ color: 0xe8d28c, roughness: 0.85, flatShading: false, side: THREE.DoubleSide });
  const cn = shadowed(new THREE.Mesh(new THREE.ConeGeometry(R, H, 28, 1, true), straw));
  cn.position.y = H / 2;
  g.add(cn);
  const ring = mat(0xb8964a, { roughness: 0.9, flatShading: false });
  for (let i = 1; i <= 6; i++) {
    const y = (i / 7) * H;
    const rr = R * (1 - y / H);
    const t = shadowed(new THREE.Mesh(new THREE.TorusGeometry(rr, 0.012, 5, 28), ring));
    t.rotation.x = Math.PI / 2;
    t.position.y = y;
    g.add(t);
  }
  const rim = shadowed(new THREE.Mesh(new THREE.TorusGeometry(R, 0.03, 6, 32), mat(0xc4a45a, { roughness: 0.8, flatShading: false })));
  rim.rotation.x = Math.PI / 2;
  g.add(rim);
  g.add(cone(0.05, 0.1, mat(0xc4a45a), 0, H + 0.02, 0, 6));
  g.add(bar(v3(-0.36, 0.12, 0.27), v3(-0.3, -0.18, 0.1), 0.014, mat(0xd02030, { flatShading: false })));
  g.add(bar(v3(0.36, 0.12, 0.27), v3(0.3, -0.18, 0.1), 0.014, mat(0xd02030, { flatShading: false })));
  return g;
}

/** Chổi chít: cán tre có mấu, bó chít xòe rộng buộc dây đỏ. Quét dọc trục +Z. */
function broom(): THREE.Group {
  const g = new THREE.Group();
  const bamboo = mat(0xb08838, { roughness: 0.7 });
  const node = mat(0x7a5a22);
  const handle = cyl(0.045, 0.05, 1.9, bamboo, 0, 0, 0.75, 8);
  handle.rotateX(Math.PI / 2);
  g.add(handle);
  for (const z of [-0.1, 0.5, 1.1, 1.62]) g.add(cyl(0.062, 0.062, 0.05, node, 0, 0, z, 8).rotateX(Math.PI / 2));
  const straw = [mat(0xe2c868), mat(0xc9a850), mat(0xd8b95c)];
  const base = 1.7;
  const n = 46;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + (i % 3) * 0.1;
    const tilt = 0.12 + ((i * 37) % 10) / 10 * 0.42;
    const len = 0.95 + ((i * 53) % 10) / 10 * 0.35;
    const b = cyl(0.008, 0.026, len, straw[i % 3], 0, 0, 0, 4);
    const dir = v3(Math.sin(tilt) * Math.cos(a), Math.sin(tilt) * Math.sin(a), Math.cos(tilt));
    b.quaternion.setFromUnitVectors(v3(0, 1, 0), dir);
    b.position.copy(dir).multiplyScalar(len / 2).add(v3(0, 0, base));
    g.add(b);
  }
  g.add(cyl(0.11, 0.11, 0.1, mat(0xc02020, { flatShading: false }), 0, 0, base + 0.08, 10).rotateX(Math.PI / 2));
  g.add(cyl(0.1, 0.1, 0.05, mat(0x5a3a18), 0, 0, base + 0.18, 10).rotateX(Math.PI / 2));
  return g;
}

/** Muôi canh inox: cán dẹt có lỗ treo, gáo lõm. Gáo hướng lên, cán dọc +Z. */
function ladle(): THREE.Group {
  const g = new THREE.Group();
  const steel = mat(0xcfd4da, { metalness: 0.85, roughness: 0.22, flatShading: false });
  const inner = new THREE.MeshStandardMaterial({ color: 0x9aa1a8, metalness: 0.8, roughness: 0.3, side: THREE.BackSide, flatShading: false });
  g.add(box(0.06, 0.035, 1.55, steel, 0, 0.12, 0.8));
  const hook = shadowed(new THREE.Mesh(new THREE.TorusGeometry(0.08, 0.02, 6, 14), steel));
  hook.position.set(0, 0.12, -0.02);
  hook.rotation.y = Math.PI / 2;
  g.add(hook);
  // đoạn cán cong lên gáo
  g.add(bar(v3(0, 0.12, 1.5), v3(0, 0.0, 1.78), 0.03, steel));
  const bowlGeo = new THREE.SphereGeometry(0.4, 22, 12, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2);
  const bowl = shadowed(new THREE.Mesh(bowlGeo, new THREE.MeshStandardMaterial({ color: 0xcfd4da, metalness: 0.85, roughness: 0.22, flatShading: false, side: THREE.DoubleSide })));
  bowl.position.set(0, 0.12, 2.1);
  bowl.scale.set(1, 0.85, 1);
  g.add(bowl);
  const lining = shadowed(new THREE.Mesh(new THREE.SphereGeometry(0.385, 18, 10, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), inner));
  lining.position.copy(bowl.position);
  lining.scale.copy(bowl.scale);
  g.add(lining);
  const lip = shadowed(new THREE.Mesh(new THREE.TorusGeometry(0.4, 0.016, 6, 26), steel));
  lip.rotation.x = Math.PI / 2;
  lip.position.copy(bowl.position);
  g.add(lip);
  return g;
}

/** Chú lợn con hồng hào, mõm hướng +Z. */
function pig(): THREE.Group {
  const g = new THREE.Group();
  const pink = mat(0xf4a6b8, { roughness: 0.65, flatShading: false });
  const pinkD = mat(0xe8849c, { roughness: 0.6, flatShading: false });
  const black = mat(0x16100e, { flatShading: false });
  g.add(sph(0.5, pink, 0, 0, 0, 0.85, 0.8, 1.2, 16));
  g.add(sph(0.34, pink, 0, 0.1, 0.64, 1, 0.95, 0.95, 14));
  g.add(cyl(0.18, 0.2, 0.16, pinkD, 0, 0.04, 0.95, 14).rotateX(Math.PI / 2));
  g.add(sph(0.035, black, -0.07, 0.04, 1.04, 1, 1.4, 0.6, 6));
  g.add(sph(0.035, black, 0.07, 0.04, 1.04, 1, 1.4, 0.6, 6));
  for (const s of [-1, 1]) {
    const ear = cone(0.13, 0.28, pinkD, s * 0.2, 0.4, 0.55, 4);
    ear.rotation.set(0.5, 0, -s * 0.55);
    g.add(ear);
    g.add(sph(0.045, black, s * 0.16, 0.2, 0.86, 1, 1, 0.6, 6));
    for (const z of [0.32, -0.32]) {
      g.add(cyl(0.085, 0.07, 0.34, pinkD, s * 0.24, -0.5, z, 8));
      g.add(cyl(0.075, 0.075, 0.05, black, s * 0.24, -0.69, z, 8));
    }
  }
  const tail = shadowed(new THREE.Mesh(new THREE.TorusGeometry(0.07, 0.022, 6, 12, Math.PI * 1.6), pinkD));
  tail.position.set(0, 0.12, -0.6);
  g.add(tail);
  return g;
}

/** Điếu cày long trượng: ống tre dài, nõ điếu đang cháy, đầu rồng chạm khắc. */
function dieuCay(): THREE.Group {
  const g = new THREE.Group();
  const bamboo = mat(0xb68c3a, { roughness: 0.55, flatShading: false });
  const dark = mat(0x3a2410, { roughness: 0.7 });
  const gold = mat(0xd4a838, { metalness: 0.7, roughness: 0.3, flatShading: false });
  g.add(cyl(0.1, 0.11, 2.1, bamboo, 0, 0, 0.9, 12).rotateX(Math.PI / 2));
  for (const z of [-0.1, 0.55, 1.2, 1.78]) g.add(cyl(0.125, 0.125, 0.06, mat(0x7a5a1c), 0, 0, z, 12).rotateX(Math.PI / 2));
  // nõ điếu
  g.add(cyl(0.065, 0.075, 0.34, dark, 0, 0.26, 0.6, 8));
  g.add(cyl(0.13, 0.07, 0.16, mat(0x5a3818), 0, 0.5, 0.6, 10));
  g.add(sph(0.095, mat(0xff5a10, { emissive: 0xff4010, emissiveIntensity: 1.6, flatShading: false }), 0, 0.55, 0.6, 1, 0.6, 1, 8));
  // khói bốc từ nõ
  for (let i = 0; i < 3; i++) {
    const s = sph(0.11 + i * 0.05, new THREE.MeshBasicMaterial({ color: 0xd8d8d8, transparent: true, opacity: 0.4 - i * 0.1, depthWrite: false }), Math.sin(i * 2) * 0.05, 0.72 + i * 0.22, 0.6, 1, 1, 1, 8);
    s.castShadow = false;
    g.add(s);
  }
  // đầu rồng ở đầu ống
  const dr = new THREE.Group();
  dr.position.set(0, 0, 2.0);
  dr.add(sph(0.17, gold, 0, 0.0, 0.0, 1, 0.9, 1.2, 10));
  dr.add(box(0.2, 0.1, 0.28, gold, 0, -0.04, 0.22));
  dr.add(sph(0.025, mat(0x15110e), -0.07, 0.06, 0.2, 1, 1, 1, 5));
  dr.add(sph(0.025, mat(0x15110e), 0.07, 0.06, 0.2, 1, 1, 1, 5));
  for (const s of [-1, 1]) {
    const horn = cone(0.035, 0.34, gold, s * 0.1, 0.16, -0.08, 5);
    horn.rotation.x = -0.9;
    dr.add(horn);
    dr.add(bar(v3(s * 0.05, -0.08, 0.3), v3(s * 0.25, -0.2, 0.55), 0.01, gold));
  }
  g.add(dr);
  // mõm miệng hút ở cuối ống
  g.add(cyl(0.07, 0.1, 0.18, dark, 0, 0, -0.18, 10).rotateX(Math.PI / 2));
  return g;
}

/*
 * Khung quy chiếu bàn tay ở tư thế nghỉ (tay phải nâng -0,9 rad): hướng "lên" và "phía trước" của thế giới
 * quy về trục cục bộ của bàn tay như dưới đây, để đặt vũ khí theo hướng cầm thật thay vì đoán góc xoay.
 */
const H_UP = new THREE.Vector3(0, 0.62, 0.78);
const H_FWD = new THREE.Vector3(0, -0.78, 0.62);

/** Quay vật theo trục Y và Z mong muốn (trục X tự suy ra), rồi đặt điểm cầm (hệ vật) vào đúng lòng bàn tay. */
function holdYZ(obj: THREE.Object3D, y: THREE.Vector3, z: THREE.Vector3, grip: THREE.Vector3, scale: number): void {
  const yy = y.clone().normalize();
  const zz = z.clone().sub(yy.clone().multiplyScalar(yy.dot(z))).normalize();
  const xx = new THREE.Vector3().crossVectors(yy, zz);
  obj.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(xx, yy, zz));
  obj.scale.setScalar(scale);
  obj.position.copy(grip).multiplyScalar(scale).applyQuaternion(obj.quaternion).multiplyScalar(-1);
}

/** Như holdYZ nhưng chỉ định trục Y và trục X. */
function holdXY(obj: THREE.Object3D, x: THREE.Vector3, y: THREE.Vector3, grip: THREE.Vector3, scale: number): void {
  const yy = y.clone().normalize();
  const xx = x.clone().sub(yy.clone().multiplyScalar(yy.dot(x))).normalize();
  const zz = new THREE.Vector3().crossVectors(xx, yy);
  obj.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(xx, yy, zz));
  obj.scale.setScalar(scale);
  obj.position.copy(grip).multiplyScalar(scale).applyQuaternion(obj.quaternion).multiplyScalar(-1);
}

export function buildWeaponModel(id: string): THREE.Group {
  const g = new THREE.Group();
  switch (id) {
    case 'dep_lao': {
      // Nắm gót dép, mũi dép chếch lên, mặt đế hướng về phía trước như sắp phang
      const s = slipper();
      holdYZ(s, H_FWD.clone().multiplyScalar(-1), H_UP.clone().multiplyScalar(0.9).add(H_FWD.clone().multiplyScalar(0.35)), v3(0, 0, -0.34), 0.95);
      g.add(s);
      break;
    }
    case 'ghe_nhua': {
      // Nắm thanh trên cùng của lưng tựa, bốn chân ghế chĩa về phía trước và lên
      const c = plasticChair();
      holdYZ(c, H_FWD.clone().add(H_UP.clone().multiplyScalar(0.5)).multiplyScalar(-1), H_UP.clone().multiplyScalar(-1), v3(0, 0.88, -0.42), 0.62);
      g.add(c);
      break;
    }
    case 'non_la': {
      // Kẹp mép vành nón giữa các ngón tay, nón nằm nghiêng như đĩa sẵn sàng phóng
      const n = nonLa();
      holdXY(n, H_FWD.clone().multiplyScalar(-1), H_UP.clone().add(H_FWD.clone().multiplyScalar(-0.35)), v3(0.78, 0, 0), 0.55);
      g.add(n);
      break;
    }
    case 'choi_chit': {
      // Cầm ở khoảng giữa cán; mô hình để trong nhóm riêng để hoạt ảnh quét hạ đầu chổi xuống sàn
      const b = broom();
      b.scale.setScalar(0.85);
      b.position.z = -0.55;
      g.add(b);
      break;
    }
    case 'muoi_canh': {
      const l = ladle();
      l.position.set(0, -0.1, -0.1);
      g.add(l);
      break;
    }
    case 'phong_lon': {
      const p = pig();
      p.scale.setScalar(0.85);
      p.position.set(0, 0.2, 0.85);
      p.rotation.x = -0.15;
      g.add(p);
      break;
    }
    case 'dieu_cay': {
      const d = dieuCay();
      d.position.set(0, -0.05, -0.2);
      g.add(d);
      break;
    }
    default:
      break;
  }
  return g;
}

export function buildProjectile(kind: string): THREE.Object3D {
  switch (kind) {
    case 'dep': {
      const g = new THREE.Group();
      const s = slipper();
      s.scale.setScalar(1.25);
      g.add(s);
      return g;
    }
    case 'non': {
      const g = new THREE.Group();
      const n = nonLa();
      n.scale.setScalar(0.8);
      n.rotation.x = 0.25;
      g.add(n);
      return g;
    }
    case 'lon': {
      const g = new THREE.Group();
      const p = pig();
      p.scale.setScalar(1.05);
      g.add(p);
      return g;
    }
    case 'smoke': {
      const g = new THREE.Group();
      const m = new THREE.MeshStandardMaterial({ color: 0xcfcfd2, emissive: 0x606068, emissiveIntensity: 0.4, transparent: true, opacity: 0.62, depthWrite: false, flatShading: false, roughness: 1 });
      for (const [x, y, z, r] of [[0, 0, 0, 0.38], [0.2, 0.12, -0.18, 0.28], [-0.2, -0.05, -0.1, 0.3], [0.05, 0.2, 0.2, 0.24]] as const) {
        const s = sph(r, m, x, y, z, 1, 1, 1, 9);
        s.castShadow = false;
        g.add(s);
      }
      return g;
    }
    case 'bone': {
      const g = new THREE.Group();
      g.add(cyl(0.05, 0.05, 0.5, mat(0xf0ead8), 0, 0, 0, 6));
      g.add(sph(0.09, mat(0xf0ead8), 0, 0.26, 0));
      g.add(sph(0.09, mat(0xf0ead8), 0, -0.26, 0));
      return g;
    }
    case 'arrow': {
      const g = new THREE.Group();
      g.add(cyl(0.03, 0.03, 1.1, mat(0xe8d8a0), 0, 0, 0, 5).rotateX(Math.PI / 2));
      g.add(cone(0.08, 0.28, mat(0xd8d8e0, { metalness: 0.6 }), 0, 0, 0.65, 5).rotateX(Math.PI / 2));
      g.add(box(0.2, 0.02, 0.2, mat(0xf06090), 0, 0, -0.5));
      return g;
    }
    case 'orb':
    case 'orbg': {
      const c = kind === 'orb' ? 0xc060ff : 0x70e020;
      const g = new THREE.Group();
      g.add(sph(0.3, mat(c, { emissive: c, emissiveIntensity: 1.4, flatShading: false, transparent: true, opacity: 0.92 }), 0, 0, 0, 1, 1, 1, 12));
      g.add(sph(0.16, mat(0xffffff, { emissive: 0xffffff, emissiveIntensity: 1.2, flatShading: false }), 0, 0, 0, 1, 1, 1, 8));
      return g;
    }
    case 'snow': {
      return sph(0.3, mat(0xf4f8ff, { emissive: 0x8ab8e0, emissiveIntensity: 0.5, flatShading: false }), 0, 0, 0, 1, 1, 1, 10);
    }
    case 'fireball': {
      const g = new THREE.Group();
      g.add(sph(0.42, mat(0xff6a1a, { emissive: 0xff4010, emissiveIntensity: 1.2, flatShading: false }), 0, 0, 0, 1, 1, 1, 12));
      g.add(sph(0.26, mat(0xffe070, { emissive: 0xffc030, emissiveIntensity: 1.5, flatShading: false }), 0, 0, 0, 1, 1, 1, 10));
      return g;
    }
    default:
      return sph(0.2, mat(0xffffff), 0, 0, 0);
  }
}

export function buildCoin(): THREE.Mesh {
  const c = shadowed(new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.07, 14), mat(0xffc830, { metalness: 0.7, roughness: 0.3, emissive: 0x805000, emissiveIntensity: 0.5 })));
  c.rotation.x = Math.PI / 2;
  return c;
}

export function buildBanhChung(): THREE.Group {
  const g = new THREE.Group();
  g.add(box(0.55, 0.4, 0.55, mat(0x3a8a3a)));
  g.add(box(0.57, 0.42, 0.06, mat(0x6a4a20)));
  g.add(box(0.06, 0.42, 0.57, mat(0x6a4a20)));
  return g;
}

/* ---------- Quái vật phương Tây ---------- */

export interface MonsterRig {
  group: THREE.Group;
  legs: THREE.Object3D[];
  arms: THREE.Object3D[];
  head?: THREE.Object3D;
  extra: Record<string, THREE.Object3D>;
  float: number;
  baseY: number;
  mats: THREE.MeshStandardMaterial[];
}

function humanMonster(spec: HumanSpec, opts: HumanOpts, scale: number): MonsterRig {
  const r = buildHuman(spec, opts);
  r.group.scale.setScalar(scale);
  return { group: r.group, legs: [r.legL, r.legR], arms: [r.armL, r.armR], head: r.head, extra: { torso: r.torso }, float: 0, baseY: 0, mats: [] };
}

/** Thân sói bốn chân dùng chung cho người sói, sói băng, chó địa ngục và tiểu quỷ. */
function wolfRig(furC: number, darkC: number, eyeC: number, scale: number, deco?: (g: THREE.Group, head: THREE.Group, fur: THREE.MeshStandardMaterial, dark: THREE.MeshStandardMaterial) => void, eyeGlow = 1): MonsterRig {
  const g = new THREE.Group();
  const fur = mat(furC);
  const dark = mat(darkC);
  g.add(box(0.8, 0.7, 1.3, fur, 0, 1.0, 0));
  g.add(box(0.9, 0.8, 0.6, fur, 0, 1.08, 0.4));
  for (let i = 0; i < 5; i++) g.add(cone(0.1, 0.3, dark, 0, 1.5, -0.4 + i * 0.28, 5));
  const head = new THREE.Group();
  head.position.set(0, 1.35, 0.95);
  head.add(box(0.52, 0.46, 0.5, fur));
  head.add(box(0.28, 0.26, 0.42, dark, 0, -0.08, 0.4));
  head.add(box(0.12, 0.1, 0.1, mat(0x0a0808), 0, 0, 0.62));
  head.add(box(0.05, 0.06, 0.05, mat(0xffffff), -0.08, -0.2, 0.55));
  head.add(box(0.05, 0.06, 0.05, mat(0xffffff), 0.08, -0.2, 0.55));
  head.add(cone(0.12, 0.3, fur, -0.2, 0.36, -0.05, 4));
  head.add(cone(0.12, 0.3, fur, 0.2, 0.36, -0.05, 4));
  const eye = mat(eyeC, { emissive: eyeC, emissiveIntensity: eyeGlow });
  head.add(box(0.07, 0.07, 0.04, eye, -0.14, 0.08, 0.26));
  head.add(box(0.07, 0.07, 0.04, eye, 0.14, 0.08, 0.26));
  g.add(head);
  const tail = cone(0.14, 0.9, fur, 0, 1.0, -0.95, 5);
  tail.rotation.x = -1.9;
  g.add(tail);
  const mk = (x: number, z: number): THREE.Group => {
    const p = pivot(x, 0.75, z);
    p.add(box(0.24, 0.75, 0.28, fur, 0, -0.35, 0));
    p.add(box(0.26, 0.12, 0.34, dark, 0, -0.72, 0.05));
    return p;
  };
  const legs = [mk(-0.32, 0.5), mk(0.32, 0.5), mk(-0.32, -0.5), mk(0.32, -0.5)];
  legs.forEach((l) => g.add(l));
  deco?.(g, head, fur, dark);
  g.scale.setScalar(scale);
  return { group: g, legs, arms: [], head, extra: { tail }, float: 0, baseY: 0, mats: [] };
}

/** Thân ma bay dạng chuông, dùng cho nữ quỷ gào thét. */
function ghostLike(bodyC: number, glowC: number, eyeC: number, scale: number): MonsterRig {
  const g = new THREE.Group();
  const pts: THREE.Vector2[] = [];
  for (let i = 0; i <= 10; i++) {
    const t = i / 10;
    pts.push(new THREE.Vector2(0.12 + Math.sin(t * Math.PI * 0.9) * 0.46 + (t > 0.85 ? 0.08 : 0), t * 1.7));
  }
  const body = shadowed(new THREE.Mesh(new THREE.LatheGeometry(pts, 12), mat(bodyC, { transparent: true, opacity: 0.8, emissive: glowC, emissiveIntensity: 0.6, flatShading: false, side: THREE.DoubleSide })));
  g.add(body);
  const eye = mat(eyeC, { emissive: eyeC, emissiveIntensity: 1.2 });
  g.add(sph(0.1, eye, -0.15, 1.2, 0.36));
  g.add(sph(0.1, eye, 0.15, 1.2, 0.36));
  g.add(sph(0.12, mat(0x101018), 0, 0.96, 0.4, 1, 1.9, 0.8));
  const hair = mat(0x2a1a3a, { transparent: true, opacity: 0.85 });
  for (let i = 0; i < 7; i++) {
    const s = cone(0.05, 0.9, hair, -0.36 + i * 0.12, 1.1, -0.34, 4);
    s.rotation.x = Math.PI - 0.15;
    g.add(s);
  }
  const aL = sph(0.12, mat(bodyC, { transparent: true, opacity: 0.8 }), -0.52, 0.9, 0.2);
  const aR = sph(0.12, mat(bodyC, { transparent: true, opacity: 0.8 }), 0.52, 0.9, 0.2);
  g.add(aL, aR);
  g.scale.setScalar(scale);
  return { group: g, legs: [], arms: [aL, aR], extra: { body }, float: 0.55, baseY: 0.55, mats: [] };
}

/** Người đá khổng lồ: đá xám hoặc dung nham có vết nứt phát sáng. */
function golemRig(stone: number, glow: number, scale: number, lava: boolean): MonsterRig {
  const rig = humanMonster({ skin: stone, hair: stone, top: stone, topDark: lava ? 0x1e1618 : 0x55555d, pants: stone, boots: lava ? 0x1a1214 : 0x45454d, trim: lava ? 0x3a2a2a : 0x9a9aa2, hat: 'none', hatColor: 0 }, { boxHead: true, eyeColor: glow }, scale);
  const glowM = new THREE.MeshStandardMaterial({ color: glow, emissive: glow, emissiveIntensity: lava ? 1.5 : 1.0, flatShading: true });
  const rockM = mat(lava ? 0x2a2024 : 0x6a6a72);
  rig.group.add(box(0.26, 0.26, 0.04, glowM, 0, 1.2, 0.2));
  if (lava) {
    for (let i = 0; i < 4; i++) rig.group.add(box(0.04, 0.34, 0.03, glowM, -0.2 + i * 0.13, 1.0, 0.2).rotateZ(0.4 * (i % 2 ? 1 : -1)));
    rig.arms.forEach((a, i) => a.add(box(0.04, 0.4, 0.03, glowM, 0, -0.3, 0.1).rotateZ(i ? 0.3 : -0.3)));
  }
  for (const s of [-1, 1]) {
    rig.group.add(sph(0.2, rockM, s * 0.42, 1.55, 0, 1.2, 0.9, 1.1, 6));
    rig.group.add(box(0.1, 0.25, 0.12, rockM, s * 0.14, 2.08, -0.02));
  }
  rig.arms.forEach((a) => (a.rotation.x = -1.2));
  return rig;
}

function brimHat(color: number, tall: number): THREE.Group {
  const h = new THREE.Group();
  const m = mat(color);
  h.add(cyl(0.46, 0.46, 0.04, m, 0, 0, 0, 14));
  const c = cone(0.24, tall, m, 0, tall / 2, 0, 10);
  c.rotation.z = 0.15;
  h.add(c);
  return h;
}

export function buildMonster(type: MonsterType): MonsterRig {
  let rig: MonsterRig;
  switch (type) {
    case 'zombie': {
      rig = humanMonster({ skin: 0x7ea36e, hair: 0x2a2a1a, top: 0x5a4a3a, topDark: 0x3a2e24, pants: 0x3a3a48, boots: 0x22201e, trim: 0x4a3a2a, hat: 'none', hatColor: 0 }, { eyeColor: 0xff3a2a }, 1);
      rig.arms.forEach((a) => (a.rotation.x = -1.35));
      rig.group.add(box(0.2, 0.3, 0.02, mat(0x2a2218), 0.1, 1.2, 0.19));
      rig.group.add(box(0.24, 0.2, 0.02, mat(0x8a2a24), -0.12, 1.0, 0.19));
      break;
    }
    case 'skeleton': {
      rig = humanMonster({ skin: 0xeee8d4, hair: 0xeee8d4, top: 0xd8d2bc, topDark: 0xb8b29c, pants: 0xd8d2bc, boots: 0xc0baa4, trim: 0xb8b29c, hat: 'none', hatColor: 0 }, { thin: 0.78, eyeColor: 0x15110e }, 1);
      for (let i = 0; i < 4; i++) rig.group.add(box(0.46, 0.04, 0.03, mat(0x2a2620), 0, 0.98 + i * 0.13, 0.18));
      break;
    }
    case 'vampire': {
      const r = buildHuman({ skin: 0xe8e0e2, hair: 0x120e16, top: 0x18121e, topDark: 0x2a1020, pants: 0x14101a, boots: 0x0c0a10, trim: 0xb01830, hat: 'none', hatColor: 0, cape: 0x781020 }, { eyeColor: 0xff2030 });
      r.head.add(cone(0.02, 0.07, mat(0xffffff), -0.05, -0.1, 0.2, 4).rotateX(Math.PI));
      r.head.add(cone(0.02, 0.07, mat(0xffffff), 0.05, -0.1, 0.2, 4).rotateX(Math.PI));
      r.group.add(box(0.2, 0.34, 0.05, mat(0x18121e), -0.26, 1.62, -0.12));
      r.group.add(box(0.2, 0.34, 0.05, mat(0x18121e), 0.26, 1.62, -0.12));
      rig = { group: r.group, legs: [r.legL, r.legR], arms: [r.armL, r.armR], head: r.head, extra: { cape: r.cape! }, float: 0, baseY: 0, mats: [] };
      break;
    }
    case 'franken': {
      rig = humanMonster({ skin: 0x8fb08a, hair: 0x14161a, top: 0x2a2a34, topDark: 0x1c1c24, pants: 0x2a2a34, boots: 0x14141a, trim: 0x60606a, hat: 'none', hatColor: 0 }, { boxHead: true, eyeColor: 0xe8e060 }, 1.5);
      const h = rig.head!;
      h.add(box(0.52, 0.12, 0.48, mat(0x14161a), 0, 0.3, 0));
      h.add(cyl(0.05, 0.05, 0.14, mat(0x8a8a96, { metalness: 0.7 }), -0.3, -0.05, 0, 8).rotateZ(Math.PI / 2));
      h.add(cyl(0.05, 0.05, 0.14, mat(0x8a8a96, { metalness: 0.7 }), 0.3, -0.05, 0, 8).rotateZ(Math.PI / 2));
      h.add(box(0.3, 0.03, 0.02, mat(0x1a1a1a), 0.02, 0.22, 0.24));
      rig.arms.forEach((a) => (a.rotation.x = -1.2));
      break;
    }
    case 'ghost': {
      const g = new THREE.Group();
      const pts: THREE.Vector2[] = [];
      for (let i = 0; i <= 10; i++) {
        const t = i / 10;
        pts.push(new THREE.Vector2(0.12 + Math.sin(t * Math.PI * 0.9) * 0.46 + (t > 0.85 ? 0.08 : 0), t * 1.7));
      }
      const body = shadowed(new THREE.Mesh(new THREE.LatheGeometry(pts, 12), mat(0xe8f0ff, { transparent: true, opacity: 0.78, emissive: 0x6688cc, emissiveIntensity: 0.55, flatShading: false, side: THREE.DoubleSide })));
      g.add(body);
      g.add(sph(0.09, mat(0x101018), -0.15, 1.2, 0.36));
      g.add(sph(0.09, mat(0x101018), 0.15, 1.2, 0.36));
      g.add(sph(0.08, mat(0x101018), 0, 0.98, 0.4, 1, 1.5, 1));
      const aL = sph(0.11, mat(0xe8f0ff, { transparent: true, opacity: 0.78 }), -0.5, 0.9, 0.2);
      const aR = sph(0.11, mat(0xe8f0ff, { transparent: true, opacity: 0.78 }), 0.5, 0.9, 0.2);
      g.add(aL, aR);
      rig = { group: g, legs: [], arms: [aL, aR], extra: { body }, float: 0.55, baseY: 0.55, mats: [] };
      break;
    }
    case 'werewolf': {
      rig = wolfRig(0x6a4a30, 0x3a2818, 0xff2a1a, 1.15);
      break;
    }
    case 'ice_wolf': {
      rig = wolfRig(0xdce8f4, 0x7a9ab4, 0x40c8ff, 1.1, (g, _h, _fur, dark) => {
        for (let i = 0; i < 4; i++) g.add(cone(0.1, 0.5, mat(0xa8dcf8, { emissive: 0x2a80c0, emissiveIntensity: 0.5 }), -0.3 + i * 0.2, 1.62, -0.2 + (i % 2) * 0.2, 4));
        g.add(sph(0.2, dark, 0, 1.0, -0.7, 1, 0.8, 1.3, 6));
      });
      break;
    }
    case 'hellhound': {
      rig = wolfRig(0x2a1a1a, 0x120a0a, 0xffa020, 1.25, (g) => {
        const flame = new THREE.MeshStandardMaterial({ color: 0xff7a18, emissive: 0xff4a08, emissiveIntensity: 1.5 });
        for (let i = 0; i < 6; i++) g.add(cone(0.14, 0.55 + (i % 2) * 0.2, flame, 0, 1.55, -0.5 + i * 0.26, 5));
        g.add(cone(0.18, 0.8, flame, 0, 1.05, -1.1, 5).rotateX(-1.9));
      }, 2);
      break;
    }
    case 'imp': {
      rig = wolfRig(0xd04030, 0x601818, 0xffe040, 0.78, (g, head) => {
        const horn = mat(0xf0e0c0);
        head.add(cone(0.06, 0.3, horn, -0.14, 0.4, 0.05, 5));
        head.add(cone(0.06, 0.3, horn, 0.14, 0.4, 0.05, 5));
        const wing = mat(0x701818, { side: THREE.DoubleSide });
        for (const s of [-1, 1]) {
          const w = box(0.9, 0.04, 0.6, wing, s * 0.7, 1.55, -0.15);
          w.rotation.z = s * 0.5;
          g.add(w);
        }
      }, 1.4);
      break;
    }
    case 'goblin': {
      rig = humanMonster({ skin: 0x6aa84a, hair: 0x2a3a1a, top: 0x6a4a2a, topDark: 0x4a321c, pants: 0x4a3a2a, boots: 0x2a2018, trim: 0x8a6a3a, hat: 'none', hatColor: 0 }, { eyeColor: 0xffe030 }, 0.8);
      const skin = mat(0x6aa84a);
      for (const s of [-1, 1]) {
        const ear = cone(0.08, 0.34, skin, s * 0.3, 0.06, 0, 4);
        ear.rotation.z = -s * 1.2;
        rig.head!.add(ear);
      }
      rig.head!.add(cone(0.05, 0.16, mat(0xf4f0d8), -0.07, -0.13, 0.2, 4).rotateX(Math.PI));
      rig.head!.add(cone(0.05, 0.16, mat(0xf4f0d8), 0.07, -0.13, 0.2, 4).rotateX(Math.PI));
      const club = cyl(0.06, 0.12, 0.85, mat(0x6a4a2a), 0, -0.85, 0.15, 6);
      club.rotation.x = 0.5;
      rig.arms[1].add(club);
      rig.arms[1].rotation.x = -0.3;
      break;
    }
    case 'scarecrow': {
      rig = humanMonster({ skin: 0xc8a860, hair: 0xd8b850, top: 0x7a5a3a, topDark: 0x5a4028, pants: 0x6a5030, boots: 0x3a2a18, trim: 0xa07838, hat: 'none', hatColor: 0 }, { eyeColor: 0xff6a10 }, 1.05);
      const hat = brimHat(0xc8a448, 0.5);
      hat.position.y = 0.2;
      rig.head!.add(hat);
      for (let i = 0; i < 5; i++) rig.head!.add(box(0.03, 0.03, 0.02, mat(0x2a1a10), -0.1 + i * 0.05, -0.1 + (i % 2) * 0.02, 0.22));
      const straw = mat(0xe0c050);
      rig.arms.forEach((a) => {
        a.rotation.x = -1.5;
        for (let k = 0; k < 4; k++) a.add(cone(0.03, 0.3, straw, -0.08 + k * 0.05, -0.78, 0.0, 4).rotateX(Math.PI));
      });
      rig.group.add(box(0.2, 0.2, 0.03, mat(0x8a3a2a), -0.1, 1.05, 0.19));
      break;
    }
    case 'mummy': {
      rig = humanMonster({ skin: 0xd8cca0, hair: 0xd8cca0, top: 0xcfc294, topDark: 0xb8aa7a, pants: 0xcfc294, boots: 0xbfb386, trim: 0xa89c70, hat: 'none', hatColor: 0 }, { eyeColor: 0xffcc30 }, 1.1);
      const band = mat(0xe8dcb0);
      for (let i = 0; i < 5; i++) {
        const b = box(0.66, 0.06, 0.4, band, 0, 0.86 + i * 0.14, 0);
        b.rotation.z = (i % 2 ? 1 : -1) * 0.18;
        rig.group.add(b);
      }
      for (let i = 0; i < 3; i++) {
        const b = box(0.52, 0.05, 0.5, band, 0, 1.76 + i * 0.1, 0);
        b.rotation.z = (i % 2 ? 1 : -1) * 0.2;
        rig.group.add(b);
      }
      rig.group.add(box(0.05, 0.5, 0.03, band, 0.18, 0.7, 0.2));
      rig.arms.forEach((a) => (a.rotation.x = -1.35));
      break;
    }
    case 'banshee': {
      rig = ghostLike(0xd8c8ff, 0x8a5acc, 0xff40a0, 1.05);
      break;
    }
    case 'bat': {
      const g = new THREE.Group();
      const fur = mat(0x4a3258);
      const wingM = mat(0x2a1a38, { side: THREE.DoubleSide, flatShading: false });
      const body = sph(0.3, fur, 0, 1.0, 0, 1, 1.15, 1);
      g.add(body);
      g.add(sph(0.22, fur, 0, 1.38, 0.1));
      g.add(cone(0.07, 0.24, fur, -0.12, 1.62, 0.08, 4));
      g.add(cone(0.07, 0.24, fur, 0.12, 1.62, 0.08, 4));
      const eye = mat(0xff2030, { emissive: 0xff1020, emissiveIntensity: 1.3 });
      g.add(sph(0.045, eye, -0.08, 1.4, 0.28));
      g.add(sph(0.045, eye, 0.08, 1.4, 0.28));
      g.add(cone(0.025, 0.1, mat(0xffffff), -0.05, 1.27, 0.27, 4).rotateX(Math.PI));
      g.add(cone(0.025, 0.1, mat(0xffffff), 0.05, 1.27, 0.27, 4).rotateX(Math.PI));
      const mkWing = (s: number): THREE.Group => {
        const w = pivot(s * 0.2, 1.1, 0);
        const m = shadowed(new THREE.Mesh(new THREE.PlaneGeometry(1.1, 0.55), wingM));
        m.geometry.translate(s * 0.55, 0, 0);
        m.rotation.x = -Math.PI / 2;
        w.add(m);
        w.add(cyl(0.025, 0.025, 1.1, fur, s * 0.55, 0, 0.1, 5).rotateZ(Math.PI / 2));
        return w;
      };
      const wl = mkWing(-1);
      const wr = mkWing(1);
      g.add(wl, wr);
      rig = { group: g, legs: [], arms: [wl, wr], extra: { body }, float: 0.3, baseY: 0.7, mats: [] };
      break;
    }
    case 'witch': {
      rig = humanMonster({ skin: 0x8ab070, hair: 0x1a1a22, top: 0x5a2a7a, topDark: 0x3a1a52, pants: 0x3a1a52, boots: 0x1a1a1a, trim: 0xc8a030, hat: 'none', hatColor: 0, female: true, longHair: true }, { eyeColor: 0xb0ff40 }, 1.0);
      const hat = brimHat(0x2a1a3a, 0.9);
      hat.position.y = 0.2;
      rig.head!.add(hat);
      rig.head!.add(box(0.5, 0.06, 0.5, mat(0xc8a030), 0, 0.24, 0));
      const staff = cyl(0.04, 0.05, 1.7, mat(0x4a3018), 0, -0.9, 0.25, 6);
      staff.rotation.x = 0.2;
      rig.arms[1].add(staff);
      rig.arms[1].add(sph(0.14, mat(0xa0ff40, { emissive: 0x60d010, emissiveIntensity: 1.4, flatShading: false }), 0, -1.75, 0.6));
      break;
    }
    case 'lich': {
      rig = humanMonster({ skin: 0xeee8d4, hair: 0xeee8d4, top: 0x4a1a6a, topDark: 0x2a0e44, pants: 0x2a0e44, boots: 0x1a0a28, trim: 0xb060ff, hat: 'none', hatColor: 0, female: true }, { thin: 0.85, eyeColor: 0xb0ff60 }, 1.7);
      const gold = mat(0xc8a030, { metalness: 0.7, roughness: 0.35 });
      for (let i = 0; i < 7; i++) {
        const a = (i / 7) * Math.PI * 2;
        rig.head!.add(cone(0.06, 0.34 + (i % 2) * 0.12, gold, Math.cos(a) * 0.2, 0.34, Math.sin(a) * 0.2, 5));
      }
      rig.head!.add(sph(0.06, mat(0xb060ff, { emissive: 0xb060ff, emissiveIntensity: 1.5, flatShading: false }), 0, 0.3, 0.2, 1, 1, 1, 8));
      const staff = cyl(0.045, 0.06, 2.2, mat(0x2a1a3a), 0, -1.0, 0.3, 6);
      staff.rotation.x = 0.15;
      rig.arms[1].add(staff);
      rig.arms[1].add(sph(0.2, mat(0xe8e4d0), 0, -2.15, 0.62, 1, 1.1, 1, 10));
      rig.arms[1].add(sph(0.07, mat(0xb0ff60, { emissive: 0xb0ff60, emissiveIntensity: 1.6, flatShading: false }), -0.07, -2.12, 0.78, 1, 1, 1, 6));
      rig.arms[1].add(sph(0.07, mat(0xb0ff60, { emissive: 0xb0ff60, emissiveIntensity: 1.6, flatShading: false }), 0.07, -2.12, 0.78, 1, 1, 1, 6));
      rig.arms.forEach((a) => (a.rotation.x = -0.6));
      rig.float = 0.35;
      rig.baseY = 0.4;
      break;
    }
    case 'golem': {
      rig = golemRig(0x7a7a82, 0x60e0ff, 1.7, false);
      break;
    }
    case 'lava_golem': {
      rig = golemRig(0x2e2428, 0xff7a20, 1.85, true);
      break;
    }
    case 'colossus': {
      rig = golemRig(0x6a6a74, 0xff5a20, 3.3, true);
      const spike = mat(0x4a4a54);
      for (let i = 0; i < 7; i++) {
        const a = (i / 7) * Math.PI * 2;
        rig.head!.add(cone(0.09, 0.45, spike, Math.cos(a) * 0.22, 0.42, Math.sin(a) * 0.22, 5));
      }
      break;
    }
    case 'yeti': {
      rig = humanMonster({ skin: 0xe8f0f8, hair: 0xdce8f4, top: 0xe8f0f8, topDark: 0xc4d4e4, pants: 0xdce8f4, boots: 0x9ab4c8, trim: 0xdde8f4, hat: 'none', hatColor: 0 }, { eyeColor: 0x40a0ff }, 1.55);
      const fur = mat(0xf2f8fc);
      rig.head!.add(box(0.5, 0.08, 0.1, mat(0xaac4d8), 0, 0.1, 0.22));
      rig.head!.add(cone(0.04, 0.14, mat(0xffffff), -0.08, -0.13, 0.2, 4).rotateX(Math.PI));
      rig.head!.add(cone(0.04, 0.14, mat(0xffffff), 0.08, -0.13, 0.2, 4).rotateX(Math.PI));
      for (let i = 0; i < 6; i++) rig.group.add(cone(0.12, 0.3, fur, -0.25 + (i % 3) * 0.25, 1.0 + Math.floor(i / 3) * 0.4, 0.2, 5).rotateX(Math.PI / 2));
      rig.arms.forEach((a) => (a.rotation.x = -1.2));
      rig.arms.forEach((a) => a.add(sph(0.18, fur, 0, -0.62, 0, 1, 1.2, 1, 8)));
      break;
    }
    case 'snowman': {
      const g = new THREE.Group();
      const snow = mat(0xf4f8ff, { flatShading: false, roughness: 0.9 });
      g.add(sph(0.62, snow, 0, 0.62, 0));
      g.add(sph(0.45, snow, 0, 1.4, 0));
      const head = sph(0.32, snow, 0, 1.98, 0);
      g.add(head);
      const coal = mat(0x14120f);
      g.add(sph(0.045, coal, -0.11, 2.05, 0.28));
      g.add(sph(0.045, coal, 0.11, 2.05, 0.28));
      g.add(cone(0.055, 0.34, mat(0xff7a1a), 0, 1.96, 0.4, 6).rotateX(Math.PI / 2));
      for (let i = 0; i < 3; i++) g.add(sph(0.04, coal, 0, 1.45 - i * 0.2, 0.43));
      g.add(cyl(0.28, 0.28, 0.04, mat(0x15151a), 0, 2.26, 0, 12));
      g.add(cyl(0.18, 0.18, 0.3, mat(0x15151a), 0, 2.42, 0, 12));
      g.add(cyl(0.19, 0.19, 0.06, mat(0xb02a2a), 0, 2.32, 0, 12));
      const mkArm = (s: number): THREE.Group => {
        const p = pivot(s * 0.45, 1.45, 0);
        p.add(cyl(0.03, 0.04, 0.95, mat(0x5a3a1c), s * 0.45, -0.05, 0, 5).rotateZ(s * 1.2));
        return p;
      };
      const aL = mkArm(-1);
      const aR = mkArm(1);
      g.add(aL, aR);
      rig = { group: g, legs: [], arms: [aL, aR], head, extra: {}, float: 0, baseY: 0, mats: [] };
      break;
    }
    case 'demon': {
      rig = humanMonster({ skin: 0xb02a1a, hair: 0x2a0a0a, top: 0x5a1210, topDark: 0x3a0a08, pants: 0x3a0a08, boots: 0x1a0808, trim: 0xff7a20, hat: 'none', hatColor: 0 }, { eyeColor: 0xffe040 }, 1.25);
      const horn = mat(0x2a1210);
      for (const s of [-1, 1]) {
        const h = cone(0.08, 0.55, horn, s * 0.17, 0.4, -0.02, 5);
        h.rotation.z = -s * 0.35;
        rig.head!.add(h);
      }
      const wing = mat(0x6a1410, { side: THREE.DoubleSide, flatShading: false });
      for (const s of [-1, 1]) {
        const w = box(1.2, 0.04, 0.8, wing, s * 0.8, 1.7, -0.3);
        w.rotation.z = s * 0.45;
        rig.group.add(w);
      }
      rig.arms[0].add(sph(0.16, mat(0xff7a20, { emissive: 0xff4a08, emissiveIntensity: 1.5, flatShading: false }), 0, -0.75, 0.05));
      rig.arms[1].add(sph(0.16, mat(0xff7a20, { emissive: 0xff4a08, emissiveIntensity: 1.5, flatShading: false }), 0, -0.75, 0.05));
      break;
    }
    case 'dragon': {
      const g = new THREE.Group();
      const red = mat(0xb02a22);
      const dark = mat(0x701a16);
      const belly = mat(0xe0b060);
      g.add(sph(1.1, red, 0, 1.9, 0, 1.15, 0.95, 1.9, 14));
      g.add(sph(1.0, belly, 0, 1.55, 0.1, 0.9, 0.7, 1.75, 12));
      // cổ và đầu
      let ny = 2.4;
      let nz = 1.7;
      for (let i = 0; i < 3; i++) {
        g.add(sph(0.5 - i * 0.04, red, 0, ny, nz));
        ny += 0.35;
        nz += 0.3;
      }
      const head = new THREE.Group();
      head.position.set(0, ny + 0.1, nz + 0.2);
      head.add(box(0.85, 0.7, 1.3, red, 0, 0, 0.2));
      head.add(box(0.7, 0.3, 0.9, dark, 0, -0.35, 0.35));
      head.add(box(0.5, 0.2, 0.5, red, 0, 0.05, 1.0));
      head.add(cone(0.12, 0.7, mat(0xf0e8c8), -0.3, 0.55, -0.2, 5).rotateX(-0.6));
      head.add(cone(0.12, 0.7, mat(0xf0e8c8), 0.3, 0.55, -0.2, 5).rotateX(-0.6));
      head.add(sph(0.1, mat(0xffe030, { emissive: 0xffc010, emissiveIntensity: 1.2 }), -0.35, 0.2, 0.55));
      head.add(sph(0.1, mat(0xffe030, { emissive: 0xffc010, emissiveIntensity: 1.2 }), 0.35, 0.2, 0.55));
      head.add(sph(0.2, mat(0xff7a20, { emissive: 0xff5010, emissiveIntensity: 1.3 }), 0, -0.2, 0.9));
      g.add(head);
      // cánh
      const wingShape = new THREE.Shape();
      wingShape.moveTo(0, 0);
      wingShape.lineTo(2.8, 1.0);
      wingShape.lineTo(3.8, -0.4);
      wingShape.lineTo(2.6, -0.5);
      wingShape.lineTo(2.4, -1.4);
      wingShape.lineTo(1.2, -0.9);
      wingShape.lineTo(0, -1.1);
      wingShape.closePath();
      const wingGeo = new THREE.ShapeGeometry(wingShape);
      const mkWing = (s: number): THREE.Group => {
        const w = pivot(s * 0.9, 2.7, 0.2);
        const mem = shadowed(new THREE.Mesh(wingGeo, mat(0x8a1e1a, { side: THREE.DoubleSide, flatShading: false })));
        mem.rotation.y = s > 0 ? 0 : Math.PI;
        mem.rotation.x = -Math.PI / 2;
        w.add(mem);
        const bone = cyl(0.08, 0.1, 3.0, dark, s * 1.4, 0.05, 0.4, 6);
        bone.rotation.z = Math.PI / 2 - s * 0.25;
        w.add(bone);
        return w;
      };
      const wL = mkWing(-1);
      const wR = mkWing(1);
      g.add(wL, wR);
      // đuôi
      let tz = -1.9;
      let ts = 0.55;
      const tail: THREE.Object3D[] = [];
      for (let i = 0; i < 4; i++) {
        const s = sph(ts, red, 0, 1.6 - i * 0.12, tz);
        g.add(s);
        tail.push(s);
        tz -= 0.8;
        ts *= 0.8;
      }
      g.add(cone(0.3, 0.9, dark, 0, 1.2, tz - 0.3, 5).rotateX(-Math.PI / 2));
      for (let i = 0; i < 6; i++) g.add(cone(0.12, 0.45, dark, 0, 2.95 - i * 0.04, 1.2 - i * 0.55, 5));
      const mkLeg = (x: number, z: number): THREE.Group => {
        const p = pivot(x, 1.3, z);
        p.add(cyl(0.3, 0.22, 1.3, red, 0, -0.55, 0, 8));
        p.add(box(0.5, 0.18, 0.6, dark, 0, -1.2, 0.12));
        return p;
      };
      const legs = [mkLeg(-0.8, 1.0), mkLeg(0.8, 1.0), mkLeg(-0.8, -1.0), mkLeg(0.8, -1.0)];
      legs.forEach((l) => g.add(l));
      g.scale.setScalar(1.25);
      rig = { group: g, legs, arms: [], head, extra: { wingL: wL, wingR: wR, tail0: tail[0] }, float: 0, baseY: 0, mats: [] };
      break;
    }
    default:
      rig = humanMonster({ skin: 0x888888, hair: 0, top: 0x444444, topDark: 0x222222, pants: 0x333333, boots: 0x111111, trim: 0x666666, hat: 'none', hatColor: 0 }, {}, 1);
  }
  rig.mats = flashMaterials(rig.group);
  return rig;
}

/** Ánh vàng cho vũ khí đã tiến hóa (cấp +5). */
export function tintEvolved(obj: THREE.Object3D): void {
  obj.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh) return;
    const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    for (const mt of mats) {
      const s = mt as THREE.MeshStandardMaterial;
      if (s.isMeshStandardMaterial) {
        s.emissive.setHex(0xffb020);
        s.emissiveIntensity = 0.42;
      }
    }
  });
}

/** Cung của Trưng Nhị, cầm dọc, lưng cung hướng về phía trước (+Z). */
export function buildBow(): THREE.Group {
  const outer = new THREE.Group();
  const inner = new THREE.Group();
  const arc = shadowed(new THREE.Mesh(new THREE.TorusGeometry(0.75, 0.045, 6, 16, Math.PI), mat(0x8a5a30)));
  inner.add(arc);
  inner.rotation.z = Math.PI / 2;
  outer.rotation.y = Math.PI / 2;
  outer.add(inner);
  const g = new THREE.Group();
  g.add(outer);
  g.add(cyl(0.012, 0.012, 1.5, mat(0xf4f0e0), 0, 0, 0, 4));
  g.position.set(0, 0, 0.3);
  return g;
}

/** Voi chiến. Voi sắt có đại bác trên lưng, voi trắng có cồng đồng. Chân lưu ở userData.legs để chạy hoạt ảnh. */
export function buildElephant(white: boolean): THREE.Group {
  const g = new THREE.Group();
  const skin = mat(white ? 0xf2f0ea : 0x8a8a92);
  const dark = mat(white ? 0xd8d4c8 : 0x6a6a72);
  const tusk = mat(0xfff4d8);
  const cloth = mat(white ? 0xe0b030 : 0xb3261e);
  const wood = mat(0x5a3a1c);
  g.add(sph(1.1, skin, 0, 1.95, 0, 1.0, 0.95, 1.9, 14));
  g.add(sph(0.8, skin, 0, 2.25, 2.0, 1, 1, 1, 12));
  g.add(sph(0.5, dark, -0.9, 2.35, 1.65, 0.15, 1, 0.9, 10));
  g.add(sph(0.5, dark, 0.9, 2.35, 1.65, 0.15, 1, 0.9, 10));
  const t1 = cyl(0.3, 0.24, 0.9, skin, 0, 1.95, 2.8, 8);
  t1.rotation.x = -0.45;
  g.add(t1);
  const t2 = cyl(0.24, 0.18, 0.9, skin, 0, 1.25, 3.1, 8);
  t2.rotation.x = -0.15;
  g.add(t2);
  for (const sx of [-1, 1]) {
    const tu = cone(0.11, 1.2, tusk, sx * 0.5, 1.75, 3.0, 6);
    tu.rotation.x = Math.PI / 2 + 0.25;
    g.add(tu);
    g.add(sph(0.08, mat(0x15110e), sx * 0.55, 2.55, 2.65, 1, 1, 1, 6));
  }
  g.add(box(2.2, 0.12, 3.0, cloth, 0, 2.95, -0.1));
  g.add(box(1.7, 0.22, 2.3, wood, 0, 3.1, -0.15));
  if (white) {
    const gong = shadowed(new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.08, 8, 20), mat(0xc8963e, { metalness: 0.6 })));
    gong.position.set(0, 3.9, -0.9);
    g.add(gong);
    g.add(cyl(0.38, 0.38, 0.06, mat(0xe0b060, { metalness: 0.6 }), 0, 3.9, -0.9, 16).rotateX(Math.PI / 2));
    g.add(cyl(0.05, 0.05, 1.6, wood, -0.6, 3.9, -0.9, 6));
    g.add(cyl(0.05, 0.05, 1.6, wood, 0.6, 3.9, -0.9, 6));
  } else {
    const cannon = cyl(0.22, 0.28, 1.9, mat(0x2a2a30, { metalness: 0.5 }), 0, 3.55, 0.7, 10);
    cannon.rotation.x = Math.PI / 2;
    g.add(cannon);
    g.add(cyl(0.3, 0.3, 0.14, mat(0x1a1a1e), 0, 3.55, 1.7, 10).rotateX(Math.PI / 2));
    g.add(cyl(0.04, 0.04, 2.4, wood, -0.7, 4.2, -1.0, 5));
    g.add(box(0.05, 0.8, 1.1, mat(0xd02a1a), -0.7, 5.0, -1.55));
  }
  const legs: THREE.Group[] = [];
  for (const [x, z] of [[-0.75, 1.1], [0.75, 1.1], [-0.75, -1.1], [0.75, -1.1]]) {
    const leg = new THREE.Group();
    leg.position.set(x, 1.3, z);
    leg.add(cyl(0.34, 0.3, 1.3, skin, 0, -0.62, 0, 8));
    leg.add(sph(0.32, dark, 0, -1.25, 0.05, 1.1, 0.5, 1.2, 8));
    g.add(leg);
    legs.push(leg);
  }
  g.userData.legs = legs;
  return g;
}
