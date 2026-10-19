import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

/**
 * Gộp các khối tĩnh cùng một khớp (cùng cha) và cùng kiểu vật liệu thành một mesh duy nhất,
 * giữ màu riêng từng khối bằng màu đỉnh. Một con quái dựng từ ~25 khối chỉ còn khoảng 8 lệnh vẽ,
 * còn các khớp (tay, chân, đầu) vẫn xoay được như cũ vì chỉ gộp con trực tiếp của từng khớp.
 *
 * keep: các đối tượng được code khác tham chiếu trực tiếp (để hoạt ảnh), không được gộp.
 */
export function mergeStaticParts(root: THREE.Object3D, keep: Set<THREE.Object3D> = new Set()): void {
  const parents: THREE.Object3D[] = [];
  root.traverse((o) => {
    if (!(o as THREE.Mesh).isMesh) parents.push(o);
  });
  for (const parent of parents) {
    const groups = new Map<string, THREE.Mesh[]>();
    for (const child of parent.children) {
      const m = child as THREE.Mesh;
      if (!m.isMesh || keep.has(m) || m.children.length > 0 || Array.isArray(m.material)) continue;
      const mat = m.material as THREE.MeshStandardMaterial;
      if (!mat.isMeshStandardMaterial || mat.map || mat.vertexColors || mat.transparent) continue;
      const key = [mat.roughness, mat.metalness, mat.emissive.getHexString(), mat.emissiveIntensity, mat.side, mat.flatShading, m.castShadow, m.receiveShadow].join('|');
      let list = groups.get(key);
      if (!list) groups.set(key, (list = []));
      list.push(m);
    }
    for (const list of groups.values()) {
      if (list.length < 2) continue;
      const geos: THREE.BufferGeometry[] = [];
      for (const m of list) {
        m.updateMatrix();
        let g = m.geometry.clone().applyMatrix4(m.matrix);
        if (g.index) g = g.toNonIndexed();
        for (const name of Object.keys(g.attributes)) if (name !== 'position' && name !== 'normal') g.deleteAttribute(name);
        const c = (m.material as THREE.MeshStandardMaterial).color;
        const n = g.attributes.position.count;
        const col = new Float32Array(n * 3);
        for (let i = 0; i < n; i++) {
          col[i * 3] = c.r;
          col[i * 3 + 1] = c.g;
          col[i * 3 + 2] = c.b;
        }
        g.setAttribute('color', new THREE.BufferAttribute(col, 3));
        geos.push(g);
      }
      const merged = mergeGeometries(geos, false);
      geos.forEach((g) => g.dispose());
      if (!merged) continue;
      const first = list[0];
      const mat = (first.material as THREE.MeshStandardMaterial).clone();
      mat.color.setHex(0xffffff);
      mat.vertexColors = true;
      const mesh = new THREE.Mesh(merged, mat);
      mesh.castShadow = first.castShadow;
      mesh.receiveShadow = first.receiveShadow;
      for (const m of list) parent.remove(m);
      parent.add(mesh);
    }
  }
}
