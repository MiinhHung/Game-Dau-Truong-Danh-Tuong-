# Báo Cáo Phân Tích Hiện Trạng Mã Nguồn (Refactor Analysis)

**Dự án:** Hồn Việt 3D - Đấu Trường Danh Tướng  
**Vai trò:** Senior Software Architect  
**Ngày lập:** 17/10/2026  
**Trạng thái:** Hoàn thành Giai đoạn 1 (Chưa thay đổi mã nguồn logic nghiệp vụ)

---

## 1. Tổng Quan Hệ Thống

| Thành phần | Chi tiết kỹ thuật |
| :--- | :--- |
| **Ngôn ngữ chính** | TypeScript (Frontend - v5.6.0), JavaScript ESM (Backend/Tools - Node.js v20+) |
| **Framework / Thư viện đồ họa** | Three.js (v0.170.0), Vanilla DOM/CSS3, Web Audio API, WebSockets (`ws` v8.22.0) |
| **Build Tool & Bundler** | Vite (v5.4.0) với Rollup manualChunks |
| **Frontend Entry Point** | `index.html` → `/src/arena3d/main.ts` |
| **Backend Entry Point** | `server/index.mjs` (Standalone HTTP/WS) & `vite.config.ts` (Dev/Preview WS hook) |
| **Cấu hình & Triển khai** | `package.json`, `tsconfig.json`, `vite.config.ts`, `render.yaml` |
| **Testing hiện có** | `npm run test:server` (`server/test.mjs` - 47 ca kiểm thử tích hợp cho WebSocket room/lobby). *Chưa có unit test cho Frontend/Gameplay.* |
| **Công cụ bổ trợ** | `npm run balance` (`tools/balance.mjs` - mô phỏng DPS & máu quái), `tools/gen-model.mjs` (tạo model GLB từ ảnh qua API) |

---

## 2. Bản Đồ Hiện Trạng & Danh Mục File

### 2.1. Phân loại theo khu vực mã nguồn

| Khu vực | File | Dòng | Dung lượng | Trách nhiệm chính |
| :--- | :--- | :--- | :--- | :--- |
| **Root Config** | `package.json` | 26 | 780 B | Quản lý script, dependencies |
| | `tsconfig.json` | 17 | 390 B | Cấu hình TypeScript compiler |
| | `vite.config.ts` | 30 | 1.0 KB | Cấu hình Vite & plugin nhúng game server |
| | `index.html` | 53 | 2.8 KB | Shell HTML, canvas & containers giao diện |
| | `render.yaml` | 14 | 669 B | Blueprint triển khai đám mây (Render) |
| | `.gitignore` | 8 | 109 B | Loại trừ file khỏi VCS |
| | `README.md` | 370 | 29.8 KB | Tài liệu giới thiệu trò chơi |
| **Backend Server** | `server/index.mjs` | 59 | 2.3 KB | Máy chủ HTTP tĩnh + gắn WebSocket |
| | `server/rooms.mjs` | 475 | 19.4 KB | Quản lý sảnh, phòng, xác thực, rate limit, leaderboard |
| | `server/test.mjs` | 253 | 13.2 KB | Kịch bản kiểm thử tích hợp WebSocket server |
| **Tools / CLI** | `tools/balance.mjs` | 135 | 7.1 KB | Tool CLI tính toán cân bằng DPS & TTK |
| | `tools/gen-model.mjs` | 157 | 7.2 KB | Tool CLI sinh mô hình 3D từ ảnh qua AI API |
| **Frontend: Core & Loop** | `src/arena3d/main.ts` | 194 | 5.5 KB | Khởi tạo Three.js renderer, điều phối cảnh (lobby/arena) |
| | `src/arena3d/arena.ts` | **3,951** | **168.6 KB** | **[SUPER GOD FILE]** Toàn bộ runtime chiến đấu, quái, va chạm, mạng, hud |
| | `src/arena3d/arenaTypes.ts` | 270 | 7.9 KB | Định nghĩa kiểu TypeScript cho hệ thống arena |
| | `src/arena3d/index.ts` | 39 | 1.0 KB | Barrel export cho toàn bộ thư mục arena3d |
| **Frontend: 3D Graphics** | `src/arena3d/models.ts` | **1,135** | **54.2 KB** | **[GOD FILE]** Dựng 3D procedural nhân vật, quái vật, vũ khí, hiệu ứng |
| | `src/arena3d/biomes.ts` | **968** | **47.8 KB** | **[GOD FILE]** 8 môi trường bản đồ procedural và chu kỳ chuyển đổi |
| | `src/arena3d/world.ts` | 182 | 6.7 KB | Võ đài trung tâm, ranh giới, bệ đấu |
| | `src/arena3d/worldKit.ts` | 106 | 3.6 KB | Helper hình học không gian cho địa hình |
| | `src/arena3d/swamp.ts` | 119 | 4.8 KB | Hiệu ứng shader đầm lầy |
| | `src/arena3d/glbAvatar.ts` | 90 | 4.1 KB | Tải mô hình GLB ngoài nếu có |
| | `src/arena3d/eskillFx.ts` | 440 | 20.9 KB | Hiệu ứng hình ảnh kỹ năng phụ (E-skill) của từng danh tướng |
| **Frontend: Gameplay Logic** | `src/arena3d/data.ts` | 341 | 25.3 KB | Dữ liệu cân bằng tướng, vũ khí, quái, trang bị, wave |
| | `src/arena3d/stats.ts` | 53 | 1.9 KB | Thuật toán tính toán chỉ số chiến đấu tổng hợp |
| | `src/arena3d/cards.ts` | 35 | 2.2 KB | Kho ngọc/thẻ kỹ năng tăng cấp roguelike |
| | `src/arena3d/quests.ts` | 113 | 6.2 KB | Nhiệm vụ ngày và 13 thành tựu tích lũy |
| | `src/arena3d/shop.ts` | 61 | 2.6 KB | Cửa hàng mua trang bị giữa các hiệp |
| | `src/arena3d/hazards.ts` | 22 | 1.2 KB | Mối nguy môi trường (sấm sét, đá rơi) từ wave 21 |
| | `src/arena3d/save.ts` | 123 | 5.0 KB | Quản lý lưu trữ localStorage và bộ lọc dữ liệu an toàn |
| | `src/arena3d/settings.ts` | 42 | 1.3 KB | Quản lý cài đặt âm thanh và góc nhìn |
| **Frontend: Audio** | `src/arena3d/sfx.ts` | 60 | 2.2 KB | Bộ sinh hiệu ứng âm thanh procedural (Web Audio synth) |
| | `src/arena3d/ambience.ts` | 287 | 10.5 KB | Âm thanh môi trường và thời tiết theo biome |
| **Frontend: UI & Input** | `src/arena3d/ui.ts` | 512 | 24.8 KB | Giao diện HUD, thanh máu, minimap canvas 2D, popup |
| | `src/arena3d/online.ts` | 536 | 24.8 KB | Giao diện sảnh online, chat log, popup mời bạn |
| | `src/arena3d/lobby.ts` | 82 | 3.0 KB | Giao diện xem trước tướng & vũ khí 3D tại sảnh |
| | `src/arena3d/touch.ts` | 175 | 6.3 KB | Virtual Joystick và nút cảm ứng trên thiết bị di động |
| | `src/arena3d/arena3d.css` | 311 | 22.2 KB | Định dạng stylesheet giao diện game |
| **Static Assets** | `public/models/manifest.json` | 1 | 4 B | File rỗng `{}` lưu registry GLB |

