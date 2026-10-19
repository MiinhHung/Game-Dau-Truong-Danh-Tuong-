#!/usr/bin/env node
/**
 * Kiểm thử cân bằng tự động (ước lượng, không chạy trận thật).
 *
 *   node tools/balance.mjs [--players 1] [--waves 30] [--csv]
 *
 * Với mỗi màn, script tính tổng máu quái (theo công thức trong game) rồi chia cho sát thương mỗi giây ước lượng
 * của từng cặp tướng và vũ khí ở các cấp nâng cấp khác nhau, kèm thẻ nâng cấp ước tính theo cấp nhân vật.
 * Kết quả là thời gian ước tính để dọn sạch một màn. Màn quá lâu (hơn 75 giây) hoặc quá nhanh (dưới 6 giây) được đánh dấu.
 *
 * Giả định: người chơi đánh liên tục, trúng trung bình số mục tiêu của từng kiểu vũ khí, chọn thẻ sức mạnh và tốc độ đánh.
 * Bỏ qua né đòn, sự kiện bản đồ, quái tinh anh, boss và combo, nên chỉ dùng để so sánh tương đối và phát hiện màn lệch hẳn.
 * Dùng thành phần quái mặc định (không theo bản đồ).
 */
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import ts from 'typescript';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const opt = (name, def) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] ? Number(args[i + 1]) : def;
};
const PLAYERS = Math.max(1, Math.min(4, opt('players', 1)));
const WAVES = Math.max(5, Math.min(100, opt('waves', 30)));
const CSV = args.includes('--csv');

// Biên dịch các mô-đun dữ liệu (không phụ thuộc trình duyệt) sang thư mục tạm rồi nạp
const tmp = mkdtempSync(join(tmpdir(), 'honviet-balance-'));
mkdirSync(tmp, { recursive: true });
writeFileSync(join(tmp, 'package.json'), '{"type":"module"}');
const fileMap = {
  data: join(root, 'src', 'domain', 'data', 'index.ts'),
  stats: join(root, 'src', 'domain', 'combat', 'stats.ts'),
  cards: join(root, 'src', 'domain', 'combat', 'cards.ts'),
  hazards: join(root, 'src', 'rendering', 'fx', 'hazards.ts'),
};
for (const [name, filePath] of Object.entries(fileMap)) {
  const src = readFileSync(filePath, 'utf8');
  const out = ts
    .transpileModule(src, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } })
    .outputText.replace(/from\s+['"](?:\.\.|\.)\/(?:data|stats|cards|hazards)(?:\/index)?['"]/g, (m) => {
      const target = m.match(/(data|stats|cards|hazards)/)[1];
      return `from './${target}.js'`;
    });
  writeFileSync(join(tmp, `${name}.js`), out);
}
const load = (f) => import(pathToFileURL(join(tmp, `${f}.js`)).href);
const data = await load('data');
const statsMod = await load('stats');
const { GENERALS, WEAPONS, MONSTERS, waveComposition, monsterScaling } = data;
const { computeStats } = statsMod;

/** Số mục tiêu trung bình mỗi đòn đánh, theo kiểu vũ khí (ước lượng thô). */
const TARGETS = { slam: 2.4, spin: 3.4, boomerang: 2.6, pierce: 1.6, bonk: 1 };
const WEAPON_BONUS = { phong_lon: 1.25, dieu_cay: 1.25, muoi_canh: 1.15 };

function enemyHp(n) {
  const comp = waveComposition(n);
  const sc = monsterScaling(n, PLAYERS);
  let hp = 0;
  let count = 0;
  let atk = 0;
  for (const c of comp) {
    hp += MONSTERS[c.type].hp * sc.hp * c.count;
    count += c.count;
    if (!MONSTERS[c.type].boss) atk += MONSTERS[c.type].atk * sc.dmg * c.count;
  }
  const avgHit = atk / Math.max(1, comp.filter((c) => !MONSTERS[c.type].boss).reduce((t, c) => t + c.count, 0));
  // thêm quái khi chơi đông người (giống nextWave)
  if (PLAYERS > 1) {
    const extra = count * 0.55 * (PLAYERS - 1);
    hp += (hp / Math.max(1, count)) * extra;
    count += extra;
  }
  return { hp, count: Math.round(count), avgHit };
}

/** Cấp nhân vật ước tính khi tới màn n (mỗi quái cho kinh nghiệm theo máu, như trong game). */
function levelAt(n) {
  let xp = 0;
  for (let w = 1; w < n; w++) for (const c of waveComposition(w)) xp += (MONSTERS[c.type].boss ? 25 : Math.max(1, Math.round(MONSTERS[c.type].hp / 35))) * c.count;
  let level = 1;
  let need = 8;
  while (xp >= need) {
    xp -= need;
    level++;
    need = 8 + 5 * (level - 1);
  }
  return level;
}

