import type { AssessmentDefinition, PrivateExercise, PrivateQuestion } from './types.js';

/** Deliberately public teacher-authored M1 material. Never load as a private official exam bank. */
export const INTRO_DEVELOPMENT_VERSION = 'intro-m1.2026.v1';
export type IntroOutcome = 'CLO1' | 'CLO2' | 'CLO3' | 'CLO4' | 'CLO5' | 'CLO6';
export interface TrustedIntroReference {
  exerciseId: string;
  language: 'cpp' | 'python';
  source: string;
  tests: { input: string; output: string; note?: string }[];
  purpose: 'assessment' | 'legacy-fixture';
}
export interface TrustedIntroMutant { id: string; exerciseId: string; language: 'cpp' | 'python'; source: string; misconception: string }
type QuestionSpec = { id: string; prompt: string; options: string[]; correct: number; explanation: string; outcomes: IntroOutcome[] };
type TaskId = 'midterm' | 'final' | 'retake';

const midtermQuestions: QuestionSpec[] = [
  { id: 'input-contract', prompt: 'Đề yêu cầu đọc n rồi đúng n số nguyên. Các số có thể nằm trên nhiều dòng. Cách xử lý nào tuân thủ hợp đồng?', options: ['Chỉ đọc dòng ngay sau n', 'Đọc đủ n token số, không phụ thuộc vị trí xuống dòng', 'Bỏ qua n và đọc đúng một số', 'Dừng ngay khi gặp số 0'], correct: 1, explanation: 'Dấu cách và xuống dòng phân tách token; n quyết định số phần tử cần đọc.', outcomes: ['CLO1'] },
  { id: 'assignment-trace', prompt: 'Theo dõi mã giả x ← 4; y ← x; x ← 7. Cuối cùng y bằng bao nhiêu?', options: ['4', '7', '11', 'Không xác định'], correct: 0, explanation: 'y nhận giá trị 4 tại thời điểm gán; việc gán lại x không gán lại y.', outcomes: ['CLO2', 'CLO4'] },
  { id: 'integer-capacity', prompt: 'Tổng lớn nhất của 5.000 khoản chi, mỗi khoản 1.000.000đ, là 5.000.000.000đ. Với C++, lựa chọn nào phù hợp?', options: ['int 32 bit luôn đủ', 'Dùng bool để tiết kiệm bộ nhớ', 'Dùng long long cho tổng; Python int cũng biểu diễn được tổng này', 'Đổi tổng thành ký tự'], correct: 2, explanation: '5 tỷ lớn hơn giới hạn số nguyên có dấu 32 bit; cần kiểu đủ miền giá trị.', outcomes: ['CLO2'] },
  { id: 'division-contract', prompt: 'Cần lấy phần nguyên không âm của 7 chia 2: C++ dùng phép chia hai số nguyên, Python dùng //. Kết quả mong đợi là gì?', options: ['2', '3', '3.5', '4'], correct: 1, explanation: 'Trong miền không âm của câu hỏi, hai cách đều cho phần nguyên 3.', outcomes: ['CLO1', 'CLO2'] },
  { id: 'inclusive-boundary', prompt: 'Khoản chi hợp lệ khi amount từ 0 trở lên. Điều kiện nào đúng cả tại biên amount = 0?', options: ['amount > 0', 'amount == 1', 'amount >= 0', 'amount < 0'], correct: 2, explanation: '“Từ 0 trở lên” bao gồm 0; dùng >=.', outcomes: ['CLO2', 'CLO4'] },
  { id: 'boolean-and', prompt: 'Một phiếu được nhận khi amount >= 0 VÀ approved = 1. Với amount = -5, approved = 1, kết luận nào đúng?', options: ['Nhận vì đã duyệt', 'Không nhận vì một điều kiện sai', 'Nhận vì phép và chỉ cần một vế đúng', 'Tự đổi amount thành 5'], correct: 1, explanation: 'Phép và yêu cầu cả hai điều kiện cùng đúng.', outcomes: ['CLO2'] },
  { id: 'loop-bounds', prompt: 'Với n = 4, vòng lặp i chạy từ 0 trong khi i < n, tăng i một đơn vị mỗi lượt. Thân lặp chạy bao nhiêu lần?', options: ['3', '4', '5', 'Vô hạn'], correct: 1, explanation: 'Các chỉ số là 0, 1, 2, 3: bốn lượt.', outcomes: ['CLO2', 'CLO4'] },
  { id: 'empty-accumulator', prompt: 'Để tính tổng bằng vòng lặp và xử lý đúng cả dãy rỗng, tổng nên được khởi tạo thế nào?', options: ['Bằng 1', 'Bằng phần tử đầu tiên mà không kiểm tra n', 'Bằng một giá trị ngẫu nhiên', 'Bằng 0'], correct: 3, explanation: '0 là phần tử trung hòa của phép cộng và là tổng dãy rỗng.', outcomes: ['CLO2', 'CLO4'] },
  { id: 'nested-count', prompt: 'Một vòng ngoài chạy 3 lượt. Mỗi lượt chạy vòng trong 4 lượt. Lệnh trong cùng chạy bao nhiêu lần?', options: ['7', '9', '12', '16'], correct: 2, explanation: 'Số lượt là 3 × 4 = 12, không phải 3 + 4.', outcomes: ['CLO2', 'CLO4'] },
  { id: 'sentinel', prompt: 'Đọc các giá trị đến khi gặp -1 và không đưa -1 vào tổng. Thứ tự xử lý đúng là gì?', options: ['Cộng trước rồi kiểm tra -1', 'Đọc, kiểm tra -1, nếu chưa dừng thì cộng và đọc tiếp', 'Không bao giờ đọc giá trị mới', 'Dừng ở mọi số âm dù hợp đồng chỉ nói -1'], correct: 1, explanation: 'Kiểm tra giá trị kết thúc trước khi cộng và bảo đảm dữ liệu được cập nhật.', outcomes: ['CLO1', 'CLO4'] },
  { id: 'function-contract', prompt: 'Hàm square được dùng trong nhiều phép tính. Thiết kế nào dễ tái sử dụng và kiểm thử?', options: ['Hàm nhận x và trả x*x', 'Hàm tự đọc bàn phím trong mọi lần gọi', 'Hàm chỉ in kết quả và không trả giá trị', 'Hàm thay đổi một biến toàn cục không được mô tả'], correct: 0, explanation: 'Tham số và giá trị trả về tạo hợp đồng rõ, ít phụ thuộc bên ngoài.', outcomes: ['CLO3'] },
  { id: 'zero-elements', prompt: 'Đầu vào hợp lệ n = 0 cho bài tính tổng và đếm phiếu lỗi. Chương trình cần làm gì?', options: ['Đọc thêm một khoản chi không tồn tại', 'Báo vô hạn lần nhập lại', 'Không đọc phần tử; xuất tổng 0 và số phiếu lỗi 0', 'Tự tạo một phiếu âm'], correct: 2, explanation: 'Dãy có đúng 0 phần tử. Trường hợp rỗng phải có đầu ra được định nghĩa.', outcomes: ['CLO1', 'CLO4'] },
];

