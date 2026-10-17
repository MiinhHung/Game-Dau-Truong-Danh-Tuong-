/**
 * Quản lý biến môi trường và cấu hình mạng của ứng dụng.
 */

/** Máy chủ cố định đặt lúc build (biến VITE_SERVER_URL). Có giá trị thì người chơi không cần nhập địa chỉ. */
export const FIXED_SERVER: string = (import.meta.env.VITE_SERVER_URL as string | undefined)?.trim() ?? '';

/** Kiểm tra chế độ phát triển (dev mode) */
export const IS_DEV: boolean = import.meta.env.DEV;

/** Đường dẫn mặc định của WebSocket endpoint */
export const DEFAULT_WS_PATH = '/ws';

/** Biểu thức chính quy kiểm tra định dạng ID bạn bè (HV-XXXX) */
export const FRIEND_CODE_REGEX = /^HV-[A-Z0-9]{4,6}$/;

/** Lấy URL máy chủ mặc định dựa trên URL hiện tại của trình duyệt */
export function getDefaultServerUrl(): string {
  const proto = location.protocol === 'https:' ? 'wss' : 'ws';
  return `${proto}://${location.host}${DEFAULT_WS_PATH}`;
}

/** Chuẩn hóa địa chỉ người dùng nhập: chấp nhận "192.168.1.5:5173", "http://..." hoặc "ws://...". */
export function normalizeServerUrl(raw: string): string {
  let s = raw.trim();
  if (!s) return getDefaultServerUrl();
  if (/^https?:\/\//i.test(s)) s = s.replace(/^http/i, 'ws');
  if (!/^wss?:\/\//i.test(s)) s = `${location.protocol === 'https:' ? 'wss' : 'ws'}://${s}`;
  try {
    const u = new URL(s);
    if (u.pathname === '/' || u.pathname === '') u.pathname = DEFAULT_WS_PATH;
    return u.toString();
  } catch {
    return getDefaultServerUrl();
  }
}
