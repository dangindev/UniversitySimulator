import { describe, expect, it } from 'vitest';
import { courses, curriculumVersion } from '@university-simulator/core';
import { assertProductionContentReady, type BundledContentApproval } from '../src/production-content.js';

const approvedManifest = () => ({ curriculumVersion, phase1Approved: true, courses: courses.map(course => ({ courseId: course.id, reviewed: true })) });
/** Synthetic metadata for validator tests only; it does not approve any actual course. */
function reviewedFixture(): BundledContentApproval {
  return {
    release: { version: '2026.v1', publicLaunchReady: true, academicallyReviewed: true },
    courses: Object.fromEntries(courses.map(course => [course.id, { courseId: course.id, status: 'complete', academicallyReviewed: true, assessmentBankReady: true, releaseEligible: true, remaining: [] }])),
    lessons: [...courses.map(course => ({ id: `test-${course.id}`, courseId: course.id, reviewStatus: 'reviewed' })), ...['cpp', 'python'].map(track => ({ id: `test-intro-${track}`, courseId: 'intro-programming', reviewStatus: 'reviewed', track }))],
  };
}

describe('production content cannot be approved by a manifest alone', () => {
  it('rejects a fully signed-off external manifest while the actual bundled content remains draft', () => {
    expect(() => assertProductionContentReady(approvedManifest())).toThrow(/Bundled content is still draft/);
  });

  it('allows independently reviewed complete bundled content only when external approval also covers it', () => {
    expect(() => assertProductionContentReady(approvedManifest(), reviewedFixture())).not.toThrow();
  });

  it.each([
    ['academicallyReviewed', false], ['assessmentBankReady', false], ['releaseEligible', false], ['status', 'partial'], ['remaining', ['Missing practical assessment']],
  ])('rejects a single offered course with an incomplete %s state', (field, value) => {
    const bundle = reviewedFixture(); Object.assign(bundle.courses['technical-english']!, { [field as string]: value });
    expect(() => assertProductionContentReady(approvedManifest(), bundle)).toThrow(/technical-english/);
  });

  it('does not let completed course flags hide a draft lesson', () => {
    const bundle = reviewedFixture(); bundle.lessons = bundle.lessons.map((lesson, index) => index === 0 ? { ...lesson, reviewStatus: 'draft' } : lesson);
    expect(() => assertProductionContentReady(approvedManifest(), bundle)).toThrow(/lessons must be reviewed/);
  });

  it('requires actual lesson coverage for noncredit requirements and both entry tracks', () => {
    const missingOffice = reviewedFixture(); missingOffice.lessons = missingOffice.lessons.filter(lesson => lesson.courseId !== 'office-skills');
    expect(() => assertProductionContentReady(approvedManifest(), missingOffice)).toThrow(/office-skills/);
    const missingTrack = reviewedFixture(); missingTrack.lessons = missingTrack.lessons.filter(lesson => lesson.track !== 'python');
    expect(() => assertProductionContentReady(approvedManifest(), missingTrack)).toThrow(/Both introductory/);
  });

  it('still requires exact external curriculum approval and coverage after bundled review succeeds', () => {
    const incomplete = approvedManifest(); incomplete.courses = incomplete.courses.filter(course => course.courseId !== 'national-defense');
    expect(() => assertProductionContentReady(incomplete, reviewedFixture())).toThrow(/every offered course/);
    expect(() => assertProductionContentReady({ ...approvedManifest(), curriculumVersion: 'stale-version' }, reviewedFixture())).toThrow(/not approved for this curriculum/);
    expect(() => assertProductionContentReady({ ...approvedManifest(), phase1Approved: 'true' }, reviewedFixture())).toThrow(/not approved/);
  });

  it('rejects duplicate, unknown and falsely reviewed external course approvals', () => {
    const duplicate = approvedManifest(); duplicate.courses.push({ ...duplicate.courses[0]! });
    expect(() => assertProductionContentReady(duplicate, reviewedFixture())).toThrow(/duplicate/);
    const unknown = approvedManifest(); unknown.courses.push({ courseId: 'invented-credit', reviewed: true });
    expect(() => assertProductionContentReady(unknown, reviewedFixture())).toThrow(/unknown/);
    const unreviewed = approvedManifest(); unreviewed.courses[0]!.reviewed = false;
    expect(() => assertProductionContentReady(unreviewed, reviewedFixture())).toThrow(/unreviewed/);
  });
});