const finalQuestions: QuestionSpec[] = [
  { id: 'multiline-data', prompt: 'Dãy có n = 3 phần tử, nhưng chúng được nhập thành các dòng “8”, “2 8”. Nhận định nào đúng?', options: ['Đây vẫn là ba token số hợp lệ theo hợp đồng token', 'Chỉ số 8 đầu tiên được tính', 'Phải tự chèn phần tử 0', 'Mỗi phần tử bắt buộc có cùng số chữ số'], correct: 0, explanation: 'Hợp đồng đọc token cho phép các phần tử nằm trên nhiều dòng.', outcomes: ['CLO1'] },
  { id: 'last-index', prompt: 'Một dãy có n phần tử và chỉ số bắt đầu từ 0. Khi n > 0, chỉ số hợp lệ cuối cùng là gì?', options: ['n', 'n-1', 'n+1', 'Luôn là 0'], correct: 1, explanation: 'Có n chỉ số từ 0 đến n-1; truy cập chỉ số n vượt phạm vi.', outcomes: ['CLO2', 'CLO4'] },
  { id: 'search-missing', prompt: 'Hàm tìm kiếm tuyến tính trả chỉ số đầu tiên, hoặc -1 nếu không tìm thấy. Tìm 5 trong [2, 7, 2] phải trả gì?', options: ['0', '1', '2', '-1'], correct: 3, explanation: 'Không có phần tử 5, nên dùng giá trị không tìm thấy theo hợp đồng.', outcomes: ['CLO3', 'CLO4'] },
  { id: 'duplicate-sort', prompt: 'Sắp xếp tăng dần [3, 1, 3, -2] mà không xóa phần tử. Kết quả đúng là gì?', options: ['[-2, 1, 3]', '[-2, 1, 3, 3]', '[3, 3, 1, -2]', '[1, 3, 3, -2]'], correct: 1, explanation: 'Sắp xếp đổi thứ tự nhưng giữ nguyên số lượng và các phần tử trùng.', outcomes: ['CLO3'] },
  { id: 'matrix-row', prompt: 'Ma trận hai hàng [[1, 2, 3], [4, 5, 6]]. Tổng hàng có chỉ số 1 là bao nhiêu?', options: ['6', '9', '15', '21'], correct: 2, explanation: 'Hàng chỉ số 1 là [4,5,6], tổng bằng 15.', outcomes: ['CLO2', 'CLO4'] },
  { id: 'whole-line', prompt: 'Cần đọc toàn bộ họ tên “Nguyen Van An”, kể cả khoảng trắng giữa các từ. Lựa chọn nào đúng?', options: ['Chỉ đọc token đầu tiên', 'Đọc một ký tự', 'Dùng thao tác đọc cả dòng và xử lý ký tự xuống dòng theo hợp đồng', 'Xóa toàn bộ khoảng trắng trước khi đọc'], correct: 2, explanation: 'Đọc token và đọc cả dòng phục vụ hai hợp đồng đầu vào khác nhau.', outcomes: ['CLO1', 'CLO2'] },
  { id: 'case-sensitive', prompt: 'Đếm ký tự a thường trong chuỗi “aAa a”, phân biệt hoa/thường và không tính dấu cách. Kết quả là gì?', options: ['2', '3', '4', '5'], correct: 1, explanation: 'Có ba chữ a thường và một chữ A hoa.', outcomes: ['CLO2', 'CLO4'] },
  { id: 'return-use', prompt: 'Hàm countTarget nhận dãy và target. Vì sao nên trả số lượng thay vì chỉ in?', options: ['Để người gọi kiểm tra, lưu hoặc dùng kết quả tiếp', 'Vì không cần viết kiểm thử nữa', 'Vì mọi hàm phải sửa dãy gốc', 'Vì in luôn nhanh hơn tìm kiếm'], correct: 0, explanation: 'Giá trị trả về tách phần tính toán khỏi trình bày và giúp kiểm thử.', outcomes: ['CLO3'] },
  { id: 'test-oracle', prompt: 'Bộ kiểm thử nào có khả năng phát hiện lỗi tốt hơn?', options: ['Chỉ một ví dụ đã chép từ lời giải', 'Ca thường, ca rỗng, ca biên, ca có trùng và kết quả được tính độc lập', 'Chỉ dữ liệu tăng dần', 'Đổi expected thành actual mỗi khi test sai'], correct: 1, explanation: 'Dữ liệu đa dạng và oracle độc lập giúp tránh cùng sai với cài đặt.', outcomes: ['CLO4'] },
  { id: 'iteration-cost', prompt: 'Thuật toán duyệt n hàng, mỗi hàng m phần tử và xử lý mỗi phần tử một lần. Số thao tác cơ bản tỷ lệ với gì?', options: ['n+m', 'n-m', 'n*m', 'Luôn là 1'], correct: 2, explanation: 'Có n×m phần tử cần được xử lý.', outcomes: ['CLO3', 'CLO4'] },
  { id: 'budget-reconcile', prompt: 'Báo cáo có 10 suất ăn × 35.000đ và 5 nước uống × 12.000đ. Tổng đúng để đối chiếu chương trình là?', options: ['47.000đ', '350.000đ', '410.000đ', '470.000đ'], correct: 2, explanation: '350.000 + 60.000 = 410.000đ; không cộng trực tiếp hai đơn giá.', outcomes: ['CLO5'] },
  { id: 'debug-reproduce', prompt: 'Chương trình đếm sai khi dãy có phần tử trùng. Bước gỡ lỗi hợp lý nhất là gì?', options: ['Xóa mọi ca có trùng', 'Đổi ngẫu nhiên tên biến', 'Tạo ca nhỏ có trùng, theo dõi từng bước và kiểm tra điều kiện tăng bộ đếm', 'Chỉ thử dãy dài hơn'], correct: 2, explanation: 'Ca nhỏ tái hiện lỗi và dấu vết thực thi giúp kiểm tra giả thuyết cụ thể.', outcomes: ['CLO4', 'CLO6'] },
];

