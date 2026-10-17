/**
 * Tập trung hóa toàn bộ các khóa lưu trữ LocalStorage trong ứng dụng.
 * Tránh trùng lặp và phân tán giữa các module khác nhau.
 */
export const STORAGE_KEYS = {
  SAVE_DATA: 'honviet_arena3d_save_v1',
  SETTINGS: 'honviet_arena3d_settings',
  PLAYER_NAME: 'honviet_arena3d_name',
  SERVER_URL: 'honviet_arena3d_server',
  PLAYER_CODE: 'honviet_arena3d_code',
  PLAYER_SECRET: 'honviet_arena3d_secret',
} as const;

export type StorageKey = (typeof STORAGE_KEYS)[keyof typeof STORAGE_KEYS];
