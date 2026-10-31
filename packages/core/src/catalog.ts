import type { Course, CourseCategory, LanguageBridge, Program, ProgramId, SourceReference } from './types.ts';

export const curriculumVersion = '2026.v1';
export const curriculumSources: SourceReference[] = [
  { title: 'UIT — Cử nhân Công nghệ thông tin', url: 'https://daa.uit.edu.vn/content/cu-nhan-nganh-cong-nghe-thong-tin-ap-dung-tu-khoa-19-2024', version: 'Khóa 19–2024', accessedAt: '2026-11-01' },
  { title: 'UIT — Cử nhân Khoa học máy tính', url: 'https://daa.uit.edu.vn/content/cu-nhan-nganh-khoa-hoc-may-tinh-ap-dung-tu-khoa-19-2024', version: 'Khóa 19–2024', accessedAt: '2026-11-01' },
  { title: 'HUST — Cập nhật khung chương trình', url: 'https://soict.hust.edu.vn/thong-bao-cap-nhat-khung-chuong-trinh-va-ke-hoach-hoc-tap-chuan-cho-cac-ctdt.html', version: 'K68, học kỳ 2023-1', accessedAt: '2026-11-01' },
];

export const curriculumNotice = 'Chương trình riêng của trường hư cấu University Simulator, tham chiếu nguồn công khai; không phải chương trình được công nhận hoặc cấp bằng của UIT/HUST. Học liệu đang được biên soạn và kiểm chứng, chưa đạt cổng phát hành phase 1.';

const both: ProgramId[] = ['it', 'cs'];
const slotCounts = new Map<number, number>();
const times = ['08:00', '10:00', '13:00', '15:00', '17:00'];
function slot(index: number) { return `T${2 + Math.floor((index % 25) / 5)} ${times[index % 5]}`; }

function course(
  id: string, code: string, title: string, credits: number, category: CourseCategory, semester: number,
  prerequisites: string[], description: string, outcomes: string[], programs: ProgramId[] = both,
  extra: Partial<Pick<Course, 'kind' | 'minimumCredits' | 'language' | 'bridges'>> = {},
): Course {
  const ordinal = slotCounts.get(semester) ?? 0;
  slotCounts.set(semester, ordinal + 1);
  return {
    id, code, title, credits, category, semester, prerequisites, description, outcomes, programs,
    slots: credits ? [slot(ordinal), slot(ordinal + 7), slot(ordinal + 13)] : [],
    kind: category === 'requirement' ? 'requirement' : category === 'capstone' || category === 'internship' ? 'project' : 'standard',
    contentStatus: 'draft', sources: curriculumSources, ...extra,
  };
}

