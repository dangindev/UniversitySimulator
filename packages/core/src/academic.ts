import { courses, getCourse, getProgram, getProgramCourses } from './catalog.ts';
import type { CalculatedGrade, Course, EnrollmentRequest, EnrollmentValidation, GradeComponents, GradeRecord, GraduationAudit, ProgramId, TranscriptSummary } from './types.ts';

export const gradingPolicy = {
  version: '2026.v1', attendance: 0.1, practice: 0.3, midterm: 0.2, final: 0.4,
  passingScore: 5, minimumFinal: 4, graduationGpa: 2,
  minimumSemesterCredits: 12, maximumSemesterCredits: 22,
  projectMilestones: [0.2, 0.3, 0.5] as const,
  finalRetakes: 1,
};

const round = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;
function assertScore(score: number, name = 'Điểm'): void {
  if (!Number.isFinite(score) || score < 0 || score > 10) throw new RangeError(`${name} phải là số từ 0 đến 10.`);
}
function asGrade(score: number, passed: boolean): CalculatedGrade {
  if (!passed) return { score, passed: false, gradePoint: 0, letter: 'F' };
  if (score >= 8.5) return { score, passed: true, gradePoint: 4, letter: 'A' };
  if (score >= 7) return { score, passed: true, gradePoint: 3, letter: 'B' };
  if (score >= 5.5) return { score, passed: true, gradePoint: 2, letter: 'C' };
  return { score, passed: true, gradePoint: 1, letter: 'D' };
}

export function calculateCourseGrade(components: GradeComponents): CalculatedGrade {
  for (const [name, value] of Object.entries(components)) assertScore(value, name);
  // Validate all required fields even when a JavaScript caller omits one.
  for (const name of ['attendance', 'practice', 'midterm', 'final'] as const) assertScore(components[name], name);
  const score = round(components.attendance * 0.1 + components.practice * 0.3 + components.midterm * 0.2 + components.final * 0.4);
  return asGrade(score, score >= gradingPolicy.passingScore && components.final >= gradingPolicy.minimumFinal);
}

export function calculateProjectGrade(milestones: readonly [number, number, number]): CalculatedGrade {
  if (milestones.length !== 3) throw new RangeError('Đồ án phải có đúng ba mốc chấm.');
  milestones.forEach((score, index) => assertScore(score, `Mốc ${index + 1}`));
  const score = round(milestones[0] * 0.2 + milestones[1] * 0.3 + milestones[2] * 0.5);
  return asGrade(score, score >= gradingPolicy.passingScore && milestones[2] >= gradingPolicy.minimumFinal);
}

export function scoreToGradePoint(score: number): number { assertScore(score); return asGrade(score, score >= 5).gradePoint; }
export function scoreToLetter(score: number): CalculatedGrade['letter'] { assertScore(score); return asGrade(score, score >= 5).letter; }

function assertRecord(record: GradeRecord): void {
  if (!getCourse(record.courseId)) throw new Error(`Học phần không tồn tại: ${record.courseId}`);
  if (!Number.isInteger(record.semester) || record.semester < 1) throw new RangeError('Học kỳ của điểm không hợp lệ.');
  if (record.status === 'exempt') {
    if (!['english-1', 'english-2', 'english-3'].includes(record.courseId)) throw new Error('Chỉ Tiếng Anh 1, 2, 3 được miễn bằng kiểm tra đầu vào.');
    if (record.score !== undefined) throw new Error('Môn miễn không được ghi điểm GPA.');
    return;
  }
  if (record.status !== 'passed' && record.status !== 'failed') throw new Error('Trạng thái điểm không hợp lệ.');
  assertScore(record.score as number);
  if (record.status === 'passed' && (record.score as number) < 5) throw new Error('Điểm qua môn phải từ 5/10.');
}

/** Highest valid passing attempt replaces older failures; exemption is never an invented score. */
export function resolveTranscript(transcript: readonly GradeRecord[]): GradeRecord[] {
  const resolved = new Map<string, GradeRecord>();
  for (const record of transcript) {
    assertRecord(record);
    const current = resolved.get(record.courseId);
    const rank = (item: GradeRecord) => item.status === 'passed' ? 2 : item.status === 'exempt' ? 1 : 0;
    if (!current || rank(record) > rank(current)
      || (rank(record) === rank(current) && record.status === 'passed' && (record.score as number) > (current.score as number))
      || (rank(record) === rank(current) && record.status !== 'passed' && record.semester > current.semester)) {
      resolved.set(record.courseId, { ...record });
    }
  }
  return [...resolved.values()];
}

