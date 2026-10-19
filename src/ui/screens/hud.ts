import { settings, saveSettings } from '../../infrastructure/persistence/settings-repository';
import { ambience } from '../../infrastructure/audio/ambience-engine';
import { COMBOS, ESKILLS, EVOLVE, GEARS, GENERALS, MAX_WEAPON_LEVEL, SLOT_LABEL, WEAPONS, comboFor, upgradeCost, type GearSlot, type WeaponKind, type General, type Gear } from '../../domain/data';
import type { Hud, RunResult } from '../../game/types';
import { buyGear, buyWeapon, equipGear, selectGeneral, selectWeapon, unequipSlot, upgradeWeapon, type ShopResult } from '../../domain/progression/shop';
import { computeStats } from '../../domain/combat/stats';
import { ACHIEVEMENTS, ensureQuests, pendingAchievements, questGoal, questReward, questText } from '../../domain/progression/quests';
import { writeSave, type Save3D } from '../../infrastructure/persistence/save-repository';
import { ShopHeroStage } from './shop-hero-stage';
import { GENERAL_LORES } from '../../rendering/world/lobby-dioramas';

let activeShopHeroStage: ShopHeroStage | null = null;

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

export function renderGeneralSvg(g: General): string {
  const hex = (c: number): string => '#' + c.toString(16).padStart(6, '0');
  const skin = hex(g.look.skin);
  const hatColor = hex(g.look.hatColor);
  const trimColor = hex(g.look.trim);
  const topColor = hex(g.look.top);
  const ultColor = hex(g.ultColor);

  let iconSvg = '';
  switch (g.id) {
    case 'quang_trung':
      iconSvg = `<path d="M14 26 Q24 14 34 26 Q24 20 14 26" fill="${ultColor}" /><circle cx="24" cy="21" r="2.5" fill="#fff" />`;
      break;
    case 'tran_hung_dao':
      iconSvg = `<path d="M16 20 L32 32 M32 20 L16 32" stroke="${trimColor}" stroke-width="2.5" stroke-linecap="round" />`;
      break;
    case 'le_loi':
      iconSvg = `<path d="M24 15 L24 33 M20 19 L28 19" stroke="${trimColor}" stroke-width="2.5" stroke-linecap="round" />`;
      break;
    case 'hai_ba_trung':
      iconSvg = `<path d="M24 16 C20 22 16 25 16 29 C18 33 30 33 32 29 C32 25 28 22 24 16 Z" fill="${ultColor}" opacity="0.9" />`;
      break;
    case 'ngo_quyen':
      iconSvg = `<path d="M16 31 L20 20 L24 31 L28 20 L32 31" stroke="${ultColor}" stroke-width="2.2" stroke-linejoin="round" fill="none" />`;
      break;
    case 'ba_trieu':
      iconSvg = `<path d="M14 25 Q24 17 34 25 Q24 33 14 25" fill="${ultColor}" />`;
      break;
    case 'nguyen_trai':
      iconSvg = `<path d="M18 18 L30 30 M28 18 L20 30" stroke="#fff" stroke-width="2" />`;
      break;
    case 'phu_dong':
      iconSvg = `<path d="M24 14 L24 34 M20 24 L28 24" stroke="#4ade80" stroke-width="3" stroke-linecap="round" />`;
      break;
    case 'ly_thuong_kiet':
      iconSvg = `<path d="M16 31 L16 22 L20 22 L20 25 L24 25 L24 22 L28 22 L28 25 L32 25 L32 31 Z" fill="${trimColor}" />`;
      break;
    default:
      iconSvg = `<circle cx="24" cy="24" r="7" fill="${trimColor}" />`;
  }

  return `<svg viewBox="0 0 48 48" style="width:100%;height:100%;display:block;" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <radialGradient id="g-bg-${g.id}" cx="50%" cy="40%" r="60%">
        <stop offset="0%" stop-color="${topColor}" />
        <stop offset="100%" stop-color="#100a06" />
      </radialGradient>
    </defs>
    <rect width="48" height="48" fill="url(#g-bg-${g.id})" />
    <circle cx="24" cy="24" r="15" fill="${skin}" opacity="0.25" />
    <path d="M12 44 C12 36 18 32 24 32 C30 32 36 36 36 44 Z" fill="${topColor}" />
    <path d="M14 22 C14 14 20 10 24 10 C28 10 34 14 34 22 C34 23 14 23 14 22 Z" fill="${hatColor}" />
    <path d="M13 22 L35 22" stroke="${trimColor}" stroke-width="2" />
    ${iconSvg}
    <rect x="1" y="1" width="46" height="46" fill="none" stroke="${trimColor}" stroke-width="1.5" opacity="0.6" />
  </svg>`;
}

export function renderGeneralAvatar(g: General): string {
  const fallbackSvg = renderGeneralSvg(g);
  return `<div class="general-avatar-wrap">` +
    `<img src="/avatars/${g.id}.jpeg" alt="${g.name}" class="general-avatar-img general-avatar-${g.id}" ` +
    `onerror="if(!this.dataset.retry){this.dataset.retry='1';this.src='/avatars/${g.id}.png';}else if(this.dataset.retry==='1'){this.dataset.retry='2';this.src='/avatars/${g.id}.jpg';}else if(this.dataset.retry==='2'){this.dataset.retry='3';this.src='/avatars/${g.id}.webp';}else{this.style.display='none';var f=this.nextElementSibling;if(f)f.style.display='block';}" />` +
    `<div class="avatar-fallback" style="display:none;width:100%;height:100%;">${fallbackSvg}</div>` +
    `</div>`;
}

/* ---------- HUD ---------- */

export interface HudApi extends Hud {
  show(name: string): void;
  hide(): void;
  setGeneral?(generalId: string): void;
  setPaused?(p: boolean): void;
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
  let currentWeapon = '';
  let currentUlt = '';
  let currentE = '';
  let prevAtk = 1;
  let prevDash = 1;
  let prevUlt = 1;
  let prevE = 1;
  let isPaused = false;
  let currentOffer: { items: { name: string; desc: string; level: string }[]; pick: (i: number) => void } | null = null;
  let heroCastTimer = 0;
  let castHintTimer = 0;

  const setCd = (id: string, r: number): void => {
    const el = $(id);
    if (!el) return;
    el.style.setProperty('--r', String(Math.max(0, Math.min(1, r))));
    el.classList.toggle('ready', r >= 0.999);
  };

  const triggerCast = (slot: 'atk' | 'dash' | 'ult' | 'e', name: string): void => {
    const el = $(`cd-${slot}`);
    if (el) {
      el.classList.remove('cast-active');
      void el.offsetWidth;
      el.classList.add('cast-active');
      window.setTimeout(() => el.classList.remove('cast-active'), 400);
    }
    const hero = $('hero-frame');
    const hint = $('hero-cast-hint');
    if (hero) {
      hero.classList.remove('casting-atk', 'casting-dash', 'casting-ult', 'casting-e');
      void hero.offsetWidth;
      hero.classList.add(`casting-${slot}`);
      window.clearTimeout(heroCastTimer);
      heroCastTimer = window.setTimeout(() => {
        hero.classList.remove('casting-atk', 'casting-dash', 'casting-ult', 'casting-e');
      }, 500);
    }
    if (hint && name) {
      const prefix = slot === 'ult' ? '★ ' : slot === 'e' ? '🔥 ' : slot === 'dash' ? '⚡ ' : '✦ ';
      hint.textContent = `${prefix}${name}`;
      hint.classList.add('show');
      window.clearTimeout(castHintTimer);
      castHintTimer = window.setTimeout(() => hint.classList.remove('show'), 800);
    }
  };

