# Nhật Ký Thay Đổi Kiến Trúc (Architectural Changelog)

Tất cả các thay đổi tái cấu trúc trong đợt refactor này tuân thủ nguyên tắc: **Bảo toàn 100% logic và hành vi nghiệp vụ của trò chơi, nâng cấp cấu trúc lên chuẩn doanh nghiệp**.

---

## [Refactor 2.0.0] - 17/10/2026

### 1. Phân Tầng Mã Nguồn (Modular Layering)
- Chuyển đổi toàn bộ cấu trúc phẳng `src/arena3d/` (27 file trong 1 thư mục) sang mô hình phân tầng chuẩn doanh nghiệp:
  - `src/config/`: Cấu hình môi trường, storage keys và hằng số game tập trung.
  - `src/shared/`: Tiện ích logging và xử lý lỗi tập trung.
  - `src/domain/`: Tách biệt hoàn toàn logic nghiệp vụ (data, combat stats, progression quests, cards, shop) khỏi Three.js và DOM.
  - `src/infrastructure/`: Đóng gói persistence (save, settings), audio (sfx, ambience) và network (net-client).
  - `src/rendering/`: Nhóm toàn bộ 3D models, primitives, biomes, world, shaders và fx.
  - `src/game/`: Tách hệ thống game loop, types và minimap renderer.
  - `src/ui/`: Quản lý HUD, screens và touch controls.

### 2. Chi Tiết Di Chuyển & Đổi Tên Tệp (File Relocations)
- `src/arena3d/main.ts` → `src/main.ts`
- `src/arena3d/arenaTypes.ts` → `src/game/types.ts`
- `src/arena3d/arena.ts` → `src/game/arena.ts` (kết hợp tách `MinimapRenderer` sang `src/game/systems/minimap-renderer.ts`)
- `src/arena3d/data.ts` → `src/domain/data/index.ts`
- `src/arena3d/stats.ts` → `src/domain/combat/stats.ts`
- `src/arena3d/cards.ts` → `src/domain/combat/cards.ts`
- `src/arena3d/quests.ts` → `src/domain/progression/quests.ts`
- `src/arena3d/shop.ts` → `src/domain/progression/shop.ts`
- `src/arena3d/save.ts` → `src/infrastructure/persistence/save-repository.ts`
- `src/arena3d/settings.ts` → `src/infrastructure/persistence/settings-repository.ts`
- `src/arena3d/net.ts` → `src/infrastructure/network/net-client.ts`
- `src/arena3d/sfx.ts` → `src/infrastructure/audio/sfx-engine.ts`
- `src/arena3d/ambience.ts` → `src/infrastructure/audio/ambience-engine.ts`
- `src/arena3d/models.ts` → `src/rendering/models/models.ts` + `src/rendering/primitives/shapes.ts`
- `src/arena3d/biomes.ts` → `src/rendering/biomes/biomes.ts`
- `src/arena3d/world.ts` → `src/rendering/world/arena-world.ts`
- `src/arena3d/worldKit.ts` → `src/rendering/world/world-kit.ts`
- `src/arena3d/glbAvatar.ts` → `src/rendering/loaders/glb-avatar.ts`
- `src/arena3d/swamp.ts` → `src/rendering/shaders/swamp.ts`
- `src/arena3d/hazards.ts` → `src/rendering/fx/hazards.ts`
- `src/arena3d/eskillFx.ts` → `src/rendering/fx/eskill-fx.ts`
- `src/arena3d/lobby.ts` → `src/ui/screens/lobby-scene.ts`
- `src/arena3d/online.ts` → `src/ui/screens/online-modal.ts`
- `src/arena3d/ui.ts` → `src/ui/screens/hud.ts`
- `src/arena3d/touch.ts` → `src/ui/input/touch-controls.ts`
- `src/arena3d/arena3d.css` → `src/ui/styles/game.css`
- `src/arena3d/index.ts` → `src/index.ts` (kèm adapter tương thích ngược tại `src/arena3d/index.ts`)

### 3. Loại Bỏ Hardcode & Cấu Hình Tập Trung
- Tạo `src/config/storage-keys.ts`: Tập trung hóa các khóa lưu trữ `honviet_arena3d_*`.
- Tạo `src/config/env.ts`: Quản lý biến môi trường `VITE_SERVER_URL`, regex `FRIEND_CODE_REGEX` và hàm chuẩn hóa URL.
- Tạo `src/config/game-constants.ts`: Tập trung hóa bán kính arena, giới hạn zoom camera.
- Tạo `server/config.mjs`: Tập trung hóa cấu hình WebSocket server (port, đường dẫn, rate limits).

### 4. Bổ Sung Bộ Công Cụ & Chuẩn Doanh Nghiệp (Enterprise Tooling)
- `.editorconfig`: Chuẩn hóa định dạng mã nguồn (2 spaces, LF line endings, utf-8).
- `.env.example`: Mẫu cấu hình môi trường phát triển và sản xuất.
- `.gitignore`: Cập nhật đầy đủ các danh mục tệp nhạy cảm và tạm thời.
- `eslint.config.js`: Cấu hình linter phẳng.
- `CONTRIBUTING.md`: Quy trình đóng góp mã nguồn và quy chuẩn commit.
- `Dockerfile` & `docker-compose.yml`: Triển khai ứng dụng container hóa multi-stage build.
- `.github/workflows/ci.yml`: Pipeline CI tự động chạy typecheck, server tests, balance check và build.
- `docs/REFACTOR_ANALYSIS.md`: Báo cáo phân tích hiện trạng toàn diện.
- `docs/ARCHITECTURE.md`: Tài liệu thiết kế kiến trúc hệ thống và sơ đồ dữ liệu.
