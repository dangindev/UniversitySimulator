import type { LearningTrack, Lesson, LessonTrace } from './types.ts';

interface Tools {
  detail: string;
  trace: LessonTrace;
  commonMistakes: { mistake: string; why: string; fix: string }[];
  reflection: { prompt: string; criteria: string[]; sampleAnswer: string };
  cpp: string;
  python: string;
}

export const introLearningTools: Record<string, Tools> = {
  'algorithm-planning': {
    detail: 'Một đặc tả tốt phân biệt dữ liệu đã được bảo đảm với dữ liệu cần tự xử lý. Bài hình chữ nhật bảo đảm cạnh dương; không cần tự tạo một nhánh báo lỗi ngoài hợp đồng. Nhưng cần chọn kiểu chứa kết quả lớn nhất. Viết ví dụ đúng và ví dụ phá công thức nhầm trước giúp tránh viết mã theo cảm giác.',
    trace: { title: 'Phân biệt hai đại lượng', columns: ['Đầu vào a,b', 'Tổng hai cạnh', 'Chu vi', 'Diện tích'], rows: [['3,5', '8', '16', '15'], ['1,1', '2', '4', '1'], ['10,2', '12', '24', '20']], explanation: 'Mỗi cột trả lời một câu hỏi khác. Chọn đúng đại lượng đầu ra trước khi chọn phép toán.' },
    commonMistakes: [{ mistake: 'Bắt đầu viết mã khi chưa xác định cần chu vi hay diện tích.', why: 'Hai công thức dùng cùng dữ liệu nên mã vẫn chạy nhưng trả sai đại lượng.', fix: 'Gạch chân tên kết quả và tính một ca bằng tay.' }, { mistake: 'Chỉ thử trường hợp quá đặc biệt.', why: 'Một số công thức sai có thể trùng kết quả ở một vài đầu vào.', fix: 'Thử cạnh 3 và 5, cạnh 1 và 1, cùng giới hạn lớn.' }],
    reflection: { prompt: 'Giải thích cách đổi giả mã chu vi thành giả mã diện tích mà không viết lại mọi bước.', criteria: ['Giữ bước đọc và xuất.', 'Thay đúng công thức.', 'Nêu đơn vị đầu ra và một ca phân biệt.'], sampleAnswer: 'Giữ đọc a,b và in một số; thay 2*(a+b) bằng a*b. Với 3,5, chu vi 16 còn diện tích 15. Diện tích có đơn vị bình phương.' },
    cpp: 'Mã minh họa dùng long long vì bài chuyển giao có thể tạo tích 10^12. Cú pháp nhập/xuất được giải thích ở bài kế tiếp; có thể hoàn thành giả mã trước rồi quay lại phần mã.',
    python: 'Phần giả mã không phụ thuộc Python. Sau khi học input và int, ánh xạ từng bước sang lệnh tương ứng; không dùng khả năng số nguyên lớn để bỏ qua suy nghĩ về miền dữ liệu.',
  },
  'input-output': {
    detail: 'Hợp đồng nhập/xuất là một phần của lời giải. Một bộ chấm stdin/stdout gửi dữ liệu theo đặc tả; chương trình không nên in câu nhắc hoặc nhận xét ngoài kết quả. Các số có thể được ngăn bởi dấu cách hoặc xuống dòng. Bài chuyển giao cố ý dùng nhiều dòng để bạn tách khái niệm token khỏi khái niệm một dòng.',
    trace: { title: 'Theo dõi hai token và một kết quả', columns: ['Bước', 'a', 'b', 'Đầu ra'], rows: [['Đọc token 7', '7', 'chưa đọc', ''], ['Đọc token 5', '7', '5', ''], ['Tính và in a+b', '7', '5', '12']], explanation: 'Chỉ bước xuất mới ghi lên stdout. Tên biến giữ vai trò dữ liệu; chúng không tự xuất hiện trong kết quả.' },
    commonMistakes: [{ mistake: 'Cộng hai chuỗi thay vì hai số.', why: 'Dữ liệu văn bản có thể được nối thành 75 thay vì cộng thành 12.', fix: 'Xác định kiểu số và chuyển dữ liệu nhập trước khi tính.' }, { mistake: 'In cả “Kết quả là”.', why: 'Thông điệp người đọc hiểu được nhưng không khớp hợp đồng bộ chấm.', fix: 'Chỉ in đúng giá trị và dấu ngăn được yêu cầu.' }],
    reflection: { prompt: 'Vì sao đầu vào ba số trên ba dòng vẫn có thể xử lý như ba token?', criteria: ['Phân biệt khoảng trắng phân tách với dữ liệu.', 'Nêu thứ tự đọc ba số.', 'Không giả định thứ tự xuất giống thứ tự đọc.'], sampleAnswer: 'Token hóa theo khoảng trắng giữ ba giá trị theo thứ tự, dù có dấu cách hay xuống dòng. Đọc a,b,c rồi có thể in c,b,a theo đề.' },
    cpp: 'std::cin >> a bỏ qua khoảng trắng trước token số, kể cả xuống dòng. Kiểm tra thất bại khi đọc dữ liệu thuộc phần xử lý đầu vào nâng cao; các bài này bảo đảm số token hợp lệ.',
    python: 'input().split() đọc một dòng. Với số token trải nhiều dòng, dùng import sys rồi values = list(map(int, sys.stdin.read().split())). Sau đó lấy các giá trị theo vị trí; điều kiện kiểm tra số lượng vẫn theo hợp đồng bài.',
  },
  'variables-types': {
    detail: 'Thương và dư giải quyết hai nhu cầu khác nhau: đếm nhóm đầy và biết phần chưa ghép nhóm. Muốn chứa tất cả còn cần tính hộp chưa đầy. Không thay chia nguyên bằng chia thực rồi làm tròn tùy ý, vì quy tắc làm tròn phải xuất phát từ ý nghĩa bài toán.',
    trace: { title: 'Hộp đầy và hộp cần dùng', columns: ['n', 'k', 'Thương nguyên', 'Dư', 'Hộp chứa tất cả'], rows: [['17', '5', '3', '2', '4'], ['20', '5', '4', '0', '4'], ['0', '7', '0', '0', '0'], ['3', '10', '0', '3', '1']], explanation: 'Chỉ trường hợp dư khác 0 mới cần hộp chưa đầy. Bài cho n không âm và k dương.' },
    commonMistakes: [{ mistake: 'Cộng thêm một hộp cả khi chia hết.', why: 'Trường hợp n=20,k=5 đã vừa đủ bốn hộp.', fix: 'Kiểm tra dư hoặc dùng công thức đã chứng minh cho n>=0.' }, { mistake: 'Dùng công thức ngoài miền đã cho.', why: 'Chia nguyên số âm khác quy tắc giữa hai ngôn ngữ.', fix: 'Đọc ràng buộc trước khi tái sử dụng công thức.' }],
    reflection: { prompt: 'Giải thích vì sao n=0 cần 0 hộp, nhưng n=3,k=10 cần 1 hộp.', criteria: ['Nêu sự tồn tại của sản phẩm.', 'Phân biệt hộp đầy với hộp sử dụng.', 'Có trường hợp chia hết để đối chiếu.'], sampleAnswer: 'Không có sản phẩm thì không cần hộp. Ba sản phẩm chưa tạo hộp đầy nhưng vẫn cần một hộp để chứa. Với 20/5, bốn hộp đã đủ.' },
    cpp: 'Với số nguyên không âm, / cho thương nguyên và % cho dư. Dùng long long khi tích hoặc tổng có thể vượt int; kiểu của toán hạng ảnh hưởng phép tính trước khi gán kết quả.',
    python: 'Dùng // cho thương nguyên và % cho dư. / cho số thực. int(input()) đọc số nguyên, còn input() đơn thuần trả chuỗi.',
  },
  conditions: {
    detail: 'Điều kiện phải khớp câu chữ “ít nhất”, “lớn hơn” hoặc “không vượt”. Ba ca ngay dưới, bằng và trên ngưỡng phát hiện nhiều lỗi dấu bằng. Khi so sánh hai giá trị, hãy xác định trường hợp bằng nhau trước khi quyết định số nhánh cần viết.',
    trace: { title: 'Ba ca quanh ngưỡng 18', columns: ['age', 'age>=18', 'Nhánh', 'Đầu ra'], rows: [['17', 'sai', 'else', 'NO'], ['18', 'đúng', 'if', 'YES'], ['19', 'đúng', 'if', 'YES']], explanation: 'Điểm 18 phân biệt >= với >; 17 và 19 không đủ phát hiện lỗi này nếu đứng riêng.' },
    commonMistakes: [{ mistake: 'Dùng > cho câu “ít nhất”.', why: 'Bỏ mất đúng giá trị ngưỡng.', fix: 'Thêm ca bằng ngưỡng và giải thích dấu bằng bằng lời.' }, { mistake: 'Khởi tạo max bằng 0 cho mọi dữ liệu.', why: 'Nếu cả hai số âm, 0 không phải một trong hai giá trị cần chọn.', fix: 'Chọn từ a hoặc b theo điều kiện so sánh.' }],
    reflection: { prompt: 'Hai số bằng nhau thì bài chọn số lớn hơn nên xuất mấy giá trị?', criteria: ['Xuất một giá trị chung.', 'Giải thích một đường rẽ nhánh cụ thể.', 'Không in hai dòng chỉ vì hai điều kiện cùng đúng.'], sampleAnswer: 'Xuất một giá trị. Dùng if a>=b thì in a, else in b; ở a=b, nhánh đầu đã xử lý xong.' },
    cpp: 'Dùng dấu ngoặc nhọn khi nhóm nhiều lệnh. Hai if độc lập khác một chuỗi if/else; hãy kiểm tra bạn có thể đi qua cả hai if hay chỉ một nhánh.',
    python: 'Thụt dòng xác định khối if và else. Dùng cùng mức thụt cho hai nhánh; một lệnh lệch ra ngoài khối có thể chạy trong mọi trường hợp.',
  },
  'boolean-logic': {
    detail: 'Chuyển câu có “đồng thời” hoặc “một trong hai” thành bảng chân trị trước khi viết mã. Đừng kiểm tra chỉ trường hợp cả hai đều đúng: cả AND và OR đều trả đúng ở đó. Ca chỉ một vế đúng mới phân biệt hai phép.',
    trace: { title: 'Bảng chân trị AND và OR', columns: ['A', 'B', 'A AND B', 'A OR B'], rows: [['sai', 'sai', 'sai', 'sai'], ['sai', 'đúng', 'sai', 'đúng'], ['đúng', 'sai', 'sai', 'đúng'], ['đúng', 'đúng', 'đúng', 'đúng']], explanation: 'AND cần cả hai, OR cần ít nhất một. Dùng bảng này để chọn ca thử có khả năng phân biệt.' },
    commonMistakes: [{ mistake: 'Dùng OR cho khoảng từ 10 đến 20.', why: 'Một số ngoài khoảng vẫn có thể thỏa một trong hai vế.', fix: 'Viết x>=10 AND x<=20 và thử 9,21.' }, { mistake: 'Chỉ thử lúc cả hai tiêu chí đều đạt.', why: 'Không phân biệt được quy tắc một hoặc hai tiêu chí.', fix: 'Thêm hai ca chỉ một vế đúng.' }],
    reflection: { prompt: 'Tìm một đầu vào làm hai quy tắc AND và OR cho kết quả khác nhau.', criteria: ['Có đúng một vế đúng.', 'Nêu kết quả của cả hai quy tắc.', 'Giải thích theo ý nghĩa bài.'], sampleAnswer: 'score=8, volunteer=0: vế điểm đúng, vế tình nguyện sai; OR đạt còn AND không đạt.' },
    cpp: 'Dùng && và || cho phép logic. Không viết 10<=x<=20 trong C++: hãy tách thành x>=10 && x<=20 để so sánh x ở cả hai vế.',
    python: 'Dùng and và or; Python cũng hỗ trợ chuỗi so sánh 10<=x<=20. Đọc rõ ý nghĩa thay vì mang nguyên cú pháp này sang C++.',
  },
  loops: {
    detail: 'Tổng tích lũy và bộ đếm là hai vai trò khác nhau: count tăng 1 cho mỗi phần tử đạt, total tăng bằng giá trị cần cộng. Trước khi chạy, ghi trạng thái ban đầu và một hàng cho mỗi lượt; số hàng giúp kiểm tra cận vòng lặp.',
    trace: { title: 'Tổng 1 đến 4', columns: ['i', 'total trước', 'Phép cộng', 'total sau'], rows: [['1', '0', '+1', '1'], ['2', '1', '+2', '3'], ['3', '3', '+3', '6'], ['4', '6', '+4', '10']], explanation: 'Với n=0, không có hàng xử lý và total giữ 0. Đừng cộng lại giá trị khởi tạo.' },
    commonMistakes: [{ mistake: 'Khởi tạo total=1 rồi vẫn cộng từ 1.', why: 'Giá trị 1 bị tính hai lần.', fix: 'Dùng phần tử trung hòa 0 cho tổng.' }, { mistake: 'Cộng 1 khi cần cộng i.', why: 'Chương trình đếm số lượt thay vì tính tổng giá trị.', fix: 'Đặt tên biến theo ý nghĩa và viết tổng tay n=4.' }],
    reflection: { prompt: 'Vì sao tổng các bội của 3 tới n=8 bằng 9, không phải 2?', criteria: ['Liệt kê 3 và 6.', 'Phân biệt tổng và số lượng.', 'Nêu điều kiện lọc trước phép cộng.'], sampleAnswer: 'Có hai bội là 3 và 6. Số lượng là 2 nhưng tổng là 3+6=9; chỉ cộng khi i chia hết cho 3.' },
    cpp: 'for(int i=1;i<=n;++i) chứa n nếu n>=1. Tổng tới 100000 là 5000050000 nên biến total phải đủ lớn.',
    python: 'range(1,n+1) không chứa n+1 nhưng chứa n. Dùng += i cho tổng; +=1 tạo bộ đếm.',
  },
  'while-sentinel': {
    detail: 'Phân biệt kiểm tra trước và kiểm tra sau khi xử lý. Nếu 0 là dấu kết thúc, phải dừng trước phần xử lý dữ liệu của lượt đó. Một vòng lặp cần lập luận tiến triển: chỉ số tăng trong dãy hữu hạn, hoặc số nguyên không âm giảm qua phép chia nguyên.',
    trace: { title: 'Dừng trước số 0 đầu tiên', columns: ['Giá trị đang xét', 'Có tiếp tục?', 'Tổng sau', 'Hành động'], rows: [['5', 'có', '5', 'cộng và chuyển tiếp'], ['-2', 'có', '3', 'cộng và chuyển tiếp'], ['0', 'không', '3', 'dừng'], ['999', 'không xét', '3', 'bỏ qua sau dấu kết thúc']], explanation: 'Đọc xong toàn bộ token vào bộ nhớ không có nghĩa phải xử lý mọi token.' },
    commonMistakes: [{ mistake: 'Không đổi x hoặc chỉ số trong vòng while.', why: 'Điều kiện có thể giữ đúng mãi.', fix: 'Đánh dấu rõ dòng đọc tiếp hoặc tăng chỉ số.' }, { mistake: 'Đếm chữ số của 0 thành 0.', why: 'Vòng n>0 không chạy cho n=0.', fix: 'Đặt trường hợp 0 có một chữ số trước vòng lặp.' }],
    reflection: { prompt: 'Dùng n=1200 để giải thích tại sao vòng đếm chữ số kết thúc.', criteria: ['Nêu chuỗi 1200,120,12,1,0.', 'Mỗi bước dùng chia nguyên 10.', 'Điều kiện cuối cùng trở thành sai.'], sampleAnswer: 'Mỗi lượt bỏ một chữ số, n không âm giảm dần; sau bốn lượt n=0 nên n>0 sai và vòng dừng.' },
    cpp: 'Điều kiện std::cin>>x && x!=0 đọc số mới trước khi kiểm tra. Bài có dấu kết thúc; nếu đọc thất bại, điều kiện cũng dừng thay vì dùng lại dữ liệu cũ.',
    python: 'Trong dãy token đã đọc, dùng i<len(values) and values[i]!=0. Tăng i sau khi xử lý; điều kiện độ dài đứng trước truy cập phần tử.',
  },
  'nested-loops': {
    detail: 'Đặt biến ở đúng phạm vi: bộ đếm tổng nằm ngoài cả hai vòng, còn dữ liệu của từng hàng có thể khởi tạo trong vòng ngoài. Khi xuất bảng, vị trí lệnh xuống dòng quyết định hình dạng kết quả. Đếm lượt trên một bảng 2×3 dễ kiểm chứng hơn nhìn mã dài.',
    trace: { title: 'Đếm sáu ô của bảng 2×3', columns: ['Hàng i', 'Cột j', 'count trước', 'count sau'], rows: [['0', '0', '0', '1'], ['0', '1', '1', '2'], ['0', '2', '2', '3'], ['1', '0', '3', '4'], ['1', '1', '4', '5'], ['1', '2', '5', '6']], explanation: 'Vòng trong chạy lại từ cột 0 cho mỗi hàng; toàn bộ có r*c lượt.' },
    commonMistakes: [{ mistake: 'Cộng r+c để đếm ô.', why: 'Mỗi hàng có c ô nên hai số lượt cần nhân.', fix: 'Vẽ bảng 2×3 rồi đếm sáu ô.' }, { mistake: 'Xuống dòng trong vòng cột.', why: 'Mỗi ô sẽ thành một dòng, không còn bảng.', fix: 'Xuống dòng sau khi đã xuất xong các cột của hàng.' }],
    reflection: { prompt: 'So sánh hai vòng lặp nối tiếp r và c lượt với hai vòng lặp lồng r×c.', criteria: ['Nối tiếp có r+c lượt thao tác tương ứng.', 'Lồng có r*c thao tác trong cùng.', 'Đưa ví dụ r=2,c=3.'], sampleAnswer: 'Hai vòng nối tiếp có 2+3=5 lượt; lồng nhau có 2*3=6 ô vì mỗi lượt ngoài chạy trọn ba lượt trong.' },
    cpp: 'Dùng hai tên biến i,j riêng. Vòng trong cần khởi tạo lại j mỗi lượt ngoài; bộ đếm toàn bộ không khởi tạo lại bên trong.',
    python: 'Khối thụt dòng giúp nhìn vòng nào chứa vòng nào. print dòng kết quả nằm trong vòng ngoài nhưng ngoài vòng trong.',
  },
  functions: {
    detail: 'Tách hàm giúp đặt tên một hợp đồng nhỏ và thử độc lập. Tham số là dữ liệu người gọi cung cấp; return đưa kết quả lại người gọi. Một hàm in được kết quả nhưng không return không tự tạo giá trị để cộng tiếp. Kiểm thử stdout không tự xác minh bạn đã tách hàm; hãy tự đối chiếu cấu trúc mã.',
    trace: { title: 'Theo vết gọi square(-4)', columns: ['Bước', 'Dữ liệu', 'Kết quả'], rows: [['Người gọi có n', '-4', 'chưa tính'], ['Tham số x nhận n', '-4', 'x*x=16'], ['return', '16', 'người gọi nhận 16'], ['print/cout', '16', 'stdout có 16']], explanation: 'Giá trị trả về và thao tác in là hai bước khác nhau.' },
    commonMistakes: [{ mistake: 'Chỉ in trong hàm rồi cộng kết quả gọi hàm.', why: 'Giá trị cần tính không được trả về cho người gọi.', fix: 'Return giá trị, để phần chính chịu trách nhiệm in.' }, { mistake: 'Hàm luôn đọc bàn phím dù đã có tham số.', why: 'Mỗi lần kiểm thử buộc phải giả lập I/O và khó tái sử dụng.', fix: 'Giữ hàm tính toán nhận dữ liệu trực tiếp.' }],
    reflection: { prompt: 'Viết hợp đồng cho absolute_value mà không nhắc đến bàn phím.', criteria: ['Tham số là x trong miền đã cho.', 'Kết quả không âm bằng độ lớn x.', 'Không thay đổi dữ liệu bên ngoài.'], sampleAnswer: 'Nhận x nguyên trong [-10^6,10^6], trả x nếu x>=0 và -x nếu x<0. Hàm không đọc, in hoặc sửa trạng thái bên ngoài.' },
    cpp: 'Kiểu trả về và kiểu tham số thuộc chữ ký hàm. Hàm square dùng long long cho x*x trong miền bài; return kết quả ở các nhánh cần thiết.',
    python: 'Hàm không có return giá trị sẽ trả None. Đừng nhầm việc thấy chữ trên màn hình với việc người gọi nhận được một số.',
  },
  sequences: {
    detail: 'Một dãy vừa có giá trị vừa có thứ tự. Nếu dùng chỉ số, miền hợp lệ phụ thuộc số phần tử thật, không phụ thuộc kích thước bạn mong muốn. Các phép toán trên dãy rỗng cần hợp đồng riêng: tổng bằng 0, nhưng max của dãy rỗng không được tự suy ra là 0.',
    trace: { title: 'Đếm số dương', columns: ['Giá trị', 'Lớn hơn 0?', 'count sau'], rows: [['2', 'đúng', '1'], ['-1', 'sai', '1'], ['0', 'sai', '1'], ['7', 'đúng', '2'], ['-4', 'sai', '2']], explanation: '0 không thuộc lớp số dương. Đếm số phần tử, không cộng các giá trị dương.' },
    commonMistakes: [{ mistake: 'Duyệt cả chỉ số n.', why: 'Dãy n phần tử chỉ có các chỉ số từ 0 đến n-1.', fix: 'Viết miền chỉ số và thử n=1.' }, { mistake: 'Lấy phần tử đầu của dãy có thể rỗng.', why: 'Không có phần tử để khởi tạo.', fix: 'Phân biệt hợp đồng n>=1 của bài max với n>=0 của bài đếm.' }],
    reflection: { prompt: 'Vì sao hai bài đếm dương và tìm max cần xử lý rỗng khác nhau?', criteria: ['Đếm rỗng bằng 0.', 'Max cần phần tử hoặc quy ước riêng.', 'Không thêm số không có trong dữ liệu.'], sampleAnswer: 'Đếm không có phần tử đạt là 0. Max cần một ứng viên từ dữ liệu; bài hiện bảo đảm không rỗng, nên không được tự chèn 0.' },
    cpp: 'vector có n phần tử được truy cập trong miền 0..n-1. Trong vòng nhập for(int &x: values), dấu & cho phép ghi vào phần tử thật thay vì bản sao.',
    python: 'Chỉ số -1 có nghĩa phần tử cuối nếu list không rỗng; nó không tương đương lỗi ngoài biên theo ý định thuật toán. Giữ quy ước 0..n-1 rõ ràng trước khi dùng chỉ số âm.',
  },
  'matrix-data': {
    detail: 'Dữ liệu bảng có hai chỉ số nhưng vẫn là một số hữu hạn các giá trị. Hợp đồng đọc theo hàng cho phép ánh xạ vị trí phẳng k thành hàng k//c và cột k%c. Chuyển vị cần thay cả thứ tự lặp và kích thước; chỉ đổi nhãn r,c không tự đổi dữ liệu.',
    trace: { title: 'Tổng được đặt lại mỗi hàng', columns: ['Hàng', 'Các giá trị', 'total ban đầu', 'total cuối'], rows: [['0', '1,2,3', '0', '6'], ['1', '4,5,6', '0', '15']], explanation: 'Nếu không đặt lại tổng, hàng thứ hai sai thành 21 thay vì 15.' },
    commonMistakes: [{ mistake: 'Giữ tổng của hàng trước.', why: 'Kết quả trở thành tổng tích lũy nhiều hàng.', fix: 'Đặt total=0 trong vòng ngoài trước khi duyệt cột.' }, { mistake: 'Thử chuyển vị chỉ với bảng vuông.', why: 'Nhầm số hàng/cột có thể chưa lộ kích thước sai.', fix: 'Thêm ca 2×3 và 1×3.' }],
    reflection: { prompt: 'Vì sao bài tổng hàng có thể xử lý lần lượt, nhưng chuyển vị cần lưu?', criteria: ['Tổng hàng chỉ cần tổng hiện tại.', 'Chuyển vị cần các giá trị cách nhau theo hàng gốc.', 'Nêu kích thước đầu ra c×r.'], sampleAnswer: 'Khi đọc xong một hàng có thể in tổng rồi bỏ dữ liệu hàng. Chuyển vị cần lấy cùng cột từ nhiều hàng sau đó, nên phải giữ các giá trị; đầu ra có c hàng r cột.' },
    cpp: 'vector<vector<int>>(r,vector<int>(c)) tạo r dãy con. Kiểm tra a[i][j] dùng đúng i<r và j<c, kể cả khi r khác c.',
    python: 'Tránh dùng [[0]*c]*r rồi sửa ô nếu mong các hàng độc lập: các hàng chia sẻ cùng list. Dùng một list mới cho mỗi hàng hoặc cắt dữ liệu nhập theo từng hàng như ví dụ.',
  },
  strings: {
    detail: 'Đọc cả dòng khác đọc một token. Đếm nguyên âm cần kiểm tra từng ký tự, còn đếm từ cần theo dõi chuyển trạng thái ngoài từ sang trong từ. Đếm số dấu cách rồi cộng 1 sai khi rỗng, có nhiều dấu cách hoặc có dấu cách ở hai đầu.',
    trace: { title: 'Đếm nguyên âm trong school', columns: ['Ký tự', 'Thuộc aeiou?', 'count sau'], rows: [['s', 'không', '0'], ['c', 'không', '0'], ['h', 'không', '0'], ['o', 'có', '1'], ['o', 'có', '2'], ['l', 'không', '2']], explanation: 'Mỗi lần xuất hiện được đếm riêng; không chỉ đếm số loại nguyên âm khác nhau.' },
    commonMistakes: [{ mistake: 'Chỉ đọc tới dấu cách đầu tiên.', why: 'Mất dữ liệu sau đó dù hợp đồng cho cả dòng.', fix: 'Dùng cách đọc cả dòng cho bài này.' }, { mistake: 'Cho rằng quy tắc từng ký tự ASCII là xử lý tiếng Việt đầy đủ.', why: 'Biểu diễn Unicode và tách từ cần quy tắc khác.', fix: 'Giữ giới hạn ASCII được nêu, nêu rõ khi muốn mở rộng.' }],
    reflection: { prompt: 'Đưa một dòng làm cách đếm dấu cách cộng 1 bị sai.', criteria: ['Có rỗng hoặc nhiều dấu cách.', 'Nêu kết quả đúng.', 'Giải thích bằng trạng thái trong/ngoài từ.'], sampleAnswer: '“  one   two  ” có hai từ nhưng nhiều dấu cách. Chỉ tăng khi đang ngoài từ và gặp chữ, không tăng ở mỗi dấu cách.' },
    cpp: 'std::getline đọc cả dòng. Sau khi dùng >> rồi đổi sang getline trong cùng chương trình, cần xử lý ký tự xuống dòng còn lại; các bài chuỗi hiện đọc một dòng ngay từ đầu để tách hai vấn đề.',
    python: 'input() bỏ ký tự xuống dòng kết thúc, giữ các khoảng trắng khác. Không gọi strip trước khi hiểu nó có làm thay đổi dữ liệu cần xét hay không.',
  },
  records: {
    detail: 'Bản ghi gom các trường có liên hệ, còn dãy gom nhiều đối tượng cùng vai trò. Khi cộng hóa đơn, cần tính quantity*unitPrice cho từng mặt hàng rồi cộng. Đặt tên trường thay cho vị trí khó nhớ giúp tự kiểm tra công thức, nhưng không tự bảo đảm dữ liệu luôn hợp lệ.',
    trace: { title: 'Hóa đơn hai mặt hàng', columns: ['Mặt hàng', 'Số lượng', 'Đơn giá', 'Thành tiền', 'Tổng sau'], rows: [['0', '3', '12000', '36000', '36000'], ['1', '2', '5000', '10000', '46000']], explanation: 'Không cộng số lượng với đơn giá; chúng có đơn vị khác nhau.' },
    commonMistakes: [{ mistake: 'Chỉ cộng đơn giá mỗi dòng.', why: 'Bỏ số lượng nên sai khi quantity khác 1.', fix: 'Tính thành tiền từng bản ghi trước khi cộng.' }, { mistake: 'Nhầm thứ tự trường khi đọc.', why: 'quantity và unitPrice đều là số nên chương trình vẫn chạy.', fix: 'Đặt tên trường rõ và dùng ca có hai giá trị rất khác nhau.' }],
    reflection: { prompt: 'Vì sao một bản ghi có tên trường giúp đọc công thức nhưng chưa đủ để kiểm chứng?', criteria: ['Tên thể hiện ý nghĩa.', 'Vẫn cần hợp đồng và kiểm thử.', 'Có ca quantity=0 hoặc nhiều hơn 1.'], sampleAnswer: 'item.quantity*item.unitPrice dễ hiểu hơn hai vị trí số, nhưng vẫn có thể đọc nhầm trường; ca số lượng 0 và 3 kiểm tra tác dụng của quantity.' },
    cpp: 'struct mô tả các trường. Khi cộng tối đa 1000 mặt hàng, mỗi thành tiền tới 10^9, tổng cần chứa tới 10^12.',
    python: 'dict dùng khóa có tên cho bản ghi. Kiểm tra viết đúng tên khóa; dùng số nguyên đồng cho bài này, không đưa số thực không cần thiết vào phép cộng tiền.',
  },
  debugging: {
    detail: 'Một lỗi cần được tái hiện trước khi sửa. Ca nhỏ làm giảm số trạng thái phải quan sát. Ghi expected, actual, giả thuyết và thay đổi duy nhất; sau đó chạy lại ca tái hiện cùng các ca cũ. Đừng sửa cận vòng lặp và công thức cùng lúc nếu chưa biết nguyên nhân.',
    trace: { title: 'Lỗi bỏ số cuối khi n=1', columns: ['Phiên bản', 'Điều kiện đầu tiên', 'Có cộng 1?', 'Kết quả'], rows: [['Sai: i<n', '1<1 là sai', 'không', '0'], ['Đúng: i<=n', '1<=1 là đúng', 'có', '1']], explanation: 'Một lần chạy nhỏ đã phân biệt được hai phiên bản mà không cần dữ liệu lớn.' },
    commonMistakes: [{ mistake: 'Chỉ thử ca lớn, không ghi kết quả mong đợi.', why: 'Khó nhìn thấy bước đầu tiên bị sai.', fix: 'Thu nhỏ đến n=1 và so từng trạng thái.' }, { mistake: 'Xóa ca lỗi sau khi sửa.', why: 'Lỗi cũ có thể quay lại mà không được phát hiện.', fix: 'Giữ ca đó làm kiểm thử hồi quy.' }],
    reflection: { prompt: 'Mô tả quá trình sửa lỗi max khởi tạo bằng 0 theo bốn bước.', criteria: ['Ca -1.', 'Expected -1, actual 0.', 'Giả thuyết về khởi tạo.', 'Sửa và chạy hồi quy.'], sampleAnswer: 'Một số -1 cho expected -1 nhưng actual 0. Best=0 không thuộc dữ liệu; sửa best từ phần tử đầu, rồi chạy lại ca âm, dương và n=1.' },
    cpp: 'Phân biệt thông báo biên dịch với chương trình chạy nhưng trả sai. Bài cận vòng lặp vẫn có thể biên dịch sạch; cần kiểm thử hành vi.',
    python: 'Một chương trình không ném exception vẫn có thể sai logic. print tạm để quan sát cần được xóa hoặc chuyển sang công cụ gỡ lỗi trước khi nộp stdout đúng định dạng.',
  },
  searching: {
    detail: '“Vị trí đầu tiên” và “số lần xuất hiện” yêu cầu hai cách dừng khác nhau. Tìm vị trí đầu có thể break sau khi khớp; đếm mọi lần phải đi hết dãy. Quy ước -1 cho không thấy không được nhầm với một chỉ số truy cập để lấy phần tử ngay.',
    trace: { title: 'Tìm lần đầu so với đếm mọi lần', columns: ['i', 'a[i]', 'Tìm target=4', 'Đếm target=4'], rows: [['0', '4', 'trả 0 và dừng', 'count=1'], ['1', '9', 'không xét tiếp', 'count=1'], ['2', '4', 'không xét tiếp', 'count=2'], ['3', '2', 'không xét tiếp', 'count=2']], explanation: 'Cùng dữ liệu nhưng hợp đồng đầu ra quyết định có dừng sớm hay không.' },
    commonMistakes: [{ mistake: 'Đếm nhưng vẫn break ở lần đầu.', why: 'Mọi trường hợp có mục tiêu đều bị giới hạn kết quả 1.', fix: 'Thử target xuất hiện ba lần và bỏ break ở bài đếm.' }, { mistake: 'Tìm lần đầu nhưng luôn ghi đè vị trí.', why: 'Kết quả trở thành vị trí cuối.', fix: 'Dừng khi thấy hoặc chỉ ghi lần đầu.' }],
    reflection: { prompt: 'Cho dãy [4,9,4,2], hãy nêu hai đầu ra của hai hợp đồng.', criteria: ['Vị trí đầu là 0.', 'Số lần là 2.', 'Nêu khác biệt điểm dừng.'], sampleAnswer: 'Tìm đầu trả 0 và có thể dừng. Đếm trả 2 nên phải xét cả lần xuất hiện ở chỉ số 2.' },
    cpp: 'Chỉ dùng vị trí để truy cập khi đã kiểm tra khác -1 và nằm trong miền hợp lệ. Giá trị báo không tìm thấy không phải phần tử của vector.',
    python: 'a[-1] là phần tử cuối nếu list không rỗng, nên dùng kết quả tìm kiếm -1 làm chỉ số ngay có thể che lỗi. Kiểm tra trạng thái tìm thấy trước.',
  },
  sorting: {
    detail: 'Bất biến của sắp xếp chọn là đoạn đầu đã chứa các phần tử nhỏ nhất theo đúng thứ tự. Chỉ đổi chỗ sau khi tìm xong vị trí tốt nhất của lượt đó. Thử cả dãy đã sắp, giảm dần, một phần tử và có phần tử trùng; tính đúng không phụ thuộc dãy ban đầu xáo trộn nhiều hay ít.',
    trace: { title: 'Ba lượt đầu của sắp xếp chọn', columns: ['i', 'Chỉ số min trong phần chưa sắp', 'Dãy sau đổi'], rows: [['0', '3', '-2,1,3,3,0'], ['1', '4', '-2,0,3,3,1'], ['2', '4', '-2,0,1,3,3']], explanation: 'Đoạn đã hoàn thành dài thêm một phần tử sau mỗi lượt. Hai giá trị 3 được giữ nguyên số lần xuất hiện.' },
    commonMistakes: [{ mistake: 'Xóa phần tử bằng nhau khi sắp.', why: 'Thay đổi dữ liệu thay vì chỉ thay thứ tự.', fix: 'Đếm số phần tử trước và sau; thử [3,1,3].' }, { mistake: 'Đếm giá trị khác nhau bằng so liền kề trước khi sắp.', why: 'Các lần xuất hiện cùng giá trị có thể cách xa nhau.', fix: 'Sắp trước hoặc dùng cấu trúc khác đã học ở môn sau.' }],
    reflection: { prompt: 'Bộ chấm đầu ra có tự chứng minh bạn dùng sắp xếp chọn không?', criteria: ['Không tự chứng minh thuật toán.', 'Có thể kiểm tra tính đúng đầu ra.', 'Cần bảng vết hoặc xem mã để đối chiếu cách làm.'], sampleAnswer: 'Không. Nhiều thuật toán cho cùng dãy đầu ra. Tôi cần trình bày mã và bảng vết, còn bộ chấm xác nhận các kết quả đã chạy.' },
    cpp: 'Bài chính tự cài vòng tìm min; bài chuyển giao có thể dùng std::sort với vùng [begin,end). Không dùng iterator vượt vùng.',
    python: 'list.sort() sửa tại chỗ và trả None; sorted(list) tạo list mới. Bài chính dùng thuật toán tự cài để học, bài chuyển giao có thể dùng sorted.',
  },
  testing: {
    detail: 'Một ca kiểm thử hữu ích cần kết quả mong đợi được tính độc lập. Kiểm thử biên không chỉ là số nhỏ nhất: còn có đúng ngưỡng, phần tử lặp, dữ liệu rỗng và giá trị âm khi hợp đồng cho phép. Tưởng tượng một phiên bản sai cụ thể rồi chọn ca làm nó lộ lỗi là cách thiết kế kiểm thử có chủ đích.',
    trace: { title: 'Phá lỗi ở hai biên khoảng [10,20]', columns: ['x', 'Đúng: 10<=x<=20', 'Sai: 10<x<20'], rows: [['9', 'OUT', 'OUT'], ['10', 'IN', 'OUT'], ['15', 'IN', 'IN'], ['20', 'IN', 'OUT'], ['21', 'OUT', 'OUT']], explanation: '10 và 20 phân biệt hai phiên bản. Chỉ chạy 15 không phát hiện lỗi bỏ dấu bằng.' },
    commonMistakes: [{ mistake: 'Tính expected bằng chính hàm đang kiểm tra.', why: 'Cùng lỗi có thể tạo cả actual và expected giống nhau.', fix: 'Tính tay ca nhỏ hoặc dùng cách độc lập.' }, { mistake: 'Coi vài ca công khai đúng là chứng minh mọi đầu vào.', why: 'Ca hữu hạn có thể chưa bao phủ hành vi còn lại.', fix: 'Kết hợp phân tích hợp đồng, lập luận và thêm các lớp dữ liệu.' }],
    reflection: { prompt: 'Thiết kế ca phá chương trình đếm chẵn bỏ số âm và số 0.', criteria: ['Có số chẵn âm.', 'Có 0.', 'Nêu expected độc lập.'], sampleAnswer: 'Dãy [-2,0,3] có hai số chẵn. Nếu chương trình thêm điều kiện x>0, nó trả 0 và bị ca này phát hiện.' },
    cpp: 'Ca lớn cũng kiểm tra kiểu số nhưng không thay ca biên logic. Nếu chương trình lỗi khi chạy, giữ nguyên đầu vào tái hiện để kiểm tra bằng công cụ thích hợp.',
    python: 'assert hữu ích với mã tham chiếu tin cậy để phát hiện sai khác khi phát triển. Không dùng assert thay toàn bộ kiểm tra dữ liệu bên ngoài trong một dịch vụ sản xuất.',
  },
  'budget-project': {
    detail: 'Bài tích hợp nối các kỹ năng qua hợp đồng chung. Hoàn thành từng mốc rồi giữ ca của mốc trước làm hồi quy. Có thể dùng một lượt duyệt cho nhiều thống kê nhưng trước hết cần bảo đảm mỗi biến có ý nghĩa rõ. Phần thuyết minh và chất lượng phân rã không được tự nhận đã kiểm chứng chỉ vì stdout đúng.',
    trace: { title: 'Từ ba khoản chi đến số dư', columns: ['Khoản', 'Tổng trước', 'Tổng sau', 'Số dư từ budget=500000'], rows: [['120000', '0', '120000', '380000'], ['80000', '120000', '200000', '300000'], ['50000', '200000', '250000', '250000']], explanation: 'Số dư được suy từ ngân sách trừ tổng; không cập nhật bằng hai quy tắc mâu thuẫn.' },
    commonMistakes: [{ mistake: 'Ép số dư âm thành 0.', why: 'Che mất thông tin chi vượt ngân sách mà đề yêu cầu giữ.', fix: 'In kết quả trừ thực; thử chi 120000 với ngân sách 100000.' }, { mistake: 'Chọn lần xuất hiện cuối của khoản lớn nhất.', why: 'Dùng >= ghi đè vị trí khi hai khoản bằng nhau.', fix: 'Chỉ thay khi lớn hơn hoặc chưa có ứng viên; thử [4,4,2].' }],
    reflection: { prompt: 'Tóm tắt bằng chứng cho sản phẩm và điều bộ chấm chưa chứng minh.', criteria: ['Liệt kê ca rỗng, vượt ngân sách, max trùng, nhóm vắng.', 'Nêu hành vi máy kiểm tra.', 'Ghi phần thiết kế/nguồn trợ giúp tự đối chiếu.'], sampleAnswer: 'Tôi chạy ca 0 khoản, vượt ngân sách, hai khoản max bằng nhau và thiếu một nhóm. Máy kiểm tra đầu ra các ca đã chạy; tôi còn cần giải thích phân chia hàm và nguồn tham khảo, không suy ra mọi chất lượng từ điểm test.' },
    cpp: 'Tổng và số dư dùng long long. Hàm đọc qua const vector& có thể tránh sao chép và không sửa dãy; ý nghĩa tham chiếu được củng cố ở mô-đun chuyển tiếp.',
    python: 'Tránh giữ dữ liệu trong biến toàn cục làm kết quả phụ thuộc lần chạy trước. Các hàm tổng hợp nên nhận dữ liệu qua tham số, trả kết quả, rồi phần chính in theo hợp đồng.',
  },
};

export function addIntroLearningTools(lesson: Lesson, slug: string, track: LearningTrack): Lesson {
  const tools = introLearningTools[slug]!;
  return {
    ...lesson,
    sections: [...lesson.sections, { heading: 'Đi sâu vào cách làm', body: tools.detail }, { heading: `Ghi chú riêng cho ${track === 'cpp' ? 'C++' : 'Python'}`, body: tools[track] }],
    trace: tools.trace,
    commonMistakes: tools.commonMistakes,
    reflection: tools.reflection,
  };
}