const retakeQuestions: QuestionSpec[] = [
  { id: 'empty-contract', prompt: 'Bài lọc dãy quy định: dòng đầu in số phần tử được giữ; nếu không có thì dòng sau in EMPTY. Với n=0, đầu ra đúng là?', options: ['0 rồi EMPTY', '1 rồi 0', 'Không in gì', 'Đọc thêm một giá trị'], correct: 0, explanation: 'Phải thực hiện đúng đầu ra cho trường hợp rỗng được mô tả.', outcomes: ['CLO1'] },
  { id: 'threshold-equality', prompt: 'Chỉ giữ giá trị x >= threshold. Với x = threshold = 12, phải làm gì?', options: ['Loại vì không lớn hơn', 'Giữ vì điều kiện bao gồm bằng', 'Tự đổi thành 13', 'Dừng toàn bộ chương trình'], correct: 1, explanation: '>= bao gồm trường hợp bằng; đây là một ca biên cần kiểm thử.', outcomes: ['CLO2', 'CLO4'] },
  { id: 'count-not-sum', prompt: 'Sau khi lọc, dãy còn [8, 8, 20]. Số phần tử là gì?', options: ['36', '20', '3', '2'], correct: 2, explanation: 'Đếm phần tử khác với cộng giá trị hoặc đếm giá trị phân biệt.', outcomes: ['CLO2'] },
  { id: 'while-progress', prompt: 'Một vòng while đọc đến giá trị kết thúc nhưng dùng continue trước khi đọc giá trị mới. Rủi ro chính là gì?', options: ['Luôn tự thoát sớm', 'Có thể lặp mãi trên cùng dữ liệu', 'Tự sắp xếp dãy', 'Biến không thể thay đổi'], correct: 1, explanation: 'Mỗi đường lặp cần bảo đảm tiến triển hoặc có điều kiện kết thúc.', outcomes: ['CLO4'] },
  { id: 'function-result', prompt: 'Hàm square(x) trả x*x. Biểu thức square(5)+1 có giá trị nào?', options: ['11', '25', '26', '51'], correct: 2, explanation: 'Giá trị trả về 25 được dùng tiếp trong phép cộng với 1.', outcomes: ['CLO3'] },
  { id: 'first-search', prompt: 'Hàm tìm chỉ số đầu tiên của 8 trong [8, 3, 8], với chỉ số từ 0, phải trả gì?', options: ['0', '1', '2', '-1'], correct: 0, explanation: 'Phần tử đầu tiên đã khớp; không được vô tình trả lần khớp cuối.', outcomes: ['CLO3', 'CLO4'] },
  { id: 'descending-negative', prompt: 'Sắp xếp giảm dần [-3, 0, -1, 2] cho kết quả nào?', options: ['[-3, -1, 0, 2]', '[2, 0, -1, -3]', '[0, 2, -3, -1]', '[2, -3, 0, -1]'], correct: 1, explanation: 'So sánh theo giá trị số; 0 lớn hơn các số âm.', outcomes: ['CLO3'] },
  { id: 'matrix-sum', prompt: 'Tính tổng hàng đầu của ma trận [[2, -1, 4], [9, 0, 1]]. Kết quả là gì?', options: ['3', '5', '10', '15'], correct: 1, explanation: 'Hàng đầu có tổng 2-1+4=5, không cộng lẫn hàng kế tiếp.', outcomes: ['CLO2', 'CLO4'] },
  { id: 'output-format', prompt: 'Đề yêu cầu chỉ in số lượng và dãy kết quả. Vì sao không nên thêm “Ket qua la:” vào stdout?', options: ['Vì chuỗi luôn bị cấm trong lập trình', 'Vì phần mô tả thêm không thuộc hợp đồng đầu ra và có thể làm sai kiểm thử', 'Vì số lượng phải là số âm', 'Vì phải bỏ mọi xuống dòng'], correct: 1, explanation: 'Tách lời nhắc/debug khỏi đầu ra được hệ thống kiểm chứng.', outcomes: ['CLO1'] },
  { id: 'mutation-boundary', prompt: 'Cài đặt sai dùng x > threshold thay vì >=. Ca nào phát hiện trực tiếp lỗi này?', options: ['Một x đúng bằng threshold', 'Chỉ x rất lớn hơn threshold', 'Một dãy rỗng', 'Chỉ x nhỏ hơn threshold'], correct: 0, explanation: 'Hai điều kiện khác nhau chính tại trường hợp bằng.', outcomes: ['CLO4'] },
  { id: 'preserve-duplicates', prompt: 'Dữ liệu giao dịch có hai khoản 50.000đ độc lập. Khi sắp xếp báo cáo, nhận định nào đúng?', options: ['Tự bỏ một khoản vì giá trị trùng', 'Giữ cả hai khoản, trừ khi hợp đồng yêu cầu loại trùng', 'Đổi một khoản thành 0', 'Chỉ giữ khoản có chỉ số lớn nhất'], correct: 1, explanation: 'Giá trị bằng nhau không chứng minh đó là cùng một giao dịch.', outcomes: ['CLO1', 'CLO5'] },
  { id: 'explain-evidence', prompt: 'Phần giải thích lời giải nên có nội dung nào để người khác kiểm chứng?', options: ['Chỉ khẳng định “đã chạy đúng”', 'Hợp đồng, ý tưởng, trường hợp biên và cách tái hiện kiểm thử', 'Chỉ ảnh màn hình đẹp', 'Sao chép kết quả mà không nêu dữ liệu'], correct: 1, explanation: 'Nhận diện thành phần của giải thích là một bài kiểm tra kiến thức; chất lượng diễn đạt tự do vẫn cần tự đối chiếu hoặc người duyệt.', outcomes: ['CLO6'] },
];

