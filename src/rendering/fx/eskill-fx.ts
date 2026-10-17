import * as THREE from 'three';
import type { Fx } from '../../game/types';
import type { ESkill } from '../../domain/data';

/**
 * Hiệu ứng hình ảnh của kỹ năng phụ (E) cho từng tướng và vòng nhắm kiểu MOBA.
 * Chỉ là hình ảnh: sát thương và trạng thái do arena.ts tính.
 * (x, z) là tâm hiệu ứng, (dx, dz) là hướng nhắm, p là tham số phụ (tụ lực...).
 */

type Update = (k: number, el: number) => void;

const glow = (color: number, opacity = 0.8): THREE.MeshBasicMaterial =>
  new THREE.MeshBasicMaterial({ color, transparent: true, opacity, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending });

const solid = (color: number): THREE.MeshBasicMaterial => new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide });

const setOp = (m: THREE.Mesh, v: number): void => {
  (m.material as THREE.MeshBasicMaterial).opacity = v;
};

function mesh(geo: THREE.BufferGeometry, mat: THREE.Material, x = 0, y = 0, z = 0): THREE.Mesh {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  m.castShadow = false;
  return m;
}

const flat = (m: THREE.Mesh): THREE.Mesh => {
  m.rotation.x = -Math.PI / 2;
  return m;
};

/** Dựng một hiệu ứng: nội dung nằm trong group, hàm update chạy mỗi khung, group tự dọn khi hết giờ. */
function make(scene: THREE.Scene, dur: number, build: (g: THREE.Group) => Update): Fx {
  const g = new THREE.Group();
  scene.add(g);
  const update = build(g);
  return {
    t: 0,
    dur,
    update: (k) => update(k, k * dur),
    end: () => {
      scene.remove(g);
      g.traverse((o) => {
        const m = o as THREE.Mesh;
        if (m.geometry) m.geometry.dispose();
        const mat = m.material as THREE.MeshBasicMaterial | undefined;
        if (mat) {
          mat.map?.dispose();
          mat.dispose();
        }
      });
    },
  };
}

const fade = (k: number, inEnd = 0.1, outStart = 0.6): number => Math.min(1, k / inEnd) * Math.min(1, (1 - k) / (1 - outStart));
const clamp01 = (v: number): number => Math.max(0, Math.min(1, v));

function glyph(ch: string, color: string): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d')!;
  g.font = '700 104px "Noto Serif CJK SC", "SimSun", "MS Mincho", serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.shadowColor = color;
  g.shadowBlur = 18;
  g.fillStyle = '#ffffff';
  g.fillText(ch, 64, 70);
  g.fillStyle = color;
  g.fillText(ch, 64, 70);
  return new THREE.CanvasTexture(c);
}

