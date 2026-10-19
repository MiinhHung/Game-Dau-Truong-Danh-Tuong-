import * as THREE from 'three';
import { box, cone, cyl, mat, sph } from '../primitives/shapes';
import { GAME_CONSTANTS } from '../../config/game-constants';

export interface Obstacle {
  x: number;
  z: number;
  r: number;
}

export const ARENA_R = GAME_CONSTANTS.ARENA_RADIUS;

export function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function canvasTex(size: number, draw: (c: CanvasRenderingContext2D, s: number) => void, repeat = 1): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  draw(c.getContext('2d')!, size);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repeat, repeat);
  return t;
}

/** Hoa văn mặt trống đồng Đông Sơn, dùng cho sân đấu và bệ trưng bày. */
export function drumTexture(size = 512): THREE.CanvasTexture {
  return canvasTex(size, (c, s) => {
    const cx = s / 2;
    const ring = (r: number, col: string) => {
      c.fillStyle = col;
      c.beginPath();
      c.arc(cx, cx, r * s, 0, Math.PI * 2);
      c.fill();
    };
    ring(0.5, '#7a5a22');
    ring(0.47, '#c8963e');
    ring(0.4, '#8a6428');
    ring(0.38, '#b8862e');
    ring(0.3, '#8a6428');
    ring(0.28, '#c8963e');
    ring(0.17, '#8a6428');
    ring(0.15, '#b8862e');
    c.fillStyle = '#6a4a18';
    for (let i = 0; i < 48; i++) {
      const a = (i / 48) * Math.PI * 2;
      c.save();
      c.translate(cx + Math.cos(a) * 0.34 * s, cx + Math.sin(a) * 0.34 * s);
      c.rotate(a);
      c.beginPath();
      c.moveTo(0, -0.012 * s);
      c.lineTo(0.03 * s, 0);
      c.lineTo(0, 0.012 * s);
      c.fill();
      c.restore();
    }
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      c.save();
      c.translate(cx + Math.cos(a) * 0.225 * s, cx + Math.sin(a) * 0.225 * s);
      c.rotate(a + Math.PI / 2);
      c.beginPath();
      c.ellipse(0, 0, 0.014 * s, 0.04 * s, 0, 0, Math.PI * 2);
      c.fill();
      c.restore();
    }
    c.fillStyle = '#f0c870';
    c.beginPath();
    for (let i = 0; i < 28; i++) {
      const a = (i / 28) * Math.PI * 2 - Math.PI / 2;
      const r = (i % 2 === 0 ? 0.14 : 0.06) * s;
      const x = cx + Math.cos(a) * r;
      const y = cx + Math.sin(a) * r;
      if (i === 0) c.moveTo(x, y);
      else c.lineTo(x, y);
    }
    c.closePath();
    c.fill();
  });
}

export function nhaSan(): THREE.Group {
  const g = new THREE.Group();
  const wood = mat(0x7a5230);
  const dark = mat(0x4a3018);
  const thatch = mat(0xc8a050);
  for (const [x, z] of [[-1.6, -1.2], [1.6, -1.2], [-1.6, 1.2], [1.6, 1.2]]) g.add(cyl(0.14, 0.16, 1.7, dark, x, 0.85, z, 6));
  g.add(box(4.2, 0.18, 3.2, wood, 0, 1.75, 0));
  g.add(box(3.6, 1.5, 2.6, wood, 0, 2.6, 0));
  g.add(box(0.8, 1.1, 0.06, dark, 0, 2.3, 1.32));
  g.add(box(0.6, 0.5, 0.06, dark, -1.1, 2.7, 1.32));
  g.add(box(0.6, 0.5, 0.06, dark, 1.1, 2.7, 1.32));
  // Mái cong kiểu thuyền: hai mái dốc nối nhau
  const roof = new THREE.Mesh(new THREE.ConeGeometry(3.4, 2.0, 4), thatch);
  roof.position.set(0, 4.3, 0);
  roof.rotation.y = Math.PI / 4;
  roof.scale.set(1.25, 1, 0.92);
  roof.castShadow = true;
  g.add(roof);
  g.add(box(4.5, 0.12, 0.12, dark, 0, 5.15, 0));
  // Thang lên nhà
  for (let i = 0; i < 4; i++) g.add(box(0.8, 0.07, 0.2, wood, 0, 0.3 + i * 0.4, 2.0 + (3 - i) * 0.12));
  return g;
}

