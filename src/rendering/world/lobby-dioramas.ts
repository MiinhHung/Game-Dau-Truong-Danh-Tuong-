import * as THREE from 'three';
import { box, cyl, cone, mat, sph } from '../primitives/shapes';

export interface GeneralLore {
  title: string;
  year: string;
  sub: string;
  quote: string;
  icon: string;
}

export const GENERAL_LORES: Record<string, GeneralLore> = {
  ngo_quyen: {
    title: 'Trận Bạch Đằng',
    year: 'Năm 938',
    sub: 'Chấm dứt hơn 1.000 năm Bắc thuộc • Mở nền độc lập tự chủ',
    quote: 'Chôn cọc gỗ vạt nhọn bịt sắt cắm lòng sông, thuận theo con nước thủy triều diệt sạch thủy quân Nam Hán.',
    icon: '🌊',
  },
  tran_hung_dao: {
    title: 'Bạch Đằng Giang & Hào Khí Đông A',
    year: 'Năm 1288',
    sub: 'Ba lần đại thắng Nguyên Mông • Bến Bình Than vạn thuở lưu danh',
    quote: 'Năm nay đánh giặc nhàn! Bệ hạ chém đầu tôi trước rồi hãy hàng!',
    icon: '⚔️',
  },
  quang_trung: {
    title: 'Đại Phá Quân Thanh (Ngọc Hồi - Đống Đa)',
    year: 'Kỷ Dậu 1789',
    sub: 'Hành quân thần tốc • Quét sạch 29 vạn quân Thanh trong 5 ngày đêm',
    quote: 'Đánh cho để dài tóc, đánh cho để đen răng, đánh cho sử tri nam quốc anh hùng chi hữu chủ!',
    icon: '🔥',
  },
  le_loi: {
    title: 'Khởi Nghĩa Lam Sơn & Hồ Gươm Hoàn Kiếm',
    year: '1418 - 1428',
    sub: 'Mười năm nếm mật nằm gai • Thuận Thiên Kiếm dẹp yên bờ cõi',
    quote: 'Lấy đại nghĩa để thắng hung tàn, đem chí nhân mà thay cường bạo.',
    icon: '🗡️',
  },
  hai_ba_trung: {
    title: 'Khởi Nghĩa Mê Linh',
    year: 'Năm 40 SCN',
    sub: 'Lấy lại 65 thành trì • Nền độc lập đầu tiên thời cổ',
    quote: 'Một xin rửa sạch nước thù, Hai xin đem lại nghiệp xưa họ Hùng.',
    icon: '🐘',
  },
  ba_trieu: {
    title: 'Khởi Nghĩa Cửu Chân - Núi Tùng',
    year: 'Năm 248',
    sub: 'Nữ tướng giáp vàng • Khí phách kiên trung bất khuất',
    quote: 'Tôi muốn cưỡi cơn gió mạnh, đạp luồng sóng dữ, chém cá kình ở biển Đông, giành lại giang sơn!',
    icon: '🌊',
  },
  ly_thuong_kiet: {
    title: 'Chiến Tuyến Sông Như Nguyệt',
    year: 'Năm 1077',
    sub: 'Phá Tống bình Chiêm • Bản Tuyên ngôn Độc lập đầu tiên',
    quote: 'Nam quốc sơn hà Nam đế cư, Tiệt nhiên định phận tại thiên thư!',
    icon: '📜',
  },
  nguyen_trai: {
    title: 'Côn Sơn & Bình Ngô Đại Cáo',
    year: 'Năm 1428',
    sub: 'Văn võ toàn tài • Áng thiên cổ hùng văn bất hủ',
    quote: 'Tuy mạnh yếu từng lúc khác nhau, song hào kiệt đời nào cũng có.',
    icon: '🎋',
  },
  phu_dong: {
    title: 'Đánh Giặc Ân - Đỉnh Núi Sóc Sơn',
    year: 'Thời Hùng Vương',
    sub: 'Phù Đổng Thiên Vương • Cậu bé vươn vai đánh giặc cứu nước',
    quote: 'Nhổ cả bụi tre đằng ngà quật nát giặc Ân, cởi áo giáp bay thẳng về trời!',
    icon: '⚡',
  },
};

interface DioramaTheme {
  skyColor: number;
  fogColor: number;
  fogNear: number;
  fogFar: number;
  keyLightColor: number;
  keyIntensity: number;
  rimColor: number;
  fillColor: number;
  build(): { root: THREE.Group; update?(t: number, dt: number): void; dispose?(): void };
}

interface AnimatedProp {
  group: THREE.Group;
  update(t: number, dt: number): void;
}

export class LobbyDioramaManager {
  private currentId = '';
  private currentSet: { root: THREE.Group; update?(t: number, dt: number): void; dispose?(): void } | null = null;
  private container = new THREE.Group();

  // Ánh sáng điều khiển theo bối cảnh
  private skyColor = new THREE.Color(0x140c07);
  private targetSky = new THREE.Color(0x140c07);
  private fogColor = new THREE.Color(0x140c07);
  private targetFog = new THREE.Color(0x140c07);

  public keyLight: THREE.SpotLight;
  public rimLight: THREE.PointLight;
  public fillLight: THREE.PointLight;

  constructor(private scene: THREE.Scene) {
    this.scene.add(this.container);

    this.keyLight = new THREE.SpotLight(0xffe2a0, 110, 38, 0.7, 0.45, 1.1);
    this.keyLight.position.set(3.5, 9.5, 7.5);
    this.keyLight.target.position.set(0, 1.2, 0);
    this.keyLight.castShadow = true;
    this.keyLight.shadow.mapSize.set(1024, 1024);
    this.scene.add(this.keyLight, this.keyLight.target);

    this.rimLight = new THREE.PointLight(0xff9420, 50, 24, 1.4);
    this.rimLight.position.set(-4.5, 3.8, -4.5);
    this.scene.add(this.rimLight);

    this.fillLight = new THREE.PointLight(0x40a0ff, 18, 20, 1.6);
    this.fillLight.position.set(5.5, 2.5, -3.5);
    this.scene.add(this.fillLight);
  }

  setGeneral(id: string): void {
    if (this.currentId === id) return;
    this.currentId = id;

    // Hủy diorama cũ
    if (this.currentSet) {
      this.container.remove(this.currentSet.root);
      this.currentSet.dispose?.();
      this.disposeObject(this.currentSet.root);
      this.currentSet = null;
    }

    const theme = this.getTheme(id);
    this.targetSky.setHex(theme.skyColor);
    this.targetFog.setHex(theme.fogColor);
    if (this.scene.fog instanceof THREE.Fog) {
      this.scene.fog.near = theme.fogNear;
      this.scene.fog.far = theme.fogFar;
    }

    this.keyLight.color.setHex(theme.keyLightColor);
    this.keyLight.intensity = theme.keyIntensity;
    this.rimLight.color.setHex(theme.rimColor);
    this.fillLight.color.setHex(theme.fillColor);

    this.currentSet = theme.build();
    this.container.add(this.currentSet.root);
  }

  update(t: number, dt: number): void {
    // Chuyển màu nền và sương mù mượt mà
    this.skyColor.lerp(this.targetSky, Math.min(1, dt * 3.5));
    this.fogColor.lerp(this.targetFog, Math.min(1, dt * 3.5));
    if (this.scene.background instanceof THREE.Color) {
      this.scene.background.copy(this.skyColor);
    }
    if (this.scene.fog) {
      this.scene.fog.color.copy(this.fogColor);
    }

    this.currentSet?.update?.(t, dt);
  }

