import * as THREE from 'three';
import type { Fx } from '../../game/types';
import type { ESkill } from '../../domain/data';
import { createFresnelMaterial } from '../shaders/fresnel-shader';
import { createWaterShaderMaterial } from '../shaders/water-shader';
import {
  getSoftGlowTex,
  getShockwaveRingTex,
  getSlashArcTex,
  getFlameWispTex,
  getSmokePuffTex,
  getAirStreakTex,
  getSparkStarTex,
  getWaterSplashTex,
  getDongSonMandalaTex,
  getSpiritPetalTex,
  getLineAimTex,
  getCircleAimTex,
} from './vfx-textures';

/**
 * HỆ THỐNG HIỆU ỨNG VFX KỸ NĂNG TƯỚNG (ESKILL FX) & VÒNG CHỈ THỊ (AIM INDICATOR).
 * Thiết kế hoàn toàn theo tiêu chuẩn game hành động/MOBA cao cấp:
 * - Chuẩn hóa hệ trục tọa độ: góc xoay face = Math.atan2(-dz, dx) khớp 100% với hướng nhắm của người chơi.
 * - Loại bỏ các khối hộp thô ráp, thay bằng hình thể 3D thanh thoát và hiệu ứng hạt phát quang mềm.
 * - Bổ sung đầy đủ hiệu ứng cho Phù Đổng Thiên Vương (Thần Tre Giáng Thế từ trời cao).
 */

type Update = (k: number, el: number) => void;

/** Tạo vật liệu sprite phát sáng Additive blending mờ viền tự nhiên */
const spriteGlow = (map: THREE.Texture, color: number = 0xffffff, opacity = 1.0): THREE.MeshBasicMaterial =>
  new THREE.MeshBasicMaterial({
    map,
    color,
    transparent: true,
    opacity,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
  });

/** Tạo vật liệu màu đục hoặc bán trong suốt cơ bản */
const solidMat = (color: number, opacity = 1.0): THREE.MeshBasicMaterial =>
  new THREE.MeshBasicMaterial({
    color,
    transparent: opacity < 1.0,
    opacity,
    side: THREE.DoubleSide,
  });

const setOp = (m: THREE.Mesh, v: number): void => {
  if (m.material instanceof THREE.ShaderMaterial && m.material.uniforms?.uOpacity) {
    m.material.uniforms.uOpacity.value = v;
  }
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
        const mat = m.material as THREE.Material | undefined;
        if (mat) {
          mat.dispose();
        }
      });
    },
  };
}

const clamp01 = (v: number): number => Math.max(0, Math.min(1, v));

/**
 * Tạo hiệu ứng kỹ năng phụ (E) cho từng vị danh tướng Việt Nam.
 */
