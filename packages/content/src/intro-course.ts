import { makeIntroLessons as baseIntroLessons } from './intro.ts';
import { dualExercises, primaryExtraTests, primaryReferenceOverrides, type DualExercise } from './intro-practice.ts';
import { introProject, introTopicOrder, introTopicOutcomes } from './intro-syllabus.ts';
import { addIntroLearningTools } from './intro-learning-tools.ts';
import type { Checkpoint, LearningTrack, Lesson, Practice, PracticeReference } from './types.ts';

const newTopics: Record<string, { title: string; objective: string; concept: string; method: string; checkpoint: Checkpoint }> = {
  'algorithm-planning': {
    title: 'Từ bài toán đến thuật toán và giả mã',
    objective: 'Viết hợp đồng đầu vào/đầu ra, ràng buộc, giả mã và ca thử trước khi cài đặt.',
    concept: 'Thuật toán là một chuỗi bước rõ ràng biến đầu vào hợp lệ thành kết quả. Bắt đầu bằng câu hỏi cần tính gì, dữ liệu ở đơn vị nào và giới hạn nào được bảo đảm. Giả mã bỏ qua cú pháp ngôn ngữ để tập trung vào ý nghĩa từng bước. Một lời giải cần dừng và xử lý được mọi đầu vào trong hợp đồng, không chỉ ví dụ đã thấy.',
    method: 'Hình chữ nhật có cạnh 3 và 5: chu vi là 2*(3+5)=16, diện tích là 3*5=15. Giả mã chu vi: ĐỌC a,b → ĐẶT p=2*(a+b) → XUẤT p. Ca 1,1 giúp kiểm tra đơn giản; ca hai cạnh khác nhau phân biệt hai công thức. Ví dụ mã có thể đọc sau khi học nhập/xuất; việc lập hợp đồng vẫn thực hiện trên giấy ngay bây giờ.',
    checkpoint: { question: 'Giả mã nào tính chu vi đúng?', options: ['Đọc a,b; in a*b', 'Đọc a,b; in 2*(a+b)', 'Đọc a,b; in a+b'], answerIndex: 1, explanation: 'Chu vi gồm hai cạnh a và hai cạnh b: 2*(a+b).' },
  },
  'while-sentinel': {
    title: 'Vòng while, dấu kết thúc và lý do vòng lặp dừng',
    objective: 'Dùng điều kiện dừng trước khi xử lý dữ liệu và chỉ ra bước làm vòng lặp tiến triển.',
    concept: 'Vòng while kiểm tra điều kiện trước mỗi lượt. Nó phù hợp khi số lượt chưa được biết trước, chẳng hạn đọc đến dấu kết thúc. Phải xác định trạng thái ban đầu, điều kiện tiếp tục và bước làm thay đổi trạng thái; thiếu bước cuối có thể tạo vòng lặp không dừng. Dấu kết thúc không nhất thiết là dữ liệu cần cộng.',
    method: 'Với 5,-2,0,999: bắt đầu tổng 0; đọc 5 và cộng thành 5; đọc -2 và cộng thành 3; gặp 0 thì dừng, không đọc 999 như một khoản hợp lệ. Nếu đầu vào bắt đầu 0, không có lượt cộng nào. Trong Python, tăng chỉ số sau mỗi lượt; trong C++, thao tác đọc trong điều kiện chuyển sang số mới.',
    checkpoint: { question: 'Dãy 5,-2,0,999, dừng ở 0 đầu tiên. Tổng cần in là?', options: ['3', '1002', '0'], answerIndex: 0, explanation: 'Chỉ 5 và -2 nằm trước dấu kết thúc, tổng bằng 3.' },
  },
  'matrix-data': {
    title: 'Dữ liệu hai chiều: hàng, cột và chuyển vị',
    objective: 'Ánh xạ chỉ số hàng/cột, tính tổng từng hàng và xuất chuyển vị một bảng chữ nhật.',
    concept: 'Một bảng r hàng c cột có r*c phần tử. Tọa độ (i,j) chỉ hàng i, cột j theo quy ước từ 0. Vòng ngoài và vòng trong phản ánh thứ tự duyệt. Tổng từng hàng phải đặt lại ở đầu mỗi hàng. Chuyển vị biến phần tử a[i][j] thành vị trí [j][i], nên kích thước mới là c hàng r cột.',
    method: 'Bảng [[1,2,3],[4,5,6]] có tổng hàng 6 và 15. Chuyển vị thành [[1,4],[2,5],[3,6]]. Nếu chỉ thử bảng vuông 2×2, lỗi dùng nhầm số hàng/cột có thể chưa lộ; bảng 2×3 kiểm tra rõ hơn. Muốn xuất theo cột cũ, cần giữ dữ liệu sau khi đọc.',
    checkpoint: { question: 'Chuyển vị ma trận 2 hàng 3 cột có kích thước nào?', options: ['2 hàng 3 cột', '3 hàng 2 cột', '6 hàng 1 cột'], answerIndex: 1, explanation: 'Chuyển vị đổi vai trò hàng và cột.' },
  },
  sorting: {
    title: 'Sắp xếp chọn và đoạn đầu đã hoàn thành',
    objective: 'Mô phỏng sắp xếp chọn, giữ phần tử lặp và giải thích số phép so sánh cơ bản.',
    concept: 'Ở lượt i, sắp xếp chọn tìm phần tử nhỏ nhất trong đoạn từ i đến cuối rồi đổi vào vị trí i. Sau lượt đó, đoạn đầu đến i đã được đặt đúng. Phải giữ số lần xuất hiện của từng giá trị; sắp xếp khác loại trùng. Với n phần tử, vòng tìm min thực hiện (n-1)+(n-2)+…+1 so sánh, tăng bậc hai theo n.',
    method: 'Dãy [3,1,3,-2,0]: lượt 0 chọn -2 → [-2,1,3,3,0]; lượt 1 chọn 0 → [-2,0,3,3,1]; lượt 2 chọn 1 → [-2,0,1,3,3]. Hai số 3 vẫn tồn tại. Với n=4, số so sánh là 3+2+1=6; bài thực hành nhỏ giúp quan sát thuật toán trước khi dùng thư viện trong sản phẩm.',
    checkpoint: { question: 'Sắp tăng [3,1,3] phải cho kết quả nào?', options: ['[1,3]', '[1,3,3]', '[3,3,1]'], answerIndex: 1, explanation: 'Sắp xếp thay thứ tự, không xóa phần tử trùng.' },
  },
};

