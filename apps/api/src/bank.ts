import { readFileSync } from 'node:fs';
import { courses } from '@university-simulator/core';
import { lessons } from '@university-simulator/content';
import { ApiError, type AssessmentDefinition, type PrivateExercise, type PrivateQuestion } from './types.js';

export interface AssessmentBank {
  version: string;
  reviewed: boolean;
  development: boolean;
  assessments: AssessmentDefinition[];
  exercises: PrivateExercise[];
  placement: { level: 1 | 2 | 3; questions: PrivateQuestion[] }[];
}

function question(id: string, prompt: string, options: string[], correct: number, explanation: string): PrivateQuestion {
  return { id, prompt, options: options.map((text, i) => ({ id: String(i), text })), correctOption: String(correct), explanation };
}

// Intentionally public, educational sample questions. These are NEVER an official private exam bank.
// Loading them requires ENABLE_DEV_ASSESSMENTS=true outside production.
export function createDevelopmentBank(): AssessmentBank {
  const q = [
    question('variable', 'Sau x = 3; x = x + 2, giá trị x là bao nhiêu?', ['3', '5', '2', 'Lỗi luôn xảy ra'], 1, 'Gán lại tổng 3 + 2 cho x.'),
    question('loop', 'Vòng lặp i nhận lần lượt 0, 1, 2, 3 chạy bao nhiêu lần?', ['3', '4', '5', '0'], 1, 'Có bốn giá trị đầu vào của thân lặp.'),
    question('branch', 'Muốn nhận số chẵn, điều kiện nào đúng?', ['n % 2 == 0', 'n > 2', 'n / 2 == 0', 'n == 2'], 0, 'Số chẵn có số dư bằng 0 khi chia cho 2.'),
    question('function', 'Lợi ích trực tiếp của tách một tác vụ lặp thành hàm là gì?', ['Luôn chạy nhanh gấp đôi', 'Tự sửa mọi lỗi', 'Tái sử dụng và kiểm thử độc lập', 'Không cần dữ liệu đầu vào'], 2, 'Hàm cung cấp một đơn vị hành vi có đầu vào/đầu ra rõ ràng.'),
    question('boundary', 'Kiểm tra chương trình xử lý danh sách cần có trường hợp nào?', ['Chỉ dữ liệu rất lớn', 'Danh sách rỗng và danh sách một phần tử', 'Chỉ danh sách tăng dần', 'Chỉ số dương'], 1, 'Trường hợp biên thường bộc lộ lỗi giả định đầu vào.'),
    question('debug', 'Khi một kiểm thử thất bại, bước hữu ích đầu tiên là gì?', ['Xóa kiểm thử', 'Đổi ngẫu nhiên nhiều dòng', 'Tái hiện lỗi với đầu vào nhỏ và so sánh kết quả mong đợi', 'Bỏ mọi điều kiện'], 2, 'Ví dụ nhỏ có thể tái hiện giúp tìm chính xác nguyên nhân.'),
  ];
  const assessments: AssessmentDefinition[] = ['midterm', 'final'].map(kind => ({
    id: `development-intro-${kind}`, version: 'sample.1', courseId: 'intro-programming', kind: kind as 'midterm' | 'final',
    durationSeconds: kind === 'midterm' ? 1800 : 2700, availableWeek: kind === 'midterm' ? 8 : 16,
    questions: q.map(item => structuredClone(item)), isPublicDevelopmentSample: true,
  }));
  assessments.find(assessment=>assessment.kind==='final')!.questions.push({
    id:'intro-final-code',kind:'code',prompt:'Đọc hai số nguyên từ stdin và in tổng của chúng. Nộp mã nguồn đầy đủ; kết quả được kiểm thử trong môi trường cô lập. Điều kiện qua môn: đạt ít nhất 50% kiểm thử của bài lập trình cuối kỳ.',options:[],correctOption:'',explanation:'Bài mẫu công khai để kiểm chứng luồng thi lập trình; không phải đề thi riêng đã được kiểm định.',weight:4,requiredPassRatio:0.5,
    exerciseIds:{cpp:'intro-sum-cpp',python:'intro-sum-python'},
    starterCodes:{cpp:'#include <iostream>\nint main() {\n  // Đọc hai số và in tổng\n  return 0;\n}\n',python:'# Đọc hai số nguyên từ stdin và in tổng\n'},
  });
  const publicPractices=lessons.flatMap(lesson=>(lesson.practice??[]).filter(practice=>['cpp','python','javascript','sql'].includes(practice.language)&&practice.publicTests.length>0).map(practice=>({
    id:practice.id,courseId:lesson.courseId,title:lesson.title,language:practice.language as PrivateExercise['language'],prompt:practice.prompt,
    tests:practice.publicTests.map(test=>({input:test.input,expected:test.output,public:true})),timeoutSeconds:30,templateId:process.env.E2B_TEMPLATE_ID??'',
  })));
  return {
    version: 'development-samples.1', reviewed: false, development: true, assessments,
    exercises: [...(['cpp', 'python'] as const).map(language => ({
      id: `intro-sum-${language}`, courseId: 'intro-programming', language,
      title: 'Tổng hai số nguyên', prompt: 'Đọc hai số nguyên từ stdin. In tổng của chúng ra stdout.',
      tests: [{ input: '2 3\n', expected: '5', public: true }, { input: '-7 4\n', expected: '-3' }, { input: '0 0\n', expected: '0' }, { input: '100000 -99999\n', expected: '1' }],
      timeoutSeconds: 30, templateId: process.env.E2B_TEMPLATE_ID ?? '',
    })),...publicPractices],
    placement: [
      { level: 1, questions: [question('en1-1', 'Choose the correct sentence.', ['She study every day.', 'She studies every day.', 'She studying every day.'], 1, 'Third-person singular present simple uses studies.'), question('en1-2', '“I am a student.” means:', ['Tôi là sinh viên.', 'Tôi đã tốt nghiệp.', 'Tôi là giảng viên.'], 0, 'A student is a learner.'), question('en1-3', 'Complete: There ___ two books on the desk.', ['is', 'are', 'am'], 1, 'Use are with plural books.')] },
      { level: 2, questions: [question('en2-1', 'Complete: If it rains, we ___ indoors.', ['will stay', 'would stayed', 'staying'], 0, 'First conditional: if + present, will + base verb.'), question('en2-2', 'Choose the equivalent: “This task must be finished by Friday.”', ['Finishing on Friday is optional.', 'Friday is the deadline.', 'The task starts on Friday.'], 1, 'By Friday expresses a deadline.'), question('en2-3', 'Complete: I have lived here ___ 2022.', ['for', 'since', 'during'], 1, 'Since introduces a starting point.')] },
      { level: 3, questions: [question('en3-1', '“Although the method is efficient, it requires more memory.” Which statement follows?', ['It uses no memory.', 'Efficiency and memory use can be trade-offs.', 'It is always the best method.'], 1, 'The contrast describes a trade-off, not universal superiority.'), question('en3-2', 'Choose a suitable formal request.', ['Send it now!', 'Could you clarify the requirements?', 'You wrong.'], 1, 'A formal request should be clear and polite.'), question('en3-3', '“The results suggest a correlation.” Does this prove causation?', ['Yes, always.', 'No, correlation alone does not establish causation.', 'Only if the chart is blue.'], 1, 'Correlation alone does not demonstrate cause and effect.')] },
    ],
  };
}