export function getTranscriptSummary(transcript: readonly GradeRecord[]): TranscriptSummary {
  const records = resolveTranscript(transcript);
  let credits = 0;
  let points = 0;
  let gradedCredits = 0;
  for (const record of records) {
    const course = getCourse(record.courseId)!;
    if (record.status !== 'failed') credits += course.credits;
    if (record.status !== 'exempt' && course.credits > 0) {
      gradedCredits += course.credits;
      points += course.credits * (record.status === 'passed' ? scoreToGradePoint(record.score!) : 0);
    }
  }
  return {
    credits, gpa: gradedCredits ? round(points / gradedCredits) : 0, gradedCredits, records,
    passedCourseIds: records.filter((record) => record.status === 'passed').map((record) => record.courseId),
    exemptCourseIds: records.filter((record) => record.status === 'exempt').map((record) => record.courseId),
    failedCourseIds: records.filter((record) => record.status === 'failed').map((record) => record.courseId),
  };
}

export function applyPlacement(transcript: readonly GradeRecord[], level: 0 | 1 | 2 | 3, semester = 1): GradeRecord[] {
  if (!Number.isInteger(level) || level < 0 || level > 3) throw new RangeError('Mức xếp lớp tiếng Anh phải từ 0 đến 3.');
  if (!Number.isInteger(semester) || semester < 1) throw new RangeError('Học kỳ không hợp lệ.');
  const summary = getTranscriptSummary(transcript);
  const complete = new Set([...summary.passedCourseIds, ...summary.exemptCourseIds]);
  const result = transcript.map((record) => ({ ...record }));
  for (let index = 1; index <= level; index++) {
    const courseId = `english-${index}`;
    if (!complete.has(courseId)) result.push({ courseId, status: 'exempt', semester });
  }
  return result;
}

export function canEnroll(major: ProgramId, courseId: string, transcript: readonly GradeRecord[], allowImprovement = false): { eligible: boolean; reasons: string[] } {
  getProgram(major);
  const course = getCourse(courseId);
  const reasons: string[] = [];
  if (!course) return { eligible: false, reasons: ['Học phần không tồn tại.'] };
  if (!course.programs.includes(major)) reasons.push('Học phần không thuộc chương trình đang học.');
  if (course.category === 'requirement') reasons.push('Hoạt động điều kiện được hoàn thành riêng, không đăng ký tín chỉ.');
  const summary = getTranscriptSummary(transcript);
  const complete = new Set([...summary.passedCourseIds, ...summary.exemptCourseIds]);
  if (complete.has(courseId) && !allowImprovement) reasons.push('Học phần đã hoàn thành hoặc được miễn.');
  for (const id of course.prerequisites) if (!complete.has(id)) reasons.push(`Chưa hoàn thành tiên quyết: ${getCourse(id)?.title ?? id}.`);
  if (course.minimumCredits && summary.credits < course.minimumCredits) reasons.push(`Cần tích lũy ít nhất ${course.minimumCredits} tín chỉ.`);
  return { eligible: reasons.length === 0, reasons };
}

export function eligibleCourses(major: ProgramId, transcript: readonly GradeRecord[]): Course[] {
  return getProgramCourses(major).filter((course) => canEnroll(major, course.id, transcript).eligible);
}

export function validateEnrollment(request: EnrollmentRequest): EnrollmentValidation {
  getProgram(request.major);
  const errors: string[] = [];
  if (!Number.isInteger(request.semester) || request.semester < 1) errors.push('Học kỳ không hợp lệ.');
  if (!Array.isArray(request.courseIds) || request.courseIds.length === 0) return { valid: false, credits: 0, errors: ['Chọn ít nhất một học phần.'] };
  const unique = [...new Set(request.courseIds)];
  if (unique.length !== request.courseIds.length) errors.push('Không thể đăng ký trùng học phần.');
  const occupied = new Map<string, string>();
  let credits = 0;
  for (const id of unique) {
    const course = getCourse(id);
    if (!course) { errors.push(`Học phần không tồn tại: ${id}.`); continue; }
    credits += course.credits;
    const eligibility = canEnroll(request.major, id, request.transcript, request.allowImprovement);
    errors.push(...eligibility.reasons.map((reason) => `${course.title}: ${reason}`));
    if (course.slots.length) {
      const section = request.sections?.[id] ?? course.slots[0]!;
      if (!course.slots.includes(section)) errors.push(`${course.title}: ca học không tồn tại.`);
      else if (occupied.has(section)) errors.push(`Trùng lịch ${section}: ${occupied.get(section)} và ${course.title}.`);
      else occupied.set(section, course.title);
    }
  }
  if (credits > gradingPolicy.maximumSemesterCredits) errors.push('Tối đa 22 tín chỉ trong một học kỳ.');
  const hasRepeat = request.transcript.some((record) => record.status === 'failed' && unique.includes(record.courseId));
  if (credits < gradingPolicy.minimumSemesterCredits && request.semester < 8 && !request.allowUnderload && !hasRepeat) errors.push('Đăng ký ít nhất 12 tín chỉ; kỳ cuối hoặc học lại có thể ít hơn.');
  return { valid: errors.length === 0, errors: [...new Set(errors)], credits };
}

