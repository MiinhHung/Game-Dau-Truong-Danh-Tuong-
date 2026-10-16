import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { clone as cloneSkinned } from 'three/examples/jsm/utils/SkeletonUtils.js';
import type { Rig } from './models';

/**
 * Model 3D (.glb) tùy chọn cho từng tướng. Đặt file vào public/models/ và khai báo trong public/models/manifest.json:
 *   { "hai_ba_trung": { "file": "hai_ba_trung.glb", "height": 2.1, "yaw": 0 } }
 * Tướng nào chưa có model vẫn dùng hình dựng bằng khối. Model được căn lại chiều cao, đặt chân xuống sàn,
 * còn chuyển động (nhún, nghiêng, đánh) lấy từ bộ khung khối ẩn, nên không cần xương hay animation sẵn.
 */
interface Entry {
  file: string;
  /** Chiều cao mong muốn trong game, mặc định 2,1. */
  height?: number;
  /** Góc xoay quanh trục đứng (độ) để model quay mặt về hướng +Z. */
  yaw?: number;
}

const BASE = (import.meta as unknown as { env?: { BASE_URL?: string } }).env?.BASE_URL ?? './';
const DIR = `${BASE}models/`;

let manifestP: Promise<Record<string, Entry>> | null = null;
const templates = new Map<string, Promise<THREE.Group | null>>();

function loadManifest(): Promise<Record<string, Entry>> {
  if (!manifestP) {
    manifestP = fetch(`${DIR}manifest.json`)
      .then((r) => (r.ok ? r.json() : {}))
      .then((j) => (j && typeof j === 'object' ? (j as Record<string, Entry>) : {}))
      .catch(() => ({}));
  }
  return manifestP;
}

async function loadTemplate(id: string): Promise<THREE.Group | null> {
  const entry = (await loadManifest())[id];
  if (!entry || typeof entry.file !== 'string') return null;
  try {
    const gltf = await new GLTFLoader().loadAsync(DIR + entry.file);
    const inner = gltf.scene;
    const size = new THREE.Box3().setFromObject(inner).getSize(new THREE.Vector3());
    if (size.y < 0.0001) return null;
    inner.scale.multiplyScalar((entry.height ?? 2.1) / size.y);
    const box = new THREE.Box3().setFromObject(inner);
    const c = box.getCenter(new THREE.Vector3());
    inner.position.set(-c.x, -box.min.y, -c.z);
    const wrap = new THREE.Group();
    wrap.add(inner);
    wrap.rotation.y = THREE.MathUtils.degToRad(entry.yaw ?? 0);
    const holder = new THREE.Group();
    holder.add(wrap);
    return holder;
  } catch (e) {
    console.warn(`Không nạp được model ${entry.file}:`, e);
    return null;
  }
}

/**
 * Nếu tướng có model .glb thì ẩn hình khối của rig và thay bằng model. Tay phải và chỗ cầm vũ khí vẫn giữ nguyên.
 * stillWanted cho biết rig còn được dùng không (ví dụ người dùng đã chọn tướng khác trong sảnh).
 */
export function applyAvatar(rig: Rig, generalId: string, onMaterials?: (m: THREE.MeshStandardMaterial[]) => void, stillWanted: () => boolean = () => true): void {
  let p = templates.get(generalId);
  if (!p) {
    p = loadTemplate(generalId);
    templates.set(generalId, p);
  }
  void p.then((tpl) => {
    if (!tpl || !stillWanted() || rig.avatar) return;
    const avatar = cloneSkinned(tpl) as THREE.Group;
    const mats: THREE.MeshStandardMaterial[] = [];
    avatar.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh) return;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      const clone = (m: THREE.Material): THREE.Material => {
        const c = m.clone();
        if ((c as THREE.MeshStandardMaterial).isMeshStandardMaterial) mats.push(c as THREE.MeshStandardMaterial);
        return c;
      };
      mesh.material = Array.isArray(mesh.material) ? mesh.material.map(clone) : clone(mesh.material);
    });
    rig.group.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh) return;
      for (let q: THREE.Object3D | null = mesh; q && q !== rig.group; q = q.parent) if (q === rig.hand) return;
      mesh.visible = false;
    });
    rig.group.add(avatar);
    rig.avatar = avatar;
    onMaterials?.(mats);
  });
}
