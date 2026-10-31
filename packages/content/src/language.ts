import type { Checkpoint, Lesson } from './types.ts';

interface LanguageUnit {
  slug: string;
  title: string;
  objective: string;
  explanation: string;
  example: string;
  task: string;
  checkpoint: Checkpoint;
}

const units: Record<string, LanguageUnit[]> = {
  'english-1': [
    { slug: 'introductions', title: 'Giới thiệu bản thân trong lớp', objective: 'Dùng be và đại từ để giới thiệu tên, ngành học và nơi ở.',
      explanation: 'I đi với am; he/she/it đi với is; you/we/they đi với are. Danh từ chỉ một người học cần mạo từ trong mẫu I am a student. Chọn thông tin vừa đủ cho tình huống, không đưa mật khẩu hay số định danh vào bài giới thiệu.',
      example: 'Hello. My name is Linh. I am a first-year student. My major is Computer Science. My classmates are friendly.',
      task: 'Viết bốn câu giới thiệu một nhân vật hư cấu. Gạch chân chủ ngữ và động từ be; kiểm tra sự hòa hợp. Đọc thành tiếng rồi tự đối chiếu, phần phát âm chưa được hệ thống xác nhận.',
      checkpoint: { question: 'Chọn câu đúng.', options: ['I is a student.', 'I am a student.', 'I are a student.'], answerIndex: 1, explanation: 'Chủ ngữ I đi với am.' } },
    { slug: 'daily-routine', title: 'Kể lịch sinh hoạt bằng hiện tại đơn', objective: 'Mô tả hoạt động lặp lại và phân biệt động từ với ngôi thứ ba số ít.',
      explanation: 'Hiện tại đơn diễn tả thói quen và lịch trình. Với he/she/it, nhiều động từ thêm s hoặc es: She studies. Với I/you/we/they, dùng dạng gốc: I study. Trạng từ usually nói về tần suất; không biến câu thành thì tiếp diễn.',
      example: 'I usually study in the library. My roommate studies at home. We review our notes after class.',
      task: 'Viết lịch một ngày với bốn hoạt động. Đổi hai câu từ I sang My roommate rồi sửa động từ. So sánh ý nghĩa của usually và always.',
      checkpoint: { question: 'Điền từ: My roommate ___ in the library every evening.', options: ['study', 'studies', 'studying'], answerIndex: 1, explanation: 'My roommate là ngôi thứ ba số ít; study đổi y thành ies.' } },
    { slug: 'questions', title: 'Hỏi thông tin học vụ', objective: 'Dùng do/does và từ hỏi để hỏi về lịch học.',
      explanation: 'Câu hỏi hiện tại đơn thường dùng do hoặc does trước chủ ngữ, sau đó là động từ gốc. Where does she study? không dùng studies lần nữa. Câu hỏi với be đổi vị trí be và chủ ngữ: Where is the library?',
      example: 'When does the class start? It starts at eight. Where is the laboratory? It is on the second floor.',
      task: 'Soạn ba câu hỏi cho cố vấn: giờ bắt đầu lớp, vị trí phòng lab, cách mượn sách. Tự xác định câu nào cần do/does và câu nào dùng be.',
      checkpoint: { question: 'Chọn câu hỏi đúng.', options: ['When does the class start?', 'When does the class starts?', 'When the class does start?'], answerIndex: 0, explanation: 'Sau does dùng động từ gốc start.' } },
  ],
  'english-2': [
    { slug: 'past-events', title: 'Kể một sự cố đã xảy ra', objective: 'Dùng quá khứ đơn để kể chuỗi sự kiện có thời điểm kết thúc.',
      explanation: 'Quá khứ đơn đặt sự kiện vào một thời điểm đã kết thúc. Có động từ có quy tắc thêm ed và động từ bất quy tắc như go → went. Trong câu phủ định với did not, động từ trở về dạng gốc. Phân biệt chuyện đã xảy ra với lời khuyên cho hiện tại.',
      example: 'Yesterday, I missed the bus. I walked to campus and arrived ten minutes late. I did not miss the test.',
      task: 'Kể một lần nhân vật đến lớp muộn trong bốn câu. Đặt các sự kiện theo thứ tự và nêu một điều đã không xảy ra. Đánh dấu các động từ quá khứ.',
      checkpoint: { question: 'Chọn câu phủ định đúng.', options: ['I did not missed the test.', 'I did not miss the test.', 'I do not missed the test.'], answerIndex: 1, explanation: 'Did đã mang dấu hiệu quá khứ nên miss ở dạng gốc.' } },
    { slug: 'plans', title: 'Trao đổi kế hoạch và lời đề nghị', objective: 'Diễn đạt kế hoạch bằng going to và đưa lời đề nghị lịch sự.',
      explanation: 'Be going to + động từ gốc diễn tả dự định. Lời đề nghị có thể dùng Could we…? để giữ giọng hợp tác. Một thông điệp lập kế hoạch cần việc gì, khi nào và ai xác nhận. Tránh để thời gian mơ hồ như soon khi nhóm cần lịch cụ thể.',
      example: 'We are going to review the database chapter on Friday. Could we meet at 3 p.m.? Please confirm by Thursday evening.',
      task: 'Viết tin nhắn hẹn nhóm học. Bao gồm mục tiêu, thời gian cụ thể và câu đề nghị. Tự kiểm tra xem người nhận có đủ thông tin để trả lời hay không.',
      checkpoint: { question: 'Điền từ: We are going to ___ the chapter.', options: ['review', 'reviewed', 'reviewing'], answerIndex: 0, explanation: 'Going to đi với động từ nguyên thể review.' } },
    { slug: 'comparisons', title: 'So sánh hai phương án', objective: 'Viết câu so sánh có tiêu chí và dữ liệu minh họa.',
      explanation: 'Dùng so sánh hơn để nói về hai lựa chọn theo cùng một tiêu chí: cheaper than, faster than, more reliable than. Một nhận xét hữu ích nêu bối cảnh đo. Faster không có nghĩa là tốt hơn trên mọi mặt; cần giữ nguyên thông tin về chi phí và độ tin cậy.',
      example: 'Room A is cheaper than Room B, but it is farther from campus. On our route, the bus is slower than the bicycle during rush hour.',
      task: 'So sánh hai phòng trọ hư cấu theo giá, khoảng cách và độ yên tĩnh. Nêu một lựa chọn của bạn cùng lý do, thay vì chỉ liệt kê tính từ.',
      checkpoint: { question: 'Chọn cách viết đúng.', options: ['Room A is more cheap than Room B.', 'Room A is cheaper than Room B.', 'Room A is cheapest than Room B.'], answerIndex: 1, explanation: 'Cheap thường dùng dạng so sánh hơn cheaper.' } },
  ],
  'english-3': [
    { slug: 'evidence', title: 'Đọc một lập luận và tìm bằng chứng', objective: 'Phân biệt nhận định, bằng chứng và kết luận trong một đoạn văn.',
      explanation: 'Đọc chủ động bằng cách hỏi: người viết đang khẳng định điều gì, đưa dữ kiện nào và kết luận có đi xa hơn dữ kiện không? Các từ however, therefore, because báo quan hệ giữa ý. Một mẫu nhỏ cho kết quả tốt không tự chứng minh hiệu quả với mọi người.',
      example: 'In a survey of 20 classmates, 14 preferred short revision sessions. Therefore, short sessions may be useful for this group. However, the survey does not represent every student.',
      task: 'Ghi lại số người tham gia, kết quả và giới hạn của đoạn văn. Viết một câu kết luận thận trọng bằng may hoặc might. Không đổi 14/20 thành một khẳng định tuyệt đối.',
      checkpoint: { question: 'Kết luận nào được đoạn văn hỗ trợ?', options: ['Every student learns best in short sessions.', 'Short sessions may be useful for the surveyed group.', 'Long sessions never work.'], answerIndex: 1, explanation: 'Dữ liệu chỉ đến từ nhóm 20 người, không đủ để kết luận cho mọi sinh viên.' } },
    { slug: 'academic-email', title: 'Viết email xin làm rõ yêu cầu', objective: 'Tổ chức email có chủ đề, bối cảnh, câu hỏi cụ thể và lời kết.',
      explanation: 'Email học thuật nên có subject rõ, lời chào phù hợp, bối cảnh ngắn và yêu cầu có thể trả lời. Dùng Could you clarify…? thay vì yêu cầu mơ hồ như Explain everything. Phần viết tự do được đối chiếu rubric; hệ thống chưa xác nhận đầy đủ năng lực viết.',
      example: 'Subject: Question about the project report\nDear Lecturer,\nI am preparing the report for Group 3. Could you clarify whether the appendix counts toward the page limit?\nThank you for your time.\nBest regards,\nLinh',
      task: 'Soạn email hỏi phạm vi bài tập. Rubric tự đối chiếu: có chủ đề, xác định bài, chỉ ra một điểm chưa rõ, câu hỏi lịch sự, lời kết. Không gửi email thật trong bài học.',
      checkpoint: { question: 'Câu hỏi nào cụ thể và lịch sự nhất?', options: ['Explain everything now.', 'Could you clarify whether the appendix counts toward the page limit?', 'I do not understand.'], answerIndex: 1, explanation: 'Câu nêu chính xác điều cần làm rõ và dùng cách đề nghị lịch sự.' } },
    { slug: 'present-perfect', title: 'Báo tiến độ: đã làm và chưa làm', objective: 'Phân biệt thành quả liên quan hiện tại với sự kiện gắn thời điểm quá khứ cụ thể.',
      explanation: 'Present perfect dùng have/has + phân từ quá khứ để nói về kết quả liên quan hiện tại: We have completed the tests. Khi nêu thời điểm đã kết thúc như yesterday, dùng quá khứ đơn: We completed the tests yesterday. Báo tiến độ cần phân biệt hoàn thành, đang làm và bị chặn.',
      example: 'We have completed the login tests. We found a defect yesterday. We have not fixed it yet because the requirement is unclear.',
      task: 'Viết ba câu báo tiến độ cho nhóm hư cấu: một việc đã hoàn thành, một sự kiện hôm qua và một việc chưa xong. Thêm lý do hoặc bước tiếp theo.',
      checkpoint: { question: 'Câu nào phù hợp khi có thời điểm yesterday?', options: ['We have finished the tests yesterday.', 'We finished the tests yesterday.', 'We finishing the tests yesterday.'], answerIndex: 1, explanation: 'Yesterday là thời điểm quá khứ đã kết thúc; dùng quá khứ đơn finished.' } },
  ],
  'technical-english': [
    { slug: 'read-api-contract', title: 'Đọc tài liệu hàm và hợp đồng API', objective: 'Tìm tham số, giá trị trả về và trường hợp lỗi trong mô tả kỹ thuật.',
      explanation: 'Khi đọc một API, tìm signature, parameters, returns và errors. Các từ must, may và should mang độ ràng buộc khác nhau. Đừng suy ra chức năng từ tên hàm mà bỏ qua giới hạn đầu vào. Trong bài học, một hợp đồng hư cấu đủ nhỏ để tự kiểm chứng.',
      example: 'findFirst(values, target) returns the zero-based index of the first matching element. It returns -1 if no match exists. The function must not modify values.',
      task: 'Dịch nghĩa của returns -1 và must not modify. Viết hai ca thử cho dãy [4, 8, 4]: tìm 4 và tìm 7. Nêu vì sao trường hợp lặp lại có ích.',
      checkpoint: { question: 'Theo hợp đồng, findFirst([4, 8, 4], 4) trả gì?', options: ['0', '2', '-1'], answerIndex: 0, explanation: 'First và zero-based yêu cầu vị trí đầu tiên đánh số từ 0.' } },
    { slug: 'bug-report', title: 'Viết báo cáo lỗi có thể tái hiện', objective: 'Tách bước tái hiện, kết quả mong đợi và kết quả thực tế.',
      explanation: 'Báo cáo lỗi tốt giúp người khác tái hiện mà không đoán bối cảnh. Nêu environment, steps to reproduce, expected result và actual result. Đưa dữ liệu tối thiểu; loại bỏ token, mật khẩu và thông tin cá nhân. Một nhận xét như it is broken chưa đủ để điều tra.',
      example: 'Title: Empty expense list shows an error\nEnvironment: local development, Chrome\nSteps: Open Expenses; remove all entries; select Calculate.\nExpected: Total is 0.\nActual: The page displays an error.',
      task: 'Viết báo cáo cho lỗi vòng lặp bỏ phần tử cuối. Dùng n = 1 làm ca tái hiện, ghi cả kết quả đúng và kết quả sai. Tự đối chiếu đủ bốn phần.',
      checkpoint: { question: 'Thông tin nào giúp tái hiện lỗi trực tiếp nhất?', options: ['The app is bad.', 'Input n = 1; expected 1; actual 0.', 'Please fix soon.'], answerIndex: 1, explanation: 'Đầu vào và hai kết quả tạo bằng chứng cụ thể để kiểm tra.' } },
    { slug: 'tradeoffs', title: 'Giải thích lựa chọn kỹ thuật', objective: 'Trình bày một quyết định với tiêu chí, bằng chứng và giới hạn.',
      explanation: 'Một giải thích kỹ thuật thường có context, options, decision và consequences. Dùng because để nối quyết định với lý do; dùng although để thừa nhận đánh đổi. Tránh các từ always, best hoặc secure khi chưa nêu phạm vi và bằng chứng.',
      example: 'We chose linear search because the list contains at most 20 items and updates are frequent. Although binary search needs fewer comparisons on a sorted list, maintaining sorted order would add complexity here.',
      task: 'Viết 80–120 từ giải thích chọn list hay dictionary cho danh bạ nhỏ. Nêu một truy vấn chính, một đánh đổi và một tình huống khiến bạn đổi quyết định. Đây là bài tự đối chiếu theo rubric, không tự động xác nhận toàn bộ kỹ năng viết.',
      checkpoint: { question: 'Lập luận nào có đủ bối cảnh?', options: ['Linear search is always best.', 'We use linear search because this list has at most 20 items.', 'Binary search is bad.'], answerIndex: 1, explanation: 'Quy mô cụ thể làm rõ phạm vi của quyết định.' } },
  ],
};

