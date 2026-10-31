import type { PublicTest } from './types.ts';

export interface DualExercise {
  lessonSlug: string;
  suffix: string;
  title: string;
  kind: 'primary' | 'transfer' | 'integration';
  prompt: string;
  tests: PublicTest[];
  hints: string[];
  cpp: string;
  python: string;
  selfCheck: string[];
}

const cpp = (body: string) => `#include <algorithm>\n#include <iostream>\n#include <sstream>\n#include <string>\n#include <vector>\nint main() {\n${body}\n}\n`;
const py = (source: string) => `${source.trim()}\n`;

export const primaryReferenceOverrides = {
  cpp: {
    'variables-types': cpp(String.raw`    long long n, k; std::cin >> n >> k;
    std::cout << n / k << " " << n % k << "\n";`),
  },
  python: { 'variables-types': py('n, k = map(int, input().split())\nprint(n // k, n % k)') },
} as const;

export const primaryExtraTests: Record<string, PublicTest[]> = {
  'input-output': [{ input: '-1000 -1000\n', output: '-2000\n' }],
  'variables-types': [{ input: '1000000 1\n', output: '1000000 0\n' }, { input: '3 10\n', output: '0 3\n' }],
  conditions: [{ input: '0\n', output: 'NO\n' }, { input: '120\n', output: 'YES\n' }],
  'boolean-logic': [{ input: '18 1\n', output: 'YES\n' }, { input: '17 0\n', output: 'NO\n' }],
  loops: [{ input: '100000\n', output: '5000050000\n', note: 'Cần kết quả lớn hơn giới hạn số nguyên 32 bit.' }],
  'nested-loops': [{ input: '4 0\n', output: '0\n' }, { input: '100 100\n', output: '10000\n' }],
  functions: [{ input: '1000000\n', output: '1000000000000\n' }, { input: '-1\n', output: '1\n' }],
  sequences: [{ input: '1\n0\n', output: '0\n' }, { input: '4\n-4 -3 -2 -1\n', output: '0\n' }],
  strings: [{ input: '\n', output: '0\n' }, { input: 'queue\n', output: '4\n' }],
  records: [{ input: '1000 1000000\n', output: '1000000000\n' }],
  debugging: [{ input: '2\n', output: '3\n' }],
  searching: [{ input: '4 2\n9 7 2 2\n', output: '2\n' }],
  testing: [{ input: '3\n-4 -2 -6\n', output: '3\n' }],
  'budget-project': [{ input: '0 2\n0 1\n', output: '-1\n' }],
};

