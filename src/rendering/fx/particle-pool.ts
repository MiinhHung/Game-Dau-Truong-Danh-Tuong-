import * as THREE from 'three';
import { getSoftGlowTex } from './vfx-textures';

/**
 * Hạt tia lửa dùng chung: mọi hạt nằm trong một InstancedMesh nên chỉ tốn một lệnh vẽ,
 * và hạt được tái sử dụng thay vì tạo rồi xóa mesh mỗi lần trúng đòn.
 */
export class ParticlePool {
  readonly mesh: THREE.InstancedMesh;
  private readonly cap: number;
  private count = 0;
  private pos: Float32Array;
  private vel: Float32Array;
  private size: Float32Array;
  private age: Float32Array;
  private dur: Float32Array;
  private color: Float32Array;
  private m = new THREE.Matrix4();
  private s = new THREE.Vector3();
  private p = new THREE.Vector3();
  private c = new THREE.Color();

  constructor(scene: THREE.Scene, cap = 700) {
    this.cap = cap;
    this.pos = new Float32Array(cap * 3);
    this.vel = new Float32Array(cap * 3);
    this.size = new Float32Array(cap);
    this.age = new Float32Array(cap);
    this.dur = new Float32Array(cap);
    this.color = new Float32Array(cap * 3);
    const mat = new THREE.MeshBasicMaterial({
      map: getSoftGlowTex(),
      transparent: true,
      opacity: 0.95,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
    });
    this.mesh = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.3, 0.3), mat, cap);
    this.mesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(cap * 3), 3);
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.mesh.count = 0;
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 6;
    scene.add(this.mesh);
  }

  /** Bắn ra n hạt từ một điểm (giống fxBurst cũ). Hết chỗ thì bỏ qua hạt mới. */
  burst(x: number, y: number, z: number, color: number, n: number, speed: number, size: number): void {
    this.c.setHex(color);
    for (let k = 0; k < n && this.count < this.cap; k++) {
      const i = this.count++;
      this.pos[i * 3] = x;
      this.pos[i * 3 + 1] = y;
      this.pos[i * 3 + 2] = z;
      let vx = (Math.random() - 0.5) * 2;
      let vy = Math.random() * 1.4 + 0.2;
      let vz = (Math.random() - 0.5) * 2;
      const len = Math.hypot(vx, vy, vz) || 1;
      const sp = speed * (0.4 + Math.random() * 0.8);
      vx = (vx / len) * sp;
      vy = (vy / len) * sp;
      vz = (vz / len) * sp;
      this.vel[i * 3] = vx;
      this.vel[i * 3 + 1] = vy;
      this.vel[i * 3 + 2] = vz;
      this.size[i] = size * (0.6 + Math.random() * 0.8);
      this.age[i] = 0;
      this.dur[i] = 0.45 + Math.random() * 0.4;
      this.color[i * 3] = this.c.r;
      this.color[i * 3 + 1] = this.c.g;
      this.color[i * 3 + 2] = this.c.b;
    }
  }

  update(dt: number, camQuat: THREE.Quaternion): void {
    let n = 0;
    const colors = this.mesh.instanceColor!.array as Float32Array;
    for (let i = 0; i < this.count; i++) {
      const age = this.age[i] + dt;
      if (age >= this.dur[i]) continue;
      const k = age / this.dur[i];
      let vy = this.vel[i * 3 + 1] - 18 * dt;
      let px = this.pos[i * 3] + this.vel[i * 3] * dt;
      let py = this.pos[i * 3 + 1] + vy * dt;
      let pz = this.pos[i * 3 + 2] + this.vel[i * 3 + 2] * dt;
      let vx = this.vel[i * 3];
      let vz = this.vel[i * 3 + 2];
      if (py < 0.07) {
        py = 0.07;
        vx *= 0.4;
        vz *= 0.4;
        vy = Math.abs(vy * 0.4) * 0.3;
      }
      const sz = this.size[i] * Math.max(0.01, 1 - dt * 1.6 * k);
      // dồn hạt còn sống lên đầu mảng để không phải duyệt hạt đã tắt
      this.pos[n * 3] = px;
      this.pos[n * 3 + 1] = py;
      this.pos[n * 3 + 2] = pz;
      this.vel[n * 3] = vx;
      this.vel[n * 3 + 1] = vy;
      this.vel[n * 3 + 2] = vz;
      this.size[n] = sz;
      this.age[n] = age;
      this.dur[n] = this.dur[i];
      this.color[n * 3] = this.color[i * 3];
      this.color[n * 3 + 1] = this.color[i * 3 + 1];
      this.color[n * 3 + 2] = this.color[i * 3 + 2];
      this.m.compose(this.p.set(px, py, pz), camQuat, this.s.set(sz, sz, sz));
      this.mesh.setMatrixAt(n, this.m);
      colors[n * 3] = this.color[n * 3];
      colors[n * 3 + 1] = this.color[n * 3 + 1];
      colors[n * 3 + 2] = this.color[n * 3 + 2];
      n++;
    }
    this.count = n;
    this.mesh.count = n;
    if (n > 0) {
      this.mesh.instanceMatrix.needsUpdate = true;
      this.mesh.instanceColor!.needsUpdate = true;
    }
  }

  clear(): void {
    this.count = 0;
    this.mesh.count = 0;
  }
}
