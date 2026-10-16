/**
 * Máy chủ sảnh và phòng chơi cho chế độ nhiều người.
 *
 * Máy chủ chỉ làm ba việc: quản lý sảnh chờ (danh sách phòng, chat chung), quản lý phòng
 * (vào bằng ID, ghép trận nhanh, sẵn sàng, bắt đầu), và chuyển tiếp dữ liệu trận đấu giữa
 * các thành viên trong phòng. Toàn bộ mô phỏng trận do người tạo phòng (chủ phòng) chạy.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { WebSocketServer } from 'ws';

const MAX_PLAYERS = 4;
const MAX_CHAT = 200;
const HISTORY = 60;
const WS_PATH = '/ws';
const BOARD_MAX = 30;
const DEFAULT_BOARD_FILE = fileURLToPath(new URL('./data/leaderboard.json', import.meta.url));

const clean = (s, max) => String(s ?? '').replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, max);
const roomIdOf = (s) => clean(s, 12).toUpperCase().replace(/[^A-Z0-9_-]/g, '');

function validLoadout(l) {
  if (!l || typeof l !== 'object') return null;
  const gear = {};
  for (const slot of ['head', 'body', 'feet', 'charm']) {
    const v = l.equipped && l.equipped[slot];
    gear[slot] = typeof v === 'string' ? clean(v, 40) : null;
  }
  const weapons = {};
  if (l.weapons && typeof l.weapons === 'object') {
    for (const [k, v] of Object.entries(l.weapons).slice(0, 20)) weapons[clean(k, 40)] = Math.max(0, Math.min(5, Number(v) | 0));
  }
  return { general: clean(l.general, 40), weapon: clean(l.weapon, 40), weapons, equipped: gear };
}

/**
 * Gắn máy chủ trò chơi vào một http.Server có sẵn (Vite dev server hoặc server tĩnh).
 * Trả về đối tượng có hàm close() và stats().
 * boardFile: nơi lưu bảng xếp hạng (null để chỉ giữ trong bộ nhớ, dùng cho kiểm thử).
 */
