/**
 * Cấu hình tập trung cho máy chủ WebSocket và HTTP server.
 */
import { fileURLToPath } from 'node:url';

export const SERVER_CONFIG = {
  PORT: Number(process.env.PORT) || 8787,
  WS_PATH: process.env.WS_PATH || '/ws',
  MAX_PLAYERS: 4,
  MAX_CHAT_LENGTH: 200,
  CHAT_HISTORY_SIZE: 60,
  LEADERBOARD_MAX_ENTRIES: 30,
  RATE_LIMIT_BURST: 30,
  RELAY_RATE_LIMIT_BURST: 200,
  INVITE_BURST_TOKENS: 3,
  INVITE_COOLDOWN_MS: 8000,
  DEFAULT_BOARD_FILE: process.env.LEADERBOARD_FILE || fileURLToPath(new URL('./data/leaderboard.json', import.meta.url)),
  CODE_REGEX: /^HV-[A-Z0-9]{4,6}$/,
};