const cppHeader = '#include <iostream>\n#include <vector>\n#include <algorithm>\n#include <functional>\n';
const sources: Record<TaskId, Record<'cpp' | 'python', string>> = {
  midterm: {
    cpp: cppHeader + 'int main(){int n;std::cin>>n;long long total=0;int rejected=0;for(int i=0;i<n;i++){long long x;std::cin>>x;if(x>=0)total+=x;else rejected++;}std::cout<<total<<" "<<rejected<<"\\n";}\n',
    python: 'import sys\ndata=list(map(int,sys.stdin.read().split()))\nn=data[0]\ntotal=0\nrejected=0\nfor x in data[1:1+n]:\n    if x>=0:\n        total+=x\n    else:\n        rejected+=1\nprint(total,rejected)\n',
  },
  final: {
    cpp: cppHeader + 'int main(){int n;long long target;std::cin>>n>>target;std::vector<long long> a(n);for(auto &x:a)std::cin>>x;std::sort(a.begin(),a.end());std::cout<<std::count(a.begin(),a.end(),target)<<"\\n";if(a.empty())std::cout<<"EMPTY\\n";else{for(int i=0;i<n;i++){if(i)std::cout<<" ";std::cout<<a[i];}std::cout<<"\\n";}}\n',
    python: 'import sys\ndata=list(map(int,sys.stdin.read().split()))\nn,target=data[:2]\na=data[2:2+n]\na.sort()\nprint(a.count(target))\nprint(" ".join(map(str,a)) if a else "EMPTY")\n',
  },
  retake: {
    cpp: cppHeader + 'int main(){int n;long long threshold;std::cin>>n>>threshold;std::vector<long long>a;for(int i=0;i<n;i++){long long x;std::cin>>x;if(x>=threshold)a.push_back(x);}std::sort(a.begin(),a.end(),std::greater<long long>());std::cout<<a.size()<<"\\n";if(a.empty())std::cout<<"EMPTY\\n";else{for(size_t i=0;i<a.size();i++){if(i)std::cout<<" ";std::cout<<a[i];}std::cout<<"\\n";}}\n',
    python: 'import sys\ndata=list(map(int,sys.stdin.read().split()))\nn,threshold=data[:2]\na=[x for x in data[2:2+n] if x>=threshold]\na.sort(reverse=True)\nprint(len(a))\nprint(" ".join(map(str,a)) if a else "EMPTY")\n',
  },
};

