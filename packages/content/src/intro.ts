import type { Checkpoint, LearningTrack, Lesson, PublicTest } from './types.ts';

const pySource = 'https://docs.python.org/3/tutorial/';
const cppSource = 'https://eel.is/c++draft/';

interface Topic {
  slug: string;
  title: string;
  objective: string;
  concept: string;
  method: string;
  cpp: string;
  python: string;
  exampleNote: string;
  prompt: string;
  tests: PublicTest[];
  hints: string[];
  checkpoint: Checkpoint;
  starterCpp?: string;
  starterPython?: string;
}

const topics: Topic[] = [
  {
    slug: 'input-output', title: 'Chương trình đầu tiên: nhập và xuất',
    objective: 'Đọc hai số nguyên từ bàn phím, tính kết quả và in đúng định dạng.',
    concept: 'Một chương trình nhận dữ liệu đầu vào, xử lý theo quy tắc rồi trả kết quả. Trước khi viết mã, hãy ghi rõ: đầu vào gồm gì, kết quả cần gì và ví dụ nhỏ nào giúp kiểm tra. Với bài chấm tự động, dòng nhắc nhập không nằm trong yêu cầu sẽ trở thành đầu ra thừa.',
    method: 'Bài toán: có a cuốn sách ở ngăn thứ nhất, b cuốn ở ngăn thứ hai. Cần in tổng. Với 7 và 5, phép xử lý là 7 + 5 = 12. Tách việc đọc dữ liệu khỏi việc tính để dễ quan sát lỗi.',
    cpp: '#include <iostream>\nint main() {\n    int a, b;\n    std::cin >> a >> b;\n    std::cout << a + b << "\\n";\n    return 0;\n}',
    python: 'a, b = map(int, input().split())\nprint(a + b)',
    exampleNote: 'Đầu vào 7 5 cho đầu ra 12. Khoảng trắng ngăn các giá trị; ký tự xuống dòng kết thúc kết quả.',
    prompt: 'Đọc hai số nguyên a và b, mỗi số từ -1000 đến 1000, nằm trên một dòng. In a + b, không in lời nhắc nhập.',
    tests: [{ input: '7 5\n', output: '12\n' }, { input: '-3 3\n', output: '0\n' }, { input: '0 0\n', output: '0\n' }],
    hints: ['Tính thử bằng tay trước khi chạy.', 'Hai giá trị đầu vào cần chuyển sang kiểu số nguyên.', 'Đầu ra chỉ chứa tổng và một ký tự xuống dòng.'],
    checkpoint: { question: 'Nếu bài yêu cầu in tổng của 7 và 5, đầu ra nào phù hợp bộ chấm?', options: ['Nhap a: Nhap b: 12', '12', '7 + 5'], answerIndex: 1, explanation: 'Chỉ in kết quả được yêu cầu; lời nhắc nhập làm sai hợp đồng đầu ra.' },
  },
  {
    slug: 'variables-types', title: 'Biến, kiểu dữ liệu và chia nguyên',
    objective: 'Phân biệt thương nguyên, phần dư và phép chia cho kết quả có phần thập phân.',
    concept: 'Biến là tên gắn với một giá trị. Kiểu dữ liệu quyết định phép toán có thể thực hiện. Khi đếm đồ vật, dùng số nguyên. Khi đo trung bình, cần cân nhắc phần thập phân. Không dùng số thực để biểu diễn chính xác số tiền đồng nếu các phép tính chỉ cần số nguyên.',
    method: 'Có 17 chiếc bánh, mỗi hộp chứa 5 chiếc: đóng được 3 hộp và còn 2 chiếc. Chỉ áp dụng ví dụ chia dư này cho dữ liệu không âm. Khi số âm xuất hiện, quy tắc làm tròn của hai ngôn ngữ khác nhau nên cần xem lại đặc tả.',
    cpp: '#include <iostream>\nint main() {\n    int cakes = 17, boxSize = 5;\n    std::cout << cakes / boxSize << " " << cakes % boxSize << "\\n";\n}',
    python: 'cakes = 17\nbox_size = 5\nprint(cakes // box_size, cakes % box_size)',
    exampleNote: 'Cả hai ví dụ in 3 2. Trong Python, / là phép chia thực; // là chia lấy thương theo hướng âm vô cùng.',
    prompt: 'Đọc n chiếc bánh và k sức chứa mỗi hộp, 0 <= n <= 1000000 và 1 <= k <= 1000. In số hộp đầy và số bánh còn lại, cách nhau một khoảng trắng.',
    tests: [{ input: '17 5\n', output: '3 2\n' }, { input: '20 5\n', output: '4 0\n' }, { input: '0 7\n', output: '0 0\n' }],
    hints: ['Số hộp đầy là thương nguyên.', 'Số còn lại là n trừ số hộp đầy nhân k.', 'Không chia cho 0; đề đã bảo đảm k >= 1.'],
    checkpoint: { question: '17 chiếc bánh, mỗi hộp 5 chiếc: số bánh còn lại là bao nhiêu?', options: ['3', '2', '3.4'], answerIndex: 1, explanation: '17 = 3 × 5 + 2. Phần dư là 2.' },
  },
  {
    slug: 'conditions', title: 'Rẽ nhánh và giá trị biên',
    objective: 'Viết điều kiện có xử lý đúng dấu bằng tại một ngưỡng.',
    concept: 'Rẽ nhánh chọn một đường xử lý theo điều kiện đúng hoặc sai. Dấu > khác >= tại đúng điểm biên. Luôn viết rõ quy tắc bằng lời trước, rồi thử ba trường hợp: ngay dưới ngưỡng, bằng ngưỡng và ngay trên ngưỡng.',
    method: 'Quy định: đủ 18 tuổi được đăng ký hoạt động. Tuổi 17 không đạt, 18 và 19 đạt. Đây là bài luyện điều kiện, không phải cơ chế xác minh tuổi trong sản phẩm.',
    cpp: '#include <iostream>\nint main() {\n    int age; std::cin >> age;\n    if (age >= 18) std::cout << "YES\\n";\n    else std::cout << "NO\\n";\n}',
    python: 'age = int(input())\nif age >= 18:\n    print("YES")\nelse:\n    print("NO")',
    exampleNote: 'Đọc 18 sẽ in YES. Từ khóa else chỉ xử lý nhánh còn lại của điều kiện.',
    prompt: 'Đọc một tuổi nguyên từ 0 đến 120. In YES nếu tuổi ít nhất 18; nếu không, in NO.',
    tests: [{ input: '17\n', output: 'NO\n' }, { input: '18\n', output: 'YES\n' }, { input: '19\n', output: 'YES\n' }],
    hints: ['“Ít nhất” bao gồm dấu bằng.', 'Thử trường hợp 18 trước.', 'YES và NO phải viết hoa đúng như đề.'],
    checkpoint: { question: 'Điều kiện nào biểu diễn “ít nhất 18”?', options: ['age > 18', 'age >= 18', 'age == 18'], answerIndex: 1, explanation: '>= bao gồm cả 18 lẫn các giá trị lớn hơn.' },
  },
  {
    slug: 'boolean-logic', title: 'Kết hợp điều kiện bằng logic',
    objective: 'Dùng phép và để kiểm tra đồng thời hai điều kiện độc lập.',
    concept: 'Một quyết định có thể cần nhiều điều kiện cùng đúng. Phép và chỉ đúng khi cả hai vế đúng; phép hoặc đúng khi ít nhất một vế đúng. Hãy dùng bảng nhỏ gồm bốn tổ hợp để tránh đọc nhầm ý nghĩa của câu mô tả.',
    method: 'Vé ưu đãi yêu cầu tuổi từ 18 trở lên và có thẻ sinh viên. Người 20 tuổi không có thẻ vẫn không đạt. Người 17 tuổi có thẻ cũng không đạt.',
    cpp: '#include <iostream>\nint main() {\n    int age, hasCard; std::cin >> age >> hasCard;\n    std::cout << ((age >= 18 && hasCard == 1) ? "YES" : "NO") << "\\n";\n}',
    python: 'age, has_card = map(int, input().split())\nprint("YES" if age >= 18 and has_card == 1 else "NO")',
    exampleNote: 'Đầu vào 20 0 in NO. Trong C++, && là phép và; Python dùng and.',
    prompt: 'Đọc age và hasCard (0 hoặc 1). In YES khi age >= 18 và hasCard = 1; trường hợp khác in NO.',
    tests: [{ input: '20 1\n', output: 'YES\n' }, { input: '20 0\n', output: 'NO\n' }, { input: '17 1\n', output: 'NO\n' }],
    hints: ['Viết riêng từng điều kiện trước.', 'Dùng phép và, không dùng phép hoặc.', 'Kiểm tra đủ bốn tổ hợp đúng/sai.'],
    checkpoint: { question: 'A đúng và B sai. Giá trị của A và B là gì?', options: ['Đúng', 'Sai', 'Không xác định'], answerIndex: 1, explanation: 'Phép và yêu cầu cả A và B cùng đúng.' },
  },
  {
    slug: 'loops', title: 'Vòng lặp và biến tích lũy',
    objective: 'Tính tổng bằng vòng lặp và giải thích giá trị biến tích lũy sau mỗi lượt.',
    concept: 'Vòng lặp thực hiện một nhóm thao tác nhiều lần. Một tổng tích lũy bắt đầu từ 0; mỗi lượt thêm đúng một giá trị. Theo dõi số lượt lặp quan trọng hơn việc đoán kết quả từ hình dạng đoạn mã.',
    method: 'Với n = 4: tổng lần lượt là 0 → 1 → 3 → 6 → 10. Biến i đi qua 1, 2, 3, 4. Nếu bắt đầu tổng bằng 1 rồi vẫn thêm từ 1, kết quả sẽ thừa 1.',
    cpp: '#include <iostream>\nint main() {\n    int n; std::cin >> n;\n    long long total = 0;\n    for (int i = 1; i <= n; ++i) total += i;\n    std::cout << total << "\\n";\n}',
    python: 'n = int(input())\ntotal = 0\nfor i in range(1, n + 1):\n    total += i\nprint(total)',
    exampleNote: 'Đọc 4 in 10. range(1, n + 1) không chứa cận phải n + 1 nên vẫn chứa n.',
    prompt: 'Đọc n từ 0 đến 100000. Dùng vòng lặp tính tổng các số từ 1 đến n. Với n = 0, in 0.',
    tests: [{ input: '4\n', output: '10\n' }, { input: '1\n', output: '1\n' }, { input: '0\n', output: '0\n' }],
    hints: ['Khởi tạo tổng bằng 0.', 'Kiểm tra vòng lặp có đi đến n hay không.', 'C++ cần long long vì tổng có thể lớn hơn giới hạn int 32 bit.'],
    checkpoint: { question: 'Sau khi cộng lần lượt 1, 2, 3 vào tổng ban đầu 0, tổng là?', options: ['3', '5', '6'], answerIndex: 2, explanation: '0 + 1 + 2 + 3 = 6.' },
  },
  {
    slug: 'nested-loops', title: 'Vòng lặp lồng nhau và số thao tác',
    objective: 'Đọc được hai vòng lặp lồng nhau và ước lượng số lần thực hiện thao tác.',
    concept: 'Mỗi lượt của vòng ngoài chạy trọn vòng trong. Nếu vòng ngoài chạy r lần, vòng trong luôn chạy c lần thì thao tác trong cùng chạy r × c lần. Không cộng số lượt hai vòng như thể chúng nối tiếp nhau.',
    method: 'Có 3 dãy bàn, mỗi dãy 4 chỗ. Đếm từng chỗ bằng hai vòng lặp sẽ tăng bộ đếm 12 lần. Khi r hoặc c bằng 0, không có chỗ nào được đếm.',
    cpp: '#include <iostream>\nint main() {\n    int r, c; std::cin >> r >> c;\n    int count = 0;\n    for (int i = 0; i < r; ++i)\n        for (int j = 0; j < c; ++j) ++count;\n    std::cout << count << "\\n";\n}',
    python: 'r, c = map(int, input().split())\ncount = 0\nfor i in range(r):\n    for j in range(c):\n        count += 1\nprint(count)',
    exampleNote: 'Đầu vào 3 4 in 12. Tên biến i và j không tạo ý nghĩa đặc biệt; phạm vi vòng lặp mới quyết định số lượt.',
    prompt: 'Đọc r, c từ 0 đến 100. Dùng hai vòng lặp đếm số chỗ ngồi trong r hàng và c cột, rồi in kết quả.',
    tests: [{ input: '3 4\n', output: '12\n' }, { input: '0 5\n', output: '0\n' }, { input: '1 1\n', output: '1\n' }],
    hints: ['Đặt bộ đếm bên ngoài cả hai vòng.', 'Mỗi ô hợp lệ chỉ tăng bộ đếm một lần.', 'Thử r = 2, c = 3 trên giấy.'],
    checkpoint: { question: 'Vòng ngoài 5 lượt, vòng trong 2 lượt mỗi lần. Thao tác trong cùng chạy bao nhiêu lần?', options: ['7', '10', '25'], answerIndex: 1, explanation: '5 × 2 = 10 lượt.' },
  },
  {
    slug: 'functions', title: 'Hàm: đầu vào, giá trị trả về và hợp đồng',
    objective: 'Tách một phép tính thành hàm có tham số và giá trị trả về.',
    concept: 'Hàm gói một thao tác có tên. Tham số cho biết dữ liệu cần dùng; giá trị trả về cho biết kết quả. Hàm tính toán nên trả kết quả thay vì luôn in ra, để có thể dùng lại và kiểm thử riêng.',
    method: 'Hàm square nhận x và trả x × x. Hàm không tự đọc bàn phím vì người gọi sẽ cung cấp x. Phần main hoặc phần mã chính chịu trách nhiệm nhập và xuất.',
    cpp: '#include <iostream>\nlong long square(long long x) { return x * x; }\nint main() {\n    long long n; std::cin >> n;\n    std::cout << square(n) << "\\n";\n}',
    python: 'def square(x):\n    return x * x\n\nn = int(input())\nprint(square(n))',
    exampleNote: 'Đọc -4 in 16. Hàm square không thay đổi biến n của người gọi.',
    prompt: 'Viết hàm square nhận một số nguyên rồi trả bình phương. Đọc n từ -1000000 đến 1000000, gọi hàm và in kết quả.',
    tests: [{ input: '-4\n', output: '16\n' }, { input: '0\n', output: '0\n' }, { input: '9\n', output: '81\n' }],
    hints: ['Kết quả là n nhân n, không phải n nhân 2.', 'Dùng return trong hàm.', 'Tách hàm tính khỏi phần đọc và in để kiểm thử dễ hơn.'],
    checkpoint: { question: 'Vì sao hàm tính tổng nên trả giá trị thay vì chỉ in?', options: ['Để người gọi dùng kết quả cho phép tính khác', 'Vì mọi hàm bắt buộc phải in', 'Để không cần tham số'], answerIndex: 0, explanation: 'Giá trị trả về có thể được kiểm thử, lưu và dùng lại.' },
  },
  {
    slug: 'sequences', title: 'Dãy dữ liệu và chỉ số',
    objective: 'Duyệt một dãy và đếm các phần tử thỏa điều kiện mà không truy cập ngoài phạm vi.',
    concept: 'Dãy chứa nhiều phần tử theo thứ tự. Chỉ số đầu tiên là 0; với n phần tử, chỉ số cuối là n - 1. Nếu chỉ cần duyệt toàn bộ giá trị, vòng lặp theo phần tử giúp giảm lỗi chỉ số.',
    method: 'Dãy 2, -1, 0, 7, -4 có hai số dương là 2 và 7. Số 0 không dương. Bộ đếm bắt đầu ở 0 và chỉ tăng khi giá trị > 0.',
    cpp: '#include <iostream>\n#include <vector>\nint main() {\n    int n; std::cin >> n;\n    std::vector<int> values(n);\n    for (int &x : values) std::cin >> x;\n    int count = 0;\n    for (int x : values) if (x > 0) ++count;\n    std::cout << count << "\\n";\n}',
    python: 'import sys\ndata = list(map(int, sys.stdin.read().split()))\nn = data[0]\nvalues = data[1:1 + n]\ncount = 0\nfor x in values:\n    if x > 0:\n        count += 1\nprint(count)',
    exampleNote: 'Dòng đầu là n; theo sau có đúng n số. std::vector và list đều giữ thứ tự, nhưng có quy tắc kiểu khác nhau.',
    prompt: 'Đọc n từ 0 đến 1000, sau đó đọc n số nguyên. In số phần tử lớn hơn 0. Cho phép các số xuất hiện trên nhiều dòng.',
    tests: [{ input: '5\n2 -1 0 7 -4\n', output: '2\n' }, { input: '0\n', output: '0\n' }, { input: '3\n1 2 3\n', output: '3\n' }],
    hints: ['Không tính 0 là số dương.', 'Đếm phần tử thỏa điều kiện, không cộng giá trị của chúng.', 'Nếu dùng chỉ số, chỉ duyệt từ 0 đến n - 1.'],
    checkpoint: { question: 'Dãy có 4 phần tử. Chỉ số hợp lệ cuối cùng là?', options: ['4', '3', '5'], answerIndex: 1, explanation: 'Các chỉ số là 0, 1, 2, 3.' },
  },
  {
    slug: 'strings', title: 'Chuỗi và chuẩn hóa dữ liệu đơn giản',
    objective: 'Duyệt chuỗi ASCII và kiểm tra ký tự theo một tập cho trước.',
    concept: 'Chuỗi là dãy ký tự, nhưng cách biểu diễn Unicode không giống nhau giữa các ngôn ngữ. Bài này cố ý giới hạn chữ cái ASCII thường để tập trung vào thuật toán. Không suy rộng cách xử lý từng byte của std::string thành xử lý tiếng Việt đầy đủ.',
    method: 'Các nguyên âm cần đếm là a, e, i, o, u. Với school, hai chữ o tạo kết quả 2. Với rhythm, kết quả 0. Đọc hợp đồng dữ liệu trước khi thêm quy tắc như đổi chữ hoa thành chữ thường.',
    cpp: '#include <iostream>\n#include <string>\nint main() {\n    std::string s; std::getline(std::cin, s);\n    int count = 0;\n    for (char ch : s)\n        if (std::string("aeiou").find(ch) != std::string::npos) ++count;\n    std::cout << count << "\\n";\n}',
    python: 's = input()\ncount = 0\nfor ch in s:\n    if ch in "aeiou":\n        count += 1\nprint(count)',
    exampleNote: 'Chuỗi có thể chứa khoảng trắng; khoảng trắng không phải nguyên âm. Bộ kiểm thử này không yêu cầu phân tách chữ tiếng Việt.',
    prompt: 'Đọc một dòng gồm chữ cái thường ASCII và khoảng trắng, dài tối đa 1000 ký tự. In số ký tự nằm trong tập aeiou.',
    tests: [{ input: 'school\n', output: '2\n' }, { input: 'rhythm\n', output: '0\n' }, { input: 'a e i o u\n', output: '5\n' }],
    hints: ['Kiểm tra từng ký tự thuộc tập aeiou.', 'Một nguyên âm lặp lại được đếm mỗi lần xuất hiện.', 'Đọc cả dòng để không mất phần sau khoảng trắng.'],
    checkpoint: { question: 'Theo quy tắc của bài, school có bao nhiêu nguyên âm?', options: ['1', '2', '3'], answerIndex: 1, explanation: 'Hai ký tự o đều được đếm.' },
  },
  {
    slug: 'records', title: 'Gom dữ liệu thành một bản ghi',
    objective: 'Biểu diễn một mặt hàng gồm số lượng và đơn giá, sau đó tính thành tiền.',
    concept: 'Khi nhiều giá trị mô tả cùng một đối tượng, gom chúng vào bản ghi giúp tên trường làm rõ ý nghĩa. C++ có struct; Python có thể dùng dict cho bước đầu. Không nhầm quan hệ “thuộc cùng bản ghi” với thứ tự tùy ý của nhiều biến rời rạc.',
    method: 'Một mặt hàng có quantity = 3 và unitPrice = 12000. Thành tiền là 36000 đồng. Giữ tiền bằng số nguyên đồng tránh sai số thập phân không cần thiết.',
    cpp: '#include <iostream>\nstruct Item { long long quantity; long long unitPrice; };\nint main() {\n    Item item; std::cin >> item.quantity >> item.unitPrice;\n    std::cout << item.quantity * item.unitPrice << "\\n";\n}',
    python: 'quantity, unit_price = map(int, input().split())\nitem = {"quantity": quantity, "unit_price": unit_price}\nprint(item["quantity"] * item["unit_price"])',
    exampleNote: 'Đầu vào 3 12000 in 36000. Đây là phép tính học tập, không phải cập nhật ví tiền thật của sinh viên.',
    prompt: 'Đọc số lượng từ 0 đến 1000 và đơn giá từ 0 đến 1000000 đồng. Lưu dữ liệu vào một bản ghi và in thành tiền.',
    tests: [{ input: '3 12000\n', output: '36000\n' }, { input: '0 5000\n', output: '0\n' }, { input: '2 0\n', output: '0\n' }],
    hints: ['Đặt tên trường theo ý nghĩa dữ liệu.', 'Thành tiền bằng số lượng nhân đơn giá.', 'C++ dùng kiểu đủ lớn cho phép nhân.'],
    checkpoint: { question: 'Vì sao gom quantity và unitPrice thành Item?', options: ['Để thể hiện chúng cùng mô tả một mặt hàng', 'Để không cần kiểm tra dữ liệu', 'Để tự động tính thuế'], answerIndex: 0, explanation: 'Bản ghi giúp biểu diễn quan hệ và đặt tên dữ liệu; kiểm tra và xử lý vẫn cần thiết.' },
  },
  {
    slug: 'debugging', title: 'Gỡ lỗi bằng giả thuyết và ca kiểm thử nhỏ',
    objective: 'Tìm và sửa lỗi bỏ sót phần tử cuối trong vòng lặp.',
    concept: 'Gỡ lỗi gồm tái hiện lỗi, đặt giả thuyết, quan sát bằng chứng rồi sửa nhỏ. Thay nhiều dòng cùng lúc khiến khó biết điều gì đã sửa lỗi. Phân biệt lỗi cú pháp, lỗi khi chạy và kết quả sai dù chương trình chạy được.',
    method: 'Hàm cần tính 1 + … + n. Đoạn lặp i < n hoặc range(1, n) bỏ n. Dùng n = 1 sẽ làm lộ lỗi ngay: chương trình in 0 thay vì 1. Sửa cận rồi kiểm tra lại n = 0 và n = 4.',
    cpp: '#include <iostream>\nint main() {\n    int n; std::cin >> n;\n    long long sum = 0;\n    for (int i = 1; i <= n; ++i) sum += i;\n    std::cout << sum << "\\n";\n}',
    python: 'n = int(input())\nsum_value = 0\nfor i in range(1, n + 1):\n    sum_value += i\nprint(sum_value)',
    exampleNote: 'Ví dụ là phiên bản đã sửa. Hãy dự đoán kết quả của phiên bản dùng cận sai trước khi chạy.',
    prompt: 'Sửa lỗi cận vòng lặp trong chương trình tính tổng 1 đến n (0 <= n <= 100000). Ghi một ca kiểm thử nhỏ làm lộ lỗi, rồi nộp mã đã sửa.',
    tests: [{ input: '1\n', output: '1\n', note: 'Ca nhỏ nhất làm lộ việc bỏ n.' }, { input: '0\n', output: '0\n' }, { input: '4\n', output: '10\n' }],
    starterCpp: '#include <iostream>\nint main() {\n    int n; std::cin >> n;\n    long long sum = 0;\n    // Mã này có lỗi cận vòng lặp. Hãy sửa và giữ các ca hồi quy.\n    for (int i = 1; i < n; ++i) sum += i;\n    std::cout << sum << "\\n";\n}\n',
    starterPython: 'n = int(input())\nsum_value = 0\n# Mã này có lỗi cận vòng lặp. Hãy sửa và giữ các ca hồi quy.\nfor i in range(1, n):\n    sum_value += i\nprint(sum_value)\n',
    hints: ['Đừng sửa công thức và cận cùng lúc.', 'Theo dõi i cho n = 1.', 'Kiểm tra lại cả trường hợp biên sau khi sửa.'],
    checkpoint: { question: 'Ca nào làm lộ lỗi bỏ n với ít bước nhất?', options: ['n = 100000', 'n = 1', 'Chỉ kiểm tra mã có biên dịch'], answerIndex: 1, explanation: 'n = 1 cần có đúng một lượt cộng, nên cận sai lộ ngay.' },
  },
  {
    slug: 'searching', title: 'Tìm kiếm tuyến tính và quy ước không tìm thấy',
    objective: 'Tìm vị trí đầu tiên của mục tiêu, trả -1 khi không tồn tại.',
    concept: 'Tìm kiếm tuyến tính duyệt lần lượt cho đến khi thấy mục tiêu. Phải thống nhất chỉ số bắt đầu từ 0 hay 1, cần vị trí đầu hay cuối, và giá trị nào báo không tìm thấy. Đây là một phần hợp đồng của thuật toán.',
    method: 'Dãy 4, 9, 4, 2 tìm 4 trả 0 vì đó là lần xuất hiện đầu tiên. Tìm 7 trả -1. Trường hợp lặp giúp phát hiện chương trình vô tình giữ vị trí cuối cùng.',
    cpp: '#include <iostream>\n#include <vector>\nint main() {\n    int n, target; std::cin >> n >> target;\n    std::vector<int> a(n); for (int &x : a) std::cin >> x;\n    int position = -1;\n    for (int i = 0; i < n; ++i) {\n        if (a[i] == target) { position = i; break; }\n    }\n    std::cout << position << "\\n";\n}',
    python: 'import sys\ndata = list(map(int, sys.stdin.read().split()))\nn, target = data[:2]\na = data[2:2 + n]\nposition = -1\nfor i, value in enumerate(a):\n    if value == target:\n        position = i\n        break\nprint(position)',
    exampleNote: 'Chương trình dừng ở lần khớp đầu tiên. Trường hợp xấu nhất cần kiểm tra n phần tử.',
    prompt: 'Đọc n, target và n số nguyên (0 <= n <= 1000). In chỉ số từ 0 của target xuất hiện đầu tiên, hoặc -1 nếu không có.',
    tests: [{ input: '4 4\n4 9 4 2\n', output: '0\n' }, { input: '3 7\n1 2 3\n', output: '-1\n' }, { input: '0 8\n', output: '-1\n' }],
    hints: ['Khởi tạo vị trí là -1.', 'Khi tìm thấy thì dừng nếu cần vị trí đầu tiên.', 'Dãy rỗng không có phần tử phù hợp.'],
    checkpoint: { question: 'Dãy [4, 9, 4, 2] tìm vị trí đầu của 4, đánh số từ 0, trả gì?', options: ['0', '2', '-1'], answerIndex: 0, explanation: 'Phần tử đầu tiên đã bằng 4 nên vị trí là 0.' },
  },
  {
    slug: 'testing', title: 'Thiết kế kiểm thử: bình thường, biên và hồi quy',
    objective: 'Chọn bộ dữ liệu có khả năng phát hiện lỗi thay vì chỉ thử một ví dụ thuận lợi.',
    concept: 'Một lần chạy đúng không chứng minh chương trình đúng cho mọi đầu vào. Chọn dữ liệu đại diện từng lớp: không có phần tử, đúng một phần tử, tất cả đạt, không phần tử nào đạt và dữ liệu hỗn hợp. Ca hồi quy được giữ lại để lỗi đã sửa không quay lại.',
    method: 'Hàm đếm số chẵn cần tính cả 0 và số âm. Dãy -2, -1, 0, 3, 4 có ba số chẵn. Ca [0] giúp phát hiện điều kiện sai x > 0 và x chẵn.',
    cpp: '#include <iostream>\nint main() {\n    int n; std::cin >> n;\n    int count = 0;\n    for (int i = 0; i < n; ++i) {\n        int x; std::cin >> x;\n        if (x % 2 == 0) ++count;\n    }\n    std::cout << count << "\\n";\n}',
    python: 'import sys\ndata = list(map(int, sys.stdin.read().split()))\nn = data[0]\ncount = 0\nfor x in data[1:1 + n]:\n    if x % 2 == 0:\n        count += 1\nprint(count)',
    exampleNote: 'Đầu vào 5 rồi -2 -1 0 3 4 in 3. Điều kiện chia hết cho 2 vẫn đúng với số chẵn âm.',
    prompt: 'Đọc n (0 <= n <= 1000) và n số nguyên. In số lượng số chẵn, bao gồm số 0 và số chẵn âm. Trước khi nộp, tự thêm hai ca ngoài các ví dụ công khai.',
    tests: [{ input: '5\n-2 -1 0 3 4\n', output: '3\n' }, { input: '1\n0\n', output: '1\n' }, { input: '0\n', output: '0\n' }],
    hints: ['Một số chẵn có phần dư khi chia 2 bằng 0.', 'Đừng thêm điều kiện số phải dương.', 'Kiểm tra riêng dãy rỗng và dãy có một số 0.'],
    checkpoint: { question: 'Ca nào phát hiện chương trình bỏ sót số 0 khi đếm số chẵn?', options: ['[2, 4]', '[1, 3]', '[0]'], answerIndex: 2, explanation: '[0] phải trả 1; hai ca còn lại không kiểm tra quy tắc đối với số 0.' },
  },
  {
    slug: 'budget-project', title: 'Bài tích hợp: sổ chi tiêu tuần',
    objective: 'Kết hợp nhập dữ liệu, dãy, vòng lặp và hàm để tính ngân sách còn lại.',
    concept: 'Một bài tích hợp cần đặc tả trước khi viết mã. Dữ liệu gồm ngân sách ban đầu và từng khoản chi. Kết quả có thể âm, thể hiện chi vượt ngân sách. Không tự chặn số âm nếu hợp đồng yêu cầu giữ đúng kết quả.',
    method: 'Ngân sách 500000 đồng, chi 120000, 80000 và 50000: tổng chi 250000, còn 250000. Ngân sách 100000, chi 120000: kết quả -20000. Hàm tổng chi có thể được kiểm thử tách biệt với nhập và xuất.',
    cpp: '#include <iostream>\n#include <vector>\nlong long totalCost(const std::vector<long long>& costs) {\n    long long total = 0;\n    for (long long cost : costs) total += cost;\n    return total;\n}\nint main() {\n    long long budget; int n; std::cin >> budget >> n;\n    std::vector<long long> costs(n);\n    for (long long &cost : costs) std::cin >> cost;\n    std::cout << budget - totalCost(costs) << "\\n";\n}',
    python: 'import sys\n\ndef total_cost(costs):\n    total = 0\n    for cost in costs:\n        total += cost\n    return total\n\ndata = list(map(int, sys.stdin.read().split()))\nbudget, n = data[:2]\ncosts = data[2:2 + n]\nprint(budget - total_cost(costs))',
    exampleNote: 'Ví dụ chỉ xử lý tiền nguyên đồng và không sửa ví trong game. Hãy trình bày vì sao số âm là hợp lệ.',
    prompt: 'Đọc budget (0..10^9), n (0..1000), rồi n khoản chi (0..10^6). In ngân sách còn lại. Có hàm tính tổng chi, xử lý được không có khoản chi và chi vượt ngân sách.',
    tests: [{ input: '500000 3\n120000 80000 50000\n', output: '250000\n' }, { input: '100000 1\n120000\n', output: '-20000\n' }, { input: '100000 0\n', output: '100000\n' }],
    hints: ['Viết hợp đồng đầu vào/đầu ra và ba ca kiểm thử trước.', 'Tách hàm tổng chi để tránh lặp mã.', 'Số âm là kết quả cần báo, không phải lỗi cần ép thành 0.'],
    checkpoint: { question: 'Ngân sách 100000, chi 120000. Theo đặc tả, kết quả cần in là gì?', options: ['0', '-20000', '20000'], answerIndex: 1, explanation: '100000 - 120000 = -20000; số âm thể hiện vượt ngân sách.' },
  },
];

