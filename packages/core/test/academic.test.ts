import { describe, expect, it } from 'vitest';
import {
  applyPlacement, auditGraduation, calculateCourseGrade, calculateProjectGrade, canEnroll,
  courses, getCourse, getProgram, getTranscriptSummary, languageBridges, programs,
  resolveTranscript, suggestEnrollment, validateCurriculum, validateEnrollment,
} from '../src/index.ts';
import type { GradeRecord, ProgramId } from '../src/index.ts';

const pass = (courseId: string, semester = 1, score = 8): GradeRecord => ({ courseId, semester, score, status: 'passed' });
function graduate(major: ProgramId): GradeRecord[] {
  const program = getProgram(major);
  return [...program.recommendedPath.flatMap((ids, index) => ids.map((id) => pass(id, index + 1))), ...program.requirementIds.map((id) => pass(id))];
}

describe('curriculum and real degree paths', () => {
  it('has a valid catalog with no missing prerequisites, cycles or credit arithmetic errors', () => {
    expect(validateCurriculum()).toEqual([]);
    expect(courses).toHaveLength(56);
  });

  for (const program of programs) {
    it(`${program.id}: every recommended semester is enrollable in sequence and earns the exact degree credits`, () => {
      const transcript: GradeRecord[] = [];
      program.recommendedPath.forEach((courseIds, index) => {
        const validation = validateEnrollment({ major: program.id, courseIds, transcript, semester: index + 1 });
        expect(validation.errors, `semester ${index + 1}`).toEqual([]);
        expect(validation.valid).toBe(true);
        transcript.push(...courseIds.map((id) => pass(id, index + 1)));
      });
      expect(auditGraduation(program.id, transcript).eligible).toBe(false);
      transcript.push(...program.requirementIds.map((id) => pass(id)));
      const audit = auditGraduation(program.id, transcript);
      expect(audit).toMatchObject({ eligible: true, credits: program.credits, earnedCredits: program.credits, gpa: 3 });
      expect(audit.deficits).toEqual([]);
    });
  }

  it('does not count the same specialization again as an elective or a retaken course twice', () => {
    const transcript = graduate('it');
    const requiredElective = 'it-testing';
    const withoutElective = transcript.filter((record) => record.courseId !== requiredElective);
    // Repeating a successful specialization cannot manufacture the missing four elective credits.
    withoutElective.push(pass('it-bi', 9, 9), pass('it-bi', 10, 10));
    const audit = auditGraduation('it', withoutElective);
    expect(audit).toMatchObject({ eligible: false, credits: 121, specializationCredits: 20, electiveCredits: 0 });
    expect(getTranscriptSummary(transcript).credits).toBe(125);
  });

  it('blocks graduation when specialized English is absent, even with all three English exemptions', () => {
    const transcript = applyPlacement(graduate('cs').filter((record) => !['english-1', 'english-2', 'english-3', 'technical-english'].includes(record.courseId)), 3);
    const audit = auditGraduation('cs', transcript);
    expect(audit.missingRequired).toContain('technical-english');
    expect(audit.eligible).toBe(false);
    expect(audit.credits).toBe(123);
  });

  it('requires actual noncredit conditions rather than credit totals alone', () => {
    const transcript = graduate('it').filter((record) => record.courseId !== 'office-skills');
    const audit = auditGraduation('it', transcript);
    expect(audit.credits).toBe(125);
    expect(audit.missingRequirements).toEqual(['office-skills']);
    expect(audit.eligible).toBe(false);
  });

  it('requires a graduation GPA of 2.0 and permits improved passed attempts to restore eligibility', () => {
    const low = graduate('it').map((record) => ({ ...record, score: 5 }));
    expect(auditGraduation('it', low).gpa).toBe(1);
    expect(auditGraduation('it', low).eligible).toBe(false);
    const improved = [...low, ...graduate('it').map((record) => ({ ...record, semester: 9, score: 7 }))];
    expect(auditGraduation('it', improved)).toMatchObject({ eligible: true, credits: 125, gpa: 3 });
  });
});

describe('English placement and two language paths', () => {
  it('grants exactly 12 English credits without adding GPA points or specialized English exemption', () => {
    const transcript = applyPlacement([], 3);
    const summary = getTranscriptSummary(transcript);
    expect(summary).toMatchObject({ credits: 12, gpa: 0, gradedCredits: 0 });
    expect(summary.exemptCourseIds).toEqual(['english-1', 'english-2', 'english-3']);
    expect(transcript.every((record) => record.score === undefined)).toBe(true);
    expect(canEnroll('it', 'technical-english', transcript).eligible).toBe(true);
  });

  it('does not overwrite earned English grades or create duplicated exemptions', () => {
    const original = [pass('english-1', 1, 9)];
    const placed = applyPlacement(original, 2);
    const placedAgain = applyPlacement(placed, 2);
    expect(placedAgain).toHaveLength(2);
    expect(getTranscriptSummary(placedAgain)).toMatchObject({ credits: 8, gradedCredits: 4, gpa: 4 });
    expect(original).toHaveLength(1);
  });

  it('rejects made-up placement levels and exemptions outside English 1–3', () => {
    expect(() => applyPlacement([], 4 as 3)).toThrow();
    expect(() => getTranscriptSummary([{ courseId: 'technical-english', status: 'exempt', semester: 1 }])).toThrow();
    expect(() => getTranscriptSummary([{ courseId: 'english-1', status: 'exempt', semester: 1, score: 10 }])).toThrow();
  });

  it('counts introductory programming only once and keeps all language bridges noncredit', () => {
    expect(getCourse('intro-programming')?.credits).toBe(4);
    expect(getTranscriptSummary([pass('intro-programming'), pass('intro-programming', 2, 9)]).credits).toBe(4);
    expect(languageBridges.every((bridge) => bridge.credits === 0)).toBe(true);
    expect(languageBridges.find((bridge) => bridge.id === 'bridge-cpp')?.forTracks).toEqual(['python']);
  });
});

