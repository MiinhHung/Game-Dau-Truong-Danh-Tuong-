import * as THREE from 'three';
import './ui/styles/game.css';
import { Arena, type RunResult } from './game/arena';
import { GENERALS } from './domain/data';
import { LobbyScene } from './ui/screens/lobby-scene';
import { NetClient, type PlayerInfo } from './infrastructure/network/net-client';
import { OnlineUI, type StartInfo } from './ui/screens/online-modal';
import { loadSave, loadoutOf, writeSave } from './infrastructure/persistence/save-repository';
import { createHud, hideModal, LobbyUI, showGameOver, showOnlineMenu, showPause } from './ui/screens/hud';
import { showLoadingScreen } from './ui/screens/loading-screen';
import { logger } from './shared/logger';
import { effectiveQuality, saveSettings, settings } from './infrastructure/persistence/settings-repository';
import { createEnvironment, RenderPipeline, setupToneMapping } from './rendering/postfx/render-pipeline';
import { applyQuality, AutoQuality, QUALITY_ORDER, QUALITY_PRESETS, type QualityLevel } from './rendering/postfx/quality';

const canvas = document.getElementById('c') as HTMLCanvasElement;
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
setupToneMapping(renderer);
const pipeline = new RenderPipeline(renderer);
const envMap = createEnvironment(renderer);

const save = loadSave();
const hud = createHud();
const lobby = new LobbyScene();
lobby.scene.environment = envMap;
lobby.scene.environmentIntensity = 0.35;
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
arena.scene.environment = envMap;
arena.scene.environmentIntensity = 0.15;

function syncPreview(): void {
  lobby.setGeneral(save.general);
  lobby.setWeapon(save.weapon);
  lobby.setEquipped(save.equipped);
}

const online = new OnlineUI({
  net,
  save,
  isPlaying: () => mode === 'arena',
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
  lobbyUi.hide();
  online.hide();
  hideModal();
  showLoadingScreen(() => {
    mode = 'arena';
    paused = false;
    onlineRun = false;
    hud.show(GENERALS.find((g) => g.id === save.general)?.name ?? '');
    hud.setGeneral?.(save.general);
    arena.start(save);
    arena.prewarm(renderer, () => pipeline.render(arena.scene, arena.camera));
    autoQuality.reset();
  }, { mode: 'arena', durationMs: 1200 });
}

/* ---------- Chơi cùng bạn bè ---------- */

function startOnlineRun(info: StartInfo): void {
  lobbyUi.hide();
  online.hide();
  hideModal();
  showLoadingScreen(() => {
    mode = 'arena';
    paused = false;
    onlineRun = true;
    const myId = net.id;
    isHost = info.hostId === myId;
    hud.show(net.name);
    hud.setGeneral?.(save.general);
    online.enterGame();
    const players: PlayerInfo[] = info.players.map((p) => ({ id: p.id, name: p.name, loadout: p.id === myId ? loadoutOf(save) : p.loadout }));
    arena.start(save, { role: isHost ? 'host' : 'client', myId, hostId: info.hostId, players, link: { relay: (to, d) => net.relay(to, d) } });
    arena.prewarm(renderer, () => pipeline.render(arena.scene, arena.camera));
    autoQuality.reset();
  }, { mode: 'arena', durationMs: 1200 });
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
    showOnlineMenu(save, { onResume: () => closePause(), onLeave: () => leaveOnline(), onLoadout: () => arena.refreshLoadout() });
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

/* ---------- Chất lượng đồ họa ---------- */

let appliedQuality: QualityLevel | null = null;
const autoQuality = new AutoQuality();

function syncQuality(): void {
  const level = effectiveQuality();
  if (level === appliedQuality) return;
  appliedQuality = level;
  applyQuality(renderer, pipeline, [arena.scene, lobby.scene], level);
  // Đổi mật độ điểm ảnh thì phải đặt lại kích thước bộ đệm
  resize();
  autoQuality.reset();
}

/** Chế độ Tự động: trận đấu chạy dưới ~45 FPS thì hạ một mức và báo cho người chơi. */
function watchFrameRate(dt: number): void {
  if (settings.quality !== 'auto' || mode !== 'arena' || paused) return;
  if (!autoQuality.sample(dt)) return;
  const next = QUALITY_ORDER[QUALITY_ORDER.indexOf(settings.autoLevel) + 1];
  if (!next) return;
  settings.autoLevel = next;
  saveSettings();
  hud.banner('Đã giảm chất lượng đồ họa', `Mức ${QUALITY_PRESETS[next].label} để game chạy mượt hơn (đổi trong Cài đặt)`);
}

function resize(): void {
  const w = window.innerWidth;
  const h = window.innerHeight;
  renderer.setSize(w, h, false);
  pipeline.setSize(w, h);
  arena.resize(w, h);
  lobby.resize(w, h);
}
window.addEventListener('resize', resize);
syncQuality();
syncPreview();

// Màn hình loading khởi tạo đồ họa và tài nguyên trước khi mở sảnh chờ
showLoadingScreen(() => {
  lobbyUi.show();
}, { mode: 'lobby', durationMs: 1400 });

const clock = new THREE.Clock();
function loop(): void {
  const dt = clock.getDelta();
  const t = clock.elapsedTime;
  syncQuality();
  watchFrameRate(dt);
  // Sảnh là cảnh tối nên cần phơi sáng cao hơn; trận đấu có mặt trời mạnh, hạ xuống để màu không bị nhạt
  renderer.toneMappingExposure = mode === 'lobby' ? 1.05 : 0.8;
  if (mode === 'lobby') {
    lobby.update(dt, t);
    pipeline.render(lobby.scene, lobby.camera);
  } else {
    arena.update(dt);
    pipeline.render(arena.scene, arena.camera);
  }
  requestAnimationFrame(loop);
}
loop();

// Hỗ trợ kiểm thử trong console
(window as unknown as Record<string, unknown>).__arena = { arena, save, startRun, toLobby, renderer, net, online, lobby, pipeline, settings };