const expenseCases: number[][] = [[], [0], [-1], [35000], [35000,-1,12000,-5,0], [-1,-2,-3,-4], [1000000,1000000,1000000], [1,-1,0,2,-2,3], Array(3000).fill(1000000), [0,0,-1000000,1000000,500,-1]];
const sequenceCases: { target: number; values: number[] }[] = [
  {target:0,values:[]},{target:8,values:[8]},{target:8,values:[3]},{target:3,values:[3,1,3,-2]},
  {target:-1,values:[-1,-3,0,5,-1]},{target:4,values:[1,2,3,4,5]},{target:9,values:[9,7,5,3,1]},
  {target:6,values:[6,6,6,6]},{target:1000000000000,values:[1000000000000,-1000000000000,0,1000000000000]},
  {target:0,values:Array.from({length:101},(_,index)=>(index%9)-4)},
  {target:-1000000000000,values:Array(500).fill(-1000000000000)},
];
const filterCases: { threshold: number; values: number[] }[] = [
  {threshold:0,values:[]},{threshold:12,values:[12]},{threshold:12,values:[11]},{threshold:5,values:[5,9,1,5,7]},
  {threshold:-2,values:[-3,0,-1,2,-2]},{threshold:100,values:[0,1,99]},{threshold:6,values:[6,6,6]},
  {threshold:0,values:[10,5,0,-1]},{threshold:1000000000000,values:[-1000000000000,1000000000000,0]},
  {threshold:-3,values:Array.from({length:101},(_,index)=>(index%11)-5)},
  {threshold:-1000000000000,values:Array(500).fill(-1000000000000)},
];
const taskTests: Record<TaskId, TrustedIntroReference['tests']> = {
  midterm: expenseCases.map((values,index)=>({input:`${values.length}\n${values.join(index%2?' ':'\n')}\n`,output:`${values.filter(value=>value>=0).reduce((sum,value)=>sum+value,0)} ${values.filter(value=>value<0).length}\n`,note:index===8?'Tổng vượt miền int32.':index===0?'Dãy rỗng.':'Dữ liệu thường hoặc trường hợp biên.'})),
  final: sequenceCases.map(({target,values},index)=>({input:`${values.length} ${target}\n${values.join(index%2?' ':'\n')}\n`,output:`${values.filter(value=>value===target).length}\n${values.length?[...values].sort((a,b)=>a-b).join(' '):'EMPTY'}\n`,note:'Giữ phần tử trùng; xử lý số âm, thứ tự và dãy rỗng.'})),
  retake: filterCases.map(({threshold,values},index)=>{const result=values.filter(value=>value>=threshold).sort((a,b)=>b-a);return{input:`${values.length} ${threshold}\n${values.join(index%2?' ':'\n')}\n`,output:`${result.length}\n${result.length?result.join(' '):'EMPTY'}\n`,note:'Bao gồm biên bằng ngưỡng, giữ phần tử trùng và sắp giảm dần.'};}),
};