export function makeESkillFx(
  generalId: string,
  scene: THREE.Scene,
  x: number,
  z: number,
  dx: number,
  dz: number,
  p = 0,
): Fx | null {
  // Chuẩn hóa góc quay xung quanh trục Y sao cho trục cục bộ +X trùng chính xác hướng nhắm (dx, dz)
  const face = Math.atan2(-dz, dx);

  switch (generalId) {
    /* =========================================================================
     * TRẦN HƯNG ĐẠO: HỎA THUYỀN PHÁ TRẬN
     * Hạm đội 7 Chiến Thuyền Hồn Lửa Bạch Đằng lao qua màn sương chiến trận,
     * thân thuyền chiến 3D sắc sảo mang dáng rồng, buồm lửa cuộn trào,
     * ngọn lửa bập bùng, bọt sóng xé nước, nổ tung hoành tráng!
     * ========================================================================= */
    case 'tran_hung_dao':
      return make(scene, 1.9, (g) => {
        g.position.set(x, 0, z);
        g.rotation.y = face;

        const glowTex = getSoftGlowTex();
        const shockTex = getShockwaveRingTex();
        const flameTex = getFlameWispTex();
        const smokeTex = getSmokePuffTex();
        const splashTex = getWaterSplashTex();
        const starTex = getSparkStarTex();

        // 1. Màn sương khói Bạch Đằng phủ mờ mặt trận lúc xuất trận
        const mistPlanes: { m: THREE.Mesh; vx: number; vz: number }[] = [];
        for (let i = 0; i < 16; i++) {
          const s = 3.5 + Math.random() * 2.5;
          const pMesh = flat(mesh(new THREE.PlaneGeometry(s, s), spriteGlow(smokeTex, 0xc8e6c9, 0.28)));
          pMesh.position.set(Math.random() * 8, 0.25 + Math.random() * 0.4, (Math.random() - 0.5) * 6);
          g.add(pMesh);
          mistPlanes.push({ m: pMesh, vx: 2 + Math.random() * 3, vz: (Math.random() - 0.5) * 2 });
        }

        // 2. Dải lửa nung chảy mặt đất phía sau hạm đội (Magma fire trail)
        const fireTrail = flat(mesh(new THREE.PlaneGeometry(24, 4.2), spriteGlow(shockTex, 0xff3b00, 0.7), 12, 0.08, 0));
        const fireCore = flat(mesh(new THREE.PlaneGeometry(24, 1.8), spriteGlow(shockTex, 0xffea00, 0.85), 12, 0.1, 0));
        g.add(fireTrail, fireCore);

        // 3. Hạm đội 7 Chiến Thuyền Hồn Lửa (Arrowhead Formation)
        interface GhostShip {
          grp: THREE.Group;
          offX: number;
          offZ: number;
          scale: number;
          flames: THREE.Mesh[];
          smoke: THREE.Mesh[];
          wakes: THREE.Mesh[];
        }

        const ships: GhostShip[] = [];
        const fleetLayout = [
          { offX: 0.0, offZ: 0.0, s: 1.15 },
          { offX: -3.2, offZ: -2.4, s: 0.95 },
          { offX: -3.2, offZ: 2.4, s: 0.95 },
          { offX: -6.4, offZ: -4.2, s: 0.82 },
          { offX: -6.4, offZ: 4.2, s: 0.82 },
          { offX: -9.0, offZ: -1.8, s: 0.78 },
          { offX: -9.0, offZ: 1.8, s: 0.78 },
        ];

        for (const spec of fleetLayout) {
          const sGrp = new THREE.Group();

          // Thân thuyền 3D thon gọn vuốt nhọn khí động học
          const hull = mesh(new THREE.BoxGeometry(3.2, 0.65, 1.2), solidMat(0x3e2312), 0, 0.4, 0);
          const bow = mesh(new THREE.ConeGeometry(0.68, 1.6, 4), solidMat(0x2d1808), 2.0, 0.45, 0);
          bow.rotation.z = -Math.PI / 2;
          sGrp.add(hull, bow);

          // Cánh buồm bốc lửa cuộn trào
          const sail = mesh(new THREE.PlaneGeometry(2.0, 2.4), spriteGlow(flameTex, 0xff4500, 0.92), -0.2, 1.8, 0);
          sail.rotation.y = Math.PI / 2;
          sGrp.add(sail);

          // Lưỡi lửa uốn lượn rực sáng trên thuyền
          const flames: THREE.Mesh[] = [];
          for (let f = 0; f < 5; f++) {
            const fl = mesh(new THREE.PlaneGeometry(1.4, 2.0), spriteGlow(flameTex, f % 2 === 0 ? 0xffea00 : 0xff3b00, 0.95), -1.0 + f * 0.65, 1.3, 0);
            sGrp.add(fl);
            flames.push(fl);
          }

          // Cụm khói tro tàn bốc cao
          const smoke: THREE.Mesh[] = [];
          for (let sm = 0; sm < 4; sm++) {
            const sk = mesh(new THREE.PlaneGeometry(1.8, 1.8), spriteGlow(smokeTex, 0x221a14, 0.55), -1.0 - sm * 0.6, 2.2 + sm * 0.7, 0);
            sGrp.add(sk);
            smoke.push(sk);
          }

          // Bọt sóng xé nước 2 mạn thuyền
          const wakes: THREE.Mesh[] = [];
          for (const side of [-1, 1]) {
            const wk = flat(mesh(new THREE.PlaneGeometry(2.8, 1.2), spriteGlow(splashTex, 0x7dd3fc, 0.8), 0.6, 0.12, side * 1.1));
            wk.rotation.z = side * 0.35;
            sGrp.add(wk);
            wakes.push(wk);
          }

          sGrp.scale.setScalar(spec.s);
          g.add(sGrp);
          ships.push({ grp: sGrp, offX: spec.offX, offZ: spec.offZ, scale: spec.s, flames, smoke, wakes });
        }

        // 4. Vụ nổ áp đảo mang tính sử thi ở đích đến (Terminal Supernova Blast)
        const blastGroup = new THREE.Group();
        blastGroup.position.set(22, 1.2, 0);

        const boomFlash = mesh(new THREE.PlaneGeometry(8, 8), spriteGlow(starTex, 0xffffff, 1.0));
        const boomRing = flat(mesh(new THREE.PlaneGeometry(9, 9), spriteGlow(shockTex, 0xff4500, 0.95)));
        const boomCore = mesh(new THREE.PlaneGeometry(5, 5), spriteGlow(glowTex, 0xffdd00, 1.0));
        blastGroup.add(boomFlash, boomRing, boomCore);
        blastGroup.visible = false;
        g.add(blastGroup);

        // 25 tia tàn lửa văng tỏa ra từ vụ nổ
        const blastSparks: { m: THREE.Mesh; v: THREE.Vector3 }[] = [];
        for (let sp = 0; sp < 25; sp++) {
          const spk = mesh(new THREE.PlaneGeometry(0.5, 0.5), spriteGlow(glowTex, sp % 2 === 0 ? 0xffea00 : 0xff3b00, 1.0));
          spk.visible = false;
          blastGroup.add(spk);
          const ang = Math.random() * Math.PI * 2;
          const spd = 6 + Math.random() * 9;
          blastSparks.push({
            m: spk,
            v: new THREE.Vector3(Math.cos(ang) * spd, 3 + Math.random() * 6, Math.sin(ang) * spd),
          });
        }

        return (k, el) => {
          const fadeAll = clamp01((1 - k) / 0.3);

          // Cập nhật sương khói
          mistPlanes.forEach((p) => {
            p.m.position.x += p.vx * 0.02;
            p.m.position.z += p.vz * 0.01;
            setOp(p.m, 0.28 * (1 - el / 1.6));
          });

          // Cập nhật vệt lửa nung đất
          const reach = clamp01(el / 0.85);
          fireTrail.scale.x = fireCore.scale.x = reach;
          fireTrail.position.x = fireCore.position.x = 12 * reach;
          setOp(fireTrail, (0.65 + Math.sin(el * 20) * 0.15) * fadeAll);
          setOp(fireCore, (0.85 + Math.cos(el * 24) * 0.15) * fadeAll);

          // Hạm đội thuyền lao về phía trước với nhấp nhô sóng nước
          const fleetT = clamp01(el / 0.95);
          const currentX = 1 + fleetT * 22;

          for (const s of ships) {
            const posX = currentX + s.offX;
            s.grp.position.set(posX, 0.3 + Math.sin(el * 14 + s.offZ) * 0.14, s.offZ);
            s.grp.visible = posX > -1 && fleetT < 1.0;

            // Ngọn lửa uốn lượn bay về sau
            s.flames.forEach((fl, idx) => {
              const sway = Math.sin(el * 26 + idx * 4) * 0.25;
              fl.scale.set(1 + sway, 1 + sway * 1.5, 1);
              fl.rotation.z = -0.3 + sway * 0.2;
            });

            // Khói bốc cao
            s.smoke.forEach((sk) => {
              sk.position.y += 0.02;
              sk.rotation.z += 0.03;
              setOp(sk, 0.55 * (1 - fleetT));
            });

            // Bọt sóng rẽ nước
            s.wakes.forEach((wk, idx) => {
              const pulse = 1 + Math.sin(el * 20 + idx) * 0.3;
              wk.scale.set(pulse, pulse * 1.2, 1);
              setOp(wk, (0.8 + Math.sin(el * 18) * 0.2) * (1 - fleetT));
            });
          }

          // Vụ nổ đại phá ở cuối đường lao
          if (el >= 0.85) {
            blastGroup.visible = true;
            const bT = clamp01((el - 0.85) / 0.85);
            const expand = Math.sin(bT * Math.PI * 0.5) * 5.5;

            boomFlash.scale.setScalar(expand * 1.6);
            boomRing.scale.setScalar(expand * 2.2);
            boomCore.scale.setScalar(expand * 1.2);

            setOp(boomFlash, Math.max(0, 1 - bT * 2.2));
            setOp(boomRing, 0.95 * (1 - bT));
            setOp(boomCore, 0.9 * (1 - bT));

            // Tia tàn lửa văng ra
            blastSparks.forEach((spk) => {
              spk.m.visible = true;
              spk.m.position.addScaledVector(spk.v, 0.025);
              spk.v.y -= 9.8 * 0.025;
              setOp(spk.m, Math.max(0, 1 - bT * 1.4));
            });
          }
        };
      });

    /* =========================================================================
     * QUANG TRUNG: THẦN TỐC HỎA PHÁO
     * Khí thế thần tốc đại phá quân Thanh! Siêu hỏa long pháo xé toạc không gian
     * với Mach cones mờ viền, dải plasma siêu thanh và đại địa chấn bộc phát!
     * ========================================================================= */
    case 'quang_trung':
      return make(scene, 1.8, (g) => {
        g.position.set(x, 0, z);
        g.rotation.y = face;

        const glowTex = getSoftGlowTex();
        const shockTex = getShockwaveRingTex();
        const flameTex = getFlameWispTex();
        const airTex = getAirStreakTex();
        const starTex = getSparkStarTex();
        const smokeTex = getSmokePuffTex();

        // 1. Khai hỏa Thần Công chói lọi tại bệ xuất phát
        const muzzleFlash = mesh(new THREE.PlaneGeometry(4.5, 4.5), spriteGlow(starTex, 0xffffff, 1.0), 0.8, 1.4, 0);
        const muzzleRing = flat(mesh(new THREE.PlaneGeometry(3.6, 3.6), spriteGlow(shockTex, 0xffd700, 0.95), 0.5, 1.4, 0));
        g.add(muzzleFlash, muzzleRing);

        // 2. Đầu đạn Hỏa Long Thần Tốc 3D (Supersonic Plasma Comet)
        const missile = new THREE.Group();
        missile.position.set(0, 1.4, 0);

        // Lõi năng lượng và chóp nón rồng xé gió
        const core = mesh(new THREE.SphereGeometry(0.65, 12, 10), spriteGlow(glowTex, 0xffffff, 1.0));
        const headCone = mesh(new THREE.ConeGeometry(0.85, 2.4, 8), spriteGlow(flameTex, 0xff3b00, 0.95), 1.0, 0, 0);
        headCone.rotation.z = -Math.PI / 2;

        // Mắt rồng sáng rực
        const eyeL = mesh(new THREE.PlaneGeometry(0.35, 0.35), spriteGlow(starTex, 0x00ffff, 1.0), 1.2, 0.3, 0.35);
        const eyeR = mesh(new THREE.PlaneGeometry(0.35, 0.35), spriteGlow(starTex, 0x00ffff, 1.0), 1.2, 0.3, -0.35);
        missile.add(core, headCone, eyeL, eyeR);

        // Đuôi lửa plasma dài cuốn theo vận tốc
        const tail = mesh(new THREE.ConeGeometry(0.8, 4.2, 8), spriteGlow(flameTex, 0xff7700, 0.85), -2.2, 0, 0);
        tail.rotation.z = Math.PI / 2;
        missile.add(tail);

        // Vòng sóng siêu thanh Mach Cones mờ viền
        const machRings: THREE.Mesh[] = [];
        for (let m = 0; m < 4; m++) {
          const mr = mesh(new THREE.TorusGeometry(0.7 + m * 0.35, 0.05, 8, 32), spriteGlow(shockTex, 0xffe040, 0.85), -0.6 - m * 0.9, 0, 0);
          mr.rotation.y = Math.PI / 2;
          missile.add(mr);
          machRings.push(mr);
        }
        g.add(missile);

        // 3. Vệt nung chảy mặt đất phía sau (Scorched ground trail)
        const groundScorch = flat(mesh(new THREE.PlaneGeometry(20, 2.6), spriteGlow(shockTex, 0xff3b00, 0.7), 10, 0.08, 0));
        const groundCore = flat(mesh(new THREE.PlaneGeometry(20, 1.0), spriteGlow(shockTex, 0xffea00, 0.85), 10, 0.1, 0));
        g.add(groundScorch, groundCore);

        // 4. Các luồng khí nén siêu thanh xé không gian
        const speedStreaks: THREE.Mesh[] = [];
        for (let s = 0; s < 14; s++) {
          const str = mesh(new THREE.PlaneGeometry(3.5, 0.6), spriteGlow(airTex, s % 2 === 0 ? 0xfff080 : 0xff3b00, 0.9));
          str.position.set(Math.random() * 18, 0.6 + Math.random() * 1.6, (Math.random() - 0.5) * 3.5);
          g.add(str);
          speedStreaks.push(str);
        }

        // 5. Vụ nổ chấn thiên động địa cuối đường đạn (x = 20)
        const blastGroup = new THREE.Group();
        blastGroup.position.set(20, 1.4, 0);

        const boomStar = mesh(new THREE.PlaneGeometry(9, 9), spriteGlow(starTex, 0xffffff, 1.0));
        const boomRing1 = flat(mesh(new THREE.PlaneGeometry(10, 10), spriteGlow(shockTex, 0xff3b00, 0.95)));
        const boomRing2 = flat(mesh(new THREE.PlaneGeometry(7, 7), spriteGlow(shockTex, 0xffea00, 0.9)));
        const boomSmoke = mesh(new THREE.PlaneGeometry(6, 6), spriteGlow(smokeTex, 0xff5500, 0.8));

        blastGroup.add(boomStar, boomRing1, boomRing2, boomSmoke);
        blastGroup.visible = false;
        g.add(blastGroup);

        return (k, el) => {
          const fadeAll = clamp01((1 - k) / 0.3);

          // Hoạt ảnh nòng pháo khai hỏa (0..0.22s)
          if (el < 0.22) {
            const mScale = 1 + el * 12;
            muzzleFlash.scale.setScalar(mScale);
            muzzleRing.scale.setScalar(mScale * 1.2);
            setOp(muzzleFlash, (1 - el / 0.22) * 1.0);
            setOp(muzzleRing, (1 - el / 0.22) * 0.95);
          } else {
            muzzleFlash.visible = muzzleRing.visible = false;
          }

          // Tốc độ thần tốc: viên đạn bay 20m chỉ trong 0.34s!
          const travelT = clamp01(el / 0.34);
          const curX = travelT * 20;

          if (travelT < 1.0) {
            missile.visible = true;
            missile.position.x = curX;
            machRings.forEach((mr, idx) => {
              mr.scale.setScalar(1 + Math.sin(el * 40 + idx) * 0.25);
            });
          } else {
            missile.visible = false;
          }

          // Vệt nung chảy mặt đất theo sau
          groundScorch.scale.x = groundCore.scale.x = travelT;
          groundScorch.position.x = groundCore.position.x = 10 * travelT;
          setOp(groundScorch, 0.7 * fadeAll);
          setOp(groundCore, 0.85 * fadeAll);

          // Vệt xé gió
          speedStreaks.forEach((str, idx) => {
            const shift = (el * 35 + idx * 2.5) % 20;
            str.position.x = shift;
            setOp(str, 0.9 * (1 - travelT * 0.4) * fadeAll);
          });

          // Bộc phát đại nổ khi đạn chạm đích
          if (el >= 0.34) {
            blastGroup.visible = true;
            const bT = clamp01((el - 0.34) / 0.7);
            const expand = Math.sin(bT * Math.PI * 0.55) * 5.0;

            boomStar.scale.setScalar(expand * 1.5);
            boomRing1.scale.setScalar(expand * 2.4);
            boomRing2.scale.setScalar(expand * 1.8);
            boomSmoke.scale.setScalar(expand * 1.4);
            boomSmoke.position.y = 1.4 + bT * 2.5;

            setOp(boomStar, Math.max(0, 1 - bT * 1.8));
            setOp(boomRing1, 0.95 * (1 - bT));
            setOp(boomRing2, 0.9 * (1 - bT));
            setOp(boomSmoke, 0.8 * (1 - bT));
          }
        };
      });

    /* =========================================================================
     * LÊ LỢI: HỘ THỂ KIM CƯƠNG
     * Mở rộng bán kính 3.5m, tồn tại 6 giây.
     * Trận pháp Trống Đồng Đông Sơn, Hoàng Long Lam Sơn uốn lượn 360 độ,
     * màng cầu năng lượng Fresnel viền sáng rực rỡ, hoa sen vàng bay bổng.
     * ========================================================================= */
    case 'le_loi':
      return make(scene, 6.0, (g) => {
        g.position.set(x, 0, z);

        const R_BARRIER = 3.5;
        const dongSonTex = getDongSonMandalaTex();
        const shockTex = getShockwaveRingTex();
        const starTex = getSparkStarTex();
        const petalTex = getSpiritPetalTex();
        const airTex = getAirStreakTex();

        // 1. Trận pháp Trống Đồng Đông Sơn linh thiêng dưới chân
        const sealFloor = flat(mesh(new THREE.PlaneGeometry(R_BARRIER * 2.2, R_BARRIER * 2.2), spriteGlow(dongSonTex, 0xffd700, 0.85), 0, 0.1, 0));
        const sealRingGlow = flat(mesh(new THREE.PlaneGeometry(R_BARRIER * 2.3, R_BARRIER * 2.3), spriteGlow(shockTex, 0xffea00, 0.75), 0, 0.12, 0));
        g.add(sealFloor, sealRingGlow);

        // 2. Vòm cầu Hộ Thể Kim Cương với Shader Fresnel phát quang viền theo góc nhìn
        const domeMat = createFresnelMaterial({
          baseColor: 0xffd700,
          rimColor: 0xffffff,
          power: 2.2,
          intensity: 2.5,
          opacity: 0.75,
        });
        const dome = mesh(new THREE.SphereGeometry(R_BARRIER, 32, 24), domeMat, 0, 1.3, 0);
        g.add(dome);

        // 3. Ba vành đai thiên thể hoàng kim xoay 3 trục (Orbital Energy Rings)
        const ringOrbits: THREE.Mesh[] = [];
        const ringTilts = [
          new THREE.Euler(Math.PI / 4, 0, 0),
          new THREE.Euler(-Math.PI / 4, Math.PI / 3, 0),
          new THREE.Euler(0, -Math.PI / 3, Math.PI / 5),
        ];
        for (let r = 0; r < 3; r++) {
          const ring = mesh(new THREE.TorusGeometry(R_BARRIER * 0.98, 0.04, 8, 48), spriteGlow(shockTex, r === 0 ? 0xfff9c4 : 0xffd700, 0.85), 0, 1.3, 0);
          ring.rotation.copy(ringTilts[r]);
          g.add(ring);
          ringOrbits.push(ring);
        }

        // 4. Hoàng Long Lam Sơn (Thần Thú Kim Long uy nghi uốn lượn mềm mại quanh Lê Lợi)
        const dragonGroup = new THREE.Group();
        const dragonHead = new THREE.Group();

        // Mắt rồng đỏ ngọc phát sáng
        const eyeL = mesh(new THREE.PlaneGeometry(0.35, 0.35), spriteGlow(starTex, 0xff0044, 1.0), 0.4, 0.2, 0.25);
        const eyeR = mesh(new THREE.PlaneGeometry(0.35, 0.35), spriteGlow(starTex, 0xff0044, 1.0), 0.4, 0.2, -0.25);
        const whiskerL = mesh(new THREE.PlaneGeometry(1.6, 0.4), spriteGlow(airTex, 0xffea00, 0.95), 0.6, -0.1, 0.4);
        whiskerL.rotation.y = 0.3;
        const whiskerR = mesh(new THREE.PlaneGeometry(1.6, 0.4), spriteGlow(airTex, 0xffea00, 0.95), 0.6, -0.1, -0.4);
        whiskerR.rotation.y = -0.3;
        const headAura = mesh(new THREE.PlaneGeometry(1.8, 1.8), spriteGlow(starTex, 0xffd700, 1.0));
        dragonHead.add(eyeL, eyeR, whiskerL, whiskerR, headAura);
        dragonGroup.add(dragonHead);

        // 14 đốt thân rồng mềm mại
        const dSegments: THREE.Mesh[] = [];
        const numSegs = 14;
        for (let s = 0; s < numSegs; s++) {
          const rSeg = 1.6 * (1 - s / (numSegs + 3));
          const segMesh = mesh(new THREE.PlaneGeometry(rSeg, rSeg), spriteGlow(starTex, s % 2 === 0 ? 0xffea00 : 0xf59e0b, 0.85));
          dragonGroup.add(segMesh);
          dSegments.push(segMesh);
        }
        g.add(dragonGroup);

        // 5. Cánh hoa sen vàng & tinh thể linh thiêng bay bổng
        const motes: { m: THREE.Mesh; ang: number; h: number; spd: number }[] = [];
        for (let mt = 0; mt < 12; mt++) {
          const moteMesh = mesh(new THREE.PlaneGeometry(0.55, 0.35), spriteGlow(petalTex, 0xffea00, 0.9));
          g.add(moteMesh);
          motes.push({
            m: moteMesh,
            ang: (mt / 12) * Math.PI * 2,
            h: 0.4 + Math.random() * 2.2,
            spd: 1.0 + Math.random() * 0.8,
          });
        }

        // Cột hào quang thiên tử (God Ray)
        const godRay = mesh(new THREE.CylinderGeometry(R_BARRIER * 0.75, R_BARRIER * 0.95, 14, 20, 1, true), spriteGlow(shockTex, 0xfffde7, 0.22), 0, 7, 0);
        g.add(godRay);

        return (k, el) => {
          const fadeIn = Math.min(1, el / 0.35);
          const fadeOut = Math.min(1, (6.0 - el) / 0.5);
          const f = fadeIn * fadeOut;

          // Xoay trận pháp Trống Đồng Đông Sơn
          sealFloor.rotation.z = el * 0.35;
          sealRingGlow.rotation.z = -el * 0.25;
          setOp(sealFloor, 0.85 * f);
          setOp(sealRingGlow, (0.75 + Math.sin(el * 5) * 0.15) * f);

          // Hoạt ảnh màng cầu kim cương Fresnel
          domeMat.uniforms.uTime.value = el;
          setOp(dome, (0.72 + Math.sin(el * 4) * 0.08) * f);
          setOp(godRay, (0.22 + Math.sin(el * 3) * 0.05) * f);

          // Xoay 3 vành đai thiên thể
          ringOrbits[0].rotation.y = el * 1.8;
          ringOrbits[1].rotation.x = el * 1.5;
          ringOrbits[2].rotation.z = el * 1.6;
          ringOrbits.forEach((ro) => setOp(ro, 0.85 * f));

          // Chuyển động uốn lượn 360 độ của Hoàng Long Lam Sơn quanh Lê Lợi
          const dSpeed = 2.4;
          const dragonPath = (offset: number): THREE.Vector3 => {
            const ang = el * dSpeed - offset * 0.32;
            const dR = R_BARRIER * 0.78 + Math.sin(el * 3 + offset) * 0.28;
            const dY = 1.3 + Math.sin(ang * 2) * 1.3;
            return new THREE.Vector3(Math.cos(ang) * dR, dY, Math.sin(ang) * dR);
          };

          const hPos = dragonPath(0);
          const nextPos = dragonPath(-0.15);
          dragonHead.position.copy(hPos);
          dragonHead.lookAt(nextPos);

          dSegments.forEach((seg, i) => {
            seg.position.copy(dragonPath(i + 1));
            setOp(seg, 0.85 * f);
          });

          // Cánh hoa sen hoàng kim bay bổng
          motes.forEach((mt) => {
            mt.ang += mt.spd * 0.02;
            mt.h = (mt.h + 0.015) % 2.8;
            const rCur = R_BARRIER * 0.85;
            mt.m.position.set(Math.cos(mt.ang) * rCur, mt.h, Math.sin(mt.ang) * rCur);
            mt.m.rotation.z += 0.04;
            setOp(mt.m, 0.9 * f);
          });
        };
      });

    /* =========================================================================
     * HAI BÀ TRƯNG: CỒNG MÊ LINH
     * Tiếng cồng thiêng vang vọng non sông, sóng âm Trống Đồng lan tỏa,
     * bướm ngọc tinh linh và hoa sen ngọc bích bay bổng hồi sinh đồng đội.
     * ========================================================================= */
    case 'hai_ba_trung':
      return make(scene, 2.4, (g) => {
        g.position.set(x, 0, z);

        const dongSonTex = getDongSonMandalaTex();
        const shockTex = getShockwaveRingTex();
        const petalTex = getSpiritPetalTex();
        const starTex = getSparkStarTex();

        // 1. Sóng âm cồng thiêng Trống Đồng lan tỏa ra xa
        const soundRings: THREE.Mesh[] = [];
        for (let r = 0; r < 3; r++) {
          const sRing = flat(mesh(new THREE.PlaneGeometry(1, 1), spriteGlow(r === 0 ? dongSonTex : shockTex, 0x5aff8a, 0.9), 0, 0.1 + r * 0.02, 0));
          g.add(sRing);
          soundRings.push(sRing);
        }

        // 2. Bướm ngọc tinh linh và hoa sen xoay quanh bay lên (Double Helix)
        const spirits: { m: THREE.Mesh; ang: number; r: number; h: number; spd: number }[] = [];
        for (let i = 0; i < 14; i++) {
          const spMesh = mesh(new THREE.PlaneGeometry(0.8, 0.5), spriteGlow(petalTex, i % 2 === 0 ? 0x6ee7b7 : 0xffffff, 0.95));
          g.add(spMesh);
          spirits.push({
            m: spMesh,
            ang: (i / 14) * Math.PI * 2,
            r: 1.8 + (i % 3) * 0.6,
            h: 0.3 + (i % 4) * 0.4,
            spd: 2.8 + (i % 2) * 1.2,
          });
        }

        // 3. Ngôi sao hào quang chữa lành ở giữa
        const coreFlare = mesh(new THREE.PlaneGeometry(3.5, 3.5), spriteGlow(starTex, 0x86efac, 0.95), 0, 1.2, 0);
        g.add(coreFlare);

        return (k, el) => {
          const f = clamp01((1 - k) / 0.3);

          // Hoạt ảnh sóng âm lan toả
          soundRings.forEach((sr, idx) => {
            const rAge = el - idx * 0.28;
            if (rAge > 0) {
              sr.visible = true;
              const rT = clamp01(rAge / 1.4);
              const maxR = 12 + idx * 3;
              sr.scale.setScalar(rT * maxR);
              sr.rotation.z = el * (idx % 2 === 0 ? 0.6 : -0.6);
              setOp(sr, 0.9 * (1 - rT) * f);
            } else {
              sr.visible = false;
            }
          });

          // Bướm ngọc tinh linh xoay lượn bay lên
          spirits.forEach((sp) => {
            sp.ang += sp.spd * 0.025;
            const curY = sp.h + el * 1.4 + Math.sin(el * 5 + sp.ang) * 0.25;
            sp.m.position.set(Math.cos(sp.ang) * sp.r, curY, Math.sin(sp.ang) * sp.r);
            sp.m.rotation.z = Math.sin(el * 12) * 0.4;
            setOp(sp.m, 0.95 * f);
          });

          // Hào quang tâm
          coreFlare.scale.setScalar(1 + Math.sin(el * 8) * 0.25);
          setOp(coreFlare, (0.8 + Math.sin(el * 10) * 0.2) * f);
        };
      });

    /* =========================================================================
     * BÀ TRIỆU: CUỒNG PHONG CHƯỞNG
     * Tầm xa vượt trội lên tới 26m! Lưỡi đao phong linh hoàng kim sắc lẹm,
     * dải khí nén siêu thanh, lốc xoáy chân và tia chớp phong lôi rền vang!
     * Hướng chém bay chuẩn xác 100% theo hướng nhắm chuột!
     * ========================================================================= */
    case 'ba_trieu': {
      const chargeRatio = clamp01(p);
      const maxDist = 15 + 11 * chargeRatio; // Tầm lên tới 26m!

      return make(scene, 1.5, (g) => {
        g.position.set(x, 0.9, z);
        g.rotation.y = face;

        const slashTex = getSlashArcTex();
        const shockTex = getShockwaveRingTex();
        const airTex = getAirStreakTex();
        const starTex = getSparkStarTex();

        // 1. Vòng lốc xoáy năng lượng hoàng kim dưới chân
        const cycloneRings: THREE.Mesh[] = [];
        for (let c = 0; c < 3; c++) {
          const cyc = flat(mesh(new THREE.PlaneGeometry(2.4 + c * 0.8, 2.4 + c * 0.8), spriteGlow(shockTex, 0xfacc15, 0.85), 0, -0.7 + c * 0.25, 0));
          g.add(cyc);
          cycloneRings.push(cyc);
        }

        // 2. 7 tầng Lưỡi Đao Gió Hoàng Kim & Lục Ngọc (Crescent Wind Blades)
        // Mép lưỡi chém hướng thẳng phía trước dọc trục +X
        const windBlades: { m: THREE.Mesh; delay: number; speed: number }[] = [];
        const bladeColors = [0xffea00, 0x34d399, 0xffffff, 0xfacc15, 0x10b981, 0xfffbeb, 0xfde047];

        for (let i = 0; i < 7; i++) {
          const col = bladeColors[i];
          const m = mesh(new THREE.PlaneGeometry(6.5, 4.0), spriteGlow(slashTex, col, 0.95));
          m.rotation.x = -Math.PI / 2;
          g.add(m);
          windBlades.push({ m, delay: i * 0.055, speed: 28 + (i % 2) * 6 });
        }

        // 3. 16 luồng khí nén siêu thanh xé không gian
        const streaks: { s: THREE.Mesh; ang: number; lenMul: number; h: number }[] = [];
        for (let s = 0; s < 16; s++) {
          const str = mesh(new THREE.PlaneGeometry(4.2, 0.8), spriteGlow(airTex, s % 2 === 0 ? 0xfff59d : 0x6ee7b7, 0.9));
          const ang = ((s / 15) * 2 - 1) * 0.55;
          str.rotation.y = -ang;
          g.add(str);
          streaks.push({ s: str, ang, lenMul: 0.75 + (s % 4) * 0.08, h: ((s % 5) - 2) * 0.25 });
        }

        // 4. Tia chớp phong lôi giật trên lưỡi đao
        const lightningArcs: THREE.Mesh[] = [];
        for (let l = 0; l < 5; l++) {
          const arc = mesh(new THREE.PlaneGeometry(2.5, 1.2), spriteGlow(starTex, 0x67e8f9, 0.95));
          g.add(arc);
          lightningArcs.push(arc);
        }

        return (k, el) => {
          const fadeAll = clamp01((1 - k) / 0.35);

          // Hoạt ảnh lốc xoáy chân
          cycloneRings.forEach((cyc, idx) => {
            cyc.rotation.z = el * (16 + idx * 8);
            const cycScale = 1 + el * (3 + idx * 1.5);
            cyc.scale.setScalar(cycScale);
            setOp(cyc, Math.max(0, 0.85 * (1 - el / 0.55)));
          });

          // 7 tầng lưỡi đao bay tới 26m
          windBlades.forEach((wb) => {
            const t = (el - wb.delay) / 0.72;
            if (t > 0 && t < 1) {
              wb.m.visible = true;
              const curDist = Math.max(0.8, t * maxDist);
              wb.m.position.set(curDist, 0, 0);
              const wScale = 1 + t * 1.5;
              wb.m.scale.set(wScale, wScale, 1);
              setOp(wb.m, 0.95 * (1 - t) * fadeAll);
            } else {
              wb.m.visible = false;
            }
          });

          // Luồng khí nén
          streaks.forEach((str, idx) => {
            const t = clamp01((el - (idx % 6) * 0.04) / 0.68);
            const dist = t * maxDist * str.lenMul;
            str.s.position.set(Math.cos(str.ang) * dist, str.h, -Math.sin(str.ang) * dist);
            setOp(str.s, 0.9 * (1 - t) * fadeAll);
          });

          // Tia chớp phong lôi
          lightningArcs.forEach((la) => {
            if (Math.random() < 0.65) {
              la.visible = true;
              const lDist = clamp01(el / 0.7) * maxDist * 0.85;
              const lAng = (Math.random() - 0.5) * 0.8;
              la.position.set(Math.cos(lAng) * lDist, (Math.random() - 0.5) * 1.2, -Math.sin(lAng) * lDist);
              la.rotation.set(Math.random() * 3, Math.random() * 3, Math.random() * 3);
            } else {
              la.visible = false;
            }
          });
        };
      });
    }

    /* =========================================================================
     * NGÔ QUYỀN: BẠCH ĐẰNG THỦY TRẬN
     * Chiến thắng vang dội trên sông Bạch Đằng năm 938!
     * Đại hồng thủy cuộn trào cùng Thần Thú Thủy Long khổng lồ, bọt sóng tung tóe,
     * và 10 cọc gỗ Bạch Đằng bọc sắt nhô lên nghiêng dũng mãnh!
     * ========================================================================= */
    case 'ngo_quyen':
      return make(scene, 2.4, (g) => {
        g.position.set(x, 0, z);
        g.rotation.y = face;

        const TOTAL_LEN = 22;
        const splashTex = getWaterSplashTex();
        const shockTex = getShockwaveRingTex();
        const starTex = getSparkStarTex();

        // 1. Dòng sông Bạch Đằng chảy cuồn cuộn với Shader nước thời gian thực
        const riverMat = createWaterShaderMaterial({
          colorDeep: 0x0369a1,
          colorShallow: 0x38bdf8,
          foamColor: 0xffffff,
          speed: 4.2,
          waveFrequency: 4.8,
          opacity: 0.8,
        });
        const riverTrail = flat(mesh(new THREE.PlaneGeometry(TOTAL_LEN, 6.0, 32, 16), riverMat, TOTAL_LEN / 2, 0.1, 0));
        g.add(riverTrail);

        // Bức tường đại triều dâng cao
        const waveWall = mesh(new THREE.PlaneGeometry(6.5, 3.8), spriteGlow(splashTex, 0x0284c7, 0.75), 0, 1.8, 0);
        waveWall.rotation.y = Math.PI / 2;
        const waveFoam = mesh(new THREE.PlaneGeometry(7.0, 2.2), spriteGlow(splashTex, 0xffffff, 0.95), 0.3, 2.6, 0);
        waveFoam.rotation.y = Math.PI / 2;
        g.add(waveWall, waveFoam);

        // 2. Thần Thú Thủy Long uốn lượn theo ngọn sóng
        const dragonGroup = new THREE.Group();
        const head = new THREE.Group();

        // Mắt rồng lam ngọc phát sáng
        const eyeL = mesh(new THREE.PlaneGeometry(0.4, 0.4), spriteGlow(starTex, 0x00f5ff, 1.0), 1.0, 1.8, 0.45);
        const eyeR = mesh(new THREE.PlaneGeometry(0.4, 0.4), spriteGlow(starTex, 0x00f5ff, 1.0), 1.0, 1.8, -0.45);
        const snoutAura = mesh(new THREE.PlaneGeometry(2.4, 2.4), spriteGlow(starTex, 0x38bdf8, 0.95), 0.8, 1.6, 0);
        head.add(eyeL, eyeR, snoutAura);
        dragonGroup.add(head);

        // 12 đốt thân Thủy Long uốn lượn mềm mại
        const bodyCoils: THREE.Mesh[] = [];
        for (let b = 0; b < 12; b++) {
          const rCoil = 2.4 - b * 0.12;
          const coil = mesh(new THREE.PlaneGeometry(rCoil, rCoil), spriteGlow(shockTex, b % 2 === 0 ? 0x0284c7 : 0x38bdf8, 0.8));
          dragonGroup.add(coil);
          bodyCoils.push(coil);
        }
        g.add(dragonGroup);

        // 3. Hàng Cọc Gỗ Bạch Đằng Bọc Sắt nhô lên từ lòng sông
        interface RiverStake {
          grp: THREE.Group;
          posX: number;
          posZ: number;
          splash: THREE.Mesh;
          targetH: number;
        }

        const stakes: RiverStake[] = [];
        const stakePositions = [
          { x: 3.5, z: -1.6, h: 2.4 },
          { x: 5.5, z: 1.8, h: 2.7 },
          { x: 7.8, z: -0.6, h: 2.9 },
          { x: 9.6, z: 1.5, h: 2.5 },
          { x: 11.8, z: -2.0, h: 2.8 },
          { x: 13.5, z: 0.7, h: 3.0 },
          { x: 15.6, z: -1.4, h: 2.6 },
          { x: 17.4, z: 1.9, h: 2.8 },
          { x: 19.2, z: -0.5, h: 3.1 },
          { x: 21.0, z: 1.2, h: 2.7 },
        ];

        for (const sp of stakePositions) {
          const stGrp = new THREE.Group();
          // Thân cọc gỗ lim sẫm màu
          const wood = mesh(new THREE.CylinderGeometry(0.2, 0.28, sp.h, 7), solidMat(0x3e2312), 0, sp.h * 0.5, 0);
          // Mũi nhọn bọc sắt sáng loáng của trận Bạch Đằng
          const ironTip = mesh(new THREE.ConeGeometry(0.24, 0.9, 7), solidMat(0xd4d4d8), 0, sp.h + 0.45, 0);
          stGrp.add(wood, ironTip);

          // Cọc nghiêng góc đón thuyền giặc
          stGrp.rotation.z = -0.25;
          stGrp.rotation.x = (sp.z > 0 ? 1 : -1) * 0.12;
          stGrp.position.set(sp.x, -sp.h * 0.8, sp.z);

          // Vòng bọt nước chân cọc bắn tung tóe
          const splash = flat(mesh(new THREE.PlaneGeometry(2.2, 2.2), spriteGlow(splashTex, 0xffffff, 0.95), sp.x, 0.18, sp.z));
          splash.visible = false;
          g.add(splash);

          g.add(stGrp);
          stakes.push({ grp: stGrp, posX: sp.x, posZ: sp.z, splash, targetH: sp.h });
        }

        return (k, el) => {
          const fadeAll = clamp01((1 - k) / 0.35);

          // Sóng và Rồng nước lao từ 0 tới 22m trong 0.95s
          const waveT = clamp01(el / 0.95);
          const curX = 1 + waveT * TOTAL_LEN;

          waveWall.position.x = curX;
          waveFoam.position.x = curX + 0.2;
          setOp(waveWall, 0.75 * fadeAll);
          setOp(waveFoam, (0.85 + Math.sin(el * 24) * 0.15) * fadeAll);

          riverTrail.scale.x = waveT;
          riverTrail.position.x = (TOTAL_LEN / 2) * waveT;
          riverMat.uniforms.uTime.value = el;
          setOp(riverTrail, 0.8 * fadeAll);

          // Đầu và thân Thủy Long
          head.position.set(curX + 0.4, 0.6 + Math.sin(el * 12) * 0.45, 0);
          head.visible = waveT < 1.0;

          bodyCoils.forEach((b, i) => {
            const bx = curX - 1.2 - i * 1.3;
            const undulateY = 1.3 + Math.sin(el * 14 - i * 0.75) * 1.1;
            const undulateZ = Math.sin(el * 10 - i * 0.8) * 1.2;
            b.position.set(bx, undulateY, undulateZ);
            b.visible = bx > 0 && waveT < 1.0;
            setOp(b, 0.8 * fadeAll);
          });

          // Các cọc gỗ Bạch Đằng nhô lên khi làn sóng quét qua
          for (const st of stakes) {
            if (curX >= st.posX) {
              const riseAge = el - (st.posX / TOTAL_LEN) * 0.95;
              const rise = clamp01(riseAge / 0.22);
              st.grp.position.y = -st.targetH * (1 - rise) * 0.6;
              if (riseAge < 0.6) {
                st.splash.visible = true;
                const spScale = 1 + riseAge * 2.5;
                st.splash.scale.setScalar(spScale);
                setOp(st.splash, (1 - riseAge / 0.6) * 0.95);
              } else {
                st.splash.visible = false;
              }
            }
          }
        };
      });

    /* =========================================================================
     * NGUYỄN TRÃI: QUÂN TRUNG TỪ MỆNH
     * Ba chữ khí bay xuyên qua kẻ địch, hào khí thư pháp và ánh mực vàng linh thiêng.
     * ========================================================================= */
    case 'nguyen_trai':
      return make(scene, 1.4, (g) => {
        g.position.set(x, 1.4, z);
        g.rotation.y = face;

        const starTex = getSparkStarTex();
        const words = ['TÂM', 'CHÍ', 'CÔNG'];
        const wordMeshes: { m: THREE.Mesh; aura: THREE.Mesh; speed: number; offZ: number }[] = [];

        for (let i = 0; i < 3; i++) {
          const wGrp = new THREE.Group();
          // Chữ thư pháp phát sáng
          const txtCanvas = document.createElement('canvas');
          txtCanvas.width = 128;
          txtCanvas.height = 128;
          const tctx = txtCanvas.getContext('2d')!;
          tctx.fillStyle = '#ffd700';
          tctx.font = 'bold 72px "Cinzel", "Times New Roman", serif';
          tctx.textAlign = 'center';
          tctx.textBaseline = 'middle';
          tctx.fillText(words[i], 64, 64);
          const tTex = new THREE.CanvasTexture(txtCanvas);

          const wMesh = mesh(new THREE.PlaneGeometry(2.0, 2.0), spriteGlow(tTex, 0xffffff, 0.95));
          const auraMesh = mesh(new THREE.PlaneGeometry(3.2, 3.2), spriteGlow(starTex, 0x2dd4bf, 0.85));
          wGrp.add(auraMesh, wMesh);
          g.add(wGrp);

          wordMeshes.push({
            m: wMesh,
            aura: auraMesh,
            speed: 16 + i * 2,
            offZ: (i - 1) * 1.5,
          });
        }

        return (k, el) => {
          const f = clamp01((1 - k) / 0.3);
          wordMeshes.forEach((w, idx) => {
            w.m.parent!.position.set(el * w.speed, Math.sin(el * 6 + idx) * 0.3, w.offZ);
            setOp(w.m, 0.95 * f);
            setOp(w.aura, (0.85 + Math.sin(el * 12 + idx) * 0.15) * f);
          });
        };
      });

    /* =========================================================================
     * PHÙ ĐỔNG THIÊN VƯƠNG: THẦN TRE GIÁNG THẾ
     * Bụi Tre Ngà Thần Thánh khổng lồ từ trên trời cao giáng xuống điểm chỉ định,
     * làm rung chuyển mặt đất, sóng xung kích bộc phát, làm choáng toàn bộ kẻ địch!
     * ========================================================================= */
    case 'phu_dong':
      return make(scene, 2.5, (g) => {
        g.position.set(x, 0, z);

        const shockTex = getShockwaveRingTex();
        const starTex = getSparkStarTex();
        const smokeTex = getSmokePuffTex();
        const petalTex = getSpiritPetalTex();
        const dongSonTex = getDongSonMandalaTex();

        // 1. Trận pháp linh thiêng xuất hiện dưới đất tại điểm rơi (r = 5.0m)
        const sealFloor = flat(mesh(new THREE.PlaneGeometry(10, 10), spriteGlow(dongSonTex, 0x8ac84a, 0.85), 0, 0.1, 0));
        const sealRing = flat(mesh(new THREE.PlaneGeometry(10.5, 10.5), spriteGlow(shockTex, 0xb8e060, 0.9), 0, 0.12, 0));
        g.add(sealFloor, sealRing);

        // 2. Thần Trúc Đằng Ngà khổng lồ (Cụm 5 cây tre ngà hoàng kim - lục ngọc từ trời lao xuống)
        const bambooGroup = new THREE.Group();
        bambooGroup.position.set(0, 42, 0); // Bắt đầu ở độ cao 42m trên trời

        const greenMat = new THREE.MeshStandardMaterial({ color: 0x8ac84a, roughness: 0.5, flatShading: true });
        const goldMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.3, emissive: 0xd97706, emissiveIntensity: 0.6 });

        // Cây tre chủ ở giữa cao 14m, bán kính 0.45m
        const mainStalk = mesh(new THREE.CylinderGeometry(0.35, 0.5, 14, 8), goldMat, 0, 7, 0);
        bambooGroup.add(mainStalk);

        // 4 cây tre phụ xung quanh tạo thành bụi tre thần
        const subPositions = [
          { x: 0.8, z: 0.6, h: 11, tiltX: 0.08, tiltZ: -0.06 },
          { x: -0.8, z: 0.7, h: 12, tiltX: 0.06, tiltZ: 0.09 },
          { x: 0.7, z: -0.8, h: 10, tiltX: -0.07, tiltZ: -0.05 },
          { x: -0.7, z: -0.6, h: 11.5, tiltX: -0.08, tiltZ: 0.07 },
        ];

        for (const sp of subPositions) {
          const sub = mesh(new THREE.CylinderGeometry(0.24, 0.35, sp.h, 7), greenMat, sp.x, sp.h * 0.5, sp.z);
          sub.rotation.x = sp.tiltX;
          sub.rotation.z = sp.tiltZ;
          bambooGroup.add(sub);
        }

        // Đốt tre và cành lá tre thần
        for (let j = 1; j <= 6; j++) {
          const ringNode = mesh(new THREE.TorusGeometry(0.48, 0.06, 6, 12), greenMat, 0, j * 2.1, 0);
          ringNode.rotation.x = Math.PI / 2;
          bambooGroup.add(ringNode);
        }

        // Luồng khí bão tố bao quanh cây tre khi lao xuống
        const auraTrail = mesh(new THREE.CylinderGeometry(1.4, 0.8, 16, 12, 1, true), spriteGlow(shockTex, 0xbbf7d0, 0.45), 0, 8, 0);
        bambooGroup.add(auraTrail);
        g.add(bambooGroup);

        // 3. Vụ nổ chấn động khi tre chạm đất (t = 0.7s)
        const blastGroup = new THREE.Group();
        blastGroup.position.set(0, 0.2, 0);

        const shockwave1 = flat(mesh(new THREE.PlaneGeometry(12, 12), spriteGlow(shockTex, 0xb8e060, 0.95)));
        const shockwave2 = flat(mesh(new THREE.PlaneGeometry(15, 15), spriteGlow(shockTex, 0xffffff, 0.85)));
        const starFlash = mesh(new THREE.PlaneGeometry(8, 8), spriteGlow(starTex, 0xffffff, 1.0), 0, 1.2, 0);
        const dustSmoke = flat(mesh(new THREE.PlaneGeometry(11, 11), spriteGlow(smokeTex, 0x86efac, 0.6)));
        blastGroup.add(shockwave1, shockwave2, starFlash, dustSmoke);
        blastGroup.visible = false;
        g.add(blastGroup);

        // 16 lá tre ngà phát sáng bắn văng ra ngoài
        const leaves: { m: THREE.Mesh; v: THREE.Vector3 }[] = [];
        for (let lf = 0; lf < 16; lf++) {
          const lMesh = mesh(new THREE.PlaneGeometry(0.9, 0.35), spriteGlow(petalTex, lf % 2 === 0 ? 0xfacc15 : 0x4ade80, 0.95));
          lMesh.visible = false;
          blastGroup.add(lMesh);
          const ang = (lf / 16) * Math.PI * 2;
          const spd = 7 + Math.random() * 6;
          leaves.push({
            m: lMesh,
            v: new THREE.Vector3(Math.cos(ang) * spd, 3 + Math.random() * 4, Math.sin(ang) * spd),
          });
        }

        return (k, el) => {
          const fadeAll = clamp01((2.5 - el) / 0.5);

          // Trận pháp mặt đất xoay nhẹ
          sealFloor.rotation.z = el * 0.4;
          sealRing.rotation.z = -el * 0.3;
          setOp(sealFloor, 0.85 * fadeAll);
          setOp(sealRing, 0.9 * fadeAll);

          // Cây tre từ trời giáng xuống trong 0.7s
          if (el < 0.7) {
            const dropT = el / 0.7;
            const easeDrop = dropT * dropT * dropT;
            bambooGroup.position.y = 42 * (1 - easeDrop);
            bambooGroup.rotation.y = el * 6;
          } else {
            // Cắm chặt xuống đất, rung nhẹ sau cú va chạm
            const settleT = el - 0.7;
            const jitter = Math.exp(-settleT * 6) * Math.sin(settleT * 35) * 0.15;
            bambooGroup.position.set(jitter, 0, jitter);

            // Bộc phát vụ nổ chấn địa
            blastGroup.visible = true;
            const bT = clamp01(settleT / 0.85);
            const expand = Math.sin(bT * Math.PI * 0.5) * 1.6;

            shockwave1.scale.setScalar(expand);
            shockwave2.scale.setScalar(expand * 1.3);
            starFlash.scale.setScalar(Math.max(0.01, (1 - bT * 2) * 2.0));
            dustSmoke.scale.setScalar(expand * 1.4);

            setOp(shockwave1, 0.95 * (1 - bT));
            setOp(shockwave2, 0.85 * (1 - bT));
            setOp(starFlash, Math.max(0, 1 - bT * 2.5));
            setOp(dustSmoke, 0.6 * (1 - bT));

            // Lá tre văng ra
            leaves.forEach((lf) => {
              lf.m.visible = true;
              lf.m.position.addScaledVector(lf.v, 0.025);
              lf.v.y -= 9.8 * 0.025;
              lf.m.rotation.z += 0.15;
              setOp(lf.m, 0.95 * (1 - bT));
            });
          }
        };
      });

    /* =========================================================================
     * LÝ THƯỜNG KIỆT: THÀNH LŨY NHƯ NGUYỆT
     * Chiến lũy sông Cầu vững như bàn thạch, hào quang hộ quốc linh thiêng.
     * ========================================================================= */
    case 'ly_thuong_kiet':
      return make(scene, 5.0, (g) => {
        g.position.set(x, 0, z);

        const dongSonTex = getDongSonMandalaTex();
        const shockTex = getShockwaveRingTex();

        const field = flat(mesh(new THREE.PlaneGeometry(8, 8), spriteGlow(dongSonTex, 0xf0d070, 0.65), 0, 0.1, 0));
        const edge = flat(mesh(new THREE.PlaneGeometry(8.5, 8.5), spriteGlow(shockTex, 0xffd700, 0.9), 0, 0.12, 0));
        g.add(field, edge);

        const walls: THREE.Mesh[] = [];
        const wallMat = solidMat(0x4a4d52);
        for (let i = 0; i < 8; i++) {
          const ang = (i / 8) * Math.PI * 2;
          const w = mesh(new THREE.BoxGeometry(1.6, 2.0, 0.5), wallMat, Math.cos(ang) * 3.6, 1.0, Math.sin(ang) * 3.6);
          w.rotation.y = -ang + Math.PI / 2;
          g.add(w);
          walls.push(w);
        }

        return (k, el) => {
          const f = Math.min(1, el / 0.35) * clamp01((5.0 - el) / 0.5);
          field.rotation.z = el * 0.2;
          edge.rotation.z = -el * 0.2;
          setOp(field, 0.65 * f);
          setOp(edge, (0.9 + Math.sin(el * 4) * 0.1) * f);

          walls.forEach((w, i) => {
            const rise = clamp01((el - i * 0.03) / 0.35);
            const sink = clamp01((el - 4.5) / 0.5);
            w.position.y = 1.0 * rise - sink * 2.0;
          });
        };
      });
  }
  return null;
}

