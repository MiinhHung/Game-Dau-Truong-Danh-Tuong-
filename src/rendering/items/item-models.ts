import * as THREE from 'three';
import { box, cone, cyl, mat, shadowed, sph } from '../primitives/shapes';
import { slipper, nonLa, pig } from '../weapons/weapon-models';

/**
 * Đạn / phi tiêu và hiệu ứng bay.
 */
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
      const m = new THREE.MeshStandardMaterial({
        color: 0xcfcfd2,
        emissive: 0x606068,
        emissiveIntensity: 0.4,
        transparent: true,
        opacity: 0.62,
        depthWrite: false,
        flatShading: false,
        roughness: 1,
      });
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

/** Đồng tiền vàng rơi ra từ quái vật. */
export function buildCoin(): THREE.Mesh {
  const c = shadowed(
    new THREE.Mesh(
      new THREE.CylinderGeometry(0.28, 0.28, 0.07, 14),
      mat(0xffc830, { metalness: 0.7, roughness: 0.3, emissive: 0x805000, emissiveIntensity: 0.5 })
    )
  );
  c.rotation.x = Math.PI / 2;
  return c;
}

/** Bánh chưng hồi máu. */
export function buildBanhChung(): THREE.Group {
  const g = new THREE.Group();
  g.add(box(0.55, 0.4, 0.55, mat(0x3a8a3a)));
  g.add(box(0.57, 0.42, 0.06, mat(0x6a4a20)));
  g.add(box(0.06, 0.42, 0.57, mat(0x6a4a20)));
  return g;
}
