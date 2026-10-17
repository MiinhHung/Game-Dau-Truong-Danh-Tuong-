import * as THREE from 'three';
import type { HumanSpec, MonsterType } from '../../domain/data';
import { box, cone, cyl, mat, shadowed, sph, pivot, flashMaterials } from '../primitives/shapes';
import { buildHuman, type HumanOpts } from '../characters/human-model';

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
function wolfRig(
  furC: number,
  darkC: number,
  eyeC: number,
  scale: number,
  deco?: (g: THREE.Group, head: THREE.Group, fur: THREE.MeshStandardMaterial, dark: THREE.MeshStandardMaterial) => void,
  eyeGlow = 1
): MonsterRig {
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
