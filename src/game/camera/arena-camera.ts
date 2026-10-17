import * as THREE from 'three';

/**
 * Quản lý Camera góc nhìn từ trên cao (Isometric / Top-down),
 * theo dõi nhân vật, độ zoom và hiệu ứng rung lắc (screen shake).
 */
export class ArenaCamera {
  camera: THREE.PerspectiveCamera;
  target = new THREE.Vector3();
  shake = 0;

  constructor(fov = 48, near = 0.1, far = 500) {
    this.camera = new THREE.PerspectiveCamera(fov, 1, near, far);
  }

  resize(w: number, h: number): void {
    this.camera.aspect = w / Math.max(1, h);
    this.camera.updateProjectionMatrix();
  }

  addShake(v: number): void {
    this.shake = Math.max(this.shake, v);
  }

  update(dt: number, focusPos: THREE.Vector3, zoom: number, sun?: THREE.DirectionalLight): void {
    const target = new THREE.Vector3(focusPos.x, 0, focusPos.z);
    this.target.copy(target);

    const pitch = 1.1;
    const desired = new THREE.Vector3(
      target.x,
      Math.sin(pitch) * zoom,
      target.z + Math.cos(pitch) * zoom,
    );
    this.camera.position.lerp(desired, Math.min(1, dt * 6));

    this.shake = Math.max(0, this.shake - dt * 2.4);
    const s = this.shake * 0.35;
    this.camera.lookAt(
      new THREE.Vector3(
        target.x + (Math.random() - 0.5) * s,
        1,
        target.z + (Math.random() - 0.5) * s,
      ),
    );

    if (sun) {
      sun.position.set(target.x + 26, 40, target.z + 16);
      sun.target.position.copy(target);
      sun.target.updateMatrixWorld();
    }
  }
}
