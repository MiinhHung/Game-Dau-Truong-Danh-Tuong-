import { GENERALS, WEAPONS } from './data';
import { defaultServerUrl, normalizeServerUrl, type ChatMsg, type NetClient, type PlayerInfo, type RoomInfo, type RoomSummary } from './net';
import { loadoutOf, writeSave, type Save3D } from './save';
import { sfx } from './sfx';
import { escapeHtml } from './ui';

const NAME_KEY = 'honviet_arena3d_name';
const URL_KEY = 'honviet_arena3d_server';

export interface StartInfo {
  hostId: string;
  players: PlayerInfo[];
}

export interface OnlineHooks {
  net: NetClient;
  save: Save3D;
  /** Máy chủ báo bắt đầu trận. */
  onStart(info: StartInfo): void;
  /** Người dùng đóng màn hình trực tuyến để về sảnh chính. */
  onBack(): void;
  /** Chủ phòng thoát giữa trận hoặc mất kết nối khi đang chơi. */
  onAborted(reason: string): void;
}

const $ = <T extends HTMLElement>(id: string): T => document.getElementById(id) as T;

type View = 'connect' | 'hall' | 'room';

/** Màn hình chơi cùng bạn bè: kết nối, sảnh ghép trận có chat, phòng chờ và chat trong trận. */
export class OnlineUI {
  private root = $('online');
  private view: View = 'connect';
  private rooms: RoomSummary[] = [];
  private onlineCount = 0;
  private names: string[] = [];
  private room: RoomInfo | null = null;
  private lobbyChat: ChatMsg[] = [];
  private roomChat: ChatMsg[] = [];
  private notice = '';
  private noticeBad = false;
  private inGame = false;
  private toastTimer = 0;
  private gcTimer = 0;
  private visible = false;
  private board: { name: string; wave: number; kills: number; players: number; general: string }[] = [];

  constructor(private h: OnlineHooks) {
    const net = h.net;
    net.on('welcome', (m) => {
      this.lobbyChat = (m.history as ChatMsg[]) ?? [];
    });
    net.on('board', (m) => {
      this.board = (m.top as typeof this.board) ?? [];
      if (this.view === 'hall') this.updateHall();
    });
    net.on('rooms', (m) => {
      this.rooms = m.rooms as RoomSummary[];
      this.onlineCount = m.online as number;
      this.names = m.names as string[];
      if (this.view === 'hall') this.updateHall();
    });
    net.on('chat', (m) => {
      const c = m as unknown as ChatMsg;
      if (c.scope === 'lobby') {
        this.lobbyChat.push(c);
        if (this.lobbyChat.length > 100) this.lobbyChat.shift();
      } else {
        this.roomChat.push(c);
        if (this.roomChat.length > 100) this.roomChat.shift();
      }
      if (c.from && c.from !== net.name) sfx.chat();
      this.appendChat(c);
      if (this.inGame) this.showGameChat(c);
    });
    net.on('joined', (m) => {
      this.room = m.room as RoomInfo;
      this.roomChat = [];
      this.view = 'room';
      net.send({ t: 'loadout', loadout: loadoutOf(h.save) });
      if (this.visible) this.build();
    });
    net.on('room', (m) => {
      this.room = m.room as RoomInfo;
      if (this.view === 'room' && this.visible) this.updateRoom();
    });
    net.on('left_room', () => {
      this.room = null;
      this.view = 'hall';
      if (this.visible) this.build();
    });
    net.on('error', (m) => this.toast(String(m.msg), true));
    net.on('start', (m) => {
      this.inGame = true;
      this.hide();
      this.h.onStart({ hostId: String(m.hostId), players: m.players as PlayerInfo[] });
    });
    net.on('ended', () => {
      this.inGame = false;
    });
    net.on('closed', (m) => {
      this.inGame = false;
      this.room = null;
      this.view = 'hall';
      this.notice = String(m.reason ?? 'Phòng đã đóng.');
      this.noticeBad = true;
      h.onAborted(this.notice);
    });
    net.onClose((reason) => {
      const was = this.inGame;
      this.inGame = false;
      this.room = null;
      this.view = 'connect';
      this.notice = reason;
      this.noticeBad = true;
      if (was) h.onAborted(reason);
      else if (this.visible) this.build();
    });

    // Chat trong trận: Enter để gõ, Enter để gửi, Esc để đóng
    const input = $<HTMLInputElement>('gc-input');
    window.addEventListener('keydown', (e) => {
      if (!this.inGame) return;
      if (e.code === 'Enter') {
        if (document.activeElement === input) {
          const text = input.value.trim();
          if (text) net.send({ t: 'chat', text });
          input.value = '';
          input.classList.add('hidden');
          input.blur();
        } else if (!(document.activeElement instanceof HTMLInputElement)) {
          input.classList.remove('hidden');
          input.focus();
          $('gamechat').classList.remove('hidden');
          e.preventDefault();
        }
      } else if (e.code === 'Escape' && document.activeElement === input) {
        input.value = '';
        input.classList.add('hidden');
        input.blur();
      }
    });
  }