const descriptions: Record<TaskId, {title:string;prompt:string;outcomes:IntroOutcome[]}> = {
  midterm: { title:'Đối soát phiếu chi', prompt:'Đọc n (0..5000), sau đó đúng n số nguyên amount trong [-1000000,1000000], phân tách bằng khoảng trắng hoặc xuống dòng. Phiếu có amount >= 0 là hợp lệ; phiếu âm bị loại. In trên một dòng tổng tiền của phiếu hợp lệ và số phiếu bị loại, cách nhau một dấu cách. Với n=0 in 0 0. Không in lời nhắc. Dùng kiểu đủ lớn cho tổng.', outcomes:['CLO1','CLO2','CLO3','CLO4','CLO5'] },
  final: { title:'Báo cáo dãy và tìm kiếm', prompt:'Đọc n (0..500) và target, rồi đúng n số nguyên trong [-10^12,10^12]. Dòng 1 in số lần target xuất hiện. Dòng 2 in toàn bộ dãy theo thứ tự tăng dần, giữ nguyên phần tử trùng và cách nhau một dấu cách; nếu dãy rỗng in EMPTY. Các số đầu vào có thể nằm trên nhiều dòng. Không in nhãn hoặc lời nhắc.', outcomes:['CLO1','CLO2','CLO3','CLO4'] },
  retake: { title:'Lọc giao dịch và sắp xếp', prompt:'Đọc n (0..500) và threshold, rồi đúng n số nguyên trong [-10^12,10^12]. Giữ các giá trị >= threshold. Dòng 1 in số phần tử được giữ, kể cả các phần tử bằng nhau. Dòng 2 in các giá trị được giữ theo thứ tự giảm dần, cách nhau một dấu cách; nếu không có in EMPTY. Các số có thể nằm trên nhiều dòng. Không in nhãn hoặc lời nhắc.', outcomes:['CLO1','CLO2','CLO3','CLO4','CLO5'] },
};

