import * as THREE from 'three';

/** Tùy chọn cho vật liệu hào quang viền Fresnel. */
export interface FresnelOptions {
  baseColor?: number;
  rimColor?: number;
  power?: number;
  intensity?: number;
  opacity?: number;
  pulseSpeed?: number;
}

/**
 * Tạo ShaderMaterial Fresnel Rim Lighting cho màng chắn bảo vệ, linh thú, hào quang hoàng đế.
 * Giúp mép ngoài phát sáng rực rỡ theo góc nhìn camera, tạo chiều sâu 3D đẳng cấp chuẩn game MOBA.
 */
export function createFresnelMaterial(opts: FresnelOptions = {}): THREE.ShaderMaterial {
  const baseColor = new THREE.Color(opts.baseColor ?? 0xffd700);
  const rimColor = new THREE.Color(opts.rimColor ?? 0xffffff);
  const power = opts.power ?? 2.6;
  const intensity = opts.intensity ?? 1.9;
  const opacity = opts.opacity ?? 0.65;
  const pulseSpeed = opts.pulseSpeed ?? 3.2;

  const vertexShader = `
    varying vec3 vNormal;
    varying vec3 vViewPosition;

    void main() {
      vNormal = normalize(normalMatrix * normal);
      vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
      vViewPosition = -mvPosition.xyz;
      gl_Position = projectionMatrix * mvPosition;
    }
  `;

  const fragmentShader = `
    uniform vec3 uBaseColor;
    uniform vec3 uRimColor;
    uniform float uPower;
    uniform float uIntensity;
    uniform float uOpacity;
    uniform float uTime;
    uniform float uPulseSpeed;

    varying vec3 vNormal;
    varying vec3 vViewPosition;

    void main() {
      vec3 normal = normalize(vNormal);
      vec3 viewDir = normalize(vViewPosition);

      // Công thức Fresnel Rim Lighting: phát sáng mạnh dần về mép ngoài
      float NdotV = max(dot(normal, viewDir), 0.0);
      float fresnel = pow(1.0 - NdotV, uPower) * uIntensity;

      // Nhịp thở hào quang
      float pulse = 1.0 + sin(uTime * uPulseSpeed) * 0.15;
      fresnel *= pulse;

      vec3 finalColor = mix(uBaseColor, uRimColor, clamp(fresnel, 0.0, 1.0));
      float alpha = clamp((NdotV * 0.12 + fresnel * 0.88) * uOpacity, 0.0, 1.0);

      gl_FragColor = vec4(finalColor, alpha);
    }
  `;

  return new THREE.ShaderMaterial({
    uniforms: {
      uBaseColor: { value: baseColor },
      uRimColor: { value: rimColor },
      uPower: { value: power },
      uIntensity: { value: intensity },
      uOpacity: { value: opacity },
      uTime: { value: 0 },
      uPulseSpeed: { value: pulseSpeed },
    },
    vertexShader,
    fragmentShader,
    transparent: true,
    side: THREE.DoubleSide,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
}

