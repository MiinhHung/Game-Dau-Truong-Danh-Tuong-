import { settings, saveSettings } from './settings';
import { ambience } from './ambience';
import { COMBOS, ESKILLS, EVOLVE, GEARS, GENERALS, MAX_WEAPON_LEVEL, SLOT_LABEL, WEAPONS, comboFor, upgradeCost, type GearSlot, type WeaponKind } from './data';
import type { Hud, RunResult } from './arena';
import type { Save3D } from './save';
import { buyGear, buyWeapon, equipGear, selectGeneral, selectWeapon, unequipSlot, upgradeWeapon, type ShopResult } from './shop';
import { computeStats } from './stats';
import { ACHIEVEMENTS, ensureQuests, pendingAchievements, questGoal, questReward, questText } from './quests';
import { writeSave } from './save';

const $ = <T extends HTMLElement>(id: string): T => document.getElementById(id) as T;

const KIND_LABEL: Record<WeaponKind, string> = {
  slam: 'Cận chiến, đập diện rộng phía trước',
  spin: 'Cận chiến, quét 360 độ',
  boomerang: 'Tầm xa, ném rồi quay về, xuyên quái',
  pierce: 'Tầm xa, bay thẳng xuyên quái',
  bonk: 'Cận chiến, đánh chí mạng',
};

export function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] as string);
}

export function fmt(n: number): string {
  return Math.round(n).toLocaleString('vi-VN');
}

/* ---------- HUD ---------- */

export interface HudApi extends Hud {
  show(name: string): void;
  hide(): void;
}

