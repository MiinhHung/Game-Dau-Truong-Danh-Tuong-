/**
 * Điều khiển cảm ứng cho điện thoại và máy tính bảng: cần điều khiển bên trái để di chuyển, nút đánh, Q, E, lướt ở bên phải.
 * Khi dùng cảm ứng, đòn đánh tự nhắm vào quái gần nhất. Mở ?touch=1 trên URL để bật thử trên máy tính.
 */
export const touch = {
  /** Thiết bị có cảm ứng (hoặc ép bật bằng ?touch=1). */
  enabled: false,
  moveX: 0,
  moveY: 0,
  attack: false,
  q: false,
  e: false,
  dash: false,
  /** Thời điểm (ms) chạm gần nhất, để biết khi nào dùng nhắm tự động thay vì chuột. */
  lastUse: 0,
  onPause: undefined as (() => void) | undefined,
};

let root: HTMLElement | null = null;

function detect(): boolean {
  try {
    return window.matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window || /[?&]touch=1/.test(location.search);
  } catch {
    return false;
  }
}

function hold(el: HTMLElement, set: (down: boolean) => void): void {
  const up = (e: PointerEvent): void => {
    set(false);
    el.classList.remove('down');
    try {
      el.releasePointerCapture(e.pointerId);
    } catch {
      /* đã nhả */
    }
  };
  el.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    touch.lastUse = performance.now();
    set(true);
    el.classList.add('down');
    try {
      el.setPointerCapture(e.pointerId);
    } catch {
      /* bỏ qua */
    }
  });
  el.addEventListener('pointerup', up);
  el.addEventListener('pointercancel', up);
}

function build(): HTMLElement {
  const el = document.createElement('div');
  el.id = 'touch';
  el.className = 'hidden';
  el.innerHTML = `
    <div class="tj" id="tj"><i id="tj-knob"></i></div>
    <button class="tb big" id="tb-atk">Đánh</button>
    <button class="tb" id="tb-q">Q</button>
    <button class="tb" id="tb-e">E</button>
    <button class="tb" id="tb-dash">Lướt</button>
    <button class="tb pause" id="tb-pause">II</button>`;
  document.getElementById('ui')!.appendChild(el);

  const base = el.querySelector<HTMLElement>('#tj')!;
  const knob = el.querySelector<HTMLElement>('#tj-knob')!;
  const R = 52;
  let active = -1;
  const move = (e: PointerEvent): void => {
    const r = base.getBoundingClientRect();
    let dx = e.clientX - (r.left + r.width / 2);
    let dy = e.clientY - (r.top + r.height / 2);
    const len = Math.hypot(dx, dy);
    if (len > R) {
      dx = (dx / len) * R;
      dy = (dy / len) * R;
    }
    knob.style.transform = `translate(${dx}px, ${dy}px)`;
    touch.moveX = Math.abs(dx) < 8 && Math.abs(dy) < 8 ? 0 : dx / R;
    touch.moveY = Math.abs(dx) < 8 && Math.abs(dy) < 8 ? 0 : dy / R;
    touch.lastUse = performance.now();
  };
  base.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    active = e.pointerId;
    try {
      base.setPointerCapture(e.pointerId);
    } catch {
      /* bỏ qua */
    }
    move(e);
  });
  base.addEventListener('pointermove', (e) => {
    if (e.pointerId === active) move(e);
  });
  const end = (e: PointerEvent): void => {
    active = -1;
    touch.moveX = touch.moveY = 0;
    knob.style.transform = '';
    try {
      base.releasePointerCapture(e.pointerId);
    } catch {
      /* đã nhả */
    }
  };
  base.addEventListener('pointerup', end);
  base.addEventListener('pointercancel', end);

  hold(el.querySelector<HTMLElement>('#tb-atk')!, (d) => (touch.attack = d));
  hold(el.querySelector<HTMLElement>('#tb-q')!, (d) => (touch.q = d));
  hold(el.querySelector<HTMLElement>('#tb-e')!, (d) => (touch.e = d));
  hold(el.querySelector<HTMLElement>('#tb-dash')!, (d) => (touch.dash = d));
  el.querySelector('#tb-pause')!.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    touch.onPause?.();
  });
  return el;
}

/** Hiện hoặc ẩn bộ điều khiển cảm ứng (chỉ hiện trên thiết bị có cảm ứng). */
export function showTouch(on: boolean): void {
  if (!touch.enabled && on) touch.enabled = detect();
  if (!touch.enabled) return;
  if (!root) root = build();
  root.classList.toggle('hidden', !on);
  if (!on) {
    touch.moveX = touch.moveY = 0;
    touch.attack = touch.q = touch.e = touch.dash = false;
  }
}