export function makeESkillFx(id: string, scene: THREE.Scene, x: number, z: number, dxRaw: number, dzRaw: number, p = 0): Fx | null {
  const len = Math.hypot(dxRaw, dzRaw) || 1;
  const dx = dxRaw / len;
  const dz = dzRaw / len;
  /** Góc quay quanh trục Y để trục +x cục bộ trùng hướng nhắm (dùng cho các hình phẳng). */
  const face = Math.atan2(-dz, dx);

  switch (id) {
    /* Hỏa Thuyền Phá Trận: đội thuyền lửa lao thẳng, để lại đường lửa */
    case 'tran_hung_dao':
      return make(scene, 2.0, (g) => {
        g.position.set(x, 0, z);
        g.rotation.y = face;
        const fire = flat(mesh(new THREE.PlaneGeometry(20, 5), glow(0xff6a20, 0.5), 10, 0.1, 0));
        const core = flat(mesh(new THREE.PlaneGeometry(20, 2), glow(0xffd060, 0.6), 10, 0.12, 0));
        g.add(fire, core);
        const boats: { b: THREE.Group; off: number; delay: number }[] = [];
        for (let i = 0; i < 5; i++) {
          const b = new THREE.Group();
          b.add(mesh(new THREE.BoxGeometry(2.6, 0.7, 1.1), solid(0x5a3a1c), 0, 0.5, 0));
          b.add(mesh(new THREE.BoxGeometry(0.9, 0.5, 0.9), solid(0x3a2410), -1.4, 0.7, 0));
          b.add(mesh(new THREE.BoxGeometry(0.08, 2.2, 0.08), solid(0x3a2410), 0, 1.7, 0));
          b.add(mesh(new THREE.PlaneGeometry(1.5, 1.5), solid(0xc8281e), 0, 1.9, 0).rotateY(Math.PI / 2));
          b.add(mesh(new THREE.ConeGeometry(0.55, 1.6, 6), glow(0xff8a30, 0.85), 0, 2.6, 0));
          g.add(b);
          boats.push({ b, off: (i - 2) * 1.0, delay: i * 0.06 });
        }
        return (k, el) => {
          const f = clamp01((1 - k) / 0.5);
          setOp(fire, 0.5 * f * (0.8 + Math.sin(el * 30) * 0.2));
          setOp(core, 0.6 * f);
          fire.scale.x = core.scale.x = Math.min(1, el / 0.9);
          fire.position.x = core.position.x = 10 * Math.min(1, el / 0.9);
          for (const o of boats) {
            const t = clamp01((el - o.delay) / 0.9);
            o.b.position.set(1 + t * 19, Math.sin(el * 6 + o.off) * 0.12, o.off);
            o.b.visible = t < 1;
            o.b.scale.setScalar(Math.min(1, t * 8));
          }
        };
      });

    /* Hỏa Pháo: loạt đạn pháo trút xuống vùng chỉ định (x,z); dxRaw,dzRaw là vị trí nòng pháo */
    case 'quang_trung':
      return make(scene, 1.4, (g) => {
        const balls: { m: THREE.Mesh; from: THREE.Vector3; to: THREE.Vector3; at: number; boom: THREE.Mesh }[] = [];
        for (let i = 0; i < 7; i++) {
          const a = Math.random() * Math.PI * 2;
          const r = Math.sqrt(Math.random()) * 4.6;
          const to = new THREE.Vector3(x + Math.cos(a) * r, 0.3, z + Math.sin(a) * r);
          const m = mesh(new THREE.SphereGeometry(0.34, 8, 6), solid(0x2a2018));
          const boom = mesh(new THREE.SphereGeometry(1, 12, 8), glow(0xff7a20, 0.9));
          boom.visible = false;
          m.visible = false;
          g.add(m, boom);
          balls.push({ m, boom, from: new THREE.Vector3(dxRaw, 1.6, dzRaw), to, at: 0.15 + i * 0.07 });
        }
        return (_k, el) => {
          for (const b of balls) {
            const t = (el - b.at) / 0.5;
            if (t < 0) continue;
            if (t < 1) {
              b.m.visible = true;
              b.m.position.lerpVectors(b.from, b.to, t);
              b.m.position.y += Math.sin(t * Math.PI) * 9;
            } else {
              b.m.visible = false;
              b.boom.visible = true;
              b.boom.position.copy(b.to);
              const q = Math.min(1, t - 1);
              b.boom.scale.setScalar(0.4 + q * 2.6);
              setOp(b.boom, 0.9 * (1 - q));
            }
          }
        };
      });

    /* Kim Quang Hộ Thể: vòm cầu vàng bao quanh người, lưới vòng xoay */
    case 'le_loi':
      return make(scene, 4, (g) => {
        g.position.set(x, 0, z);
        const dome = mesh(new THREE.SphereGeometry(2.6, 20, 12), glow(0xffe08a, 0.3), 0, 1.2, 0);
        const r1 = flat(mesh(new THREE.TorusGeometry(2.55, 0.05, 6, 40), glow(0xfff0b0, 0.9), 0, 1.4, 0));
        const r2 = flat(mesh(new THREE.TorusGeometry(2.0, 0.04, 6, 40), glow(0xfff0b0, 0.7), 0, 0.5, 0));
        g.add(dome, r1, r2);
        return (k, el) => {
          const f = Math.min(1, el / 0.25) * Math.min(1, (1 - k) / 0.15);
          setOp(dome, (0.22 + Math.sin(el * 6) * 0.07) * f);
          dome.scale.setScalar(0.4 + 0.6 * Math.min(1, el / 0.25));
          r1.position.y = 1.4 + Math.sin(el * 2) * 0.9;
          r2.position.y = 1.0 - Math.sin(el * 2) * 0.7;
          r1.rotation.z = el * 2;
          setOp(r1, 0.9 * f);
          setOp(r2, 0.7 * f);
        };
      });

    /* Cồng Mê Linh: dấu cộng xanh lá xoay quanh người, vòng hồi máu lan ra */
    case 'hai_ba_trung':
      return make(scene, 2.2, (g) => {
        g.position.set(x, 0, z);
        const heal = flat(mesh(new THREE.RingGeometry(0.9, 1, 48), glow(0x5aff8a, 0.8), 0, 0.12, 0));
        g.add(heal);
        const pluses: { g: THREE.Group; a: number; r: number; h: number; mats: THREE.MeshBasicMaterial[] }[] = [];
        for (let i = 0; i < 9; i++) {
          const grp = new THREE.Group();
          const mat = glow(i % 3 === 0 ? 0xc8ffd8 : 0x4aff7a, 0.95);
          grp.add(mesh(new THREE.BoxGeometry(0.9, 0.28, 0.12), mat), mesh(new THREE.BoxGeometry(0.28, 0.9, 0.12), mat));
          g.add(grp);
          pluses.push({ g: grp, a: (i / 9) * Math.PI * 2, r: 1.6 + (i % 3) * 0.55, h: 0.5 + (i % 3) * 0.7, mats: [mat] });
        }
        return (k, el) => {
          const f = fade(k, 0.1, 0.6);
          const hr = 0.3 + clamp01(el / 0.9) * 10;
          heal.scale.setScalar(hr);
          setOp(heal, 0.8 * (1 - clamp01(el / 1.2)));
          for (const o of pluses) {
            const a = o.a + el * 3.2;
            o.g.position.set(Math.cos(a) * o.r, o.h + el * 0.9 + Math.sin(el * 4 + o.a) * 0.15, Math.sin(a) * o.r);
            o.g.rotation.y = -a + Math.PI / 2;
            o.mats[0].opacity = 0.95 * f;
          }
        };
      });

    /* Cuồng Phong Chưởng: các lớp gió hình quạt bay ra phía trước, p là mức tụ lực 0..1 */
    case 'ba_trieu': {
      const L = 8 + 7 * clamp01(p);
      return make(scene, 0.85, (g) => {
        g.position.set(x, 0.9, z);
        g.rotation.y = face;
        const half = 0.62;
        const layers: THREE.Mesh[] = [];
        for (let i = 0; i < 5; i++) {
          const m = flat(mesh(new THREE.RingGeometry(0.86, 1, 28, 1, -half, half * 2), glow(i % 2 ? 0xffffff : 0xa8f0b0, 0.8)));
          g.add(m);
          layers.push(m);
        }
        const streaks: THREE.Mesh[] = [];
        for (let i = 0; i < 12; i++) {
          const s = mesh(new THREE.BoxGeometry(1.6, 0.05, 0.12), glow(0xe8ffe8, 0.8));
          g.add(s);
          streaks.push(s);
        }
        return (k, el) => {
          layers.forEach((m, i) => {
            const t = clamp01((el - i * 0.07) / 0.6);
            m.scale.setScalar(Math.max(0.3, t * L));
            setOp(m, 0.8 * (1 - t) * (t > 0 ? 1 : 0));
          });
          streaks.forEach((s, i) => {
            const t = clamp01((el - (i % 4) * 0.05) / 0.6);
            const a = ((i / 12) * 2 - 1) * half * 0.9;
            const d = t * L * (0.5 + (i % 3) * 0.25);
            s.position.set(Math.cos(a) * d, (i % 3) * 0.3 - 0.3, -Math.sin(a) * d);
            s.rotation.y = a;
            setOp(s, 0.8 * (1 - t));
          });
          void k;
        };
      });
    }

    /* Thủy Long Xung Kích: rồng nước cuộn sóng lao thẳng về phía trước */
    case 'ngo_quyen':
      return make(scene, 1.5, (g) => {
        g.position.set(x, 0, z);
        g.rotation.y = face;
        const wave = mesh(new THREE.BoxGeometry(1.4, 2.6, 4.6), glow(0x4aa8f0, 0.45), 0, 1.3, 0);
        const foam = mesh(new THREE.BoxGeometry(1.7, 0.5, 4.8), glow(0xe8f8ff, 0.8), 0, 2.7, 0);
        const head = new THREE.Group();
        head.add(mesh(new THREE.ConeGeometry(0.9, 2.4, 8), glow(0x6ac8ff, 0.8), 1.2, 1.8, 0).rotateZ(-Math.PI / 2));
        for (const s of [-1, 1]) head.add(mesh(new THREE.ConeGeometry(0.15, 1.2, 5), glow(0xffffff, 0.9), 0.4, 3.0, s * 0.5));
        const body: THREE.Mesh[] = [];
        for (let i = 0; i < 12; i++) {
          const b = mesh(new THREE.SphereGeometry(0.85 - i * 0.04, 8, 6), glow(0x4aa8f0, 0.6));
          g.add(b);
          body.push(b);
        }
        const trail = flat(mesh(new THREE.PlaneGeometry(18, 4.5), glow(0x4aa8f0, 0.3), 9, 0.1, 0));
        g.add(wave, foam, head, trail);
        return (k, el) => {
          const t = clamp01(el / 0.9);
          const px = 1 + t * 17;
          const f = clamp01((1 - k) / 0.3);
          wave.position.x = foam.position.x = px;
          setOp(wave, 0.45 * f);
          setOp(foam, 0.8 * f);
          head.position.set(px, Math.sin(el * 8) * 0.3, 0);
          head.visible = t < 1;
          body.forEach((b, i) => {
            const bx = px - 1.2 - i * 1.0;
            b.position.set(bx, 1.2 + Math.sin(el * 9 - i * 0.8) * 0.9, Math.sin(el * 7 - i * 0.9) * 0.9);
            b.visible = bx > 0 && t < 1;
          });
          trail.scale.x = t;
          trail.position.x = 9 * t;
          setOp(trail, 0.3 * f);
        };
      });

    /* Quân Trung Từ Mệnh: ba chữ khí bay xuyên qua kẻ địch */
    case 'nguyen_trai':
      return make(scene, 1.3, (g) => {
        g.position.set(x, 1.4, z);
        g.rotation.y = face;
        const chars = ['檄', '書', '信'];
        const letters: { m: THREE.Mesh; at: number }[] = [];
        chars.forEach((c, i) => {
          const m = mesh(new THREE.PlaneGeometry(2.4, 2.4), new THREE.MeshBasicMaterial({ map: glyph(c, '#7ac8ff'), transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending }));
          m.rotation.y = -Math.PI / 2;
          m.visible = false;
          g.add(m);
          letters.push({ m, at: i * 0.18 });
        });
        const beam = flat(mesh(new THREE.PlaneGeometry(18, 1.2), glow(0x9ad0ff, 0.25), 9, -1.2, 0));
        g.add(beam);
        return (k, el) => {
          setOp(beam, 0.25 * clamp01((1 - k) / 0.5));
          for (const o of letters) {
            const t = clamp01((el - o.at) / 0.55);
            o.m.visible = t > 0 && t < 1;
            o.m.position.set(1 + t * 17, Math.sin(el * 12 + o.at * 9) * 0.2, 0);
            o.m.rotation.x = el * 4;
            setOp(o.m, 1 - Math.pow(t, 3));
          }
        };
      });

    /* Thần Tre Giáng Thế: cây tre khổng lồ từ trời giáng xuống điểm chỉ định */
    case 'phu_dong':
      return make(scene, 1.6, (g) => {
        g.position.set(x, 0, z);
        const zone = flat(mesh(new THREE.CircleGeometry(5, 40), glow(0x8ac84a, 0.25), 0, 0.1, 0));
        const ring = flat(mesh(new THREE.RingGeometry(4.8, 5, 48), glow(0xc8ff8a, 0.9), 0, 0.12, 0));
        const shock = flat(mesh(new THREE.RingGeometry(0.9, 1, 48), glow(0xffffff, 0.9), 0, 0.14, 0));
        const bamboo = new THREE.Group();
        const mat = solid(0x5aa83a);
        const node = solid(0x2e6a1e);
        bamboo.add(mesh(new THREE.CylinderGeometry(0.9, 1.0, 26, 10), mat, 0, 13, 0));
        for (let i = 1; i < 7; i++) bamboo.add(mesh(new THREE.CylinderGeometry(1.08, 1.08, 0.35, 10), node, 0, i * 3.6, 0));
        for (const [ly, a] of [[18, 0.5], [12, 2.6], [7, 4.4]] as const) {
          const leaf = mesh(new THREE.ConeGeometry(0.35, 3, 4), mat, Math.cos(a) * 1.8, ly, Math.sin(a) * 1.8);
          leaf.rotation.z = Math.PI / 2.4;
          leaf.rotation.y = -a;
          bamboo.add(leaf);
        }
        g.add(zone, ring, shock, bamboo);
        return (k, el) => {
          const fall = clamp01(el / 0.7);
          bamboo.position.y = 26 * (1 - fall * fall) - (el > 0.7 ? clamp01((el - 1.0) / 0.5) * 8 : 0);
          bamboo.rotation.z = (1 - fall) * 0.12;
          bamboo.visible = k < 0.98;
          const pre = clamp01((0.7 - el) / 0.7);
          setOp(zone, 0.25 * (0.5 + pre) * clamp01((1 - k) / 0.3));
          setOp(ring, 0.9 * clamp01((1 - k) / 0.3));
          const s = clamp01((el - 0.7) / 0.5);
          shock.scale.setScalar(Math.max(0.1, s * 7.5));
          setOp(shock, el > 0.7 ? 0.9 * (1 - s) : 0);
        };
      });

    /* Xây Thành Thăng Long: thành lũy đá trồi lên, cờ vàng giữa thành, giữ 5 giây */
    case 'ly_thuong_kiet':
      return make(scene, 5, (g) => {
        g.position.set(x, 0, z);
        const R = 4.5;
        const stone = solid(0x9a8a6a);
        const top = solid(0xc8a850);
        const field = flat(mesh(new THREE.CircleGeometry(R, 40), glow(0xf0d070, 0.2), 0, 0.1, 0));
        const edge = flat(mesh(new THREE.RingGeometry(R - 0.12, R, 48), glow(0xffe08a, 0.9), 0, 0.12, 0));
        g.add(field, edge);
        const walls: THREE.Group[] = [];
        const N = 12;
        for (let i = 0; i < N; i++) {
          const a = (i / N) * Math.PI * 2;
          const w = new THREE.Group();
          const tower = i % 3 === 0;
          w.add(mesh(new THREE.BoxGeometry(2.0, tower ? 3.4 : 2.2, 0.7), stone, 0, tower ? 1.7 : 1.1, 0));
          w.add(mesh(new THREE.BoxGeometry(2.2, 0.25, 0.9), top, 0, tower ? 3.5 : 2.3, 0));
          if (tower) w.add(mesh(new THREE.ConeGeometry(0.9, 1.2, 4), solid(0xb3261e), 0, 4.2, 0).rotateY(Math.PI / 4));
          w.position.set(Math.cos(a) * R, 0, Math.sin(a) * R);
          w.rotation.y = -a + Math.PI / 2;
          g.add(w);
          walls.push(w);
        }
        const flagPole = mesh(new THREE.CylinderGeometry(0.06, 0.06, 4.5, 6), solid(0x6a4a22), 0, 2.25, 0);
        const flag = mesh(new THREE.PlaneGeometry(1.8, 1.1), solid(0xffd24a), 0.95, 3.8, 0);
        g.add(flagPole, flag);
        return (k, el) => {
          walls.forEach((w, i) => {
            const rise = clamp01((el - i * 0.03) / 0.35);
            const sink = clamp01((el - 4.5) / 0.5);
            w.position.y = (-3.5 + 3.5 * rise) - sink * 3.5;
          });
          flag.position.y = 3.8 + Math.sin(el * 3) * 0.08;
          flag.scale.x = 1 + Math.sin(el * 8) * 0.08;
          const f = Math.min(1, el / 0.3) * clamp01((1 - k) / 0.1);
          setOp(field, (0.16 + Math.sin(el * 3) * 0.05) * f);
          setOp(edge, 0.9 * f);
        };
      });
  }
  return null;
}

