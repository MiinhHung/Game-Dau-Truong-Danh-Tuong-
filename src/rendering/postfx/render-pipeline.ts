import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

/** Thiết lập màu chung cho mọi renderer của game: tone mapping ACES để vùng sáng không bị cháy trắng. */
export function setupToneMapping(renderer: THREE.WebGLRenderer, exposure = 1.05): void {
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = exposure;
}

/**
 * Ánh sáng môi trường (IBL) dựng sẵn từ RoomEnvironment, không cần tệp HDR.
 * Giúp vật liệu kim loại (trống đồng, giáp vàng, vũ khí tiến hóa) có phản chiếu thay vì phẳng lì.
 */
export function createEnvironment(renderer: THREE.WebGLRenderer): THREE.Texture {
  const pmrem = new THREE.PMREMGenerator(renderer);
  const env = new RoomEnvironment();
  const tex = pmrem.fromScene(env, 0.04).texture;
  env.dispose();
  pmrem.dispose();
  return tex;
}

/**
 * Đường render chính: cảnh → bloom (quầng sáng quanh vật phát sáng) → tone mapping.
 * Tắt bloom thì render thẳng như cũ, dành cho máy yếu.
 */
export class RenderPipeline {
  bloomEnabled = true;
  private composer: EffectComposer;
  private renderPass: RenderPass;
  private bloom: UnrealBloomPass;

  constructor(private renderer: THREE.WebGLRenderer) {
    const size = renderer.getSize(new THREE.Vector2());
    const target = new THREE.WebGLRenderTarget(Math.max(1, size.x), Math.max(1, size.y), { type: THREE.HalfFloatType, samples: 4 });
    this.composer = new EffectComposer(renderer, target);
    this.renderPass = new RenderPass(new THREE.Scene(), new THREE.PerspectiveCamera());
    // Ngưỡng cao để chỉ vật phát sáng (lửa, dung nham, ngọc, hiệu ứng chiêu) mới tỏa quầng, nền và nhân vật giữ nguyên độ nét
    this.bloom = new UnrealBloomPass(new THREE.Vector2(size.x, size.y), 0.45, 0.4, 1.0);
    this.composer.addPass(this.renderPass);
    this.composer.addPass(this.bloom);
    this.composer.addPass(new OutputPass());
  }

  setSize(w: number, h: number): void {
    this.composer.setPixelRatio(this.renderer.getPixelRatio());
    this.composer.setSize(w, h);
  }

  render(scene: THREE.Scene, camera: THREE.Camera): void {
    if (!this.bloomEnabled) {
      this.renderer.render(scene, camera);
      return;
    }
    this.renderPass.scene = scene;
    this.renderPass.camera = camera;
    this.composer.render();
  }
}
