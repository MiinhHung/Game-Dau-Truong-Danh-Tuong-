/**
 * Máy chủ chạy độc lập: phục vụ bản đã build (thư mục dist) và sảnh nhiều người tại /ws.
 *
 *   npm run build
 *   npm run server            # mặc định cổng 8787, đổi bằng biến môi trường PORT
 *
 * Bạn bè trong cùng mạng mở http://<địa-chỉ-IP-máy-bạn>:8787 để vào cùng.
 */
import { createServer } from 'node:http';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { extname, join, normalize, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { attachGameServer } from './rooms.mjs';
import { SERVER_CONFIG } from './config.mjs';
import { serverLogger, formatLog } from './logger.mjs';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)), 'dist');
const port = SERVER_CONFIG.PORT;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.glb': 'model/gltf-binary',
  '.txt': 'text/plain; charset=utf-8',
  '.woff2': 'font/woff2',
};

const server = createServer((req, res) => {
  try {
    const path = decodeURIComponent(new URL(req.url ?? '/', 'http://x').pathname);
    if (path === '/health') {
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ ok: true, ...game.stats() }));
      return;
    }
    let file = normalize(join(root, path === '/' ? 'index.html' : path));
    if (!file.startsWith(root)) {
      res.writeHead(403).end();
      return;
    }
    if (!existsSync(file) || statSync(file).isDirectory()) file = join(root, 'index.html');
    if (!existsSync(file)) {
      res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
      res.end('Chưa có bản build. Chạy "npm run build" trước.');
      return;
    }
    res.writeHead(200, { 'content-type': MIME[extname(file)] ?? 'application/octet-stream' });
    res.end(readFileSync(file));
  } catch (err) {
    serverLogger.error(`Yêu cầu lỗi: ${err?.message || err}`);
    res.writeHead(500).end();
  }
});

const game = attachGameServer(server, {
  path: SERVER_CONFIG.WS_PATH,
  log: (m) => console.log(formatLog('SẢNH', m)),
});

server.listen(port, '0.0.0.0', () => {
  serverLogger.info(`Hồn Việt 3D đang chạy tại http://localhost:${port}`);
  serverLogger.info('Bạn bè cùng mạng vào bằng địa chỉ IP của máy này với cùng cổng.');
});
