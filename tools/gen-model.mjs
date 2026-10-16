#!/usr/bin/env node
/**
 * Tạo model .glb từ ảnh tham khảo bằng API image-to-3D.
 *
 *   node tools/gen-model.mjs <id tướng> [--provider tripo|meshy] [--image đường/dẫn/ảnh.png]
 *
 * Ví dụ: node tools/gen-model.mjs hai_ba_trung --provider tripo
 *
 * Ảnh mặc định lấy ở assets/reference/<id>.png (hoặc .jpg, .webp). Nên dùng ảnh một nhân vật đứng thẳng, nền đơn giản,
 * ảnh do bạn tự vẽ hoặc có quyền sử dụng.
 * Khóa API đọc từ biến môi trường: TRIPO_API_KEY hoặc MESHY_API_KEY (không ghi vào file).
 * Kết quả: public/models/<id>.glb và mục tương ứng trong public/models/manifest.json.
 *
 * Lưu ý: phần gọi API viết theo tài liệu công khai của từng nhà cung cấp, chưa được chạy thử với khóa thật.
 * Nếu nhà cung cấp đổi định dạng, sửa hai hàm tripo() và meshy() bên dưới.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const id = args[0];
const opt = (name, def) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] ? args[i + 1] : def;
};

if (!id || id.startsWith('--')) {
  console.error('Cách dùng: node tools/gen-model.mjs <id tướng> [--provider tripo|meshy] [--image ảnh.png]');
  process.exit(1);
}
if (!/^[a-z0-9_]+$/.test(id)) {
  console.error('id tướng chỉ gồm chữ thường, số và dấu gạch dưới.');
  process.exit(1);
}

const provider = opt('provider', 'tripo');
let image = opt('image', '');
if (!image) {
  for (const ext of ['.png', '.jpg', '.jpeg', '.webp']) {
    const p = join(root, 'assets', 'reference', id + ext);
    if (existsSync(p)) {
      image = p;
      break;
    }
  }
}
if (!image || !existsSync(image)) {
  console.error(`Không thấy ảnh tham khảo. Đặt ảnh vào assets/reference/${id}.png hoặc dùng --image.`);
  process.exit(1);
}

const mime = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp' }[extname(image).toLowerCase()];
if (!mime) {
  console.error('Chỉ hỗ trợ ảnh png, jpg, webp.');
  process.exit(1);
}
const bytes = readFileSync(image);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const need = (name) => {
  const v = process.env[name];
  if (!v) {
    console.error(`Thiếu biến môi trường ${name}. Ví dụ (PowerShell): $env:${name}="khóa-của-bạn"`);
    process.exit(1);
  }
  return v;
};

async function json(res) {
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`Phản hồi không phải JSON (HTTP ${res.status}): ${text.slice(0, 200)}`);
  }
}

/** Tripo: tải ảnh lên, tạo tác vụ image_to_model, chờ xong rồi lấy URL model. */
async function tripo() {
  const key = need('TRIPO_API_KEY');
  const auth = { Authorization: `Bearer ${key}` };
  const form = new FormData();
  form.append('file', new Blob([bytes], { type: mime }), `${id}${extname(image)}`);
  const up = await json(await fetch('https://api.tripo3d.ai/v2/openapi/upload', { method: 'POST', headers: auth, body: form }));
  const token = up?.data?.image_token;
  if (!token) throw new Error('Tripo không trả image_token: ' + JSON.stringify(up).slice(0, 300));
  const type = mime === 'image/png' ? 'png' : mime === 'image/webp' ? 'webp' : 'jpg';
  const task = await json(
    await fetch('https://api.tripo3d.ai/v2/openapi/task', {
      method: 'POST',
      headers: { ...auth, 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'image_to_model', file: { type, file_token: token } }),
    }),
  );
  const taskId = task?.data?.task_id;
  if (!taskId) throw new Error('Tripo không trả task_id: ' + JSON.stringify(task).slice(0, 300));
  console.log('Đã tạo tác vụ Tripo', taskId);
  for (let i = 0; i < 120; i++) {
    await sleep(5000);
    const st = await json(await fetch(`https://api.tripo3d.ai/v2/openapi/task/${taskId}`, { headers: auth }));
    const d = st?.data;
    console.log(`  trạng thái: ${d?.status} ${d?.progress ?? ''}%`);
    if (d?.status === 'success') {
      const url = d.output?.pbr_model ?? d.output?.model ?? d.output?.base_model;
      if (!url) throw new Error('Không thấy URL model trong kết quả: ' + JSON.stringify(d.output));
      return url;
    }
    if (['failed', 'cancelled', 'banned', 'expired'].includes(d?.status)) throw new Error('Tripo báo lỗi: ' + d.status);
  }
  throw new Error('Quá thời gian chờ Tripo.');
}

/** Meshy: gửi ảnh dạng data URI, chờ xong rồi lấy URL glb. */
async function meshy() {
  const key = need('MESHY_API_KEY');
  const auth = { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' };
  const dataUri = `data:${mime};base64,${bytes.toString('base64')}`;
  const created = await json(
    await fetch('https://api.meshy.ai/openapi/v1/image-to-3d', {
      method: 'POST',
      headers: auth,
      body: JSON.stringify({ image_url: dataUri, enable_pbr: true, should_remesh: true, should_texture: true }),
    }),
  );
  const taskId = created?.result;
  if (!taskId) throw new Error('Meshy không trả id tác vụ: ' + JSON.stringify(created).slice(0, 300));
  console.log('Đã tạo tác vụ Meshy', taskId);
  for (let i = 0; i < 120; i++) {
    await sleep(5000);
    const st = await json(await fetch(`https://api.meshy.ai/openapi/v1/image-to-3d/${taskId}`, { headers: auth }));
    console.log(`  trạng thái: ${st?.status} ${st?.progress ?? ''}%`);
    if (st?.status === 'SUCCEEDED') {
      const url = st.model_urls?.glb;
      if (!url) throw new Error('Không thấy URL glb: ' + JSON.stringify(st.model_urls));
      return url;
    }
    if (['FAILED', 'CANCELED'].includes(st?.status)) throw new Error('Meshy báo lỗi: ' + (st.task_error?.message ?? st.status));
  }
  throw new Error('Quá thời gian chờ Meshy.');
}

const url = await (provider === 'meshy' ? meshy() : provider === 'tripo' ? tripo() : Promise.reject(new Error('--provider chỉ nhận tripo hoặc meshy')));
console.log('Đang tải model...');
const dl = await fetch(url);
if (!dl.ok) throw new Error(`Tải model lỗi HTTP ${dl.status}`);
const glb = Buffer.from(await dl.arrayBuffer());

const dir = join(root, 'public', 'models');
mkdirSync(dir, { recursive: true });
writeFileSync(join(dir, `${id}.glb`), glb);
const mfPath = join(dir, 'manifest.json');
const manifest = existsSync(mfPath) ? JSON.parse(readFileSync(mfPath, 'utf8')) : {};
manifest[id] = { file: `${id}.glb`, height: manifest[id]?.height ?? 2.1, yaw: manifest[id]?.yaw ?? 0 };
writeFileSync(mfPath, JSON.stringify(manifest, null, 2) + '\n');
console.log(`Xong: public/models/${id}.glb (${(glb.length / 1024).toFixed(0)} KB). Nếu model quay sai hướng, chỉnh "yaw" trong public/models/manifest.json.`);
