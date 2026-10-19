import * as THREE from 'three';

/* ---------- Tiện ích dựng khối cơ bản Three.js ---------- */

export function mat(color: number, o: THREE.MeshStandardMaterialParameters = {}): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.82, metalness: 0.05, flatShading: true, ...o });
}

export function shadowed<T extends THREE.Mesh>(m: T): T {
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
  const mesh = shadowed(new THREE.Mesh(new THREE.SphereGeometry(r, seg, seg), m));
  mesh.position.set(x, y, z);
  if (sx !== 1 || sy !== 1 || sz !== 1) mesh.scale.set(sx, sy, sz);
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

export function pivot(x: number, y: number, z: number): THREE.Group {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  return g;
}

export function flashMaterials(root: THREE.Object3D): THREE.MeshStandardMaterial[] {
  const mats: THREE.MeshStandardMaterial[] = [];
  root.traverse((o) => {
    if (o instanceof THREE.Mesh && o.material instanceof THREE.MeshStandardMaterial) mats.push(o.material);
  });
  return mats;
}

/**
 * Bỏ đổ bóng cho các mảnh nhỏ (mắt, viền áo, gai, ngón...). Bóng của chúng gần như không nhìn thấy
 * nhưng mỗi mảnh đổ bóng tốn thêm một lệnh vẽ ở pass bóng mỗi khung hình.
 */
export function trimShadowCasters(root: THREE.Object3D, minRadius = 0.16): void {
  root.updateMatrixWorld(true);
  const s = new THREE.Vector3();
  root.traverse((o) => {
    const m = o as THREE.Mesh;
    if (!m.isMesh || !m.castShadow || (m as unknown as THREE.InstancedMesh).isInstancedMesh) return;
    const g = m.geometry;
    if (!g.boundingSphere) g.computeBoundingSphere();
    m.getWorldScale(s);
    if (g.boundingSphere!.radius * Math.max(s.x, s.y, s.z) < minRadius) m.castShadow = false;
  });
}