export function createHud(): HudApi {
  const root = $('hud');
  const hpFill = $('hp-fill');
  const hpText = $('hp-text');
  const bossBox = $('boss');
  const bossName = $('boss-name');
  const bossFill = $('boss-fill');
  const banner = $('banner');
  const pops = $('pop-layer');
  const team = $('hud-team');
  const tags = new Map<string, HTMLDivElement>();
  let bannerTimer = 0;
  const setCd = (id: string, r: number): void => {
    const el = $(id);
    el.style.setProperty('--r', String(Math.max(0, Math.min(1, r))));
    el.classList.toggle('ready', r >= 0.999);
  };
  return {
    show(name) {
      $('hud-name').textContent = name;
      root.classList.remove('hidden');
    },
    hide() {
      root.classList.add('hidden');
      banner.classList.add('hidden');
      bossBox.classList.add('hidden');
    },
    setHp(hp, max) {
      hpFill.style.width = `${Math.max(0, (hp / max) * 100)}%`;
      hpText.textContent = `${Math.ceil(hp)} / ${max}`;
    },
    setWave(t) {
      $('hud-wave').textContent = t;
    },
    setGold(run, total) {
      $('hud-gold').textContent = `Vàng ${fmt(total)}`;
      $('hud-run').textContent = `+${fmt(run)} lượt này`;
    },
    setKills(n) {
      $('hud-kills').textContent = `Hạ ${n} quái`;
    },
    setCooldowns(atk, dash, ult, e) {
      setCd('cd-atk', atk);
      setCd('cd-dash', dash);
      setCd('cd-ult', ult);
      setCd('cd-e', e);
    },
    setLoadout(weapon, ult, e) {
      $('cd-atk-name').textContent = weapon;
      $('cd-ult-name').textContent = ult;
      $('cd-e-name').textContent = e;
    },
    setXp(level, ratio) {
      $('xp-fill').style.width = `${Math.max(0, Math.min(1, ratio)) * 100}%`;
      $('xp-text').textContent = `Cấp ${level}`;
    },
    setHazards(text) {
      const el = $('hud-hazard');
      el.textContent = text;
      el.classList.toggle('hidden', !text);
    },
    setCards(text) {
      const el = $('hud-cards');
      el.textContent = text;
      el.classList.toggle('hidden', !text);
    },
    showCards(items, pick) {
      const box = $('cards');
      if (!items) {
        box.classList.add('hidden');
        box.innerHTML = '';
        return;
      }
      box.innerHTML = `<div class="cards-title">Lên cấp! Chọn một thẻ nâng cấp <small>(phím 1, 2, 3 hoặc bấm chuột)</small></div><div class="cards-row">${items
        .map((c, i) => `<button class="upcard" data-i="${i}"><kbd>${i + 1}</kbd><b>${escapeHtml(c.name)}</b><span>${escapeHtml(c.desc)}</span><small>${escapeHtml(c.level)}</small></button>`)
        .join('')}</div>`;
      box.classList.remove('hidden');
      box.querySelectorAll<HTMLButtonElement>('.upcard').forEach((b) => b.addEventListener('click', () => pick(Number(b.dataset.i))));
    },
    setBoss(name, ratio) {
      if (!name) {
        bossBox.classList.add('hidden');
        return;
      }
      bossBox.classList.remove('hidden');
      bossName.textContent = name;
      bossFill.style.width = `${Math.max(0, ratio * 100)}%`;
    },
    banner(text, sub) {
      banner.innerHTML = `<b>${text}</b>${sub ? `<small>${sub}</small>` : ''}`;
      banner.classList.remove('hidden');
      banner.classList.remove('show');
      void banner.offsetWidth;
      banner.classList.add('show');
      window.clearTimeout(bannerTimer);
      bannerTimer = window.setTimeout(() => banner.classList.add('hidden'), 2600);
    },
    pop(x, y, text, cls) {
      if (pops.childElementCount > 40) return;
      const el = document.createElement('div');
      el.className = `pop ${cls}`;
      el.textContent = text;
      el.style.left = `${x}px`;
      el.style.top = `${y}px`;
      pops.appendChild(el);
      window.setTimeout(() => el.remove(), 900);
    },
    hint(text) {
      const h = $('hud-hint');
      h.textContent = text;
      h.classList.toggle('hidden', !text);
    },
    setTeam(rows) {
      if (rows.length < 2) {
        team.classList.add('hidden');
        team.innerHTML = '';
        return;
      }
      team.classList.remove('hidden');
      team.innerHTML = rows
        .map((r) => `<div class="mate ${r.alive ? '' : 'down'} ${r.you ? 'you' : ''}"><span>${escapeHtml(r.name)}${r.you ? ' (bạn)' : ''}</span><div class="mbar"><i style="width:${Math.max(0, (r.hp / r.max) * 100)}%"></i></div></div>`)
        .join('');
    },
    tag(id, text, x, y) {
      let el = tags.get(id);
      if (!text) {
        if (el) el.style.display = 'none';
        return;
      }
      if (!el) {
        el = document.createElement('div');
        el.className = 'nametag';
        pops.appendChild(el);
        tags.set(id, el);
      }
      if (el.textContent !== text) el.textContent = text;
      el.style.display = '';
      el.style.left = `${x}px`;
      el.style.top = `${y}px`;
    },
    clearTags() {
      tags.forEach((el) => el.remove());
      tags.clear();
    },
  };
}

/* ---------- Danh sách tướng, vũ khí, cửa hàng ---------- */

export interface PanelHooks {
  save: Save3D;
  onChange(kind: 'general' | 'weapon' | 'gear' | 'gold', result?: ShopResult): void;
  onPreview?(kind: 'general' | 'weapon', id: string): void;
}

function bar(label: string, ratio: number, text: string): string {
  return `<div class="stat"><span>${label}</span><div class="sbar"><i style="width:${Math.max(4, Math.min(100, ratio * 100))}%"></i></div><b>${text}</b></div>`;
}

