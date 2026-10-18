import * as THREE from 'three';
import { GENERALS, type GearSlot } from '../../domain/data';
import { applyAvatar } from '../../rendering/loaders/glb-avatar';
import { buildHuman, buildWeaponModel, type Rig } from '../../rendering/models/models';
import { buildLobbyWorld, type LobbyWorld } from '../../rendering/world/arena-world';
import { attachGearToRig } from '../../rendering/items/gear-models';
import { LobbyDioramaManager } from '../../rendering/world/lobby-dioramas';

/** Cảnh sảnh chờ 3D: bệ trống đồng rực rỡ, bối cảnh lịch sử 3D theo danh tướng, camera parallax chuột và tướng xoay xem trước. */
export class LobbyScene {
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(40, 1, 0.1, 200);
  private world: LobbyWorld;
  private diorama: LobbyDioramaManager;
  private holder = new THREE.Group();
  private rig: Rig | null = null;
  private weapon: THREE.Group | null = null;
  private generalId = '';
  private weaponId = '';
  private equipped: Record<GearSlot, string | null> = { head: null, body: null, feet: null, charm: null };
  private swing = 0;
  private nextSwing = 2.5;
  private lookX = 0;
  private mouseX = 0;
  private mouseY = 0;
  private entrance = 0;

  constructor() {
    this.world = buildLobbyWorld(this.scene);
    this.diorama = new LobbyDioramaManager(this.scene);
    this.holder.position.y = 0.5;
    this.scene.add(this.holder);
    this.camera.position.set(0, 3.2, 8.6);

    window.addEventListener('mousemove', (e) => {
      this.mouseX = (e.clientX / window.innerWidth) * 2 - 1;
      this.mouseY = (e.clientY / window.innerHeight) * 2 - 1;
    });
  }

  resize(w: number, h: number): void {
    this.camera.aspect = w / Math.max(1, h);
    this.camera.updateProjectionMatrix();
    this.lookX = 0;
    this.camera.position.x = 0;
    this.camera.position.z = w / h > 1.5 ? 8.6 : 10.5;
  }

  setGeneral(id: string): void {
    if (id === this.generalId) return;
    this.generalId = id;
    this.diorama.setGeneral(id);
    const g = GENERALS.find((x) => x.id === id) ?? GENERALS[0];
    this.holder.clear();
    this.rig = buildHuman(g.look);
    this.rig.group.scale.setScalar(1.15);
    this.holder.add(this.rig.group);
    const rig = this.rig;
    applyAvatar(rig, id, undefined, () => this.rig === rig);
    attachGearToRig(this.rig, this.equipped);
    this.weapon = null;
    this.entrance = 1.0;
    if (this.weaponId) this.mountWeapon();
  }

  setEquipped(equipped: Record<GearSlot, string | null>): void {
    this.equipped = { ...equipped };
    if (this.rig) {
      attachGearToRig(this.rig, this.equipped);
    }
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
    this.world.update(t, dt);
    this.diorama.update(t, dt);

    // Xoay nhẹ bệ và nhân vật
    this.holder.rotation.y += dt * 0.42;
    this.world.platform.rotation.y -= dt * 0.12;

    // Hiệu ứng xuất hiện khi đổi tướng
    if (this.entrance > 0) {
      this.entrance = Math.max(0, this.entrance - dt * 2.5);
      this.holder.position.y = 0.5 + Math.sin(this.entrance * Math.PI) * 0.18;
    } else {
      this.holder.position.y = 0.5;
    }

    // Chuyển động động tác của tướng
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
      this.rig.armL.rotation.x = Math.sin(t * 1.6) * 0.08;
      this.rig.group.position.y = Math.sin(t * 2) * 0.035;
      if (this.rig.cape) this.rig.cape.rotation.x = 0.12 + Math.sin(t * 1.8) * 0.06;
    }

    // Camera 3D Parallax mượt mà theo di chuyển chuột quanh trung tâm màn hình
    const targetCamX = this.mouseX * 0.45;
    const targetCamY = 3.2 - this.mouseY * 0.25;
    this.camera.position.x += (targetCamX - this.camera.position.x) * 0.06;
    this.camera.position.y += (targetCamY - this.camera.position.y) * 0.06;
    this.camera.lookAt(this.mouseX * 0.15, 1.85 - this.mouseY * 0.08, 0);
  }
}