/** Advisor suggestions remain subject to normal enrollment validation. */
export function suggestEnrollment(major: ProgramId, transcript: readonly GradeRecord[], semester: number, targetCredits = 18): string[] {
  if (!Number.isInteger(targetCredits) || targetCredits < 1 || targetCredits > 22) throw new RangeError('Mức tín chỉ gợi ý phải từ 1 đến 22.');
  const program = getProgram(major);
  const recommended = new Set(program.recommendedPath[Math.min(Math.max(semester - 1, 0), 7)]);
  const options = eligibleCourses(major, transcript).sort((a, b) => Number(recommended.has(b.id)) - Number(recommended.has(a.id)) || a.semester - b.semester || a.code.localeCompare(b.code));
  const chosen: string[] = [];
  const occupied = new Set<string>();
  let credits = 0;
  for (const course of options) {
    if (credits + course.credits > targetCredits) continue;
    const section = course.slots[0];
    if (section && occupied.has(section)) continue;
    chosen.push(course.id); credits += course.credits;
    if (section) occupied.add(section);
  }
  return chosen;
}

export function auditGraduation(major: ProgramId, transcript: readonly GradeRecord[]): GraduationAudit {
  const program = getProgram(major);
  const summary = getTranscriptSummary(transcript);
  const complete = new Set([...summary.passedCourseIds, ...summary.exemptCourseIds]);
  const missingRequired = program.requiredCourseIds.filter((id) => !complete.has(id));
  const missingRequirements = program.requirementIds.filter((id) => !complete.has(id));
  const requiredEarned = program.requiredCourseIds.filter((id) => complete.has(id)).reduce((total, id) => total + getCourse(id)!.credits, 0);
  const availableSpecialization = program.specializationCourseIds.filter((id) => complete.has(id)).reduce((total, id) => total + getCourse(id)!.credits, 0);
  const specializationCredits = Math.min(availableSpecialization, program.specializationCredits);
  const electiveCredits = Math.min(Math.max(availableSpecialization - program.specializationCredits, 0), program.electiveCredits);
  const credits = requiredEarned + specializationCredits + electiveCredits;
  const earnedCredits = summary.records.filter((record) => record.status !== 'failed' && getCourse(record.courseId)!.programs.includes(major)).reduce((total, record) => total + getCourse(record.courseId)!.credits, 0);
  const deficits: string[] = [];
  if (missingRequired.length) deficits.push(`Còn ${missingRequired.length} học phần bắt buộc.`);
  if (specializationCredits < program.specializationCredits) deficits.push(`Thiếu ${program.specializationCredits - specializationCredits} tín chỉ chuyên ngành lựa chọn.`);
  if (electiveCredits < program.electiveCredits) deficits.push(`Thiếu ${program.electiveCredits - electiveCredits} tín chỉ tự chọn mở rộng.`);
  if (missingRequirements.length) deficits.push(`Còn ${missingRequirements.length} điều kiện hoàn thành không tín chỉ.`);
  if (summary.gpa < gradingPolicy.graduationGpa) deficits.push('GPA cần đạt ít nhất 2.00/4.00.');
  if (credits < program.credits) deficits.push(`Còn thiếu ${program.credits - credits} tín chỉ để tốt nghiệp.`);
  return { eligible: deficits.length === 0, credits, earnedCredits, requiredCredits: program.credits, gpa: summary.gpa, missingRequired, missingRequirements, specializationCredits, electiveCredits, deficits };
}

export function getCourseProgress(major: ProgramId, transcript: readonly GradeRecord[]) {
  const summary = getTranscriptSummary(transcript);
  const complete = new Set([...summary.passedCourseIds, ...summary.exemptCourseIds]);
  return getProgramCourses(major).map((course) => ({ ...course, completed: complete.has(course.id), eligibility: canEnroll(major, course.id, transcript) }));
}

export const academicStats = { courses: courses.length, programs: 2, semesters: 8, tracks: 2 };
