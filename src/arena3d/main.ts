import * as THREE from 'three';
import './arena3d.css';
import { Arena, type RunResult } from './arena';
import { GENERALS } from './data';
import { LobbyScene } from './lobby';
import { NetClient, type PlayerInfo } from './net';
import { OnlineUI, type StartInfo } from './online';
import { loadSave, loadoutOf, writeSave } from './save';
import { createHud, hideModal, LobbyUI, showGameOver, showOnlineMenu, showPause } from './ui';

const canvas = document.getElementById('c') as HTMLCanvasElement;
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const save = loadSave();
const hud = createHud();
const lobby = new LobbyScene();
const net = new NetClient();
let mode: 'lobby' | 'arena' = 'lobby';
let paused = false;
let onlineRun = false;
let isHost = false;

const arena = new Arena(
  canvas,
  hud,
  (r: RunResult) => {
    if (onlineRun) net.send({ t: 'score', wave: r.wave, kills: r.kills, players: r.players, general: save.general });
    showGameOver(r, save, {
      onAgain: () => {
        hideModal();
        startRun();
      },
      onLobby: () => toLobby(),
      onRoom: () => backToRoom(),
    });
  },
  () => (paused ? closePause() : openPause()),
);

function syncPreview(): void {
  lobby.setGeneral(save.general);
  lobby.setWeapon(save.weapon);
}

const online = new OnlineUI({
  net,
  save,
  onStart: (info) => startOnlineRun(info),
  onBack: () => {
    online.hide();
    lobbyUi.show();
  },
  onAborted: (reason) => {
    // Chủ phòng thoát hoặc mất kết nối giữa trận
    if (mode === 'arena') {
      arena.stop();
      hud.hide();
      hideModal();
      mode = 'lobby';
      onlineRun = false;
      online.leaveGame();
    }
    syncPreview();
    online.open();
    void reason;
  },
});

const lobbyUi = new LobbyUI({
  save,
  onPlay: () => startRun(),
  onPreview: (kind, id) => {
    if (kind === 'general') lobby.setGeneral(id);
    else lobby.setWeapon(id);
  },
  onLoadout: () => syncPreview(),
  onOnline: () => {
    lobbyUi.hide();
    online.open();
  },
});

/* ---------- Chơi một mình ---------- */

function startRun(): void {
  mode = 'arena';
  paused = false;
  onlineRun = false;
  lobbyUi.hide();
  online.hide();
  hideModal();
  hud.show(GENERALS.find((g) => g.id === save.general)?.name ?? '');
  arena.start(save);
}

/* ---------- Chơi cùng bạn bè ---------- */

function startOnlineRun(info: StartInfo): void {
  mode = 'arena';
  paused = false;
  onlineRun = true;
  const myId = net.id;
  isHost = info.hostId === myId;
  lobbyUi.hide();
  online.hide();
  hideModal();
  hud.show(net.name);
  online.enterGame();
  const players: PlayerInfo[] = info.players.map((p) => ({ id: p.id, name: p.name, loadout: p.id === myId ? loadoutOf(save) : p.loadout }));
  arena.start(save, { role: isHost ? 'host' : 'client', myId, hostId: info.hostId, players, link: { relay: (to, d) => net.relay(to, d) } });
}

net.on('relay', (m) => {
  if (onlineRun && mode === 'arena') arena.onNetMessage(String(m.from), m.d);
});
net.on('left', (m) => {
  if (onlineRun && mode === 'arena') arena.onPlayerLeft(String(m.id));
});

function backToRoom(): void {
  arena.stop();
  hud.hide();
  hideModal();
  mode = 'lobby';
  paused = false;
  onlineRun = false;
  if (isHost) net.send({ t: 'end' });
  syncPreview();
  online.showRoom();
  writeSave(save);
}

function leaveOnline(): void {
  net.send({ t: 'leave' });
  arena.stop();
  hud.hide();
  hideModal();
  mode = 'lobby';
  paused = false;
  onlineRun = false;
  online.leaveGame();
  syncPreview();
  online.open();
}

/* ---------- Chung ---------- */

function toLobby(): void {
  if (onlineRun) net.send({ t: 'leave' });
  arena.stop();
  hideModal();
  hud.hide();
  mode = 'lobby';
  paused = false;
  onlineRun = false;
  online.leaveGame();
  syncPreview();
  lobbyUi.show();
  writeSave(save);
}

function openPause(): void {
  if (mode !== 'arena' || paused) return;
  paused = true;
  if (onlineRun) {
    showOnlineMenu({ onResume: () => closePause(), onLeave: () => leaveOnline() });
    return;
  }
  arena.setPaused(true);
  showPause(save, {
    onResume: () => closePause(),
    onExit: () => toLobby(),
    onLoadout: () => arena.refreshLoadout(),
  });
}

function closePause(): void {
  paused = false;
  hideModal();
  arena.setPaused(false);
}

function resize(): void {
  const w = window.innerWidth;
  const h = window.innerHeight;
  renderer.setSize(w, h, false);
  arena.resize(w, h);
  lobby.resize(w, h);
}
window.addEventListener('resize', resize);
resize();
syncPreview();

const clock = new THREE.Clock();
function loop(): void {
  const dt = clock.getDelta();
  const t = clock.elapsedTime;
  if (mode === 'lobby') {
    lobby.update(dt, t);
    renderer.render(lobby.scene, lobby.camera);
  } else {
    arena.update(dt);
    renderer.render(arena.scene, arena.camera);
  }
  requestAnimationFrame(loop);
}
loop();

// Hỗ trợ kiểm thử trong console
(window as unknown as Record<string, unknown>).__arena = { arena, save, startRun, toLobby, renderer, net, online, lobby };
