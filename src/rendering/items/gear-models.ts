import * as THREE from 'three';
import { box, cone, cyl, mat, shadowed, sph } from '../primitives/shapes';
import type { Rig } from '../characters/human-model';
import type { GearSlot } from '../../domain/data';

/**
 * Tạo mô hình 3D cho 12 món trang bị trong game và gắn đồng bộ vào Rig nhân vật.
 */

/* ---------- 1. MŨ (Head gear) ---------- */

export function buildHeadGear(id: string): THREE.Group {
  const g = new THREE.Group();
  g.name = 'gear_head_' + id;

  switch (id) {
    case 'non_la': {
      // Nón Lá truyền thống hình nón đan tre
      const hatM = mat(0xd4a359, { roughness: 0.85, metalness: 0.05 });
      const rimM = mat(0x8b5a1a, { roughness: 0.9 });
      const coneMesh = cone(0.48, 0.28, hatM, 0, 0.22, 0, 16);
      g.add(coneMesh);
      // Vành nón & gân đan
      g.add(cyl(0.49, 0.49, 0.02, rimM, 0, 0.08, 0, 16));
      // Quai nón đỏ vắt qua cằm
      const strapM = mat(0xdc2626, { roughness: 0.7 });
      const strapL = box(0.02, 0.22, 0.04, strapM, -0.22, 0.0, 0);
      strapL.rotation.z = -0.15;
      const strapR = box(0.02, 0.22, 0.04, strapM, 0.22, 0.0, 0);
      strapR.rotation.z = 0.15;
      g.add(strapL, strapR);
      break;
    }

    case 'mu_dong': {
      // Mũ Giáp Đồng Đông Sơn
      const bronzeM = mat(0xb87333, { metalness: 0.75, roughness: 0.35 });
      const goldTrim = mat(0xf0d98a, { metalness: 0.85, roughness: 0.3 });
      // Thân mũ đồng che đầu
      g.add(cyl(0.28, 0.27, 0.20, bronzeM, 0, 0.18, 0, 12));
      const topDome = sph(0.26, bronzeM, 0, 0.24, 0, 1, 0.6, 1);
      g.add(topDome);
      // Vành mũ và tấm che trán
      g.add(box(0.56, 0.06, 0.14, goldTrim, 0, 0.12, 0.22));
      // Chỏm lông vũ / ngọn lửa trên đỉnh mũ
      const crest = cone(0.05, 0.34, mat(0xd97706, { emissive: 0xb45309, emissiveIntensity: 0.3 }), 0, 0.45, -0.05);
      crest.rotation.x = -0.25;
      g.add(crest);
      // Nút tai hộ vệ
      g.add(box(0.06, 0.14, 0.16, bronzeM, -0.27, 0.1, 0));
      g.add(box(0.06, 0.14, 0.16, bronzeM, 0.27, 0.1, 0));
      break;
    }

    case 'mu_rong': {
      // Mũ Rồng Vàng Hoàng Gia
      const goldM = mat(0xf59e0b, { metalness: 0.9, roughness: 0.22 });
      const rubyM = mat(0xdc2626, { emissive: 0xb91c1c, emissiveIntensity: 1.1, roughness: 0.2 });
      // Đế mũ vàng chạm khắc
      g.add(cyl(0.28, 0.27, 0.16, goldM, 0, 0.18, 0, 14));
      // 2 Sừng Rồng vươn cao sang 2 bên
      for (const s of [-1, 1]) {
        const horn = cone(0.045, 0.36, goldM, s * 0.18, 0.42, 0.02);
        horn.rotation.z = -s * 0.32;
        horn.rotation.x = 0.15;
        g.add(horn);
      }
      // Vương miện ngọn lửa giữa trán
      const crownFront = cone(0.06, 0.22, goldM, 0, 0.34, 0.22);
      g.add(crownFront);
      // Viên ngọc đỏ rực trước trán
      g.add(sph(0.065, rubyM, 0, 0.22, 0.28));
      break;
    }
  }

  return g;
}