export const courses: Course[] = [
  course('intro-programming', 'CS101', 'Nhập môn lập trình', 4, 'general', 1, [], 'Chọn C++ hoặc Python để học cùng chuẩn đầu ra về giải quyết vấn đề, điều khiển, hàm và gỡ lỗi.', ['Phân rã bài toán thành thuật toán và hàm.', 'Viết chương trình xử lý dữ liệu vào/ra và kiểm tra trường hợp biên.', 'Đọc dấu vết thực thi, tìm và sửa lỗi.']),
  course('calculus', 'MA101', 'Giải tích', 3, 'general', 1, [], 'Giới hạn, đạo hàm, tích phân và tối ưu một biến với ứng dụng máy tính.', ['Giải thích và tính đạo hàm cơ bản.', 'Dùng đạo hàm để tìm cực trị và phân tích tốc độ thay đổi.']),
  course('linear-algebra', 'MA102', 'Đại số tuyến tính', 3, 'general', 2, [], 'Vector, ma trận, hệ phương trình và biến đổi tuyến tính.', ['Tính tích ma trận và giải hệ tuyến tính.', 'Liên hệ vector và phép chiếu với dữ liệu.']),
  course('discrete-math', 'MA103', 'Toán rời rạc', 3, 'general', 2, [], 'Logic, tập hợp, phép đếm, quan hệ và đồ thị.', ['Lập luận bằng logic và chứng minh quy nạp.', 'Mô hình hóa quan hệ và duyệt đồ thị nhỏ.']),
  course('probability', 'MA201', 'Xác suất và thống kê', 3, 'general', 3, ['calculus'], 'Xác suất có điều kiện, biến ngẫu nhiên, ước lượng và diễn giải thống kê.', ['Tính xác suất có điều kiện và kỳ vọng.', 'Phân biệt tương quan, sai số và kết luận có căn cứ.']),
  course('english-1', 'EN101', 'Tiếng Anh 1', 4, 'general', 1, [], 'Tiếng Anh nền tảng trong bối cảnh đời sống và học tập.', ['Đọc và nghe thông tin ngắn quen thuộc.', 'Chọn cấu trúc câu phù hợp và giao tiếp tình huống cơ bản.']),
  course('english-2', 'EN102', 'Tiếng Anh 2', 4, 'general', 2, ['english-1'], 'Đọc, nghe và tổ chức ý cho tình huống học đường.', ['Xác định ý chính và chi tiết trong đoạn ngắn.', 'Dùng thì, liên từ và cấu trúc câu phù hợp.']),
  course('english-3', 'EN201', 'Tiếng Anh 3', 4, 'general', 3, ['english-2'], 'Đọc hiểu và trao đổi thông tin học thuật phổ thông.', ['Suy luận ý nghĩa từ ngữ cảnh.', 'Tổ chức thông tin và nhận diện lập luận trong văn bản.']),
  course('technical-english', 'EN301', 'Tiếng Anh chuyên ngành', 3, 'general', 4, ['english-3'], 'Đọc tài liệu kỹ thuật, issue, README và giao tiếp dự án; bắt buộc kể cả khi được miễn tiếng Anh đầu vào.', ['Đọc thông số, thông báo lỗi và tài liệu API.', 'Viết mô tả lỗi có các bước tái hiện và trao đổi lựa chọn kỹ thuật.']),
  course('philosophy', 'GE201', 'Triết học Mác–Lênin', 3, 'general', 3, [], 'Khái niệm và phương pháp luận trọng tâm, kết hợp bài tập phân tích tình huống.', ['Phân biệt khái niệm và lập luận cơ bản.', 'Phân tích một tình huống theo phương pháp luận đã học.']),
  course('political-economy', 'GE202', 'Kinh tế chính trị Mác–Lênin', 2, 'general', 4, ['philosophy'], 'Các khái niệm kinh tế chính trị và liên hệ xã hội hiện đại.', ['Giải thích những khái niệm trọng tâm.', 'Đọc dữ kiện và nhận diện quan hệ kinh tế trong tình huống.']),
  course('scientific-socialism', 'GE301', 'Chủ nghĩa xã hội khoa học', 2, 'general', 5, ['philosophy'], 'Các nội dung nền tảng và tình huống vận dụng ở mức đại cương.', ['Nhận diện khái niệm và bối cảnh lịch sử.', 'Trình bày lập luận dựa trên nội dung được cung cấp.']),
  course('hochiminh-thought', 'GE302', 'Tư tưởng Hồ Chí Minh', 2, 'general', 6, ['philosophy'], 'Nội dung trọng tâm được tổ chức theo chủ đề và nguồn tham khảo.', ['Nhận diện nội dung và hoàn cảnh hình thành.', 'Phân tích tình huống gắn với trách nhiệm công dân.']),
  course('party-history', 'GE401', 'Lịch sử Đảng Cộng sản Việt Nam', 2, 'general', 7, ['hochiminh-thought'], 'Các giai đoạn và sự kiện trọng tâm; phân biệt sự kiện, bối cảnh và diễn giải.', ['Sắp xếp mốc và bối cảnh lịch sử.', 'Đối chiếu thông tin với nguồn học liệu được cung cấp.']),
  course('law', 'GE101', 'Pháp luật đại cương', 2, 'general', 1, [], 'Khái niệm pháp luật, trách nhiệm công dân và đạo đức số.', ['Phân biệt các quan hệ và trách nhiệm pháp lý cơ bản.', 'Nhận diện vấn đề quyền riêng tư và quyền sử dụng tài nguyên số.']),
  course('study-skills', 'GE102', 'Kỹ năng học đại học', 1, 'general', 1, [], 'Tự học, tìm nguồn, lập kế hoạch và liêm chính học thuật.', ['Lập kế hoạch học khả thi.', 'Ghi nguồn và phân biệt trích dẫn, diễn giải, sao chép.']),

  course('computing-intro', 'CS100', 'Nhập môn ngành máy tính', 2, 'foundation', 1, [], 'Bản đồ nghề nghiệp CNTT/KHMT, hệ thống máy tính và trách nhiệm nghề nghiệp.', ['Phân biệt phần cứng, phần mềm, dữ liệu và mạng.', 'Giải thích sự khác nhau giữa hai ngành và lựa chọn học tập.']),
  course('oop', 'CS102', 'Lập trình hướng đối tượng', 4, 'foundation', 2, ['intro-programming'], 'Lớp, đối tượng, đóng gói, đa hình và kiểm thử thiết kế nhỏ.', ['Thiết kế lớp với trách nhiệm rõ.', 'Áp dụng đa hình và kiểm thử các hành vi quan trọng.'], both, { language: 'cpp', bridges: ['python'] }),
  course('data-structures', 'CS201', 'Cấu trúc dữ liệu và giải thuật', 4, 'foundation', 3, ['intro-programming', 'discrete-math'], 'Danh sách, stack, queue, cây, đồ thị, tìm kiếm và sắp xếp.', ['Chọn cấu trúc dữ liệu theo yêu cầu.', 'Cài đặt và kiểm chứng thuật toán cùng độ phức tạp.'], both, { language: 'cpp', bridges: ['python'] }),
  course('databases', 'CS202', 'Cơ sở dữ liệu', 4, 'foundation', 3, ['intro-programming'], 'Mô hình quan hệ, thiết kế lược đồ, SQL, ràng buộc và giao dịch.', ['Thiết kế lược đồ tránh bất nhất dữ liệu.', 'Viết và kiểm chứng truy vấn SQL với dữ liệu biên.'], both, { language: 'sql', bridges: ['cpp', 'python'] }),
  course('networks', 'CS203', 'Mạng máy tính', 4, 'foundation', 4, ['computing-intro'], 'Mô hình phân tầng, địa chỉ, định tuyến và giao thức ứng dụng.', ['Theo dõi luồng dữ liệu qua các tầng.', 'Giải thích DNS, HTTP và các lỗi kết nối thường gặp.']),
  course('computer-architecture', 'CS204', 'Kiến trúc máy tính', 3, 'foundation', 4, ['intro-programming'], 'Biểu diễn dữ liệu, CPU, bộ nhớ và thực thi lệnh qua mô phỏng.', ['Biểu diễn số và giải thích tràn số.', 'Phân tích lệnh, thanh ghi, bộ nhớ và cache.']),
  course('operating-systems', 'CS205', 'Hệ điều hành', 4, 'foundation', 4, ['oop'], 'Tiến trình, đồng bộ, bộ nhớ và hệ thống tệp trong môi trường mô phỏng an toàn.', ['Mô phỏng lập lịch và quản lý bộ nhớ.', 'Nhận diện race condition và đề xuất cơ chế đồng bộ.']),

  course('it-infrastructure', 'IT201', 'Hạ tầng công nghệ thông tin', 3, 'core', 5, ['networks'], 'Thiết kế và vận hành dịch vụ IT, cấu hình, sao lưu và khôi phục.', ['Lập sơ đồ dịch vụ và phân quyền.', 'Kiểm chứng kế hoạch sao lưu, phục hồi và giám sát.'], ['it']),
  course('it-software-design', 'IT301', 'Phân tích thiết kế phần mềm', 4, 'core', 5, ['oop', 'databases'], 'Yêu cầu, mô hình miền, thiết kế API và kiến trúc ứng dụng nhỏ.', ['Chuyển yêu cầu thành mô hình và tiêu chí nghiệm thu.', 'Thiết kế API cùng các ràng buộc dữ liệu.'], ['it']),
  course('it-web', 'IT302', 'Công nghệ Web', 4, 'core', 5, ['oop', 'databases', 'networks'], 'HTML, CSS, JavaScript, HTTP, API và ứng dụng web có dữ liệu.', ['Xây giao diện có khả năng truy cập.', 'Kết nối API và xử lý trạng thái, lỗi an toàn.'], ['it'], { language: 'javascript', bridges: ['cpp', 'python'] }),
  course('it-security', 'IT303', 'An ninh thông tin', 4, 'core', 6, ['networks', 'operating-systems'], 'Mô hình đe dọa, xác thực, phân quyền và bảo vệ ứng dụng.', ['Phân tích tài sản và ranh giới tin cậy.', 'Kiểm tra quyền truy cập và khắc phục lỗi phổ biến trong lab cô lập.'], ['it']),
  course('it-applied-ai', 'IT304', 'AI ứng dụng', 4, 'core', 6, ['probability', 'linear-algebra', 'databases'], 'Xây giải pháp AI nhỏ, đánh giá chất lượng, sai lệch và giới hạn sử dụng.', ['Xây baseline và đánh giá trên dữ liệu tách biệt.', 'Tích hợp mô hình nhỏ và mô tả giới hạn của kết quả.'], ['it'], { language: 'python', bridges: ['cpp'] }),

  course('it-uiux', 'IT401', 'Thiết kế giao diện và trải nghiệm', 4, 'specialization', 5, ['computing-intro'], 'Nghiên cứu nhu cầu, luồng tác vụ, khả năng truy cập và thử nghiệm giao diện.', ['Xây luồng tác vụ và prototype.', 'Đánh giá giao diện bằng tiêu chí và quan sát có cấu trúc.'], ['it']),
  course('it-mobile', 'IT402', 'Ứng dụng di động đa nền tảng', 4, 'specialization', 7, ['it-web'], 'Ứng dụng web thích ứng, lưu ngoại tuyến có kiểm soát và thao tác trên thiết bị nhỏ.', ['Xây luồng mobile có trạng thái.', 'Kiểm tra lỗi mạng và khả năng truy cập trên màn hình nhỏ.'], ['it'], { language: 'javascript' }),
  course('it-cloud', 'IT403', 'Cloud và DevOps', 4, 'specialization', 6, ['it-infrastructure', 'operating-systems'], 'Triển khai tái lập, CI/CD, cấu hình, giám sát và hoàn tác.', ['Xây quy trình build và triển khai có kiểm tra.', 'Phân tích lỗi dịch vụ và thực hiện rollback trong mô phỏng.'], ['it']),
  course('it-data-engineering', 'IT404', 'Kỹ thuật dữ liệu', 4, 'specialization', 7, ['databases', 'intro-programming'], 'Thu nhận, kiểm tra, biến đổi và lưu dữ liệu với pipeline nhỏ.', ['Xây pipeline có kiểm tra chất lượng dữ liệu.', 'Xử lý bản ghi trùng và lỗi có thể phục hồi.'], ['it'], { language: 'python', bridges: ['cpp'] }),
  course('it-bi', 'IT405', 'Trực quan dữ liệu và BI', 4, 'specialization', 5, ['databases', 'probability'], 'Truy vấn, chỉ số, biểu đồ và truyền đạt phát hiện có căn cứ.', ['Chọn chỉ số và biểu đồ đúng câu hỏi.', 'Phân biệt tín hiệu, nhiễu và diễn giải sai.'], ['it']),
  course('it-integration', 'IT406', 'Tích hợp hệ thống', 4, 'specialization', 7, ['it-web', 'it-software-design'], 'Hợp đồng API, thông điệp, idempotency và xử lý lỗi tích hợp.', ['Thiết kế hợp đồng dữ liệu giữa dịch vụ.', 'Kiểm chứng retry không gây tác dụng lặp.'], ['it']),
  course('it-testing', 'IT407', 'Kiểm thử và đảm bảo chất lượng', 4, 'specialization', 7, ['it-software-design'], 'Kiểm thử theo rủi ro, trường hợp biên, tích hợp và nghiệm thu.', ['Xây bộ kiểm thử phát hiện lỗi có chủ đích.', 'Phân biệt kết quả đúng với test chỉ phản chiếu cài đặt.'], ['it']),
  course('it-enterprise', 'IT408', 'Hệ thống thông tin nghiệp vụ', 4, 'specialization', 6, ['databases', 'it-software-design'], 'Quy trình nghiệp vụ, mô hình dữ liệu, kiểm soát và truy vết.', ['Mô hình hóa quy trình và quy tắc nghiệp vụ.', 'Thiết kế kiểm soát giao dịch và lịch sử thay đổi.'], ['it']),

  course('cs-math', 'SC201', 'Toán cho khoa học máy tính', 4, 'core', 4, ['linear-algebra', 'discrete-math', 'probability'], 'Lập luận, tối ưu và các công cụ toán cho thuật toán và mô hình.', ['Phân tích bài toán bằng đại số và xác suất.', 'Kiểm chứng điều kiện và giới hạn của suy luận toán học.'], ['cs']),
  course('cs-algorithms', 'SC301', 'Phân tích và thiết kế thuật toán', 4, 'core', 5, ['data-structures', 'discrete-math'], 'Chia để trị, tham lam, quy hoạch động và lập luận tính đúng.', ['Thiết kế thuật toán từ tính chất bài toán.', 'Chứng minh tính đúng và phân tích độ phức tạp.'], ['cs'], { language: 'cpp', bridges: ['python'] }),
  course('cs-paradigms', 'SC302', 'Nguyên lý ngôn ngữ lập trình', 4, 'core', 6, ['oop', 'data-structures'], 'Kiểu dữ liệu, ngữ nghĩa và các mô hình lập trình.', ['So sánh các mô hình lập trình bằng cùng một tác vụ.', 'Giải thích phạm vi, kiểu và cơ chế đánh giá biểu thức.'], ['cs']),
  course('cs-software-engineering', 'SC303', 'Công nghệ phần mềm', 4, 'core', 6, ['oop', 'databases'], 'Yêu cầu, thiết kế, kiểm thử và phát triển phần mềm tái lập.', ['Xây phần mềm theo tiêu chí nghiệm thu.', 'Đánh giá thiết kế và kiểm thử bằng bằng chứng.'], ['cs']),
  course('cs-ai', 'SC304', 'Nền tảng trí tuệ nhân tạo', 4, 'core', 5, ['cs-math', 'data-structures'], 'Tìm kiếm, biểu diễn tri thức, suy luận và đánh giá hệ thống thông minh.', ['Cài đặt và so sánh thuật toán tìm kiếm.', 'Biểu diễn tri thức và đánh giá chất lượng suy luận.'], ['cs'], { language: 'python', bridges: ['cpp'] }),

  course('cs-machine-learning', 'SC401', 'Máy học', 4, 'specialization', 6, ['cs-ai', 'probability', 'linear-algebra'], 'Học có giám sát, phân chia dữ liệu, baseline và đánh giá tổng quát hóa.', ['Huấn luyện mô hình nhỏ với quy trình tránh rò rỉ dữ liệu.', 'So sánh mô hình bằng metric phù hợp.'], ['cs'], { language: 'python', bridges: ['cpp'] }),
  course('cs-nlp', 'SC402', 'Xử lý ngôn ngữ tự nhiên', 4, 'specialization', 7, ['cs-machine-learning'], 'Biểu diễn văn bản và tác vụ phân loại, truy xuất ở quy mô nhỏ.', ['Chuẩn hóa và biểu diễn dữ liệu văn bản.', 'Đánh giá mô hình với tập kiểm tra độc lập.'], ['cs'], { language: 'python' }),
  course('cs-vision', 'SC403', 'Thị giác máy tính', 4, 'specialization', 7, ['cs-machine-learning'], 'Ảnh số, đặc trưng và mô hình phân loại ảnh nhỏ trên CPU.', ['Xử lý và mô tả đặc trưng ảnh.', 'Thiết kế thí nghiệm và phân tích lỗi dự đoán.'], ['cs'], { language: 'python' }),
  course('cs-data-mining', 'SC404', 'Khai phá dữ liệu', 4, 'specialization', 7, ['databases', 'cs-machine-learning'], 'Khám phá mẫu, phân cụm, phát hiện bất thường và diễn giải.', ['Chọn phương pháp theo cấu trúc dữ liệu.', 'Đánh giá độ ổn định và ý nghĩa của mẫu phát hiện.'], ['cs'], { language: 'python' }),
  course('cs-knowledge', 'SC405', 'Biểu diễn tri thức', 4, 'specialization', 7, ['cs-ai', 'discrete-math'], 'Logic, luật, đồ thị tri thức và suy luận có kiểm chứng.', ['Biểu diễn tri thức thành luật và quan hệ.', 'Phát hiện suy luận thiếu căn cứ hoặc mâu thuẫn.'], ['cs']),
  course('cs-parallel', 'SC406', 'Tính toán song song', 4, 'specialization', 5, ['data-structures', 'operating-systems'], 'Phân rã tác vụ, đồng bộ và đánh giá tăng tốc.', ['Phân rã công việc và kiểm soát dữ liệu dùng chung.', 'Đo tăng tốc và giải thích giới hạn do phần tuần tự.'], ['cs']),
  course('cs-distributed', 'SC407', 'Hệ phân tán', 4, 'specialization', 7, ['networks', 'operating-systems', 'cs-software-engineering'], 'Thông điệp, nhất quán, lỗi từng phần và khôi phục.', ['Mô phỏng lỗi mạng và đánh giá tính nhất quán.', 'Thiết kế retry, idempotency và theo dõi trạng thái.'], ['cs']),
  course('cs-graphics', 'SC408', 'Đồ họa máy tính', 4, 'specialization', 6, ['linear-algebra', 'data-structures'], 'Biến đổi hình học, camera và dựng hình qua bài thực hành nhỏ.', ['Cài đặt biến đổi và phép chiếu.', 'Kiểm chứng pipeline dựng hình với dữ liệu đơn giản.'], ['cs']),

  course('it-internship', 'IT490', 'Thực tập nghề nghiệp CNTT', 2, 'internship', 7, ['it-web', 'it-software-design'], 'Nhận yêu cầu từ doanh nghiệp NPC, quản lý công việc và bàn giao sản phẩm nhỏ.', ['Hoàn thành nhiệm vụ có tiêu chí nghiệm thu.', 'Ghi nhật ký, báo cáo và bàn giao có thể tái hiện.'], ['it'], { minimumCredits: 80 }),
  course('cs-internship', 'SC490', 'Thực tập nghề nghiệp KHMT', 2, 'internship', 7, ['cs-algorithms', 'cs-software-engineering'], 'Thực nghiệm hoặc xây thuật toán cho yêu cầu doanh nghiệp NPC.', ['Thiết kế thí nghiệm có baseline và dữ liệu tách biệt.', 'Bàn giao mã, kết quả và giới hạn của giải pháp.'], ['cs'], { minimumCredits: 80 }),
  course('it-capstone', 'IT499', 'Đồ án tốt nghiệp CNTT', 10, 'capstone', 8, ['it-internship', 'it-web', 'it-security', 'it-applied-ai'], 'Xây ứng dụng có dữ liệu, phân quyền, kiểm thử và kế hoạch vận hành theo đề tài có phạm vi rõ.', ['Bàn giao sản phẩm chạy được theo bộ nghiệm thu.', 'Giải thích lựa chọn thiết kế và chứng minh bảo vệ dữ liệu.'], ['it'], { minimumCredits: 100 }),
  course('cs-capstone', 'SC499', 'Đồ án tốt nghiệp KHMT', 10, 'capstone', 8, ['cs-internship', 'cs-ai', 'cs-algorithms'], 'Xây và đánh giá giải pháp thuật toán hoặc mô hình có baseline và quy trình tái lập.', ['Thiết kế đánh giá tránh rò rỉ dữ liệu.', 'Bàn giao mã, kết quả và phần giải thích có cấu trúc.'], ['cs'], { minimumCredits: 100 }),
  course('physical-education', 'RQ001', 'Giáo dục thể chất mô phỏng', 0, 'requirement', 1, [], 'Kiến thức an toàn, tự quản lý sức khỏe và hoạt động mô phỏng; không xác nhận năng lực thể chất ngoài đời.', ['Lựa chọn hoạt động và nghỉ ngơi phù hợp tình huống.', 'Nhận diện giới hạn của đánh giá thể chất trên web.']),
  course('national-defense', 'RQ002', 'Quốc phòng – an ninh mô phỏng', 0, 'requirement', 2, [], 'Kiến thức trọng tâm và xử lý tình huống dân sự qua mô phỏng; không thay thế chứng nhận thật.', ['Nhận diện nội dung học tập và trách nhiệm công dân.', 'Lựa chọn phương án xử lý tình huống theo học liệu.']),
  course('office-skills', 'RQ003', 'Tin học văn phòng', 0, 'requirement', 1, [], 'Thực hành văn bản, bảng tính và trình chiếu trong công cụ mô phỏng trên web.', ['Tạo văn bản có cấu trúc và định dạng mục tiêu.', 'Tính toán bảng tính và thiết kế trình chiếu rõ ràng.']),
];