function dps(general, weapon, wLevel, n) {
  const st = computeStats({ general: general.id, weapon: weapon.id, weapons: { [weapon.id]: wLevel }, equipped: { head: null, body: null, feet: null, charm: null } });
  const lv = levelAt(n);
  // Thẻ: mỗi 3 cấp nhân vật ăn ~ một thẻ sức mạnh (+12%) và một thẻ tốc độ đánh (+10%)
  const cards = Math.pow(1.12, lv / 3) * Math.pow(1.1, lv / 3);
  const perHit = weapon.dmg * st.dmgMult;
  const ranged = weapon.kind === 'boomerang' || weapon.kind === 'pierce';
  const hit = perHit * (ranged ? st.projMult : 1) * (1 + st.crit);
  const rate = st.atkSpeed / weapon.cd;
  return hit * rate * TARGETS[weapon.kind] * (WEAPON_BONUS[weapon.id] ?? 1) * cards;
}

const rows = [];
for (let n = 1; n <= WAVES; n++) {
  const e = enemyHp(n);
  const entry = { wave: n, count: e.count, hp: Math.round(e.hp), avgHit: e.avgHit };
  const res = [];
  for (const g of GENERALS) {
    for (const w of WEAPONS) {
      for (const lv of [0, 3, 5]) {
        const d = dps(g, w, lv, n);
        res.push({ g: g.name, w: w.name, lv, dps: d, ttk: e.hp / d + 8 });
      }
    }
  }
  const ttks = res.map((r) => r.ttk).sort((a, b) => a - b);
  entry.best = ttks[0];
  entry.median = ttks[Math.floor(ttks.length / 2)];
  entry.worst = ttks[ttks.length - 1];
  entry.bestOf = res.reduce((a, b) => (a.ttk < b.ttk ? a : b));
  entry.worstOf = res.reduce((a, b) => (a.ttk > b.ttk ? a : b));
  rows.push(entry);
}

if (CSV) {
  console.log('man,so_quai,tong_mau,ttk_tot_nhat,ttk_trung_vi,ttk_te_nhat');
  for (const r of rows) console.log([r.wave, r.count, r.hp, r.best.toFixed(1), r.median.toFixed(1), r.worst.toFixed(1)].join(','));
} else {
  console.log(`Cân bằng ước lượng: ${PLAYERS} người chơi, ${WAVES} màn, ${GENERALS.length} tướng x ${WEAPONS.length} vũ khí x 3 cấp (+0, +3, +5)\n`);
  console.log('Màn  Số quái  Tổng máu   Nhanh nhất  Trung vị  Chậm nhất  ST quái/đòn  Ghi chú');
  const issues = [];
  for (const r of rows) {
    const note = r.median > 75 ? 'KHÓ QUÁ' : r.median < 6 ? 'DỄ QUÁ' : r.worst > 150 ? 'có bộ rất yếu' : '';
    if (note) issues.push(`Màn ${r.wave}: ${note}`);
    console.log(`${String(r.wave).padStart(3)}  ${String(r.count).padStart(7)}  ${String(r.hp).padStart(8)}   ${r.best.toFixed(1).padStart(8)}s  ${r.median.toFixed(1).padStart(7)}s  ${r.worst.toFixed(1).padStart(8)}s  ${r.avgHit.toFixed(0).padStart(10)}   ${note}`);
  }
  const last = rows[rows.length - 1];
  console.log(`\nBộ mạnh nhất ở màn ${last.wave}: ${last.bestOf.g} + ${last.bestOf.w} +${last.bestOf.lv} (${last.bestOf.dps.toFixed(0)} sát thương/giây).`);
  console.log(`Bộ yếu nhất ở màn ${last.wave}: ${last.worstOf.g} + ${last.worstOf.w} +${last.worstOf.lv} (${last.worstOf.dps.toFixed(0)} sát thương/giây).`);
  const spread = last.worst / last.best;
  console.log(`Chênh lệch bộ yếu nhất và mạnh nhất: gấp ${spread.toFixed(1)} lần${spread > 12 ? ' (rất lệch, nên xem lại số liệu vũ khí)' : ''}.`);
  console.log(issues.length ? `\nMàn cần xem lại: ${issues.join('; ')}` : '\nKhông có màn nào lệch hẳn theo ngưỡng 6 đến 75 giây.');
}