export const developmentAssessmentReferences: TrustedIntroReference[] = (['midterm','final','retake'] as const).flatMap(task => (['cpp','python'] as const).map(language=>({exerciseId:`intro-m1-${task}-${language}`,language,source:sources[task][language],tests:structuredClone(taskTests[task]),purpose:'assessment' as const})));
export const developmentAssessmentMutants: TrustedIntroMutant[] = (['cpp','python'] as const).flatMap(language => [
  {id:`midterm-sums-negative-${language}`,exerciseId:`intro-m1-midterm-${language}`,language,source:sources.midterm[language].replace(language==='cpp'?'if(x>=0)total+=x;else rejected++;':'if x>=0:\n        total+=x\n    else:\n        rejected+=1',language==='cpp'?'total+=x;if(x<0)rejected++;':'total+=x\n    if x<0:\n        rejected+=1'),misconception:'Cộng cả phiếu âm thay vì loại khỏi tổng.'},
  {id:`midterm-rejects-zero-${language}`,exerciseId:`intro-m1-midterm-${language}`,language,source:sources.midterm[language].replace(language==='cpp'?'x>=0':'x>=0',language==='cpp'?'x>0':'x>0'),misconception:'Dùng > thay vì >=, loại nhầm phiếu 0.'},
  {id:`final-descending-${language}`,exerciseId:`intro-m1-final-${language}`,language,source:sources.final[language].replace(language==='cpp'?'std::sort(a.begin(),a.end());':'a.sort()',language==='cpp'?'std::sort(a.begin(),a.end(),std::greater<long long>());':'a.sort(reverse=True)'),misconception:'Sắp giảm dần thay vì tăng dần.'},
  {id:`retake-strict-threshold-${language}`,exerciseId:`intro-m1-retake-${language}`,language,source:sources.retake[language].replace(language==='cpp'?'x>=threshold':'x>=threshold',language==='cpp'?'x>threshold':'x>threshold'),misconception:'Bỏ trường hợp đúng bằng ngưỡng.'},
  {id:`retake-ascending-${language}`,exerciseId:`intro-m1-retake-${language}`,language,source:sources.retake[language].replace(language==='cpp'?'std::sort(a.begin(),a.end(),std::greater<long long>());':'a.sort(reverse=True)',language==='cpp'?'std::sort(a.begin(),a.end());':'a.sort()'),misconception:'Giữ đúng phần tử nhưng sai thứ tự giảm dần.'},
]);

