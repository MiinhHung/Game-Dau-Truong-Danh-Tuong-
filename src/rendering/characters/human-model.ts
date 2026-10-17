import * as THREE from 'three';
import type { HumanSpec } from '../../domain/data';
import { box, cyl, mat, pivot, shadowed, sph, cone } from '../primitives/shapes';

/* ---------- Người / Danh Tướng ---------- */

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
  /** Các mô hình trang bị 3D gắn trên Rig (Mũ, Giáp, Giày, Bùa). */
  gearNodes?: {
    head?: THREE.Group;
    body?: THREE.Group;
    feetL?: THREE.Group;
    feetR?: THREE.Group;
    charm?: THREE.Group;
  };
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