---

## 3. Bản Đồ Phụ Thuộc (Dependency Graph) & Vấn Đề Ghép Nối

### 3.1. Luồng dữ liệu và tham chiếu hiện tại
```
index.html 
   │
   └──► src/arena3d/main.ts
            ├──► lobby.ts  ──► world.ts, models.ts, glbAvatar.ts
            ├──► online.ts ──► net.ts, ui.ts, sfx.ts, save.ts
            └──► arena.ts  (GOD FILE - phụ thuộc 16 module khác nhau)
                     ├──► Three.js (WebGL, Object3D, Vector3, Mesh...)
                     ├──► models.ts, biomes.ts, world.ts, swamp.ts, eskillFx.ts, glbAvatar.ts
                     ├──► data.ts, stats.ts, cards.ts, quests.ts, shop.ts, hazards.ts
                     ├──► net.ts, save.ts, settings.ts, sfx.ts, ambience.ts
                     ├──► touch.ts
                     └──► ui.ts (Circular dependency concept!)
```

### 3.2. Vấn đề ghép nối 2 chiều (Circular & High Coupling)
- `arena.ts` trực tiếp import và gọi các phương thức trong `ui.ts` (`showCards`, `showGameOver`, `updateHud`, `toast`, `flashBanner`).
- Ngược lại, `ui.ts` lại import `type { Arena } from './arena'` và lưu trữ con trỏ `private arena: Arena | null` để gọi ngược lại phương thức `this.arena.chooseCard(c)`, `this.arena.setPaused(...)`.
- Trạng thái trò chơi phân mảnh: `save.ts` lưu dữ liệu lâu dài, `arena.ts` lưu dữ liệu runtime, `online.ts` lưu dữ liệu mạng, `ui.ts` lưu dữ liệu hiển thị DOM. Không có một State Manager tập trung dẫn đến việc phải truyền con trỏ chéo khắp nơi.

---

## 4. Danh Sách Code Smells & Nợ Kỹ Thuật (Technical Debt)

