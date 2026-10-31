# M1 — Nhập môn lập trình, hai đường C++ và Python

Phiên bản `intro.2026.v1-m1`, thuộc học phần giả lập 4 tín chỉ của chương trình `2026.v1`. Cả hai đường học dùng cùng sáu chuẩn đầu ra và các hợp đồng bài tập tương đương; chỉ ghi nhận học phần một lần. Nội dung và đề mẫu còn ở trạng thái phát triển, chưa có thẩm định học thuật độc lập.

## Chuẩn đầu ra và bằng chứng

| Chuẩn | Người học thực hiện được | Bằng chứng |
|---|---|---|
| CLO1 | Viết đầu vào/đầu ra, ràng buộc, giả mã và ví dụ nhỏ | Đặc tả chu vi/diện tích, giả mã, ca biên và thiết kế dự án |
| CLO2 | Dùng kiểu, điều kiện, vòng lặp, dãy, chuỗi, bản ghi | Bài lập trình chạy được và bảng vết |
| CLO3 | Tách hàm, tìm kiếm, sắp xếp cơ bản | Bài chuyển giao, bảng vết tìm/sắp và giải thích thiết kế |
| CLO4 | Tái hiện lỗi, chọn ca thường/biên/hồi quy | Bài sửa cận, max toàn âm, thiết kế ca phá điều kiện sai |
| CLO5 | Tích hợp một sản phẩm nhỏ theo mốc | Ba mốc sổ ngân sách với dữ liệu rỗng, vượt ngân sách, max lặp và phân loại |
| CLO6 | Giải thích lựa chọn, giới hạn và nguồn trợ giúp | Câu tự phản tư và rubric; phần này chưa được tự động xác nhận đầy đủ |

Các ánh xạ thực thi nằm trong `introSyllabus`, `introTopicOutcomes`, `introProject` và `introPracticeRequirements(track)` của gói content. CLO không chỉ được xác định bằng số lượt xem bài hoặc câu hỏi lựa chọn.

## Trình tự 18 chủ đề

1. Bài toán, hợp đồng, thuật toán và giả mã.
2. Nhập/xuất và token trên một hoặc nhiều dòng.
3. Biến, kiểu, chia nguyên, phần dư và miền kết quả.
4. Rẽ nhánh và dấu bằng ở ngưỡng.
5. AND, OR và bảng chân trị.
6. Vòng `for`, bộ đếm và biến tích lũy.
7. Vòng `while`, dấu kết thúc và lý do vòng lặp dừng.
8. Vòng lặp lồng, số thao tác và định dạng bảng.
9. Hàm, tham số, giá trị trả về và tách I/O.
10. Dãy, chỉ số, dữ liệu rỗng và max toàn âm.
11. Hàng/cột, tổng hàng, chuyển vị bảng chữ nhật.
12. Chuỗi ASCII, đọc cả dòng và trạng thái trong/ngoài từ.
13. Bản ghi, tên trường và tổng hợp nhiều mặt hàng.
14. Gỡ lỗi bằng giả thuyết, ca tối thiểu và hồi quy.
15. Vị trí đầu tiên so với số lần xuất hiện.
16. Sắp xếp chọn, phần tử lặp và đếm giá trị khác nhau.
17. Kiểm thử có khả năng phân biệt các lời giải sai.
18. Sổ ngân sách: thực hiện theo ba mốc và giải thích sản phẩm.

Lộ trình gợi ý: tuần 1–6 học chín chủ đề đầu, tuần 7 luyện/ôn, tuần 8 giữa kỳ; tuần 9–13 học dãy đến kiểm thử; tuần 14–15 hoàn thiện dự án, tuần 16 cuối kỳ. Đây là lịch mô phỏng; không bắt người học chờ ngày ngoài đời. Bài thuật toán đầu tiên có thể làm giả mã trước, quay lại mã sau bài nhập/xuất.

## Hoạt động trong mỗi chủ đề

Đọc hợp đồng → dự đoán bằng bảng vết → xem ví dụ → tự viết mã → chạy ca thử → sửa lỗi → giải thích → làm bài chuyển giao. Mỗi chủ đề có bảng vết riêng, ít nhất hai lỗi thường gặp, phản tư và ít nhất hai bài lập trình. Gợi ý được viết sẵn, mở từng bước; không có trợ giảng AI hoặc nội dung sinh trực tiếp.

Có **38 bài lập trình mỗi đường**, gồm các bài có hướng dẫn, bài chuyển giao và ba mốc tích hợp. Ví dụ, bài đếm số dương chuyển sang max toàn âm; tìm vị trí đầu chuyển sang đếm mọi lần; tổng hàng chuyển sang chuyển vị 2×3. Đây là thay đổi hợp đồng đòi hỏi điều chỉnh lời giải, không chỉ đổi tên hoặc số trong câu hỏi.