  /* ---------- Hiển thị ---------- */

  open(): void {
    this.visible = true;
    this.root.classList.remove('hidden');
    if (this.h.net.connected) {
      this.h.net.send({ t: 'loadout', loadout: loadoutOf(this.h.save) });
      if (this.view === 'connect') this.view = this.room ? 'room' : 'hall';
    } else this.view = 'connect';
    this.build();
  }

  hide(): void {
    this.visible = false;
    this.root.classList.add('hidden');
  }

  /** Quay lại phòng chờ sau khi trận kết thúc. */
  showRoom(): void {
    this.inGame = false;
    $('gamechat').classList.add('hidden');
    this.open();
  }

  enterGame(): void {
    this.inGame = true;
    $('gc-log').innerHTML = '';
    $('gamechat').classList.remove('hidden');
  }

  leaveGame(): void {
    this.inGame = false;
    $('gamechat').classList.add('hidden');
    $('gc-input').classList.add('hidden');
  }

  get isConnected(): boolean {
    return this.h.net.connected;
  }

  private showGameChat(c: ChatMsg): void {
    const log = $('gc-log');
    const d = document.createElement('div');
    d.className = c.scope === 'sys' ? 'gc sys' : 'gc';
    d.innerHTML = c.from ? `<b>${escapeHtml(c.from)}:</b> ${escapeHtml(c.text)}` : escapeHtml(c.text);
    log.appendChild(d);
    while (log.childElementCount > 7) log.firstElementChild?.remove();
    $('gamechat').classList.remove('hidden');
    window.setTimeout(() => d.remove(), 12000);
    window.clearTimeout(this.gcTimer);
  }

  private toast(msg: string, bad = false): void {
    const t = document.getElementById('online-toast');
    if (!t) {
      this.notice = msg;
      this.noticeBad = bad;
      return;
    }
    t.textContent = msg;
    t.classList.toggle('bad', bad);
    t.classList.remove('hidden');
    window.clearTimeout(this.toastTimer);
    this.toastTimer = window.setTimeout(() => t.classList.add('hidden'), 3200);
  }

  private build(): void {
    if (this.view === 'connect') this.buildConnect();
    else if (this.view === 'hall') this.buildHall();
    else this.buildRoom();
    if (this.notice) {
      this.toast(this.notice, this.noticeBad);
      this.notice = '';
    }
  }

  /* ---------- Màn kết nối ---------- */

