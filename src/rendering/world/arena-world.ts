import * as THREE from 'three';
import { box, cyl, mat, sph } from '../primitives/shapes';
import { BIOMES, type BiomeScene } from '../biomes/biomes';
import { ARENA_R, drumTexture, rng, type Obstacle } from './world-kit';

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
  update(t: number, dt?: number): void;
}

function createEmberTexture(): THREE.Texture {
  const canvas = document.createElement('canvas');
  canvas.width = 32;
  canvas.height = 32;
  const ctx = canvas.getContext('2d')!;
  const grad = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
  grad.addColorStop(0, 'rgba(255, 240, 180, 1)');
  grad.addColorStop(0.3, 'rgba(255, 160, 40, 0.85)');
  grad.addColorStop(0.7, 'rgba(220, 60, 10, 0.35)');
  grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 32, 32);
  const tex = new THREE.CanvasTexture(canvas);
  return tex;
}

export function buildLobbyWorld(scene: THREE.Scene): LobbyWorld {
  scene.background = new THREE.Color(0x140c07);
  scene.fog = new THREE.Fog(0x140c07, 10, 42);
  scene.add(new THREE.HemisphereLight(0xffecd0, 0x24140c, 0.95));

  // Multi-tiered Drum Platform
  const platform = new THREE.Group();

  // Tier 1: lower stone step
  const baseStep = new THREE.Mesh(
    new THREE.CylinderGeometry(4.2, 4.5, 0.25, 42),
    mat(0x3a2416, { roughness: 0.8, metalness: 0.2 }),
  );
  baseStep.position.y = 0.125;
  baseStep.receiveShadow = true;
  platform.add(baseStep);

  // Tier 2: Trống Đồng main body
  const drum = new THREE.Mesh(
    new THREE.CylinderGeometry(3.5, 3.8, 0.5, 42),
    [
      mat(0x9a7230, { metalness: 0.65, roughness: 0.38 }),
      new THREE.MeshStandardMaterial({ map: drumTexture(), roughness: 0.5, metalness: 0.45 }),
      mat(0x6a481c, { metalness: 0.5 }),
    ],
  );
  drum.position.y = 0.5;
  drum.receiveShadow = true;
  drum.castShadow = true;
  platform.add(drum);

  // Glowing golden inner rim on drum top
  const goldRing = new THREE.Mesh(
    new THREE.RingGeometry(3.2, 3.48, 42),
    new THREE.MeshBasicMaterial({ color: 0xffd24a, side: THREE.DoubleSide }),
  );
  goldRing.rotation.x = -Math.PI / 2;
  goldRing.position.y = 0.755;
  platform.add(goldRing);

  // Ground mist / aura ring
  const auraRing = new THREE.Mesh(
    new THREE.RingGeometry(4.6, 6.4, 42),
    new THREE.MeshBasicMaterial({
      color: 0xc8963e,
      transparent: true,
      opacity: 0.18,
      side: THREE.DoubleSide,
    }),
  );
  auraRing.rotation.x = -Math.PI / 2;
  auraRing.position.y = 0.02;
  scene.add(auraRing);

  scene.add(platform);

  // Ground circular floor
  const floor = new THREE.Mesh(
    new THREE.CircleGeometry(42, 42),
    new THREE.MeshStandardMaterial({ color: 0x16100a, roughness: 0.95 }),
  );
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);

  // Floating Firefly / Ember Particle System
  const emberCount = 130;
  const emberGeo = new THREE.BufferGeometry();
  const emberPositions = new Float32Array(emberCount * 3);
  const emberData: { vx: number; vy: number; vz: number; phase: number }[] = [];

  for (let i = 0; i < emberCount; i++) {
    const a = Math.random() * Math.PI * 2;
    const dist = 0.5 + Math.random() * 5.5;
    emberPositions[i * 3] = Math.cos(a) * dist;
    emberPositions[i * 3 + 1] = 0.2 + Math.random() * 6.5;
    emberPositions[i * 3 + 2] = Math.sin(a) * dist;

    emberData.push({
      vx: (Math.random() - 0.5) * 0.2,
      vy: 0.4 + Math.random() * 0.6,
      vz: (Math.random() - 0.5) * 0.2,
      phase: Math.random() * Math.PI * 2,
    });
  }
  emberGeo.setAttribute('position', new THREE.BufferAttribute(emberPositions, 3));

  const emberMat = new THREE.PointsMaterial({
    size: 0.26,
    map: createEmberTexture(),
    transparent: true,
    opacity: 0.85,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const emberPoints = new THREE.Points(emberGeo, emberMat);
  scene.add(emberPoints);

  return {
    platform,
    update(t, dt = 0.016) {
      // Ground aura gentle pulse and rotation
      auraRing.rotation.z += dt * 0.04;
      (auraRing.material as THREE.MeshBasicMaterial).opacity = 0.16 + Math.sin(t * 1.8) * 0.06;

      // Embers upward drift and sway
      const pos = emberGeo.attributes.position.array as Float32Array;
      for (let i = 0; i < emberCount; i++) {
        const d = emberData[i];
        pos[i * 3 + 1] += d.vy * dt;
        pos[i * 3] += Math.sin(t * 1.4 + d.phase) * 0.012;
        pos[i * 3 + 2] += Math.cos(t * 1.2 + d.phase) * 0.012;

        if (pos[i * 3 + 1] > 7.5) {
          pos[i * 3 + 1] = 0.2 + Math.random() * 0.4;
          const a = Math.random() * Math.PI * 2;
          const dist = 0.5 + Math.random() * 5.2;
          pos[i * 3] = Math.cos(a) * dist;
          pos[i * 3 + 2] = Math.sin(a) * dist;
        }
      }
      emberGeo.attributes.position.needsUpdate = true;
    },
  };
}
