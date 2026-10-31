# University Simulator — vận hành và cổng phát hành

## Trạng thái

Đây là nền tảng phát triển. Ngân hàng mẫu công khai và học liệu nháp không đủ điều kiện phát hành phase 1. Không triển khai public bằng cách bật cờ development trên một máy chủ truy cập Internet. API production từ chối khởi động khi thiếu dịch vụ, manifest duyệt toàn bộ môn hoặc ngân hàng đánh giá riêng.

## Chạy local

Node 24 trở lên. Từ thư mục gốc chạy `npm install`, sau đó cấu hình `.env` đã bị Git bỏ qua:

```dotenv
ENABLE_DEV_AUTH=true
ENABLE_DEV_ASSESSMENTS=true
PORT=3001
LOCAL_DATA_DIR=../../.data
CORS_ORIGIN=http://localhost:5173,http://127.0.0.1:5173
```

`npm run dev` mở frontend và API. Dữ liệu SQLite nằm ngoài nguồn được commit. API chỉ lắng nghe loopback trong chế độ phát triển. Đăng nhập local là hồ sơ thử nghiệm, không phải Google/email thật. Token local mất hiệu lực sau khi API khởi động lại; đăng nhập lại cùng profile khôi phục sinh viên đã lưu.

`npm test` kiểm tra học vụ, xếp lớp, thời gian thi, quyền sở hữu, hàng đợi và dữ liệu bền vững. `npm run typecheck` kiểm tra toàn bộ package. `GET /api/v1/health` công bố khả năng thực tế và `GET /api/docs` mở OpenAPI.

## Kết nối các dịch vụ thật

1. Tạo Supabase project tại Singapore, bật Google OAuth và email magic link. Cấu hình redirect URL chính xác, nhà cung cấp SMTP riêng và hạn mức gửi. Browser chỉ nhận URL và **publishable/anon key**. Không đưa service-role key vào frontend.
2. Dùng kết nối PostgreSQL TLS đã xác minh chứng thư. Chạy `npm run migrate -w @university-simulator/api` bằng tài khoản migration, sau đó áp dụng `infra/postgres/runtime-role.sql` và tạo LOGIN role thành viên `usim_api`. Cấu hình `DATABASE_URL` của role hạn chế vào API/worker qua secret manager. Production chỉ kiểm tra migration đã tồn tại, không chạy DDL bằng role ứng dụng; `RUN_DATABASE_MIGRATIONS=true` chỉ dùng có chủ đích với role migration. RLS chặn truy cập qua Data API; browser không được ghi trực tiếp điểm hoặc sổ tiền.
3. Tạo Redis riêng, không public Internet; API và worker cùng Redis, database và ngân hàng phiên bản. `BullMQ.setGlobalConcurrency(10)` giới hạn toàn cụm. Mỗi sinh viên chỉ có một submission queued/running, có unique index PostgreSQL.
4. Dựng template E2B từ `infra/sandbox/Dockerfile`, ghi lại digest/template ID và phiên bản compiler. Test compile C++20, Python, Node và SQLite trước khi nhận bài. Đặt `E2B_API_KEY`, `E2B_TEMPLATE_ID`, `REDIS_URL`. Không cài package tùy ý trong job. ML cần template thư viện/dữ liệu riêng đã kiểm chứng trước khi thêm bài.
5. API tắt outbound Internet và public traffic của mọi sandbox một cách tường minh. Đáp án được so sánh bên ngoài sandbox; chỉ gửi input cần thiết, không gửi expected output hoặc toàn bộ ngân hàng. Sandbox được kill trong `finally`, kể cả khi mã lỗi.
6. Tạo ngân hàng đề **ngoài repository công khai**, tải bằng secret file `ASSESSMENT_BANK_PATH`; đọc cấu trúc từ `apps/api/src/bank.ts`. Giữ nguyên phiên bản ngân hàng đến khi mọi job của phiên bản đó kết thúc. Không thay đáp án của một version đã dùng.
7. Cấp manifest riêng bằng `CONTENT_MANIFEST_PATH`, chứa `{curriculumVersion:"2026.v1",phase1Approved:true,courses:[{courseId,reviewed:true}]}` cho **mọi** môn và điều kiện phi tín chỉ. Chỉ cấp sau khi hoàn thành bài giảng, ứng dụng, bộ chấm và kiểm chứng học thuật. Bản build cũng phải có metadata học liệu đã duyệt, mọi môn hoàn chỉnh và bài học đã review; manifest ngoài không ghi đè trạng thái nháp/thiếu nội dung đang được đóng gói.
8. Dùng `infra/render.yaml` làm blueprint sau khi cổng phát hành đạt: CDN static frontend, API, worker và Redis. Đặt `VITE_API_URL` thành URL API có hậu tố `/api/v1`, `VITE_SUPABASE_URL` và `VITE_SUPABASE_ANON_KEY` là giá trị công khai cho frontend; tuyệt đối không dùng service-role key. URL frontend phải nằm trong `CORS_ORIGIN` của API và danh sách redirect Supabase. Nếu đổi tên miền API, cập nhật host `connect-src` của CSP trong blueprint rồi kiểm tra đăng nhập/API trên bản deploy; SPA rewrite mọi route về `/index.html`. Dùng gói trả phí không ngủ cho API/worker; không coi gói miễn phí là năng lực đã được kiểm chứng.

