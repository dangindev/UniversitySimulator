# Bản thử nội bộ qua SSH

Đây là môi trường phát triển riêng tư. Chưa phải phát hành phase 1. Người thử truy cập bằng SSH tunnel; web/API chỉ bind `127.0.0.1`, không thêm vào HAProxy, DNS công khai hoặc firewall. Không nhập dữ liệu cá nhân thật vào hồ sơ phát triển.

## Vị trí và thành phần

- `/srv/university-simulator/releases/<release>`: mã nguồn của một commit, dependency và frontend đã build.
- `/srv/university-simulator/current`: liên kết tới bản đang chạy; đổi liên kết và restart để phát hành/hoàn tác ứng dụng.
- `/srv/university-simulator/state/data`: SQLite và bài nộp, độc lập với release.
- `/srv/university-simulator/state/runtime.env`: cấu hình riêng, quyền 0640; không đưa vào Git.
- `/srv/university-simulator/state/backups`: snapshot SQLite nhất quán đã kiểm tra integrity.
- `/srv/university-simulator/staging`: gói chuyển lên và ngữ cảnh dựng runner, không chứa khóa hay dữ liệu người học.
- `/opt/university-simulator-runtime`: Node 24.14 riêng cho dự án, không đổi Node của các ứng dụng khác.

API là `university-simulator-api.service` tại `127.0.0.1:33101`. Frontend tĩnh và proxy API là `university-simulator-preview.service` tại `127.0.0.1:33173`. Không dùng Vite dev server trên server.

## Dựng và chạy

1. Dùng archive Git của commit đã kiểm tra, giải nén vào release mới. Không chuyển `.env`, `.data`, `node_modules`, private bank hoặc dữ liệu thử từ máy cá nhân.
2. Dựng image `university-simulator-runner:local` với đúng ngữ cảnh `infra/local`. Chỉ compiler/runtime và bộ giám sát tin cậy đi vào image, không có mã ứng dụng hoặc đáp án.
3. Chạy `install-node-runtime.sh` để lấy Node/npm từ image Node chính thức, đặt ở runtime riêng. Tạo tài khoản hệ thống `university-simulator`, không có shell đăng nhập. Build dependency/frontend bằng tài khoản này, sau đó chuyển mã release sang root sở hữu và chỉ đọc.
4. Tạo state và cấu hình từ `runtime.env.example`. Chỉ API có supplementary group `docker`; quyền Docker daemon tương đương quyền quản trị host, nên profile này chỉ dành cho bản thử qua SSH. Mã người học chạy trong container hạn chế, không có Docker socket, mount host, Internet hoặc đáp án. Không dùng cấu hình này thay E2B cho phát hành công khai.
5. Sao lưu state trước khi chuyển release. Cài các unit trong thư mục này; đổi `current`, restart API/frontend, kiểm tra health và luồng thực tế. API báo lỗi cấu hình thay vì giả lập kết quả đạt.
6. Bật timer backup hằng ngày; theo lịch trong unit, khoảng 03:00 giờ Việt Nam, có độ trễ ngẫu nhiên tối đa 5 phút. Kiểm tra dung lượng định kỳ và thực hiện khôi phục vào bản sao riêng. Chưa có backup ngoài máy chủ hay chứng nhận khôi phục production.

## Truy cập từ máy cá nhân

```powershell
ssh -N -L 127.0.0.1:5174:127.0.0.1:33173 sv-opensolutions-bk
```

Giữ cửa sổ lệnh mở, rồi vào `http://127.0.0.1:5174`. Đăng nhập phát triển với cùng tên hồ sơ để khôi phục sinh viên. Token phát triển hết hiệu lực khi API restart; tiến độ trong SQLite vẫn giữ.

```bash
systemctl status university-simulator-api university-simulator-preview
journalctl -u university-simulator-api -n 60 --no-pager
curl -fsS http://127.0.0.1:33101/api/v1/health
curl -fsS http://127.0.0.1:33173/healthz
systemctl start university-simulator-backup.service
```

Nếu bản mới lỗi: dừng nhận bài mới, giữ nguyên state/bài nộp, chuyển `current` về release tương thích rồi restart. Không ghi đè database bằng snapshot cũ khi chưa đối soát bài đã nhận hoặc chưa chuẩn bị kế hoạch phục hồi. Trước khi thay đổi schema/bank, giữ phiên bản cũ cho các lượt thi đang tồn tại.
