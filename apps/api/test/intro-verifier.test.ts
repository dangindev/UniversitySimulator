import { describe, expect, it } from 'vitest';
import { validateVerifierArguments, trustedIntroVerificationJobs } from '../../../scripts/verify-intro.js';
import { practiceReferences } from '@university-simulator/content';
import { developmentAssessmentReferences, developmentAssessmentMutants } from '../src/development-intro.js';

describe('trusted reference verifier input boundary', () => {
  it('accepts only output-format selection and never a learner source path or code', () => {
    expect(validateVerifierArguments([])).toEqual({ json: false });
    expect(validateVerifierArguments(['--json'])).toEqual({ json: true });
    for (const args of [['submission.py'], ['--source', 'submission.py'], ['--submission', 'id'], ['--code=print(5)'], ['--json', '--json']]) expect(() => validateVerifierArguments(args)).toThrow(/not accepted/);
  });

  it('builds its executable source set only from the authored repository references and mutations', () => {
    const jobs = trustedIntroVerificationJobs();
    expect(jobs).toHaveLength(practiceReferences.length + developmentAssessmentReferences.length + developmentAssessmentMutants.length);
    expect(jobs.filter(job => job.expectedOutcome === 'pass')).toHaveLength(practiceReferences.length + developmentAssessmentReferences.length);
    expect(jobs.filter(job => job.expectedOutcome === 'killed')).toHaveLength(developmentAssessmentMutants.length);
    expect(jobs.every(job => /^[a-f0-9]{64}$/.test(job.sourceHash) && job.tests.length > 0)).toBe(true);
    for (const language of ['cpp', 'python']) expect(jobs.some(job => job.language === language && job.expectedOutcome === 'pass')).toBe(true);
  });

  it('does not expose filesystem or submission lookup options when creating a verification plan', () => {
    const jobs = trustedIntroVerificationJobs();
    expect(jobs.every(job => !Object.hasOwn(job, 'sourcePath') && !Object.hasOwn(job, 'submissionId'))).toBe(true);
    expect(jobs.filter(job => job.expectedOutcome === 'killed').every(job => jobs.some(reference => reference.expectedOutcome === 'pass' && reference.exerciseId === job.exerciseId))).toBe(true);
  });
});