## Hạn mức và chi phí

`EXECUTION_MONTHLY_SECONDS` giới hạn tổng giây chạy **tối đa đã đặt trước** theo tháng UTC, gồm thời gian bài tập cộng 15 giây biên dịch/đóng VM. Đặt trước ngân sách, ghi bài nộp và outbox trong cùng transaction; job trùng/lỗi ghi không tiêu thêm hạn mức. Mức mặc định một triệu giây là hạn mức phát triển, **không phải báo giá**. Tính lại từ cấu hình CPU/RAM, bảng giá, tỷ giá và phần ngân sách 4 triệu đồng dành cho executor; không dùng credit khuyến mại làm chi phí ổn định.

Đo chi phí theo hồ sơ tải 100 người đọc bài/tự lưu/nộp bài, tối đa 10 executor. Cảnh báo vận hành tại 70% và 85% ngân sách; dashboard/billing provider là nguồn đối soát chi phí thực. Hạn mức ứng dụng chỉ kiểm soát job của ứng dụng, không kiểm soát các sandbox do người quản trị tạo thủ công.

API phải tắt khả năng mở bài code khi worker/provider không khỏe; thao tác khẩn cấp là dừng nhận submission mới và pause queue, giữ nguyên SQLite/PostgreSQL/outbox. Không xóa dữ liệu đang chờ. Trước khi mở thi có chấm code bất đồng bộ cần đặt trước tài nguyên và kiểm tra khả năng tiếp nhận cho toàn lượt thi.

Một timer thi code chỉ được tạo khi worker có heartbeat còn hạn, Redis không pause, hàng đợi dưới giới hạn và ngân sách đủ. Reservation của VM được ghi trong cùng transaction với attempt; nếu thời gian thi đi qua ranh giới tháng UTC, giữ ngân sách bảo thủ cho cả hai tháng có thể tính phí. Khi nộp hoặc hết giờ, snapshot nguồn/đáp án, `acceptedAt` và cờ outbox được commit trước khi enqueue. Vòng đối soát hai giây khôi phục bài đã nhận nếu API chết giữa hai bước. Chấm xong sau deadline vẫn sử dụng nguồn đã nhận hợp lệ, không tính trễ theo thời gian worker hoàn thành.

Dispatcher đối soát mọi bài queued với Redis bằng job ID bền vững, kể cả khi đã đánh dấu dispatched. Nếu Redis mất job, bài được xếp lại; atomic claim trong database ngăn chạy song song cùng bài. Lease chạy dài hơn thời gian VM tối đa 60 giây. Khi worker chết, lease hết hạn chuyển thành lỗi hệ thống, giữ nguyên mã nguồn và giải phóng quota để người học gửi lại; không âm thầm chạy một VM tính phí thứ hai bằng một reservation cũ. Kết quả đã lưu nhưng chưa áp dụng tiến độ có thể được xử lý lại idempotent mà không thực thi mã lần nữa.

## Thi, sự cố và hoàn tác

