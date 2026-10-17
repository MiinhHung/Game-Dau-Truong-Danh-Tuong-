# Hướng Dẫn Đóng Góp (Contributing Guidelines)

Cảm ơn bạn đã quan tâm đến việc phát triển và đóng góp cho **Hồn Việt 3D: Đấu Trường Danh Tướng**!

## 1. Quy Trình Phát Triển (Development Workflow)
1. Fork repository và tạo nhánh mới từ nhánh chính (`main`):
   ```bash
   git checkout -b feature/ten-tinh-nang
   # hoặc
   git checkout -b fix/ten-loi
   ```
2. Cài đặt các thư viện phụ thuộc:
   ```bash
   npm install
   ```
3. Chạy môi trường phát triển cục bộ:
   ```bash
   npm run dev
   ```

## 2. Tiêu Chuẩn Viết Mã (Code Standards)
- **TypeScript:** Tuân thủ `strict: true` trong `tsconfig.json`. Không sử dụng kiểu `any` tùy tiện mà không có lý do chính đáng.
- **Quy tắc phân tầng:**
  - Logic tính toán game đặt trong `src/domain/`.
  - Thành phần dựng hình Three.js đặt trong `src/rendering/`.
  - Giao diện DOM/HTML đặt trong `src/ui/`.
  - Điều phối trận đấu đặt trong `src/game/`.
- **Không hardcode:** Đưa hằng số vào `src/config/`.

## 3. Kiểm Thử & Kiểm Tra Tính Toàn Vẹn
Trước khi tạo Pull Request, bắt buộc tất cả lệnh sau phải pass thành công:
```bash
npm run typecheck    # Kiểm tra type TypeScript
npm run test:server  # 47 ca kiểm thử WebSocket
npm run balance      # Kiểm tra cân bằng sát thương & máu quái
npm run build        # Build thử nghiệm production bundle
```

## 4. Commit Message Convention
Tuân thủ Conventional Commits:
- `feat:` Thêm tính năng mới
- `fix:` Sửa lỗi
- `refactor:` Tái cấu trúc mã nguồn không đổi hành vi
- `perf:` Tối ưu hiệu năng
- `docs:` Bổ sung tài liệu
- `test:` Bổ sung hoặc cập nhật test
- `chore:` Thay đổi công cụ, dependencies, build scripts