export function renderGenerals(el: HTMLElement, h: PanelHooks): void {
  el.innerHTML = GENERALS.map((g) => {
    const sel = h.save.general === g.id;
    return `<article class="card ${sel ? 'sel' : ''}" data-general="${g.id}">
      <div class="card-head"><b>${g.name}</b><small>${g.title}</small></div>
      <p>${g.passive}</p>
      <p class="ult"><b>Chiêu cuối (Q) ${g.ult}:</b> ${g.ultDesc}</p>
      ${ESKILLS[g.id] ? `<p class="ult"><b>Kỹ năng phụ (E) ${ESKILLS[g.id].name}:</b> ${ESKILLS[g.id].desc} Hồi ${ESKILLS[g.id].cd} giây.</p>` : ''}
      <div class="card-foot"><small>Hồi chiêu ${g.ultCd} giây</small>${sel ? '<span class="tag">Đang chọn</span>' : '<button class="btn" data-pick>Chọn</button>'}</div>
    </article>`;
  }).join('');
  el.querySelectorAll<HTMLElement>('[data-general]').forEach((c) => {
    const id = c.dataset.general!;
    c.addEventListener('mouseenter', () => h.onPreview?.('general', id));
    c.addEventListener('click', () => {
      h.onChange('general', selectGeneral(h.save, id));
    });
  });
}

export function renderWeapons(el: HTMLElement, h: PanelHooks): void {
  const s = h.save;
  el.innerHTML = WEAPONS.map((w) => {
    const owned = w.id in s.weapons;
    const lv = s.weapons[w.id] ?? 0;
    const cur = s.weapon === w.id;
    const cost = lv < MAX_WEAPON_LEVEL ? upgradeCost(w, lv) : 0;
    const dmgShow = Math.round(w.dmg * (1 + 0.15 * lv));
    return `<article class="card ${cur ? 'sel' : ''} ${owned ? '' : 'locked'}" data-weapon="${w.id}">
      <div class="card-head"><b>${w.name}${owned ? ` +${lv}` : ''}</b><small>${KIND_LABEL[w.kind]}</small></div>
      <p>${w.desc}</p>
      <p class="evolve ${lv >= MAX_WEAPON_LEVEL ? 'on' : ''}"><b>★ Tiến hóa (+${MAX_WEAPON_LEVEL}):</b> ${EVOLVE[w.id] ?? ''}</p>
      <p class="combo-line">${COMBOS.filter((c) => c.weapon === w.id).map((c) => `<span class="${s.general === c.general ? 'on' : ''}">Combo ${GENERALS.find((g) => g.id === c.general)?.name}: ${c.name}</span>`).join('')}</p>
      <div class="chips"><span>Sát thương ${dmgShow}</span><span>Tốc độ ${(1 / w.cd).toFixed(1)}/giây</span></div>
      <div class="card-foot">
        ${
          owned
            ? `${cur ? '<span class="tag">Đang dùng</span>' : '<button class="btn" data-act="select">Dùng</button>'}
               ${lv >= MAX_WEAPON_LEVEL ? '<span class="tag dim">Tối đa</span>' : `<button class="btn gold" data-act="upgrade" ${s.gold < cost ? 'disabled' : ''}>Nâng cấp ${fmt(cost)}</button>`}`
            : `<button class="btn gold" data-act="buy" ${s.gold < w.price ? 'disabled' : ''}>Mua ${fmt(w.price)} vàng</button>`
        }
      </div>
    </article>`;
  }).join('');
  el.querySelectorAll<HTMLElement>('[data-weapon]').forEach((c) => {
    const id = c.dataset.weapon!;
    c.addEventListener('mouseenter', () => h.onPreview?.('weapon', id));
    c.querySelectorAll<HTMLButtonElement>('[data-act]').forEach((b) =>
      b.addEventListener('click', (e) => {
        e.stopPropagation();
        const act = b.dataset.act;
        const r = act === 'buy' ? buyWeapon(s, id) : act === 'upgrade' ? upgradeWeapon(s, id) : selectWeapon(s, id);
        h.onChange('weapon', r);
      }),
    );
  });
}