`practiceReferences` có một lời giải tham chiếu tự biên soạn và các ca công khai cho mỗi bài. Chúng phục vụ kiểm tra chất lượng bài học và đối chiếu sau luyện tập, không phải ngân hàng đáp án bí mật. Mã người học vẫn chỉ chạy trong môi trường thực thi cô lập do backend cấu hình.

## Bài tích hợp: sổ ngân sách

| Mốc | Trọng số trong bài tích hợp | Máy kiểm chứng | Người học/người duyệt đối chiếu |
|---|---:|---|---|
| Tổng chi và số dư | 20% | Tổng, số dư, rỗng, chi vượt ngân sách | Hợp đồng, hàm tổng riêng, bộ ca thử |
| Khoản lớn nhất | 30% | Tổng/số dư, max, vị trí đầu khi trùng, quy ước rỗng | Bất biến khi duyệt và lý do chọn điều kiện `>` |
| Phân loại chi tiêu | 50% | Tổng ba nhóm, nhóm vắng, khoản 0, số dư âm | Tên dữ liệu/hàm, nhật ký sửa lỗi, giới hạn và nguồn trợ giúp |

Trọng số này không thay công thức toàn môn 10% chuyên cần, 30% thực hành, 20% giữa kỳ, 40% cuối kỳ. Phản tư hoặc việc dùng đúng kiểu thuật toán không tự được chứng minh chỉ từ đầu ra đúng. Nhận diện tác giả bài làm cũng không được cam kết bằng bộ kiểm thử.

## Tiến độ tính điểm và điều kiện thi

- `requiredIds`: toàn bộ 38 bài lập trình của đường đã chọn; bài chưa có kết quả máy kiểm chứng tính 0 trong mẫu số thực hành. Câu hỏi checkpoint chỉ phục vụ hiểu bài/điểm danh.
- `earlyIds`: 18 bài của chín chủ đề đầu.
- `capstoneIds`: ba mốc tích hợp; `capstoneId` là mốc phân loại cuối.
- `finalRequiredIds`: hợp của 18 bài đầu và ba mốc tích hợp, 21 ID riêng. Backend quyết định điều kiện dự thi từ kết quả thực thi bền vững, không từ cờ tự khai trên giao diện.

Các bài còn lại vẫn cần hoàn thành để đạt đầy đủ điểm thực hành; điều kiện tối thiểu dự thi không đồng nghĩa đã hoàn tất toàn bộ học phần. Đề giữa kỳ tập trung chín chủ đề đầu; đề cuối kỳ và thi lại bao phủ giai đoạn sau bằng biến thể riêng phía máy chủ.

## Kiểm chứng và phần còn thiếu

Kiểm thử gói xác nhận tính nhất quán hai đường, ID, liên kết CLO, thứ tự tiên quyết, bảng vết hình chữ nhật, độ phủ bài luyện và lời giải Python trên mọi ca công khai. CLI kiểm chứng tham chiếu của core bổ sung biên dịch/chạy C++ bằng runtime thực tế và thử các lời giải sai có chủ đích. Không chạy mã người học trực tiếp trên host theo cơ chế kiểm thử tham chiếu này.

Lần kiểm chứng kỹ thuật ngày 01/11/2026 đã chạy đạt 76 lời giải luyện tập và sáu lời giải đề mẫu M1, phát hiện cả mười phiên bản thuật toán sai được biên soạn có chủ đích; tổng báo cáo 456 ca thực thi. Runtime là g++ 13.3.0 trong WSL và Python 3.13.11 trên Windows. Báo cáo máy đọc được lưu ở `.data/intro-verification/latest.json` trong môi trường phát triển. Đây là bằng chứng mã/ca thử thực sự đã chạy, không phải xác nhận học thuật hoặc độ đúng với mọi đầu vào.

Ước lượng thử nghiệm 35–55 giờ bao gồm luyện tập và dự án, cần đo lại với người mới; đây không phải tải học 4 tín chỉ đã được cơ sở đào tạo thẩm định. Đệ quy/phân tích sâu, I/O tệp bền vững và bộ nhớ chuyên sâu được để cho bài chuyển tiếp hoặc môn sau.

Trước công nhận M1 hoàn chỉnh vẫn cần thẩm định độc lập, thử người mới, xác minh công thức điểm/điều kiện thi xuyên suốt và chạy các cổng an toàn thực thi. Tất cả `reviewStatus`, `academicallyReviewed`, `assessmentBankReady` và `publicLaunchReady` liên quan vẫn giữ trạng thái chưa được công nhận; không suy ra đủ điều kiện phát hành phase 1 từ việc có thêm bài học.
