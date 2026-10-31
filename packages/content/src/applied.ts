import type { Lesson } from './types.ts';

const applied: Omit<Lesson, 'reviewStatus'>[] = [
  {
    id: 'it-internship-ticket', courseId: 'it-internship', title: 'Thực tập CNTT: tiếp nhận và xử lý một ticket',
    objective: 'Tái hiện một lỗi, sửa có phạm vi và bàn giao bằng chứng kiểm thử.',
    sections: [
      { heading: 'Bối cảnh mô phỏng', body: 'Bạn thực tập tại nhóm phát triển cổng sinh viên. Ticket: nhập danh sách khoản chi rỗng làm trang báo lỗi. Tác vụ gồm xác nhận hợp đồng đầu vào, tái hiện với dữ liệu tối thiểu, sửa và bàn giao. Người quản lý là NPC, không giả lập đây là xác nhận làm việc ở doanh nghiệp thật.' },
      { heading: 'Cách làm', body: 'Ghi expected=0 cho danh sách rỗng và actual=lỗi. Tìm hàm cộng dồn khởi tạo sai. Sửa để tổng ban đầu bằng 0, giữ nguyên quy tắc khoản chi không âm. Thêm ca rỗng, một khoản, nhiều khoản và kiểm tra những chức năng liên quan.' },
      { heading: 'Bàn giao', body: 'Nộp báo cáo ngắn: nguyên nhân, thay đổi, kết quả kiểm thử và giới hạn. Nhật ký ghi công việc thực hiện và bằng chứng, không chỉ số giờ tự khai. Các nhiệm vụ thực tập tiếp theo và ngân hàng đánh giá riêng chưa được hoàn thiện.' },
    ],
    example: { language: 'python', code: 'def total_cost(costs):\n    total = 0\n    for cost in costs:\n        total += cost\n    return total\n\nassert total_cost([]) == 0\nassert total_cost([12000, 8000]) == 20000', explanation: 'Ca rỗng xác nhận đúng phần gây lỗi; ca nhiều khoản kiểm tra chức năng cơ bản không bị phá.' },
    checkpoint: { question: 'Bằng chứng nào phù hợp nhất khi bàn giao bản sửa?', options: ['Chỉ ghi đã sửa', 'Ca tái hiện, nguyên nhân và kết quả kiểm thử sau sửa', 'Số dòng mã tăng lên'], answerIndex: 1, explanation: 'Bằng chứng giúp người khác xác nhận bản sửa và phạm vi ảnh hưởng.' },
    sources: ['https://docs.pytest.org/en/stable/how-to/assert.html'], estimatedMinutes: 40,
  },
  {
    id: 'cs-internship-reproducibility', courseId: 'cs-internship', title: 'Thực tập KHMT: tái lập một thí nghiệm nhỏ',
    objective: 'Ghi cấu hình, dữ liệu và phép đo đủ để người khác lặp lại kết quả.',
    sections: [
      { heading: 'Bối cảnh mô phỏng', body: 'Nhóm cần so sánh một bộ phân loại với baseline. Nhiệm vụ của bạn là xây thí nghiệm có thể chạy lại, không chỉ đưa một con số điểm cao. Dữ liệu học tập phải có nguồn và được tách trước khi chọn tham số.' },
      { heading: 'Ví dụ bàn giao', body: 'Báo cáo gồm phiên bản dữ liệu, cách chia train/test, seed, phiên bản thư viện, đặc trưng, tham số, chỉ số và lệnh chạy. Với dữ liệu y=[0,0,0,1], baseline luôn đoán 0 đạt accuracy 3/4=0,75. Mô hình 0,76 cần được xem xét về ý nghĩa và độ ổn định.' },
      { heading: 'Nhiệm vụ', body: 'Tạo tệp cấu hình và nhật ký thí nghiệm. Chạy lại ít nhất hai lần với cùng cấu hình, giải thích nguồn khác biệt nếu có. Tự đối chiếu điểm mạnh/giới hạn; phần kết luận nghiên cứu mở chưa được xác nhận tự động.' },
    ],
    checkpoint: { question: 'Dữ liệu [0,0,0,1], luôn đoán 0, accuracy bằng?', options: ['0,25', '0,5', '0,75'], answerIndex: 2, explanation: 'Đúng 3 trong 4 dự đoán, nên accuracy là 0,75.' },
    sources: ['https://scikit-learn.org/stable/common_pitfalls.html'], estimatedMinutes: 40,
  },
  {
    id: 'it-capstone-contract', courseId: 'it-capstone', title: 'Đồ án CNTT: hệ thống đăng ký học phần có kiểm chứng',
    objective: 'Chia đồ án thành các mốc có sản phẩm và tiêu chí máy kiểm tra được.',
    sections: [
      { heading: 'Đề tài có phạm vi', body: 'Xây hệ thống nhỏ quản lý đăng ký cho dữ liệu sinh viên hư cấu. Có danh mục môn, tiên quyết, lịch, đăng ký và tổng tín chỉ. Bản đồ án độc lập không được kết nối hay sửa dữ liệu tài khoản thật trong University Simulator.' },
      { heading: 'Ba mốc sản phẩm', body: 'Mốc 20%: hợp đồng dữ liệu, sơ đồ trạng thái và bộ ví dụ. Mốc 30%: các chức năng chính chạy được với kiểm thử. Mốc 50%: kiểm chứng quyền sở hữu, thao tác lặp, tiên quyết và phục hồi lỗi; kèm phần giải thích có cấu trúc. Số điểm chỉ được xác nhận cho tiêu chí kiểm chứng được.' },
      { heading: 'Ca chấp nhận', body: 'Đăng ký môn hợp lệ thành công; gửi lại cùng mã không thêm lần hai; thiếu tiên quyết hoặc trùng lịch bị từ chối mà không ghi nửa chừng; sinh viên A không được sửa đăng ký B. Báo cáo tự luận có rubric để tự đối chiếu, không được dùng thay bằng chứng sản phẩm.' },
      { heading: 'Bài tập khởi động', body: 'Viết hợp đồng cho register(studentId, courseId, requestId), nêu kết quả và lỗi. Chuẩn bị ít nhất một ca hợp lệ và bốn ca vi phạm ở trên. Đây là mô-đun mở đầu của đồ án; chưa phải trọn học phần 10 TC.' },
    ],
    checkpoint: { question: 'Gửi lại cùng requestId sau mất phản hồi cần cho kết quả nào?', options: ['Thêm một đăng ký nữa', 'Trả kết quả ổn định, không tạo tác dụng lặp', 'Tự cộng tín chỉ tối đa'], answerIndex: 1, explanation: 'Thao tác lặp an toàn là một tiêu chí sản phẩm kiểm chứng được.' },
    sources: ['https://owasp.org/www-project-application-security-verification-standard/'], estimatedMinutes: 45,
  },
  {
    id: 'cs-capstone-experiment', courseId: 'cs-capstone', title: 'Đồ án KHMT: thực nghiệm dự báo với baseline',
    objective: 'Thiết kế một thí nghiệm dự báo có baseline, phép đo và dữ liệu giữ riêng.',
    sections: [
      { heading: 'Đề tài có phạm vi', body: 'Dùng dữ liệu tổng hợp về phòng trọ để so sánh một mô hình hồi quy nhỏ với baseline. Mục tiêu là thực hiện đúng quy trình, tái lập và giải thích giới hạn, không phải dự báo giá thị trường thật hay tư vấn tài chính.' },
      { heading: 'Phép đo', body: 'MAE là trung bình độ lớn sai số tuyệt đối. Với y=[10,20] và dự báo [12,16], sai số tuyệt đối là 2 và 4; MAE=(2+4)/2=3. Giữ cùng đơn vị và cùng tập kiểm tra khi so mô hình.' },
      { heading: 'Các mốc', body: 'Mốc 20%: câu hỏi, đặc tả dữ liệu và chia tập. Mốc 30%: baseline, pipeline tiền xử lý và kiểm thử. Mốc 50%: kết quả trên tập giữ riêng, lệnh tái lập, phân tích lỗi và câu hỏi bảo vệ có cấu trúc. Chỉ đánh giá tự động những phần có phép kiểm chứng rõ.' },
      { heading: 'Bài tập khởi động', body: 'Tính MAE bằng hàm riêng; kiểm thử dự báo hoàn hảo và sai số âm/dương. Tạo bản ghi cấu hình thí nghiệm. Các nghiên cứu mở và tuyên bố tổng quát cần đánh giá chuyên môn ngoài phần tự động này.' },
    ],
    example: { language: 'python', code: 'def mae(actual, predicted):\n    if len(actual) != len(predicted) or not actual:\n        raise ValueError("Two nonempty sequences of equal length are required")\n    return sum(abs(a - p) for a, p in zip(actual, predicted)) / len(actual)\n\nassert mae([10, 20], [12, 16]) == 3', explanation: 'Kiểm tra đầu vào tránh chia cho 0 hoặc âm thầm cắt bớt dữ liệu khi zip hai dãy khác độ dài.' },
    checkpoint: { question: 'y=[10,20], dự báo [12,16]. MAE bằng?', options: ['1', '3', '6'], answerIndex: 1, explanation: 'Trung bình |10−12| và |20−16| là (2+4)/2=3.' },
    sources: ['https://scikit-learn.org/stable/modules/model_evaluation.html'], estimatedMinutes: 45,
  },
  {
    id: 'office-document-structure', courseId: 'office-skills', title: 'Văn bản: cấu trúc báo cáo trước khi trang trí',
    objective: 'Tổ chức báo cáo bằng tiêu đề, đoạn, bảng và chú thích có ý nghĩa.',
    sections: [
      { heading: 'Cấu trúc', body: 'Một báo cáo cần tên, mục đích, nội dung theo cấp tiêu đề và nguồn. Dùng style tiêu đề giúp tạo mục lục và thay đổi định dạng nhất quán. Gõ nhiều dấu cách để canh cột sẽ dễ vỡ bố cục; bảng hoặc công cụ căn chỉnh phù hợp giữ cấu trúc rõ hơn.' },
      { heading: 'Ví dụ', body: 'Báo cáo học nhóm gồm: 1. Mục tiêu; 2. Công việc; 3. Kết quả; 4. Việc tiếp theo. Bảng công việc có cột người phụ trách, việc, trạng thái. Một hình cần chú thích và mô tả thay thế có ích.' },
      { heading: 'Thực hành', body: 'Soạn báo cáo một trang từ bốn mục trên, có một bảng và nguồn cho một nhận định. Rubric: cấp tiêu đề liên tục, bảng có hàng tiêu đề, chữ rõ, ảnh có mô tả. Phần này mô phỏng kỹ năng chung, không cấp MOS.' },
    ],
    checkpoint: { question: 'Cách nào tạo hệ thống tiêu đề nhất quán nhất?', options: ['Dùng style theo cấp tiêu đề', 'Tăng cỡ chữ tùy ý cho từng dòng', 'Dùng nhiều khoảng trắng'], answerIndex: 0, explanation: 'Style giúp cấu trúc, mục lục và định dạng nhất quán.' },
    sources: ['https://support.microsoft.com/word'], estimatedMinutes: 25,
  },
  {
    id: 'office-spreadsheet-budget', courseId: 'office-skills', title: 'Bảng tính: công thức và tham chiếu tương đối',
    objective: 'Tính tổng chi tiêu, giải thích thay đổi tham chiếu khi sao chép công thức.',
    sections: [
      { heading: 'Ô và công thức', body: 'Ô chứa dữ liệu hoặc công thức. Công thức bắt đầu bằng = trong nhiều ứng dụng bảng tính. Tham chiếu tương đối thay đổi khi sao chép; tham chiếu tuyệt đối dùng dấu $ để cố định hàng/cột theo cú pháp tương ứng. Cần kiểm tra thiết lập vùng khi dấu phân cách công thức khác nhau.' },
      { heading: 'Ví dụ', body: 'B2=10000, B3=20000. =SUM(B2:B3) cho 30000. Nếu C2 chứa =B2*2, sao chép xuống C3 sẽ thành =B3*2. Công thức =B2*$E$1 giữ E1 làm hệ số cố định khi sao chép xuống.' },
      { heading: 'Thực hành', body: 'Lập bảng ngày, khoản chi, số tiền cho một tuần giả định. Thêm tổng, ngân sách và chênh lệch. Thử đổi một khoản để xác nhận công thức tính lại; không nhập số tổng thủ công.' },
    ],
    checkpoint: { question: 'Sao chép =B2*2 từ C2 xuống C3 tạo công thức nào?', options: ['=B2*2', '=B3*2', '=C3*2'], answerIndex: 1, explanation: 'Tham chiếu tương đối dịch xuống một hàng cùng với ô công thức.' },
    sources: ['https://support.microsoft.com/excel'], estimatedMinutes: 30,
  },
  {
    id: 'office-presentation-evidence', courseId: 'office-skills', title: 'Trình chiếu: một luận điểm và bằng chứng',
    objective: 'Thiết kế một slide có thông điệp rõ, dữ liệu và nguồn đọc được.',
    sections: [
      { heading: 'Câu chuyện', body: 'Tiêu đề nên nói được ý chính của slide, không chỉ ghi “Kết quả”. Chọn dữ liệu phục vụ luận điểm và ghi đơn vị, mẫu số, thời gian. Giữ chữ đọc được và mô tả nội dung hình; hiệu ứng không thay bằng chứng.' },
      { heading: 'Ví dụ', body: 'Tiêu đề “3/4 thành viên hoàn thành nhiệm vụ đúng hạn” được hỗ trợ bằng bảng bốn nhiệm vụ và trạng thái. Không đổi thành “Nhóm làm việc hoàn hảo”, vì còn một nhiệm vụ trễ.' },
      { heading: 'Thực hành', body: 'Tạo ba slide báo cáo đồ án: vấn đề, sản phẩm, kết quả kiểm chứng. Mỗi slide có một thông điệp và phần nguồn nếu dùng tư liệu bên ngoài. Tự đối chiếu độ tương phản và thứ tự đọc.' },
    ],
    checkpoint: { question: '3/4 nhiệm vụ đúng hạn hỗ trợ tiêu đề nào chính xác?', options: ['Mọi nhiệm vụ đều đúng hạn', '3/4 nhiệm vụ hoàn thành đúng hạn', 'Không có nhiệm vụ nào trễ'], answerIndex: 1, explanation: 'Tiêu đề phải giữ đúng phạm vi dữ liệu, không che nhiệm vụ trễ.' },
    sources: ['https://support.microsoft.com/powerpoint'], estimatedMinutes: 25,
  },
  {
    id: 'physical-education-log', courseId: 'physical-education', title: 'Thể chất mô phỏng: mục tiêu và nhật ký hoạt động',
    objective: 'Lập nhật ký có dữ liệu và phân biệt kế hoạch với bằng chứng hoàn thành.',
    sections: [
      { heading: 'Phạm vi trên web', body: 'Mô-đun rèn kiến thức tổ chức hoạt động và theo dõi thói quen. Ứng dụng không quan sát trực tiếp vận động ngoài đời, không xác nhận năng lực thể chất thực tế và không đưa phác đồ tập luyện cá nhân.' },
      { heading: 'Nhật ký có ý nghĩa', body: 'Một dòng nhật ký gồm hoạt động, thời điểm, thời lượng và điều quan sát được. Kế hoạch “đi bộ thứ Ba” khác với ghi nhận đã thực hiện. Số liệu tự khai được ghi rõ là tự khai, không tự chuyển thành chứng nhận kiểm định thể lực.' },
      { heading: 'Thực hành', body: 'Tạo lịch hoạt động mô phỏng phù hợp thời khóa biểu và thời gian nghỉ. Xác định cách điều chỉnh khi bận học. Không dùng chuỗi đăng nhập để suy ra sức khỏe hay khả năng vận động.' },
    ],
    checkpoint: { question: 'Nhật ký tự khai trên web có chứng minh đầy đủ năng lực thể chất thật không?', options: ['Có', 'Không', 'Có nếu đăng nhập hằng ngày'], answerIndex: 1, explanation: 'Dữ liệu tự khai và kiểm tra năng lực thực tế là hai loại bằng chứng khác nhau.' },
    sources: ['https://daa.uit.edu.vn/content/cu-nhan-nganh-cong-nghe-thong-tin-ap-dung-tu-khoa-19-2024'], estimatedMinutes: 20,
  },
  {
    id: 'national-defense-preparedness', courseId: 'national-defense', title: 'Quốc phòng mô phỏng: trách nhiệm và tổ chức an toàn',
    objective: 'Nhận diện vai trò, quy trình thông báo và nguồn hướng dẫn trong một hoạt động tập thể.',
    sections: [
      { heading: 'Phạm vi mô phỏng', body: 'Trên web, môn tập trung vào hiểu biết, trách nhiệm và tình huống tổ chức. Không mô phỏng thao tác vũ khí hay coi câu hỏi trực tuyến là bằng chứng thực hành quốc phòng ngoài đời.' },
      { heading: 'Tình huống', body: 'Một buổi sinh hoạt cần danh sách nhóm, người phụ trách và điểm tập kết theo hướng dẫn của cơ sở tổ chức. Khi có thay đổi, thông báo qua kênh đã thống nhất và xác nhận người phụ trách đã nhận, thay vì truyền tin chưa kiểm chứng.' },
      { heading: 'Thực hành', body: 'Lập sơ đồ liên lạc cho một hoạt động hư cấu: ai nhận thông báo, ai xác nhận, nguồn hướng dẫn nào được dùng. Ghi việc cần hỏi khi thông tin chưa đủ; không tự suy diễn quy trình khẩn cấp thật từ tình huống mô phỏng.' },
    ],
    checkpoint: { question: 'Khi thông tin tổ chức chưa rõ, cách phù hợp là?', options: ['Tự tạo hướng dẫn rồi truyền như thông báo chính thức', 'Kiểm tra nguồn và hỏi người phụ trách', 'Bỏ qua mọi thông báo'], answerIndex: 1, explanation: 'Nguồn xác nhận và người phụ trách giúp giữ thông tin nhất quán.' },
    sources: ['https://daa.uit.edu.vn/content/cu-nhan-nganh-cong-nghe-thong-tin-ap-dung-tu-khoa-19-2024'], estimatedMinutes: 20,
  },
];

