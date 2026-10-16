import { defineConfig, type Plugin } from 'vite';
import { attachGameServer } from './server/rooms.mjs';

/** Chạy sảnh nhiều người (WebSocket tại /ws) ngay trong server của Vite khi dev và preview. */
function gameServer(): Plugin {
  return {
    name: 'hon-viet-game-server',
    configureServer(server) {
      if (server.httpServer) attachGameServer(server.httpServer, { log: (m: string) => server.config.logger.info(`[sảnh] ${m}`) });
    },
    configurePreviewServer(server) {
      attachGameServer(server.httpServer, { log: (m: string) => server.config.logger.info(`[sảnh] ${m}`) });
    },
  };
}

export default defineConfig({
  base: './',
  plugins: [gameServer()],
  // host: true để bạn bè cùng mạng vào được bằng địa chỉ IP của máy này
  server: { port: 5173, host: true, open: false },
  preview: { host: true },
  build: {
    chunkSizeWarningLimit: 800,
    rollupOptions: {
      output: { manualChunks: { three: ['three'] } },
    },
  },
});