export const courseMap = new Map(courses.map((item) => [item.id, item]));
export function getCourse(id: string): Course | undefined { return courseMap.get(id); }

const sharedRequired = courses.filter((item) => item.category === 'general' || item.category === 'foundation').map((item) => item.id);
const requirementIds = ['physical-education', 'national-defense', 'office-skills'];
const chosenIT = ['it-bi', 'it-cloud', 'it-mobile', 'it-data-engineering', 'it-integration', 'it-testing'];
const chosenCS = ['cs-parallel', 'cs-machine-learning', 'cs-nlp', 'cs-vision', 'cs-data-mining', 'cs-knowledge'];
function buildProgram(id: ProgramId): Program {
  const own = courses.filter((item) => item.programs.length === 1 && item.programs.includes(id));
  const requiredCourseIds = [...sharedRequired, ...own.filter((item) => item.category !== 'specialization').map((item) => item.id)];
  const specializationCourseIds = own.filter((item) => item.category === 'specialization').map((item) => item.id);
  const recommendedIds = [...requiredCourseIds, ...(id === 'it' ? chosenIT : chosenCS)];
  return {
    id, title: id === 'it' ? 'Công nghệ thông tin' : 'Khoa học máy tính', shortTitle: id === 'it' ? 'CNTT' : 'KHMT',
    description: id === 'it' ? 'Thiết kế, tích hợp và vận hành giải pháp công nghệ thông tin có trách nhiệm.' : 'Nền tảng toán, thuật toán, hệ thống và thực nghiệm trí tuệ nhân tạo.',
    version: curriculumVersion, credits: id === 'it' ? 125 : 126, durationSemesters: 8,
    requiredCourseIds, specializationCourseIds, specializationCredits: id === 'it' ? 20 : 16,
    electiveCredits: id === 'it' ? 4 : 8, requirementIds: [...requirementIds],
    recommendedPath: Array.from({ length: 8 }, (_, semester) => recommendedIds.filter((courseId) => getCourse(courseId)?.semester === semester + 1)),
    sources: curriculumSources,
  };
}

