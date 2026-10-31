export const introTopicOrder = [
  'algorithm-planning', 'input-output', 'variables-types', 'conditions', 'boolean-logic',
  'loops', 'while-sentinel', 'nested-loops', 'functions', 'sequences', 'matrix-data',
  'strings', 'records', 'debugging', 'searching', 'sorting', 'testing', 'budget-project',
] as const;

export const introOutcomes = [
  { id: 'CLO1', title: 'Mô hình hóa bài toán', description: 'Viết hợp đồng đầu vào/đầu ra, ràng buộc và thuật toán hoặc giả mã; kiểm tra bằng ví dụ nhỏ.' },
  { id: 'CLO2', title: 'Cài đặt xử lý dữ liệu', description: 'Dùng kiểu, biểu thức, rẽ nhánh, vòng lặp và dãy/chuỗi/bản ghi để giải bài có đặc tả.' },
  { id: 'CLO3', title: 'Phân rã và lựa chọn thuật toán', description: 'Tách hàm, mô phỏng tìm kiếm/sắp xếp cơ bản và so sánh số thao tác trong phạm vi dữ liệu đã cho.' },
  { id: 'CLO4', title: 'Gỡ lỗi và kiểm thử', description: 'Lập bảng vết, tái hiện lỗi, chọn ca thường/biên/hồi quy và kiểm tra lời giải sai có chủ đích.' },
  { id: 'CLO5', title: 'Tích hợp sản phẩm nhỏ', description: 'Xây chương trình ngân sách theo các mốc, xử lý dữ liệu rỗng, vượt ngân sách, phần tử lặp và phân loại.' },
  { id: 'CLO6', title: 'Giải thích và tự đánh giá', description: 'Giải thích lựa chọn, giới hạn và nguồn trợ giúp; phân biệt kết quả máy kiểm tra với tiêu chí cần người học/người duyệt đối chiếu.' },
] as const;

export const introTopicOutcomes: Record<string, string[]> = {
  'algorithm-planning': ['CLO1', 'CLO6'], 'input-output': ['CLO1', 'CLO2'],
  'variables-types': ['CLO2', 'CLO4'], conditions: ['CLO2', 'CLO4'], 'boolean-logic': ['CLO2', 'CLO4'],
  loops: ['CLO2', 'CLO4'], 'while-sentinel': ['CLO2', 'CLO4'], 'nested-loops': ['CLO2', 'CLO3'],
  functions: ['CLO3', 'CLO6'], sequences: ['CLO2', 'CLO4'], 'matrix-data': ['CLO2', 'CLO3'],
  strings: ['CLO2', 'CLO4'], records: ['CLO2', 'CLO3'], debugging: ['CLO4', 'CLO6'],
  searching: ['CLO3', 'CLO4'], sorting: ['CLO3', 'CLO4'], testing: ['CLO1', 'CLO4'],
  'budget-project': ['CLO1', 'CLO2', 'CLO3', 'CLO4', 'CLO5', 'CLO6'],
};

export const introProject = {
  id: 'intro-budget-project', title: 'Sổ ngân sách sinh viên',
  description: 'Xây dần một chương trình stdin/stdout; cùng dữ liệu và chuẩn đầu ra cho C++ hoặc Python. Chỉ chấm tự động hành vi kiểm chứng được, phần thiết kế và giải thích có rubric tự đối chiếu.',
  outcomeIds: ['CLO1', 'CLO2', 'CLO3', 'CLO4', 'CLO5', 'CLO6'],
  milestones: [
    { id: 'total', title: 'Mốc 1 · Tổng chi và số dư', weight: 20, exerciseSuffix: 'stage-total',
      machineChecked: ['Tính tổng và số dư đúng với dữ liệu thường, rỗng và vượt ngân sách.', 'Giữ kết quả âm khi chi vượt ngân sách.'],
      selfCheck: ['Có hợp đồng dữ liệu và ít nhất ba lớp ca thử.', 'Hàm tổng chi được tách khỏi nhập/xuất.'] },
    { id: 'summary', title: 'Mốc 2 · Báo cáo khoản lớn nhất', weight: 30, exerciseSuffix: 'stage-summary',
      machineChecked: ['Trả tổng, số dư, khoản lớn nhất và chỉ số đầu tiên đúng.', 'Xử lý rỗng bằng 0 và -1, không chọn nhầm lần xuất hiện cuối.'],
      selfCheck: ['Giải thích bất biến khi duyệt dãy.', 'Có ca hai khoản lớn nhất bằng nhau.'] },
    { id: 'categories', title: 'Mốc 3 · Phân loại chi tiêu', weight: 50, exerciseSuffix: 'stage-categories',
      machineChecked: ['Cộng đúng ba nhóm và số dư theo mã loại.', 'Xử lý được nhóm vắng, khoản 0, nhiều dòng và ngân sách vượt.'],
      selfCheck: ['Phân chia hàm/kiểu dữ liệu có tên rõ.', 'Ghi lỗi đã sửa, ca hồi quy và giới hạn.', 'Trình bày nguồn trợ giúp và phần tự thực hiện.'] },
  ],
  note: 'Trọng số 20/30/50 áp dụng cho các mốc bài tích hợp, không thay công thức điểm toàn môn hoặc tạo bằng tốt nghiệp.',
} as const;

export const introSyllabus = {
  id: 'intro-programming', version: 'intro.2026.v1-m1', credits: 4,
  tracks: ['cpp', 'python'], reviewStatus: 'draft', independentlyReviewed: false,
  outcomes: introOutcomes,
  topics: introTopicOrder.map((slug, index) => ({ slug, order: index + 1, outcomeIds: introTopicOutcomes[slug]!, lessonIds: [`intro-cpp-${slug}`, `intro-python-${slug}`] })),
  learningSequence: 'Đọc đặc tả → dự đoán bằng bảng vết → xem ví dụ → tự cài đặt → chạy ca thử → sửa lỗi → giải thích và làm bài chuyển giao.',
  estimatedWorkload: 'Khoảng 35–55 giờ tự học/thực hành để kiểm chứng nội bộ; cần đo lại với người mới. Không quy đổi thành tải học được kiểm định của đại học thật.',
  assessmentBoundary: 'Câu hỏi công khai và lời giải tham chiếu phục vụ luyện tập; ngân hàng thi phiên bản riêng do máy chủ quản lý. Máy kiểm tra đầu vào/đầu ra không chứng minh chất lượng diễn đạt, thuật toán đã dùng hay việc tự viết mã.',
  deferredTopics: ['Đệ quy và phân tích thuật toán sâu ở Cấu trúc dữ liệu/giải thuật', 'Con trỏ và quản lý bộ nhớ riêng của C++ trong bài chuyển tiếp', 'I/O tệp bền vững, mạng và cơ sở dữ liệu ở các môn sau'],
} as const;