  private buildConnect(): void {
    const name = localStorage.getItem(NAME_KEY) ?? '';
    const url = localStorage.getItem(URL_KEY) ?? '';
    this.root.innerHTML = `
      <header class="top">
        <div class="brand"><b>CHƠI CÙNG BẠN BÈ</b><small>Vào sảnh ghép trận, chat và đánh quái cùng nhau</small></div>
        <div class="top-right"><button class="btn" id="on-back">Quay lại</button></div>
      </header>
      <div class="center-card panel">
        <h2>Kết nối</h2>
        <label class="field">Tên của bạn<input id="on-name" maxlength="16" value="${escapeHtml(name)}" placeholder="Ví dụ: Hùng" autocomplete="off" /></label>
        <label class="field">Địa chỉ máy chủ
          <input id="on-url" value="${escapeHtml(url)}" placeholder="${escapeHtml(defaultServerUrl().replace(/^wss?:\/\//, '').replace(/\/ws$/, ''))}" autocomplete="off" />
        </label>
        <p class="hint-text">Để trống để dùng máy chủ của trang này. Nếu bạn bè chơi cùng bạn, hãy gửi cho họ địa chỉ trang đang mở (ví dụ <b>http://192.168.1.5:5173</b>) rồi cả hai cùng vào sảnh.</p>
        <button class="btn gold big" id="on-go">Kết nối</button>
        <div class="toast hidden" id="online-toast"></div>
      </div>`;
    $('on-back').addEventListener('click', () => this.h.onBack());
    const go = $<HTMLButtonElement>('on-go');
    const nameIn = $<HTMLInputElement>('on-name');
    const submit = async (): Promise<void> => {
      const nm = nameIn.value.trim();
      if (nm.length < 1) return this.toast('Hãy nhập tên của bạn.', true);
      const urlRaw = $<HTMLInputElement>('on-url').value.trim();
      localStorage.setItem(NAME_KEY, nm);
      localStorage.setItem(URL_KEY, urlRaw);
      go.disabled = true;
      go.textContent = 'Đang kết nối...';
      try {
        await this.h.net.connect(normalizeServerUrl(urlRaw), nm, loadoutOf(this.h.save));
        this.view = 'hall';
        this.build();
      } catch (e) {
        go.disabled = false;
        go.textContent = 'Kết nối';
        this.toast((e as Error).message, true);
      }
    };
    go.addEventListener('click', () => void submit());
    nameIn.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') void submit();
    });
    nameIn.focus();
  }

  /* ---------- Sảnh ghép trận ---------- */

  private buildHall(): void {
    this.root.innerHTML = `
      <header class="top">
        <div class="brand"><b>SẢNH GHÉP TRẬN</b><small>Bạn là <span class="me">${escapeHtml(this.h.net.name)}</span></small></div>
        <div class="top-right"><span class="gold-chip" id="on-count"></span><button class="btn" id="on-back">Quay lại</button></div>
      </header>
      <div class="online-grid">
        <section class="panel col">
          <h3>Phòng đang chờ</h3>
          <div class="list" id="room-list"></div>
          <div class="join-box">
            <input id="join-id" maxlength="12" placeholder="Nhập ID phòng" autocomplete="off" />
            <button class="btn gold" id="btn-join">Vào hoặc tạo phòng</button>
          </div>
          <p class="hint-text">Nhập cùng một ID để vào chung phòng với bạn bè. ID chưa có thì phòng mới được tạo.</p>
          <button class="btn big" id="btn-quick">Ghép trận nhanh</button>
        </section>
        <section class="panel col">
          <h3>Chat sảnh</h3>
          <div class="chat-log" id="chat-log"></div>
          <form class="chat-form" id="chat-form"><input id="chat-input" maxlength="200" placeholder="Nhắn cho mọi người trong sảnh" autocomplete="off" /><button class="btn">Gửi</button></form>
        </section>
        <section class="panel col narrow">
          <h3>Đang ở sảnh</h3>
          <div class="who" id="who-list"></div>
          <h3 class="board-title">Bảng xếp hạng</h3>
          <div class="board" id="board-list"></div>
        </section>
      </div>
      <div class="toast hidden" id="online-toast"></div>`;
    $('on-back').addEventListener('click', () => this.h.onBack());
    const join = (): void => {
      const id = $<HTMLInputElement>('join-id').value.trim();
      if (id) this.h.net.send({ t: 'join', id });
    };
    $('btn-join').addEventListener('click', join);
    $('join-id').addEventListener('keydown', (e) => {
      if ((e as KeyboardEvent).key === 'Enter') join();
    });
    $('btn-quick').addEventListener('click', () => this.h.net.send({ t: 'quick' }));
    this.bindChatForm();
    this.updateHall();
    this.renderChat();
  }

  private updateHall(): void {
    const list = document.getElementById('room-list');
    if (!list) return;
    $('on-count').textContent = `${this.onlineCount} người đang trực tuyến`;
    list.innerHTML = this.rooms.length
      ? this.rooms
          .map(
            (r) => `<article class="card"><div class="card-head"><b>Phòng ${escapeHtml(r.id)}</b><small>Chủ phòng: ${escapeHtml(r.host)}</small></div>
            <div class="card-foot"><small>${r.count} / ${r.max} người</small><button class="btn gold" data-room="${escapeHtml(r.id)}">Vào</button></div></article>`,
          )
          .join('')
      : '<p class="empty">Chưa có phòng nào đang chờ. Hãy tạo phòng bằng cách nhập một ID mới.</p>';
    list.querySelectorAll<HTMLButtonElement>('[data-room]').forEach((b) => b.addEventListener('click', () => this.h.net.send({ t: 'join', id: b.dataset.room })));
    const who = document.getElementById('who-list');
    if (who) who.innerHTML = this.names.map((n) => `<div>${escapeHtml(n)}</div>`).join('');
    const bl = document.getElementById('board-list');
    if (bl) {
      bl.innerHTML = this.board.length
        ? this.board
            .map(
              (e, i) =>
                `<div class="brow"><b>${i + 1}</b><span>${escapeHtml(e.name)}<small>${escapeHtml(GENERALS.find((g) => g.id === e.general)?.name ?? '')}${e.players > 1 ? ` · ${e.players} người` : ''}</small></span><em>Màn ${e.wave}<small>${e.kills} quái</small></em></div>`,
            )
            .join('')
        : '<p class="empty">Chưa có ai lên bảng. Chơi cùng bạn bè để ghi tên!</p>';
    }
  }

  /* ---------- Phòng chờ ---------- */

  private buildRoom(): void {
    const r = this.room!;
    this.root.innerHTML = `
      <header class="top">
        <div class="brand"><b>PHÒNG ${escapeHtml(r.id)}</b><small>Gửi ID này cho bạn bè để họ vào cùng</small></div>
        <div class="top-right"><button class="btn gold" id="copy-id">Sao chép ID</button><button class="btn" id="leave">Rời phòng</button></div>
      </header>
      <div class="online-grid room">
        <section class="panel col">
          <h3 id="pl-title">Người chơi</h3>
          <div class="list" id="player-list"></div>
          <div class="loadout">
            <label class="field">Tướng<select id="sel-general"></select></label>
            <label class="field">Vũ khí<select id="sel-weapon"></select></label>
          </div>
          <div class="room-actions" id="room-actions"></div>
        </section>
        <section class="panel col">
          <h3>Chat phòng</h3>
          <div class="chat-log" id="chat-log"></div>
          <form class="chat-form" id="chat-form"><input id="chat-input" maxlength="200" placeholder="Nhắn cho bạn cùng phòng" autocomplete="off" /><button class="btn">Gửi</button></form>
        </section>
      </div>
      <div class="toast hidden" id="online-toast"></div>`;
    $('leave').addEventListener('click', () => this.h.net.send({ t: 'leave' }));
    $('copy-id').addEventListener('click', () => {
      const id = this.room?.id ?? '';
      void navigator.clipboard?.writeText(id).then(
        () => this.toast(`Đã sao chép ID ${id}.`),
        () => this.toast(`ID phòng: ${id}`),
      );
    });
    const sg = $<HTMLSelectElement>('sel-general');
    sg.innerHTML = GENERALS.map((g) => `<option value="${g.id}">${escapeHtml(g.name)}</option>`).join('');
    sg.value = this.h.save.general;
    sg.addEventListener('change', () => {
      this.h.save.general = sg.value;
      writeSave(this.h.save);
      this.h.net.send({ t: 'loadout', loadout: loadoutOf(this.h.save) });
    });
    const sw = $<HTMLSelectElement>('sel-weapon');
    const owned = WEAPONS.filter((w) => w.id in this.h.save.weapons);
    sw.innerHTML = owned.map((w) => `<option value="${w.id}">${escapeHtml(w.name)} +${this.h.save.weapons[w.id]}</option>`).join('');
    sw.value = this.h.save.weapon;
    sw.addEventListener('change', () => {
      this.h.save.weapon = sw.value;
      writeSave(this.h.save);
      this.h.net.send({ t: 'loadout', loadout: loadoutOf(this.h.save) });
    });
    this.bindChatForm();
    this.updateRoom();
    this.renderChat();
  }

  private updateRoom(): void {
    const r = this.room;
    const list = document.getElementById('player-list');
    if (!r || !list) return;
    const myId = this.h.net.id;
    const iAmHost = r.hostId === myId;
    $('pl-title').textContent = `Người chơi (${r.players.length} / ${r.max})`;
    list.innerHTML = r.players
      .map((p) => {
        const g = GENERALS.find((x) => x.id === p.loadout?.general);
        const w = WEAPONS.find((x) => x.id === p.loadout?.weapon);
        const host = p.id === r.hostId;
        return `<article class="card ${p.id === myId ? 'sel' : ''}">
          <div class="card-head"><b>${escapeHtml(p.name)}${p.id === myId ? ' (bạn)' : ''}</b><small>${escapeHtml(g?.name ?? '?')}, ${escapeHtml(w?.name ?? '?')}</small></div>
          <div class="card-foot"><span class="tag ${host ? '' : p.ready ? '' : 'dim'}">${host ? 'Chủ phòng' : p.ready ? 'Sẵn sàng' : 'Chưa sẵn sàng'}</span></div>
        </article>`;
      })
      .join('');
    const actions = $('room-actions');
    const me = r.players.find((p) => p.id === myId);
    if (r.state === 'playing') {
      actions.innerHTML = '<p class="hint-text">Trận đang diễn ra. Chờ chủ phòng đưa mọi người về phòng chờ.</p>';
    } else if (iAmHost) {
      const others = r.players.filter((p) => p.id !== myId);
      const allReady = others.every((p) => p.ready);
      actions.innerHTML = `<button class="btn gold big" id="btn-start" ${allReady ? '' : 'disabled'}>Bắt đầu trận</button>
        <small class="hint-text">${others.length === 0 ? 'Chưa có bạn nào vào phòng. Bạn vẫn có thể bắt đầu chơi một mình.' : allReady ? 'Mọi người đã sẵn sàng.' : 'Chờ các bạn nhấn Sẵn sàng.'}</small>`;
      $('btn-start').addEventListener('click', () => this.h.net.send({ t: 'start' }));
    } else {
      actions.innerHTML = `<button class="btn ${me?.ready ? '' : 'gold'} big" id="btn-ready">${me?.ready ? 'Hủy sẵn sàng' : 'Sẵn sàng'}</button>`;
      $('btn-ready').addEventListener('click', () => this.h.net.send({ t: 'ready', v: !me?.ready }));
    }
  }

  /* ---------- Chat ---------- */

  private bindChatForm(): void {
    const form = $<HTMLFormElement>('chat-form');
    const input = $<HTMLInputElement>('chat-input');
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const text = input.value.trim();
      if (!text) return;
      this.h.net.send({ t: 'chat', text });
      input.value = '';
    });
  }

  private chatHtml(c: ChatMsg): string {
    if (c.scope === 'sys') return `<div class="msg sys">${escapeHtml(c.text)}</div>`;
    const mine = c.from === this.h.net.name;
    return `<div class="msg ${mine ? 'mine' : ''}"><b>${escapeHtml(c.from)}</b> ${escapeHtml(c.text)}</div>`;
  }

  private renderChat(): void {
    const log = document.getElementById('chat-log');
    if (!log) return;
    const src = this.view === 'room' ? this.roomChat : this.lobbyChat;
    log.innerHTML = src.map((c) => this.chatHtml(c)).join('');
    log.scrollTop = log.scrollHeight;
  }

  private appendChat(c: ChatMsg): void {
    const log = document.getElementById('chat-log');
    if (!log || !this.visible) return;
    const inRoomView = this.view === 'room';
    if ((c.scope === 'lobby') === inRoomView) return;
    const stick = log.scrollTop + log.clientHeight >= log.scrollHeight - 30;
    log.insertAdjacentHTML('beforeend', this.chatHtml(c));
    if (stick) log.scrollTop = log.scrollHeight;
  }
}
