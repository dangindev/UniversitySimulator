# University Simulator

Web game học tập miễn phí, mô phỏng cuộc sống sinh viên tại một trường đại học hư cấu ở Việt Nam. Hai lộ trình CNTT (125 tín chỉ) và KHMT (126 tín chỉ), cùng hai đường nhập môn C++/Python.

**Trạng thái: bản phát triển nội bộ.** Catalog và hệ thống học vụ đã có; học liệu đang được biên soạn, chưa qua duyệt học thuật đầy đủ. Chưa đủ điều kiện phát hành phase 1 công khai. Đề mẫu phát triển không phải ngân hàng thi chính thức.

## Chạy trên máy

Cần Node.js 24 và npm.

```powershell
npm ci
Copy-Item .env.example .env
npm run dev
```

Mở http://127.0.0.1:5173. Nút **Vào bản phát triển cục bộ** chỉ xuất hiện khi bật `ENABLE_DEV_AUTH=true`. Tiến độ lưu bằng SQLite trong `.data/`, không lưu điểm hay tiền do trình duyệt tự khai. Dùng cùng hồ sơ phát triển để tiếp tục hành trình; token phát triển hết hiệu lực khi API khởi động lại.

## Những gì đã có

- Campus Phaser pixel art tương tác, giao diện học tiếng Việt, onboarding, catalog và đăng ký tín chỉ.
- Ma trận toàn khóa có tiên quyết, lịch lớp, học lại, GPA, miễn tiếng Anh và kiểm toán tốt nghiệp.
- Bài học, ví dụ, checkpoint và trình soạn mã; học liệu có trạng thái sẵn sàng rõ ràng.
- API NestJS: lưu tiến độ, xếp lớp, điểm danh, kỳ thi tính giờ, đời sống và chứng nhận ảo.
- SQLite cho local; PostgreSQL cho production; JWT Supabase; outbox và BullMQ cho bài nộp.
- Bộ chạy Docker cục bộ cho phát triển, hàng đợi bền vững không cần Redis; E2B dành cho production. Thiếu bộ chạy thì báo chưa khả dụng, không chạy mã người học trên host hoặc giả lập kết quả đạt.
- Đời sống, sổ thu chi, NPC và minigame nấu ăn/chạy né chướng ngại.

M1 hiện có 18 chủ đề và 38 bài code ở **mỗi** đường C++/Python, bảng vết từng bước, lỗi thường gặp, bài tự giải thích và ba mốc chương trình ngân sách. Thi thử giữa kỳ, cuối kỳ và thi lại có đề riêng, mỗi đề gồm phần đọc hiểu và bài code bắt buộc. Xem [đề cương M1](docs/M1-SYLLABUS.md) và [cách bật Docker cục bộ](infra/local/README.md). Không có trợ giảng AI trong ứng dụng; gợi ý là học liệu biên soạn sẵn và bị tắt khi thi.

Bản thử trên server dùng [cấu hình SSH nội bộ](infra/ssh/README.md), lưu dưới `/srv/university-simulator` và chỉ truy cập qua tunnel.

## Kiểm tra

```powershell
npm run typecheck
npm test
npm run build
npm run readiness
npm run test:load
npm run verify:intro
```

`npm run readiness -- --strict` trả mã lỗi khi chưa đủ điều kiện phát hành công khai. OpenAPI khi API chạy: http://127.0.0.1:3001/api/docs.

## Cấu hình dịch vụ

Các biến được mô tả trong `.env.example`. Để dùng Google/email, cấu hình Supabase ở cả frontend và API. Thực thi mã cần Redis, E2B và template đã dựng sẵn. Frontend production dùng `VITE_API_URL` trỏ đến API đã triển khai.

Không commit `.env`, khóa dịch vụ, dữ liệu người học hoặc ngân hàng thi riêng. Biến frontend chỉ chứa URL và khóa publishable/anon; tuyệt đối không chứa service-role key.

Production chỉ khởi động khi có hạ tầng, manifest học liệu đã duyệt và ngân hàng đánh giá riêng đầy đủ. Toàn bộ hai ngành phải vượt cổng học thuật, an toàn, tải, chi phí và khôi phục trước khi mở công khai.

Tài liệu: [đặc tả sản phẩm](docs/PRODUCT.md), [API](apps/api/API.md), [hạ tầng và vận hành](infra/OPERATIONS.md), [trạng thái học liệu](docs/content-readiness.md), [kết quả kiểm chứng và giới hạn](docs/VALIDATION.md).

Repository công khai không tự cấp quyền tái sử dụng mã nguồn hoặc học liệu. Bằng và chứng nhận chỉ ghi nhận thành tích mô phỏng trong University Simulator.
