import { randomUUID } from 'node:crypto';
import {
  applyPlacement, auditGraduation, calculateCourseGrade, courses, getCourse,
  getProgramCourses, getTranscriptSummary, programs, validateEnrollment, languageBridges, assessOfficeArtifact,
  type ProgramId, type ProgrammingTrack,
} from '@university-simulator/core';
import { getLesson, getLessons } from '@university-simulator/content';
import { gradeAnswers, publicQuestion, requireBank, type AssessmentBank } from './bank.js';
import { ApiError, type CourseProgress, type ExamAttempt, type StudentDocument, type Submission,type AuditEvent } from './types.js';
import type { Store } from './store.js';
import {applyExamSubmission,applyGradedExam,calculateExamScore,recordCourseGrade,recomputeExamComponents} from './assessment.js';

export interface Capabilities {
  developmentAuth: boolean;
  assessmentMode: 'unavailable' | 'development-samples' | 'private-reviewed';
  codeExecution: boolean;
  productionReady: boolean;
  curriculumVersion: string;
  contentStatus: string;
}

export function bodyObject(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new ApiError(400, 'Dữ liệu gửi lên không hợp lệ.');
  return value as Record<string, unknown>;
}
export function textField(value: unknown, name: string, max = 120): string {
  if (typeof value !== 'string' || value.trim().length < 1 || value.length > max) throw new ApiError(400, `${name} không hợp lệ.`);
  return value.trim();
}
function answersField(value: unknown): Record<string, string> {
  const object = bodyObject(value);
  if (Object.keys(object).length > 200) throw new ApiError(400, 'Có quá nhiều câu trả lời.');
  const answers: Record<string, string> = {};
  for (const [key, item] of Object.entries(object)) {
    if (key.length > 100 || typeof item !== 'string' || item.length > 64000) throw new ApiError(400, 'Câu trả lời không hợp lệ.');
    answers[key] = item;
  }
  return answers;
}

const activityDefinitions = {
  meal: { title: 'Nấu một bữa cơm', amount: -35000, energy: 18, stress: -6 },
  rest: { title: 'Nghỉ ngơi', amount: 0, energy: 30, stress: -15 },
  job: { title: 'Làm thêm tại thư viện', amount: 120000, energy: -20, stress: 8 },
  volunteer: { title: 'Tình nguyện cùng câu lạc bộ', amount: 0, energy: -12, stress: -8 },
  friend: { title: 'Gặp bạn ở sân trường', amount: -20000, energy: 2, stress: -12 },
  commute: { title: 'Đi học an toàn', amount: -7000, energy: -4, stress: -2 },
  aid: { title: 'Hỗ trợ khẩn cấp từ quỹ sinh viên', amount: 300000, energy: 0, stress: -8 },
  rent: { title: 'Chuyển sang phòng trọ', amount: -1200000, energy: -5, stress: 5 },
  dorm: { title: 'Trở lại ký túc xá', amount: 0, energy: 0, stress: -5 },
} as const;

function progressFor(student: StudentDocument, courseId: string): CourseProgress {
  return student.progress[courseId] ??= { courseId, lessons: [], attendance: [], practice: [], checkpointScores: {} };
}
function activeEnrollment(student: StudentDocument, courseId: string) {
  return student.enrollments.some(enrollment => enrollment.semester === student.semester && enrollment.courseId === courseId);
}
function ledger(student: StudentDocument, activityId: string, amount: number, at: string) {
  student.balance += amount;
  student.ledger.push({ id: randomUUID(), activityId, amount, balance: student.balance, at });
}
function publicExam(exam: ExamAttempt) {
  return {
    id: exam.id, courseId: exam.courseId, kind: exam.kind, semester: exam.semester,
    startedAt: exam.startedAt, deadlineAt: exam.deadlineAt, savedAt: exam.savedAt,
    acceptedAt: exam.acceptedAt, submittedAt: exam.submittedAt, status: exam.status,
    score: exam.score, answers: exam.answers, reason: exam.reason,
    assessmentVersion: exam.definition.version,
    developmentSample: exam.definition.isPublicDevelopmentSample,
    gradingSubmissionId:exam.gradingSubmissionId,gradingError:exam.gradingError,codeResult:exam.codeResult,
    questions: exam.definition.questions.map(publicQuestion),
  };
}
export function publicStudent(student: StudentDocument | null) {
  if (!student) return null;
  const { exams, activityKeys, administrativeEvents, ...rest } = student;
  return { ...rest, exams: exams.map(publicExam), summary: getTranscriptSummary(student.grades), graduation: auditGraduation(student.major, student.grades) };
}

export class UniversityService {
  constructor(
    readonly store: Store,
    readonly bank: AssessmentBank | null,
    readonly capabilities: Capabilities,
    readonly now: () => number = Date.now,
    readonly executionPreflight: () => Promise<void> = async()=>undefined,
  ) {}

