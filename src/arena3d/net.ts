import type { GearSlot } from './data';

/** Cấu hình tướng, vũ khí và trang bị của một người chơi, đủ để tính chỉ số chiến đấu. */
export interface Loadout {
  general: string;
  weapon: string;
  weapons: Record<string, number>;
  equipped: Record<GearSlot, string | null>;
}

export interface PlayerInfo {
  id: string;
  name: string;
  /** ID bạn bè của người chơi. */
  code?: string;
  loadout: Loadout | null;
  ready?: boolean;
}

export interface RoomInfo {
  id: string;
  hostId: string;
  state: 'waiting' | 'playing';
  max: number;
  players: PlayerInfo[];
}

export interface RoomSummary {
  id: string;
  host: string;
  count: number;
  max: number;
  state: string;
}

export interface ChatMsg {
  scope: 'lobby' | 'room' | 'sys';
  from: string;
  text: string;
  at: number;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Msg = { t: string } & Record<string, any>;
type Handler = (m: Msg) => void;

/** Máy chủ cố định đặt lúc build (biến VITE_SERVER_URL). Có giá trị thì người chơi không cần nhập địa chỉ. */
export const FIXED_SERVER: string = (import.meta.env.VITE_SERVER_URL as string | undefined)?.trim() ?? '';

export function defaultServerUrl(): string {
  const proto = location.protocol === 'https:' ? 'wss' : 'ws';
  return `${proto}://${location.host}/ws`;
}

/** Chuẩn hóa địa chỉ người dùng nhập: chấp nhận "192.168.1.5:5173", "http://..." hoặc "ws://...". */
export function normalizeServerUrl(raw: string): string {
  let s = raw.trim();
  if (!s) return defaultServerUrl();
  if (/^https?:\/\//i.test(s)) s = s.replace(/^http/i, 'ws');
  if (!/^wss?:\/\//i.test(s)) s = `${location.protocol === 'https:' ? 'wss' : 'ws'}://${s}`;
  try {
    const u = new URL(s);
    if (u.pathname === '/' || u.pathname === '') u.pathname = '/ws';
    return u.toString();
  } catch {
    return defaultServerUrl();
  }
}

/** Kết nối WebSocket tới máy chủ sảnh, có phân phát tin nhắn theo loại. */
export class NetClient {
  id = '';
  name = '';
  /** ID bạn bè (dạng HV-XXXX) do máy chủ xác nhận. */
  code = '';
  private ws: WebSocket | null = null;
  private handlers = new Map<string, Set<Handler>>();
  private closeHandlers = new Set<(reason: string) => void>();

  get connected(): boolean {
    return !!this.ws && this.ws.readyState === WebSocket.OPEN;
  }

  on(type: string, fn: Handler): () => void {
    let set = this.handlers.get(type);
    if (!set) this.handlers.set(type, (set = new Set()));
    set.add(fn);
    return () => set!.delete(fn);
  }

  onClose(fn: (reason: string) => void): void {
    this.closeHandlers.add(fn);
  }

  connect(url: string, name: string, loadout: Loadout, code = '', timeoutMs = 6000): Promise<void> {
    this.close();
    return new Promise((resolve, reject) => {
      let settled = false;
      let ws: WebSocket;
      try {
        ws = new WebSocket(url);
      } catch {
        reject(new Error('Địa chỉ máy chủ không hợp lệ.'));
        return;
      }
      this.ws = ws;
      const timer = window.setTimeout(() => {
        if (!settled) {
          settled = true;
          ws.close();
          reject(new Error('Hết thời gian chờ. Kiểm tra địa chỉ máy chủ và đảm bảo máy chủ đang chạy.'));
        }
      }, timeoutMs);
      ws.onopen = () => ws.send(JSON.stringify({ t: 'hello', name, loadout, code }));
      ws.onmessage = (ev) => {
        let m: Msg;
        try {
          m = JSON.parse(String(ev.data));
        } catch {
          return;
        }
        if (m.t === 'welcome' && !settled) {
          settled = true;
          window.clearTimeout(timer);
          this.id = m.id;
          this.name = m.name;
          this.code = String(m.code ?? '');
          resolve();
        }
        this.handlers.get(m.t)?.forEach((fn) => fn(m));
      };
      ws.onerror = () => {
        if (!settled) {
          settled = true;
          window.clearTimeout(timer);
          reject(new Error('Không kết nối được máy chủ. Kiểm tra địa chỉ và thử lại.'));
        }
      };
      ws.onclose = () => {
        window.clearTimeout(timer);
        const was = this.ws === ws;
        if (was) this.ws = null;
        if (settled && was) this.closeHandlers.forEach((fn) => fn('Mất kết nối với máy chủ.'));
        else if (!settled) {
          settled = true;
          reject(new Error('Không kết nối được máy chủ.'));
        }
      };
    });
  }

  send(msg: Msg): void {
    if (this.connected) this.ws!.send(JSON.stringify(msg));
  }

  /** Gửi dữ liệu trận: tới chủ phòng, tới mọi người, hoặc tới một người cụ thể. */
  relay(to: 'host' | 'all' | string, d: unknown): void {
    this.send({ t: 'relay', to, d });
  }

  close(): void {
    const ws = this.ws;
    this.ws = null;
    if (ws) {
      ws.onclose = null;
      ws.close();
    }
    this.id = '';
  }
}
