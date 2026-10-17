# Cấu Trúc Mã Nguồn (Source Code Architecture)

Dự án game **Hồn Việt 3D: Đấu Trường Danh Tướng** được viết bằng **TypeScript** kết hợp thư viện đồ họa **Three.js** và bundler **Vite**.

Mã nguồn trong thư mục `src/arena3d/` được chia thành 5 phân hệ logic rõ ràng:

```
src/
└── arena3d/
    ├── index.ts               # Barrel export tập trung cho toàn bộ module
    │
    ├── [1. Core & Gameplay]
    │   ├── main.ts            # Entry point: khởi tạo Three.js canvas, quản lý chuyển cảnh
    │   ├── arena.ts           # Game loop chính: va chạm, quái, đòn đánh, kỹ năng, rơi đồ
    │   └── arenaTypes.ts      # Kiểu dữ liệu TypeScript cốt lõi (Actor, Mon, Proj, Hud, Link)
    │
    ├── [2. Multiplayer & Networking]
    │   ├── net.ts             # WebSocket client kết nối máy chủ, xử lý relay gói tin trận
    │   └── online.ts          # Giao diện sảnh online, phòng chờ, chat, quản lý ID & secret
    │
    ├── [3. Systems & Game Data]
    │   ├── data.ts            # Dữ liệu danh tướng, vũ khí, quái vật, combo, wave monster
    │   ├── cards.ts           # Hệ thống thẻ bài / ngọc kỹ năng nhận khi lên cấp
    │   ├── quests.ts          # Hệ thống nhiệm vụ ngày và 13 thành tích tự động
    │   ├── shop.ts            # Hệ thống cửa hàng mua trang bị giữa các đợt quái
    │   ├── stats.ts           # Thuật toán tính toán chỉ số nhân vật (máu, giáp, sát thương)
    │   ├── save.ts            # Quản lý lưu trữ / tải tiến trình người chơi từ localStorage
    │   ├── settings.ts        # Quản lý cài đặt âm thanh, camera, góc nhìn
    │   └── sfx.ts             # Hệ thống âm thanh procedural tổng hợp bằng Web Audio API
    │
    ├── [4. 3D Graphics & World]
    │   ├── models.ts          # Dựng mô hình 3D procedural (tướng, quái, vũ khí, hiệu ứng)
    │   ├── glbAvatar.ts       # Trình nạp mô hình 3D ngoài (định dạng GLB)
    │   ├── world.ts           # Khởi tạo mặt sàn võ đài, ranh giới, đạo cụ sàn đấu
    │   ├── worldKit.ts        # Bộ công cụ tạo hình học 3D địa hình và môi trường
    │   ├── biomes.ts          # 5 quần xã sinh thái (Đồng quê, Rừng tre, Đầm lầy, v.v.)
    │   ├── hazards.ts         # Mối nguy thiên tai kích hoạt từ màn 21 trở đi
    │   ├── swamp.ts           # Hiệu ứng bùn lầy và mặt nước đầm lầy
    │   ├── ambience.ts        # Âm thanh môi trường và thời tiết theo từng biome
    │   └── eskillFx.ts        # Hiệu ứng hình ảnh kỹ năng phụ (E-skill) và tia ngắm
    │
    └── [5. User Interface & Controls]
        ├── ui.ts              # HUD trận đấu, thanh HP/XP, minimap, popup GameOver/Pause
        ├── lobby.ts           # Giao diện xem trước tướng & vũ khí 3D tại sảnh chính
        ├── touch.ts           # Cần điều khiển ảo (Virtual Joystick) và nút bấm cảm ứng
        └── arena3d.css        # Toàn bộ stylesheet giao diện game (HUD, sảnh, responsive)
```

---

## Chi Tiết Các Phân Hệ

### 1. Phân hệ Core & Vòng lặp trận đấu
* **`main.ts`**: Điểm bắt đầu của ứng dụng trình duyệt. Thiết lập WebGLRenderer, lắng nghe sự kiện cửa sổ, điều khiển trạng thái giữa màn sảnh (`lobby`) và đấu trường (`arena`).
* **`arena.ts`**: Mô-đun lớn nhất (~4.100 dòng code), chứa toàn bộ logic chiến đấu thời gian thực:
  * Khởi tạo và cập nhật trạng thái người chơi, đồng đội và quái vật.
  * Tính toán đạn đạo (`proj`), tầm đánh, chiêu thức đặc biệt (Q, E, Đánh thường, Lướt).
  * Kiểm tra va chạm hình học không gian, rơi vàng/kinh nghiệm/hồi máu.
  * Quản lý tiến trình các đợt sóng (`waves`), triệu hồi Boss và kết thúc trận.
* **`arenaTypes.ts`**: Các interface dữ liệu phục vụ render và mô phỏng mạng.

### 2. Phân hệ Mạng & Nhiều người chơi
* **`net.ts`**: Đóng gói lớp `NetClient`. Cung cấp kết nối WebSocket an toàn, chuẩn hóa địa chỉ máy chủ (`normalizeServerUrl`), tự động kết nối lại và xử lý chuyển tiếp gói tin đồng bộ (`relay`).
* **`online.ts`**: Giao diện người dùng nhiều người chơi:
  * Hiển thị danh sách phòng và bảng xếp hạng trực tuyến.
  * Quản lý ID bạn bè (`HV-XXXX`) và xác thực bằng `secret` token được lưu trữ trong `localStorage`.
  * Hộp thoại nhận lời mời (tự động ẩn khi người chơi đang trong trận đấu đơn hoặc nhiều người để tránh gây gián đoạn).

### 3. Phân hệ Dữ liệu & Tiến trình
* **`data.ts`**: Nơi cấu hình thông số cân bằng game: 9 danh tướng (Trần Hưng Đạo, Quang Trung, Lê Lợi, Bà Triệu, Hai Bà Trưng, Ngô Quyền, Lý Thường Kiệt, Đinh Bộ Lĩnh, Nguyễn Trung Trực), 7 loại vũ khí dân gian, bảng chỉ số quái vật và các combo tướng - vũ khí.
* **`cards.ts` & `shop.ts`**: Cơ chế roguelike nâng cấp sức mạnh tạm thời trong trận và mua sắm trang bị cố định.
* **`save.ts` & `stats.ts`**: Lưu trữ tiến trình mở khóa tướng, tiền vàng, cấp độ trang bị và tính toán ra chỉ số thực chiến.

### 4. Phân hệ Đồ họa 3D & Thế giới
* **`models.ts`**: Tạo dựng toàn bộ nhân vật và vật phẩm bằng các hình khối Three.js nguyên thủy (Box, Sphere, Cylinder) với phong cách low-poly tối ưu hiệu năng cao cho cả thiết bị di động.
* **`biomes.ts` & `world.ts`**: Quản lý môi trường sàn đấu thay đổi liên tục qua các màn chơi, bao gồm màu sương mù, góc chiếu ánh sáng mặt trời và thời tiết.

### 5. Phân hệ Giao diện & Điều khiển
* **`ui.ts` & `arena3d.css`**: Giao diện hiển thị đè lên canvas Three.js, bố cục responsive hỗ trợ từ màn hình máy tính lớn đến điện thoại xoay ngang/dọc.
* **`touch.ts`**: Xử lý chạm đa điểm (multi-touch), tạo cần điều khiển joystick mượt mà cho trải nghiệm mobile hoàn chỉnh.