  async bootstrap(userId: string) {
    await this.reconcileExams(userId);
    const current = await this.store.getStudent(userId);
    return {
      student: publicStudent(current), courses, programs, capabilities: this.capabilities,
      placementQuestions: this.bank?.placement.map(group => ({ level: group.level, questions: group.questions.map(publicQuestion) })) ?? [],
      activities: Object.entries(activityDefinitions).map(([id, activity]) => ({ id, ...activity })),
      exercises: this.bank?.exercises.map(exercise => ({ id: exercise.id, courseId: exercise.courseId, title: exercise.title, language: exercise.language, prompt: exercise.prompt, projectStage:exercise.projectStage })) ?? [],
      serverTime: new Date(this.now()).toISOString(),
    };
  }
  async createStudent(userId: string, body: Record<string, unknown>) {
    const displayName = textField(body.displayName, 'Tên sinh viên', 50);
    if (!['it','cs'].includes(String(body.major)) || !['cpp','python'].includes(String(body.track))) throw new ApiError(400, 'Ngành hoặc ngôn ngữ nhập môn không hợp lệ.');
    const at = new Date(this.now()).toISOString();
    const student: StudentDocument = {
      id: userId, displayName, major: body.major as ProgramId, track: body.track as ProgrammingTrack,
      curriculumVersion:'2026.v1',
      semester: 1, week: 1, day: 1, energy: 90, stress: 12, balance: 6000000,
      housing: 'dorm', createdAt: at, updatedAt: at, revision: 1,
      enrollments: [], grades: [], completedLessons: [], completedBridges: [], attendance: [], progress: {},
      relationships: { advisor: 15, linh: 10, minh: 10, an: 5 }, ledger: [], exemptions: [], credentials: [], exams: [], activityKeys: [],
    };
    return { student: publicStudent(await this.store.createStudent(student)) };
  }
  async placement(userId: string, body: Record<string, unknown>) {
    const bank = requireBank(this.bank);
    const answers = answersField(body.answers);
    let level = 0;
    const breakdown: {level:number; score:number}[] = [];
    for (const group of [...bank.placement].sort((a,b) => a.level - b.level)) {
      const score = gradeAnswers(group.questions, answers);
      breakdown.push({level:group.level, score});
      if (group.level === level + 1 && score >= 7.5) level = group.level;
    }
    const student = await this.store.mutateStudent(userId, student => {
      if (student.placementSemester === student.semester) throw new ApiError(409, 'Bạn đã làm bài xếp lớp trong học kỳ này. Có thể kiểm tra lại ở kỳ sau.', 'placement_already_taken');
      const enrolledEnglish = student.enrollments.some(enrollment => enrollment.semester === student.semester && /^english-[123]$/.test(enrollment.courseId));
      if (enrolledEnglish) throw new ApiError(409, 'Hãy làm bài xếp lớp trước khi đăng ký các môn tiếng Anh.');
      student.grades = applyPlacement(student.grades, level as 0|1|2|3, student.semester);
      student.exemptions = student.grades.filter(grade => grade.status === 'exempt').map(grade => grade.courseId);
      student.placementLevel = Math.max(student.placementLevel ?? 0, level);
      student.placementAt = new Date(this.now()).toISOString(); student.placementSemester = student.semester;
    });
    return { student: publicStudent(student), level, breakdown, developmentSample: bank.development };
  }
  async enroll(userId: string, body: Record<string, unknown>) {
    if (!Array.isArray(body.courseIds) || body.courseIds.length > 15 || body.courseIds.some(id => typeof id !== 'string')) throw new ApiError(400, 'Danh sách học phần không hợp lệ.');
    const courseIds = body.courseIds as string[];
    if (new Set(courseIds).size !== courseIds.length) throw new ApiError(400, 'Danh sách đăng ký có môn bị lặp.');
    const sections = body.sections ? answersField(body.sections) : {};
    const student = await this.store.mutateStudent(userId, student => {
      if (student.week > 2) throw new ApiError(409, 'Đợt đăng ký kết thúc sau tuần 2 của học kỳ.');
      const existing = student.enrollments.filter(item => item.semester === student.semester);
      const combined = [...courseIds];
      const removed=existing.filter(item=>!combined.includes(item.courseId));
      if(removed.some(item=>student.exams.some(exam=>exam.courseId===item.courseId&&exam.semester===student.semester&&exam.status!=='void')))throw new ApiError(409,'Không thể rút học phần đã bắt đầu đánh giá chính thức.','withdrawal_assessment_started');
      const selectedSections = Object.fromEntries(existing.map(item => [item.courseId,item.section]));
      Object.assign(selectedSections, sections);
      const bridges=languageBridges.filter(bridge=>bridge.forTracks.includes(student.track)&&bridge.beforeCourseIds.some(id=>courseIds.includes(id))&&!(student.completedBridges??[]).includes(bridge.id));
      if(bridges.length)throw new ApiError(409,`Hoàn thành bài chuyển tiếp trước khi đăng ký: ${bridges.map(bridge=>bridge.title).join(', ')}.`,'language_bridge_required');
      const allowImprovement=body.allowImprovement===true;
      for(const id of combined){
        const completed=student.grades.some(grade=>grade.courseId===id&&grade.status!=='failed');
        if(completed&&allowImprovement&&(!student.grades.some(grade=>grade.courseId===id&&grade.status==='passed'&&grade.semester<student.semester)||student.grades.some(grade=>grade.courseId===id&&grade.status==='passed'&&grade.semester===student.semester)))throw new ApiError(409,'Chỉ học cải thiện học phần đã đạt trong học kỳ trước; môn miễn học không được tự đổi thành điểm GPA.','improvement_not_eligible');
      }
      const isRepeat = combined.every(id => student.grades.some(grade => grade.courseId === id && (grade.status === 'failed'||(allowImprovement&&grade.status==='passed'&&grade.semester<student.semester))));
      const validated = combined.length?validateEnrollment({ major: student.major, courseIds: combined, transcript: student.grades, semester: student.semester, sections: selectedSections, allowUnderload: student.semester >= 8 || isRepeat,allowImprovement }):{valid:true,errors:[],credits:0};
      if (!validated.valid) throw new ApiError(400, validated.errors.join(' '), 'enrollment_invalid');
      const at = new Date(this.now()).toISOString();
      for(const enrollment of removed){
        ledger(student,`tuition-refund:${student.semester}:${enrollment.courseId}`,enrollment.tuitionPaid??getCourse(enrollment.courseId)!.credits*150000,at);
        if(enrollment.tuitionSupport)ledger(student,`tuition-support-return:${student.semester}:${enrollment.courseId}`,-enrollment.tuitionSupport,at);
      }
      student.enrollments=student.enrollments.filter(item=>item.semester!==student.semester||combined.includes(item.courseId));
      for(const enrollment of student.enrollments)if(enrollment.semester===student.semester&&selectedSections[enrollment.courseId])enrollment.section=selectedSections[enrollment.courseId];
      for (const id of courseIds) {
        if (existing.some(item => item.courseId === id)) continue;
        const course = getCourse(id)!;
        const fee = course.credits * 150000;
        const support=Math.max(0,fee-Math.max(0,student.balance));
        student.enrollments.push({ courseId: id, semester: student.semester, section: selectedSections[id] ?? course.slots[0] ?? '', enrolledAt: at,tuitionPaid:fee,tuitionSupport:support });
        if(support)ledger(student,`tuition-support:${student.semester}:${id}`,support,at);
        ledger(student, `tuition:${student.semester}:${id}`, -fee, at);
        student.progress[id] = { courseId: id, lessons: [], attendance: [], practice: [], checkpointScores: {} };
      }
    });
    return { student: publicStudent(student) };
  }
  async checkpoint(userId: string, body: Record<string, unknown>) {
    const courseId = textField(body.courseId, 'Môn học');
    const lessonId = textField(body.lessonId, 'Bài học');
    const answer = textField(body.answer, 'Câu trả lời');
    const student = await this.store.getStudent(userId);
    if (!student) throw new ApiError(404, 'Chưa tạo sinh viên.');
    const bridge=languageBridges.find(bridge=>bridge.id===courseId&&bridge.forTracks.includes(student.track));
    if (!activeEnrollment(student,courseId) && getCourse(courseId)?.category !== 'requirement' && !bridge) throw new ApiError(403, 'Bạn cần đăng ký học phần để ghi nhận hoạt động.');
    const lesson = getLesson(lessonId);
    if (!lesson || lesson.courseId !== courseId || !getLessons(courseId, student.track).some(item => item.id === lessonId)) throw new ApiError(404, 'Không tìm thấy bài học cho lộ trình đã chọn.');
    // Public practice keys are educational feedback, never a substitute for the sealed exam bank.
    const checkpoint = lesson.checkpoint;
    if (!checkpoint) throw new ApiError(409, 'Bài này chưa có câu kiểm tra được công bố.');
    const answerIndex = Number(answer);
    if (!Number.isInteger(answerIndex) || answerIndex < 0 || answerIndex >= checkpoint.options.length) throw new ApiError(400, 'Lựa chọn không hợp lệ.');
    const correct = answerIndex === checkpoint.answerIndex;
    const updated = await this.store.mutateStudent(userId, current => {
      const progress = progressFor(current, courseId);
      progress.checkpointScores ??= {};
      progress.checkpointScores[lessonId] = Math.max(progress.checkpointScores[lessonId] ?? 0, correct ? 10 : 0);
      progress.practice = Object.values(progress.checkpointScores);
      if (!bridge && !progress.attendance.includes(lessonId)) progress.attendance.push(lessonId);
      if (!bridge && !current.attendance.includes(lessonId)) current.attendance.push(lessonId);
      if (correct) {
        if (!progress.lessons.includes(lessonId)) progress.lessons.push(lessonId);
        if (!current.completedLessons.includes(lessonId)) current.completedLessons.push(lessonId);
        if(bridge&&getLessons(bridge.id,current.track).filter(lesson=>lesson.checkpoint).every(lesson=>current.completedLessons.includes(lesson.id))){
          current.completedBridges??=[];
          if(!current.completedBridges.includes(bridge.id))current.completedBridges.push(bridge.id);
        }
      }
    });
    return { student: publicStudent(updated), correct, explanation: checkpoint.explanation };
  }
  private recordCourseGrade(student:StudentDocument,courseId:string){recordCourseGrade(student,courseId);}
  private finalize(student: StudentDocument, exam: ExamAttempt, key: string) {
    if (exam.status !== 'active') return;
    exam.submittedAt = new Date(this.now()).toISOString();
    exam.acceptedAt = new Date(Math.min(this.now(),Date.parse(exam.deadlineAt))).toISOString();
    exam.submissionKey = key;
    exam.answers={...exam.answers};
    if(exam.definition.questions.some(question=>question.kind==='code')){
      exam.status='grading';exam.gradingSubmissionId=randomUUID();exam.gradingDispatchPending=true;
    }else{
      exam.score=calculateExamScore(exam);exam.status='graded';applyGradedExam(student,exam);
    }
  }
  private finalizeExpired(student: StudentDocument) {
    for (const exam of student.exams) {
      if (exam.status === 'active' && Date.parse(exam.deadlineAt) <= this.now()) this.finalize(student,exam,`timeout:${exam.id}`);
    }
  }
  async reconcileExams(userId:string){
    let student=await this.store.getStudent(userId);if(!student)return null;
    if(student.exams.some(exam=>exam.status==='active'&&Date.parse(exam.deadlineAt)<=this.now()))student=await this.store.mutateStudent(userId,current=>this.finalizeExpired(current));
    for(const pending of student.exams.filter(exam=>exam.status==='grading')){
      const code=pending.definition.questions.find(question=>question.kind==='code');
      if(!code||!pending.gradingSubmissionId||!pending.codeExerciseSnapshot)continue;
      if(pending.gradingDispatchPending){
        try{
          let submission=await this.store.getSubmission(pending.gradingSubmissionId);
          if(!submission){
            submission={id:pending.gradingSubmissionId,userId,courseId:pending.courseId,exerciseId:pending.codeExerciseSnapshot.id,language:pending.codeExerciseSnapshot.language,source:pending.answers[code.id]??'',status:'queued',createdAt:pending.submittedAt!,acceptedAt:pending.acceptedAt!,assessmentVersion:pending.bankVersion??pending.definition.version,semester:pending.semester,examId:pending.id,questionId:code.id};
            try{await this.store.enqueueSubmission(submission);}catch(error){if(!(await this.store.getSubmission(submission.id)))throw error;}
          }
          await this.store.mutateStudent(userId,current=>{
            const exam=current.exams.find(exam=>exam.id===pending.id);
            if(exam&&exam.gradingSubmissionId===pending.gradingSubmissionId)exam.gradingDispatchPending=false;
          });
        }catch{
          // The frozen attempt itself is a durable outbox. A restart or queue outage cannot lose accepted source.
          continue;
        }
      }
      const submission=await this.store.getSubmission(pending.gradingSubmissionId);
      if(submission&&['passed','failed','error'].includes(submission.status))await this.store.mutateStudent(userId,current=>applyExamSubmission(current,submission));
    }
    return this.store.getStudent(userId);
  }
  async startExam(userId: string, body: Record<string,unknown>) {
    const bank = requireBank(this.bank);
    const courseId = textField(body.courseId,'Môn học');
    if(courseId==='office-skills')throw new ApiError(409,'Tin học văn phòng được hoàn thành bằng sản phẩm văn bản, bảng tính và trình chiếu có kiểm chứng.','office_practical_required');
    if (!['midterm','final'].includes(String(body.kind))) throw new ApiError(400,'Loại kỳ thi không hợp lệ.');
    const kind = body.kind as 'midterm'|'final';
    const definition = bank.assessments.find(item => item.courseId === courseId && item.kind === kind);
    if(getCourse(courseId)?.kind==='project')throw new ApiError(409,'Môn đồ án được đánh giá bằng ba mốc sản phẩm đã kiểm chứng, không cấp tín chỉ bằng bài thi chọn đáp án.','project_assessment_required');
    if (!definition) throw new ApiError(503,'Học phần này chưa có bộ đánh giá sẵn sàng.','assessment_not_ready');
    const previous=await this.reconcileExams(userId);
    const resumed=previous?.exams.find(exam=>exam.courseId===courseId&&exam.kind===kind&&exam.semester===previous.semester&&['active','grading','grading-error'].includes(exam.status));
    if(resumed)return {student:publicStudent(previous),exam:publicExam(resumed),serverTime:new Date(this.now()).toISOString()};
    const hasCode=definition.questions.some(question=>question.kind==='code');
    if(hasCode){
      if(!this.capabilities.codeExecution)throw new ApiError(503,'Chưa có dịch vụ chấm mã sẵn sàng để mở kỳ thi lập trình.','execution_unavailable');
      await this.executionPreflight();
      if(await this.store.gradingBacklog()>=100)throw new ApiError(503,'Hàng đợi đang đầy; chưa bắt đầu tính giờ thi.','grading_capacity_unavailable');
      if(await this.store.hasPendingSubmission(userId))throw new ApiError(409,'Chờ bài chấm hiện tại hoàn tất trước khi mở kỳ thi lập trình.','submission_pending');
    }
    let examId = '';
    const student = await this.store.mutateStudent(userId,student => {
      this.finalizeExpired(student);
      if (!activeEnrollment(student,courseId) && getCourse(courseId)?.category !== 'requirement') throw new ApiError(403,'Bạn chưa đăng ký học phần.');
      const active = student.exams.find(item => item.courseId === courseId && item.kind === kind && item.semester === student.semester && item.status === 'active');
      if (active) { examId = active.id; return; }
      if (student.week < definition.availableWeek) throw new ApiError(409,`Kỳ thi mở từ tuần ${definition.availableWeek} trong game.`);
      if (student.exams.some(item => ['active','grading','grading-error'].includes(item.status))) throw new ApiError(409,'Hãy hoàn tất hoặc xử lý lượt thi đang diễn ra trước.');
      const attempts = student.exams.filter(item => item.courseId === courseId && item.kind === kind && item.semester === student.semester && item.status !== 'void');
      if (attempts.length >= (kind === 'final' ? 2 : 1)) throw new ApiError(409,'Đã hết lượt thi trong học kỳ này.');
      if (kind === 'final' && student.grades.some(item => item.courseId === courseId && item.semester === student.semester && item.status === 'passed')) throw new ApiError(409,'Bạn đã có kết quả học phần đạt yêu cầu.');
      if (courseId === 'intro-programming' && kind === 'final' && !student.progress[courseId]?.checkpointScores?.['verified-code']) throw new ApiError(409,'Hoàn thành ít nhất một bài lập trình được kiểm thử trước khi thi cuối kỳ.','code_practice_required');
      const startedAt = new Date(this.now()).toISOString();
      const attempt: ExamAttempt = {
        id:randomUUID(),courseId,kind,semester:student.semester,definition:structuredClone(definition),
        startedAt,deadlineAt:new Date(this.now()+definition.durationSeconds*1000).toISOString(),status:'active',answers:{},
      };
      attempt.bankVersion=bank.version;
      const code=attempt.definition.questions.find(question=>question.kind==='code');
      if(code){
        code.exerciseId=code.exerciseIds?.[student.track]??code.exerciseId;
        const exercise=bank.exercises.find(exercise=>exercise.id===code.exerciseId&&exercise.courseId===courseId);
        if(!exercise)throw new ApiError(503,'Môi trường đề thi cho lộ trình này chưa sẵn sàng.','assessment_not_ready');
        code.language=exercise.language;code.starterCode=code.starterCodes?.[student.track]??code.starterCode??'';
        attempt.codeExerciseSnapshot=structuredClone(exercise);
      }
      student.exams.push(attempt); examId = attempt.id;
      if(attempt.codeExerciseSnapshot){
        const seconds=attempt.codeExerciseSnapshot.timeoutSeconds+15;
        return [...new Set([attempt.startedAt.slice(0,7),attempt.deadlineAt.slice(0,7)])].map(month=>({id:`exam-${attempt.id}-${month}`,month,seconds,limit:Number(process.env.EXECUTION_MONTHLY_SECONDS??1000000)}));
      }
    });
    return {student:publicStudent(student),exam:publicExam(student.exams.find(item => item.id === examId)!),serverTime:new Date(this.now()).toISOString()};
  }
  async exam(userId:string,examId:string) {
    const student = await this.reconcileExams(userId);
    if(!student)throw new ApiError(404,'Chưa tạo sinh viên.');
    const exam = student.exams.find(item => item.id === examId);
    if (!exam) throw new ApiError(404,'Không tìm thấy lượt thi.');
    return {exam:publicExam(exam),student:publicStudent(student),serverTime:new Date(this.now()).toISOString()};
  }
  async saveExam(userId:string,examId:string,body:Record<string,unknown>) {
    const answers = answersField(body.answers);
    let expired = false;
    const student = await this.store.mutateStudent(userId,student => {
      const exam = student.exams.find(item => item.id === examId);
      if (!exam) throw new ApiError(404,'Không tìm thấy lượt thi.');
      if (exam.status !== 'active') throw new ApiError(409,'Lượt thi đã kết thúc.');
      if (Date.parse(exam.deadlineAt) <= this.now()) { this.finalize(student,exam,`timeout:${exam.id}`); expired = true; return; }
      const allowed = new Set(exam.definition.questions.map(question => question.id));
      for (const [key,value] of Object.entries(answers)) {
        const question = exam.definition.questions.find(question => question.id === key);
        if (!allowed.has(key) || (question?.kind!=='code'&&!question?.options.some(option => option.id === value))) throw new ApiError(400,'Có câu trả lời không thuộc đề thi.');
      }
      exam.answers = {...exam.answers,...answers}; exam.savedAt = new Date(this.now()).toISOString();
    });
    const reconciled=await this.reconcileExams(userId)??student;
    return {student:publicStudent(reconciled),exam:publicExam(reconciled.exams.find(item => item.id === examId)!),expired,serverTime:new Date(this.now()).toISOString()};
  }
  async submitExam(userId:string,examId:string,body:Record<string,unknown>) {
    const key = textField(body.idempotencyKey,'Mã nộp bài',100);
    const student = await this.store.mutateStudent(userId,student => {
      const exam = student.exams.find(item => item.id === examId);
      if (!exam) throw new ApiError(404,'Không tìm thấy lượt thi.');
      if (exam.status === 'void') throw new ApiError(409,'Lượt thi đã được hủy do sự cố.');
      if (exam.status === 'graded') return;
      this.finalize(student,exam,key);
    });
    const reconciled=await this.reconcileExams(userId)??student;
    return {student:publicStudent(reconciled),exam:publicExam(reconciled.exams.find(item => item.id === examId)!)};
  }
  async retryExamGrading(userId:string,examId:string,reason:string,auditEvent?:AuditEvent){
    const reasonText=textField(reason,'Lý do xử lý sự cố',500);
    await this.executionPreflight();
    await this.store.mutateStudent(userId,student=>{
      const exam=student.exams.find(exam=>exam.id===examId);
      if(!exam||exam.status!=='grading-error'||!exam.codeExerciseSnapshot)throw new ApiError(409,'Chỉ thử chấm lại bài đã bị lỗi hệ thống.');
      exam.status='grading';exam.gradingSubmissionId=randomUUID();exam.gradingDispatchPending=true;exam.gradingError=undefined;exam.gradingRetries=(exam.gradingRetries??0)+1;exam.gradingRetryReason=reasonText;
      if(auditEvent)(student.administrativeEvents??=[]).push(structuredClone(auditEvent));
      const month=new Date(this.now()).toISOString().slice(0,7);
      return [{id:`exam-retry-${exam.gradingSubmissionId}-${month}`,month,seconds:exam.codeExerciseSnapshot.timeoutSeconds+15,limit:Number(process.env.EXECUTION_MONTHLY_SECONDS??1000000)}];
    });
    const reconciled=await this.reconcileExams(userId);
    if(!reconciled)throw new ApiError(404,'Không tìm thấy sinh viên.');
    return reconciled;
  }
  async voidExam(userId:string,examId:string,reason:string,auditEvent?:AuditEvent) {
    return this.store.mutateStudent(userId,student => {
      const exam=student.exams.find(item=>item.id===examId);
      if (!exam) throw new ApiError(404,'Không tìm thấy lượt thi.');
      exam.status='void'; exam.reason=reason;
      if(auditEvent)(student.administrativeEvents??=[]).push(structuredClone(auditEvent));
      const otherScores=student.exams.filter(item=>item.id!==exam.id&&item.courseId===exam.courseId&&item.semester===exam.semester&&item.kind===exam.kind&&item.status==='graded').map(item=>item.score??0);
      const progress=progressFor(student,exam.courseId);
      if(exam.kind==='midterm')progress.midterm=otherScores.length?Math.max(...otherScores):undefined;
      else progress.final=otherScores.length?Math.max(...otherScores):undefined;
      student.grades=student.grades.filter(grade=>!(grade.courseId===exam.courseId&&grade.semester===exam.semester&&grade.status!=='exempt'));
      if(exam.semester===student.semester&&progress.final!==undefined)this.recordCourseGrade(student,exam.courseId);
      if(exam.semester===student.semester)recomputeExamComponents(student,exam.courseId);
      // Administrator-only operational method: preserve original answers and release the attempt quota.
    });
  }
  async practice(userId:string,body:Record<string,unknown>) {
    if (!this.capabilities.codeExecution) throw new ApiError(503,'Chấm mã chưa được cấu hình. Không chạy mã người học trên máy chủ ứng dụng.','execution_unavailable');
    const bank = requireBank(this.bank);
    const courseId=textField(body.courseId,'Môn học');
    const exerciseId=textField(body.exerciseId,'Bài tập');
    const source=textField(body.source,'Mã nguồn',64000);
    const exercise=bank.exercises.find(item=>item.id===exerciseId&&item.courseId===courseId&&item.language===body.language);
    if(!exercise)throw new ApiError(404,'Bài tập hoặc ngôn ngữ không hợp lệ.');
    const student=await this.store.getStudent(userId);
    if(!student||(!activeEnrollment(student,courseId)&&getCourse(courseId)?.kind!=='requirement'&&!languageBridges.some(bridge=>bridge.id===courseId&&bridge.forTracks.includes(student.track))))throw new ApiError(403,'Bạn chưa đăng ký môn học.');
    if(student.exams.some(exam=>['active','grading','grading-error'].includes(exam.status)))throw new ApiError(409,'Không mở phần luyện tập khi lượt thi còn đang thực hiện hoặc chờ chấm.');
    await this.executionPreflight();
    if(courseId==='intro-programming'&&exercise.language!==student.track)throw new ApiError(400,'Bài tập không thuộc đường nhập môn của bạn.');
    const id=randomUUID(); const at=new Date(this.now()).toISOString();
    const limit=Number(process.env.EXECUTION_MONTHLY_SECONDS??1000000);
    const submission:Submission={id,userId,courseId,exerciseId,language:exercise.language,source,status:'queued',createdAt:at,acceptedAt:at,assessmentVersion:bank.version,semester:student.semester};
    await this.store.enqueueSubmission(submission,{month:at.slice(0,7),seconds:exercise.timeoutSeconds+15,limit});
    return {submission:{...submission,source:undefined}};
  }
  async submission(userId:string,id:string) {
    const submission=await this.store.getSubmission(id);
    if(!submission||submission.userId!==userId)throw new ApiError(404,'Không tìm thấy bài nộp.');
    return {submission};
  }
  async activity(userId:string,body:Record<string,unknown>) {
    const id=textField(body.activityId,'Hoạt động') as keyof typeof activityDefinitions;
    const key=textField(body.idempotencyKey,'Mã hoạt động',100);
    const activity=activityDefinitions[id];
    if(!Object.hasOwn(activityDefinitions,id))throw new ApiError(404,'Hoạt động không tồn tại.');
    const student=await this.store.mutateStudent(userId,student=>{
      if(student.exams.some(exam=>exam.status==='active'))throw new ApiError(409,'Hoàn thành kỳ thi trước khi sinh hoạt.');
      if(student.activityKeys.includes(key))return;
      const dailyKey=`${student.semester}:${student.week}:${student.day}:${id}`;
      if(student.activityKeys.includes(dailyKey))throw new ApiError(409,'Hoạt động này đã thực hiện hôm nay.');
      if(id==='aid'&&student.balance>=50000)throw new ApiError(409,'Quỹ khẩn cấp dành cho sinh viên có số dư dưới 50.000đ.');
      if(activity.energy<0&&student.energy+activity.energy<0)throw new ApiError(409,'Hãy nghỉ ngơi trước khi tiếp tục.');
      if(activity.amount<0&&student.balance+activity.amount<0)throw new ApiError(409,'Chưa đủ tiền. Bạn có thể làm thêm, về ký túc xá hoặc xin hỗ trợ.');
      ledger(student,id,activity.amount,new Date(this.now()).toISOString());
      student.energy=Math.max(0,Math.min(100,student.energy+activity.energy));
      student.stress=Math.max(0,Math.min(100,student.stress+activity.stress));
      if(id==='volunteer')student.relationships.minh=Math.min(100,(student.relationships.minh??0)+8);
      if(id==='friend')student.relationships.linh=Math.min(100,(student.relationships.linh??0)+8);
      if(id==='rent')student.housing='rental'; if(id==='dorm')student.housing='dorm';
      student.activityKeys.push(key,dailyKey);
    });
    return {student:publicStudent(student),message:activity.title};
  }
  async advance(userId:string,body:Record<string,unknown>) {
    if(!['day','week','semester'].includes(String(body.unit)))throw new ApiError(400,'Mốc thời gian không hợp lệ.');
    await this.reconcileExams(userId);
    const student=await this.store.mutateStudent(userId,student=>{
      this.finalizeExpired(student);
      if(student.exams.some(exam=>['active','grading','grading-error'].includes(exam.status)))throw new ApiError(409,'Hoàn tất chấm bài hoặc xử lý sự cố kỳ thi trước khi chuyển lịch.');
      if(body.unit==='semester'){
        if(student.week<16)throw new ApiError(409,'Kết thúc kỳ từ tuần 16.');
        const current=student.enrollments.filter(enrollment=>enrollment.semester===student.semester);
        const unfinished=current.filter(enrollment=>!student.grades.some(grade=>grade.courseId===enrollment.courseId&&grade.semester===student.semester));
        if(unfinished.length&&body.confirm!==true)throw new ApiError(409,'Có môn chưa tổng kết. Xác nhận kết thúc kỳ sẽ ghi các môn đó là chưa đạt.','unfinished_courses');
        unfinished.forEach(enrollment=>student.grades.push({courseId:enrollment.courseId,semester:student.semester,status:'failed',score:0}));
        student.semester++;student.week=1;student.day=1;
      }else{
        const crossesWeek=body.unit==='week'||student.day===5;
        if(crossesWeek){
          if(student.week>=16)throw new ApiError(409,'Đã đến tuần thi cuối kỳ. Hoàn thành hoặc kết thúc học kỳ để tiếp tục.');
          if(body.confirm!==true)throw new ApiError(409,'Xác nhận chuyển tuần; các hoạt động chưa làm vẫn được lưu để ôn tập.','advance_confirmation_required');
          student.week++;student.day=1;
          if(student.week%4===0)ledger(student,'housing-rent',student.housing==='dorm'?-800000:-1800000,new Date(this.now()).toISOString());
        }else student.day++;
        student.energy=Math.min(100,student.energy+20);student.stress=Math.max(0,student.stress-5);
      }
    });
    return {student:publicStudent(student)};
  }
  async credential(userId:string) {
    const student=await this.store.mutateStudent(userId,student=>{
      const audit=auditGraduation(student.major,student.grades);
      if(!audit.eligible)throw new ApiError(409,`Chưa đủ điều kiện tốt nghiệp: ${audit.deficits.join('; ')}`,'graduation_ineligible');
      if(student.credentials.some(item=>item.type==='graduation'))return;
      student.credentials.push({code:`USIM-${randomUUID().replaceAll('-','').toUpperCase()}`,type:'graduation',issuedAt:new Date(this.now()).toISOString(),public:false,curriculumVersion:'2026.v1'});
    });
    return {student:publicStudent(student)};
  }
  async submitOffice(userId:string,body:Record<string,unknown>){
    let assessment:ReturnType<typeof assessOfficeArtifact>;
    try{assessment=assessOfficeArtifact(body.artifact);}catch(error){if(error instanceof RangeError||error instanceof TypeError)throw new ApiError(400,'Sản phẩm văn phòng không đúng cấu trúc hoặc vượt giới hạn.','invalid_office_artifact');throw error;}
    const student=await this.store.mutateStudent(userId,student=>{
      const submittedAt=new Date(this.now()).toISOString();
      if(!student.office?.passed||assessment.passed||student.office.version!==assessment.version)student.office={version:assessment.version,submittedAt,score:assessment.score,passed:assessment.passed,artifact:structuredClone(body.artifact)};
      if(!assessment.passed)return;
      const grade=student.grades.find(grade=>grade.courseId==='office-skills'&&grade.status==='passed');
      if(grade)grade.score=Math.max(grade.score??0,assessment.score);
      else student.grades.push({courseId:'office-skills',semester:student.semester,status:'passed',score:assessment.score});
      if(!student.credentials.some(credential=>credential.type==='office-skills'&&credential.assessmentVersion===assessment.version))student.credentials.push({code:`USIM-OFFICE-${randomUUID().replaceAll('-','').toUpperCase()}`,type:'office-skills',issuedAt:submittedAt,public:false,curriculumVersion:'2026.v1',assessmentVersion:assessment.version});
    });
    return {student:publicStudent(student),assessment};
  }
  async shareCredential(userId:string,code:string,enabled:unknown) {
    if(typeof enabled!=='boolean')throw new ApiError(400,'Trạng thái chia sẻ không hợp lệ.');
    const student=await this.store.mutateStudent(userId,student=>{
      const credential=student.credentials.find(item=>item.code===code);
      if(!credential)throw new ApiError(404,'Không tìm thấy chứng nhận.');
      credential.public=enabled;
    });
    return {student:publicStudent(student)};
  }
  async lookupCredential(code:string) {
    const student=await this.store.findCredential(code);
    const credential=student?.credentials.find(item=>item.code===code&&item.public);
    if(!student||!credential)throw new ApiError(404,'Chứng nhận không tồn tại hoặc chưa được chia sẻ.');
    const transcript=getTranscriptSummary(student.grades);
    const summary=credential.type==='office-skills'?{score:student.office?.score??0,maxScore:10}:{credits:transcript.credits,gpa:transcript.gpa};
    return {credential,displayName:student.displayName,major:student.major,summary,disclaimer:'Thành tích mô phỏng trong University Simulator; không phải văn bằng được công nhận ngoài trò chơi.'};
  }
}