describe('grade calculations and retakes', () => {
  it('uses the published course weights and final-exam floor', () => {
    expect(calculateCourseGrade({ attendance: 10, practice: 8, midterm: 6, final: 7 })).toMatchObject({ score: 7.4, passed: true, gradePoint: 3, letter: 'B' });
    const failedFinal = calculateCourseGrade({ attendance: 10, practice: 10, midterm: 10, final: 3.99 });
    expect(failedFinal.score).toBeGreaterThan(5);
    expect(failedFinal).toMatchObject({ passed: false, gradePoint: 0, letter: 'F' });
    expect(calculateCourseGrade({ attendance: 5, practice: 5, midterm: 5, final: 5 })).toMatchObject({ score: 5, passed: true, gradePoint: 1 });
  });

  it('uses the three project milestones and requires a viable final product', () => {
    expect(calculateProjectGrade([8, 7, 9])).toMatchObject({ score: 8.2, passed: true });
    expect(calculateProjectGrade([10, 10, 3])).toMatchObject({ passed: false, gradePoint: 0 });
  });

  it('rejects NaN, infinities, negative scores, over-range scores and missing components', () => {
    for (const final of [NaN, Infinity, -0.1, 10.1]) expect(() => calculateCourseGrade({ attendance: 5, practice: 5, midterm: 5, final })).toThrow();
    expect(() => calculateCourseGrade({ attendance: 5, practice: 5, midterm: 5 } as never)).toThrow();
    expect(() => calculateProjectGrade([5, 5, NaN])).toThrow();
  });

  it('replaces a failure with the best valid passed attempt and never lowers an earlier higher pass', () => {
    const attempts: GradeRecord[] = [
      { courseId: 'intro-programming', status: 'failed', score: 3, semester: 1 },
      pass('intro-programming', 2, 8), pass('intro-programming', 3, 6),
      { courseId: 'intro-programming', status: 'failed', score: 2, semester: 4 },
    ];
    expect(resolveTranscript(attempts)).toEqual([pass('intro-programming', 2, 8)]);
    expect(getTranscriptSummary(attempts)).toMatchObject({ credits: 4, gradedCredits: 4, gpa: 3 });
  });

  it('includes failed graded credits in GPA but awards no earned credits', () => {
    const summary = getTranscriptSummary([pass('intro-programming', 1, 8), { courseId: 'english-1', status: 'failed', score: 2, semester: 1 }]);
    expect(summary).toMatchObject({ credits: 4, gradedCredits: 8, gpa: 1.5 });
  });
});

describe('enrollment safety and advising', () => {
  it('rejects duplicate enrollment, missing prerequisites, foreign-major courses and oversized semesters', () => {
    expect(validateEnrollment({ major: 'it', courseIds: ['intro-programming', 'intro-programming'], transcript: [], semester: 1, allowUnderload: true }).errors.join()).toContain('trùng học phần');
    expect(canEnroll('it', 'oop', []).eligible).toBe(false);
    expect(canEnroll('it', 'cs-ai', []).eligible).toBe(false);
    expect(validateEnrollment({ major: 'it', courseIds: ['intro-programming', 'calculus', 'linear-algebra', 'discrete-math', 'english-1', 'law', 'computing-intro', 'study-skills', 'philosophy'], transcript: [], semester: 1 }).errors.join()).toContain('Tối đa 22');
  });

  it('detects section clashes and forged offered times', () => {
    const first = getCourse('calculus')!;
    const second = getCourse('discrete-math')!;
    expect(first.slots[0]).toBe(second.slots[0]);
    const clash = validateEnrollment({ major: 'it', courseIds: [first.id, second.id], transcript: [], semester: 1, allowUnderload: true });
    expect(clash.errors.join()).toContain('Trùng lịch');
    const invalid = validateEnrollment({ major: 'it', courseIds: [first.id], transcript: [], semester: 8, sections: { [first.id]: 'fake-time' } });
    expect(invalid.errors.join()).toContain('ca học không tồn tại');
  });

  it('applies the underload exception for a final or repeat semester', () => {
    const base = { major: 'it' as const, courseIds: ['intro-programming'], transcript: [], semester: 1 };
    expect(validateEnrollment(base).valid).toBe(false);
    expect(validateEnrollment({ ...base, semester: 8 }).valid).toBe(true);
    expect(validateEnrollment({ ...base, transcript: [{ courseId: 'intro-programming', status: 'failed', score: 3, semester: 1 }] }).valid).toBe(true);
  });

  it('does not allow a fake noncredit enrollment or silently re-enroll completed courses', () => {
    expect(canEnroll('it', 'office-skills', []).eligible).toBe(false);
    expect(canEnroll('it', 'intro-programming', [pass('intro-programming')]).eligible).toBe(false);
    expect(canEnroll('it', 'intro-programming', [pass('intro-programming')], true).eligible).toBe(true);
  });

  it('suggests an eligible first semester for a beginner and for someone exempt from all basic English', () => {
    for (const transcript of [[], applyPlacement([], 3)]) {
      const courseIds = suggestEnrollment('it', transcript, 1);
      const validation = validateEnrollment({ major: 'it', courseIds, transcript, semester: 1 });
      expect(validation.errors).toEqual([]);
      expect(validation.credits).toBeGreaterThanOrEqual(12);
      expect(validation.credits).toBeLessThanOrEqual(18);
    }
  });
});