export function renderShop(el: HTMLElement, h: PanelHooks): void {
  const s = h.save;
  const slots: GearSlot[] = ['head', 'body', 'feet', 'charm'];
  el.innerHTML = slots
    .map((slot) => {
      const items = GEARS.filter((g) => g.slot === slot);
      return `<h3 class="slot-title">${SLOT_LABEL[slot]}</h3>${items
        .map((g) => {
          const owned = s.ownedGear.includes(g.id);
          const eq = s.equipped[slot] === g.id;
          return `<article class="card ${eq ? 'sel' : ''} ${owned ? '' : 'locked'}" data-gear="${g.id}">
            <div class="card-head"><b>${g.name}</b><small>${g.desc}</small></div>
            <div class="card-foot">
              ${
                owned
                  ? eq
                    ? '<span class="tag">Đang mang</span><button class="btn" data-act="unequip">Tháo</button>'
                    : '<button class="btn" data-act="equip">Mang</button>'
                  : `<button class="btn gold" data-act="buy" ${s.gold < g.price ? 'disabled' : ''}>Mua ${fmt(g.price)} vàng</button>`
              }
            </div>
          </article>`;
        })
        .join('')}`;
    })
    .join('');
  el.querySelectorAll<HTMLElement>('[data-gear]').forEach((c) => {
    const id = c.dataset.gear!;
    const slot = GEARS.find((g) => g.id === id)!.slot;
    c.querySelectorAll<HTMLButtonElement>('[data-act]').forEach((b) =>
      b.addEventListener('click', () => {
        const act = b.dataset.act;
        const r = act === 'buy' ? buyGear(s, id) : act === 'equip' ? equipGear(s, id) : unequipSlot(s, slot);
        h.onChange('gear', r);
      }),
    );
  });
}

export function renderQuests(el: HTMLElement, h: PanelHooks): void {
  const s = h.save;
  ensureQuests(s);
  const quests = s.quests.items
    .map((q, i) => {
      const goal = questGoal(q.id);
      const done = q.progress >= goal;
      const reward = questReward(q.id);
      return `<article class="card quest ${done ? 'sel' : ''}">
        <div class="card-head"><b>${questText(q.id)}</b><small>Thưởng ${fmt(reward)} vàng</small></div>
        <div class="qbar"><i style="width:${Math.min(100, (q.progress / goal) * 100)}%"></i><span>${fmt(q.progress)} / ${fmt(goal)}</span></div>
        <div class="card-foot">${q.claimed ? '<span class="tag">Đã nhận</span>' : done ? `<button class="btn gold" data-claim="${i}">Nhận ${fmt(reward)} vàng</button>` : '<span class="tag dim">Đang làm</span>'}</div>
      </article>`;
    })
    .join('');
  const got = ACHIEVEMENTS.filter((a) => s.achv[a.id]).length;
  const ach = ACHIEVEMENTS.map(
    (a) => `<div class="achv ${s.achv[a.id] ? 'on' : ''}"><span>${s.achv[a.id] ? '★' : '☆'}</span><div><b>${a.name}</b><small>${a.desc} Thưởng ${fmt(a.reward)} vàng.</small></div></div>`,
  ).join('');
  el.innerHTML = `<h3 class="slot-title">Nhiệm vụ hôm nay</h3>${quests}<h3 class="slot-title">Thành tích (${got}/${ACHIEVEMENTS.length})</h3>${ach}`;
  el.querySelectorAll<HTMLButtonElement>('[data-claim]').forEach((b) =>
    b.addEventListener('click', () => {
      const q = s.quests.items[Number(b.dataset.claim)];
      if (!q || q.claimed || q.progress < questGoal(q.id)) return;
      q.claimed = true;
      s.gold += questReward(q.id);
      writeSave(s);
      h.onChange('gold', { ok: true, msg: `Nhận ${fmt(questReward(q.id))} vàng` });
    }),
  );
}