export const programs: Program[] = [buildProgram('it'), buildProgram('cs')];
export function getProgram(id: ProgramId): Program { const result = programs.find((item) => item.id === id); if (!result) throw new Error('Ngành học không hợp lệ.'); return result; }
export function getProgramCourses(id: ProgramId): Course[] { getProgram(id); return courses.filter((item) => item.programs.includes(id)); }

export const languageBridges: LanguageBridge[] = [
  { id: 'bridge-cpp', title: 'Chuyển tiếp C++', language: 'cpp', forTracks: ['python'], beforeCourseIds: ['oop', 'data-structures', 'cs-algorithms'], credits: 0, outcomes: ['Kiểu tĩnh, biên dịch và nhập xuất.', 'Tham chiếu, bộ nhớ và thư viện chuẩn cơ bản.'] },
  { id: 'bridge-python', title: 'Chuyển tiếp Python', language: 'python', forTracks: ['cpp'], beforeCourseIds: ['it-applied-ai', 'it-data-engineering', 'cs-ai', 'cs-machine-learning'], credits: 0, outcomes: ['Cấu trúc dữ liệu, hàm và môi trường Python.', 'Đọc và xử lý dữ liệu cho thí nghiệm nhỏ.'] },
  { id: 'bridge-sql', title: 'Làm quen SQL', language: 'sql', forTracks: ['cpp', 'python'], beforeCourseIds: ['databases'], credits: 0, outcomes: ['Mô hình bảng và truy vấn khai báo.', 'SELECT, WHERE, JOIN và giá trị NULL.'] },
  { id: 'bridge-javascript', title: 'Chuyển tiếp JavaScript', language: 'javascript', forTracks: ['cpp', 'python'], beforeCourseIds: ['it-web'], credits: 0, outcomes: ['JavaScript, DOM và sự kiện.', 'Promise, HTTP và xử lý lỗi bất đồng bộ.'] },
];

