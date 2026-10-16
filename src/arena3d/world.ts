import * as THREE from 'three';
import { box, cyl, mat, sph } from './models';
import { BIOMES, type BiomeScene } from './biomes';
import { ARENA_R, drumTexture, rng, type Obstacle } from './worldKit';

export { ARENA_R, drumTexture, type Obstacle };

export interface ArenaWorld {
  obstacles: Obstacle[];
  biome: number;
  setBiome(i: number): void;
  update(t: number, dt: number, focus: THREE.Vector3): void;
  sun: THREE.DirectionalLight;
  /** Hiệu ứng thời tiết tạm thời: thu hẹp tầm nhìn (fogScale < 1) và nhuộm màu bầu trời. */
  setMood(fogScale: number, tint: number, amt: number): void;
  clearMood(): void;
  /** Chớp sáng nhanh toàn cảnh (v từ 0 đến 1), ví dụ khi sét đánh. */
  kick(v: number): void;
}

function disposeTree(root: THREE.Object3D): void {
  root.traverse((o) => {
    const m = o as THREE.Mesh;
    if (m.geometry) m.geometry.dispose();
    const mats = m.material ? (Array.isArray(m.material) ? m.material : [m.material]) : [];
    for (const mt of mats) {
      const map = (mt as THREE.MeshStandardMaterial).map;
      if (map) map.dispose();
      mt.dispose();
    }
  });
}

/** Thế giới đấu trường: ánh sáng cố định, còn cảnh vật, thời tiết thay theo bản đồ (setBiome). */
export function buildArenaWorld(scene: THREE.Scene): ArenaWorld {
  const bg = new THREE.Color(0xbfe0ee);
  const fog = new THREE.Fog(0xbfe0ee, 70, 210);
  scene.background = bg;
  scene.fog = fog;

  const hemi = new THREE.HemisphereLight(0xffffff, 0x5a7a3a, 1.05);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xfff0d0, 2.4);
  sun.position.set(26, 40, 16);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -34;
  sun.shadow.camera.right = 34;
  sun.shadow.camera.top = 34;
  sun.shadow.camera.bottom = -34;
  sun.shadow.camera.near = 1;
  sun.shadow.camera.far = 120;
  sun.shadow.bias = -0.0004;
  scene.add(sun);
  scene.add(sun.target);

  const obstacles: Obstacle[] = [];
  const baseSky = new THREE.Color();
  const baseFog = new THREE.Color();
  const tintC = new THREE.Color();
  let fogNear0 = 70;
  let fogFar0 = 210;
  let moodFog = 1;
  let moodTarget = 1;
  let moodAmt = 0;
  let moodAmtTarget = 0;
  let kickV = 0;
  let current: BiomeScene | null = null;
  let hemiBase = 1;

  const world: ArenaWorld = {
    obstacles,
    biome: -1,
    sun,
    setBiome(i) {
      const idx = Math.max(0, Math.min(BIOMES.length - 1, i));
      if (idx === world.biome) return;
      if (current) {
        scene.remove(current.root);
        disposeTree(current.root);
      }
      const def = BIOMES[idx];
      world.biome = idx;
      baseSky.setHex(def.sky);
      bg.copy(baseSky);
      fog.color.setHex(def.fog);
      baseFog.setHex(def.fog);
      fogNear0 = def.fogNear;
      fogFar0 = def.fogFar;
      fog.near = def.fogNear;
      fog.far = def.fogFar;
      moodFog = moodTarget = 1;
      moodAmt = moodAmtTarget = 0;
      hemi.color.setHex(def.hemiSky);
      hemi.groundColor.setHex(def.hemiGround);
      hemiBase = def.hemiI;
      hemi.intensity = hemiBase;
      sun.color.setHex(def.sun);
      sun.intensity = def.sunI;
      current = def.build();
      scene.add(current.root);
      obstacles.length = 0;
      obstacles.push(...current.obstacles);
    },
    setMood(fogScale, tint, amt) {
      moodTarget = fogScale;
      tintC.setHex(tint);
      moodAmtTarget = amt;
    },
    clearMood() {
      moodTarget = 1;
      moodAmtTarget = 0;
    },
    kick(v) {
      kickV = Math.max(kickV, v);
    },
    update(t, dt, focus) {
      const natural = current ? current.update(t, dt, focus) : 0;
      kickV = Math.max(0, kickV - dt * 3);
      const flash = Math.max(natural, kickV);
      const k = Math.min(1, dt * 1.6);
      moodFog += (moodTarget - moodFog) * k;
      moodAmt += (moodAmtTarget - moodAmt) * k;
      fog.near = fogNear0 * moodFog;
      fog.far = fogFar0 * (0.45 + 0.55 * moodFog);
      fog.color.copy(baseFog).lerp(tintC, moodAmt);
      hemi.intensity = hemiBase + flash * 2.6;
      bg.copy(baseSky).lerp(tintC, moodAmt).lerp(new THREE.Color(0xdfe8ff), flash * 0.5);
    },
  };
  world.setBiome(0);
  return world;
}
export interface LobbyWorld {
  platform: THREE.Group;
  update(t: number): void;
}