/** Bảng cài đặt: âm lượng hiệu ứng, nhạc nền và độ zoom camera (lưu tự động). */
export function renderSettings(el: HTMLElement): void {
  el.innerHTML = `<h3 class="slot-title">Cài đặt</h3>
    <label class="setrow"><span>Âm hiệu ứng</span><input type="range" min="0" max="100" value="${Math.round(settings.sfx * 100)}" data-set="sfx"><b></b></label>
    <label class="setrow"><span>Nhạc nền</span><input type="range" min="0" max="100" value="${Math.round(settings.music * 100)}" data-set="music"><b></b></label>
    <label class="setrow"><span>Camera xa gần</span><input type="range" min="9" max="36" value="${Math.round(settings.zoom)}" data-set="zoom"><b></b></label>
    <p class="set-note">Trong trận: cuộn chuột để zoom, phím M bật hoặc tắt nhạc nền, Z X C V nhắn nhanh khi chơi cùng bạn bè.</p>`;
  el.querySelectorAll<HTMLInputElement>('[data-set]').forEach((inp) => {
    const key = inp.dataset.set as 'sfx' | 'music' | 'zoom';
    const label = inp.parentElement!.querySelector('b')!;
    const show = (): void => {
      label.textContent = key === 'zoom' ? String(Math.round(settings.zoom)) : `${Math.round(settings[key] * 100)}%`;
    };
    show();
    inp.addEventListener('input', () => {
      const v = Number(inp.value);
      settings[key] = key === 'zoom' ? v : v / 100;
      saveSettings();
      if (key === 'music') ambience.applyVolume();
      show();
    });
  });
}

export function renderStats(el: HTMLElement, save: Save3D): void {
  const st = computeStats(save);
  const w = st.weapon;
  const dmgBase = w.dmg;
  el.innerHTML = `
    <h2>${st.general.name}</h2>
    <small>${st.general.title}</small>
    <p class="passive">${st.general.passive}</p>
    <p class="passive ult"><b>Chiêu cuối (Q) ${st.general.ult}:</b> ${st.general.ultDesc} Hồi chiêu ${st.general.ultCd} giây.</p>
    ${ESKILLS[st.general.id] ? `<p class="passive ult"><b>Kỹ năng phụ (E) ${ESKILLS[st.general.id].name}:</b> ${ESKILLS[st.general.id].desc} Hồi ${ESKILLS[st.general.id].cd} giây.</p>` : ''}
    ${(() => {
      const cb = comboFor(st.general.id, st.weapon.id);
      return cb ? `<p class="passive combo"><b>Combo ${cb.name}:</b> ${cb.desc}</p>` : '';
    })()}
    ${bar('Máu', st.maxHp / 260, fmt(st.maxHp))}
    ${bar('Sát thương', (dmgBase * st.dmgMult) / 140, fmt(dmgBase * st.dmgMult))}
    ${bar('Tốc chạy', st.speed / 10, st.speed.toFixed(1))}
    ${bar('Giảm sát thương', st.reduce / 0.6, `${Math.round(st.reduce * 100)}%`)}
    ${bar('Chí mạng', st.crit / 0.5, `${Math.round(st.crit * 100)}%`)}
    ${bar('Hệ số vàng', (st.goldMult - 1) / 0.5 + 0.06, `x${st.goldMult.toFixed(2)}`)}
    <div class="record">Kỷ lục: màn ${save.bestWave}, đã hạ ${fmt(save.kills)} quái, ${save.runs} lượt chơi</div>`;
}

/* ---------- Sảnh chờ ---------- */

export interface LobbyHooks {
  save: Save3D;
  onPlay(): void;
  onPreview(kind: 'general' | 'weapon', id: string): void;
  onLoadout(): void;
  onOnline(): void;
}

export class LobbyUI {
  private tab: 'general' | 'weapon' | 'shop' | 'quest' | 'setting' = 'general';
  private toastTimer = 0;

