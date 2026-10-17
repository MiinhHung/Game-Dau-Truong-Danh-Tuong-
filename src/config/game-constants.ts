/**
 * Hằng số cấu hình gameplay và thế giới 3D.
 */
export const GAME_CONSTANTS = {
  /** Bán kính sàn đấu võ đài trung tâm */
  ARENA_RADIUS: 40,
  /** Khoảng cách camera zoom tối thiểu và tối đa */
  CAMERA_ZOOM_MIN: 9,
  CAMERA_ZOOM_MAX: 36,
  CAMERA_ZOOM_DEFAULT: 20,
  /** Số người chơi tối đa trong một phòng */
  MAX_PLAYERS_PER_ROOM: 4,
  /** Giới hạn số lượng thẻ bài tối đa người chơi có thể sở hữu cùng lúc */
  MAX_CARDS_DISPLAY: 12,
  /** Tần số tick cơ bản */
  FIXED_STEP: 1 / 60,
} as const;