const cppStarter = '#include <iostream>\n#include <vector>\n#include <string>\nint main() {\n    // Đọc dữ liệu, xử lý và in kết quả theo đề.\n    return 0;\n}\n';
const pyStarter = '# Đọc dữ liệu, xử lý và in kết quả theo đề.\n';

export function makeIntroLessons(track: LearningTrack): Lesson[] {
  return topics.map((topic, index) => ({
    id: `intro-${track}-${topic.slug}`,
    courseId: 'intro-programming',
    track,
    title: `${String(index + 1).padStart(2, '0')}. ${topic.title}`,
    objective: topic.objective,
    sections: [
      { heading: 'Ý tưởng cốt lõi', body: topic.concept },
      { heading: 'Làm thử trên giấy', body: topic.method },
      { heading: track === 'cpp' ? 'Lưu ý với C++' : 'Lưu ý với Python', body: track === 'cpp'
        ? 'Dùng C++17 cho các bài này. Khai báo kiểu trước khi dùng biến; dấu chấm phẩy kết thúc nhiều câu lệnh. Dấu ngoặc nhọn gom khối. Khi lỗi biên dịch, đọc thông báo đầu tiên và đối chiếu dòng ngay trước nó.'
        : 'Dùng Python 3. Dấu thụt dòng xác định khối; giữ nhất quán bốn dấu cách. input() trả chuỗi nên chỉ chuyển sang int khi hợp đồng yêu cầu số nguyên. Tên biến rõ nghĩa giúp quan sát từng bước.' },
    ],
    example: { language: track, code: topic[track], explanation: topic.exampleNote },
    practice: [{ id: `intro-${track}-${topic.slug}-practice`, language: track,
      prompt: topic.prompt, starterCode: track === 'cpp' ? (topic.starterCpp ?? cppStarter) : (topic.starterPython ?? pyStarter),
      publicTests: topic.tests, hints: topic.hints }],
    checkpoint: topic.checkpoint,
    sources: [track === 'cpp' ? cppSource : pySource],
    estimatedMinutes: index === topics.length - 1 ? 45 : 25,
    reviewStatus: 'draft' as const,
  }));
}

export const introLessons = [...makeIntroLessons('cpp'), ...makeIntroLessons('python')];