  constructor(private h: LobbyHooks) {
    const root = $('lobby');
    root.innerHTML = `
      <header class="top">
        <div class="brand"><b>HỒN VIỆT 3D</b><small>Đấu Trường Danh Tướng</small></div>
        <div class="top-right"><span class="gold-chip" id="lobby-gold"></span></div>
      </header>
      <aside class="panel left">
        <nav class="tabs" id="lobby-tabs">
          <button data-tab="general">Tướng</button><button data-tab="weapon">Vũ khí</button><button data-tab="shop">Cửa hàng</button><button data-tab="quest">Nhiệm vụ</button><button data-tab="setting">Cài đặt</button>
        </nav>
        <div class="list" id="lobby-list"></div>
      </aside>
      <aside class="panel info" id="lobby-info"></aside>
      <div class="play-wrap"><button class="btn big friends" id="online-btn">Chơi cùng bạn bè</button><button class="play" id="play">Vào trận</button><small>Chuột trái hoặc Space: đánh. WASD: di chuyển. Shift: lướt. Q: chiêu cuối. E: kỹ năng phụ (hiện vòng nhắm, bấm chuột trái để tung, E hoặc Esc để hủy). Cuộn chuột: zoom gần xa.</small></div>
      <div class="toast hidden" id="lobby-toast"></div>`;
    root.querySelectorAll<HTMLButtonElement>('#lobby-tabs button').forEach((b) =>
      b.addEventListener('click', () => {
        this.tab = b.dataset.tab as typeof this.tab;
        this.render();
      }),
    );
    $('play').addEventListener('click', () => h.onPlay());
    $('online-btn').addEventListener('click', () => h.onOnline());
    this.render();
  }

  show(): void {
    $('lobby').classList.remove('hidden');
    this.render();
    const msg = pendingAchievements.shift();
    if (msg) {
      this.toast(msg, true);
      pendingAchievements.length = 0;
    }
  }

  hide(): void {
    $('lobby').classList.add('hidden');
  }

  toast(msg: string, ok: boolean): void {
    const t = $('lobby-toast');
    t.textContent = msg;
    t.classList.toggle('bad', !ok);
    t.classList.remove('hidden');
    window.clearTimeout(this.toastTimer);
    this.toastTimer = window.setTimeout(() => t.classList.add('hidden'), 1800);
  }

  render(): void {
    const s = this.h.save;
    $('lobby-gold').textContent = `Vàng ${fmt(s.gold)}`;
    document.querySelectorAll<HTMLButtonElement>('#lobby-tabs button').forEach((b) => b.classList.toggle('on', b.dataset.tab === this.tab));
    const list = $('lobby-list');
    const hooks: PanelHooks = {
      save: s,
      onPreview: (k, id) => this.h.onPreview(k, id),
      onChange: (kind, r) => {
        if (r) this.toast(r.msg, r.ok);
        if (r?.ok) this.h.onLoadout();
        this.render();
      },
    };
    if (this.tab === 'general') renderGenerals(list, hooks);
    else if (this.tab === 'weapon') renderWeapons(list, hooks);
    else if (this.tab === 'quest') renderQuests(list, hooks);
    else if (this.tab === 'setting') renderSettings(list);
    else renderShop(list, hooks);
    renderStats($('lobby-info'), s);
  }
}

/* ---------- Hộp thoại: tạm dừng và kết thúc lượt ---------- */

export function showModal(html: string): HTMLElement {
  const m = $('modal');
  m.innerHTML = `<div class="modal-card">${html}</div>`;
  m.classList.remove('hidden');
  return m.firstElementChild as HTMLElement;
}

export function hideModal(): void {
  const m = $('modal');
  m.classList.add('hidden');
  m.innerHTML = '';
}