/* ---------- 2. GIÁP (Body gear) ---------- */

export function buildBodyGear(id: string): THREE.Group {
  const g = new THREE.Group();
  g.name = 'gear_body_' + id;

  switch (id) {
    case 'ao_tu_than': {
      // Áo Tứ Thân truyền thống màu nâu gụ thắt đai đỏ
      const fabricM = mat(0x6b3a19, { roughness: 0.88 });
      const flapM = mat(0xfef3c7, { roughness: 0.8 });
      const sashM = mat(0xdc2626, { roughness: 0.6 });
      // Thân áo khoác ngoài phủ vai và ngực
      g.add(box(0.68, 0.76, 0.42, fabricM, 0, 0, 0));
      // Cổ yếm chéo ngực
      g.add(box(0.22, 0.48, 0.44, flapM, 0.06, 0.1, 0));
      // Đai lưng đỏ thắm thắt eo
      g.add(box(0.72, 0.14, 0.46, sashM, 0, -0.22, 0));
      // Vạt đai rủ xuống
      g.add(box(0.12, 0.38, 0.04, sashM, 0.12, -0.42, 0.24));
      break;
    }

    case 'giap_tre': {
      // Giáp Tre Ép nhiều lớp đan ghép chắc chắn
      const bambooM = mat(0x4d7c0f, { roughness: 0.72, metalness: 0.08 });
      const jointM = mat(0x365314, { roughness: 0.8 });
      // Giáp phiến trước ngực và sau lưng
      g.add(box(0.70, 0.76, 0.44, bambooM, 0, 0, 0));
      // Gân tre ngang gia cố
      for (let y = -0.22; y <= 0.26; y += 0.16) {
        g.add(box(0.68, 0.04, 0.46, jointM, 0, y, 0));
      }
      // Giáp hộ vai bằng ống tre chẻ
      g.add(box(0.28, 0.16, 0.32, bambooM, -0.42, 0.32, 0));
      g.add(box(0.28, 0.16, 0.32, bambooM, 0.42, 0.32, 0));
      break;
    }

    case 'giap_long': {
      // Giáp Long Lân đỏ thẫm viền vàng kim
      const dragonM = mat(0x991b1b, { metalness: 0.68, roughness: 0.28 });
      const goldTrim = mat(0xf59e0b, { metalness: 0.88, roughness: 0.22 });
      // Giáp ngực kiên cố
      g.add(box(0.72, 0.78, 0.46, dragonM, 0, 0, 0));
      // Tấm hộ tâm gương rồng tròn trước ngực
      const heartMirror = cyl(0.14, 0.14, 0.05, goldTrim, 0, 0.08, 0.24, 10);
      heartMirror.rotation.x = Math.PI / 2;
      g.add(heartMirror);
      // Ngọc tâm phát sáng
      g.add(sph(0.06, mat(0xfef08a, { emissive: 0xf59e0b, emissiveIntensity: 1.2 }), 0, 0.08, 0.27));
      // Cầu vai vảy rồng uy dũng
      for (const s of [-1, 1]) {
        const pauldron = box(0.34, 0.22, 0.38, dragonM, s * 0.44, 0.34, 0);
        pauldron.rotation.z = -s * 0.12;
        g.add(pauldron);
        g.add(box(0.36, 0.06, 0.40, goldTrim, s * 0.44, 0.38, 0));
      }
      break;
    }
  }

  return g;
}

/* ---------- 3. GIÀY (Feet gear) ---------- */

