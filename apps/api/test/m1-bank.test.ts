import { describe, expect, it } from 'vitest';
import { getLessons, introOutcomes, introTopicOrder } from '@university-simulator/content';
import { createDevelopmentBank, publicQuestion, validateAssessmentBank } from '../src/bank.js';
import { developmentAssessmentMutants, developmentAssessmentReferences, introAssessmentCoverage } from '../src/development-intro.js';

describe('M1 public development assessment coverage', () => {
  it('keeps the comprehensive development bank explicitly public and forbidden in production', () => {
    const bank = createDevelopmentBank();
    expect(bank).toMatchObject({ development: true, reviewed: false });
    expect(() => validateAssessmentBank(bank, false)).not.toThrow();
    expect(() => validateAssessmentBank(bank, true)).toThrow(/reviewed private bank/);
    bank.reviewed = true;
    expect(() => validateAssessmentBank(bank, true)).toThrow(/reviewed private bank/);
  });

  it('offers distinct midterm, final and retake definitions, tasks and immutable versions for both tracks', () => {
    const bank = createDevelopmentBank();
    const definitions = bank.assessments.filter(exam => exam.courseId === 'intro-programming');
    expect(definitions).toHaveLength(3);
    expect(definitions.map(exam => [exam.kind, exam.attemptNumber ?? 1])).toEqual([['midterm', 1], ['final', 1], ['final', 2]]);
    expect(new Set(definitions.map(exam => exam.version)).size).toBe(3);
    expect(new Set(definitions.flatMap(exam => exam.questions.map(question => question.id))).size).toBe(39);
    for (const exam of definitions) {
      expect(exam.questions.filter(question => question.kind === 'choice')).toHaveLength(12);
      const coding = exam.questions.filter(question => question.kind === 'code');
      expect(coding).toHaveLength(1);
      const code = coding[0]!;
      expect(code.weight).toBe(exam.questions.filter(question => question.kind === 'choice').reduce((sum, question) => sum + question.weight!, 0));
      expect(code.requiredPassRatio).toBeGreaterThanOrEqual(0.7);
      for (const language of ['cpp', 'python'] as const) {
        const exercise = bank.exercises.find(item => item.id === code.exerciseIds![language]);
        expect(exercise).toMatchObject({ courseId: 'intro-programming', language });
        expect(exercise!.tests.length).toBeGreaterThanOrEqual(10);
        expect(exercise!.tests.every(test => Buffer.byteLength(test.expected, 'utf8') <= 8192)).toBe(true);
        expect(code.starterCodes![language].length).toBeGreaterThan(10);
      }
    }
    expect(definitions[1]!.questions.find(question => question.kind === 'code')!.exerciseIds).not.toEqual(definitions[2]!.questions.find(question => question.kind === 'code')!.exerciseIds);
  });

  it('maps declared outcomes to specific questions or programs and describes the self-explanation boundary honestly', () => {
    const covered = new Set(introAssessmentCoverage.flatMap(assessment => [...assessment.codeOutcomes, ...assessment.choiceQuestions.flatMap(question => question.outcomes)]));
    expect([...covered].sort()).toEqual(introOutcomes.map(outcome => outcome.id).sort());
    expect(introAssessmentCoverage.every(assessment => assessment.caveat.includes('CLO6'))).toBe(true);
    expect(introAssessmentCoverage.every(assessment => assessment.choiceQuestions.every(question => question.outcomes.length > 0))).toBe(true);
  });

  it('includes a formative executable exercise for every lesson of each 18-topic introductory route', () => {
    const bank = createDevelopmentBank();
    for (const track of ['cpp', 'python'] as const) {
      const lessons = getLessons('intro-programming', track);
      expect(lessons).toHaveLength(introTopicOrder.length);
      expect(lessons).toHaveLength(18);
      for (const lesson of lessons) {
        const exercises = (lesson.practice ?? []).filter(practice => practice.language === track && practice.publicTests.length > 0);
        expect(exercises.length, lesson.id).toBeGreaterThan(0);
        for (const practice of exercises) expect(bank.exercises.find(exercise => exercise.id === practice.id)?.tests).toEqual(practice.publicTests.map(test => ({ input: test.input, expected: test.output, public: true })));
      }
    }
  });

  it('catches plausible intentionally wrong expense algorithms rather than only a positive happy path', () => {
    const tests = developmentAssessmentReferences.find(reference => reference.exerciseId === 'intro-m1-midterm-python')!.tests;
    const wrongSum = (input: string) => { const [n, ...raw] = input.trim().split(/\s+/).map(Number); const values = raw.slice(0, n); return `${values.reduce((sum, value) => sum + value, 0)} ${values.filter(value => value < 0).length}`; };
    const wrongZero = (input: string) => { const [n, ...raw] = input.trim().split(/\s+/).map(Number); const values = raw.slice(0, n); return `${values.filter(value => value > 0).reduce((sum, value) => sum + value, 0)} ${values.filter(value => value <= 0).length}`; };
    expect(tests.some(test => wrongSum(test.input) !== test.output.trim())).toBe(true);
    expect(tests.some(test => wrongZero(test.input) !== test.output.trim())).toBe(true);
    expect(tests.some(test => Number(test.output.split(' ')[0]) > 2147483647)).toBe(true);
  });

  it('catches a deduplicating sort and a strict retake threshold at equality', () => {
    const final = developmentAssessmentReferences.find(reference => reference.exerciseId === 'intro-m1-final-python')!;
    const deduplicates = (input: string) => { const [n, target, ...raw] = input.trim().split(/\s+/).map(Number); const values = [...new Set(raw.slice(0, n))].sort((a, b) => a - b); return `${values.filter(value => value === target).length}\n${values.length ? values.join(' ') : 'EMPTY'}`; };
    expect(final.tests.some(test => deduplicates(test.input) !== test.output.trim())).toBe(true);
    const retake = developmentAssessmentReferences.find(reference => reference.exerciseId === 'intro-m1-retake-python')!;
    const excludesEqual = (input: string) => { const [n, threshold, ...raw] = input.trim().split(/\s+/).map(Number); const values = raw.slice(0, n).filter(value => value > threshold!).sort((a, b) => b - a); return `${values.length}\n${values.length ? values.join(' ') : 'EMPTY'}`; };
    expect(retake.tests.some(test => excludesEqual(test.input) !== test.output.trim())).toBe(true);
    expect(developmentAssessmentMutants).toHaveLength(10);
    expect(developmentAssessmentMutants.every(mutant => mutant.source !== developmentAssessmentReferences.find(reference => reference.exerciseId === mutant.exerciseId)!.source)).toBe(true);
  });

  it('rejects ambiguous variants and duplicate exercise IDs instead of silently choosing the first', () => {
    const duplicate = createDevelopmentBank(); duplicate.assessments.push({ ...duplicate.assessments[1]!, id: 'ambiguous-second-final' });
    expect(() => validateAssessmentBank(duplicate, false)).toThrow(/attempt variant/);
    const exercises = createDevelopmentBank(); exercises.exercises.push({ ...exercises.exercises[0]! });
    expect(() => validateAssessmentBank(exercises, false)).toThrow(/Duplicate exercise/);
  });

  it('keeps official grading details out of the question serializer even though development teacher references are public source', () => {
    const questions = createDevelopmentBank().assessments.flatMap(exam => exam.questions.map(publicQuestion));
    const serialized = JSON.stringify(questions);
    expect(serialized).not.toContain('correctOption'); expect(serialized).not.toContain('exerciseIds'); expect(serialized).not.toContain('explanation');
    expect(createDevelopmentBank().exercises.find(exercise => exercise.id === 'intro-sum-python')?.tests).toHaveLength(4);
  });
});