export function showPause(save: Save3D, cb: { onResume(): void; onExit(): void; onLoadout(): void }): void {
  let tab: 'weapon' | 'shop' | 'setting' = 'shop';
  const draw = (): void => {
    const card = showModal(`
      <h2>Tạm dừng</h2>
      <div class="gold-chip">Vàng ${fmt(save.gold)}</div>
      <nav class="tabs"><button data-t="shop" class="${tab === 'shop' ? 'on' : ''}">Cửa hàng trang bị</button><button data-t="weapon" class="${tab === 'weapon' ? 'on' : ''}">Vũ khí</button><button data-t="setting" class="${tab === 'setting' ? 'on' : ''}">Cài đặt</button></nav>
      <div class="list modal-list" id="modal-list"></div>
      <div class="modal-actions"><button class="btn big" id="m-resume">Tiếp tục chiến đấu</button><button class="btn" id="m-exit">Về sảnh</button></div>`);
    const list = card.querySelector<HTMLElement>('#modal-list')!;
    const hooks: PanelHooks = {
      save,
      onChange: (_k, r) => {
        if (r?.ok) cb.onLoadout();
        draw();
      },
    };
    if (tab === 'shop') renderShop(list, hooks);
    else if (tab === 'setting') renderSettings(list);
    else renderWeapons(list, hooks);
    card.querySelectorAll<HTMLButtonElement>('[data-t]').forEach((b) =>
      b.addEventListener('click', () => {
        tab = b.dataset.t as typeof tab;
        draw();
      }),
    );
    card.querySelector('#m-resume')!.addEventListener('click', () => cb.onResume());
    card.querySelector('#m-exit')!.addEventListener('click', () => cb.onExit());
  };
  draw();
}

export function showGameOver(r: RunResult, save: Save3D, cb: { onAgain(): void; onLobby(): void; onRoom?(): void }): void {
  if (r.players > 1) return showTeamOver(r, save, cb);
  const card = showModal(`
    <h2>Gục ngã ở màn ${r.wave}</h2>
    <div class="over-grid">
      <div><small>Vàng lượt này</small><b>+${fmt(r.gold)}</b></div>
      <div><small>Quái đã hạ</small><b>${fmt(r.kills)}</b></div>
      <div><small>Kỷ lục màn</small><b>${r.bestWave}</b></div>
      <div><small>Tổng vàng</small><b>${fmt(save.gold)}</b></div>
    </div>
    <p class="over-note">Dùng vàng để mua trang bị ở sảnh rồi quay lại mạnh hơn.</p>
    <div class="modal-actions"><button class="btn big" id="o-again">Chơi lại ngay</button><button class="btn gold" id="o-lobby">Về sảnh mua trang bị</button></div>`);
  card.querySelector('#o-again')!.addEventListener('click', () => cb.onAgain());
  card.querySelector('#o-lobby')!.addEventListener('click', () => cb.onLobby());
}

function showTeamOver(r: RunResult, save: Save3D, cb: { onLobby(): void; onRoom?(): void }): void {
  const card = showModal(`
    <h2>Cả đội gục ngã ở màn ${r.wave}</h2>
    <div class="over-grid">
      <div><small>Vàng của bạn</small><b>+${fmt(r.gold)}</b></div>
      <div><small>Quái cả đội hạ</small><b>${fmt(r.kills)}</b></div>
      <div><small>Kỷ lục màn của bạn</small><b>${r.bestWave}</b></div>
      <div><small>Tổng vàng</small><b>${fmt(save.gold)}</b></div>
    </div>
    <p class="over-note">Trận có ${r.players} người chơi. Vàng bạn nhặt được đã được lưu vào tài khoản của bạn.</p>
    <div class="modal-actions"><button class="btn big" id="o-room">Về phòng chờ</button><button class="btn gold" id="o-lobby">Về sảnh mua trang bị</button></div>`);
  card.querySelector('#o-room')!.addEventListener('click', () => cb.onRoom?.());
  card.querySelector('#o-lobby')!.addEventListener('click', () => cb.onLobby());
}

export function showOnlineMenu(cb: { onResume(): void; onLeave(): void }): void {
  const card = showModal(`
    <h2>Menu</h2>
    <p class="over-note">Trận nhiều người không dừng lại khi bạn mở menu. Dùng phím Enter để chat với đồng đội.</p>
    <div class="modal-actions"><button class="btn big" id="m-resume">Tiếp tục chiến đấu</button><button class="btn" id="m-leave">Rời trận</button></div>`);
  card.querySelector('#m-resume')!.addEventListener('click', () => cb.onResume());
  card.querySelector('#m-leave')!.addEventListener('click', () => cb.onLeave());
}