export const appliedLessons: Lesson[] = applied.map(lesson => ({ ...lesson, reviewStatus: 'draft' }));

export const languageBridgeLessons: Lesson[] = [
  {
    id: 'bridge-cpp-values', courseId: 'bridge-cpp', title: 'Chuyển từ Python sang C++: kiểu, giá trị và tham chiếu',
    objective: 'Nhận diện khác biệt khi sao chép một dãy và khi dùng tham chiếu.',
    sections: [
      { heading: 'Điểm chuyển', body: 'C++ cần kiểu và phạm vi sống rõ. Sao chép vector tạo dãy riêng; tham chiếu tạo một tên khác cho đối tượng hiện có. Không dùng tham chiếu hoặc con trỏ khi đối tượng đã hết thời gian sống. Các bài trước OOP/thuật toán sẽ luyện kiểu, vector và lời gọi hàm.' },
      { heading: 'Dự đoán trước khi chạy', body: 'Trong ví dụ, b là bản sao của a nên sửa b[0] không sửa a[0]. Nếu dùng auto& b = a, sửa b sẽ sửa a. So sánh với Python b=a chỉ gắn thêm tên vào cùng list.' },
      { heading: 'Thực hành', body: 'Đổi dòng tạo b thành tham chiếu, dự đoán đầu ra rồi giải thích. Sau đó viết hàm đọc vector qua const reference để không sao chép và không sửa dữ liệu.' },
    ],
    example: { language: 'cpp', code: '#include <iostream>\n#include <vector>\nint main() {\n    std::vector<int> a{1, 2};\n    auto b = a;\n    b[0] = 9;\n    std::cout << a[0] << "\\n";\n}', explanation: 'Mã gốc in 1 vì b là bản sao.' },
    checkpoint: { question: 'Với auto b = a; b[0]=9; và a ban đầu {1,2}, a[0] là?', options: ['1', '9', 'Không xác định trong ví dụ này'], answerIndex: 0, explanation: 'Bản sao vector có vùng lưu trữ riêng.' },
    sources: ['https://eel.is/c++draft/'], estimatedMinutes: 30, reviewStatus: 'draft',
  },
  {
    id: 'bridge-python-aliases', courseId: 'bridge-python', title: 'Chuyển từ C++ sang Python: tên và đối tượng',
    objective: 'Phân biệt gán thêm tên cho list với tạo bản sao nông.',
    sections: [
      { heading: 'Điểm chuyển', body: 'Python không yêu cầu khai báo kiểu biến ở mỗi phép gán. Tên được gắn với đối tượng; b=a không tự sao chép list. Với list số nguyên phẳng, a.copy() tạo list mới; với list lồng nhau, bản sao nông vẫn chia sẻ các đối tượng con.' },
      { heading: 'Ví dụ', body: 'a=[1,2]; b=a; b[0]=9 làm a[0] thành 9 vì hai tên cùng chỉ một list. Nếu b=a.copy(), a giữ [1,2]. Kiểm thử phần sửa dữ liệu giúp phát hiện các tác dụng phụ không mong muốn.' },
      { heading: 'Thực hành', body: 'Dự đoán rồi chạy hai phiên bản b=a và b=a.copy(). Viết hàm tăng mọi giá trị mà trả list mới, không sửa đầu vào. Thử đầu vào rỗng và list một phần tử.' },
    ],
    example: { language: 'python', code: 'a = [1, 2]\nb = a\nb[0] = 9\nprint(a[0])', explanation: 'Ví dụ in 9 vì a và b cùng tham chiếu một list.' },
    checkpoint: { question: 'a=[1,2]; b=a; b[0]=9. a[0] là?', options: ['1', '9', '2'], answerIndex: 1, explanation: 'Phép gán thêm tên không tự sao chép list.' },
    sources: ['https://docs.python.org/3/tutorial/datastructures.html'], estimatedMinutes: 25, reviewStatus: 'draft',
  },
  {
    id: 'bridge-sql-null', courseId: 'bridge-sql', title: 'Chuyển sang SQL: truy vấn khai báo và giá trị thiếu',
    objective: 'Viết điều kiện IS NULL và hiểu vì sao thứ tự kết quả cần chỉ định.',
    sections: [
      { heading: 'Điểm chuyển', body: 'SQL mô tả kết quả cần lấy thay vì chỉ định một vòng lặp cho từng hàng. NULL biểu diễn thông tin thiếu hoặc không xác định theo mô hình dữ liệu; so sánh = NULL không hoạt động như so sánh một số thông thường. Dùng IS NULL để kiểm tra.' },
      { heading: 'Ví dụ', body: 'Bảng có An chưa có điểm và Linh điểm 8. WHERE score IS NULL lấy An. Không thay NULL bằng 0 nếu 0 là một điểm có ý nghĩa. ORDER BY name giữ thứ tự kết quả được yêu cầu.' },
      { heading: 'Thực hành', body: 'Viết truy vấn lấy người đã có điểm bằng IS NOT NULL. Sau đó giải thích sự khác nhau giữa chưa có điểm, điểm 0 và được miễn học. Không gộp ba trạng thái chỉ vì đều chưa có điểm qua môn.' },
    ],
    example: { language: 'sql', code: "WITH results(name, score) AS (VALUES ('An', NULL), ('Linh', 8))\nSELECT name FROM results WHERE score IS NULL ORDER BY name;", explanation: 'Kết quả chỉ có An.' },
    checkpoint: { question: 'Điều kiện nào kiểm tra giá trị SQL bị thiếu?', options: ['score = NULL', 'score IS NULL', 'score == NULL'], answerIndex: 1, explanation: 'IS NULL là phép kiểm tra NULL.' },
    sources: ['https://www.postgresql.org/docs/current/functions-comparison.html'], estimatedMinutes: 25, reviewStatus: 'draft',
  },
  {
    id: 'bridge-javascript-scope', courseId: 'bridge-javascript', title: 'Chuyển sang JavaScript: phạm vi và dữ liệu có thể sửa',
    objective: 'Phân biệt const giữ ràng buộc tên với việc làm đối tượng bất biến.',
    sections: [
      { heading: 'Điểm chuyển', body: 'const không cho gán lại ràng buộc tên, nhưng không tự đóng băng đối tượng. let cho phép gán lại và có phạm vi khối. Dùng === để so sánh không ép kiểu trong các bài nhập môn; vẫn cần kiểm tra hợp đồng dữ liệu.' },
      { heading: 'Ví dụ', body: 'const student={credits:12}; student.credits=16 là hợp lệ: đối tượng được sửa, không gán student sang đối tượng khác. Điều này không cho phép trình duyệt tự quyết định tín chỉ thật; máy chủ vẫn kiểm tra học vụ.' },
      { heading: 'Thực hành', body: 'Tạo đối tượng nhân vật hư cấu, thay một thuộc tính rồi in giá trị. Giải thích khác biệt giữa const student và Object.freeze trong một ví dụ phẳng; không coi freeze nông là bảo vệ dữ liệu máy chủ.' },
    ],
    example: { language: 'javascript', code: 'const student = { credits: 12 };\nstudent.credits = 16;\nconsole.log(student.credits);', explanation: 'Mã in 16; const giữ ràng buộc tên, không tự làm mọi thuộc tính bất biến.' },
    checkpoint: { question: 'const object có tự làm mọi thuộc tính không thể sửa không?', options: ['Có', 'Không', 'Chỉ trên điện thoại'], answerIndex: 1, explanation: 'const ngăn gán lại ràng buộc, không tự đóng băng đối tượng.' },
    sources: ['https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/const'], estimatedMinutes: 25, reviewStatus: 'draft',
  },
];