/**
 * VÒNG CHỈ THỊ KỸ NĂNG (AIM INDICATOR) KIỂU MOBA HIỆN ĐẠI.
 * Dải năng lượng mờ biên, mũi tên định hướng bay động và vòng nhắm mục tiêu Trống Đồng tinh tế!
 */
export class AimIndicator {
  private root = new THREE.Group();
  private lineMesh: THREE.Mesh;
  private rangeRing: THREE.Mesh;
  private targetDecal: THREE.Mesh;
  private coneMesh: THREE.Mesh | null = null;
  private coneKey = '';

  constructor(private scene: THREE.Scene) {
    const shockTex = getShockwaveRingTex();
    const lineAimTex = getLineAimTex();
    const circleAimTex = getCircleAimTex();

    // 1. Đường ngắm thẳng (Line indicator): Dải năng lượng mờ biên + Mũi tên chỉ hướng
    // PlaneGeometry nằm trong mặt phẳng XZ với tâm bắt đầu từ chân người chơi (Z = 0 đến Z = 1)
    const lineGeo = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2).translate(0, 0, 0.5);
    this.lineMesh = mesh(lineGeo, spriteGlow(lineAimTex, 0x38bdf8, 0.85));

    // 2. Vòng nhắm hình tròn (Circle indicator): Vòng tầm xa + Hồng tâm chỉ điểm
    this.rangeRing = flat(mesh(new THREE.PlaneGeometry(2, 2), spriteGlow(shockTex, 0x38bdf8, 0.55)));
    this.targetDecal = flat(mesh(new THREE.PlaneGeometry(2, 2), spriteGlow(circleAimTex, 0x38bdf8, 0.9)));