/** Checks fictional curriculum integrity, not academic accreditation or content review. */
export function validateCurriculum(): string[] {
  const errors: string[] = [];
  if (new Set(courses.map((item) => item.id)).size !== courses.length) errors.push('Trùng mã học phần.');
  const visiting = new Set<string>();
  const visited = new Set<string>();
  function visit(id: string) {
    if (visiting.has(id)) { errors.push(`Chu trình tiên quyết: ${id}`); return; }
    if (visited.has(id)) return;
    const item = getCourse(id);
    if (!item) { errors.push(`Thiếu học phần: ${id}`); return; }
    visiting.add(id);
    for (const prerequisite of item.prerequisites) visit(prerequisite);
    visiting.delete(id); visited.add(id);
  }
  for (const item of courses) {
    visit(item.id);
    if (item.credits < 0 || !Number.isInteger(item.credits)) errors.push(`Tín chỉ không hợp lệ: ${item.id}`);
    if (item.outcomes.length < 2) errors.push(`Thiếu chuẩn đầu ra: ${item.id}`);
  }
  for (const program of programs) {
    const required = program.requiredCourseIds.reduce((total, id) => total + (getCourse(id)?.credits ?? 0), 0);
    if (required + program.specializationCredits + program.electiveCredits !== program.credits) errors.push(`Sai tổng tín chỉ ${program.id}.`);
    const flattened = program.recommendedPath.flat();
    if (new Set(flattened).size !== flattened.length) errors.push(`Trùng môn trong lộ trình ${program.id}.`);
    if (flattened.reduce((total, id) => total + (getCourse(id)?.credits ?? 0), 0) !== program.credits) errors.push(`Sai tổng lộ trình ${program.id}.`);
  }
  return [...new Set(errors)];
}