### 4.1. Khối "God File / God Class"
1. **`src/arena3d/arena.ts` (3,951 dòng)**:
   - Vi phạm nghiêm trọng nguyên tắc Single Responsibility (SRP).
   - Chứa cùng lúc:
     - Khởi tạo và điều khiển Camera (orbit, follow, shake, zoom).
     - Quản lý vòng đời trận đấu (start, pause, wave progression, game over).
     - Vòng lặp vật lý và va chạm (player bounding sphere, monster distance, projectile raycasts).
     - Logic AI quái vật (8 loại quái vật: đuổi theo, bắn xa, tích tụ, húc dũng mãnh, phân chia phân bào, triệu hồi đệ tử).
     - Logic chiêu thức và hoạt ảnh 9 danh tướng (Q ultimate, E skill, đánh thường 3 đòn, lướt).
     - Hệ thống rơi vật phẩm (vàng, ngọc kinh nghiệm, bánh chưng, nam châm hút đồ).
     - Vẽ minimap 2D lên HTML5 Canvas con.
     - Đồng bộ đa người chơi qua WebSocket (gói tin relay p2p giả lập, nội suy vị trí remote actors).
     - Quản lý bộ đệm âm thanh và phát hạt visual fx.

2. **`src/arena3d/models.ts` (1,135 dòng)**:
   - Dựng mô hình 3D nguyên thủy Three.js cho 9 danh tướng, 7 vũ khí, 8 loại quái vật, 5 loại đạn và hiệu ứng rơi đồ gom chung trong một file duy nhất.

3. **`src/arena3d/biomes.ts` (968 dòng)**:
   - Định nghĩa toàn bộ 8 quần thể cảnh quan 3D (Đồng quê, Bãi tha ma, Rừng huyết mộc, Giông tố, Xứ tuyết, Núi lửa, Bạch Đằng giang, Động Phong Nha) dồn trong 1 file.

### 4.2. Hardcoded Values (Giá trị gán cứng)
1. **Khóa LocalStorage rải rác**:
   - `'honviet_arena3d_save_v1'` (`save.ts`)
   - `'honviet_arena3d_settings'` (`settings.ts`)
   - `'honviet_arena3d_name'`, `'honviet_arena3d_server'`, `'honviet_arena3d_code'`, `'honviet_arena3d_secret'` (`online.ts`)
2. **Cấu hình mạng & Port**:
   - Port `8787` (`server/index.mjs`), Port `5173` (`vite.config.ts`).
   - Đường dẫn WebSocket `/ws` hardcode tại `server/rooms.mjs`, `server/index.mjs`, `src/arena3d/net.ts`.
3. **Magic Numbers trong Gameplay**:
   - Bán kính sàn đấu `ARENA_R = 40` hardcode lặp lại trong `world.ts`, `arena.ts`, `biomes.ts`.
   - Giới hạn camera zoom `[9, 36]` hardcode trong `settings.ts` và `arena.ts`.

### 4.3. Code Trùng Lặp (Duplication)
- Regex kiểm tra định dạng mã bạn bè: `const CODE_RE = /^HV-[A-Z0-9]{4,6}$/;` được khai báo độc lập ở cả `src/arena3d/net.ts` và `server/rooms.mjs`.
- Hàm làm sạch chuỗi `clean(str, max)` định nghĩa riêng ở `server/rooms.mjs` và không chia sẻ được với client.
- Tạo vật liệu 3D Three.js và helper đổ bóng (`shadowed`, `mat`, `box`, `cyl`) bị phân tán giữa `models.ts`, `worldKit.ts` và `biomes.ts`.

### 4.4. Code Chết / Chưa sử dụng
- `public/models/manifest.json`: Chứa đúng 4 ký tự `{}` (placeholder cho công cụ AI 3D).
- `src/README.md`: Mô tả kiến trúc cũ dạng phẳng, không đồng bộ với tài liệu kiến trúc cấp cao của doanh nghiệp.

### 4.5. Thiếu Chuẩn Doanh Nghiệp (Enterprise Readiness)
- Chưa có file cấu hình môi trường chuẩn (`.env.example`).
- Chưa có cấu hình định dạng và quy chuẩn viết mã đồng bộ (`.editorconfig`, `.prettierrc`, ESLint config).
- Chưa có Docker containerization (`Dockerfile`, `docker-compose.yml`) cho Node.js server.
- Chưa có CI pipeline (GitHub Actions workflow cho lint, typecheck, build, test).

---

## 5. Kết Luận & Định Hướng Giai Đoạn 2
Cấu trúc hiện tại có logic game và multiplayer hoạt động rất tốt (đầy đủ tính năng, hiệu năng mượt, test server pass 100%), tuy nhiên hình thái tổ chức mã nguồn đang mang tính chất "tất cả trong một thư mục" (`src/arena3d/`).

Để đạt chuẩn doanh nghiệp (Enterprise Standard), cần tái cấu trúc theo mô hình **Modular Layered Architecture** (Kiến trúc phân tầng module hóa), tách các God File thành các domain modules độc lập, tập trung hóa constants & config, áp dụng Dependency Inversion (Event/Observer pattern) để giải quyết import vòng giữa Combat Loop và UI, và bổ sung bộ toolchain tiêu chuẩn CI/CD/Docker.