export function buildFeetGear(id: string): { left: THREE.Group; right: THREE.Group } {
  const mkFoot = (isLeft: boolean): THREE.Group => {
    const f = new THREE.Group();
    f.name = `gear_feet_${isLeft ? 'L' : 'R'}_${id}`;
    const sign = isLeft ? -1 : 1;

    switch (id) {
      case 'dep_cao_su': {
        // Dép cao su quai đỏ
        const soleM = mat(0x18181b, { roughness: 0.9 });
        const strapM = mat(0xdc2626, { roughness: 0.6 });
        // Đế dép cao su dày đen
        f.add(box(0.28, 0.08, 0.40, soleM, 0, -0.74, 0.04));
        // Quai ngang dép
        f.add(box(0.26, 0.05, 0.16, strapM, 0, -0.68, 0.06));
        // Quai kẹp ngón
        f.add(box(0.04, 0.07, 0.14, strapM, sign * 0.04, -0.68, 0.15));
        break;
      }

      case 'giay_gio': {
        // Giày Gió Tre xanh lam thanh thoát
        const shoeM = mat(0x0284c7, { roughness: 0.5, metalness: 0.2 });
        const wingM = mat(0x38bdf8, { emissive: 0x0284c7, emissiveIntensity: 0.5, roughness: 0.3 });
        // Thân ủng gió
        f.add(box(0.28, 0.16, 0.38, shoeM, 0, -0.72, 0.04));
        // Cánh lông vũ nhỏ hai bên gót giày
        const wing = box(0.04, 0.20, 0.24, wingM, sign * 0.16, -0.62, -0.08);
        wing.rotation.z = sign * 0.2;
        wing.rotation.x = -0.25;
        f.add(wing);
        break;
      }

      case 'hai_than_toc': {
        // Hài Thần Tốc dát vàng rực rỡ
        const goldM = mat(0xf59e0b, { metalness: 0.88, roughness: 0.25 });
        const sparkM = mat(0xfde047, { emissive: 0xf59e0b, emissiveIntensity: 0.9, roughness: 0.2 });
        // Thân hài hoàng gia mũi nhọn cong lên
        f.add(box(0.28, 0.18, 0.40, goldM, 0, -0.72, 0.04));
        const toe = cone(0.08, 0.18, goldM, 0, -0.68, 0.28);
        toe.rotation.x = Math.PI / 3;
        f.add(toe);
        // Cánh thần tốc phát sáng sau gót
        const wing = cone(0.07, 0.30, sparkM, sign * 0.18, -0.60, -0.16);
        wing.rotation.x = -0.55;
        wing.rotation.z = sign * 0.35;
        f.add(wing);
        break;
      }
    }

    return f;
  };

  return { left: mkFoot(true), right: mkFoot(false) };
}

/* ---------- 4. BÙA (Charm gear) ---------- */