export function buildLobbyWorld(scene: THREE.Scene): LobbyWorld {
  scene.background = new THREE.Color(0x1a110b);
  scene.fog = new THREE.Fog(0x1a110b, 14, 46);
  scene.add(new THREE.HemisphereLight(0xffe8c0, 0x2a1a10, 0.9));
  const key = new THREE.SpotLight(0xffe2b0, 90, 30, 0.6, 0.5, 1.2);
  key.position.set(3, 9, 7);
  key.target.position.set(0, 1, 0);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  scene.add(key, key.target);
  const rimLight = new THREE.PointLight(0xc8963e, 40, 20, 1.5);
  rimLight.position.set(-5, 3, -4);
  scene.add(rimLight);

  const platform = new THREE.Group();
  const top = new THREE.Mesh(new THREE.CylinderGeometry(3.4, 3.7, 0.5, 40), [mat(0x8a6428, { metalness: 0.6, roughness: 0.4 }), new THREE.MeshStandardMaterial({ map: drumTexture(), roughness: 0.55, metalness: 0.4 }), mat(0x6a4a18)]);
  top.position.y = 0.25;
  top.receiveShadow = true;
  top.castShadow = true;
  platform.add(top);
  scene.add(platform);

  const floor = new THREE.Mesh(new THREE.CircleGeometry(40, 40), new THREE.MeshStandardMaterial({ color: 0x2a1c12, roughness: 1 }));
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);

  // Rừng tre phía sau và cờ hiệu
  const rand = rng(5);
  const bamboo = mat(0x2f6a30);
  for (let i = 0; i < 44; i++) {
    const a = Math.PI * (0.85 + rand() * 1.3);
    const r = 11 + rand() * 12;
    const h = 8 + rand() * 6;
    scene.add(cyl(0.18, 0.22, h, bamboo, Math.cos(a) * r, h / 2, Math.sin(a) * r - 2, 6));
  }
  const lanterns: THREE.Mesh[] = [];
  for (let i = 0; i < 10; i++) {
    const l = sph(0.28, mat(0xd02a1a, { emissive: 0xff3010, emissiveIntensity: 1 }), (i - 4.5) * 2.6, 4 + (i % 3) * 0.7, -9, 1, 1.25, 1, 10);
    scene.add(l);
    lanterns.push(l);
  }
  for (const x of [-6, 6]) {
    const pole = cyl(0.1, 0.1, 7, mat(0x6a4a20), x, 3.5, -6, 6);
    scene.add(pole);
    const flag = box(0.06, 1.6, 2.2, mat(0xb3261e), x, 5.8, -6 + (x > 0 ? -1.2 : 1.2));
    scene.add(flag);
  }

  return {
    platform,
    update(t) {
      lanterns.forEach((l, i) => (l.position.y = 4 + (i % 3) * 0.7 + Math.sin(t * 1.5 + i) * 0.15));
    },
  };
}