function assertQuestion(value: PrivateQuestion) {
  if(value.kind!==undefined&&!['choice','code'].includes(value.kind))throw new Error('Unknown assessment question kind.');
  if(value.weight!==undefined&&(typeof value.weight!=='number'||!Number.isFinite(value.weight)||value.weight<=0||value.weight>10))throw new Error('Question weight must be a finite number from 0 to 10.');
  if(value.kind==='code'){
    if(value.requiredPassRatio!==undefined&&(typeof value.requiredPassRatio!=='number'||!Number.isFinite(value.requiredPassRatio)||value.requiredPassRatio<0||value.requiredPassRatio>1))throw new Error('Code pass ratio must be a finite number from 0 to 1.');
    if(!value.id||!value.prompt||value.options.length!==0||(!value.exerciseId&&!value.exerciseIds)||((value.weight??1)<=0)||((value.weight??1)>10))throw new Error('Invalid code question.');
    return;
  }
  if (!value.id || !value.prompt || !Array.isArray(value.options) || value.options.length < 2 || !value.options.some(o => o.id === value.correctOption)) {
    throw new Error('Assessment bank contains an invalid question.');
  }
}

export function loadAssessmentBank(): AssessmentBank | null {
  const privatePath = process.env.ASSESSMENT_BANK_PATH;
  if (privatePath) {
    const bank = JSON.parse(readFileSync(privatePath, 'utf8')) as AssessmentBank;
    if (!bank.version || !Array.isArray(bank.assessments) || !Array.isArray(bank.exercises) || !Array.isArray(bank.placement)) throw new Error('Invalid private assessment bank format.');
    for (const assessment of bank.assessments) {
      if (!assessment.id || !assessment.version || !assessment.courseId || !['midterm','final'].includes(assessment.kind) || !Number.isFinite(assessment.durationSeconds) || assessment.durationSeconds < 60 || assessment.durationSeconds > 14400 || !Number.isInteger(assessment.availableWeek) || assessment.availableWeek<1 || assessment.availableWeek>16 || assessment.questions.length === 0 || assessment.questions.length>200 || new Set(assessment.questions.map(question=>question.id)).size!==assessment.questions.length) throw new Error('Invalid private assessment definition.');
      assessment.questions.forEach(assertQuestion);
      if(assessment.questions.filter(question=>question.kind==='code').length>1)throw new Error('Version 1 supports at most one code question per assessment.');
      for(const question of assessment.questions.filter(question=>question.kind==='code')){
        const exerciseIds=question.exerciseIds?Object.values(question.exerciseIds):[question.exerciseId];
        if(exerciseIds.some(id=>!bank.exercises.some(exercise=>exercise.id===id&&exercise.courseId===assessment.courseId)))throw new Error('Code question references an unavailable exercise.');
        if(question.exerciseIds&&(['cpp','python'] as const).some(track=>!bank.exercises.some(exercise=>exercise.id===question.exerciseIds![track]&&exercise.language===track)))throw new Error('Code question track mapping is invalid.');
      }
    }
    for (const group of bank.placement) group.questions.forEach(assertQuestion);
    for (const exercise of bank.exercises) {
      if (!exercise.id || !exercise.tests?.length || exercise.timeoutSeconds < 1 || exercise.timeoutSeconds > 300 || !['cpp', 'python', 'javascript', 'sql'].includes(exercise.language)) throw new Error('Invalid private exercise.');
    }
    if (process.env.NODE_ENV === 'production') {
      if (bank.development || !bank.reviewed || bank.assessments.some(a => a.isPublicDevelopmentSample)) throw new Error('Production requires a reviewed private bank, not public samples.');
      const missing = courses.filter(course=>course.id==='office-skills'?false:course.kind==='project'
        ?![1,2,3].every(stage=>bank.exercises.some(exercise=>exercise.courseId===course.id&&exercise.projectStage===stage))
        :!bank.assessments.some(assessment=>assessment.courseId===course.id&&assessment.kind==='final')
          ||(course.kind==='standard'&&!bank.assessments.some(assessment=>assessment.courseId===course.id&&assessment.kind==='midterm'))
      ).map(course=>course.id);
      if (missing.length) throw new Error(`Private bank incomplete: ${missing.join(', ')}`);
      if (![1,2,3].every(level => bank.placement.some(group => group.level === level && group.questions.length >= 10))) throw new Error('Production placement requires all three reviewed levels.');
    }
    return bank;
  }
  if (process.env.NODE_ENV !== 'production' && process.env.ENABLE_DEV_ASSESSMENTS === 'true') return createDevelopmentBank();
  return null;
}

export function publicQuestion(question: PrivateQuestion) {
  return { id: question.id, prompt: question.prompt, options: question.options.map(option => ({ ...option })),kind:question.kind??'choice',language:question.language,starterCode:question.starterCode,weight:question.weight??1,requiredPassRatio:question.kind==='code'?question.requiredPassRatio??0.5:undefined };
}
export function gradeAnswers(questions: PrivateQuestion[], answers: Record<string, string>) {
  const choices=questions.filter(question=>question.kind!=='code');
  return choices.length?Math.round(choices.filter(question => answers[question.id] === question.correctOption).length / choices.length * 100) / 10:0;
}
export function requireBank(bank: AssessmentBank | null): AssessmentBank {
  if (!bank) throw new ApiError(503, 'Ngân hàng đánh giá chưa được cấu hình. Bài học vẫn có thể đọc và luyện tập.', 'assessment_unavailable');
  return bank;
}
