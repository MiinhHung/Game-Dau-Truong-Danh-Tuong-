# Cấu Trúc Mã Nguồn (Source Code Architecture)

Dự án game **Hồn Việt 3D: Đấu Trường Danh Tướng** được viết bằng **TypeScript** kết hợp thư viện đồ họa **Three.js** và bundler **Vite**.

Mã nguồn được chia theo tầng: `config` và `shared` dùng chung, `domain` chứa dữ liệu và luật chơi thuần, `infrastructure` lo lưu trữ, mạng, âm thanh, `rendering` dựng mọi thứ 3D, `game` điều phối trận đấu, `ui` là giao diện HTML đè lên canvas.

```
src/
├── main.ts                     # Entry point: renderer, vòng lặp render, chuyển giữa sảnh và trận
├── index.ts                    # Barrel export toàn bộ public API
├── arena3d/index.ts            # Re-export tương thích ngược cho script cũ
│
├── config/
│   ├── env.ts                  # VITE_SERVER_URL, chuẩn hóa địa chỉ máy chủ, định dạng ID bạn bè
│   ├── game-constants.ts       # Bán kính sân, giới hạn zoom camera
│   └── storage-keys.ts         # Khóa localStorage
├── shared/logger.ts            # Logger theo cấp độ
│
├── domain/
│   ├── data/index.ts           # 9 danh tướng, 7 vũ khí, 12 trang bị, 23 loại quái, kỹ năng E/Q, combo, tiến hóa, thành phần đợt quái
│   ├── combat/stats.ts         # computeStats: chỉ số thực chiến từ tướng, vũ khí, trang bị
│   ├── combat/cards.ts         # 18 thẻ nâng cấp khi lên cấp trong trận
│   ├── progression/quests.ts   # Nhiệm vụ ngày và 13 thành tích
│   └── progression/shop.ts     # Mua, nâng cấp, mang/tháo vũ khí và trang bị
│
├── infrastructure/
│   ├── network/net-client.ts   # NetClient WebSocket: kết nối, phân phát tin nhắn, relay dữ liệu trận
│   ├── persistence/save-repository.ts      # Lưu/tải tiến trình (có làm sạch dữ liệu)
│   ├── persistence/settings-repository.ts  # Âm lượng, zoom camera
│   ├── audio/sfx-engine.ts     # Hiệu ứng âm thanh tổng hợp bằng WebAudio
│   └── audio/ambience-engine.ts # Âm nền riêng cho từng bản đồ
│
├── rendering/
│   ├── primitives/shapes.ts    # Hàm dựng khối cơ bản (box, sph, cyl, cone, mat...)
│   ├── models/models.ts        # Facade re-export các bộ dựng mô hình
│   ├── characters/human-model.ts # Rig người: thân, đầu, tay, chân, mũ, áo choàng
│   ├── weapons/weapon-models.ts  # Dép lào, ghế nhựa, nón lá, chổi chít, muôi canh, lợn, điếu cày
│   ├── items/item-models.ts    # Đạn, đồng vàng, bánh chưng
│   ├── items/gear-models.ts    # Mô hình 3D trang bị và gắn vào rig
│   ├── monsters/monster-models.ts # Rig quái vật, voi chiến
│   ├── loaders/glb-avatar.ts   # Nạp model .glb tùy chọn theo public/models/manifest.json
│   ├── biomes/biomes.ts        # 8 bản đồ và cách xoay vòng theo màn
│   ├── world/world-kit.ts      # Tiện ích thế giới: ARENA_R, rng, texture trống đồng, nhà sàn
│   ├── world/arena-world.ts    # Thế giới đấu trường (ánh sáng, sương, thời tiết) và nền sảnh
│   ├── world/lobby-dioramas.ts # Bối cảnh lịch sử 3D ở sảnh theo từng tướng
│   ├── fx/eskill-fx.ts         # Hiệu ứng kỹ năng E và vòng ngắm kiểu MOBA
│   ├── fx/vfx-textures.ts      # Texture canvas cho hiệu ứng (glow, sóng xung kích, khói...)
│   ├── fx/hazards.ts           # Mối nguy của chế độ vô tận (từ màn 21)
│   └── shaders/                # Shader nước, tan biến, Fresnel và đầm lầy Ngô Quyền
│
├── game/
│   ├── arena.ts                # Điều phối trận: input, chiêu thức, AI quái, đạn, đợt quái, sự kiện bản đồ, lên cấp, đồng bộ mạng
│   ├── types.ts                # Kiểu dữ liệu trận (Actor, Mon, Proj, Snap, Hud...)
│   ├── camera/arena-camera.ts  # Camera nhìn xuống, zoom, rung màn hình
│   └── systems/                # DropSystem (vàng, bánh chưng) và MinimapRenderer
│
└── ui/
    ├── screens/hud.ts          # HUD trong trận, sảnh, cửa hàng, nhiệm vụ, cài đặt, các hộp thoại
    ├── screens/online-modal.ts # Kết nối, sảnh ghép trận, phòng chờ, chat, mời bạn bằng ID
    ├── screens/lobby-scene.ts  # Cảnh 3D sảnh chờ: bệ trống đồng và tướng xem trước
    ├── screens/shop-hero-stage.ts # Sân khấu 3D xoay 360° trong cửa hàng trang bị
    ├── screens/loading-screen.ts  # Màn hình loading và mẹo chơi
    ├── input/touch-controls.ts # Joystick ảo, nút cảm ứng, chụm hai ngón để zoom
    └── styles/game.css         # Toàn bộ stylesheet
```

---

## Luồng chính

* **Vòng lặp:** `main.ts` gọi `lobby.update` hoặc `arena.update` mỗi khung hình rồi render cảnh tương ứng.
* **Một trận:** `Arena.start` tạo người chơi, `nextWave` lấy thành phần quái từ `waveComposition` theo bản đồ của màn (`biomeIndexForWave`). Cứ 5 màn có boss xoay vòng Rồng Lửa, Titan Đá, Vua Xương. Từ màn 21 mỗi màn thêm một mối nguy.
* **Chơi cùng bạn bè:** chủ phòng chạy toàn bộ mô phỏng (`updateSim`) và gửi bản chụp 15 lần mỗi giây (`buildSnap`). Máy khách chỉ gửi thao tác (`k: 'in'`) và nội suy hiển thị (`applySnap`, `applyEvent`).
* **Tiến trình:** vàng, vũ khí, trang bị, nhiệm vụ và thành tích lưu trong localStorage qua `save-repository.ts`.
