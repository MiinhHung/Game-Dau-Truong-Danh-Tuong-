import * as THREE from 'three';
import { box, cone, cyl, mat, shadowed, sph } from '../primitives/shapes';

/* ---------- Vũ khí dân dã (dựng dọc trục +Z, gốc ở chỗ cầm) ---------- */

/** Thanh tròn nối hai điểm (dây dép, nan ghế...). */
export function bar(a: THREE.Vector3, b: THREE.Vector3, r: number, m: THREE.Material): THREE.Mesh {
  const len = a.distanceTo(b);
  const mesh = shadowed(new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, 8), m));
  mesh.position.copy(a).add(b).multiplyScalar(0.5);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3().subVectors(b, a).normalize());
  return mesh;
}

export const v3 = (x: number, y: number, z: number): THREE.Vector3 => new THREE.Vector3(x, y, z);

/** Đường viền bàn chân (mũi hướng +y), dùng để đùn khối đế dép. */
export function footShape(k: number): THREE.Shape {
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

export function footSlab(k: number, depth: number, m: THREE.Material): THREE.Mesh {
  const geo = new THREE.ExtrudeGeometry(footShape(k), {
    depth,
    bevelEnabled: true,
    bevelThickness: 0.012,
    bevelSize: 0.012,
    bevelSegments: 2,
    curveSegments: 16,
  });
  geo.rotateX(Math.PI / 2);
  return shadowed(new THREE.Mesh(geo, m));
}

export function strapTube(pts: THREE.Vector3[], m: THREE.Material): THREE.Mesh {
  return shadowed(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 10, 0.022, 6, false), m));
}

/** Dép lào cao su: đế trắng đùn theo bàn chân, lớp mặt xanh, quai chữ V và núm xỏ ngón. */
export function slipper(): THREE.Group {
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
export function plasticChair(): THREE.Group {
  const g = new THREE.Group();
  const red = mat(0xd8262a, { roughness: 0.32, metalness: 0.02, flatShading: false });
  const dark = mat(0xa81a1e, { roughness: 0.4, flatShading: false });
  g.add(box(0.92, 0.07, 0.86, red, 0, 0, 0));
  g.add(box(0.96, 0.05, 0.05, dark, 0, -0.01, 0.45));
  g.add(box(0.96, 0.05, 0.05, dark, 0, -0.01, -0.45));
  // lưng tựa
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

/** Nón lá: chóp nón bằng lá cọ khô có nhiều vòng nan, quai lụa đỏ. */
export function nonLa(): THREE.Group {
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

/** Chổi chít: cán tre có mấu, bó chít xòe rộng buộc dây đỏ. */
export function broom(): THREE.Group {
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
    const tilt = 0.12 + (((i * 37) % 10) / 10) * 0.42;
    const len = 0.95 + (((i * 53) % 10) / 10) * 0.35;
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

/** Muôi canh inox: cán dẹt có lỗ treo, gáo lõm. */
export function ladle(): THREE.Group {
  const g = new THREE.Group();
  const steel = mat(0xcfd4da, { metalness: 0.85, roughness: 0.22, flatShading: false });
  const inner = new THREE.MeshStandardMaterial({ color: 0x9aa1a8, metalness: 0.8, roughness: 0.3, side: THREE.BackSide, flatShading: false });
  g.add(box(0.06, 0.035, 1.55, steel, 0, 0.12, 0.8));
  const hook = shadowed(new THREE.Mesh(new THREE.TorusGeometry(0.08, 0.02, 6, 14), steel));
  hook.position.set(0, 0.12, -0.02);
  hook.rotation.y = Math.PI / 2;
  g.add(hook);
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

/** Chú lợn con hồng hào. */
export function pig(): THREE.Group {
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
export function dieuCay(): THREE.Group {
  const g = new THREE.Group();
  const bamboo = mat(0xb68c3a, { roughness: 0.55, flatShading: false });
  const dark = mat(0x3a2410, { roughness: 0.7 });
  const gold = mat(0xd4a838, { metalness: 0.7, roughness: 0.3, flatShading: false });
  g.add(cyl(0.1, 0.11, 2.1, bamboo, 0, 0, 0.9, 12).rotateX(Math.PI / 2));
  for (const z of [-0.1, 0.55, 1.2, 1.78]) g.add(cyl(0.125, 0.125, 0.06, mat(0x7a5a1c), 0, 0, z, 12).rotateX(Math.PI / 2));
  g.add(cyl(0.065, 0.075, 0.34, dark, 0, 0.26, 0.6, 8));
  g.add(cyl(0.13, 0.07, 0.16, mat(0x5a3818), 0, 0.5, 0.6, 10));
  g.add(sph(0.095, mat(0xff5a10, { emissive: 0xff4010, emissiveIntensity: 1.6, flatShading: false }), 0, 0.55, 0.6, 1, 0.6, 1, 8));
  for (let i = 0; i < 3; i++) {
    const s = sph(0.11 + i * 0.05, new THREE.MeshBasicMaterial({ color: 0xd8d8d8, transparent: true, opacity: 0.4 - i * 0.1, depthWrite: false }), Math.sin(i * 2) * 0.05, 0.72 + i * 0.22, 0.6, 1, 1, 1, 8);
    s.castShadow = false;
    g.add(s);
  }
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
  g.add(cyl(0.07, 0.1, 0.18, dark, 0, 0, -0.18, 10).rotateX(Math.PI / 2));
  return g;
}

export const H_UP = new THREE.Vector3(0, 0.62, 0.78);
export const H_FWD = new THREE.Vector3(0, -0.78, 0.62);

export function holdYZ(obj: THREE.Object3D, y: THREE.Vector3, z: THREE.Vector3, grip: THREE.Vector3, scale: number): void {
  const yy = y.clone().normalize();
  const zz = z.clone().sub(yy.clone().multiplyScalar(yy.dot(z))).normalize();
  const xx = new THREE.Vector3().crossVectors(yy, zz);
  obj.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(xx, yy, zz));
  obj.scale.setScalar(scale);
  obj.position.copy(grip).multiplyScalar(scale).applyQuaternion(obj.quaternion).multiplyScalar(-1);
}

export function holdXY(obj: THREE.Object3D, x: THREE.Vector3, y: THREE.Vector3, grip: THREE.Vector3, scale: number): void {
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
      const s = slipper();
      holdYZ(s, H_FWD.clone().multiplyScalar(-1), H_UP.clone().multiplyScalar(0.9).add(H_FWD.clone().multiplyScalar(0.35)), v3(0, 0, -0.34), 0.95);
      g.add(s);
      break;
    }
    case 'ghe_nhua': {
      const c = plasticChair();
      holdYZ(c, H_FWD.clone().add(H_UP.clone().multiplyScalar(0.5)).multiplyScalar(-1), H_UP.clone().multiplyScalar(-1), v3(0, 0.88, -0.42), 0.62);
      g.add(c);
      break;
    }
    case 'non_la': {
      const n = nonLa();
      holdXY(n, H_FWD.clone().multiplyScalar(-1), H_UP.clone().add(H_FWD.clone().multiplyScalar(-0.35)), v3(0.78, 0, 0), 0.55);
      g.add(n);
      break;
    }
    case 'choi_chit': {
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

