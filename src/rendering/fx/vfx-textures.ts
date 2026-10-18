import * as THREE from 'three';

/**
 * Thư viện sinh Texture VFX động (Canvas-based Procedural Textures).
 * Giải quyết triệt để vấn đề "vuông vuông tròn tròn" (hình khối thô ráp),
 * thay thế bằng các hạt phát quang mềm, vệt chém lưỡi liềm sắc lẹm,
 * ngọn lửa uyển chuyển, sóng xung kích mờ biên và hoa văn Trống Đồng linh thiêng.
 */

// Cache các texture đã sinh để tái sử dụng tối đa, tránh tốn VRAM
const textureCache = new Map<string, THREE.CanvasTexture>();

function createAndCache(key: string, size: number, draw: (ctx: CanvasRenderingContext2D, s: number) => void): THREE.CanvasTexture {
  const existing = textureCache.get(key);
  if (existing) return existing;

  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  draw(ctx, size);

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  textureCache.set(key, tex);
  return tex;
}

/** 1. Đốm sáng phát quang mềm (Soft Glow Particle) - Thay thế cho các khối hộp và quả cầu cứng */
export function getSoftGlowTex(): THREE.CanvasTexture {
  return createAndCache('soft_glow', 128, (ctx, s) => {
    const c = s / 2;
    const grad = ctx.createRadialGradient(c, c, 0, c, c, c);
    grad.addColorStop(0.0, 'rgba(255, 255, 255, 1.0)');
    grad.addColorStop(0.18, 'rgba(255, 250, 235, 0.9)');
    grad.addColorStop(0.45, 'rgba(255, 215, 100, 0.45)');
    grad.addColorStop(0.75, 'rgba(255, 140, 40, 0.12)');
    grad.addColorStop(1.0, 'rgba(255, 100, 0, 0.0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, s, s);
  });
}

/** 2. Sóng xung kích mờ viền (Feathered Shockwave Ring) - Không viền cứng sắc cạnh */
export function getShockwaveRingTex(): THREE.CanvasTexture {
  return createAndCache('shockwave_ring', 256, (ctx, s) => {
    const c = s / 2;
    ctx.clearRect(0, 0, s, s);

    // Vẽ vành đai mềm tỏa dần cả vào trong và ra ngoài
    const outerR = c * 0.94;
    const innerR = c * 0.42;

    const grad = ctx.createRadialGradient(c, c, innerR, c, c, outerR);
    grad.addColorStop(0.0, 'rgba(255, 255, 255, 0.0)');
    grad.addColorStop(0.35, 'rgba(255, 255, 255, 0.4)');
    grad.addColorStop(0.65, 'rgba(255, 255, 255, 1.0)');
    grad.addColorStop(0.85, 'rgba(255, 240, 180, 0.6)');
    grad.addColorStop(1.0, 'rgba(255, 200, 100, 0.0)');

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(c, c, outerR, 0, Math.PI * 2);
    ctx.arc(c, c, innerR, 0, Math.PI * 2, true);
    ctx.fill();
  });
}

/** 3. Vệt chém Lưỡi Liềm (Slash Crescent Arc) - Mép ngoài sắc bén, đuôi mờ dần khí quyển */
export function getSlashArcTex(): THREE.CanvasTexture {
  return createAndCache('slash_arc', 256, (ctx, s) => {
    ctx.clearRect(0, 0, s, s);
    const c = s / 2;

    // Đường cong hình cánh cung uyển chuyển
    ctx.save();
    ctx.translate(c, c);

    const grad = ctx.createRadialGradient(0, 0, s * 0.2, 0, 0, s * 0.46);
    grad.addColorStop(0.0, 'rgba(255, 255, 255, 0.0)');
    grad.addColorStop(0.5, 'rgba(255, 255, 255, 0.2)');
    grad.addColorStop(0.8, 'rgba(255, 255, 255, 0.95)');
    grad.addColorStop(1.0, 'rgba(255, 255, 255, 0.0)');

    ctx.fillStyle = grad;
    ctx.beginPath();
    // Vẽ vệt lưỡi liềm mở từ -110 đến +110 độ
    ctx.arc(0, 0, s * 0.46, -Math.PI * 0.65, Math.PI * 0.65, false);
    ctx.arc(0, 0, s * 0.22, Math.PI * 0.65, -Math.PI * 0.65, true);
    ctx.closePath();
    ctx.fill();

    // Mũi nhọn đao phong hai đầu
    ctx.restore();
  });
}

/** 4. Lưỡi lửa uốn lượn (Flame Tongue Wisp) - Thay thế cho hình chóp nón thô */
export function getFlameWispTex(): THREE.CanvasTexture {
  return createAndCache('flame_wisp', 128, (ctx, s) => {
    ctx.clearRect(0, 0, s, s);
    const grad = ctx.createLinearGradient(0, s, 0, 0);
    grad.addColorStop(0.0, 'rgba(255, 255, 255, 0.95)');
    grad.addColorStop(0.25, 'rgba(255, 220, 60, 0.85)');
    grad.addColorStop(0.65, 'rgba(255, 80, 10, 0.55)');
    grad.addColorStop(0.95, 'rgba(200, 20, 0, 0.15)');
    grad.addColorStop(1.0, 'rgba(120, 0, 0, 0.0)');

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(s * 0.5, 0);
    ctx.bezierCurveTo(s * 0.85, s * 0.4, s * 0.95, s * 0.8, s * 0.5, s);
    ctx.bezierCurveTo(s * 0.05, s * 0.8, s * 0.15, s * 0.4, s * 0.5, 0);
    ctx.fill();
  });
}

/** 5. Cụm khói bồng bềnh (Soft Smoke Puff) - Thay thế cho khối cầu đen */
export function getSmokePuffTex(): THREE.CanvasTexture {
  return createAndCache('smoke_puff', 128, (ctx, s) => {
    ctx.clearRect(0, 0, s, s);
    const c = s / 2;

    const grad = ctx.createRadialGradient(c, c, s * 0.05, c, c, c * 0.92);
    grad.addColorStop(0.0, 'rgba(200, 200, 200, 0.7)');
    grad.addColorStop(0.35, 'rgba(140, 140, 140, 0.45)');
    grad.addColorStop(0.7, 'rgba(70, 70, 70, 0.18)');
    grad.addColorStop(1.0, 'rgba(30, 30, 30, 0.0)');

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(c, c, c * 0.9, 0, Math.PI * 2);
    ctx.fill();
  });
}

/** 6. Dải khí động xé gió (Air Streak Ribbon) - Thay thế cho khối hộp thanh dài */
export function getAirStreakTex(): THREE.CanvasTexture {
  return createAndCache('air_streak', 256, (ctx, s) => {
    ctx.clearRect(0, 0, s, s);
    const grad = ctx.createLinearGradient(0, s / 2, s, s / 2);
    grad.addColorStop(0.0, 'rgba(255, 255, 255, 0.0)');
    grad.addColorStop(0.15, 'rgba(255, 255, 255, 0.45)');
    grad.addColorStop(0.75, 'rgba(255, 255, 255, 0.95)');
    grad.addColorStop(1.0, 'rgba(255, 255, 255, 1.0)');

    ctx.fillStyle = grad;
    // Dải thon gọn về đuôi
    ctx.beginPath();
    ctx.moveTo(s, s * 0.5);
    ctx.lineTo(0, s * 0.42);
    ctx.lineTo(0, s * 0.58);
    ctx.closePath();
    ctx.fill();
  });
}

/** 7. Ngôi sao hào quang 4 cánh (Radiant Star Flare) - Hiệu ứng lấp lánh điểm nhấn */
export function getSparkStarTex(): THREE.CanvasTexture {
  return createAndCache('spark_star', 128, (ctx, s) => {
    ctx.clearRect(0, 0, s, s);
    const c = s / 2;

    const grad = ctx.createRadialGradient(c, c, 0, c, c, s * 0.45);
    grad.addColorStop(0.0, 'rgba(255, 255, 255, 1.0)');
    grad.addColorStop(0.2, 'rgba(255, 240, 200, 0.7)');
    grad.addColorStop(1.0, 'rgba(255, 200, 100, 0.0)');

    ctx.fillStyle = grad;
    // Tia dọc
    ctx.beginPath();
    ctx.moveTo(c, 0);
    ctx.quadraticCurveTo(c, c, s, c);
    ctx.quadraticCurveTo(c, c, c, s);
    ctx.quadraticCurveTo(c, c, 0, c);
    ctx.quadraticCurveTo(c, c, c, 0);
    ctx.fill();
  });
}

/** 8. Bọt nước bắn tung tóe (Water Splash Spray) - Cho Bạch Đằng và Côn Sơn */
export function getWaterSplashTex(): THREE.CanvasTexture {
  return createAndCache('water_splash', 128, (ctx, s) => {
    ctx.clearRect(0, 0, s, s);
    const c = s / 2;

    const grad = ctx.createRadialGradient(c, s * 0.75, 5, c, s * 0.75, s * 0.65);
    grad.addColorStop(0.0, 'rgba(255, 255, 255, 0.95)');
    grad.addColorStop(0.4, 'rgba(186, 230, 253, 0.7)');
    grad.addColorStop(0.8, 'rgba(56, 189, 248, 0.3)');
    grad.addColorStop(1.0, 'rgba(2, 132, 199, 0.0)');

    ctx.fillStyle = grad;
    // Hình vòng hoa nước xòe lên
    ctx.beginPath();
    ctx.arc(c, s * 0.75, s * 0.6, Math.PI * 1.1, Math.PI * 1.9, false);
    ctx.quadraticCurveTo(c, s * 0.5, c, s * 0.75);
    ctx.fill();
  });
}

/** 9. Hoa văn Trống Đồng Đông Sơn cổ thiêng (Sacred Dong Son Mandala) - Cho Lê Lợi, Hai Bà Trưng, Lý Thường Kiệt */
export function getDongSonMandalaTex(): THREE.CanvasTexture {
  return createAndCache('dong_son_mandala', 256, (ctx, s) => {
    ctx.clearRect(0, 0, s, s);
    const c = s / 2;

    ctx.strokeStyle = '#ffd700';
    ctx.fillStyle = '#ffd700';
    ctx.lineWidth = 2.5;

    // 1. Ngôi sao 12 cánh ở tâm (Biểu tượng mặt trời Đông Sơn)
    ctx.beginPath();
    const rays = 12;
    for (let i = 0; i < rays * 2; i++) {
      const r = i % 2 === 0 ? s * 0.22 : s * 0.09;
      const a = (i / (rays * 2)) * Math.PI * 2;
      const x = c + Math.cos(a) * r;
      const y = c + Math.sin(a) * r;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.stroke();

    // 2. Vành tròn đồng tâm thanh thoát
    const rings = [s * 0.26, s * 0.34, s * 0.42, s * 0.47];
    for (const r of rings) {
      ctx.beginPath();
      ctx.arc(c, c, r, 0, Math.PI * 2);
      ctx.stroke();
    }

    // 3. Họa tiết chim Lạc bay ngược chiều kim đồng hồ
    const birds = 8;
    for (let b = 0; b < birds; b++) {
      const ang = (b / birds) * Math.PI * 2;
      const bx = c + Math.cos(ang) * (s * 0.38);
      const by = c + Math.sin(ang) * (s * 0.38);

      ctx.save();
      ctx.translate(bx, by);
      ctx.rotate(ang + Math.PI / 2);
      ctx.beginPath();
      // Thân và cánh chim Lạc cách điệu
      ctx.moveTo(-10, 0);
      ctx.lineTo(8, -4);
      ctx.lineTo(14, 0);
      ctx.lineTo(8, 4);
      ctx.closePath();
      ctx.stroke();
      ctx.restore();
    }
  });
}

/** 10. Bướm ngọc tinh linh (Spirit Butterfly / Petal) - Cho Cồng Mê Linh */
export function getSpiritPetalTex(): THREE.CanvasTexture {
  return createAndCache('spirit_petal', 64, (ctx, s) => {
    ctx.clearRect(0, 0, s, s);
    const c = s / 2;

    const grad = ctx.createRadialGradient(c, c, 2, c, c, c * 0.85);
    grad.addColorStop(0.0, 'rgba(255, 255, 255, 1.0)');
    grad.addColorStop(0.4, 'rgba(110, 231, 183, 0.85)');
    grad.addColorStop(0.85, 'rgba(16, 185, 129, 0.4)');
    grad.addColorStop(1.0, 'rgba(5, 150, 105, 0.0)');

    ctx.fillStyle = grad;
    // Cánh hoa / cánh bướm mềm
    ctx.beginPath();
    ctx.ellipse(c, c, s * 0.4, s * 0.22, Math.PI / 4, 0, Math.PI * 2);
    ctx.fill();
  });
}

/** 11. Đường băng ngắm hướng MOBA (Line Runway Aim Texture) */
export function getLineAimTex(): THREE.CanvasTexture {
  return createAndCache('line_aim_runway', 256, (ctx, s) => {
    ctx.clearRect(0, 0, s, s);
    const c = s / 2;

    // Dải năng lượng mờ 2 bên viền
    const grad = ctx.createLinearGradient(0, 0, s, 0);
    grad.addColorStop(0.0, 'rgba(56, 189, 248, 0.0)');
    grad.addColorStop(0.2, 'rgba(56, 189, 248, 0.35)');
    grad.addColorStop(0.5, 'rgba(255, 255, 255, 0.7)');
    grad.addColorStop(0.8, 'rgba(56, 189, 248, 0.35)');
    grad.addColorStop(1.0, 'rgba(56, 189, 248, 0.0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, s, s);

    // Đường chỉ tâm phát sáng
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.fillRect(c - 2, 0, 4, s);

    // Các mũi tên chỉ hướng dạng chevron hướng lên (+Y)
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.lineWidth = 4;
    for (let y = s * 0.2; y < s * 0.95; y += s * 0.25) {
      ctx.beginPath();
      ctx.moveTo(c - s * 0.22, y + s * 0.08);
      ctx.lineTo(c, y);
      ctx.lineTo(c + s * 0.22, y + s * 0.08);
      ctx.stroke();
    }
  });
}

/** 12. Vòng tròn nhắm mục tiêu MOBA (Circle Target Aim Texture) */
export function getCircleAimTex(): THREE.CanvasTexture {
  return createAndCache('circle_target_aim', 256, (ctx, s) => {
    ctx.clearRect(0, 0, s, s);
    const c = s / 2;

    // Quầng tròn mờ tâm
    const grad = ctx.createRadialGradient(c, c, 0, c, c, c * 0.95);
    grad.addColorStop(0.0, 'rgba(56, 189, 248, 0.25)');
    grad.addColorStop(0.65, 'rgba(56, 189, 248, 0.15)');
    grad.addColorStop(0.85, 'rgba(255, 255, 255, 0.8)');
    grad.addColorStop(0.92, 'rgba(56, 189, 248, 0.6)');
    grad.addColorStop(1.0, 'rgba(56, 189, 248, 0.0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(c, c, c * 0.95, 0, Math.PI * 2);
    ctx.fill();

    // 4 dấu vạch ngắm chữ thập
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3;
    const tickLen = s * 0.12;
    // Trên
    ctx.beginPath(); ctx.moveTo(c, s * 0.02); ctx.lineTo(c, s * 0.02 + tickLen); ctx.stroke();
    // Dưới
    ctx.beginPath(); ctx.moveTo(c, s * 0.98); ctx.lineTo(c, s * 0.98 - tickLen); ctx.stroke();
    // Trái
    ctx.beginPath(); ctx.moveTo(s * 0.02, c); ctx.lineTo(s * 0.02 + tickLen, c); ctx.stroke();
    // Phải
    ctx.beginPath(); ctx.moveTo(s * 0.98, c); ctx.lineTo(s * 0.98 - tickLen, c); ctx.stroke();
  });
}

