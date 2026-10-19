import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { FXAAShader } from 'three/examples/jsm/shaders/FXAAShader.js';
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

export interface PipelineOptions {
  /** Số mẫu MSAA của render target khi bật bloom (0 = tắt, rẻ nhất). */
  samples: number;
  /** Tỉ lệ độ phân giải của bloom so với màn hình (bloom mờ nên 0,5 trông gần như y hệt). */
  bloomScale: number;
  /** Khử răng cưa FXAA sau tone mapping: rẻ hơn nhiều so với MSAA trên card đồ họa tích hợp. */
  fxaa: boolean;
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
  private fxaa: ShaderPass;
  private w = 1;
  private h = 1;

  constructor(
    private renderer: THREE.WebGLRenderer,
    private opts: PipelineOptions = { samples: 0, bloomScale: 0.5, fxaa: true },
  ) {
    const size = renderer.getSize(new THREE.Vector2());
    this.w = Math.max(1, size.x);
    this.h = Math.max(1, size.y);
    const target = new THREE.WebGLRenderTarget(this.w, this.h, { type: THREE.HalfFloatType, samples: opts.samples });
    this.composer = new EffectComposer(renderer, target);
    this.renderPass = new RenderPass(new THREE.Scene(), new THREE.PerspectiveCamera());
    // Ngưỡng cao để chỉ vật phát sáng (lửa, dung nham, ngọc, hiệu ứng chiêu) mới tỏa quầng, nền và nhân vật giữ nguyên độ nét
    this.bloom = new UnrealBloomPass(new THREE.Vector2(this.w, this.h), 0.45, 0.4, 1.0);
    this.composer.addPass(this.renderPass);
    this.composer.addPass(this.bloom);
    this.composer.addPass(new OutputPass());
    this.fxaa = new ShaderPass(FXAAShader);
    this.fxaa.enabled = opts.fxaa;
    this.composer.addPass(this.fxaa);
  }

  /** Đổi số mẫu MSAA và độ phân giải bloom (khi đổi mức chất lượng). */
  setOptions(opts: PipelineOptions): void {
    this.opts = opts;
    this.fxaa.enabled = opts.fxaa;
    for (const rt of [this.composer.renderTarget1, this.composer.renderTarget2]) {
      if (rt.samples === opts.samples) continue;
      rt.samples = opts.samples;
      // Số mẫu chỉ áp dụng khi tạo lại bộ đệm GPU
      rt.dispose();
    }
    this.setSize(this.w, this.h);
  }

  setSize(w: number, h: number): void {
    this.w = w;
    this.h = h;
    this.composer.setPixelRatio(this.renderer.getPixelRatio());
    this.composer.setSize(w, h);
    // EffectComposer đặt bloom theo kích thước đầy đủ; thu nhỏ lại vì quầng sáng vốn đã mờ
    const pr = this.renderer.getPixelRatio();
    (this.fxaa.material.uniforms.resolution.value as THREE.Vector2).set(1 / Math.max(1, w * pr), 1 / Math.max(1, h * pr));
    this.bloom.setSize(Math.max(1, Math.round(w * pr * this.opts.bloomScale)), Math.max(1, Math.round(h * pr * this.opts.bloomScale)));
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
