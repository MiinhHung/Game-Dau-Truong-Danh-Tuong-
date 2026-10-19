import * as THREE from 'three';
import { GENERALS, type GearSlot } from '../../domain/data';
import { applyAvatar } from '../../rendering/loaders/glb-avatar';
import { buildHuman, buildWeaponModel, type Rig } from '../../rendering/models/models';
import { attachGearToRig } from '../../rendering/items/gear-models';
import { cyl, mat, shadowed } from '../../rendering/primitives/shapes';
import { createEnvironment, setupToneMapping } from '../../rendering/postfx/render-pipeline';

/**
 * Sân khấu 3D hiển thị toàn thân tướng (dáng đứng) trong giao diện Cửa hàng trang bị.
 * Tự động đồng bộ hóa trang bị (Mũ, Giáp, Giày, Bùa) và cho phép xoay 360 độ để chiêm ngưỡng.
 */
export class ShopHeroStage {
  private renderer: THREE.WebGLRenderer | null = null;
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(36, 1, 0.1, 50);
  private holder = new THREE.Group();
  private platform = new THREE.Group();
  private rig: Rig | null = null;
  private weapon: THREE.Group | null = null;
  private generalId = '';
  private weaponId = '';
  private equipped: Record<GearSlot, string | null> = { head: null, body: null, feet: null, charm: null };

  private isDragging = false;
  private lastX = 0;
  private animId = 0;
  private clock = new THREE.Clock();
  private alive = false;
  private onMouseDownBound: (e: MouseEvent) => void;
  private onMouseMoveBound: (e: MouseEvent) => void;
  private onMouseUpBound: () => void;
  private onTouchStartBound: (e: TouchEvent) => void;
  private onTouchMoveBound: (e: TouchEvent) => void;
  private onTouchEndBound: () => void;

  constructor(private canvas: HTMLCanvasElement) {
    try {
      this.renderer = new THREE.WebGLRenderer({
        canvas,
        alpha: true,
        antialias: true,
        powerPreference: 'low-power',
      });
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      this.renderer.setSize(canvas.clientWidth || 280, canvas.clientHeight || 260, false);
      this.renderer.shadowMap.enabled = true;
      this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      setupToneMapping(this.renderer);
      this.scene.environment = createEnvironment(this.renderer);
      this.scene.environmentIntensity = 0.5;
    } catch {
      // Nếu WebGL không hỗ trợ
      this.renderer = null;
    }

    // Bố trí ánh sáng studio vàng ấm
    const ambient = new THREE.AmbientLight(0xfff1de, 1.6);
    const keyLight = new THREE.DirectionalLight(0xffedd5, 2.2);
    keyLight.position.set(2, 4.5, 3.5);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 512;
    keyLight.shadow.mapSize.height = 512;

    const rimLight = new THREE.DirectionalLight(0xf0d98a, 1.4);
    rimLight.position.set(-2, 2.5, -2);

    const bottomGlow = new THREE.PointLight(0xf59e0b, 1.2, 4);
    bottomGlow.position.set(0, 0.2, 0);

    this.scene.add(ambient, keyLight, rimLight, bottomGlow);

    // Bệ đứng Trống Đồng cách điệu
    const drumM = mat(0x24160c, { metalness: 0.7, roughness: 0.35 });
    const goldM = mat(0xf59e0b, { metalness: 0.9, roughness: 0.22, emissive: 0xb45309, emissiveIntensity: 0.3 });
    const drumBase = cyl(1.15, 1.25, 0.16, drumM, 0, -0.08, 0, 24);
    const goldRim = cyl(1.18, 1.18, 0.03, goldM, 0, 0.01, 0, 24);
    const sunRing = shadowed(new THREE.Mesh(new THREE.RingGeometry(0.7, 0.95, 24), goldM));
    sunRing.position.y = 0.02;
    sunRing.rotation.x = -Math.PI / 2;

    this.platform.add(drumBase, goldRim, sunRing);
    this.holder.add(this.platform);
    this.scene.add(this.holder);

    // Camera căn chỉnh ôm trọn toàn thân tướng từ đầu tới chân cân đối trên dưới
    this.camera.fov = 36;
    this.camera.position.set(0, 1.05, 4.35);
    this.camera.lookAt(0, 1.02, 0);
    this.camera.updateProjectionMatrix();

    // Sự kiện kéo chuột để xoay 360 độ
    this.onMouseDownBound = (e) => {
      this.isDragging = true;
      this.lastX = e.clientX;
    };
    this.onMouseMoveBound = (e) => {
      if (!this.isDragging) return;
      const dx = e.clientX - this.lastX;
      this.lastX = e.clientX;
      this.holder.rotation.y += dx * 0.018;
    };
    this.onMouseUpBound = () => {
      this.isDragging = false;
    };

    this.onTouchStartBound = (e) => {
      if (e.touches.length > 0) {
        this.isDragging = true;
        this.lastX = e.touches[0].clientX;
      }
    };
    this.onTouchMoveBound = (e) => {
      if (!this.isDragging || e.touches.length === 0) return;
      const dx = e.touches[0].clientX - this.lastX;
      this.lastX = e.touches[0].clientX;
      this.holder.rotation.y += dx * 0.018;
    };
    this.onTouchEndBound = () => {
      this.isDragging = false;
    };

    canvas.addEventListener('mousedown', this.onMouseDownBound);
    window.addEventListener('mousemove', this.onMouseMoveBound);
    window.addEventListener('mouseup', this.onMouseUpBound);
    canvas.addEventListener('touchstart', this.onTouchStartBound, { passive: true });
    window.addEventListener('touchmove', this.onTouchMoveBound, { passive: true });
    window.addEventListener('touchend', this.onTouchEndBound);

    this.alive = true;
    this.startLoop();
  }