export function buildCharmGear(id: string): THREE.Group {
  const g = new THREE.Group();
  g.name = 'gear_charm_' + id;
  g.userData.isCharm = true;

  switch (id) {
    case 'bua_may_man': {
      // Lá bùa may mắn màu đỏ son bay lơ lửng bên vai trái
      const paperM = mat(0xdc2626, { roughness: 0.55, metalness: 0.05 });
      const runeM = mat(0xfde047, { emissive: 0xf59e0b, emissiveIntensity: 0.8 });
      // Thẻ bùa bay
      const paper = box(0.20, 0.36, 0.02, paperM, -0.48, 0.38, 0.20);
      paper.rotation.y = 0.35;
      paper.rotation.z = -0.12;
      g.add(paper);
      // Họa tiết phong ấn chữ vàng
      const rune = box(0.12, 0.24, 0.03, runeM, -0.48, 0.38, 0.20);
      rune.rotation.y = 0.35;
      rune.rotation.z = -0.12;
      g.add(rune);
      // Dây chỉ đỏ và chuỗi hạt
      g.add(cyl(0.015, 0.015, 0.14, paperM, -0.48, 0.58, 0.20));
      g.add(sph(0.04, mat(0x10b981, { emissive: 0x059669, emissiveIntensity: 0.6 }), -0.48, 0.62, 0.20));
      break;
    }

    case 'trong_dong_mini': {
      // Trống đồng Mini quay nhẹ quanh nhân vật
      const bronzeM = mat(0xb87333, { metalness: 0.82, roughness: 0.32 });
      const goldM = mat(0xf59e0b, { emissive: 0xd97706, emissiveIntensity: 0.6, metalness: 0.8 });
      // Thân trống đồng
      const drum = cyl(0.16, 0.18, 0.18, bronzeM, -0.50, 0.12, 0.24, 14);
      g.add(drum);
      // Mặt trời 12 tia sáng ở mặt trên trống
      const sun = cyl(0.08, 0.08, 0.02, goldM, -0.50, 0.22, 0.24, 8);
      g.add(sun);
      // Hào quang nhẹ quanh trống
      const aura = shadowed(new THREE.Mesh(new THREE.RingGeometry(0.19, 0.22, 16), mat(0xfbbf24, { emissive: 0xf59e0b, emissiveIntensity: 1.0, side: THREE.DoubleSide })));
      aura.position.set(-0.50, 0.12, 0.24);
      aura.rotation.x = Math.PI / 2;
      g.add(aura);
      break;
    }

    case 'ngoc_rong': {
      // Ngọc Rồng lửa tỏa hào quang rực rỡ bên vai phải
      const orbM = mat(0xfbbf24, { emissive: 0xf59e0b, emissiveIntensity: 1.6, roughness: 0.15 });
      const coreM = mat(0xef4444, { emissive: 0xdc2626, emissiveIntensity: 2.2 });
      // Viên ngọc rồng lơ lửng
      g.add(sph(0.15, orbM, 0.52, 0.38, 0.22));
      g.add(sph(0.08, coreM, 0.52, 0.38, 0.22));
      // Vòng tinh tú xoay quanh ngọc rồng
      const ring = shadowed(new THREE.Mesh(new THREE.TorusGeometry(0.24, 0.02, 6, 18), mat(0xfef08a, { emissive: 0xf59e0b, emissiveIntensity: 1.2 })));
      ring.position.set(0.52, 0.38, 0.22);
      ring.rotation.x = 0.6;
      ring.rotation.y = 0.4;
      g.add(ring);
      break;
    }
  }

  return g;
}

/* ---------- 5. GẮN VÀ ĐỒNG BỘ TRANG BỊ VÀO RIG ---------- */

export function attachGearToRig(rig: Rig, equipped: Record<GearSlot, string | null>): void {
  if (!rig.gearNodes) {
    rig.gearNodes = {};
  }

  // 1. Mũ
  if (rig.gearNodes.head) {
    rig.gearNodes.head.parent?.remove(rig.gearNodes.head);
    delete rig.gearNodes.head;
  }
  if (equipped.head) {
    const headModel = buildHeadGear(equipped.head);
    rig.head.add(headModel);
    rig.gearNodes.head = headModel;
  }

  // 2. Giáp
  if (rig.gearNodes.body) {
    rig.gearNodes.body.parent?.remove(rig.gearNodes.body);
    delete rig.gearNodes.body;
  }
  if (equipped.body) {
    const bodyModel = buildBodyGear(equipped.body);
    rig.torso.add(bodyModel);
    rig.gearNodes.body = bodyModel;
  }

  // 3. Giày
  if (rig.gearNodes.feetL) {
    rig.gearNodes.feetL.parent?.remove(rig.gearNodes.feetL);
    delete rig.gearNodes.feetL;
  }
  if (rig.gearNodes.feetR) {
    rig.gearNodes.feetR.parent?.remove(rig.gearNodes.feetR);
    delete rig.gearNodes.feetR;
  }
  if (equipped.feet) {
    const { left, right } = buildFeetGear(equipped.feet);
    rig.legL.add(left);
    rig.legR.add(right);
    rig.gearNodes.feetL = left;
    rig.gearNodes.feetR = right;
  }

  // 4. Bùa
  if (rig.gearNodes.charm) {
    rig.gearNodes.charm.parent?.remove(rig.gearNodes.charm);
    delete rig.gearNodes.charm;
  }
  if (equipped.charm) {
    const charmModel = buildCharmGear(equipped.charm);
    rig.torso.add(charmModel);
    rig.gearNodes.charm = charmModel;
  }
}
