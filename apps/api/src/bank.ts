import { readFileSync } from 'node:fs';
import { courses, languageBridges } from '@university-simulator/core';
import { lessons } from '@university-simulator/content';
import { ApiError, type AssessmentDefinition, type PrivateExercise, type PrivateQuestion } from './types.js';
import { createIntroDevelopmentAssessment, INTRO_DEVELOPMENT_VERSION } from './development-intro.js';

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
  const {assessments,exercises:m1Exercises}=createIntroDevelopmentAssessment(process.env.E2B_TEMPLATE_ID??'');
  const publicPractices=lessons.flatMap(lesson=>(lesson.practice??[]).filter(practice=>['cpp','python','javascript','sql'].includes(practice.language)&&practice.publicTests.length>0).map(practice=>({
    id:practice.id,courseId:lesson.courseId,title:lesson.title,language:practice.language as PrivateExercise['language'],prompt:practice.prompt,
    tests:practice.publicTests.map(test=>({input:test.input,expected:test.output,public:true})),timeoutSeconds:30,templateId:process.env.E2B_TEMPLATE_ID??'',
  })));
  return {
    version: `development-${INTRO_DEVELOPMENT_VERSION}`, reviewed: false, development: true, assessments,
    exercises: [...(['cpp', 'python'] as const).map(language => ({
      id: `intro-sum-${language}`, courseId: 'intro-programming', language,
      title: 'Tổng hai số nguyên', prompt: 'Đọc hai số nguyên từ stdin. In tổng của chúng ra stdout.',
      tests: [{ input: '2 3\n', expected: '5', public: true }, { input: '-7 4\n', expected: '-3' }, { input: '0 0\n', expected: '0' }, { input: '100000 -99999\n', expected: '1' }],
      timeoutSeconds: 30, templateId: process.env.E2B_TEMPLATE_ID ?? '',
    })),...m1Exercises,...publicPractices],
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
    if(!value.id||!value.prompt||!Array.isArray(value.options)||value.options.length!==0||(!value.exerciseId&&!value.exerciseIds)||((value.weight??1)<=0)||((value.weight??1)>10))throw new Error('Invalid code question.');
    return;
  }
  if (!value.id || !value.prompt || !Array.isArray(value.options) || value.options.length < 2 || new Set(value.options.map(option=>option.id)).size!==value.options.length || !value.options.some(o => o.id === value.correctOption)) {
    throw new Error('Assessment bank contains an invalid question.');
  }
}

export function validateAssessmentBank(bank:AssessmentBank,production=process.env.NODE_ENV==='production'):void {
    if (!bank.version || !Array.isArray(bank.assessments) || !Array.isArray(bank.exercises) || !Array.isArray(bank.placement)) throw new Error('Invalid private assessment bank format.');
    if(new Set(bank.assessments.map(assessment=>assessment.id)).size!==bank.assessments.length)throw new Error('Duplicate assessment IDs.');
    if(new Set(bank.exercises.map(exercise=>exercise.id)).size!==bank.exercises.length)throw new Error('Duplicate exercise IDs.');
    const variants=new Set<string>();
    for (const assessment of bank.assessments) {
      if (!assessment.id || !assessment.version || !assessment.courseId || !['midterm','final'].includes(assessment.kind) || !Number.isFinite(assessment.durationSeconds) || assessment.durationSeconds < 60 || assessment.durationSeconds > 14400 || !Number.isInteger(assessment.availableWeek) || assessment.availableWeek<1 || assessment.availableWeek>16 || assessment.questions.length === 0 || assessment.questions.length>200 || new Set(assessment.questions.map(question=>question.id)).size!==assessment.questions.length) throw new Error('Invalid private assessment definition.');
      assessment.questions.forEach(assertQuestion);
      const attemptNumber=(assessment as AssessmentDefinition&{attemptNumber?:number}).attemptNumber??1;
      if(![1,2].includes(attemptNumber)||(assessment.kind==='midterm'&&attemptNumber!==1))throw new Error('Invalid assessment attempt number.');
      const variant=`${assessment.courseId}:${assessment.kind}:${attemptNumber}`;
      if(variants.has(variant))throw new Error('Duplicate course assessment attempt variant.');
      variants.add(variant);
      if(assessment.questions.filter(question=>question.kind==='code').length>1)throw new Error('Version 1 supports at most one code question per assessment.');
      for(const question of assessment.questions.filter(question=>question.kind==='code')){
        const exerciseIds=question.exerciseIds?Object.values(question.exerciseIds):[question.exerciseId];
        if(exerciseIds.some(id=>!bank.exercises.some(exercise=>exercise.id===id&&exercise.courseId===assessment.courseId)))throw new Error('Code question references an unavailable exercise.');
        if(question.exerciseIds&&(['cpp','python'] as const).some(track=>!bank.exercises.some(exercise=>exercise.id===question.exerciseIds![track]&&exercise.language===track)))throw new Error('Code question track mapping is invalid.');
      }
    }
    if(new Set(bank.placement.map(group=>group.level)).size!==bank.placement.length)throw new Error('Duplicate placement levels.');
    for (const group of bank.placement) {
      if(![1,2,3].includes(group.level)||!Array.isArray(group.questions)||group.questions.length===0||new Set(group.questions.map(question=>question.id)).size!==group.questions.length)throw new Error('Invalid placement level.');
      group.questions.forEach(assertQuestion);
    }
    for (const exercise of bank.exercises) {
      if (!exercise.id || !exercise.tests?.length || exercise.tests.length>100 || !Number.isFinite(exercise.timeoutSeconds) || exercise.timeoutSeconds < 1 || exercise.timeoutSeconds > 300 || !['cpp', 'python', 'javascript', 'sql'].includes(exercise.language)) throw new Error('Invalid private exercise.');
      if(!courses.some(course=>course.id===exercise.courseId)&&!languageBridges.some(bridge=>bridge.id===exercise.courseId))throw new Error('Exercise references an unknown course.');
      if(exercise.tests.some(test=>typeof test.input!=='string'||typeof test.expected!=='string'||test.input.length>131072||test.expected.length>8192))throw new Error('Invalid or oversized exercise test data.');
      if(exercise.projectStage!==undefined&&![1,2,3].includes(exercise.projectStage))throw new Error('Invalid project stage.');
    }
    if (production) {
      if (bank.development || !bank.reviewed || bank.assessments.some(a => a.isPublicDevelopmentSample)) throw new Error('Production requires a reviewed private bank, not public samples.');
      const missing = courses.filter(course=>course.id==='office-skills'?false:course.kind==='project'
        ?![1,2,3].every(stage=>bank.exercises.some(exercise=>exercise.courseId===course.id&&exercise.projectStage===stage))
        :!bank.assessments.some(assessment=>assessment.courseId===course.id&&assessment.kind==='final')
          ||(course.kind==='standard'&&!bank.assessments.some(assessment=>assessment.courseId===course.id&&assessment.kind==='midterm'))
      ).map(course=>course.id);
      if (missing.length) throw new Error(`Private bank incomplete: ${missing.join(', ')}`);
      if (![1,2,3].every(level => bank.placement.some(group => group.level === level && group.questions.length >= 10))) throw new Error('Production placement requires all three reviewed levels.');
    }
}

export function loadAssessmentBank(): AssessmentBank | null {
  const privatePath = process.env.ASSESSMENT_BANK_PATH;
  if (privatePath) {
    const bank = JSON.parse(readFileSync(privatePath, 'utf8')) as AssessmentBank;
    validateAssessmentBank(bank);
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
