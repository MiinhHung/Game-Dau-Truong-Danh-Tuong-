/**
 * Màn hình Loading chuyển cảnh: biểu tượng Trống Đồng xoay, thanh tiến trình, mẹo chiến thuật ngẫu nhiên.
 */

const TIPS = [
  'Quang Trung kết hợp cùng Dép Lào kích hoạt combo "Dép Lửa Tây Sơn" thiêu đốt quái vật.',
  'Kỹ năng phụ (E) hồi chiêu nhanh hơn chiêu cuối, hãy dùng liên tục để kiểm soát thế trận.',
  'Trần Hưng Đạo có chiêu cuối "Thiên Quân Vạn Mã" quét sạch quái cả lượt đi lẫn lượt về.',
  'Nâng cấp vũ khí lên +5 tại cửa hàng để kích hoạt hiệu ứng Thần Khí Tiến Hóa ★.',
  'Nhấn Shift để lướt tức thì, né các đòn tấn công diện rộng hoặc thoát khỏi vòng vây của quái.',
  'Lê Lợi mang Thuận Thiên Kiếm triệu hồi Rồng Vàng, mỗi quái bị hạ rơi gấp đôi số vàng.',
  'Bà Triệu bước vào trạng thái Cuồng Nộ chạy cực nhanh và tạo lốc xoáy gây sát thương diện rộng.',
  'Trưng Trắc sở hữu khả năng bộc phát chí mạng và gọi Voi Trắng cùng Trưng Nhị hỗ chiến.',
  'Ngô Quyền cắm cọc Bạch Đằng làm chậm 60% tốc độ di chuyển của mọi kẻ địch.',
];

const LOBBY_STAGES = [
  { p: 0.15, text: 'Đang khởi tạo tài nguyên đồ họa 3D...' },
  { p: 0.45, text: 'Đang nạp mô hình danh tướng & vũ khí...' },
  { p: 0.75, text: 'Đang chuẩn bị sảnh chờ Điện Kính Thiên...' },
  { p: 0.95, text: 'Chào mừng Đại Vương xuất trận!' },
];

const ARENA_STAGES = [
  { p: 0.15, text: 'Đang nạp bối cảnh chiến trường 3D...' },
  { p: 0.45, text: 'Đang kết nối thần lực danh tướng...' },
  { p: 0.75, text: 'Đang triệu tập binh đoàn quái vật...' },
  { p: 0.95, text: 'Sẵn sàng xung trận!' },
];

export interface LoadingOptions {
  durationMs?: number;
  mode?: 'lobby' | 'arena';
  tipPrefix?: string;
}

export function showLoadingScreen(
  onDone: () => void,
  opts: LoadingOptions | number = {},
): void {
  const options: LoadingOptions = typeof opts === 'number' ? { durationMs: opts } : opts;
  const durationMs = options.durationMs ?? 1300;
  const mode = options.mode ?? 'arena';

  const container = document.getElementById('loading-screen') as HTMLElement | null;
  if (!container) {
    onDone();
    return;
  }
  const root = container;

  const tip = TIPS[Math.floor(Math.random() * TIPS.length)];
  const tipEl = document.getElementById('loading-tip');
  const barEl = document.getElementById('loading-bar-fill');
  const textEl = document.getElementById('loading-text');
  const pctEl = document.getElementById('loading-pct');

  const prefix = options.tipPrefix ?? (mode === 'lobby' ? '💡 Điển tích & Mẹo: ' : '💡 Mẹo chiến đấu: ');
  if (tipEl) tipEl.textContent = `${prefix}${tip}`;

  const stages = mode === 'lobby' ? LOBBY_STAGES : ARENA_STAGES;

  root.classList.remove('hidden', 'fade-out');
  void root.offsetWidth;
  root.classList.add('show');

  const start = performance.now();

  function frame(now: number): void {
    const elapsed = now - start;
    const progress = Math.min(1, elapsed / durationMs);

    // Easing cubic out
    const eased = 1 - Math.pow(1 - progress, 2.2);
    const pct = Math.round(eased * 100);

    if (barEl) barEl.style.width = `${pct}%`;
    if (pctEl) pctEl.textContent = `${pct}%`;

    const stage = stages.slice().reverse().find((s) => eased >= s.p) ?? stages[0];
    if (textEl) textEl.textContent = stage.text;

    if (progress < 1) {
      requestAnimationFrame(frame);
    } else {
      setTimeout(() => {
        root.classList.add('fade-out');
        onDone();
        setTimeout(() => {
          root.classList.add('hidden');
          root.classList.remove('show', 'fade-out');
        }, 400);
      }, 150);
    }
  }

  requestAnimationFrame(frame);
}