export const dualExercises: DualExercise[] = [
  {
    lessonSlug: 'algorithm-planning', suffix: 'practice', title: 'Từ đặc tả đến chu vi', kind: 'primary',
    prompt: 'Đọc hai cạnh a,b nguyên của hình chữ nhật, 1 <= a,b <= 1000000. In chu vi 2*(a+b). Trước khi cài đặt, viết giả mã có bước đọc, tính và xuất; đơn vị đầu ra giống đơn vị cạnh.',
    tests: [{ input: '3 5\n', output: '16\n' }, { input: '1 1\n', output: '4\n' }, { input: '1000000 1\n', output: '2000002\n' }],
    hints: ['Chu vi khác diện tích.', 'Tính tổng hai cạnh rồi nhân 2.', 'Hãy kiểm tra hình vuông cạnh 1 trước.'],
    cpp: cpp(String.raw`    long long a, b; std::cin >> a >> b;
    std::cout << 2 * (a + b) << "\n";`),
    python: py('a, b = map(int, input().split())\nprint(2 * (a + b))'),
    selfCheck: ['Giả mã có ba bước đọc–xử lý–xuất.', 'Phân biệt được chu vi với diện tích bằng một ca có a,b khác nhau.'],
  },
  {
    lessonSlug: 'algorithm-planning', suffix: 'transfer', title: 'Đổi bài toán sang diện tích', kind: 'transfer',
    prompt: 'Đọc hai cạnh a,b nguyên, 1 <= a,b <= 1000000. In diện tích a*b. Giải thích phần nào của giả mã chu vi được giữ và phần nào thay đổi.',
    tests: [{ input: '3 5\n', output: '15\n' }, { input: '1 1\n', output: '1\n' }, { input: '1000000 1000000\n', output: '1000000000000\n' }],
    hints: ['Giữ hợp đồng hai số đầu vào.', 'Chỉ thay quy tắc xử lý; đừng giữ phép cộng chu vi.', 'Kiểm tra miền giá trị kết quả trước khi chọn kiểu.'],
    cpp: cpp(String.raw`    long long a, b; std::cin >> a >> b;
    std::cout << a * b << "\n";`),
    python: py('a, b = map(int, input().split())\nprint(a * b)'),
    selfCheck: ['Nêu được đơn vị diện tích là bình phương đơn vị cạnh.', 'Giải thích được vì sao cần kiểu chứa tới 10^12 trong C++.'],
  },
  {
    lessonSlug: 'input-output', suffix: 'transfer', title: 'Đọc ba giá trị, xuất thứ tự ngược', kind: 'transfer',
    prompt: 'Đọc ba số nguyên a,b,c (mỗi số trong [-1000,1000]), có thể nằm trên nhiều dòng. In c,b,a trên một dòng, cách nhau đúng một khoảng trắng.',
    tests: [{ input: '3 9 -2\n', output: '-2 9 3\n' }, { input: '1\n2\n3\n', output: '3 2 1\n' }, { input: '0 0 0\n', output: '0 0 0\n' }],
    hints: ['Thứ tự đọc và thứ tự in không bắt buộc giống nhau.', 'Python có thể đọc toàn bộ stdin rồi split.', 'Không in dấu phẩy hoặc lời nhắc.'],
    cpp: cpp(String.raw`    int a, b, c; std::cin >> a >> b >> c;
    std::cout << c << " " << b << " " << a << "\n";`),
    python: py('import sys\na, b, c = map(int, sys.stdin.read().split())\nprint(c, b, a)'),
    selfCheck: ['Tự thử ba giá trị khác nhau để phát hiện đảo sai.', 'Phân biệt khoảng trắng đầu vào với cấu trúc dòng đầu ra.'],
  },
  {
    lessonSlug: 'variables-types', suffix: 'transfer', title: 'Đủ hộp cho cả phần dư', kind: 'transfer',
    prompt: 'Có n sản phẩm, mỗi hộp chứa tối đa k sản phẩm (0 <= n <= 1000000, 1 <= k <= 1000). In số hộp ít nhất để chứa tất cả, kể cả hộp cuối chưa đầy. Nếu n=0, kết quả 0.',
    tests: [{ input: '17 5\n', output: '4\n' }, { input: '20 5\n', output: '4\n' }, { input: '0 7\n', output: '0\n' }, { input: '3 10\n', output: '1\n' }],
    hints: ['Thương nguyên chỉ đếm hộp đầy.', 'Nếu có phần dư, cần thêm một hộp.', 'Với số không âm, (n+k-1) chia nguyên cho k cho kết quả cần tìm.'],
    cpp: cpp(String.raw`    long long n, k; std::cin >> n >> k;
    std::cout << (n + k - 1) / k << "\n";`),
    python: py('n, k = map(int, input().split())\nprint((n + k - 1) // k)'),
    selfCheck: ['Giải thích được vì sao chia hết không cần hộp thêm.', 'Không dùng công thức cho số âm khi đề chỉ cho số không âm.'],
  },
  {
    lessonSlug: 'conditions', suffix: 'transfer', title: 'Chọn số lớn hơn, kể cả khi bằng nhau', kind: 'transfer',
    prompt: 'Đọc a,b trong [-1000000,1000000]. Dùng rẽ nhánh in giá trị lớn hơn; nếu bằng nhau, in giá trị chung một lần.',
    tests: [{ input: '4 9\n', output: '9\n' }, { input: '-2 -7\n', output: '-2\n' }, { input: '5 5\n', output: '5\n' }],
    hints: ['Có thể chọn a khi a>=b, còn lại chọn b.', 'Không khởi tạo kết quả bằng 0 cho mọi đầu vào.', 'Thử cả hai số âm.'],
    cpp: cpp(String.raw`    long long a, b; std::cin >> a >> b;
    if (a >= b) std::cout << a << "\n";
    else std::cout << b << "\n";`),
    python: py('a, b = map(int, input().split())\nif a >= b:\n    print(a)\nelse:\n    print(b)'),
    selfCheck: ['Có ba lớp a<b, a=b, a>b.', 'Giải thích đường thực thi khi a=b.'],
  },
  {
    lessonSlug: 'boolean-logic', suffix: 'transfer', title: 'Đủ một trong hai điều kiện', kind: 'transfer',
    prompt: 'Đọc score (0..10) và volunteer (0..10), đều nguyên. In YES nếu score>=8 hoặc volunteer>=2; còn lại NO. Đây là quy tắc giả định cho bài luyện, không phải công thức học bổng trong game.',
    tests: [{ input: '8 0\n', output: 'YES\n' }, { input: '4 2\n', output: 'YES\n' }, { input: '7 1\n', output: 'NO\n' }, { input: '10 5\n', output: 'YES\n' }],
    hints: ['Chỉ cần một vế đúng nên dùng hoặc.', 'Trường hợp chỉ một vế đúng phân biệt OR và AND.', 'Dấu bằng ở cả hai ngưỡng được chấp nhận.'],
    cpp: cpp(String.raw`    int score, volunteer; std::cin >> score >> volunteer;
    std::cout << ((score >= 8 || volunteer >= 2) ? "YES" : "NO") << "\n";`),
    python: py('score, volunteer = map(int, input().split())\nprint("YES" if score >= 8 or volunteer >= 2 else "NO")'),
    selfCheck: ['Lập đủ bốn tổ hợp đúng/sai của hai vế.', 'Tìm một ca cho kết quả khác nếu dùng AND nhầm.'],
  },
  {
    lessonSlug: 'loops', suffix: 'transfer', title: 'Cộng các bội của 3', kind: 'transfer',
    prompt: 'Đọc n (0..100000). In tổng các số trong [1,n] chia hết cho 3. Dùng vòng lặp và điều kiện; tự dự đoán kết quả khi n<3.',
    tests: [{ input: '2\n', output: '0\n' }, { input: '3\n', output: '3\n' }, { input: '8\n', output: '9\n' }, { input: '9\n', output: '18\n' }],
    hints: ['Bộ tích lũy bắt đầu bằng 0.', 'Kiểm tra i%3==0 trước khi cộng.', 'Biên n=3 cần được tính vào.'],
    cpp: cpp(String.raw`    int n; std::cin >> n; long long total = 0;
    for (int i = 1; i <= n; ++i) if (i % 3 == 0) total += i;
    std::cout << total << "\n";`),
    python: py('n = int(input())\ntotal = 0\nfor i in range(1, n + 1):\n    if i % 3 == 0:\n        total += i\nprint(total)'),
    selfCheck: ['Bảng vết n=8 chỉ cộng 3 và 6.', 'Phân biệt đếm bội số với cộng giá trị các bội số.'],
  },
  {
    lessonSlug: 'while-sentinel', suffix: 'practice', title: 'Dừng tại dấu kết thúc', kind: 'primary',
    prompt: 'Đọc một dãy số nguyên trong [-1000,1000], có ít nhất một số 0 kết thúc. In tổng các số đứng trước số 0 đầu tiên. Không cộng số 0 hoặc dữ liệu phía sau nó; tối đa 1000 số trước dấu kết thúc.',
    tests: [{ input: '5 -2 0 999\n', output: '3\n' }, { input: '0\n', output: '0\n' }, { input: '-5 -4 0\n', output: '-9\n' }, { input: '1\n2\n3\n0\n', output: '6\n' }],
    hints: ['Kiểm tra điều kiện dừng trước khi cộng.', 'Mỗi lượt cần đọc hoặc chuyển sang một giá trị mới.', 'Trường hợp số đầu tiên là 0 có không lượt cộng.'],
    cpp: cpp(String.raw`    long long total = 0; int x;
    while (std::cin >> x && x != 0) total += x;
    std::cout << total << "\n";`),
    python: py('import sys\nvalues = list(map(int, sys.stdin.read().split()))\ntotal = 0\ni = 0\nwhile i < len(values) and values[i] != 0:\n    total += values[i]\n    i += 1\nprint(total)'),
    selfCheck: ['Chỉ ra đại lượng thay đổi để vòng lặp tiến tới kết thúc.', 'Giải thích vì sao 999 sau dấu 0 không được cộng.'],
  },
  {
    lessonSlug: 'while-sentinel', suffix: 'transfer', title: 'Đếm chữ số bằng phép chia lặp', kind: 'transfer',
    prompt: 'Đọc số nguyên n, 0 <= n <= 1000000000. In số chữ số thập phân của n. Số 0 có một chữ số. Dùng phép chia nguyên lặp để rèn điều kiện dừng.',
    tests: [{ input: '0\n', output: '1\n' }, { input: '8\n', output: '1\n' }, { input: '1200\n', output: '4\n' }, { input: '1000000000\n', output: '10\n' }],
    hints: ['Tách riêng n=0.', 'Mỗi lần chia nguyên cho 10 bỏ đi một chữ số cuối.', 'Đừng dùng chia thực khiến điều kiện n>0 kéo dài sai ý nghĩa.'],
    cpp: cpp(String.raw`    long long n; std::cin >> n;
    int count = n == 0 ? 1 : 0;
    while (n > 0) { ++count; n /= 10; }
    std::cout << count << "\n";`),
    python: py('n = int(input())\ncount = 1 if n == 0 else 0\nwhile n > 0:\n    count += 1\n    n //= 10\nprint(count)'),
    selfCheck: ['Vết n=1200 đi qua 1200,120,12,1,0.', 'Nêu lý do số 0 cần ca riêng.'],
  },
  {
    lessonSlug: 'nested-loops', suffix: 'transfer', title: 'Xuất bảng tích nhỏ theo hàng', kind: 'transfer',
    prompt: 'Đọc r,c từ 1 đến 10. In r dòng, dòng i (đánh số từ 1) chứa i*1, i*2, …, i*c. Mỗi dòng có c số cách nhau một khoảng trắng.',
    tests: [{ input: '2 3\n', output: '1 2 3\n2 4 6\n' }, { input: '1 1\n', output: '1\n' }, { input: '3 1\n', output: '1\n2\n3\n' }],
    hints: ['Vòng ngoài chọn hàng i.', 'Vòng trong xuất i*j.', 'Xuống dòng sau khi kết thúc một hàng, không sau mỗi ô.'],
    cpp: cpp(String.raw`    int r, c; std::cin >> r >> c;
    for (int i = 1; i <= r; ++i) {
        for (int j = 1; j <= c; ++j) { if (j > 1) std::cout << " "; std::cout << i * j; }
        std::cout << "\n";
    }`),
    python: py('r, c = map(int, input().split())\nfor i in range(1, r + 1):\n    row = []\n    for j in range(1, c + 1):\n        row.append(str(i * j))\n    print(" ".join(row))'),
    selfCheck: ['Chỉ ra vị trí xuống dòng tương ứng kết thúc hàng.', 'Đếm số phép nhân r*c.'],
  },
  {
    lessonSlug: 'functions', suffix: 'transfer', title: 'Hàm giá trị tuyệt đối', kind: 'transfer',
    prompt: 'Viết hàm absolute_value nhận x trong [-1000000,1000000] và trả giá trị tuyệt đối. Chương trình đọc x, gọi hàm và in kết quả. Bộ chấm kiểm tra hành vi; việc tách hàm cần tự đối chiếu.',
    tests: [{ input: '-7\n', output: '7\n' }, { input: '7\n', output: '7\n' }, { input: '0\n', output: '0\n' }, { input: '-1000000\n', output: '1000000\n' }],
    hints: ['Nếu x<0 thì trả -x.', 'Giữ 0 và số dương không đổi.', 'Hàm trả kết quả; phần chính mới in.'],
    cpp: '#include <iostream>\nlong long absolute_value(long long x) { return x < 0 ? -x : x; }\nint main() { long long x; std::cin >> x; std::cout << absolute_value(x) << "\\n"; }\n',
    python: py('def absolute_value(x):\n    return -x if x < 0 else x\n\nx = int(input())\nprint(absolute_value(x))'),
    selfCheck: ['Có hàm riêng nhận tham số và trả giá trị.', 'Không đọc bàn phím bên trong hàm tính toán.'],
  },
  {
    lessonSlug: 'sequences', suffix: 'transfer', title: 'Giá trị lớn nhất trong dãy toàn âm', kind: 'transfer',
    prompt: 'Đọc n (1..1000) và n số nguyên trong [-1000000,1000000]. In giá trị lớn nhất. Dãy không rỗng; đừng tự thêm giá trị 0 vào dữ liệu.',
    tests: [{ input: '3\n-8 -3 -5\n', output: '-3\n' }, { input: '1\n-9\n', output: '-9\n' }, { input: '4\n2 2 1 0\n', output: '2\n' }],
    hints: ['Khởi tạo giá trị tốt nhất từ phần tử đầu.', 'So sánh các phần tử còn lại.', 'Ca toàn âm phân biệt lời giải đúng và khởi tạo nhầm bằng 0.'],
    cpp: cpp(String.raw`    int n; std::cin >> n;
    long long best; std::cin >> best;
    for (int i = 1; i < n; ++i) { long long x; std::cin >> x; if (x > best) best = x; }
    std::cout << best << "\n";`),
    python: py('import sys\ndata = list(map(int, sys.stdin.read().split()))\nn = data[0]\na = data[1:1+n]\nbest = a[0]\nfor x in a[1:]:\n    if x > best:\n        best = x\nprint(best)'),
    selfCheck: ['Nêu bất biến: best là max của phần đã xét.', 'Giải thích vì sao cần n>=1 trong hợp đồng này.'],
  },
  {
    lessonSlug: 'matrix-data', suffix: 'practice', title: 'Tổng từng hàng trong bảng dữ liệu', kind: 'primary',
    prompt: 'Đọc r,c (1..20), sau đó r*c số nguyên trong [-1000,1000] theo thứ tự hàng. In r dòng; mỗi dòng là tổng của một hàng. Đặt lại tổng về 0 khi bắt đầu hàng mới.',
    tests: [{ input: '2 3\n1 2 3\n4 5 6\n', output: '6\n15\n' }, { input: '1 1\n-4\n', output: '-4\n' }, { input: '3 1\n2\n0\n-2\n', output: '2\n0\n-2\n' }],
    hints: ['Vòng ngoài duyệt hàng.', 'Khởi tạo tổng bên trong vòng ngoài, trước vòng trong.', 'Không in tổng toàn bộ ma trận nếu đề hỏi từng hàng.'],
    cpp: cpp(String.raw`    int r, c; std::cin >> r >> c;
    for (int i = 0; i < r; ++i) {
        long long total = 0;
        for (int j = 0; j < c; ++j) { long long x; std::cin >> x; total += x; }
        std::cout << total << "\n";
    }`),
    python: py('import sys\ndata = list(map(int, sys.stdin.read().split()))\nr, c = data[:2]\nposition = 2\nfor i in range(r):\n    total = 0\n    for j in range(c):\n        total += data[position]\n        position += 1\n    print(total)'),
    selfCheck: ['Bảng vết chỉ ra lúc tổng được đặt lại.', 'Giải thích đầu vào dạng phẳng vẫn ánh xạ được hàng/cột.'],
  },
  {
    lessonSlug: 'matrix-data', suffix: 'transfer', title: 'Chuyển vị bảng chữ nhật', kind: 'transfer',
    prompt: 'Đọc r,c (1..20) và ma trận r hàng c cột. In ma trận chuyển vị có c hàng r cột. Các giá trị nguyên trong [-1000,1000]. Cần lưu dữ liệu vì thứ tự xuất khác thứ tự đọc.',
    tests: [{ input: '2 3\n1 2 3\n4 5 6\n', output: '1 4\n2 5\n3 6\n' }, { input: '1 3\n2 -1 0\n', output: '2\n-1\n0\n' }, { input: '1 1\n7\n', output: '7\n' }],
    hints: ['Đọc xong ma trận vào dãy hai chiều.', 'Vòng xuất ngoài theo cột cũ, vòng trong theo hàng cũ.', 'Không dùng ma trận vuông làm ca thử duy nhất.'],
    cpp: cpp(String.raw`    int r, c; std::cin >> r >> c;
    std::vector<std::vector<int>> a(r, std::vector<int>(c));
    for (int i = 0; i < r; ++i) for (int j = 0; j < c; ++j) std::cin >> a[i][j];
    for (int j = 0; j < c; ++j) {
        for (int i = 0; i < r; ++i) { if (i) std::cout << " "; std::cout << a[i][j]; }
        std::cout << "\n";
    }`),
    python: py('import sys\ndata = list(map(int, sys.stdin.read().split()))\nr, c = data[:2]\na = [data[2+i*c:2+(i+1)*c] for i in range(r)]\nfor j in range(c):\n    print(" ".join(str(a[i][j]) for i in range(r)))'),
    selfCheck: ['Nêu kích thước đầu ra trước khi chạy.', 'Dùng ca 2×3 để phát hiện nhầm hàng/cột.'],
  },
  {
    lessonSlug: 'strings', suffix: 'transfer', title: 'Đếm nhóm từ giữa các khoảng trắng', kind: 'transfer',
    prompt: 'Đọc một dòng gồm chữ cái ASCII và dấu cách, tối đa 1000 ký tự. Một từ là một đoạn chữ liên tiếp không chứa dấu cách. In số từ; bỏ qua nhiều dấu cách liên tiếp và khoảng trắng ở hai đầu.',
    tests: [{ input: '  learn   code now  \n', output: '3\n' }, { input: '\n', output: '0\n' }, { input: 'one\n', output: '1\n' }, { input: '   \n', output: '0\n' }],
    hints: ['Theo dõi đang ở trong một từ hay ngoài từ.', 'Chỉ tăng khi từ dấu cách chuyển sang chữ.', 'Không đếm số dấu cách rồi cộng 1.'],
    cpp: cpp(String.raw`    std::string s; std::getline(std::cin, s);
    int count = 0; bool inWord = false;
    for (char ch : s) { if (ch == ' ') inWord = false; else if (!inWord) { ++count; inWord = true; } }
    std::cout << count << "\n";`),
    python: py('s = input()\ncount = 0\nin_word = False\nfor ch in s:\n    if ch == " ":\n        in_word = False\n    elif not in_word:\n        count += 1\n        in_word = True\nprint(count)'),
    selfCheck: ['Giải thích lần tăng biến đếm cho từ đầu tiên.', 'Không suy rộng quy tắc ASCII thành tách từ tiếng Việt.'],
  },
  {
    lessonSlug: 'records', suffix: 'transfer', title: 'Hóa đơn có nhiều bản ghi', kind: 'transfer',
    prompt: 'Đọc n (0..1000), rồi n dòng quantity,unitPrice (0..1000 và 0..1000000). In tổng hóa đơn. Biểu diễn mỗi dòng như một mặt hàng; đầu ra lớn nhất có thể tới 10^12.',
    tests: [{ input: '2\n3 12000\n2 5000\n', output: '46000\n' }, { input: '0\n', output: '0\n' }, { input: '2\n0 999\n2 0\n', output: '0\n' }],
    hints: ['Thành tiền từng dòng bằng số lượng nhân đơn giá.', 'Cộng từng thành tiền vào tổng.', 'Đừng chỉ cộng các đơn giá.'],
    cpp: '#include <iostream>\nstruct Item { long long quantity; long long unitPrice; };\nint main() { int n; std::cin >> n; long long total=0; for(int i=0;i<n;++i){Item item; std::cin>>item.quantity>>item.unitPrice; total+=item.quantity*item.unitPrice;} std::cout<<total<<"\\n"; }\n',
    python: py('import sys\ndata = list(map(int, sys.stdin.read().split()))\nn = data[0]\nitems = [{"quantity": data[1+2*i], "unit_price": data[2+2*i]} for i in range(n)]\ntotal = 0\nfor item in items:\n    total += item["quantity"] * item["unit_price"]\nprint(total)'),
    selfCheck: ['Mỗi trường có tên diễn tả ý nghĩa.', 'Giải thích giới hạn 10^12 trước khi chọn kiểu C++.'],
  },
  {
    lessonSlug: 'debugging', suffix: 'transfer', title: 'Phá giả định khởi tạo bằng 0', kind: 'transfer',
    prompt: 'Một chương trình tìm max khởi tạo best=0 nên sai khi toàn bộ dữ liệu âm. Đọc n (1..1000) và n số nguyên, in max. Viết ca tái hiện nhỏ trước khi sửa; dữ liệu mỗi số trong [-1000000,1000000].',
    tests: [{ input: '1\n-1\n', output: '-1\n' }, { input: '3\n-8 -3 -5\n', output: '-3\n' }, { input: '3\n0 2 1\n', output: '2\n' }],
    hints: ['Một phần tử -1 đã đủ tái hiện lỗi.', 'Khởi tạo từ dữ liệu, không từ một giá trị không được bảo đảm thuộc miền.', 'Giữ ca cũ làm kiểm thử hồi quy.'],
    cpp: cpp(String.raw`    int n; std::cin >> n; int best; std::cin >> best;
    for (int i=1; i<n; ++i) { int x; std::cin >> x; if (x>best) best=x; }
    std::cout << best << "\n";`),
    python: py('import sys\ndata = list(map(int, sys.stdin.read().split()))\nn = data[0]\nbest = data[1]\nfor x in data[2:1+n]:\n    if x > best:\n        best = x\nprint(best)'),
    selfCheck: ['Ghi rõ giả thuyết sai là mọi max đều không âm.', 'Sau sửa thử lại dữ liệu dương, toàn âm và một phần tử.'],
  },
  {
    lessonSlug: 'searching', suffix: 'transfer', title: 'Đếm mọi lần xuất hiện', kind: 'transfer',
    prompt: 'Đọc n,target và n số nguyên (0<=n<=1000). In số lần target xuất hiện. Khác bài tìm vị trí đầu, lần này không được dừng ngay khi thấy lần khớp đầu tiên.',
    tests: [{ input: '5 2\n2 1 2 2 3\n', output: '3\n' }, { input: '0 5\n', output: '0\n' }, { input: '3 9\n1 2 3\n', output: '0\n' }],
    hints: ['Tăng bộ đếm mỗi lần khớp.', 'Không dùng break sau lần khớp.', 'Dãy rỗng có 0 lần xuất hiện.'],
    cpp: cpp(String.raw`    int n, target; std::cin >> n >> target; int count=0;
    for(int i=0;i<n;++i){int x;std::cin>>x;if(x==target)++count;}
    std::cout << count << "\n";`),
    python: py('import sys\ndata = list(map(int, sys.stdin.read().split()))\nn, target = data[:2]\ncount = 0\nfor x in data[2:2+n]:\n    if x == target:\n        count += 1\nprint(count)'),
    selfCheck: ['Nêu khác biệt hợp đồng với tìm vị trí đầu.', 'Dùng ca có ít nhất ba lần khớp để phát hiện break sai.'],
  },
  {
    lessonSlug: 'sorting', suffix: 'practice', title: 'Sắp xếp chọn tăng dần', kind: 'primary',
    prompt: 'Đọc n (1..100) và n số nguyên trong [-1000,1000]. In dãy tăng dần không giảm, cách nhau một khoảng trắng. Tự cài sắp xếp chọn để luyện thuật toán; kiểm thử đầu ra không tự chứng minh bạn đã dùng thuật toán nào.',
    tests: [{ input: '5\n3 1 3 -2 0\n', output: '-2 0 1 3 3\n' }, { input: '1\n7\n', output: '7\n' }, { input: '4\n1 2 3 4\n', output: '1 2 3 4\n' }, { input: '3\n9 5 1\n', output: '1 5 9\n' }],
    hints: ['Tại vị trí i, tìm chỉ số nhỏ nhất từ i đến cuối.', 'Đổi chỗ một lần sau khi đã tìm xong.', 'Giữ cả các phần tử trùng, không biến bài thành loại trùng.'],
    cpp: cpp(String.raw`    int n;std::cin>>n;std::vector<int>a(n);for(int &x:a)std::cin>>x;
    for(int i=0;i<n;++i){int best=i;for(int j=i+1;j<n;++j)if(a[j]<a[best])best=j;std::swap(a[i],a[best]);}
    for(int i=0;i<n;++i){if(i)std::cout<<" ";std::cout<<a[i];}std::cout<<"\n";`),
    python: py('import sys\ndata = list(map(int, sys.stdin.read().split()))\nn = data[0]\na = data[1:1+n]\nfor i in range(n):\n    best = i\n    for j in range(i+1, n):\n        if a[j] < a[best]:\n            best = j\n    a[i], a[best] = a[best], a[i]\nprint(" ".join(map(str, a)))'),
    selfCheck: ['Giải thích đoạn đầu đã được đặt đúng sau mỗi lượt.', 'Mô phỏng số so sánh 3+2+1 cho n=4.', 'Nêu việc dùng thư viện không được kết luận từ đầu ra.'],
  },
  {
    lessonSlug: 'sorting', suffix: 'transfer', title: 'Đếm giá trị khác nhau sau khi sắp', kind: 'transfer',
    prompt: 'Đọc n (0..1000) và n số nguyên. In số giá trị khác nhau. Sau khi sắp tăng, các phần tử bằng nhau nằm liền nhau; đếm lần chuyển giá trị. Có thể dùng thư viện sắp xếp trong bài chuyển giao này.',
    tests: [{ input: '5\n3 1 3 -2 1\n', output: '3\n' }, { input: '0\n', output: '0\n' }, { input: '4\n7 7 7 7\n', output: '1\n' }, { input: '3\n1 2 3\n', output: '3\n' }],
    hints: ['Nếu rỗng, kết quả 0.', 'Với dãy không rỗng đã sắp, bắt đầu đếm 1.', 'Tăng khi phần tử hiện tại khác phần tử trước.'],
    cpp: cpp(String.raw`    int n;std::cin>>n;std::vector<int>a(n);for(int &x:a)std::cin>>x;
    std::sort(a.begin(),a.end());int count=n?1:0;
    for(int i=1;i<n;++i)if(a[i]!=a[i-1])++count;
    std::cout<<count<<"\n";`),
    python: py('import sys\ndata = list(map(int, sys.stdin.read().split()))\nn = data[0]\na = sorted(data[1:1+n])\ncount = 1 if n else 0\nfor i in range(1, n):\n    if a[i] != a[i-1]:\n        count += 1\nprint(count)'),
    selfCheck: ['Chứng minh bằng ví dụ tại sao cần sắp trước khi so liền kề.', 'Phân biệt số giá trị khác nhau với số phần tử.'],
  },
  {
    lessonSlug: 'testing', suffix: 'transfer', title: 'Bộ ca phá lỗi hai đầu khoảng', kind: 'transfer',
    prompt: 'Đọc x nguyên trong [-1000,1000]. In IN nếu 10<=x<=20, còn lại OUT. Trước khi chạy, lập bộ ca phân biệt lời giải đúng với lỗi dùng dấu > hoặc < ở mỗi đầu.',
    tests: [{ input: '9\n', output: 'OUT\n' }, { input: '10\n', output: 'IN\n' }, { input: '15\n', output: 'IN\n' }, { input: '20\n', output: 'IN\n' }, { input: '21\n', output: 'OUT\n' }],
    hints: ['Hai biên đều bao gồm dấu bằng.', 'Cần AND giữa hai điều kiện.', '9,10,20,21 giúp kiểm tra ngay ngoài và đúng biên.'],
    cpp: cpp(String.raw`    int x;std::cin>>x;std::cout<<((x>=10&&x<=20)?"IN":"OUT")<<"\n";`),
    python: py('x = int(input())\nprint("IN" if 10 <= x <= 20 else "OUT")'),
    selfCheck: ['Ghi ca nào phá lỗi x>10 và ca nào phá x<20.', 'Không chỉ thử một giá trị giữa khoảng.'],
  },
  {
    lessonSlug: 'budget-project', suffix: 'stage-total', title: 'Mốc 1 · Tổng chi và số dư', kind: 'integration',
    prompt: 'Đọc budget (0..10^9), n (0..1000), rồi n khoản chi (0..10^6). In một dòng gồm tổng chi và số dư, cách nhau một khoảng trắng. Số dư âm được giữ nguyên. Tách hàm tổng chi và chuẩn bị ca rỗng.',
    tests: [{ input: '500000 3\n120000 80000 50000\n', output: '250000 250000\n' }, { input: '100000 0\n', output: '0 100000\n' }, { input: '100000 1\n120000\n', output: '120000 -20000\n' }],
    hints: ['Số dư bằng budget-total.', 'Tổng của dãy rỗng bằng 0.', 'Bộ chấm kiểm tra đầu ra; tự đối chiếu việc tách hàm.'],
    cpp: '#include <iostream>\n#include <vector>\nlong long total_cost(const std::vector<long long>& a){long long total=0;for(long long x:a)total+=x;return total;}\nint main(){long long budget;int n;std::cin>>budget>>n;std::vector<long long>a(n);for(auto &x:a)std::cin>>x;auto total=total_cost(a);std::cout<<total<<" "<<budget-total<<"\\n";}\n',
    python: py('import sys\ndef total_cost(costs):\n    total = 0\n    for cost in costs:\n        total += cost\n    return total\ndata = list(map(int, sys.stdin.read().split()))\nbudget, n = data[:2]\ntotal = total_cost(data[2:2+n])\nprint(total, budget-total)'),
    selfCheck: ['Có hợp đồng dữ liệu và hàm tổng chi riêng.', 'Tự thử rỗng, vượt ngân sách và khoản 0.'],
  },
  {
    lessonSlug: 'budget-project', suffix: 'stage-summary', title: 'Mốc 2 · Khoản lớn nhất và vị trí đầu', kind: 'integration',
    prompt: 'Đọc budget,n và n khoản chi như mốc 1. In total remaining largest firstIndex. Nếu n=0, largest=0 và firstIndex=-1. Nếu nhiều khoản cùng lớn nhất, chọn chỉ số từ 0 của lần đầu tiên.',
    tests: [{ input: '500000 3\n120000 80000 50000\n', output: '250000 250000 120000 0\n' }, { input: '10 3\n4 4 2\n', output: '10 0 4 0\n' }, { input: '100 0\n', output: '0 100 0 -1\n' }, { input: '0 2\n0 0\n', output: '0 0 0 0\n' }],
    hints: ['Khởi tạo vị trí -1 khi chưa có khoản nào.', 'Đổi max khi lớn hơn nghiêm ngặt, không khi bằng.', 'Xử lý phần tử đầu hoặc vị trí chưa thiết lập.'],
    cpp: cpp(String.raw`    long long budget,total=0,largest=0;int n,index=-1;std::cin>>budget>>n;
    for(int i=0;i<n;++i){long long cost;std::cin>>cost;total+=cost;if(index==-1||cost>largest){largest=cost;index=i;}}
    std::cout<<total<<" "<<budget-total<<" "<<largest<<" "<<index<<"\n";`),
    python: py('import sys\ndata = list(map(int, sys.stdin.read().split()))\nbudget, n = data[:2]\ntotal = 0\nlargest = 0\nposition = -1\nfor i, cost in enumerate(data[2:2+n]):\n    total += cost\n    if position == -1 or cost > largest:\n        largest = cost\n        position = i\nprint(total, budget-total, largest, position)'),
    selfCheck: ['Có ca max bị lặp và n=0.', 'Giải thích vì sao dùng > thay vì >=.'],
  },
  {
    lessonSlug: 'budget-project', suffix: 'stage-categories', title: 'Mốc 3 · Phân loại và báo cáo', kind: 'integration',
    prompt: 'Đọc budget (0..10^9), n (0..1000), rồi n cặp category,cost. category là 0=ăn, 1=đi lại, 2=học tập; cost từ 0..10^6. In dòng 1 gồm tổng ba nhóm theo thứ tự 0,1,2; dòng 2 là số dư. Giữ số dư âm và ghi 0 cho nhóm không có khoản chi.',
    tests: [{ input: '500000 4\n0 120000\n1 20000\n1 10000\n2 50000\n', output: '120000 30000 50000\n300000\n' }, { input: '100 0\n', output: '0 0 0\n100\n' }, { input: '10 2\n2 20\n0 0\n', output: '0 0 20\n-10\n' }, { input: '0 3\n0 0\n1 0\n2 0\n', output: '0 0 0\n0\n' }],
    hints: ['Dùng dãy ba tổng khởi tạo 0.', 'Mỗi bản ghi chỉ cộng vào đúng nhóm.', 'Số dư bằng ngân sách trừ tổng của cả ba nhóm.'],
    cpp: cpp(String.raw`    long long budget;int n;std::cin>>budget>>n;std::vector<long long> totals(3,0);
    for(int i=0;i<n;++i){int category;long long cost;std::cin>>category>>cost;totals[category]+=cost;}
    std::cout<<totals[0]<<" "<<totals[1]<<" "<<totals[2]<<"\n";
    std::cout<<budget-totals[0]-totals[1]-totals[2]<<"\n";`),
    python: py('import sys\ndata = list(map(int, sys.stdin.read().split()))\nbudget, n = data[:2]\ntotals = [0, 0, 0]\nfor i in range(n):\n    category, cost = data[2+2*i:4+2*i]\n    totals[category] += cost\nprint(*totals)\nprint(budget-sum(totals))'),
    selfCheck: ['Tên hàm/biến phản ánh dữ liệu.', 'Có sơ đồ dữ liệu, bảng ca thử và nhật ký sửa lỗi.', 'Giải thích giới hạn của mô hình ba nhóm và nguồn trợ giúp.'],
  },
];
