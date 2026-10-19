import * as THREE from 'three';
import type { RenderPipeline } from './render-pipeline';

export type QualityLevel = 'high' | 'medium' | 'low';
export type QualitySetting = 'auto' | QualityLevel;

export interface QualityPreset {
  label: string;
  /** Giới hạn mật độ điểm ảnh. Dưới 1 là render nhỏ hơn màn hình rồi phóng lên (tiết kiệm nhất). */
  maxPixelRatio: number;
  bloom: boolean;
  fxaa: boolean;
  shadows: boolean;
  shadowSize: number;
}

/**
 * Đo trên Intel UHD 620 (màn 12, đang giao tranh): độ phân giải và bóng đổ là hai chi phí GPU lớn nhất
 * sau MSAA. Bloom không MSAA và FXAA gần như miễn phí nên giữ ở mức Vừa.
 */
export const QUALITY_PRESETS: Record<QualityLevel, QualityPreset> = {
  high: { label: 'Cao', maxPixelRatio: 1.5, bloom: true, fxaa: true, shadows: true, shadowSize: 2048 },
  medium: { label: 'Vừa', maxPixelRatio: 1, bloom: true, fxaa: true, shadows: true, shadowSize: 1024 },
  low: { label: 'Thấp', maxPixelRatio: 0.75, bloom: false, fxaa: false, shadows: false, shadowSize: 512 },
};

export const QUALITY_ORDER: QualityLevel[] = ['high', 'medium', 'low'];

/** Áp một mức chất lượng cho renderer chính, đường hậu kỳ và các nguồn sáng đổ bóng của từng cảnh. */
export function applyQuality(renderer: THREE.WebGLRenderer, pipeline: RenderPipeline, scenes: THREE.Scene[], level: QualityLevel): void {
  const q = QUALITY_PRESETS[level];
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, q.maxPixelRatio));
  renderer.shadowMap.enabled = q.shadows;
  pipeline.bloomEnabled = q.bloom;
  pipeline.setOptions({ samples: 0, bloomScale: 0.5, fxaa: q.fxaa });
  for (const scene of scenes) {
    scene.traverse((o) => {
      if (!(o instanceof THREE.DirectionalLight || o instanceof THREE.SpotLight)) return;
      const light = o;
      // Đổi castShadow làm three.js dựng lại shader đúng với số bóng đổ hiện có
      light.castShadow = q.shadows;
      if (light.shadow.mapSize.x !== q.shadowSize) {
        light.shadow.mapSize.set(q.shadowSize, q.shadowSize);
        light.shadow.map?.dispose();
        light.shadow.map = null;
      }
    });
  }
}

/**
 * Chế độ Tự động: đo thời gian khung hình thật trong trận, nếu trung bình dưới ~45 FPS suốt một khoảng
 * liên tục khoảng 6 giây thì hạ một mức. Chỉ hạ, không tự nâng, vì màn hình 60Hz giới hạn FPS nên không đo được máy còn dư sức.
 */
export class AutoQuality {
  private sum = 0;
  private frames = 0;
  private warmup = 2;
  private slowWindows = 0;

  constructor(private windowSec = 3, private slowFrameSec = 1 / 45) {}

  /** Gọi khi đổi cảnh hoặc vừa đổi mức: bỏ qua vài giây đầu vì lúc đó hay giật do dựng shader. */
  reset(): void {
    this.sum = 0;
    this.frames = 0;
    this.warmup = 2;
    this.slowWindows = 0;
  }

  /** Trả về true khi nên hạ một mức chất lượng. */
  sample(dt: number): boolean {
    // dt rất lớn là do tab bị ẩn hoặc vừa tạm dừng, không phải máy chậm
    if (dt > 0.25 || document.hidden) return false;
    if (this.warmup > 0) {
      this.warmup -= dt;
      return false;
    }
    this.sum += dt;
    this.frames++;
    if (this.sum < this.windowSec) return false;
    const avg = this.sum / this.frames;
    this.sum = 0;
    this.frames = 0;
    // Cần hai khoảng đo chậm liên tiếp, để một pha giao tranh nặng thoáng qua không làm tụt mức
    this.slowWindows = avg > this.slowFrameSec ? this.slowWindows + 1 : 0;
    if (this.slowWindows < 2) return false;
    this.slowWindows = 0;
    return true;
  }
}