    for (const m of [this.lineMesh, this.rangeRing, this.targetDecal] as THREE.Object3D[]) {
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

    this.lineMesh.visible = es.aim === 'line';
    this.rangeRing.visible = this.targetDecal.visible = es.aim === 'circle';
    if (this.coneMesh) this.coneMesh.visible = es.aim === 'cone';

    if (es.aim === 'line') {
      const len = es.range;
      const width = es.size ?? 3.5;
      this.lineMesh.rotation.y = ang;
      this.lineMesh.scale.set(width, 1, len);
    } else if (es.aim === 'cone') {
      const len = es.range + (es.charge?.extra ?? 0) * charge;
      const half = es.half ?? 0.6;
      const key = `${half}`;
      if (!this.coneMesh || this.coneKey !== key) {
        if (this.coneMesh) {
          this.root.remove(this.coneMesh);
          this.coneMesh.geometry.dispose();
        }
        this.coneMesh = flat(mesh(new THREE.CircleGeometry(1, 32, -half, half * 2), spriteGlow(getShockwaveRingTex(), 0x38bdf8, 0.45)));
        this.coneMesh.position.y = 0.16;
        this.coneMesh.renderOrder = 5;
        this.root.add(this.coneMesh);
        this.coneKey = key;
      }
      this.coneMesh.quaternion.setFromEuler(new THREE.Euler(-Math.PI / 2, 0, 0)).premultiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.atan2(-dir.z, dir.x)));
      this.coneMesh.scale.set(len, len, 1);
    } else if (es.aim === 'circle') {
      const reach = Math.min(es.range, d);
      const r = es.size ?? 4;
      this.rangeRing.scale.setScalar(es.range);
      this.targetDecal.position.set(dir.x * reach, 0.16, dir.z * reach);
      this.targetDecal.scale.setScalar(r);
    }
  }

  dispose(): void {
    this.scene.remove(this.root);
  }
}
