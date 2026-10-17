import * as THREE from 'three';
import { cone, cyl, mat } from '../primitives/shapes';

function rng(seed: number): () => number {
  let a = (seed * 2654435761) >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

let mudTex: THREE.CanvasTexture | null = null;

/** Mặt đầm lầy: bùn xanh nâu đục, loang nước và vòng gợn. */
function mudTexture(): THREE.CanvasTexture {
  if (mudTex) return mudTex;
  const s = 256;
  const c = document.createElement('canvas');
  c.width = c.height = s;
  const x = c.getContext('2d')!;
  const g = x.createRadialGradient(s / 2, s / 2, s * 0.05, s / 2, s / 2, s / 2);
  g.addColorStop(0, 'rgba(46,52,34,1)');
  g.addColorStop(0.7, 'rgba(58,62,38,0.96)');
  g.addColorStop(1, 'rgba(70,66,40,0)');
  x.fillStyle = g;
  x.fillRect(0, 0, s, s);
  const r = rng(11);
  for (let i = 0; i < 70; i++) {
    const px = s / 2 + (r() - 0.5) * s * 0.8;
    const py = s / 2 + (r() - 0.5) * s * 0.8;
    x.fillStyle = r() > 0.5 ? 'rgba(46,110,130,0.45)' : 'rgba(30,70,50,0.5)';
    x.beginPath();
    x.ellipse(px, py, 4 + r() * 12, 3 + r() * 8, r() * 3, 0, Math.PI * 2);
    x.fill();
  }
  x.strokeStyle = 'rgba(150,200,210,0.35)';
  x.lineWidth = 1.5;
  for (const rr of [0.22, 0.34, 0.45]) {
    x.beginPath();
    x.arc(s / 2, s / 2, s * rr * 0.9, 0, Math.PI * 2);
    x.stroke();
  }
  mudTex = new THREE.CanvasTexture(c);
  mudTex.colorSpace = THREE.SRGBColorSpace;
  return mudTex;
}

export interface StakeInfo {
  obj: THREE.Group;
  h: number;
  delay: number;
}

/**
 * Đầm lầy của Ngô Quyền: mặt bùn nước và các cây cọc nhọn trồi lên.
 * Vị trí cọc sinh theo seed nên chủ phòng và bạn bè dựng giống hệt nhau mà không cần gửi qua mạng.
 */
export function buildSwamp(seed: number, radius: number): THREE.Group {
  const g = new THREE.Group();
  const rand = rng(seed);
  const disc = new THREE.Mesh(
    new THREE.CircleGeometry(radius, 56),
    new THREE.MeshStandardMaterial({ map: mudTexture(), transparent: true, depthWrite: false, roughness: 0.25, metalness: 0.15 }),
  );
  disc.rotation.x = -Math.PI / 2;
  disc.position.y = 0.08;
  g.add(disc);
  const sheen = new THREE.Mesh(
    new THREE.CircleGeometry(radius * 0.86, 48),
    new THREE.MeshBasicMaterial({ color: 0x4a9ac0, transparent: true, opacity: 0.28, depthWrite: false }),
  );
  sheen.rotation.x = -Math.PI / 2;
  sheen.position.y = 0.1;
  g.add(sheen);

  const wood = mat(0x7a5230);
  const tipM = mat(0x4e3216);
  const stakes: StakeInfo[] = [];
  const pts: [number, number][] = [];
  for (let tries = 0; tries < 400 && pts.length < 20; tries++) {
    const a = rand() * Math.PI * 2;
    const rr = 1.5 + Math.sqrt(rand()) * (radius - 2.2);
    const x = Math.cos(a) * rr;
    const z = Math.sin(a) * rr;
    if (pts.some(([px, pz]) => Math.hypot(px - x, pz - z) < 1.5)) continue;
    pts.push([x, z]);
    const h = 1.7 + rand() * 1.2;
    const st = new THREE.Group();
    st.add(cyl(0.12, 0.17, h, wood, 0, 0, 0, 6));
    st.add(cone(0.12, 0.5, tipM, 0, h / 2 + 0.22, 0, 6));
    st.add(cyl(0.19, 0.19, 0.1, tipM, 0, h * 0.12, 0, 6));
    st.rotation.set((rand() - 0.5) * 0.4, rand() * 3, (rand() - 0.5) * 0.4);
    st.position.set(x, -h, z);
    g.add(st);
    stakes.push({ obj: st, h, delay: rand() * 0.7 });
  }
  g.userData.stakes = stakes;
  g.userData.disc = disc;
  g.userData.sheen = sheen;
  return g;
}

const clamp01 = (v: number): number => Math.max(0, Math.min(1, v));

/**
 * Cập nhật hoạt ảnh: cọc trồi lên lần lượt, giật lên mỗi giây khi đâm, chìm xuống ở giây cuối.
 * age: số giây từ lúc dựng. remaining: số giây còn lại.
 */
export function animateSwamp(g: THREE.Group, age: number, remaining: number): void {
  const stakes = g.userData.stakes as StakeInfo[];
  const fade = clamp01(age / 0.4) * clamp01(remaining / 1.2);
  ((g.userData.disc as THREE.Mesh).material as THREE.MeshStandardMaterial).opacity = 0.95 * fade;
  ((g.userData.sheen as THREE.Mesh).material as THREE.MeshBasicMaterial).opacity = 0.28 * fade * (0.8 + Math.sin(age * 3) * 0.2);
  const phase = age % 1;
  const thrust = phase < 0.22 ? Math.sin((phase / 0.22) * Math.PI) * 0.55 : 0;
  const sink = clamp01(remaining / 1.0);
  for (const s of stakes) {
    const t = clamp01((age - s.delay) / 0.45);
    const rise = 1 - Math.pow(1 - t, 3) + Math.sin(t * Math.PI) * 0.12;
    const restY = s.h * 0.5 - 0.12;
    const hidden = -s.h * 0.5 - 0.6;
    s.obj.position.y = hidden + (restY - hidden) * rise * sink + (t >= 1 ? thrust * sink : 0);
  }
}
