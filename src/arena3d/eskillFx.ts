import * as THREE from 'three';
import type { Fx } from './arenaTypes';

/**
 * Hiệu ứng hình ảnh riêng của kỹ năng phụ (E) cho từng tướng. Chỉ là hình ảnh:
 * sát thương và hiệu ứng trạng thái vẫn do arena.ts tính. (x, z) là tâm hiệu ứng, (dx, dz) là hướng nhắm.
 */

type Update = (k: number, el: number) => void;

const glow = (color: number, opacity = 0.8): THREE.MeshBasicMaterial =>
  new THREE.MeshBasicMaterial({ color, transparent: true, opacity, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending });

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
        const mat = m.material as THREE.Material | undefined;
        if (mat) mat.dispose();
      });
    },
  };
}

const fade = (k: number, inEnd = 0.1, outStart = 0.6): number => Math.min(1, k / inEnd) * Math.min(1, (1 - k) / (1 - outStart));

export function makeESkillFx(id: string, scene: THREE.Scene, x: number, z: number, dxRaw: number, dzRaw: number): Fx | null {
  const len = Math.hypot(dxRaw, dzRaw) || 1;
  const dx = dxRaw / len;
  const dz = dzRaw / len;
  const face = Math.atan2(-dz, dx);

  switch (id) {
    /* Hịch Tướng Sĩ: cờ lệnh cắm xuống, kiếm vàng bay vòng quanh */
    case 'tran_hung_dao':
      return make(scene, 1.8, (g) => {
        g.position.set(x, 0, z);
        const gold = glow(0xffd24a, 0.9);
        const red = new THREE.MeshBasicMaterial({ color: 0xc8281e, side: THREE.DoubleSide });
        const pole = mesh(new THREE.CylinderGeometry(0.07, 0.07, 5, 6), new THREE.MeshBasicMaterial({ color: 0x8a5a2a }), 0, 2.5, 0);
        const flag = mesh(new THREE.PlaneGeometry(2.4, 1.5, 6, 1), red, 1.3, 4.2, 0);
        const beam = mesh(new THREE.CylinderGeometry(1.1, 1.6, 9, 20, 1, true), glow(0xffd24a, 0.25), 0, 4.5, 0);
        g.add(pole, flag, beam);
        const swords: THREE.Mesh[] = [];
        for (let i = 0; i < 10; i++) {
          const s = mesh(new THREE.ConeGeometry(0.12, 1.1, 4), gold);
          swords.push(s);
          g.add(s);
        }
        return (k, el) => {
          const grow = Math.min(1, el / 0.35);
          pole.scale.y = grow;
          pole.position.y = 2.5 * grow;
          flag.scale.setScalar(grow);
          flag.position.y = 4.2 * grow;
          const pos = flag.geometry.attributes.position;
          for (let i = 0; i < pos.count; i++) pos.setZ(i, Math.sin(pos.getX(i) * 2.2 - el * 9) * 0.22 * (pos.getX(i) + 1.2) * 0.5);
          pos.needsUpdate = true;
          (beam.material as THREE.MeshBasicMaterial).opacity = 0.25 * fade(k);
          gold.opacity = 0.9 * fade(k);
          swords.forEach((s, i) => {
            const a = el * 3 + (i / swords.length) * Math.PI * 2;
            const r = 2.2 + k * 3.5;
            s.position.set(Math.cos(a) * r, 0.8 + k * 3 + Math.sin(a * 2) * 0.3, Math.sin(a) * r);
            s.rotation.z = Math.PI;
          });
        };
      });

    /* Hỏa Pháo: loạt đạn pháo bay vòng cung rồi nổ */
    case 'quang_trung':
      return make(scene, 1.4, (g) => {
        const balls: { m: THREE.Mesh; from: THREE.Vector3; to: THREE.Vector3; at: number; boom: THREE.Mesh }[] = [];
        for (let i = 0; i < 6; i++) {
          const to = new THREE.Vector3(x + dx * 6 + (Math.random() - 0.5) * 7, 0.3, z + dz * 6 + (Math.random() - 0.5) * 7);
          const m = mesh(new THREE.SphereGeometry(0.34, 8, 6), new THREE.MeshBasicMaterial({ color: 0x2a2018 }));
          const boom = mesh(new THREE.SphereGeometry(1, 12, 8), glow(0xff7a20, 0.9));
          boom.visible = false;
          m.visible = false;
          g.add(m, boom);
          balls.push({ m, boom, from: new THREE.Vector3(x + dx * 1.2, 1.6, z + dz * 1.2), to, at: i * 0.1 });
        }
        return (_k, el) => {
          for (const b of balls) {
            const p = (el - b.at) / 0.5;
            if (p < 0) continue;
            if (p < 1) {
              b.m.visible = true;
              b.m.position.lerpVectors(b.from, b.to, p);
              b.m.position.y += Math.sin(p * Math.PI) * 5;
            } else {
              b.m.visible = false;
              b.boom.visible = true;
              b.boom.position.copy(b.to);
              const q = Math.min(1, p - 1);
              b.boom.scale.setScalar(0.4 + q * 2.4);
              (b.boom.material as THREE.MeshBasicMaterial).opacity = 0.9 * (1 - q);
            }
          }
        };
      });

    /* Kim Quang Hộ Thể: vòm cầu vàng bao quanh người, lưới vòng xoay */
    case 'le_loi':
      return make(scene, 4, (g) => {
        g.position.set(x, 0, z);
        const dome = mesh(new THREE.SphereGeometry(2.6, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2), glow(0xffe08a, 0.3));
        const r1 = mesh(new THREE.TorusGeometry(2.55, 0.05, 6, 40), glow(0xfff0b0, 0.9), 0, 1.4, 0);
        const r2 = mesh(new THREE.TorusGeometry(2.0, 0.04, 6, 40), glow(0xfff0b0, 0.7), 0, 0.5, 0);
        flat(r1);
        flat(r2);
        g.add(dome, r1, r2);
        return (k, el) => {
          const f = Math.min(1, el / 0.25) * Math.min(1, (1 - k) / 0.15);
          (dome.material as THREE.MeshBasicMaterial).opacity = (0.22 + Math.sin(el * 6) * 0.07) * f;
          dome.scale.setScalar(0.4 + 0.6 * Math.min(1, el / 0.25));
          r1.position.y = 1.4 + Math.sin(el * 2) * 0.9;
          r2.position.y = 1.0 - Math.sin(el * 2) * 0.7;
          r1.rotation.z = el * 2;
          (r1.material as THREE.MeshBasicMaterial).opacity = 0.9 * f;
          (r2.material as THREE.MeshBasicMaterial).opacity = 0.7 * f;
        };
      });

    /* Cồng Mê Linh: tiếng cồng ngân thành vòng đứng, cánh hoa hồng bay lên */
    case 'hai_ba_trung':
      return make(scene, 1.8, (g) => {
        g.position.set(x, 0, z);
        const rings: THREE.Mesh[] = [];
        for (let i = 0; i < 3; i++) {
          const r = mesh(new THREE.TorusGeometry(1, 0.06, 6, 36), glow(i === 1 ? 0xffe08a : 0xf08ac0, 0.85), 0, 1.6, 0);
          g.add(r);
          rings.push(r);
        }
        const petals: { m: THREE.Mesh; a: number; r: number; s: number }[] = [];
        for (let i = 0; i < 26; i++) {
          const m = mesh(new THREE.PlaneGeometry(0.28, 0.4), glow(Math.random() < 0.5 ? 0xff9ac8 : 0xffd0e6, 0.9));
          g.add(m);
          petals.push({ m, a: Math.random() * Math.PI * 2, r: 1 + Math.random() * 9, s: 0.6 + Math.random() * 0.9 });
        }
        return (k, el) => {
          rings.forEach((r, i) => {
            const p = Math.max(0, Math.min(1, (el - i * 0.18) / 0.9));
            r.scale.setScalar(0.3 + p * 9);
            r.rotation.x = Math.PI / 2 - 0.35;
            (r.material as THREE.MeshBasicMaterial).opacity = 0.85 * (1 - p);
          });
          for (const p of petals) {
            const up = Math.min(1, el * p.s);
            p.m.position.set(Math.cos(p.a + el) * p.r, 0.3 + up * 4.5, Math.sin(p.a + el) * p.r);
            p.m.rotation.set(el * 4 + p.a, el * 3, 0);
            (p.m.material as THREE.MeshBasicMaterial).opacity = 0.9 * fade(k, 0.1, 0.5);
          }
        };
      });

    /* Cuồng Phong: hai cột lốc xoáy xanh vàng quét qua */
    case 'ba_trieu':
      return make(scene, 1.6, (g) => {
        g.position.set(x, 0, z);
        const spin = (delay: number, color: number) => {
          const tw = new THREE.Group();
          const layers: THREE.Mesh[] = [];
          for (let i = 0; i < 7; i++) {
            const m = mesh(new THREE.CylinderGeometry(0.7 + i * 0.55, 0.5 + i * 0.5, 0.7, 14, 1, true), glow(color, 0.5), 0, 0.4 + i * 0.7, 0);
            tw.add(m);
            layers.push(m);
          }
          g.add(tw);
          return { tw, layers, delay };
        };
        const tws = [spin(0, 0xf0e060), spin(0.35, 0x8ae060)];
        return (_k, el) => {
          for (const t of tws) {
            const p = Math.max(0, Math.min(1, (el - t.delay) / 0.9));
            t.tw.visible = p > 0 && p < 1;
            t.tw.scale.setScalar(0.3 + p * 1.6);
            t.layers.forEach((m, i) => {
              m.rotation.y = el * (8 - i) + i;
              (m.material as THREE.MeshBasicMaterial).opacity = 0.5 * Math.sin(Math.PI * p);
            });
          }
        };
      });

    /* Cọc Nhọn: đất nứt, cột nước phun lên cùng cọc */
    case 'ngo_quyen':
      return make(scene, 1.3, (g) => {
        g.position.set(x, 0, z);
        const crack = flat(mesh(new THREE.RingGeometry(0.2, 4.6, 24), glow(0x6a4a22, 0.6), 0, 0.1, 0));
        g.add(crack);
        const jets: THREE.Mesh[] = [];
        for (let i = 0; i < 7; i++) {
          const a = (i / 7) * Math.PI * 2;
          const r = i === 0 ? 0 : 2.4;
          const j = mesh(new THREE.CylinderGeometry(0.28, 0.5, 1, 8, 1, true), glow(0x6ac0f0, 0.7), Math.cos(a) * r, 0, Math.sin(a) * r);
          g.add(j);
          jets.push(j);
        }
        return (k, el) => {
          crack.scale.setScalar(0.3 + Math.min(1, el / 0.3) * 0.7);
          (crack.material as THREE.MeshBasicMaterial).opacity = 0.6 * (1 - k);
          jets.forEach((j, i) => {
            const p = Math.max(0, Math.min(1, (el - i * 0.04) / 0.6));
            const h = Math.sin(Math.PI * p) * 6;
            j.scale.y = Math.max(0.01, h);
            j.position.y = h / 2;
            (j.material as THREE.MeshBasicMaterial).opacity = 0.7 * (1 - p);
          });
        };
      });

    /* Mưu Kế Phục Binh: trận đồ ma pháp xanh, bốn cột sáng */
    case 'nguyen_trai':
      return make(scene, 1.9, (g) => {
        g.position.set(x, 0, z);
        const c = 0x9ad0ff;
        const ring = flat(mesh(new THREE.RingGeometry(5.1, 5.5, 48), glow(c, 0.9), 0, 0.12, 0));
        const sq1 = flat(mesh(new THREE.RingGeometry(3.6, 3.85, 4), glow(c, 0.9), 0, 0.13, 0));
        const sq2 = flat(mesh(new THREE.RingGeometry(3.6, 3.85, 4), glow(0xffffff, 0.8), 0, 0.14, 0));
        sq2.rotation.z = Math.PI / 4;
        const disc = flat(mesh(new THREE.CircleGeometry(5.5, 40), glow(c, 0.18), 0, 0.1, 0));
        g.add(ring, sq1, sq2, disc);
        const pillars: THREE.Mesh[] = [];
        for (let i = 0; i < 4; i++) {
          const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
          const p = mesh(new THREE.CylinderGeometry(0.25, 0.25, 7, 8, 1, true), glow(0xd8eeff, 0.6), Math.cos(a) * 3.6, 3.5, Math.sin(a) * 3.6);
          g.add(p);
          pillars.push(p);
        }
        return (k, el) => {
          const f = fade(k, 0.12, 0.65);
          sq1.rotation.z = el * 1.6;
          sq2.rotation.z = Math.PI / 4 - el * 1.6;
          for (const m of [ring, sq1, sq2]) (m.material as THREE.MeshBasicMaterial).opacity = 0.9 * f;
          (disc.material as THREE.MeshBasicMaterial).opacity = 0.18 * f;
          pillars.forEach((p, i) => {
            const rise = Math.min(1, Math.max(0, (el - 0.15 - i * 0.08) / 0.3));
            p.scale.y = Math.max(0.01, rise);
            p.position.y = 3.5 * rise;
            (p.material as THREE.MeshBasicMaterial).opacity = 0.6 * f;
          });
        };
      });

    /* Roi Sắt Quét: nhát chém lưỡi liềm xám xanh quét một cung phía trước */
    case 'phu_dong':
      return make(scene, 0.7, (g) => {
        g.position.set(x, 1.1, z);
        const pivot = new THREE.Group();
        const arc = flat(mesh(new THREE.RingGeometry(3, 9, 36, 1, -1.2, 2.4), glow(0xb8d8a0, 0.7), 0, 0, 0));
        const edge = flat(mesh(new THREE.RingGeometry(8.4, 9.2, 36, 1, -1.2, 2.4), glow(0xffffff, 0.9), 0, 0.02, 0));
        pivot.add(arc, edge);
        g.add(pivot);
        return (k) => {
          const sweep = Math.min(1, k / 0.55);
          pivot.rotation.y = face + (1 - sweep * 2) * 1.2;
          pivot.scale.setScalar(0.5 + sweep * 0.5);
          (arc.material as THREE.MeshBasicMaterial).opacity = 0.7 * (1 - k);
          (edge.material as THREE.MeshBasicMaterial).opacity = 0.9 * (1 - k);
        };
      });

    /* Sóng Âm Đẩy Lùi: sóng xung kích hình vòm lan ra, các tia sáng bắn tỏa */
    case 'ly_thuong_kiet':
      return make(scene, 1.0, (g) => {
        g.position.set(x, 0, z);
        const shell = mesh(new THREE.SphereGeometry(1, 24, 12), glow(0xfff4c0, 0.4));
        const shell2 = mesh(new THREE.SphereGeometry(1, 24, 12), glow(0xffffff, 0.3));
        g.add(shell, shell2);
        const rays: THREE.Mesh[] = [];
        for (let i = 0; i < 14; i++) {
          const r = mesh(new THREE.BoxGeometry(2.4, 0.05, 0.16), glow(0xfff0a0, 0.9));
          r.rotation.y = (i / 14) * Math.PI * 2;
          g.add(r);
          rays.push(r);
        }
        return (k) => {
          const r1 = 0.5 + Math.sqrt(k) * 9;
          shell.scale.set(r1, r1 * 0.45, r1);
          (shell.material as THREE.MeshBasicMaterial).opacity = 0.4 * (1 - k);
          const r2 = Math.max(0.2, r1 * 0.6);
          shell2.scale.set(r2, r2 * 0.4, r2);
          (shell2.material as THREE.MeshBasicMaterial).opacity = 0.3 * (1 - k);
          rays.forEach((r, i) => {
            const a = (i / 14) * Math.PI * 2;
            const d = 1 + k * 8;
            r.position.set(Math.cos(a) * d, 0.5, -Math.sin(a) * d);
            (r.material as THREE.MeshBasicMaterial).opacity = 0.9 * (1 - k);
          });
        };
      });
  }
  return null;
}