const cppStarter = '#include <iostream>\n#include <vector>\n#include <string>\nint main() {\n    // Viết các bước theo hợp đồng đầu vào và đầu ra.\n    return 0;\n}\n';
const pythonStarter = '# Viết các bước theo hợp đồng đầu vào và đầu ra.\n';

function exercise(track: LearningTrack, definition: DualExercise): Practice {
  return {
    id: `intro-${track}-${definition.lessonSlug}-${definition.suffix}`,
    title: definition.title,
    language: track, prompt: definition.prompt,
    starterCode: track === 'cpp' ? cppStarter : pythonStarter,
    publicTests: definition.tests.map(test => ({ ...test })), hints: [...definition.hints],
    outcomeIds: [...introTopicOutcomes[definition.lessonSlug]!],
    difficulty: definition.kind === 'integration' ? 'integration' : definition.kind === 'transfer' ? 'independent' : 'guided',
    rubric: {
      machineChecked: ['Đầu ra khớp hợp đồng cho các ca được chạy.', 'Không vượt giới hạn thực thi và không có lỗi khi chạy.'],
      selfCheck: [...definition.selfCheck],
    },
  };
}

export function makeIntroLessons(track: LearningTrack): Lesson[] {
  const base = new Map(baseIntroLessons(track).map(lesson => [lesson.id.replace(`intro-${track}-`, ''), lesson]));
  return introTopicOrder.map((slug, index) => {
    const existing = base.get(slug);
    const descriptor = newTopics[slug];
    const primary = dualExercises.find(item => item.lessonSlug === slug && item.kind === 'primary');
    const title = existing ? existing.title.replace(/^\d+\.\s*/, '') : descriptor!.title;
    const previous = introTopicOrder[index - 1];
    const practice: Practice[] = existing?.practice?.map(item => ({
      ...item, title: 'Bài luyện có hướng dẫn',
      publicTests: [...item.publicTests.map(test => ({ ...test })), ...(primaryExtraTests[slug] ?? []).map(test => ({ ...test }))],
      outcomeIds: [...introTopicOutcomes[slug]!], difficulty: 'guided',
      rubric: { machineChecked: ['Đầu ra đúng theo đặc tả với các ca thử được chạy.', 'Xử lý ca biên công khai không lỗi.'], selfCheck: ['Tự viết giả mã hoặc bảng vết trước khi chạy.', 'Giải thích được biến, điều kiện và giới hạn dữ liệu.'] },
    })) ?? [exercise(track, primary!)];
    practice.push(...dualExercises.filter(item => item.lessonSlug === slug && item.kind !== 'primary').map(item => exercise(track, item)));
    return addIntroLearningTools({
      ...(existing ?? {
        id: `intro-${track}-${slug}`, courseId: 'intro-programming', track,
        objective: descriptor!.objective,
        sections: [{ heading: 'Khái niệm và hợp đồng', body: descriptor!.concept }, { heading: 'Ví dụ tự phân tích', body: descriptor!.method }],
        example: { language: track, code: primary![track], explanation: `Ca đầu vào đầu tiên trong bài luyện cho kết quả ${primary!.tests[0]!.output.trim()}. Hãy dự đoán bằng tay trước khi chạy ví dụ.` },
        checkpoint: descriptor!.checkpoint,
        sources: [track === 'cpp' ? 'https://eel.is/c++draft/' : 'https://docs.python.org/3/tutorial/'],
        reviewStatus: 'draft' as const,
      }),
      title: `${String(index + 1).padStart(2, '0')}. ${title}`,
      practice, outcomeIds: [...introTopicOutcomes[slug]!],
      prerequisiteLessonIds: previous ? [`intro-${track}-${previous}`] : [],
      estimatedMinutes: slug === 'budget-project' ? 150 : 50,
    } satisfies Lesson, slug, track);
  });
}