function compileQuestion(spec: QuestionSpec, task: TaskId): PrivateQuestion { return { id:`m1-${task}-${spec.id}`,kind:'choice',prompt:spec.prompt,options:spec.options.map((text,index)=>({id:String(index),text})),correctOption:String(spec.correct),explanation:spec.explanation,weight:0.5 }; }
export function createIntroDevelopmentAssessment(templateId=''): {assessments:AssessmentDefinition[];exercises:PrivateExercise[]} {
  const specs: {task:TaskId;kind:'midterm'|'final';attemptNumber:1|2;questions:QuestionSpec[]}[] = [
    {task:'midterm',kind:'midterm',attemptNumber:1,questions:midtermQuestions},
    {task:'final',kind:'final',attemptNumber:1,questions:finalQuestions},
    {task:'retake',kind:'final',attemptNumber:2,questions:retakeQuestions},
  ];
  return {
    assessments: specs.map(spec=>({
      id:`development-intro-${spec.task}`,version:`${INTRO_DEVELOPMENT_VERSION}.${spec.task}`,courseId:'intro-programming',kind:spec.kind,attemptNumber:spec.attemptNumber,
      durationSeconds:spec.kind==='midterm'?3600:5400,availableWeek:spec.kind==='midterm'?8:16,isPublicDevelopmentSample:true,
      questions:[...spec.questions.map(question=>compileQuestion(question,spec.task)),{
        id:`m1-${spec.task}-code`,kind:'code',prompt:`${descriptions[spec.task].title}. ${descriptions[spec.task].prompt} Bài phát triển công khai, được chấm bằng chương trình chạy trong môi trường cô lập.`,options:[],correctOption:'',explanation:'Bài thực hành công khai phục vụ kiểm chứng M1; không phải ngân hàng thi chính thức.',weight:6,requiredPassRatio:spec.kind==='midterm'?0.7:0.8,
        exerciseIds:{cpp:`intro-m1-${spec.task}-cpp`,python:`intro-m1-${spec.task}-python`},
        starterCodes:{cpp:'#include <iostream>\n#include <vector>\n#include <algorithm>\nint main(){\n    // Đọc dữ liệu theo hợp đồng và triển khai lời giải.\n    return 0;\n}\n',python:'import sys\n# Đọc dữ liệu theo hợp đồng và triển khai lời giải.\n'},
      }],
    })),
    exercises: developmentAssessmentReferences.map(reference=>({id:reference.exerciseId,courseId:'intro-programming',title:descriptions[reference.exerciseId.includes('midterm')?'midterm':reference.exerciseId.includes('retake')?'retake':'final'].title,language:reference.language,prompt:descriptions[reference.exerciseId.includes('midterm')?'midterm':reference.exerciseId.includes('retake')?'retake':'final'].prompt,tests:reference.tests.map((test,index)=>({input:test.input,expected:test.output,public:index<2})),timeoutSeconds:30,templateId})),
  };
}

export const introAssessmentCoverage = (['midterm','final','retake'] as const).map(task=>({
  task, assessmentId:`development-intro-${task}`,version:`${INTRO_DEVELOPMENT_VERSION}.${task}`,
  choiceQuestions:(task==='midterm'?midtermQuestions:task==='final'?finalQuestions:retakeQuestions).map(question=>({id:`m1-${task}-${question.id}`,outcomes:question.outcomes})),
  codeExerciseIds:(['cpp','python'] as const).map(track=>`intro-m1-${task}-${track}`),codeOutcomes:descriptions[task].outcomes,
  caveat:'CLO6: câu hỏi chỉ kiểm tra nhận diện thành phần giải thích; phần diễn đạt tự do cần tự đối chiếu hoặc người duyệt. Học liệu và đánh giá phát triển chưa được duyệt học thuật độc lập.',
}));