  // Nút mở/đóng chọn nâng cấp bên trái màn hình
  const sideBtn = $('side-levelup-btn');
  const sidePopover = $('side-levelup-popover');
  if (sideBtn && sidePopover) {
    sideBtn.onclick = (e) => {
      e.stopPropagation();
      if (!currentOffer) return;
      sidePopover.classList.toggle('hidden');
    };
  }

  return {
    show(name) {
      $('hud-name').textContent = name;
      root.classList.remove('hidden');
    },
    hide() {
      root.classList.add('hidden');
      banner.classList.add('hidden');
      bossBox.classList.add('hidden');
      const box = $('cards');
      if (box) {
        box.classList.add('hidden');
        box.classList.remove('paused-hidden');
      }
      const sideWrap = $('side-levelup-wrap');
      if (sideWrap) sideWrap.classList.add('hidden');
      if (sidePopover) sidePopover.classList.add('hidden');
    },
    setHp(hp, max) {
      const pct = `${Math.max(0, (hp / max) * 100)}%`;
      const txt = `${Math.ceil(hp)} / ${max}`;
      if (hpFill) hpFill.style.width = pct;
      if (hpText) hpText.textContent = txt;
      const lolHpFill = $('lol-hp-fill');
      const lolHpText = $('lol-hp-text');
      if (lolHpFill) lolHpFill.style.width = pct;
      if (lolHpText) lolHpText.textContent = txt;
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
    setCooldowns(atk, dash, ult, e, remDash, remUlt, remE) {
      if (prevAtk >= 0.75 && atk < 0.25) triggerCast('atk', currentWeapon || 'Tấn công');
      if (prevDash >= 0.75 && dash < 0.25) triggerCast('dash', 'Lướt');
      if (prevUlt >= 0.75 && ult < 0.25) triggerCast('ult', currentUlt || 'Chiêu cuối');
      if (prevE >= 0.75 && e < 0.25) triggerCast('e', currentE || 'Kỹ năng E');

      prevAtk = atk;
      prevDash = dash;
      prevUlt = ult;
      prevE = e;

      setCd('cd-atk', atk);
      setCd('cd-dash', dash);
      setCd('cd-ult', ult);
      setCd('cd-e', e);

      // Hiển thị số giây hồi chiêu trên các ô kỹ năng
      const dashSec = $('cd-dash-sec');
      if (dashSec) {
        dashSec.textContent = remDash && remDash > 0.05 ? (remDash >= 1 ? `${Math.ceil(remDash)}s` : `${remDash.toFixed(1)}s`) : '';
      }
      const eSec = $('cd-e-sec');
      if (eSec) {
        eSec.textContent = remE && remE > 0.05 ? (remE >= 1 ? `${Math.ceil(remE)}s` : `${remE.toFixed(1)}s`) : '';
      }
      const ultSec = $('cd-ult-sec');
      if (ultSec) {
        ultSec.textContent = remUlt && remUlt > 0.05 ? (remUlt >= 1 ? `${Math.ceil(remUlt)}s` : `${remUlt.toFixed(1)}s`) : '';
      }
    },
    setLoadout(weapon, ult, e) {
      currentWeapon = weapon;
      currentUlt = ult;
      currentE = e;
      const atkEl = $('cd-atk-name');
      const ultEl = $('cd-ult-name');
      const eEl = $('cd-e-name');
      if (atkEl) atkEl.textContent = weapon;
      if (ultEl) ultEl.textContent = ult;
      if (eEl) eEl.textContent = e;
    },
    setGeneral(generalId) {
      const g = GENERALS.find((x) => x.id === generalId);
      if (!g) return;
      const heroName = $('hero-name');
      const heroTitle = $('hero-title');
      const heroAvatar = $('hero-avatar');
      if (heroName) heroName.textContent = g.name;
      if (heroTitle) heroTitle.textContent = g.title;
      if (heroAvatar) heroAvatar.innerHTML = renderGeneralAvatar(g);

      // Avatar tròn phong cách Liên Minh Huyền Thoại
      const lolImg = $<HTMLImageElement>('lol-avatar-img');
      const lolFb = $('lol-avatar-fallback');
      if (lolImg && lolFb) {
        const exts = ['.jpeg', '.png', '.jpg', '.webp'];
        let idx = 0;
        lolImg.onload = () => {
          lolImg.style.display = 'block';
          lolFb.style.display = 'none';
        };
        lolImg.onerror = () => {
          idx++;
          if (idx < exts.length) {
            lolImg.src = `/avatars/${g.id}${exts[idx]}`;
          } else {
            lolImg.style.display = 'none';
            lolFb.style.display = 'flex';
            lolFb.innerHTML = renderGeneralSvg(g);
          }
        };
        lolImg.className = `lol-avatar-img general-avatar-${g.id}`;
        lolImg.style.display = 'block';
        lolFb.style.display = 'none';
        lolImg.src = `/avatars/${g.id}${exts[0]}`;
      }

      // Ảnh các chiêu thức (tự động thử các định dạng .png, .jpeg, .jpg, .webp)
      const loadSkillSlot = (imgId: string, fbId: string, candidateNames: string[]) => {
        const img = $<HTMLImageElement>(imgId);
        const fb = $(fbId);
        if (!img || !fb) return;

        const exts = ['.png', '.jpeg', '.jpg', '.webp'];
        const urls: string[] = [];
        for (const name of candidateNames) {
          for (const ext of exts) {
            urls.push(`/skills/${name}${ext}`);
          }
        }

        let idx = 0;
        img.onload = () => {
          img.style.display = 'block';
          fb.style.display = 'none';
        };
        img.onerror = () => {
          idx++;
          if (idx < urls.length) {
            img.src = urls[idx];
          } else {
            img.style.display = 'none';
            fb.style.display = 'flex';
          }
        };

        img.src = urls[0];
      };

      loadSkillSlot('img-skill-atk', 'fb-skill-atk', [`${g.id}_atk`, 'atk']);
      loadSkillSlot('img-skill-dash', 'fb-skill-dash', [`${g.id}_dash`, 'dash']);
      loadSkillSlot('img-skill-e', 'fb-skill-e', [`${g.id}_e`, 'e']);
      loadSkillSlot('img-skill-ult', 'fb-skill-ult', [`${g.id}_q`, `${g.id}_ult`, 'q', 'ult']);
    },
    setXp(level, ratio) {
      const pct = `${Math.max(0, Math.min(1, ratio)) * 100}%`;
      const xpF = $('xp-fill');
      const xpT = $('xp-text');
      if (xpF) xpF.style.width = pct;
      if (xpT) xpT.textContent = `Cấp ${level}`;

      const lolXpF = $('lol-xp-fill');
      const lolXpT = $('lol-xp-text');
      const lolLvlBadge = $('lol-level-badge');
      if (lolXpF) lolXpF.style.width = pct;
      if (lolXpT) lolXpT.textContent = `Cấp ${level}`;
      if (lolLvlBadge) lolLvlBadge.textContent = String(level);

      const badge = $('hero-lvl-badge');
      if (badge) badge.textContent = `Cấp ${level}`;
    },
    setStats(s) {
      const dmg = $('lol-stat-dmg');
      const atkspd = $('lol-stat-atkspd');
      const def = $('lol-stat-def');
      const crit = $('lol-stat-crit');
      const spd = $('lol-stat-spd');
      const cdr = $('lol-stat-cdr');
      if (dmg) dmg.textContent = String(s.dmg);
      if (atkspd) atkspd.textContent = s.atkSpd.toFixed(2);
      if (def) def.textContent = `${s.def}%`;
      if (crit) crit.textContent = `${s.crit}%`;
      if (spd) spd.textContent = String(s.spd);
      if (cdr) cdr.textContent = `${s.cdr}%`;
    },
    setPendingLevels(count) {
      const sideWrap = $('side-levelup-wrap');
      const sideCount = $('side-levelup-count');
      if (sideWrap && sideCount) {
        if (count > 0) {
          sideWrap.classList.remove('hidden');
          sideCount.textContent = `+${count}`;
        } else if (!currentOffer) {
          sideWrap.classList.add('hidden');
        }
      }
    },
    setHazards(text) {
      const el = $('hud-hazard');
      el.textContent = text;
      el.classList.toggle('hidden', !text);
    },
    setCards(text) {
      const el = $('hud-cards');
      if (el) {
        el.textContent = text;
        el.classList.add('hidden');
      }

      const deck = $('hero-deck');
      if (!deck) return;
      if (!text || !text.trim()) {
        deck.innerHTML = '<span class="deck-empty">Chưa có nâng cấp</span>';
        return;
      }
      const parts = text.split(' · ').map((s) => s.trim()).filter(Boolean);
      deck.innerHTML = parts
        .map((p) => {
          const isCombo = p.startsWith('Combo ');
          const isEvo = p.includes('tiến hóa');
          const icon = isCombo ? '⚡ ' : isEvo ? '✨ ' : '🔰 ';
          const cls = isCombo ? 'combo' : isEvo ? 'evo' : 'card';
          return `<span class="deck-chip ${cls}">${icon}<b>${escapeHtml(p)}</b></span>`;
        })
        .join('');
    },
    showCards(items, pick) {
      const sideWrap = $('side-levelup-wrap');
      const sideCards = $('side-cards-container');
      const sidePopover = $('side-levelup-popover');
      const legacyBox = $('cards');

      if (!items) {
        currentOffer = null;
        if (sidePopover) sidePopover.classList.add('hidden');
        if (legacyBox) {
          legacyBox.classList.add('hidden');
          legacyBox.classList.remove('paused-hidden');
          legacyBox.innerHTML = '';
        }
        return;
      }

      currentOffer = { items, pick };

      // Render sang giao diện widget bên trái màn hình không gây pause game
      if (sideWrap && sideCards && sidePopover) {
        sideWrap.classList.remove('hidden');
        sideCards.innerHTML = items
          .map(
            (c, i) => `
          <button class="side-upcard" data-i="${i}" title="Chọn nâng cấp này">
            <kbd>${i + 1}</kbd>
            <b>${escapeHtml(c.name)}</b>
            <span>${escapeHtml(c.desc)}</span>
            <small>${escapeHtml(c.level)}</small>
          </button>
        `,
          )
          .join('');

        sideCards.querySelectorAll<HTMLButtonElement>('.side-upcard').forEach((b) => {
          b.onclick = (e) => {
            e.stopPropagation();
            sidePopover.classList.add('hidden');
            pick(Number(b.dataset.i));
          };
        });

        // Chỉ hiện nút ô vuông bên cạnh trái, không tự ý bung 3 thẻ để tránh che màn hình khi đang giao tranh
      }
    },
    setPaused(p) {
      isPaused = p;
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
    toggleLevelupPopover() {
      const sideWrap = $('side-levelup-wrap');
      const sidePopover = $('side-levelup-popover');
      if (sideWrap && !sideWrap.classList.contains('hidden') && sidePopover && currentOffer) {
        sidePopover.classList.toggle('hidden');
      }
    },
    isLevelupPopoverOpen() {
      const sideWrap = $('side-levelup-wrap');
      const sidePopover = $('side-levelup-popover');
      return !!(sideWrap && !sideWrap.classList.contains('hidden') && sidePopover && !sidePopover.classList.contains('hidden') && currentOffer);
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
    c.addEventListener('click', () => {
      h.onPreview?.('general', id);
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
    c.querySelectorAll<HTMLButtonElement>('[data-act]').forEach((b) =>
      b.addEventListener('click', (e) => {
        e.stopPropagation();
        const act = b.dataset.act;
        const r = act === 'buy' ? buyWeapon(s, id) : act === 'upgrade' ? upgradeWeapon(s, id) : selectWeapon(s, id);
        h.onPreview?.('weapon', id);
        h.onChange('weapon', r);
      }),
    );
  });
}

export let activeShopTab: 'all' | GearSlot = 'all';

function renderGearIcon(g: Gear): string {
  switch (g.id) {
    case 'non_la':
      return `<svg viewBox="0 0 40 40" width="34" height="34"><polygon points="20,6 4,32 36,32" fill="#d4a359" stroke="#8b5a1a" stroke-width="2"/><line x1="20" y1="6" x2="12" y2="32" stroke="#8b5a1a" stroke-width="1.2"/><line x1="20" y1="6" x2="28" y2="32" stroke="#8b5a1a" stroke-width="1.2"/><ellipse cx="20" cy="32" rx="16" ry="3" fill="#8b5a1a" opacity="0.3"/></svg>`;
    case 'mu_dong':
      return `<svg viewBox="0 0 40 40" width="34" height="34"><path d="M10,24 C10,12 30,12 30,24 L32,32 L8,32 Z" fill="#b87333" stroke="#f0d98a" stroke-width="1.5"/><circle cx="20" cy="18" r="4" fill="#ffd24a"/><path d="M12,24 L28,24" stroke="#5a3818" stroke-width="2"/></svg>`;
    case 'mu_rong':
      return `<svg viewBox="0 0 40 40" width="34" height="34"><path d="M8,14 L12,8 L16,14 L20,6 L24,14 L28,8 L32,14 L30,30 L10,30 Z" fill="#e6b422" stroke="#fffae0" stroke-width="1.5"/><circle cx="20" cy="22" r="5" fill="#e0483a" stroke="#fff" stroke-width="1"/></svg>`;
    case 'ao_tu_than':
      return `<svg viewBox="0 0 40 40" width="34" height="34"><path d="M14,8 L26,8 L32,16 L28,34 L12,34 L8,16 Z" fill="#8b4513" stroke="#d4a359" stroke-width="1.5"/><path d="M16,8 L20,24 L24,8" fill="#e8dcc0"/><path d="M12,24 L28,24" stroke="#c23b30" stroke-width="2.5"/></svg>`;
    case 'giap_tre':
      return `<svg viewBox="0 0 40 40" width="34" height="34"><rect x="10" y="8" width="20" height="24" rx="3" fill="#556b2f" stroke="#8fbc8f" stroke-width="1.5"/><line x1="10" y1="14" x2="30" y2="14" stroke="#8fbc8f" stroke-width="1.5"/><line x1="10" y1="20" x2="30" y2="20" stroke="#8fbc8f" stroke-width="1.5"/><line x1="10" y1="26" x2="30" y2="26" stroke="#8fbc8f" stroke-width="1.5"/><line x1="20" y1="8" x2="20" y2="32" stroke="#2e4210" stroke-width="1.5"/></svg>`;
    case 'giap_long':
      return `<svg viewBox="0 0 40 40" width="34" height="34"><path d="M12,8 L28,8 L33,18 L26,34 L14,34 L7,18 Z" fill="#b22222" stroke="#ffd700" stroke-width="1.8"/><circle cx="20" cy="20" r="6" fill="#ffd700"/><circle cx="20" cy="20" r="3" fill="#b22222"/></svg>`;
    case 'dep_cao_su':
      return `<svg viewBox="0 0 40 40" width="34" height="34"><path d="M12,12 C12,10 20,8 24,12 C28,16 28,28 24,32 C20,34 14,32 12,26 Z" fill="#2b2b2b" stroke="#777" stroke-width="1.5"/><path d="M14,16 Q20,18 24,16" stroke="#c23b30" stroke-width="2.5" fill="none"/><line x1="19" y1="17" x2="19" y2="21" stroke="#c23b30" stroke-width="2.5"/></svg>`;
    case 'giay_gio':
      return `<svg viewBox="0 0 40 40" width="34" height="34"><path d="M10,24 C10,18 16,14 24,16 L28,20 L32,28 L14,28 Z" fill="#4682b4" stroke="#87ceeb" stroke-width="1.5"/><path d="M6,20 Q12,20 16,16" stroke="#87ceeb" stroke-width="2" fill="none"/><path d="M4,24 Q10,24 14,21" stroke="#87ceeb" stroke-width="2" fill="none"/></svg>`;
    case 'hai_than_toc':
      return `<svg viewBox="0 0 40 40" width="34" height="34"><path d="M10,22 C10,16 18,12 26,14 L30,22 L34,26 L12,26 Z" fill="#ffd700" stroke="#fff" stroke-width="1.5"/><polygon points="28,10 32,16 26,16" fill="#ff4500"/><polygon points="32,8 36,14 30,14" fill="#ffd700"/></svg>`;
    case 'bua_may_man':
      return `<svg viewBox="0 0 40 40" width="34" height="34"><rect x="12" y="6" width="16" height="28" rx="2" fill="#c23b30" stroke="#ffd700" stroke-width="1.5"/><circle cx="20" cy="14" r="4" fill="#ffd700"/><path d="M17,22 L23,22 M20,19 L20,28" stroke="#ffd700" stroke-width="2"/></svg>`;
    case 'trong_dong_mini':
      return `<svg viewBox="0 0 40 40" width="34" height="34"><circle cx="20" cy="20" r="14" fill="#b87333" stroke="#ffd700" stroke-width="1.8"/><circle cx="20" cy="20" r="8" fill="none" stroke="#ffd700" stroke-width="1.2"/><polygon points="20,13 22,18 27,20 22,22 20,27 18,22 13,20 18,18" fill="#ffd700"/></svg>`;
    case 'ngoc_rong':
      return `<svg viewBox="0 0 40 40" width="34" height="34"><circle cx="20" cy="20" r="14" fill="#d97706" stroke="#fff" stroke-width="1.5"/><polygon points="20,10 23,17 30,17 24,21 26,28 20,24 14,28 16,21 10,17 17,17" fill="#dc2626"/></svg>`;
    default:
      return `<svg viewBox="0 0 40 40" width="34" height="34"><circle cx="20" cy="20" r="14" fill="#555" stroke="#888" stroke-width="1.5"/></svg>`;
  }
}

function renderSlotSilhouette(slot: GearSlot): string {
  switch (slot) {
    case 'head':
      return `<svg viewBox="0 0 32 32" width="24" height="24"><polygon points="16,6 5,26 27,26" fill="none" stroke="#c8963e" stroke-width="2"/><line x1="16" y1="6" x2="16" y2="26" stroke="#c8963e" stroke-width="1.2" stroke-dasharray="2 2"/></svg>`;
    case 'body':
      return `<svg viewBox="0 0 32 32" width="24" height="24"><path d="M10,6 L22,6 L27,14 L23,26 L9,26 L5,14 Z" fill="none" stroke="#c8963e" stroke-width="2"/><path d="M16,6 L16,26" stroke="#c8963e" stroke-width="1.2" stroke-dasharray="2 2"/></svg>`;
    case 'feet':
      return `<svg viewBox="0 0 32 32" width="24" height="24"><path d="M8,18 C8,12 14,10 20,12 L24,18 L26,22 L10,22 Z" fill="none" stroke="#c8963e" stroke-width="2"/></svg>`;
    case 'charm':
      return `<svg viewBox="0 0 32 32" width="24" height="24"><circle cx="16" cy="16" r="10" fill="none" stroke="#c8963e" stroke-width="2"/><circle cx="16" cy="16" r="4" fill="none" stroke="#c8963e" stroke-width="1.5"/></svg>`;
  }
}

export function renderShop(el: HTMLElement, h: PanelHooks): void {
  const s = h.save;
  const currentGeneral = GENERALS.find((g) => g.id === s.general) ?? GENERALS[0];
  const slots: GearSlot[] = ['head', 'body', 'feet', 'charm'];

  const headGear = s.equipped.head ? GEARS.find((g) => g.id === s.equipped.head) : null;
  const bodyGear = s.equipped.body ? GEARS.find((g) => g.id === s.equipped.body) : null;
  const feetGear = s.equipped.feet ? GEARS.find((g) => g.id === s.equipped.feet) : null;
  const charmGear = s.equipped.charm ? GEARS.find((g) => g.id === s.equipped.charm) : null;

  const bonusHp = headGear?.hp ?? 0;
  const bonusReduce = Math.round((bodyGear?.reduce ?? 0) * 100);
  const bonusSpeed = Math.round((feetGear?.speed ?? 0) * 100);
  const bonusDmg = Math.round((charmGear?.dmg ?? 0) * 100);
  const bonusCrit = Math.round((charmGear?.crit ?? 0) * 100);
  const bonusGold = Math.round((charmGear?.gold ?? 0) * 100);

  const statsPills: string[] = [];
  if (bonusHp > 0) statsPills.push(`<span class="stat-pill hp">❤️ Máu +${bonusHp}</span>`);
  if (bonusReduce > 0) statsPills.push(`<span class="stat-pill def">🛡️ Giảm ST +${bonusReduce}%</span>`);
  if (bonusSpeed > 0) statsPills.push(`<span class="stat-pill spd">👟 Tốc chạy +${bonusSpeed}%</span>`);
  if (bonusDmg > 0) statsPills.push(`<span class="stat-pill dmg">⚔️ Sát thương +${bonusDmg}%</span>`);
  if (bonusCrit > 0) statsPills.push(`<span class="stat-pill crit">🎯 Chí mạng +${bonusCrit}%</span>`);
  if (bonusGold > 0) statsPills.push(`<span class="stat-pill gold">💰 Vàng +${bonusGold}%</span>`);
  if (statsPills.length === 0) statsPills.push(`<span class="stat-pill empty">Chưa kích hoạt chỉ số trang bị</span>`);

  const equippedCount = slots.filter((slot) => !!s.equipped[slot]).length;

  const heroColHtml = `
    <div class="shop-hero-col">
      <div class="shop-hero-stage-card">
        <div class="stage-canvas-wrap">
          <canvas class="shop-hero-canvas" id="shop-hero-canvas" width="280" height="280"></canvas>
          <div class="stage-drag-badge">⟲ Kéo chuột để xoay 360°</div>
        </div>
        <div class="hero-stage-meta">
          <div class="hero-avatar-box-mini">${renderGeneralAvatar(currentGeneral)}</div>
          <div class="hero-stage-text">
            <div class="hero-name-row">
              <b>${currentGeneral.name}</b>
              <span class="hero-slot-count">${equippedCount}/4 món</span>
            </div>
            <small>${currentGeneral.title}</small>
          </div>
        </div>
      </div>
      <div class="gear-summary-box">
        <div class="summary-head">Tổng chỉ số kích hoạt từ trang bị</div>
        <div class="summary-pills">${statsPills.join('')}</div>
      </div>
    </div>`;

  // Right column: Equipment Shop Catalog
  const tabCounts: Record<'all' | GearSlot, number> = {
    all: GEARS.length,
    head: GEARS.filter((g) => g.slot === 'head').length,
    body: GEARS.filter((g) => g.slot === 'body').length,
    feet: GEARS.filter((g) => g.slot === 'feet').length,
    charm: GEARS.filter((g) => g.slot === 'charm').length,
  };

  const tabs: Array<{ id: 'all' | GearSlot; label: string }> = [
    { id: 'all', label: 'Tất cả' },
    { id: 'head', label: 'Mũ' },
    { id: 'body', label: 'Giáp' },
    { id: 'feet', label: 'Giày' },
    { id: 'charm', label: 'Bùa' },
  ];

  const catTabsHtml = tabs
    .map(
      (t) =>
        `<button class="cat-btn ${activeShopTab === t.id ? 'active' : ''}" data-cat="${t.id}">${t.label} <small>(${tabCounts[t.id]})</small></button>`,
    )
    .join('');

  const filteredGears = activeShopTab === 'all' ? GEARS : GEARS.filter((g) => g.slot === activeShopTab);

  const catalogItemsHtml = filteredGears
    .map((g) => {
      const owned = s.ownedGear.includes(g.id);
      const eq = s.equipped[g.slot] === g.id;
      return `<article class="shop-item-card ${eq ? 'is-equipped' : ''} ${owned ? 'is-owned' : ''}" data-gear="${g.id}">
        <div class="item-card-top">
          <div class="item-card-icon">${renderGearIcon(g)}</div>
          <div class="item-card-meta">
            <span class="item-slot-badge">${SLOT_LABEL[g.slot]}</span>
            <b class="item-name">${g.name}</b>
          </div>
        </div>
        <div class="item-desc">${g.desc}</div>
        <div class="item-card-bottom">
          ${
            owned
              ? eq
                ? '<span class="gear-tag active">Đang mang</span><button class="btn btn-sm" data-act="unequip" data-slot="' + g.slot + '">Tháo</button>'
                : '<span class="gear-tag owned">Đã có</span><button class="btn btn-sm btn-equip" data-act="equip" data-gear="' + g.id + '">Mang vào</button>'
              : `<button class="btn gold btn-sm" data-act="buy" data-gear="${g.id}" ${s.gold < g.price ? 'disabled' : ''}>Mua ${fmt(g.price)} vàng</button>`
          }
        </div>
      </article>`;
    })
    .join('');

  const catalogColHtml = `
    <div class="shop-catalog-col">
      <div class="catalog-header">
        <div class="catalog-tabs">${catTabsHtml}</div>
        <div class="catalog-gold"><span>🪙</span> <b>${fmt(s.gold)} vàng</b></div>
      </div>
      <div class="catalog-grid">${catalogItemsHtml}</div>
    </div>`;

  el.innerHTML = `<div class="shop-container">${heroColHtml}${catalogColHtml}</div>`;

  const stageCanvas = el.querySelector<HTMLCanvasElement>('#shop-hero-canvas');
  if (stageCanvas) {
    if (activeShopHeroStage) {
      activeShopHeroStage.destroy();
      activeShopHeroStage = null;
    }
    activeShopHeroStage = new ShopHeroStage(stageCanvas);
    activeShopHeroStage.sync(s.general, s.weapon, s.equipped);
  }

  // Bind category tabs
  el.querySelectorAll<HTMLButtonElement>('[data-cat]').forEach((b) => {
    b.addEventListener('click', () => {
      activeShopTab = b.dataset.cat as typeof activeShopTab;
      renderShop(el, h);
    });
  });


  // Bind unequip actions
  el.querySelectorAll<HTMLButtonElement>('[data-act="unequip"]').forEach((b) => {
    b.addEventListener('click', (e) => {
      e.stopPropagation();
      const slot = b.dataset.slot as GearSlot;
      const r = unequipSlot(s, slot);
      h.onChange('gear', r);
    });
  });

  // Bind equip actions
  el.querySelectorAll<HTMLButtonElement>('[data-act="equip"]').forEach((b) => {
    b.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = b.dataset.gear!;
      const r = equipGear(s, id);
      h.onChange('gear', r);
    });
  });

  // Bind buy actions
  el.querySelectorAll<HTMLButtonElement>('[data-act="buy"]').forEach((b) => {
    b.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = b.dataset.gear!;
      const r = buyGear(s, id);
      h.onChange('gear', r);
    });
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

export function renderHeroDock(el: HTMLElement, h: PanelHooks): void {
  const currentGeneral = h.save.general;
  const activeLore = GENERAL_LORES[currentGeneral] ?? GENERAL_LORES['ngo_quyen'];

  el.innerHTML = `
    <div class="hero-dock-bar">
      <div class="hero-lore-banner" id="hero-lore-banner">
        <div class="lore-header">
          <span class="lore-icon">${activeLore.icon}</span>
          <b class="lore-title">${escapeHtml(activeLore.title)}</b>
          <span class="lore-year">${escapeHtml(activeLore.year)}</span>
        </div>
        <div class="lore-sub">${escapeHtml(activeLore.sub)}</div>
        <div class="lore-quote">"${escapeHtml(activeLore.quote)}"</div>
      </div>
      <div class="hero-dock-divider"></div>
      <div class="hero-dock-list" id="hero-dock-list">
        ${GENERALS.map((g) => {
          const sel = currentGeneral === g.id;
          return `
            <button class="hero-dock-tile ${sel ? 'sel' : ''}" data-general="${g.id}" title="${escapeHtml(g.name)} - ${escapeHtml(g.title)} (${escapeHtml(g.passive)})">
              <div class="tile-avatar-box">${renderGeneralAvatar(g)}</div>
              <div class="tile-info">
                <b class="tile-name">${escapeHtml(g.name)}</b>
              </div>
              ${sel ? '<span class="tile-sel-badge">Đang chọn</span>' : ''}
            </button>`;
        }).join('')}
      </div>
    </div>`;

  const bannerEl = el.querySelector<HTMLElement>('#hero-lore-banner');
  const updateBanner = (id: string): void => {
    const lore = GENERAL_LORES[id];
    if (!lore || !bannerEl) return;
    bannerEl.innerHTML = `
      <div class="lore-header">
        <span class="lore-icon">${lore.icon}</span>
        <b class="lore-title">${escapeHtml(lore.title)}</b>
        <span class="lore-year">${escapeHtml(lore.year)}</span>
      </div>
      <div class="lore-sub">${escapeHtml(lore.sub)}</div>
      <div class="lore-quote">"${escapeHtml(lore.quote)}"</div>
    `;
  };

  updateBanner(currentGeneral);

  el.querySelectorAll<HTMLButtonElement>('[data-general]').forEach((b) => {
    const id = b.dataset.general!;
    b.addEventListener('click', () => {
      // Phản hồi chọn tức thì trên giao diện
      el.querySelectorAll<HTMLButtonElement>('.hero-dock-tile').forEach((tile) => {
        tile.classList.remove('sel');
        tile.querySelector('.tile-sel-badge')?.remove();
      });
      b.classList.add('sel');
      const badge = document.createElement('span');
      badge.className = 'tile-sel-badge';
      badge.textContent = 'Đang chọn';
      b.appendChild(badge);

      updateBanner(id);
      h.onPreview?.('general', id);
      h.onChange('general', selectGeneral(h.save, id));
    });
  });
}

export function showSkillDetailsModal(save: Save3D): void {
  const st = computeStats(save);
  const w = st.weapon;
  const cb = comboFor(st.general.id, st.weapon.id);
  const esk = ESKILLS[st.general.id];
  const g = st.general;

  const card = showModal(`
    <div class="skill-detail-modal">
      <div class="skill-modal-header">
        <div class="skill-modal-hero">
          <div class="skill-modal-avatar">${renderGeneralAvatar(g)}</div>
          <div>
            <h2 class="skill-modal-name">${escapeHtml(g.name)}</h2>
            <span class="skill-modal-title">${escapeHtml(g.title)}</span>
          </div>
        </div>
        <button class="skill-modal-close" id="skill-modal-close" title="Đóng (Esc)">✕</button>
      </div>

      <div class="skill-modal-body">
        <!-- NỘI TẠI -->
        <div class="skill-card-row passive">
          <div class="skill-card-icon-box passive">
            <span class="skill-icon-emoji">🛡️</span>
            <span class="skill-key-badge">P</span>
          </div>
          <div class="skill-card-content">
            <div class="skill-card-top-row">
              <span class="skill-badge-tag passive">NỘI TẠI</span>
              <b class="skill-card-name">${escapeHtml(g.passive.split(':')[0] || 'Nội tại')}</b>
            </div>
            <div class="skill-card-desc">${escapeHtml(g.passive.split(':').slice(1).join(':').trim() || g.passive)}</div>
          </div>
        </div>

        <!-- CHIÊU Q -->
        <div class="skill-card-row ult">
          <div class="skill-card-icon-box ult">
            <img src="/skills/${g.id}_q.png" onerror="this.onerror=null; this.src='/skills/q.png'; this.onerror=()=>{this.style.display='none'};" alt="Chiêu Q" />
            <span class="skill-key-badge">Q</span>
          </div>
          <div class="skill-card-content">
            <div class="skill-card-top-row">
              <span class="skill-badge-tag ult">CHIÊU Q • TUYỆT KỸ</span>
              <b class="skill-card-name">${escapeHtml(g.ult)}</b>
              <span class="skill-cd-badge">⏱ ${g.ultCd}s</span>
            </div>
            <div class="skill-card-desc">${escapeHtml(g.ultDesc)}</div>
          </div>
        </div>

        <!-- CHIÊU E -->
        ${esk ? `
        <div class="skill-card-row eskill">
          <div class="skill-card-icon-box eskill">
            <img src="/skills/${g.id}_e.png" onerror="this.onerror=null; this.src='/skills/e.png'; this.onerror=()=>{this.style.display='none'};" alt="Chiêu E" />
            <span class="skill-key-badge">E</span>
          </div>
          <div class="skill-card-content">
            <div class="skill-card-top-row">
              <span class="skill-badge-tag eskill">CHIÊU E • ĐẶC BIỆT</span>
              <b class="skill-card-name">${escapeHtml(esk.name)}</b>
              <span class="skill-cd-badge">⏱ ${esk.cd}s</span>
            </div>
            <div class="skill-card-desc">${escapeHtml(esk.desc)}</div>
          </div>
        </div>` : ''}

        <!-- ĐÒN ĐÁNH THƯỜNG -->
        <div class="skill-card-row atk">
          <div class="skill-card-icon-box atk">
            <img src="/skills/${g.id}_atk.png" onerror="this.onerror=null; this.src='/skills/atk.png';" alt="Tấn công" />
            <span class="skill-key-badge">LMB</span>
          </div>
          <div class="skill-card-content">
            <div class="skill-card-top-row">
              <span class="skill-badge-tag atk">ĐÒN ĐÁNH</span>
              <b class="skill-card-name">${escapeHtml(w.name)}</b>
              <span class="skill-cd-badge">${escapeHtml(KIND_LABEL[w.kind] || 'Tấn công')}</span>
            </div>
            <div class="skill-card-desc">${escapeHtml(w.desc)} • Sát thương cơ bản: ${w.dmg}</div>
          </div>
        </div>

        <!-- LƯỚT NÉ ĐÒN -->
        <div class="skill-card-row dash">
          <div class="skill-card-icon-box dash">
            <img src="/skills/dash.png" alt="Lướt" />
            <span class="skill-key-badge">Shift</span>
          </div>
          <div class="skill-card-content">
            <div class="skill-card-top-row">
              <span class="skill-badge-tag dash">LƯỚT NÉ</span>
              <b class="skill-card-name">Lướt Né Tránh</b>
              <span class="skill-cd-badge">⏱ 2.2s</span>
            </div>
            <div class="skill-card-desc">Lao nhanh theo hướng di chuyển, lướt qua quái vật và miễn nhiễm mọi sát thương trong 0.35 giây.</div>
          </div>
        </div>

        <!-- COMBO THẦN KHÍ (NẾU CÓ) -->
        ${cb ? `
        <div class="skill-card-row combo">
          <div class="skill-card-icon-box combo">
            <span class="skill-icon-emoji">⚡</span>
            <span class="skill-key-badge">COMBO</span>
          </div>
          <div class="skill-card-content">
            <div class="skill-card-top-row">
              <span class="skill-badge-tag combo">COMBO THẦN KHÍ</span>
              <b class="skill-card-name">${escapeHtml(cb.name)}</b>
            </div>
            <div class="skill-card-desc">${escapeHtml(cb.desc)}</div>
          </div>
        </div>` : ''}
      </div>

      <div class="skill-modal-footer">
        <button class="btn gold" id="skill-modal-btn-close">Đóng (Esc)</button>
      </div>
    </div>
  `);

  card.classList.add('skill-modal-card');
  card.querySelector('#skill-modal-close')?.addEventListener('click', () => hideModal());
  card.querySelector('#skill-modal-btn-close')?.addEventListener('click', () => hideModal());
}

export function renderStats(el: HTMLElement, save: Save3D): void {
  const st = computeStats(save);
  const w = st.weapon;
  const dmgBase = w.dmg;
  const esk = ESKILLS[st.general.id];

  el.innerHTML = `
    <div class="hero-info-header">
      <div class="hero-info-avatar">${renderGeneralAvatar(st.general)}</div>
      <div class="hero-info-title">
        <h2>${escapeHtml(st.general.name)}</h2>
        <small>${escapeHtml(st.general.title)}</small>
      </div>
    </div>

    <!-- CỤM Ô XEM KỸ NĂNG CÓ ẢNH VÀ NÚT MỞ BẢNG CHI TIẾT -->
    <div class="hero-skills-compact" id="hero-skills-compact" role="button" tabindex="0" title="Bấm để xem chi tiết bộ kỹ năng">
      <div class="skills-compact-header">
        <span class="skills-compact-title">⚡ BỘ KỸ NĂNG</span>
        <span class="skills-compact-cta">Chi tiết ❯</span>
      </div>
      <div class="skills-compact-row">
        <div class="skill-thumb passive" title="Nội tại: ${escapeHtml(st.general.passive)}">
          <span class="thumb-key">P</span>
          <span class="thumb-emoji">🛡️</span>
        </div>
        <div class="skill-thumb atk" title="Đánh thường: ${escapeHtml(w.name)}">
          <img src="/skills/${st.general.id}_atk.png" onerror="this.onerror=null; this.src='/skills/atk.png';" alt="Atk" />
          <span class="thumb-key">LMB</span>
        </div>
        <div class="skill-thumb dash" title="Lướt né đòn (Shift)">
          <img src="/skills/dash.png" alt="Dash" />
          <span class="thumb-key">Shift</span>
        </div>
        ${esk ? `
        <div class="skill-thumb eskill" title="Chiêu E: ${escapeHtml(esk.name)}">
          <img src="/skills/${st.general.id}_e.png" onerror="this.onerror=null; this.src='/skills/e.png';" alt="E" />
          <span class="thumb-key">E</span>
        </div>` : ''}
        <div class="skill-thumb ult" title="Chiêu Q: ${escapeHtml(st.general.ult)}">
          <img src="/skills/${st.general.id}_q.png" onerror="this.onerror=null; this.src='/skills/q.png';" alt="Q" />
          <span class="thumb-key">Q</span>
        </div>
      </div>
      <button class="btn-open-skills-card" id="btn-open-skills-card" type="button">
        📜 Xem chi tiết bộ kỹ năng
      </button>
    </div>

    <div class="hero-stats-mini">
      ${bar('Máu', st.maxHp / 260, fmt(st.maxHp))}
      ${bar('Sát thương', (dmgBase * st.dmgMult) / 140, fmt(dmgBase * st.dmgMult))}
      ${bar('Tốc chạy', st.speed / 10, st.speed.toFixed(1))}
      ${bar('Giảm ST', st.reduce / 0.6, `${Math.round(st.reduce * 100)}%`)}
      ${bar('Chí mạng', st.crit / 0.5, `${Math.round(st.crit * 100)}%`)}
      ${bar('Hệ số vàng', (st.goldMult - 1) / 0.5 + 0.06, `x${st.goldMult.toFixed(2)}`)}
    </div>

    <div class="hero-record-mini">Kỷ lục: Màn ${save.bestWave} • Hạ ${fmt(save.kills)} quái</div>`;

  el.querySelector('#hero-skills-compact')?.addEventListener('click', (e) => {
    e.stopPropagation();
    showSkillDetailsModal(save);
  });
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
        <div class="top-left">
          <div class="brand"><b>HỒN VIỆT 3D</b><small>Đấu Trường Danh Tướng</small></div>
          <nav class="tabs lobby-nav" id="lobby-tabs">
            <button data-tab="general" class="nav-tab-btn" title="Danh tướng">
              <span class="nav-tab-icon">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                  <path d="M5 16L3 5l5.5 5L12 4l3.5 6L21 5l-2 11H5zm14 3c0 .6-.4 1-1 1H6c-.6 0-1-.4-1-1v-1h14v1z"/>
                </svg>
              </span>
              <span class="nav-tab-label">Tướng</span>
            </button>
            <button data-tab="weapon" class="nav-tab-btn" title="Kho binh khí">
              <span class="nav-tab-icon">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                  <path d="M19.7 4.3a1 1 0 00-1.4 0L12 10.6 8.7 7.3a1 1 0 00-1.4 0L5.9 8.7a1 1 0 000 1.4L9.2 13.4 3.3 19.3a1 1 0 000 1.4l.7.7a1 1 0 001.4 0L11.3 15.5l3.3 3.3a1 1 0 001.4 0l1.4-1.4a1 1 0 000-1.4L14.1 12.7l6.3-6.3a1 1 0 000-1.4l-.7-.7z"/>
                </svg>
              </span>
              <span class="nav-tab-label">Vũ khí</span>
            </button>
            <button data-tab="shop" class="nav-tab-btn" title="Cửa hàng thương nhân">
              <span class="nav-tab-icon">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                  <path d="M12 2l-5.5 4h11L12 2zm-6.5 5l-3.5 4 10 11 10-11-3.5-4h-13z"/>
                </svg>
              </span>
              <span class="nav-tab-label">Cửa hàng</span>
            </button>
            <button data-tab="quest" class="nav-tab-btn" title="Chiến dịch & Nhiệm vụ">
              <span class="nav-tab-icon">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                  <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/>
                </svg>
              </span>
              <span class="nav-tab-label">Nhiệm vụ</span>
            </button>
            <button data-tab="setting" class="nav-tab-btn" title="Thiết lập hệ thống">
              <span class="nav-tab-icon">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                  <path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58a.49.49 0 00.12-.61l-1.92-3.32a.488.488 0 00-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54a.484.484 0 00-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58a.49.49 0 00-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/>
                </svg>
              </span>
              <span class="nav-tab-label">Cài đặt</span>
            </button>
          </nav>
        </div>
        <div class="top-right"><span class="gold-chip" id="lobby-gold"></span></div>
      </header>
      <div class="lobby-backdrop hidden" id="lobby-backdrop"></div>
      <aside class="panel center-panel hidden" id="lobby-panel-left">
        <div class="panel-header" id="panel-header">
          <h3 id="panel-title">Danh sách</h3>
          <button class="btn-close" id="panel-close-btn" title="Quay lại sảnh chọn tướng">✕</button>
        </div>
        <div class="list" id="lobby-list"></div>
      </aside>
      <aside class="panel info" id="lobby-info"></aside>
      <div class="lobby-hero-dock" id="lobby-hero-dock"></div>
      <div class="play-wrap">
        <button class="btn big friends" id="online-btn">Chơi cùng bạn bè</button>
        <button class="play" id="play">Vào trận</button>
        <div class="ctrl-hint-box">
          <button class="ctrl-hint-btn" id="ctrl-hint-btn" type="button">⌨️ Phím điều khiển</button>
          <div class="ctrl-popover hidden" id="ctrl-popover">
            <div class="ctrl-popover-title">Thao tác chiến đấu</div>
            <div class="ctrl-row"><kbd>WASD</kbd><span>Di chuyển</span></div>
            <div class="ctrl-row"><kbd>Chuột trái</kbd><span>Tấn công</span></div>
            <div class="ctrl-row"><kbd>Shift / Space</kbd><span>Lướt né đòn</span></div>
            <div class="ctrl-row"><kbd>E</kbd><span>Kỹ năng phụ</span></div>
            <div class="ctrl-row"><kbd>Q</kbd><span>Chiêu cuối</span></div>
            <div class="ctrl-row"><kbd>Cuộn chuột</kbd><span>Thu phóng góc nhìn</span></div>
          </div>
        </div>
      </div>
      <div class="toast hidden" id="lobby-toast"></div>`;

    root.querySelectorAll<HTMLButtonElement>('#lobby-tabs button').forEach((b) =>
      b.addEventListener('click', () => {
        this.tab = b.dataset.tab as typeof this.tab;
        this.render();
      }),
    );
    $('play').addEventListener('click', () => h.onPlay());
    $('online-btn').addEventListener('click', () => h.onOnline());

    const backdrop = $('lobby-backdrop');
    if (backdrop) {
      backdrop.addEventListener('click', () => {
        this.tab = 'general';
        this.render();
      });
    }

    const ctrlBtn = $('ctrl-hint-btn');
    const ctrlPop = $('ctrl-popover');
    if (ctrlBtn && ctrlPop) {
      ctrlBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        ctrlPop.classList.toggle('hidden');
      });
      document.addEventListener('click', () => ctrlPop.classList.add('hidden'));
      ctrlPop.addEventListener('click', (e) => e.stopPropagation());
    }

    const closeBtn = $('panel-close-btn');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        this.tab = 'general';
        this.render();
      });
    }

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
    if (activeShopHeroStage) {
      activeShopHeroStage.destroy();
      activeShopHeroStage = null;
    }
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
    const lobbyEl = $('lobby');
    const panelLeft = $('lobby-panel-left');
    const heroDock = $('lobby-hero-dock');
    const lobbyInfo = $('lobby-info');
    const panelTitle = $('panel-title');
    const backdrop = $('lobby-backdrop');

    // Dọn dẹp các class chế độ cũ của panel trung tâm
    panelLeft?.classList.remove('shop-mode', 'weapon-mode', 'quest-mode', 'setting-mode');

    if (this.tab === 'shop') {
      lobbyEl?.classList.add('shop-mode');
    } else {
      if (activeShopHeroStage) {
        activeShopHeroStage.destroy();
        activeShopHeroStage = null;
      }
      lobbyEl?.classList.remove('shop-mode');
    }

    const hooks: PanelHooks = {
      save: s,
      onPreview: (k, id) => this.h.onPreview(k, id),
      onChange: (kind, r) => {
        if (r) this.toast(r.msg, r.ok);
        if (r?.ok) this.h.onLoadout();
        this.render();
      },
    };

    if (this.tab === 'general') {
      panelLeft?.classList.add('hidden');
      backdrop?.classList.add('hidden');
      heroDock?.classList.remove('hidden');
      lobbyInfo?.classList.remove('hidden');
      if (heroDock) renderHeroDock(heroDock, hooks);
      renderStats(lobbyInfo, s);
    } else {
      heroDock?.classList.add('hidden');
      lobbyInfo?.classList.add('hidden');
      panelLeft?.classList.remove('hidden');
      backdrop?.classList.remove('hidden');

      if (this.tab === 'shop') {
        panelLeft?.classList.add('shop-mode');
        if (panelTitle) panelTitle.textContent = 'Cửa hàng trang bị';
        renderShop(list, hooks);
      } else if (this.tab === 'weapon') {
        panelLeft?.classList.add('weapon-mode');
        if (panelTitle) panelTitle.textContent = 'Kho vũ khí';
        renderWeapons(list, hooks);
      } else if (this.tab === 'quest') {
        panelLeft?.classList.add('quest-mode');
        if (panelTitle) panelTitle.textContent = 'Nhiệm vụ & Thành tích';
        renderQuests(list, hooks);
      } else if (this.tab === 'setting') {
        panelLeft?.classList.add('setting-mode');
        if (panelTitle) panelTitle.textContent = 'Cài đặt';
        renderSettings(list);
      }
    }
  }
}

/* ---------- Hộp thoại: tạm dừng và kết thúc lượt ---------- */

let modalCardsPaused = false;

/** locked: modal chỉ đóng bằng nút của nó (Esc và bấm nền không đóng), dùng cho bảng kết thúc trận. */
export function showModal(html: string, locked = false): HTMLElement {
  const m = $('modal');
  const cards = $('cards');
  if (cards && !cards.classList.contains('hidden')) {
    modalCardsPaused = true;
    cards.classList.add('paused-hidden');
  }
  m.innerHTML = `<div class="modal-card">${html}</div>`;
  m.dataset.locked = locked ? '1' : '';
  m.onclick = (e) => {
    if (e.target === m && !locked) hideModal();
  };
  m.classList.remove('hidden');
  return m.firstElementChild as HTMLElement;
}

window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    const m = $('modal');
    if (m && !m.classList.contains('hidden') && !m.dataset.locked) {
      hideModal();
    }
  }
});

export function hideModal(): void {
  if (activeShopHeroStage) {
    activeShopHeroStage.destroy();
    activeShopHeroStage = null;
  }
  const m = $('modal');
  m.classList.add('hidden');
  m.innerHTML = '';
  m.dataset.locked = '';
  m.onclick = null;
  if (modalCardsPaused) {
    modalCardsPaused = false;
    const cards = $('cards');
    if (cards) cards.classList.remove('paused-hidden');
  }
}

export function showPause(save: Save3D, cb: { onResume(): void; onExit(): void; onLoadout(): void }): void {
  let tab: 'weapon' | 'shop' | 'setting' = 'shop';
  const draw = (): void => {
    const isShop = tab === 'shop';
    const card = showModal(`
      <h2>Tạm dừng</h2>
      <div class="gold-chip">Vàng ${fmt(save.gold)}</div>
      <nav class="tabs"><button data-t="shop" class="${isShop ? 'on' : ''}">Cửa hàng trang bị</button><button data-t="weapon" class="${tab === 'weapon' ? 'on' : ''}">Vũ khí</button><button data-t="setting" class="${tab === 'setting' ? 'on' : ''}">Cài đặt</button></nav>
      <div class="list modal-list ${isShop ? 'shop-mode' : ''}" id="modal-list"></div>
      <div class="modal-actions"><button class="btn big" id="m-resume">Tiếp tục chiến đấu</button><button class="btn" id="m-exit">Về sảnh</button></div>`);
    if (isShop) card.classList.add('shop-modal');
    else card.classList.remove('shop-modal');
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
    <div class="modal-actions"><button class="btn big" id="o-again">Chơi lại ngay</button><button class="btn gold" id="o-lobby">Về sảnh mua trang bị</button></div>`, true);
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
    <div class="modal-actions"><button class="btn big" id="o-room">Về phòng chờ</button><button class="btn gold" id="o-lobby">Về sảnh mua trang bị</button></div>`, true);
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