export function attachGameServer(httpServer, { path = WS_PATH, log = () => {}, boardFile = DEFAULT_BOARD_FILE } = {}) {
  const wss = new WebSocketServer({ noServer: true, maxPayload: 256 * 1024 });
  const clients = new Map();
  const rooms = new Map();
  const history = [];
  let nextId = 1;

  // Bảng xếp hạng: điểm do máy khách tự báo nên chỉ kiểm tra hợp lý, không chống gian lận triệt để.
  let board = [];
  try {
    if (boardFile) {
      const raw = JSON.parse(readFileSync(boardFile, 'utf8'));
      if (Array.isArray(raw)) {
        board = raw
          .filter((e) => e && typeof e.name === 'string' && Number.isFinite(e.wave) && Number.isFinite(e.kills))
          .map((e) => ({ name: clean(e.name, 16), wave: e.wave | 0, kills: e.kills | 0, players: Math.max(1, Math.min(MAX_PLAYERS, e.players | 0)), general: clean(e.general, 40), at: Number(e.at) || 0 }))
          .slice(0, BOARD_MAX);
      }
    }
  } catch {
    board = [];
  }
  const saveBoard = () => {
    if (!boardFile) return;
    try {
      mkdirSync(dirname(boardFile), { recursive: true });
      writeFileSync(boardFile, JSON.stringify(board));
    } catch (e) {
      log('không lưu được bảng xếp hạng: ' + e.message);
    }
  };
  const topBoard = () => board.slice(0, 10);

  const send = (c, msg) => {
    if (c.ws.readyState === 1) c.ws.send(JSON.stringify(msg));
  };
  const sendAll = (list, msg) => {
    const text = JSON.stringify(msg);
    for (const c of list) if (c.ws.readyState === 1) c.ws.send(text);
  };

  const roomSummary = (r) => ({
    id: r.id,
    host: clients.get(r.hostId)?.name ?? '?',
    count: r.members.length,
    max: MAX_PLAYERS,
    state: r.state,
  });
  const roomDetail = (r) => ({
    id: r.id,
    hostId: r.hostId,
    state: r.state,
    max: MAX_PLAYERS,
    players: r.members.map((id) => {
      const c = clients.get(id);
      return { id, name: c.name, loadout: c.loadout, ready: c.ready };
    }),
  });

  const lobbyClients = () => [...clients.values()].filter((c) => !c.room && c.name);
  const broadcastLobby = () => {
    const list = [...rooms.values()].filter((r) => r.state === 'waiting' && r.members.length < MAX_PLAYERS).map(roomSummary);
    sendAll(lobbyClients(), { t: 'rooms', rooms: list, online: clients.size, names: lobbyClients().map((c) => c.name).slice(0, 60) });
  };
  const broadcastRoom = (r) => sendAll(r.members.map((id) => clients.get(id)), { t: 'room', room: roomDetail(r) });
  const roomChat = (r, from, text, sys = false) =>
    sendAll(r.members.map((id) => clients.get(id)), { t: 'chat', scope: sys ? 'sys' : 'room', from, text, at: Date.now() });

  function leaveRoom(c, reason = '') {
    const r = c.room && rooms.get(c.room);
    c.room = null;
    c.ready = false;
    if (!r) return;
    r.members = r.members.filter((id) => id !== c.id);
    if (r.members.length === 0) {
      rooms.delete(r.id);
    } else if (r.state === 'playing' && r.hostId === c.id) {
      // chủ phòng thoát giữa trận: trận không thể tiếp tục
      for (const id of r.members) {
        const m = clients.get(id);
        m.room = null;
        m.ready = false;
        send(m, { t: 'closed', reason: 'Chủ phòng đã thoát, trận kết thúc.' });
      }
      rooms.delete(r.id);
    } else {
      if (r.hostId === c.id) {
        r.hostId = r.members[0];
        roomChat(r, '', `${clients.get(r.hostId).name} trở thành chủ phòng.`, true);
      }
      if (r.state === 'playing') sendAll(r.members.map((id) => clients.get(id)), { t: 'left', id: c.id });
      roomChat(r, '', `${c.name} đã rời phòng${reason ? ` (${reason})` : ''}.`, true);
      broadcastRoom(r);
    }
    broadcastLobby();
  }

  function joinRoom(c, rawId) {
    const id = roomIdOf(rawId);
    if (id.length < 2) return send(c, { t: 'error', msg: 'ID phòng cần từ 2 đến 12 ký tự chữ hoặc số.' });
    if (c.room) leaveRoom(c);
    let r = rooms.get(id);
    let created = false;
    if (!r) {
      r = { id, hostId: c.id, members: [], state: 'waiting' };
      rooms.set(id, r);
      created = true;
    } else if (r.state !== 'waiting') {
      return send(c, { t: 'error', msg: `Phòng ${id} đang trong trận, chưa thể vào.` });
    } else if (r.members.length >= MAX_PLAYERS) {
      return send(c, { t: 'error', msg: `Phòng ${id} đã đủ ${MAX_PLAYERS} người.` });
    }
    r.members.push(c.id);
    c.room = id;
    c.ready = false;
    send(c, { t: 'joined', created, room: roomDetail(r), you: c.id });
    roomChat(r, '', created ? `${c.name} đã tạo phòng ${id} và là chủ phòng.` : `${c.name} đã vào phòng.`, true);
    broadcastRoom(r);
    broadcastLobby();
  }

  function quickMatch(c) {
    if (c.room) leaveRoom(c);
    const open = [...rooms.values()].filter((r) => r.state === 'waiting' && r.members.length < MAX_PLAYERS && r.quick).sort((a, b) => b.members.length - a.members.length)[0];
    if (open) return joinRoom(c, open.id);
    let id;
    do {
      id = Math.random().toString(36).slice(2, 6).toUpperCase();
    } while (rooms.has(id));
    joinRoom(c, id);
    const r = rooms.get(id);
    if (r) r.quick = true;
  }

  function handle(c, msg) {
    if (!msg || typeof msg !== 'object') return;
    const now = Date.now();
    // Chống spam theo cửa sổ 1 giây: tối đa 30 tin thường và 200 gói dữ liệu trận
    if (now - c.windowAt >= 1000) {
      c.windowAt = now;
      c.count = 0;
      c.relayCount = 0;
    }
    if (msg.t === 'relay') {
      if (++c.relayCount > 200) return;
    } else if (++c.count > 30) return;
    switch (msg.t) {
      case 'hello': {
        c.name = clean(msg.name, 16) || `Khách${c.id}`;
        c.loadout = validLoadout(msg.loadout);
        send(c, { t: 'welcome', id: c.id, name: c.name, history });
        send(c, { t: 'board', top: topBoard() });
        broadcastLobby();
        log(`+ ${c.name} (${c.id})`);
        break;
      }
      case 'loadout': {
        c.loadout = validLoadout(msg.loadout);
        const r = c.room && rooms.get(c.room);
        if (r && r.state === 'waiting') broadcastRoom(r);
        break;
      }
      case 'chat': {
        const text = clean(msg.text, MAX_CHAT);
        if (!text || !c.name) break;
        const r = c.room && rooms.get(c.room);
        if (r) roomChat(r, c.name, text);
        else {
          const m = { t: 'chat', scope: 'lobby', from: c.name, text, at: now };
          history.push(m);
          if (history.length > HISTORY) history.shift();
          sendAll(lobbyClients(), m);
        }
        break;
      }
      case 'score': {
        if (!c.name || now - (c.lastScore ?? 0) < 15000) break;
        const wave = Number(msg.wave) | 0;
        const kills = Number(msg.kills) | 0;
        const players = Number(msg.players) | 0;
        if (!(wave >= 1 && wave <= 9999 && kills >= 0 && kills <= wave * 120 + 200 && players >= 1 && players <= MAX_PLAYERS)) break;
        c.lastScore = now;
        board.push({ name: c.name, wave, kills, players, general: clean(msg.general, 40), at: now });
        board.sort((a, b) => b.wave - a.wave || b.kills - a.kills || a.at - b.at);
        board.length = Math.min(board.length, BOARD_MAX);
        saveBoard();
        sendAll([...clients.values()].filter((x) => x.name), { t: 'board', top: topBoard() });
        break;
      }
      case 'board':
        send(c, { t: 'board', top: topBoard() });
        break;
      case 'join':
        if (c.name) joinRoom(c, msg.id);
        break;
      case 'quick':
        if (c.name) quickMatch(c);
        break;
      case 'leave':
        leaveRoom(c);
        send(c, { t: 'left_room' });
        break;
      case 'ready': {
        const r = c.room && rooms.get(c.room);
        if (!r || r.state !== 'waiting') break;
        c.ready = !!msg.v;
        broadcastRoom(r);
        break;
      }
      case 'start': {
        const r = c.room && rooms.get(c.room);
        if (!r || r.hostId !== c.id || r.state !== 'waiting') break;
        const others = r.members.filter((id) => id !== c.id).map((id) => clients.get(id));
        if (others.some((o) => !o.ready)) return send(c, { t: 'error', msg: 'Còn người chưa sẵn sàng.' });
        r.state = 'playing';
        sendAll(r.members.map((id) => clients.get(id)), { t: 'start', hostId: r.hostId, players: roomDetail(r).players });
        roomChat(r, '', 'Trận đấu bắt đầu!', true);
        broadcastLobby();
        break;
      }
      case 'end': {
        const r = c.room && rooms.get(c.room);
        if (!r || r.hostId !== c.id || r.state !== 'playing') break;
        r.state = 'waiting';
        for (const id of r.members) clients.get(id).ready = false;
        broadcastRoom(r);
        sendAll(r.members.map((id) => clients.get(id)), { t: 'ended' });
        broadcastLobby();
        break;
      }
      case 'relay': {
        const r = c.room && rooms.get(c.room);
        if (!r || r.state !== 'playing') break;
        const out = { t: 'relay', from: c.id, d: msg.d };
        if (msg.to === 'host') {
          if (r.hostId !== c.id) send(clients.get(r.hostId), out);
        } else if (msg.to === 'all') {
          sendAll(r.members.filter((id) => id !== c.id).map((id) => clients.get(id)), out);
        } else if (typeof msg.to === 'string' && r.members.includes(msg.to) && msg.to !== c.id) {
          send(clients.get(msg.to), out);
        }
        break;
      }
      default:
        break;
    }
  }

  wss.on('connection', (ws) => {
    const c = { id: String(nextId++), ws, name: '', room: null, ready: false, loadout: null, alive: true, windowAt: 0, count: 0, relayCount: 0 };
    clients.set(c.id, c);
    ws.on('pong', () => (c.alive = true));
    ws.on('message', (data) => {
      let msg;
      try {
        msg = JSON.parse(String(data));
      } catch {
        return;
      }
      try {
        handle(c, msg);
      } catch (e) {
        log(`lỗi xử lý tin nhắn: ${e.message}`);
      }
    });
    ws.on('close', () => {
      leaveRoom(c, 'mất kết nối');
      clients.delete(c.id);
      if (c.name) log(`- ${c.name} (${c.id})`);
      broadcastLobby();
    });
    ws.on('error', () => {});
  });

  const onUpgrade = (req, socket, head) => {
    let url = '';
    try {
      url = new URL(req.url ?? '', 'http://x').pathname;
    } catch {
      return;
    }
    if (url !== path) return;
    wss.handleUpgrade(req, socket, head, (ws) => wss.emit('connection', ws, req));
  };
  httpServer.on('upgrade', onUpgrade);

  // Bỏ các kết nối đã chết
  const ping = setInterval(() => {
    for (const c of clients.values()) {
      if (!c.alive) {
        c.ws.terminate();
        continue;
      }
      c.alive = false;
      try {
        c.ws.ping();
      } catch {
        /* bỏ qua */
      }
    }
  }, 20000);
  ping.unref?.();

  return {
    close() {
      clearInterval(ping);
      httpServer.off('upgrade', onUpgrade);
      for (const c of clients.values()) c.ws.terminate();
      wss.close();
    },
    stats: () => ({ clients: clients.size, rooms: rooms.size }),
  };
}