- Deadline ở máy chủ, immutable trong mỗi attempt. Trình duyệt tải lại không tạo đề hoặc giờ mới. `savedAt` là lần lưu đã xác nhận. Nộp lại không cộng điểm lần hai.
- Mất mạng thiết bị không dừng giờ. Khi nền tảng lỗi, lưu incident ID, khoảng thời gian, attempt bị ảnh hưởng và nhật ký. API quản trị yêu cầu JWT Supabase có `app_metadata.role=admin` được ký và MFA `aal2`; không có đường đăng nhập admin local. `POST /api/v1/admin/exams/:studentId/:examId/void` giữ lại đề/câu trả lời, vô hiệu kết quả bị ảnh hưởng và giải phóng quota. `POST .../retry` chỉ chấm lại lỗi hệ thống bằng cùng snapshot và thời điểm nhận, có reservation/job mới. Lý do quản trị phải từ 10 đến 500 ký tự.
- `POST /api/v1/admin/execution` với `{paused:true,reason}` đặt cờ Redis bền vững `usim:execution-paused`. API preflight, dispatcher và worker đều kiểm tra trước khi mở VM mới; job đang chạy được hoàn thành. `GET /api/v1/admin/readiness` cho phép kiểm tra các cổng nội dung, ngân sách 70%/85% và trạng thái pause. Các route này không nhận actor/quyền từ body.
- Bài thi code có trạng thái `grading`, `grading-error` hoặc `graded`; lỗi provider không trở thành điểm trượt. Giữ nguyên numeric score, đồng thời áp dụng điều kiện thiết yếu của bài code cuối kỳ (mặc định ít nhất 50% test). Không cấp tín chỉ lập trình bằng điểm chọn đáp án nếu điều kiện code chưa đạt. Chỉ một câu code mỗi đề được hỗ trợ trong v1; ngân hàng đề sai cấu trúc phải bị từ chối.
- Không sửa trực tiếp điểm để "sửa nhanh". Mỗi thay đổi hành chính cần audit người thực hiện, lý do, dữ liệu trước/sau và thông báo cho chủ tài khoản qua quy trình hỗ trợ đã được duyệt.
- Nhật ký toàn cục `admin_audit` là append-only; role ứng dụng chỉ có quyền INSERT/SELECT. Thao tác điểm ghi thêm sự kiện vào hồ sơ sinh viên trong cùng transaction, và loại sự kiện riêng tư khỏi phản hồi cho người học. Nếu không ghi được audit trước thao tác, thao tác bị từ chối.
- Deployment mới phải giữ nguyên schema/assessment version cũ; thêm migration mới thay vì sửa migration đã áp dụng. Hết lỗi thì hoàn tác bản ứng dụng, không xóa attempt. Draining worker trước khi thay phiên bản ngân hàng.

## Sao lưu và diễn tập khôi phục

Bật backup PostgreSQL hằng ngày và lưu bài nộp/artefact đã nhận vào object storage độc lập trước public launch. Bản SQLite local dùng cho phát triển, không phải cơ chế HA. Phải thực hiện bản sao SQLite nhất quán bằng SQLite backup/VACUUM INTO, không copy riêng file `.sqlite` khi WAL đang ghi.

Mỗi đợt release: khôi phục backup vào database tách biệt, kiểm tra số sinh viên/bài thi/bài nộp, khôi phục outbox chưa dispatch, kiểm tra credential chia sẻ và chạy bộ audit 125/126 tín chỉ. Mục tiêu thao tác khôi phục dưới bốn giờ; cần đo thực tế trước khi công bố. Bảo vệ backup bằng mã hóa, quyền riêng và retention đã cấu hình.

## Trước public launch

- Mọi môn có thể chọn đều có nội dung và đánh giá đã duyệt; không có môn chỉ mang tên trong catalog.
- Không bật development auth/bank; người dùng không đọc/sửa được sinh viên khác; khóa dịch vụ không có trong bundle/source/log.
- Xác minh sandbox không gọi Internet/metadata/private endpoints, không đọc secret, không vượt CPU/RAM/output/time đã công bố.
- Chạy thử tải gồm tự lưu và thi; p95 API thường dưới một giây, lỗi dưới 1%; ghi lại độ dài hàng đợi và chi phí.
- Thực hiện backup/restore, hoàn tác release và xử lý incident thi. Chỉ đánh dấu phase 1 hoàn chỉnh khi tất cả điều kiện đạt.

Nguồn: [Supabase Auth](https://supabase.com/docs/guides/auth), [E2B network](https://docs.e2b.dev/network/internet-access), [E2B private traffic](https://docs.e2b.dev/network/restrict-public-access), [BullMQ concurrency](https://docs.bullmq.io/guide/workers/concurrency), [OWASP ASVS](https://owasp.org/www-project-application-security-verification-standard/).