export const introLessons = [...makeIntroLessons('cpp'), ...makeIntroLessons('python')];

/** Authored public learning references, not official examination answer keys. */
export const practiceReferences: PracticeReference[] = introLessons.flatMap(lesson => {
  const track = lesson.track!;
  const slug = lesson.id.replace(`intro-${track}-`, '');
  return (lesson.practice ?? []).map(practice => {
    const definition = dualExercises.find(item => practice.id === `intro-${track}-${item.lessonSlug}-${item.suffix}`);
    const overrides: Record<string, string> = primaryReferenceOverrides[track];
    return {
      exerciseId: practice.id, lessonId: lesson.id, language: track,
      source: definition?.[track] ?? overrides[slug] ?? lesson.example!.code,
      tests: practice.publicTests.map(test => ({ ...test })),
    };
  });
});

export function getPracticeReference(exerciseId: string): PracticeReference | undefined {
  return practiceReferences.find(reference => reference.exerciseId === exerciseId);
}

export function introPracticeRequirements(track: LearningTrack) {
  const selected = introLessons.filter(lesson => lesson.track === track);
  const requiredIds = selected.flatMap(lesson => (lesson.practice ?? []).map(practice => practice.id));
  const earlyIds = selected.slice(0, 9).flatMap(lesson => (lesson.practice ?? []).map(practice => practice.id));
  const capstoneIds = introProject.milestones.map(milestone => `intro-${track}-budget-project-${milestone.exerciseSuffix}`);
  return { requiredIds, earlyIds, capstoneIds, capstoneId: capstoneIds[capstoneIds.length - 1]!, finalRequiredIds: [...new Set([...earlyIds, ...capstoneIds])] };
}