export const languageLessons: Lesson[] = Object.entries(units).flatMap(([courseId, courseUnits]) =>
  courseUnits.map((unit, index) => ({
    id: `${courseId}-${unit.slug}`, courseId, title: `${index + 1}. ${unit.title}`,
    objective: unit.objective,
    sections: [{ heading: 'Đọc và nhận diện', body: unit.explanation }, { heading: 'Thực hành có chủ đích', body: unit.task }],
    example: { language: 'text' as const, code: unit.example, explanation: 'Ví dụ tự biên soạn cho bối cảnh đại học. Đọc ý nghĩa trước khi ghi nhớ mẫu câu.' },
    checkpoint: unit.checkpoint,
    sources: ['https://learnenglish.britishcouncil.org/grammar', 'https://learnenglish.britishcouncil.org/skills/writing'],
    estimatedMinutes: 25, reviewStatus: 'draft' as const,
  })),
);

export const placementPractice: Lesson = {
  id: 'english-placement-practice', courseId: 'english-1', title: 'Làm quen bài xếp lớp tiếng Anh',
  objective: 'Hiểu cách bài xếp lớp nội bộ ghi nhận miễn học và phân biệt với một chứng chỉ bên ngoài.',
  sections: [
    { heading: 'Mục đích', body: 'Bài xếp lớp chính thức đánh giá theo các mức nội bộ của Tiếng Anh 1–3. Kết quả đủ mức nào được miễn môn tương ứng và ghi tín chỉ, không tự cộng GPA. Tiếng Anh chuyên ngành vẫn phải học. Câu hỏi ở trang này chỉ là luyện tập công khai.' },
    { heading: 'Phạm vi xác nhận', body: 'Các câu hỏi lựa chọn, đọc hiểu và nhiệm vụ có đáp án kiểm chứng được không xác nhận đầy đủ kỹ năng nói hoặc viết tự do. Kết quả University Simulator không phải chứng chỉ CEFR, IELTS hay TOEIC.' },
  ],
  checkpoint: { question: 'Nếu được miễn Tiếng Anh 1–3, môn nào vẫn bắt buộc học?', options: ['Không còn môn tiếng Anh nào', 'Tiếng Anh chuyên ngành', 'Chỉ môn tùy thích'], answerIndex: 1, explanation: 'Miễn học theo đầu vào không áp dụng cho Tiếng Anh chuyên ngành.' },
  sources: ['https://daa.uit.edu.vn/content/cu-nhan-nganh-cong-nghe-thong-tin-ap-dung-tu-khoa-19-2024'],
  estimatedMinutes: 10, reviewStatus: 'draft',
};
