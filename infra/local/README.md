# Chấm bài local bằng Docker — M1 nội bộ

Không cần Redis, E2B hoặc dịch vụ trả phí. API dùng SQLite bền vững và tiêu thụ hàng đợi trong cùng tiến trình, tối đa hai job song song. Mã người học **chỉ** chạy trong Linux container riêng từng ca thử, không chạy bằng Python/g++/Node của máy chủ.

## Chuẩn bị

1. Cài Node 24 và Docker Engine Linux. Windows cần Docker Desktop Linux engine đang hoạt động; trên Linux cần quyền Docker cho tài khoản chạy API đáng tin cậy.
2. Từ thư mục repository, build image với context nhỏ không chứa dữ liệu/secret ứng dụng:

```text
docker build --tag university-simulator-runner:local --file infra/local/Dockerfile infra/local
```

3. Cấu hình `.env` riêng, không commit:

```dotenv
NODE_ENV=development
ENABLE_DEV_AUTH=true
ENABLE_DEV_ASSESSMENTS=true
EXECUTION_PROVIDER=docker-local
LOCAL_RUNNER_IMAGE=university-simulator-runner:local
LOCAL_DATA_DIR=/absolute/private/path/university-data
PORT=3001
CORS_ORIGIN=http://localhost:5173,http://127.0.0.1:5173
```

Trên Windows dùng đường dẫn tuyệt đối Windows cho `LOCAL_DATA_DIR`. API lắng nghe `127.0.0.1`; giữ bản nội bộ qua SSH tunnel hoặc cổng preview có bảo vệ. Không mở development auth ra Internet và không đổi thành production chỉ để vượt cổng học liệu/đề thi chưa duyệt.

4. Chạy `npm run dev`. Health/bootstrap công bố `executionProvider`, `executionReason`, `executionConcurrency` và `codeExecution` theo Docker thật. Khi engine hoặc image chưa sẵn sàng, chấm bài/thi code trả 503 và không tạo điểm giả. Bài giảng vẫn đọc được.

## Kiểm chứng thực tế

```text
npm run test:docker -w @university-simulator/api
```

Hoặc trên Linux:

```sh
USIM_DOCKER_INTEGRATION=1 npx vitest run apps/api/test/docker.integration.test.ts
```

Lệnh riêng bật các thử nghiệm thực: C++/Python/JavaScript/SQL đúng; sai đầu ra, lỗi biên dịch/runtime, giới hạn CPU/đầu ra, mạng bị chặn, root filesystem không ghi được, UID/capabilities, giới hạn tài nguyên, dọn container, hàng đợi SQLite thật. Bộ `npm test` bình thường chỉ chạy unit/mock nhanh và đánh dấu rõ các bài Docker chưa bật là skipped.

## Ranh giới cách ly

Mọi ca thử dùng image digest đã xác minh, `--network none`, root filesystem readonly, drop toàn bộ capabilities, no-new-privileges, UID/GID 65532, 512 MiB RAM, 1 CPU, tối đa 64 PID, tmpfs có giới hạn, không bind mount hoặc Docker socket. Compiler/learner có thêm giới hạn CPU, file, process và output. stdout được giữ bằng regular file descriptor vô danh trong container; ứng dụng nhận JSON/buffer có giới hạn. Host chỉ gọi Docker CLI với argv cố định và truyền source/input bằng stdin JSON, không qua shell.

Chỉ một input được gửi mỗi container. Expected output và kết luận chấm nằm ở ứng dụng bên ngoài. Public tests trả đầu vào/expected/actual/chẩn đoán có giới hạn; ca kín chỉ có trạng thái/thống kê, không lộ oracle. Mọi container có tên/nhãn riêng và được xóa trong `finally`.

Runtime probe chỉ chạy một container khi image digest mới xuất hiện. Khi image đã xác minh, kiểm tra engine/image nhẹ được cache 30 giây, tránh tạo container liên tục lúc máy chủ nhàn rỗi.

Docker không phải cam kết an toàn tuyệt đối cho dịch vụ công khai nhiều người. Đây là chế độ phát triển/preview riêng; production tiếp tục yêu cầu executor cô lập đã cấu hình, ngân hàng riêng và mọi cổng phát hành. Không có fallback chạy learner source trực tiếp trên host.

## Điểm thực hành và thi

Mỗi đường nhập môn có 38 bài code bắt buộc. Điểm thực hành là trung bình điểm kiểm thử tốt nhất của **tất cả** 38 bài; bài chưa làm tính 0, checkpoint không cộng vào phần thực hành code. Làm lại không cộng điểm nhiều lần. Trước cuối kỳ cần hoàn thành đủ kiểm thử của 18 bài nền đầu khóa và ba mốc sản phẩm. Ba mốc có điểm thông tin 20/30/50; không được cộng lặp vào trung bình toàn môn.

Đề giữa kỳ, cuối kỳ và thi lại có phiên bản/bài code riêng. Source cuối cùng được máy chủ xác nhận được đóng băng khi nộp/hết giờ; job có thể chấm sau deadline mà không bị tính trễ. Nếu Docker gặp sự cố, trạng thái là `grading-error`, không tạo điểm trượt. Trong bản Docker development dùng ngân hàng mẫu công khai, chủ hồ sơ có thể gọi `POST /api/v1/exams/:id/retry-local` để chấm lại **cùng** source đã đóng băng, có nhật ký và reservation mới. Endpoint này không tồn tại ở production hoặc với ngân hàng riêng. Các route quản trị bình thường vẫn yêu cầu MFA, không nhận quyền từ tài khoản local.
