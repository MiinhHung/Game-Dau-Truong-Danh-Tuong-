import * as THREE from 'three';
import { GENERALS } from './data';
import { applyAvatar } from './glbAvatar';
import { buildHuman, buildWeaponModel, type Rig } from './models';
import { buildLobbyWorld, type LobbyWorld } from './world';

/** Cảnh sảnh chờ: bệ trống đồng, tướng và vũ khí xoay để xem trước. */
export class LobbyScene {
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(40, 1, 0.1, 200);
  private world: LobbyWorld;
  private holder = new THREE.Group();
  private rig: Rig | null = null;
  private weapon: THREE.Group | null = null;
  private generalId = '';
  private weaponId = '';
  private swing = 0;
  private nextSwing = 2.5;
  private lookX = -1.8;

  constructor() {
    this.world = buildLobbyWorld(this.scene);
    this.holder.position.y = 0.5;
    this.scene.add(this.holder);
    this.camera.position.set(0, 3.2, 8.6);
  }

  resize(w: number, h: number): void {
    this.camera.aspect = w / Math.max(1, h);
    this.camera.updateProjectionMatrix();
    this.lookX = w / h > 1.5 ? -1.9 : 0;
    this.camera.position.x = this.lookX * 0.25;
    this.camera.position.z = w / h > 1.5 ? 8.8 : 11;
  }

  setGeneral(id: string): void {
    if (id === this.generalId) return;
    this.generalId = id;
    const g = GENERALS.find((x) => x.id === id) ?? GENERALS[0];
    this.holder.clear();
    this.rig = buildHuman(g.look);
    this.rig.group.scale.setScalar(1.12);
    this.holder.add(this.rig.group);
    const rig = this.rig;
    applyAvatar(rig, id, undefined, () => this.rig === rig);
    this.weapon = null;
    if (this.weaponId) this.mountWeapon();
  }

  setWeapon(id: string): void {
    if (id === this.weaponId && this.weapon) return;
    this.weaponId = id;
    this.mountWeapon();
    this.swing = 0.0001;
  }

  private mountWeapon(): void {
    if (!this.rig) return;
    if (this.weapon) this.rig.hand.remove(this.weapon);
    this.weapon = buildWeaponModel(this.weaponId);
    this.rig.hand.add(this.weapon);
  }

  update(dt: number, t: number): void {
    this.world.update(t);
    this.holder.rotation.y += dt * 0.5;
    this.world.platform.rotation.y -= dt * 0.1;
    if (this.rig) {
      this.nextSwing -= dt;
      if (this.nextSwing <= 0 && this.swing === 0) {
        this.swing = 0.0001;
        this.nextSwing = 3.2;
      }
      let arm = -0.9;
      if (this.swing > 0) {
        this.swing += dt;
        const p = Math.min(1, this.swing / 0.9);
        arm = p < 0.5 ? -0.9 - 1.9 * (p / 0.5) : -2.8 + 3.1 * ((p - 0.5) / 0.2 > 1 ? 1 : (p - 0.5) / 0.2);
        if (p >= 1) this.swing = 0;
      }
      this.rig.armR.rotation.x = arm;
      this.rig.armR.rotation.z = -0.1;
      this.rig.armL.rotation.x = Math.sin(t * 1.6) * 0.06;
      this.rig.group.position.y = Math.sin(t * 2) * 0.02;
      if (this.rig.cape) this.rig.cape.rotation.x = 0.1 + Math.sin(t * 1.4) * 0.04;
    }
    this.camera.lookAt(this.lookX, 1.9, 0);
  }
}