/** Vòng nhắm kiểu MOBA: đường thẳng, hình quạt hoặc điểm rơi hình tròn. */
export class AimIndicator {
  private root = new THREE.Group();
  private line: THREE.Mesh;
  private lineEdge: THREE.Object3D;
  private cone: THREE.Mesh | null = null;
  private coneKey = '';
  private rangeRing: THREE.Mesh;
  private disc: THREE.Mesh;
  private discRing: THREE.Mesh;

  constructor(private scene: THREE.Scene) {
    const fill = (): THREE.MeshBasicMaterial => glow(0x9ad8ff, 0.22);
    const edge = (): THREE.MeshBasicMaterial => glow(0xd8f0ff, 0.9);
    // Hình chữ nhật dài 1, rộng 1, bắt đầu từ gốc, hướng +z
    const rect = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2).translate(0, 0, 0.5);
    this.line = mesh(rect, fill());
    this.lineEdge = new THREE.LineSegments(new THREE.EdgesGeometry(rect), new THREE.LineBasicMaterial({ color: 0xd8f0ff }));
    this.rangeRing = flat(mesh(new THREE.RingGeometry(0.985, 1, 64), edge()));
    this.disc = flat(mesh(new THREE.CircleGeometry(1, 40), fill()));
    this.discRing = flat(mesh(new THREE.RingGeometry(0.96, 1, 48), edge()));
    for (const m of [this.line, this.lineEdge, this.rangeRing, this.disc, this.discRing] as THREE.Object3D[]) {
      m.position.y = 0.16;
      m.renderOrder = 5;
      this.root.add(m);
    }
    this.root.visible = false;
    scene.add(this.root);
  }

  hide(): void {
    this.root.visible = false;
  }

  show(es: ESkill, pos: THREE.Vector3, aim: THREE.Vector3, charge: number): void {
    const dx = aim.x - pos.x;
    const dz = aim.z - pos.z;
    const d = Math.hypot(dx, dz) || 1;
    const dir = new THREE.Vector3(dx / d, 0, dz / d);
    const ang = Math.atan2(dir.x, dir.z);
    this.root.visible = true;
    this.root.position.set(pos.x, 0, pos.z);
    this.line.visible = this.lineEdge.visible = es.aim === 'line';
    this.rangeRing.visible = this.disc.visible = this.discRing.visible = es.aim === 'circle';
    if (this.cone) this.cone.visible = es.aim === 'cone';

    if (es.aim === 'line') {
      for (const m of [this.line, this.lineEdge] as THREE.Object3D[]) {
        m.rotation.y = ang;
        m.scale.set(es.size ?? 4, 1, es.range);
      }
    } else if (es.aim === 'cone') {
      const len = es.range + (es.charge?.extra ?? 0) * charge;
      const half = es.half ?? 0.6;
      const key = `${half}`;
      if (!this.cone || this.coneKey !== key) {
        if (this.cone) {
          this.root.remove(this.cone);
          this.cone.geometry.dispose();
        }
        this.cone = flat(mesh(new THREE.CircleGeometry(1, 32, -half, half * 2), glow(0x9ad8ff, 0.24)));
        this.cone.position.y = 0.16;
        this.cone.renderOrder = 5;
        this.root.add(this.cone);
        this.coneKey = key;
      }
      // flat() quay quanh x; muốn trục +x cục bộ hướng theo dir nên quay thêm quanh trục thế giới Y
      this.cone.quaternion.setFromEuler(new THREE.Euler(-Math.PI / 2, 0, 0)).premultiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.atan2(-dir.z, dir.x)));
      this.cone.scale.set(len, len, 1);
    } else if (es.aim === 'circle') {
      const reach = Math.min(es.range, d);
      const r = es.size ?? 4;
      this.rangeRing.scale.setScalar(es.range);
      this.disc.position.set(dir.x * reach, 0.16, dir.z * reach);
      this.discRing.position.set(dir.x * reach, 0.17, dir.z * reach);
      this.disc.scale.setScalar(r);
      this.discRing.scale.setScalar(r);
    }
  }

  dispose(): void {
    this.scene.remove(this.root);
  }
}