  resize(w: number, h: number): void {
    if (!this.renderer) return;
    this.camera.aspect = w / Math.max(1, h);
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h, false);
  }

  sync(generalId: string, weaponId: string, equipped: Record<GearSlot, string | null>): void {
    const generalChanged = generalId !== this.generalId;
    this.generalId = generalId;
    this.weaponId = weaponId;
    this.equipped = { ...equipped };

    if (generalChanged || !this.rig) {
      const g = GENERALS.find((x) => x.id === generalId) ?? GENERALS[0];
      if (this.rig) {
        this.holder.remove(this.rig.group);
      }
      this.rig = buildHuman(g.look);
      this.rig.group.position.y = 0.02;
      this.holder.add(this.rig.group);

      // Tư thế đứng oai vệ: hai chân mở nhẹ
      this.rig.legL.rotation.z = 0.06;
      this.rig.legR.rotation.z = -0.06;
      // Tay phải cầm vũ khí sẵn sàng
      this.rig.armR.rotation.x = -0.32;
      this.rig.armR.rotation.z = 0.12;
      this.rig.armL.rotation.x = 0.15;
      this.rig.armL.rotation.z = -0.12;

      const currentRig = this.rig;
      applyAvatar(currentRig, generalId, undefined, () => this.rig === currentRig);
    }

    // Gắn vũ khí vào tay phải
    if (this.rig) {
      if (this.weapon) this.rig.hand.remove(this.weapon);
      this.weapon = buildWeaponModel(this.weaponId);
      this.rig.hand.add(this.weapon);

      // Gắn và đồng bộ hóa trang bị 3D (Mũ, Giáp, Giày, Bùa)
      attachGearToRig(this.rig, this.equipped);
    }
  }

  private startLoop(): void {
    const tick = (): void => {
      if (!this.alive) return;
      const dt = this.clock.getDelta();
      const t = this.clock.elapsedTime;

      // Tự động xoay nhẹ nhàng khi người chơi không rê chuột kéo
      if (!this.isDragging) {
        this.holder.rotation.y += dt * 0.32;
      }

      // Hoạt ảnh thở nhè nhẹ của tướng
      if (this.rig) {
        this.rig.torso.position.y = 1.15 + Math.sin(t * 2.2) * 0.012;
        this.rig.head.position.y = 1.8 + Math.sin(t * 2.2) * 0.012;

        // Bùa bay lượn nhẹ quanh người (nếu có bùa)
        const charmNode = this.rig.gearNodes?.charm;
        if (charmNode) {
          charmNode.position.y = Math.sin(t * 3.0) * 0.035;
          charmNode.rotation.y = t * 1.2;
        }
      }

      if (this.renderer) {
        this.renderer.render(this.scene, this.camera);
      }
      this.animId = requestAnimationFrame(tick);
    };
    this.animId = requestAnimationFrame(tick);
  }

  destroy(): void {
    this.alive = false;
    cancelAnimationFrame(this.animId);
    this.canvas.removeEventListener('mousedown', this.onMouseDownBound);
    window.removeEventListener('mousemove', this.onMouseMoveBound);
    window.removeEventListener('mouseup', this.onMouseUpBound);
    this.canvas.removeEventListener('touchstart', this.onTouchStartBound);
    window.removeEventListener('touchmove', this.onTouchMoveBound);
    window.removeEventListener('touchend', this.onTouchEndBound);
    this.scene.environment?.dispose();
    if (this.renderer) {
      this.renderer.dispose();
      this.renderer = null;
    }
  }
}
