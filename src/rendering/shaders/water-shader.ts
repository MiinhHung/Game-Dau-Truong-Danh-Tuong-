import * as THREE from 'three';

/** Tùy chọn cấu hình cho shader mặt nước gợn sóng sinh động. */
export interface WaterShaderOptions {
  colorDeep?: number;
  colorShallow?: number;
  foamColor?: number;
  speed?: number;
  waveFrequency?: number;
  waveHeight?: number;
  opacity?: number;
}

/**
 * Tạo ShaderMaterial mặt nước thời gian thực theo chuẩn GLSL.
 * Mô phỏng chuyển động sóng đa chiều, bọt nước mép bờ suối, phản xạ ánh sáng mặt trời và caustic.
 */
export function createWaterShaderMaterial(opts: WaterShaderOptions = {}): THREE.ShaderMaterial {
  const colorDeep = new THREE.Color(opts.colorDeep ?? 0x0f766e);
  const colorShallow = new THREE.Color(opts.colorShallow ?? 0x2dd4bf);
  const foamColor = new THREE.Color(opts.foamColor ?? 0xffffff);
  const speed = opts.speed ?? 2.4;
  const waveFreq = opts.waveFrequency ?? 5.5;
  const waveHeight = opts.waveHeight ?? 0.07;
  const opacity = opts.opacity ?? 0.82;

  const vertexShader = `
    uniform float uTime;
    uniform float uSpeed;
    uniform float uWaveFreq;
    uniform float uWaveHeight;
    varying vec2 vUv;
    varying vec3 vWorldPos;
    varying vec3 vNormal;

    void main() {
      vUv = uv;
      vec3 pos = position;
      // Sóng gợn dọc theo chiều dòng chảy (trục x) kết hợp sóng giao thoa ngang
      float w1 = sin(pos.x * uWaveFreq * 0.35 + uTime * uSpeed) * cos(pos.y * uWaveFreq * 0.5 + uTime * uSpeed * 0.7);
      float w2 = sin(pos.x * uWaveFreq * 0.75 - uTime * uSpeed * 1.1) * 0.45;
      pos.z += (w1 + w2) * uWaveHeight;

      vWorldPos = (modelMatrix * vec4(pos, 1.0)).xyz;
      vNormal = normalize(normalMatrix * normal);
      gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
    }
  `;

  const fragmentShader = `
    uniform float uTime;
    uniform float uSpeed;
    uniform vec3 uColorDeep;
    uniform vec3 uColorShallow;
    uniform vec3 uFoamColor;
    uniform float uOpacity;
    varying vec2 vUv;
    varying vec3 vWorldPos;
    varying vec3 vNormal;

    // Giả lập gợn sóng nước caustic & bọt nước
    float wavePattern(vec2 p, float time) {
      vec2 k = p * 7.5;
      float f = sin(k.x + time * 3.2) * sin(k.y + time * 2.4);
      f += sin(k.x * 1.6 - time * 2.1) * cos(k.y * 1.7 + time * 1.6) * 0.5;
      return f * 0.5 + 0.5;
    }

    void main() {
      // Dòng chảy trôi dọc UV x
      vec2 flowUv = vUv;
      flowUv.x += uTime * uSpeed * 0.28;

      float wave = wavePattern(flowUv, uTime * 0.6);

      // Hòa trộn giữa màu nước sâu và màu ngọc bích trên đỉnh sóng
      vec3 waterColor = mix(uColorDeep, uColorShallow, wave * 0.75);

      // Viền bọt nước trắng tự nhiên ở mép bờ suối (uv.y gần 0.0 hoặc 1.0)
      float edgeDist = min(vUv.y, 1.0 - vUv.y);
      float edgeFoam = smoothstep(0.14, 0.015, edgeDist) * 0.85;

      // Đốm bọt nước li ti dập dềnh trên đỉnh sóng
      float crestFoam = smoothstep(0.72, 0.94, wave) * 0.6;
      float totalFoam = max(edgeFoam, crestFoam);

      vec3 finalColor = mix(waterColor, uFoamColor, totalFoam);

      // Ánh sáng phản chiếu mặt trời (Specular Glint)
      vec3 lightDir = normalize(vec3(0.45, 0.85, 0.3));
      vec3 viewDir = normalize(cameraPosition - vWorldPos);
      vec3 halfDir = normalize(lightDir + viewDir);
      float spec = pow(max(dot(vNormal, halfDir), 0.0), 32.0);
      finalColor += vec3(1.0, 0.98, 0.92) * spec * 0.45;

      gl_FragColor = vec4(finalColor, uOpacity * (0.8 + totalFoam * 0.2));
    }
  `;

  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uSpeed: { value: speed },
      uWaveFreq: { value: waveFreq },
      uWaveHeight: { value: waveHeight },
      uColorDeep: { value: colorDeep },
      uColorShallow: { value: colorShallow },
      uFoamColor: { value: foamColor },
      uOpacity: { value: opacity },
    },
    vertexShader,
    fragmentShader,
    transparent: true,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
}