  private disposeObject(obj: THREE.Object3D): void {
    obj.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        if (child.geometry) child.geometry.dispose();
        if (child.material) {
          if (Array.isArray(child.material)) {
            child.material.forEach((m) => m.dispose());
          } else {
            child.material.dispose();
          }
        }
      }
    });
  }

  private getTheme(id: string): DioramaTheme {
    switch (id) {
      case 'ngo_quyen':
        return this.buildNgoQuyenTheme();
      case 'tran_hung_dao':
        return this.buildTranHungDaoTheme();
      case 'quang_trung':
        return this.buildQuangTrungTheme();
      case 'le_loi':
        return this.buildLeLoiTheme();
      case 'hai_ba_trung':
        return this.buildHaiBaTrungTheme();
      case 'ba_trieu':
        return this.buildBaTrieuTheme();
      case 'ly_thuong_kiet':
        return this.buildLyThuongKietTheme();
      case 'nguyen_trai':
        return this.buildNguyenTraiTheme();
      case 'phu_dong':
        return this.buildPhuDongTheme();
      default:
        return this.buildNgoQuyenTheme();
    }
  }

  /* =========================================================================
     1. NGÔ QUYỀN - TRẬN THỦY CHIẾN SÔNG BẠCH ĐẰNG (NĂM 938)
     - Dòng sông Bạch Đằng rộng mở, núi đá vôi kỳ vĩ phía chân trời
     - Bãi cọc gỗ vạt nhọn bọc sắt cắm xiên
     - Chiến thuyền Đại Việt lướt sóng, chiến thuyền giặc Nam Hán gãy đôi bốc khói
     - Đoàn thủy binh Đại Việt giương giáo, vẫy cờ reo hò chiến thắng
  ========================================================================= */
  private buildNgoQuyenTheme(): DioramaTheme {
    return {
      skyColor: 0x0e1b28,
      fogColor: 0x102232,
      fogNear: 12,
      fogFar: 45,
      keyLightColor: 0x98d4ff,
      keyIntensity: 115,
      rimColor: 0x2880d8,
      fillColor: 0x184870,
      build: () => {
        const root = new THREE.Group();
        const woodMat = mat(0x422f20, { roughness: 0.9, metalness: 0.1 });
        const ironMat = mat(0x7a8a9a, { roughness: 0.4, metalness: 0.75 });
        const waterMat = new THREE.MeshStandardMaterial({
          color: 0x102e44,
          roughness: 0.22,
          metalness: 0.5,
          transparent: true,
          opacity: 0.9,
        });

        // Mặt nước sông Bạch Đằng trải rộng
        const water = new THREE.Mesh(new THREE.RingGeometry(3.6, 32, 48), waterMat);
        water.rotation.x = -Math.PI / 2;
        water.position.y = 0.22;
        water.receiveShadow = true;
        root.add(water);

        // Núi đá vôi Karst hùng vĩ (như non nước vịnh Hạ Long / sông Bạch Đằng) phía chân trời
        const mountainColor = 0x142636;
        root.add(this.createKarstMountain(-11, -16, 9.5, 3.8, mountainColor));
        root.add(this.createKarstMountain(-2, -18, 12.0, 4.6, mountainColor));
        root.add(this.createKarstMountain(9, -15, 8.5, 3.5, mountainColor));

        // Bãi cọc gỗ lim vạt nhọn bọc sắt cắm xiên
        const pileSpecs: [number, number, number, number, number][] = [
          [-3.8, -1.8, 2.9, 0.18, 0.22],
          [-4.9, 0.4, 3.4, -0.22, 0.14],
          [-3.2, 2.8, 2.6, 0.15, -0.2],
          [3.8, -1.6, 3.2, -0.2, -0.15],
          [4.8, 0.8, 3.8, 0.18, 0.18],
          [3.5, 2.6, 2.7, -0.15, 0.22],
          [-1.8, -4.5, 3.3, 0.25, 0.12],
          [1.6, -4.6, 3.5, -0.2, 0.18],
          [-2.2, 4.2, 3.1, -0.18, -0.22],
          [2.4, 4.4, 3.6, 0.22, -0.16],
          [-6.2, -3.2, 4.2, 0.3, 0.15],
          [6.5, -3.0, 4.4, -0.28, 0.18],
          [0.0, -5.8, 4.0, 0.12, 0.3],
          [-5.5, 3.5, 3.9, -0.25, -0.2],
        ];

        pileSpecs.forEach(([px, pz, h, rx, rz]) => {
          const pileGroup = new THREE.Group();
          pileGroup.position.set(px, 0, pz);
          pileGroup.rotation.x = rx;
          pileGroup.rotation.z = rz;

          const bodyH = h * 0.72;
          const trunk = cyl(0.18, 0.22, bodyH, woodMat, 0, bodyH / 2, 0, 7);
          pileGroup.add(trunk);

          const tipH = h * 0.28;
          const tip = cone(0.18, tipH, ironMat, 0, bodyH + tipH / 2, 0, 7);
          pileGroup.add(tip);

          root.add(pileGroup);
        });

        // Chiến thuyền Đại Việt cưỡi sóng lướt tới
        const boatDaiViet1 = this.createWarboat({ sailColor: 0x8a4520, flagColor: 0xb3261e, withSoldiers: true });
        boatDaiViet1.group.position.set(-7.5, 0.2, -6.5);
        boatDaiViet1.group.rotation.y = 0.45;
        root.add(boatDaiViet1.group);

        const boatDaiViet2 = this.createWarboat({ sailColor: 0x6e3818, flagColor: 0xb3261e, withSoldiers: true });
        boatDaiViet2.group.position.set(7.8, 0.2, -7.2);
        boatDaiViet2.group.rotation.y = -0.55;
        root.add(boatDaiViet2.group);

        // Chiến thuyền giặc Nam Hán bị cọc đâm vỡ toang bốc khói đen
        const wreckedBoat = this.createWreckedWarboat(0, -6.8);
        root.add(wreckedBoat.group);

        // Đội thủy binh Đại Việt đứng trên bờ / mạn thuyền giương ngọn giáo reo hò
        const animatedSoldiers: AnimatedProp[] = [];
        const soldierCoords: [number, number, number][] = [
          [-4.5, -3.0, 0.3],
          [-5.2, -2.2, 0.4],
          [-3.8, -3.8, 0.2],
          [4.6, -2.8, -0.4],
          [5.4, -2.0, -0.3],
          [3.9, -3.6, -0.5],
        ];

        soldierCoords.forEach(([sx, sz, ry], i) => {
          const s = this.createSoldier({
            tunicColor: 0x244f8a,
            hatType: i % 2 === 0 ? 'helmet' : 'conical',
            weaponType: i % 3 === 0 ? 'flag' : 'spear',
            phase: i * 0.8,
          });
          s.group.position.set(sx, 0.3, sz);
          s.group.rotation.y = ry;
          root.add(s.group);
          animatedSoldiers.push(s);
        });

        return {
          root,
          update: (t, dt) => {
            water.position.y = 0.22 + Math.sin(t * 1.8) * 0.04;
            water.rotation.z = Math.sin(t * 0.8) * 0.02;

            boatDaiViet1.update(t, dt);
            boatDaiViet2.update(t, dt);
            wreckedBoat.update(t, dt);
            animatedSoldiers.forEach((s) => s.update(t, dt));
          },
        };
      },
    };
  }

  /* =========================================================================
     2. TRẦN HƯNG ĐẠO - BẠCH ĐẰNG GIANG 1288 & HÀO KHÍ ĐÔNG A
     - Đêm rực lửa hào hùng, sông Bạch Đằng cuồn cuộn khói đuốc
     - Chiến thuyền "SÁT THÁT" cưỡi sóng xông pha
     - Đội dũng sĩ Đông A xăm chữ "Sát Thát" dàn quân vung giáo và đuốc lửa
  ========================================================================= */
  private buildTranHungDaoTheme(): DioramaTheme {
    return {
      skyColor: 0x220d07,
      fogColor: 0x240f08,
      fogNear: 10,
      fogFar: 38,
      keyLightColor: 0xffa040,
      keyIntensity: 125,
      rimColor: 0xff2814,
      fillColor: 0x8a3014,
      build: () => {
        const root = new THREE.Group();
        const darkWood = mat(0x382216);
        const ironMat = mat(0x504036, { metalness: 0.6 });
        const fireMat = mat(0xff5510, { emissive: 0xff3300, emissiveIntensity: 1.8 });

        // Mặt nước sông Bạch Đằng phản chiếu ánh lửa đỏ rực
        const waterMat = new THREE.MeshStandardMaterial({
          color: 0x1f0e08,
          roughness: 0.25,
          metalness: 0.45,
          transparent: true,
          opacity: 0.88,
        });
        const water = new THREE.Mesh(new THREE.RingGeometry(3.6, 30, 48), waterMat);
        water.rotation.x = -Math.PI / 2;
        water.position.y = 0.2;
        root.add(water);

        // Núi đá hùng vĩ ẩn hiện trong màn khói đêm
        root.add(this.createKarstMountain(-10, -17, 10.5, 4.2, 0x1c0d08));
        root.add(this.createKarstMountain(8, -16, 9.0, 3.8, 0x1c0d08));

        // Cột cờ Đại kỳ Sát Thát uy nghiêm bên trái
        const pole = cyl(0.12, 0.14, 7.8, darkWood, -5.2, 3.9, -2.8, 8);
        root.add(pole);
        const flag = box(0.05, 2.2, 3.2, mat(0xb32018, { roughness: 0.5 }), -5.2, 6.2, -1.2);
        root.add(flag);
        const emblem = box(0.08, 1.2, 1.8, mat(0xffd24a, { emissive: 0xaa7010, emissiveIntensity: 0.5 }), -5.2, 6.2, -1.2);
        root.add(emblem);

        // Chiến thuyền Đại Việt cờ thêu chữ Sát Thát
        const warboat = this.createWarboat({ sailColor: 0x8a2014, flagColor: 0xffd24a, withSoldiers: true });
        warboat.group.position.set(6.8, 0.2, -6.8);
        warboat.group.rotation.y = -0.4;
        root.add(warboat.group);

        // Đội dũng sĩ Hào khí Đông A dàn hàng ngang giương giáo và đuốc lửa
        const animatedSoldiers: AnimatedProp[] = [];
        const dongASoldiers: [number, number, number][] = [
          [-3.5, 3.2, 2.8],
          [-4.5, 2.2, 2.4],
          [-5.2, 1.0, 2.0],
          [-5.5, -0.4, 1.5],
          [3.8, 3.2, -2.8],
          [4.8, 2.2, -2.4],
          [5.5, 1.0, -2.0],
          [5.6, -0.4, -1.5],
        ];

        dongASoldiers.forEach(([sx, sz, ry], i) => {
          const s = this.createSoldier({
            tunicColor: 0xb3261e,
            hatType: 'helmet',
            weaponType: i % 2 === 0 ? 'spear' : 'torch',
            phase: i * 0.7,
          });
          s.group.position.set(sx, 0.35, sz);
          s.group.rotation.y = ry;
          root.add(s.group);
          animatedSoldiers.push(s);
        });

        // 4 Chảo lửa trận bập bùng
        const brazierLights: THREE.PointLight[] = [];
        const braziers: [number, number][] = [
          [-4.5, 2.0],
          [4.5, 2.0],
          [-3.5, -4.2],
          [3.5, -4.2],
        ];

        braziers.forEach(([bx, bz]) => {
          const bGroup = new THREE.Group();
          bGroup.position.set(bx, 0, bz);
          bGroup.add(cyl(0.12, 0.22, 1.8, ironMat, 0, 0.9, 0, 6));
          bGroup.add(cyl(0.55, 0.35, 0.35, ironMat, 0, 1.9, 0, 8));
          bGroup.add(cone(0.42, 0.85, fireMat, 0, 2.3, 0, 7));

          const fLight = new THREE.PointLight(0xff5510, 18, 12, 1.5);
          fLight.position.set(0, 2.5, 0);
          bGroup.add(fLight);
          brazierLights.push(fLight);
          root.add(bGroup);
        });

        return {
          root,
          update: (t, dt) => {
            flag.rotation.y = Math.sin(t * 2.8) * 0.15;
            emblem.rotation.y = flag.rotation.y;
            warboat.update(t, dt);
            animatedSoldiers.forEach((s) => s.update(t, dt));
            brazierLights.forEach((light, i) => {
              light.intensity = 16 + Math.sin(t * 6 + i * 2.1) * 4;
            });
          },
        };
      },
    };
  }

  /* =========================================================================
     3. QUANG TRUNG - ĐẠI PHÁ QUÂN THANH 1789 (NGỌC HỒI - ĐỐNG ĐA)
     - Khói lửa mù mịt đêm mùng 5 Tết
     - Đoàn nghĩa quân Tây Sơn cầm khiên rơm, vác giáo xông pha
     - Voi chiến mang đại bác dậm chân rền vang ở hậu cảnh
  ========================================================================= */
  private buildQuangTrungTheme(): DioramaTheme {
    return {
      skyColor: 0x280e06,
      fogColor: 0x2a1008,
      fogNear: 9,
      fogFar: 36,
      keyLightColor: 0xffa838,
      keyIntensity: 125,
      rimColor: 0xff3b10,
      fillColor: 0x902810,
      build: () => {
        const root = new THREE.Group();
        const bronzeMat = mat(0x9a6528, { roughness: 0.35, metalness: 0.75 });
        const woodMat = mat(0x402516);
        const strawMat = mat(0x9a7a30, { roughness: 0.95 });
        const fireMat = mat(0xff4400, { emissive: 0xff2200, emissiveIntensity: 2.0 });

        // 2 Khẩu đại bác thần công Tây Sơn đúc đồng
        const cannon1 = this.createCannon(bronzeMat, woodMat);
        cannon1.position.set(-4.8, 0, 1.2);
        cannon1.rotation.y = 0.45;
        root.add(cannon1);

        const cannon2 = this.createCannon(bronzeMat, woodMat);
        cannon2.position.set(4.8, 0, 1.0);
        cannon2.rotation.y = -0.4;
        root.add(cannon2);

        // Voi chiến khổng lồ Tây Sơn chở đại bác ở hậu cảnh
        const warElephant = this.createWarElephant({ tuskColor: 0xfffaf0, armorColor: 0xd02818 });
        warElephant.group.position.set(-2.5, 0, -8.2);
        warElephant.group.rotation.y = 0.3;
        root.add(warElephant.group);

        // Đội hình nghĩa quân Tây Sơn áo vải cờ đào mang khiên rơm công thành
        const animatedSoldiers: AnimatedProp[] = [];
        const taySonSoldiers: [number, number, number][] = [
          [-3.8, -3.2, 0.4],
          [-4.8, -2.4, 0.5],
          [-5.6, -1.6, 0.6],
          [-2.8, -4.2, 0.3],
          [3.8, -3.4, -0.4],
          [4.9, -2.6, -0.5],
          [5.8, -1.8, -0.6],
          [3.0, -4.4, -0.3],
        ];

        taySonSoldiers.forEach(([sx, sz, ry], i) => {
          const s = this.createSoldier({
            tunicColor: 0xd23a1a,
            hatType: 'turban',
            weaponType: i % 2 === 0 ? 'spear' : 'torch',
            phase: i * 0.6,
          });
          s.group.position.set(sx, 0.3, sz);
          s.group.rotation.y = ry;
          root.add(s.group);
          animatedSoldiers.push(s);
        });

        // Bó rơm bện tẩm ướt che đạn
        for (let i = 0; i < 4; i++) {
          const roll = cyl(0.45, 0.45, 1.6, strawMat, -3.2 + i * 0.8, 0.45, -4.5, 8);
          roll.rotation.z = Math.PI / 2;
          root.add(roll);
        }

        // Đồn lũy giặc sụp đổ và ngọn lửa lớn
        const wallPiece = box(2.8, 1.6, 0.35, woodMat, 4.5, 0.8, -4.2);
        wallPiece.rotation.set(0.3, -0.4, 0.2);
        root.add(wallPiece);

        const bonfireLight = new THREE.PointLight(0xff5010, 24, 16, 1.4);
        bonfireLight.position.set(0, 1.8, -7.0);
        root.add(bonfireLight);

        const fireMesh = cone(0.8, 1.8, fireMat, 0, 1.2, -7.0, 7);
        root.add(fireMesh);

        return {
          root,
          update: (t, dt) => {
            warElephant.update(t, dt);
            animatedSoldiers.forEach((s) => s.update(t, dt));
            bonfireLight.intensity = 20 + Math.sin(t * 7) * 5;
            fireMesh.scale.set(1 + Math.sin(t * 8) * 0.1, 1 + Math.sin(t * 6) * 0.15, 1);
          },
        };
      },
    };
  }

  /* =========================================================================
     4. LÊ LỢI - KHỞI NGHĨA LAM SƠN & THUẬN THIÊN KIẾM
     - Rừng núi Lam Sơn trập trùng
     - Nghĩa sĩ Lam Sơn giương cung, vung giáo sát cánh
     - Rùa Vàng dâng kiếm Thuận Thiên lơ lửng phát hào quang
  ========================================================================= */
  private buildLeLoiTheme(): DioramaTheme {
    return {
      skyColor: 0x0a1810,
      fogColor: 0x0c1e14,
      fogNear: 11,
      fogFar: 42,
      keyLightColor: 0xd8ffb8,
      keyIntensity: 115,
      rimColor: 0xffd24a,
      fillColor: 0x286040,
      build: () => {
        const root = new THREE.Group();
        const stoneMat = mat(0x3a483a, { roughness: 0.85 });
        const swordMat = mat(0xffe680, { roughness: 0.2, metalness: 0.85, emissive: 0xffc830, emissiveIntensity: 0.8 });
        const jadeWater = mat(0x0e3224, { roughness: 0.25, metalness: 0.35, transparent: true, opacity: 0.85 });

        // Mặt hồ nước thiêng xanh ngọc bích
        const lake = new THREE.Mesh(new THREE.RingGeometry(3.6, 28, 42), jadeWater);
        lake.rotation.x = -Math.PI / 2;
        lake.position.y = 0.18;
        root.add(lake);

        // Bệ đá thần rêu phong giữa hồ
        const altar = cyl(1.2, 1.5, 0.9, stoneMat, 0, 0.45, -4.5, 8);
        root.add(altar);

        // Thuận Thiên Kiếm lơ lửng phát kim quang
        const swordGroup = new THREE.Group();
        swordGroup.position.set(0, 2.2, -4.5);
        swordGroup.add(box(0.08, 1.6, 0.22, swordMat, 0, 0.8, 0));
        swordGroup.add(cone(0.12, 0.35, swordMat, 0, 1.75, 0, 4));
        swordGroup.add(box(0.12, 0.1, 0.6, mat(0xc89020, { metalness: 0.9 }), 0, 0, 0));
        swordGroup.add(cyl(0.05, 0.05, 0.45, mat(0x281810), 0, -0.25, 0, 6));

        const swordLight = new THREE.PointLight(0xffd24a, 22, 10, 1.5);
        swordLight.position.set(0, 0.8, 0);
        swordGroup.add(swordLight);
        root.add(swordGroup);

        // Nghĩa quân Lam Sơn phục kích từ rừng sâu hai bên bệ đá
        const animatedSoldiers: AnimatedProp[] = [];
        const lamSonTroops: [number, number, number][] = [
          [-4.2, -2.8, 0.4],
          [-5.2, -1.8, 0.5],
          [-5.8, -0.8, 0.6],
          [4.2, -2.8, -0.4],
          [5.2, -1.8, -0.5],
          [5.8, -0.8, -0.6],
        ];

        lamSonTroops.forEach(([sx, sz, ry], i) => {
          const s = this.createSoldier({
            tunicColor: 0x2f7a4a,
            hatType: 'helmet',
            weaponType: i % 2 === 0 ? 'spear' : 'flag',
            phase: i * 0.7,
          });
          s.group.position.set(sx, 0.3, sz);
          s.group.rotation.y = ry;
          root.add(s.group);
          animatedSoldiers.push(s);
        });

        // Rừng núi Lam Sơn trập trùng phía sau
        for (let i = 0; i < 22; i++) {
          const a = Math.PI * (0.65 + (i / 22) * 1.7);
          const r = 9 + (i % 3) * 2.2;
          const h = 7.5 + (i % 4) * 1.5;
          root.add(cyl(0.15, 0.2, h, mat(0x183420), Math.cos(a) * r, h / 2, Math.sin(a) * r, 6));
        }

        return {
          root,
          update: (t, dt) => {
            swordGroup.rotation.y = t * 1.4;
            swordGroup.position.y = 2.2 + Math.sin(t * 2.0) * 0.15;
            swordLight.intensity = 20 + Math.sin(t * 3.5) * 6;
            animatedSoldiers.forEach((s) => s.update(t, dt));
          },
        };
      },
    };
  }

  /* =========================================================================
     5. HAI BÀ TRƯNG - KHỞI NGHĨA MÊ LINH (NĂM 40 SCN)
     - Dàn cồng đồng, ngà voi trắng muốt
     - Đoàn nghĩa binh Lĩnh Nam gõ cồng, giương cờ hoa buổi đầu lập quốc
     - Voi trắng chiến trận uy nghi bên sông Hát
  ========================================================================= */
  private buildHaiBaTrungTheme(): DioramaTheme {
    return {
      skyColor: 0x24121a,
      fogColor: 0x26141c,
      fogNear: 11,
      fogFar: 44,
      keyLightColor: 0xffdfd0,
      keyIntensity: 115,
      rimColor: 0xff708c,
      fillColor: 0x6a2840,
      build: () => {
        const root = new THREE.Group();
        const ivoryMat = mat(0xfffaf0, { roughness: 0.25, metalness: 0.15 });
        const goldMat = mat(0xe8b838, { metalness: 0.8, roughness: 0.3 });
        const woodMat = mat(0x5a2418);

        // Cặp ngà voi chiến khổng lồ trắng muốt uốn lượn hai bên
        const tuskLeft = this.createTusk(ivoryMat, -4.6, 1.4, -1.8, 0.25, 0.5);
        const tuskRight = this.createTusk(ivoryMat, 4.6, 1.4, -1.8, 0.25, -0.5);
        root.add(tuskLeft, tuskRight);

        // Voi trắng dũng mãnh đứng ở hậu cảnh bên dòng sông Hát
        const whiteElephant = this.createWarElephant({ tuskColor: 0xffffff, armorColor: 0xf2a4b4, bodyColor: 0xd8d4d0 });
        whiteElephant.group.position.set(0, 0, -8.0);
        root.add(whiteElephant.group);

        // Giá cồng đồng Mê Linh uy nghi
        const gongFrame = new THREE.Group();
        gongFrame.position.set(0, 0, -4.8);
        gongFrame.add(cyl(0.1, 0.12, 4.2, woodMat, -2.0, 2.1, 0, 6));
        gongFrame.add(cyl(0.1, 0.12, 4.2, woodMat, 2.0, 2.1, 0, 6));
        gongFrame.add(box(4.4, 0.18, 0.18, woodMat, 0, 3.9, 0));

        const gong = cyl(1.3, 1.3, 0.18, goldMat, 0, 2.4, 0, 24);
        gong.rotation.x = Math.PI / 2;
        gongFrame.add(gong);

        const gongAura = new THREE.PointLight(0xffb84a, 16, 8, 1.6);
        gongAura.position.set(0, 2.4, 0.5);
        gongFrame.add(gongAura);
        root.add(gongFrame);

        // Nghĩa quân Lĩnh Nam hai bên giương cờ hoa, cung kính hướng về nữ tướng
        const animatedSoldiers: AnimatedProp[] = [];
        const meLinhTroops: [number, number, number][] = [
          [-4.5, -2.8, 0.4],
          [-5.4, -1.8, 0.5],
          [-5.8, -0.8, 0.6],
          [4.5, -2.8, -0.4],
          [5.4, -1.8, -0.5],
          [5.8, -0.8, -0.6],
        ];

        meLinhTroops.forEach(([sx, sz, ry], i) => {
          const s = this.createSoldier({
            tunicColor: 0xf2a4b4,
            hatType: 'turban',
            weaponType: i % 2 === 0 ? 'spear' : 'flag',
            phase: i * 0.7,
          });
          s.group.position.set(sx, 0.3, sz);
          s.group.rotation.y = ry;
          root.add(s.group);
          animatedSoldiers.push(s);
        });

        return {
          root,
          update: (t, dt) => {
            gongAura.intensity = 14 + Math.sin(t * 4.0) * 4;
            gong.rotation.z = Math.sin(t * 0.8) * 0.05;
            whiteElephant.update(t, dt);
            animatedSoldiers.forEach((s) => s.update(t, dt));
          },
        };
      },
    };
  }

  /* =========================================================================
     6. BÀ TRIỆU - KHỞI NGHĨA CỬU CHÂN (NĂM 248) - NÚI TÙNG
     - Đỉnh núi Tùng lộng gió, đại kỳ vàng tung bay
     - Nghĩa quân áo vàng giương giáo đón gió biển Đông
  ========================================================================= */
  private buildBaTrieuTheme(): DioramaTheme {
    return {
      skyColor: 0x1e160e,
      fogColor: 0x221810,
      fogNear: 10,
      fogFar: 40,
      keyLightColor: 0xffdf80,
      keyIntensity: 120,
      rimColor: 0xffaa20,
      fillColor: 0x8a5018,
      build: () => {
        const root = new THREE.Group();
        const cliffMat = mat(0x403224, { roughness: 0.9 });
        const goldFlagMat = mat(0xf0c020, { roughness: 0.45, emissive: 0x6a4a00, emissiveIntensity: 0.3 });
        const woodMat = mat(0x382414);

        // Vách đá đỉnh núi Tùng
        for (let i = 0; i < 7; i++) {
          const a = -1.8 + i * 0.6;
          const rock = box(2.4, 2.0 + (i % 3) * 0.8, 2.4, cliffMat, Math.cos(a) * 7.0, 1.0, Math.sin(a) * 7.0);
          rock.rotation.set((i % 2) * 0.2, a, 0.15);
          root.add(rock);
        }

        // Đại kỳ vàng lộng gió
        const pole = cyl(0.1, 0.12, 8.2, woodMat, -5.4, 4.1, -2.4, 6);
        root.add(pole);
        const bigYellowFlag = box(0.04, 2.4, 3.4, goldFlagMat, -5.4, 6.4, -0.7);
        root.add(bigYellowFlag);

        // Nghĩa quân Cửu Chân áo vàng dàn hàng trên triền đá
        const animatedSoldiers: AnimatedProp[] = [];
        const cuuChanTroops: [number, number, number][] = [
          [-3.8, 2.8, 2.6],
          [-4.8, 1.8, 2.2],
          [-5.4, 0.6, 1.8],
          [3.8, 2.8, -2.6],
          [4.8, 1.8, -2.2],
          [5.4, 0.6, -1.8],
        ];

        cuuChanTroops.forEach(([sx, sz, ry], i) => {
          const s = this.createSoldier({
            tunicColor: 0xe0b020,
            hatType: 'turban',
            weaponType: 'spear',
            phase: i * 0.65,
          });
          s.group.position.set(sx, 0.4, sz);
          s.group.rotation.y = ry;
          root.add(s.group);
          animatedSoldiers.push(s);
        });

        return {
          root,
          update: (t, dt) => {
            bigYellowFlag.rotation.y = Math.sin(t * 3.8) * 0.22;
            animatedSoldiers.forEach((s) => s.update(t, dt));
          },
        };
      },
    };
  }

  /* =========================================================================
     7. LÝ THƯỜNG KIỆT - CHIẾN TUYẾN SÔNG NHƯ NGUYỆT (NĂM 1077)
     - Phòng lũy cọc tre kiên cố chạy dài bờ nam sông Như Nguyệt
     - Bia đá thiêng khắc thơ thần "Nam Quốc Sơn Hà" phát hào quang
     - Đội quân Đại Việt dàn trận giáo mác chĩa về phương bắc
  ========================================================================= */
  private buildLyThuongKietTheme(): DioramaTheme {
    return {
      skyColor: 0x121724,
      fogColor: 0x141a28,
      fogNear: 10,
      fogFar: 42,
      keyLightColor: 0xbcd8ff,
      keyIntensity: 115,
      rimColor: 0x88a0e8,
      fillColor: 0x283860,
      build: () => {
        const root = new THREE.Group();
        const bambooMat = mat(0x38542a, { roughness: 0.75 });
        const steleMat = mat(0x283244, { roughness: 0.65 });
        const goldPoemMat = mat(0xffe270, { emissive: 0xffd24a, emissiveIntensity: 0.9 });

        // Phòng lũy tre kiên cố bờ nam sông Như Nguyệt
        for (let i = 0; i < 24; i++) {
          const x = -8.5 + i * 0.75;
          const h = 4.2 + (i % 3) * 0.6;
          const stake = cyl(0.14, 0.18, h, bambooMat, x, h / 2, -5.8, 6);
          stake.rotation.x = -0.15;
          root.add(stake);
        }

        // Bia đá thiêng khắc bài thơ thần "Nam Quốc Sơn Hà"
        const steleGroup = new THREE.Group();
        steleGroup.position.set(0, 0, -4.6);
        steleGroup.add(box(2.2, 3.2, 0.45, steleMat, 0, 1.6, 0));
        const poemPlate = box(1.7, 2.4, 0.08, goldPoemMat, 0, 1.7, 0.24);
        steleGroup.add(poemPlate);

        const poemLight = new THREE.PointLight(0xffe270, 20, 9, 1.6);
        poemLight.position.set(0, 1.7, 0.8);
        steleGroup.add(poemLight);
        root.add(steleGroup);

        // Đội quân Đại Việt tinh nhuệ đứng nghiêm trang dàn giáo mác
        const animatedSoldiers: AnimatedProp[] = [];
        const lyTroops: [number, number, number][] = [
          [-3.6, -3.2, 0.2],
          [-4.8, -2.4, 0.3],
          [-5.8, -1.6, 0.4],
          [3.6, -3.2, -0.2],
          [4.8, -2.4, -0.3],
          [5.8, -1.6, -0.4],
        ];

        lyTroops.forEach(([sx, sz, ry], i) => {
          const s = this.createSoldier({
            tunicColor: 0x3a3f4a,
            hatType: 'helmet',
            weaponType: i % 2 === 0 ? 'spear' : 'torch',
            phase: i * 0.8,
          });
          s.group.position.set(sx, 0.35, sz);
          s.group.rotation.y = ry;
          root.add(s.group);
          animatedSoldiers.push(s);
        });

        return {
          root,
          update: (t, dt) => {
            poemLight.intensity = 18 + Math.sin(t * 3.2) * 5;
            animatedSoldiers.forEach((s) => s.update(t, dt));
          },
        };
      },
    };
  }

  /* =========================================================================
     8. NGUYỄN TRÃI - CÔN SƠN & BÌNH NGÔ ĐẠI CÁO
     - Thạch bàn Côn Sơn ngâm thơ, rừng trúc thanh tú
     - Cuộn trúc thư "Bình Ngô Đại Cáo" phát hào quang
     - Nghĩa sĩ Lam Sơn hội tụ lắng nghe đại cáo
  ========================================================================= */
  private buildNguyenTraiTheme(): DioramaTheme {
    return {
      skyColor: 0x101a22,
      fogColor: 0x121d26,
      fogNear: 12,
      fogFar: 44,
      keyLightColor: 0xd8eeff,
      keyIntensity: 110,
      rimColor: 0xffd860,
      fillColor: 0x244050,
      build: () => {
        const root = new THREE.Group();
        const stoneMat = mat(0x404a52, { roughness: 0.8 });
        const bambooMat = mat(0x2d6836, { roughness: 0.6 });
        const scrollMat = mat(0xffea9a, { emissive: 0xc89628, emissiveIntensity: 0.6 });

        // Thạch bàn Côn Sơn
        const stoneTable = box(2.6, 0.6, 1.8, stoneMat, 0, 0.3, -4.5);
        root.add(stoneTable);

        // Cuộn trúc thư "Bình Ngô Đại Cáo"
        const scrollGroup = new THREE.Group();
        scrollGroup.position.set(0, 0.65, -4.5);
        scrollGroup.add(box(1.8, 0.08, 1.1, scrollMat, 0, 0, 0));
        scrollGroup.add(cyl(0.08, 0.08, 1.3, mat(0x8a5520), -0.9, 0, 0, 8));
        scrollGroup.add(cyl(0.08, 0.08, 1.3, mat(0x8a5520), 0.9, 0, 0, 8));

        const scrollLight = new THREE.PointLight(0xffea9a, 16, 7, 1.6);
        scrollLight.position.set(0, 0.8, 0);
        scrollGroup.add(scrollLight);
        root.add(scrollGroup);

        // Nghĩa sĩ quây quần lắng nghe thiên cổ hùng văn
        const animatedSoldiers: AnimatedProp[] = [];
        const scholars: [number, number, number][] = [
          [-3.2, -3.2, 0.4],
          [-4.4, -2.4, 0.5],
          [3.2, -3.2, -0.4],
          [4.4, -2.4, -0.5],
        ];

        scholars.forEach(([sx, sz, ry], i) => {
          const s = this.createSoldier({
            tunicColor: 0x2a4a8a,
            hatType: 'turban',
            weaponType: 'flag',
            phase: i * 0.7,
          });
          s.group.position.set(sx, 0.35, sz);
          s.group.rotation.y = ry;
          root.add(s.group);
          animatedSoldiers.push(s);
        });

        // Rừng trúc xanh thanh nhã
        for (let i = 0; i < 28; i++) {
          const a = Math.PI * (0.65 + (i / 28) * 1.7);
          const r = 8.5 + (i % 4) * 1.8;
          const h = 7.5 + (i % 3) * 1.6;
          root.add(cyl(0.09, 0.12, h, bambooMat, Math.cos(a) * r, h / 2, Math.sin(a) * r, 6));
        }

        return {
          root,
          update: (t, dt) => {
            scrollLight.intensity = 15 + Math.sin(t * 3.0) * 4;
            animatedSoldiers.forEach((s) => s.update(t, dt));
          },
        };
      },
    };
  }

  /* =========================================================================
     9. THÁNH GIÓNG - ĐÁNH GIẶC ÂN - ĐỈNH NÚI SÓC SƠN
     - Bụi tre đằng ngà ngả nghiêng cháy vàng óng
     - Dấu chân ngựa sắt bốc khói than hồng
     - Dân làng và tráng sĩ mang gậy tre theo sau người anh hùng
  ========================================================================= */
  private buildPhuDongTheme(): DioramaTheme {
    return {
      skyColor: 0x221006,
      fogColor: 0x261208,
      fogNear: 10,
      fogFar: 40,
      keyLightColor: 0xffba40,
      keyIntensity: 120,
      rimColor: 0xa0d440,
      fillColor: 0x904010,
      build: () => {
        const root = new THREE.Group();
        const goldBambooMat = mat(0xe8c038, { roughness: 0.45, emissive: 0x7a5a10, emissiveIntensity: 0.35 });
        const ironMat = mat(0x3a3a42, { roughness: 0.4, metalness: 0.85 });
        const emberMat = mat(0xff3300, { emissive: 0xff2200, emissiveIntensity: 1.8 });

        // Bụi tre đằng ngà ngả nghiêng sau đòn quật giặc
        for (let i = 0; i < 16; i++) {
          const x = -4.5 + (i % 4) * 0.8;
          const z = -3.5 - Math.floor(i / 4) * 0.9;
          const h = 6.0 + (i % 3) * 1.4;
          const bamboo = cyl(0.14, 0.18, h, goldBambooMat, x, h / 2, z, 7);
          bamboo.rotation.z = -0.25 - (i % 3) * 0.08;
          bamboo.rotation.x = 0.12;
          root.add(bamboo);
        }

        // Khối đá Sóc Sơn với vết chân ngựa sắt rực than hồng
        const rock = box(2.6, 1.1, 2.2, ironMat, 4.2, 0.55, -2.8);
        root.add(rock);

        const hoofPrint = box(0.9, 0.12, 0.9, emberMat, 4.2, 1.15, -2.8);
        root.add(hoofPrint);

        const horseFire = new THREE.PointLight(0xff5510, 22, 9, 1.5);
        horseFire.position.set(4.2, 1.8, -2.8);
        root.add(horseFire);

        // Dân làng và tráng sĩ mang gậy tre theo sau
        const animatedSoldiers: AnimatedProp[] = [];
        const villagers: [number, number, number][] = [
          [-3.2, 3.2, 2.8],
          [-4.4, 2.4, 2.4],
          [3.2, 3.2, -2.8],
          [4.4, 2.4, -2.4],
        ];

        villagers.forEach(([sx, sz, ry], i) => {
          const s = this.createSoldier({
            tunicColor: 0x2a2a30,
            hatType: 'turban',
            weaponType: 'spear',
            phase: i * 0.7,
          });
          s.group.position.set(sx, 0.35, sz);
          s.group.rotation.y = ry;
          root.add(s.group);
          animatedSoldiers.push(s);
        });

        return {
          root,
          update: (t, dt) => {
            horseFire.intensity = 20 + Math.sin(t * 6.5) * 5;
            animatedSoldiers.forEach((s) => s.update(t, dt));
          },
        };
      },
    };
  }

  /* =========================================================================
     CÁC HÀM TIỆN ÍCH DỰNG NHÂN VẬT & ĐẠO CỤ LỊCH SỬ CHI TIẾT
  ========================================================================= */

  /* Tạo binh sĩ / nghĩa sĩ lịch sử với animation vung giáo / cờ / đuốc */
  private createSoldier(spec: {
    tunicColor: number;
    hatType: 'turban' | 'helmet' | 'conical';
    weaponType: 'spear' | 'flag' | 'torch';
    phase: number;
  }): AnimatedProp {
    const group = new THREE.Group();
    const skinMat = mat(0xe2ac84);
    const tunicMat = mat(spec.tunicColor, { roughness: 0.7 });
    const darkMat = mat(0x221610);
    const woodMat = mat(0x422f20);
    const ironMat = mat(0x7a8a9a, { metalness: 0.7 });

    // Thân áo
    const body = cyl(0.22, 0.28, 0.9, tunicMat, 0, 0.85, 0, 6);
    group.add(body);

    // Chân & Ủng
    group.add(cyl(0.09, 0.08, 0.45, darkMat, -0.12, 0.225, 0, 5));
    group.add(cyl(0.09, 0.08, 0.45, darkMat, 0.12, 0.225, 0, 5));

    // Đầu
    const head = sph(0.18, skinMat, 0, 1.45, 0, 1, 1.1, 1, 6);
    group.add(head);

    // Mũ / Khăn
    if (spec.hatType === 'conical') {
      const hat = cone(0.38, 0.22, mat(0xd4a359), 0, 1.62, 0, 7);
      group.add(hat);
    } else if (spec.hatType === 'helmet') {
      const helm = cyl(0.2, 0.22, 0.25, ironMat, 0, 1.6, 0, 6);
      group.add(helm);
    } else {
      const turban = cyl(0.22, 0.22, 0.16, tunicMat, 0, 1.58, 0, 6);
      group.add(turban);
    }

    // Cánh tay cầm vũ khí (có thể xoay reo hò)
    const armPivot = new THREE.Group();
    armPivot.position.set(0.3, 1.15, 0);

    const arm = cyl(0.07, 0.07, 0.45, tunicMat, 0, -0.2, 0, 5);
    armPivot.add(arm);

    let weaponObj: THREE.Object3D;
    let torchLight: THREE.PointLight | null = null;

    if (spec.weaponType === 'spear') {
      const spear = new THREE.Group();
      spear.position.set(0, -0.1, 0.2);
      spear.add(cyl(0.035, 0.035, 2.6, woodMat, 0, 0.8, 0, 5)); // cán giáo dài
      spear.add(cone(0.08, 0.35, ironMat, 0, 2.2, 0, 4)); // mũi giáo sắt
      armPivot.add(spear);
      weaponObj = spear;
    } else if (spec.weaponType === 'flag') {
      const flagGroup = new THREE.Group();
      flagGroup.position.set(0, -0.1, 0.2);
      flagGroup.add(cyl(0.04, 0.04, 2.8, woodMat, 0, 0.8, 0, 5));
      const flagCloth = box(0.02, 0.8, 1.2, mat(spec.tunicColor, { roughness: 0.5 }), 0, 1.9, 0.6);
      flagGroup.add(flagCloth);
      armPivot.add(flagGroup);
      weaponObj = flagGroup;
    } else {
      // Đuốc lửa
      const torch = new THREE.Group();
      torch.position.set(0, -0.1, 0.2);
      torch.add(cyl(0.04, 0.04, 1.4, woodMat, 0, 0.4, 0, 5));
      torch.add(cone(0.16, 0.35, mat(0xff5510, { emissive: 0xff3300, emissiveIntensity: 1.8 }), 0, 1.2, 0, 6));

      torchLight = new THREE.PointLight(0xff6010, 8, 5, 1.8);
      torchLight.position.set(0, 1.3, 0);
      torch.add(torchLight);

      armPivot.add(torch);
      weaponObj = torch;
    }

    group.add(armPivot);

    return {
      group,
      update: (t) => {
        // Cánh tay giương cao vung theo nhịp reo hò chiến thắng
        armPivot.rotation.x = -0.7 + Math.sin(t * 3.5 + spec.phase) * 0.35;
        armPivot.rotation.z = Math.cos(t * 2.5 + spec.phase) * 0.12;
        group.position.y = 0.3 + Math.abs(Math.sin(t * 3.5 + spec.phase)) * 0.05;
        if (torchLight) {
          torchLight.intensity = 7 + Math.sin(t * 8 + spec.phase) * 2;
        }
      },
    };
  }

  /* Tạo chiến thuyền gỗ Đại Việt với cánh buồm nan và binh sĩ */
  private createWarboat(spec: { sailColor: number; flagColor: number; withSoldiers: boolean }): AnimatedProp {
    const group = new THREE.Group();
    const woodHull = mat(0x3a2416, { roughness: 0.85 });
    const mastMat = mat(0x5a3820);
    const sailMat = mat(spec.sailColor, { roughness: 0.6 });

    // Thân thuyền độc mộc / thuyền đinh chiến Đại Việt
    const hull = new THREE.Group();
    hull.add(box(1.8, 0.9, 6.2, woodHull, 0, 0.45, 0));
    // Mũi thuyền nhọn vươn cao
    const prow = box(1.4, 1.1, 1.8, woodHull, 0, 0.65, 3.4);
    prow.rotation.x = -0.35;
    hull.add(prow);
    // Đuôi thuyền
    const stern = box(1.4, 1.1, 1.5, woodHull, 0, 0.65, -3.4);
    stern.rotation.x = 0.3;
    hull.add(stern);
    group.add(hull);

    // Cột buồm gỗ cao
    group.add(cyl(0.09, 0.12, 5.2, mastMat, 0, 2.6, 0.4, 6));

    // Cánh buồm nâu no gió
    const sail = box(0.04, 2.8, 2.6, sailMat, 0, 3.4, 0.4);
    group.add(sail);

    // Ngọn cờ Đại Việt đỉnh cột buồm
    const flag = box(0.02, 0.6, 1.1, mat(spec.flagColor), 0, 5.0, -0.6);
    group.add(flag);

    // Binh sĩ đứng trên thuyền
    if (spec.withSoldiers) {
      for (let i = 0; i < 3; i++) {
        const s = cyl(0.18, 0.22, 0.8, mat(0x244f8a), 0, 1.1, -1.5 + i * 1.5, 5);
        group.add(s);
        // Ngọn giáo giương cao
        group.add(cyl(0.03, 0.03, 2.2, mat(0x5a3820), 0.2, 1.7, -1.5 + i * 1.5, 4));
      }
    }

    const phase = Math.random() * Math.PI * 2;

    return {
      group,
      update: (t) => {
        // Thuyền dập dềnh theo sóng nước
        group.position.y = 0.2 + Math.sin(t * 1.6 + phase) * 0.08;
        group.rotation.z = Math.sin(t * 1.2 + phase) * 0.05;
        group.rotation.x = Math.cos(t * 1.4 + phase) * 0.03;
        flag.rotation.y = Math.sin(t * 3.0 + phase) * 0.15;
      },
    };
  }

  /* Tạo chiến thuyền giặc mắc cạn vỡ toang bốc khói */
  private createWreckedWarboat(x: number, z: number): AnimatedProp {
    const group = new THREE.Group();
    group.position.set(x, 0.2, z);
    group.rotation.set(0.35, 0.7, -0.28);

    const darkMat = mat(0x221610, { roughness: 0.95 });
    // Thân thuyền gãy đôi
    group.add(box(2.0, 1.2, 3.5, darkMat, 0, 0.6, -1.2));
    group.add(box(1.8, 1.0, 3.0, darkMat, 0.4, 0.8, 1.8));

    // Cột buồm gãy nghiêng
    const brokenMast = cyl(0.09, 0.1, 4.2, darkMat, 0.2, 1.8, 0, 6);
    brokenMast.rotation.z = 0.55;
    group.add(brokenMast);

    // Cọc gỗ đâm xuyên mạn thuyền
    const spike = cyl(0.18, 0.22, 4.5, mat(0x422f20), -0.8, 1.5, 0.5, 6);
    spike.rotation.x = -0.4;
    group.add(spike);

    return {
      group,
      update: (t) => {
        group.position.y = 0.2 + Math.sin(t * 1.2) * 0.02;
      },
    };
  }

  /* Tạo ngọn núi đá vôi Karst hùng vĩ phía chân trời */
  private createKarstMountain(x: number, z: number, h: number, r: number, color: number): THREE.Group {
    const g = new THREE.Group();
    g.position.set(x, 0, z);
    const mountainMat = mat(color, { roughness: 0.95, flatShading: true });

    // Khối tháp đá vôi đáy rộng đỉnh nhọn
    g.add(cone(r, h, mountainMat, 0, h / 2, 0, 7));
    g.add(cone(r * 0.75, h * 0.65, mountainMat, r * 0.4, h * 0.35, 0, 6));
    g.add(cone(r * 0.65, h * 0.55, mountainMat, -r * 0.35, h * 0.3, 0, 6));

    return g;
  }

  /* Tạo voi chiến mang đại bác / cồng trận */
  private createWarElephant(spec: { tuskColor: number; armorColor: number; bodyColor?: number }): AnimatedProp {
    const group = new THREE.Group();
    const skinMat = mat(spec.bodyColor ?? 0x5a544e, { roughness: 0.85 });
    const ivoryMat = mat(spec.tuskColor, { roughness: 0.3, metalness: 0.2 });
    const armorMat = mat(spec.armorColor, { roughness: 0.6 });

    // Thân voi đồ sộ
    const body = box(2.2, 2.4, 3.8, skinMat, 0, 2.4, 0);
    group.add(body);

    // 4 chân voi vững như cột đình
    group.add(cyl(0.35, 0.38, 1.6, skinMat, -0.85, 0.8, 1.3, 8));
    group.add(cyl(0.35, 0.38, 1.6, skinMat, 0.85, 0.8, 1.3, 8));
    group.add(cyl(0.35, 0.38, 1.6, skinMat, -0.85, 0.8, -1.3, 8));
    group.add(cyl(0.35, 0.38, 1.6, skinMat, 0.85, 0.8, -1.3, 8));

    // Đầu và vòi voi
    const headGroup = new THREE.Group();
    headGroup.position.set(0, 3.0, 2.2);

    const head = sph(0.9, skinMat, 0, 0, 0, 1, 1.1, 1, 8);
    headGroup.add(head);

    // Tai voi to
    const earL = box(0.08, 1.1, 0.8, skinMat, -1.1, 0.1, -0.2);
    earL.rotation.y = -0.3;
    const earR = box(0.08, 1.1, 0.8, skinMat, 1.1, 0.1, -0.2);
    earR.rotation.y = 0.3;
    headGroup.add(earL, earR);

    // Vòi voi vung lên dũng mãnh
    const trunk = cyl(0.22, 0.15, 1.8, skinMat, 0, -0.9, 0.8, 7);
    trunk.rotation.x = -0.55;
    headGroup.add(trunk);

    // Cặp ngà voi
    const tuskL = cone(0.1, 1.2, ivoryMat, -0.45, -0.5, 0.9, 6);
    tuskL.rotation.x = 0.55;
    tuskL.rotation.z = -0.2;
    const tuskR = cone(0.1, 1.2, ivoryMat, 0.45, -0.5, 0.9, 6);
    tuskR.rotation.x = 0.55;
    tuskR.rotation.z = 0.2;
    headGroup.add(tuskL, tuskR);

    group.add(headGroup);

    // Bản ngồi (Howdah) trên lưng voi
    const howdah = box(1.8, 0.8, 2.0, armorMat, 0, 3.8, 0);
    group.add(howdah);

    return {
      group,
      update: (t) => {
        // Voi dậm chân và lắc đầu vung vòi oai dũng
        headGroup.rotation.y = Math.sin(t * 1.5) * 0.12;
        headGroup.rotation.x = Math.sin(t * 2.0) * 0.08;
        group.position.y = Math.sin(t * 1.5) * 0.05;
      },
    };
  }

  /* Helper tạo khẩu đại bác thần công */
  private createCannon(metal: THREE.Material, wood: THREE.Material): THREE.Group {
    const g = new THREE.Group();
    const barrel = cyl(0.24, 0.35, 2.4, metal, 0, 1.1, 0, 10);
    barrel.rotation.x = Math.PI / 4;
    g.add(barrel);
    const rim = cyl(0.32, 0.28, 0.18, metal, 0, 1.95, -0.85, 10);
    rim.rotation.x = Math.PI / 4;
    g.add(rim);
    const wheel1 = cyl(0.65, 0.65, 0.16, wood, -0.65, 0.65, 0, 12);
    wheel1.rotation.z = Math.PI / 2;
    const wheel2 = cyl(0.65, 0.65, 0.16, wood, 0.65, 0.65, 0, 12);
    wheel2.rotation.z = Math.PI / 2;
    g.add(wheel1, wheel2);
    g.add(cyl(0.09, 0.09, 1.5, wood, 0, 0.65, 0, 6));
    return g;
  }

  /* Helper tạo ngà voi cong */
  private createTusk(mat: THREE.Material, x: number, y: number, z: number, rx: number, rz: number): THREE.Group {
    const g = new THREE.Group();
    g.position.set(x, y, z);
    g.rotation.set(rx, 0, rz);
    for (let i = 0; i < 6; i++) {
      const segH = 0.65;
      const r = 0.28 - i * 0.04;
      const piece = cyl(r * 0.85, r, segH, mat, 0, i * segH * 0.9, Math.pow(i * 0.3, 1.6) * 0.4, 8);
      piece.rotation.x = i * 0.12;
      g.add(piece);
    }
    return g;
  }
}
