import { courses, curriculumVersion } from '@university-simulator/core';
import { contentReleaseStatus, courseReadiness, lessons } from '@university-simulator/content';

export interface BundledContentApproval {
  release: { version: string; publicLaunchReady: boolean; academicallyReviewed: boolean };
  courses: Record<string, { courseId: string; status: string; academicallyReviewed: boolean; assessmentBankReady: boolean; releaseEligible: boolean; remaining: readonly string[] }>;
  lessons: readonly { id: string; courseId: string; reviewStatus: string; track?: string }[];
}

const bundledContent: BundledContentApproval = { release: contentReleaseStatus, courses: courseReadiness, lessons };

/** An external sign-off never overrides draft/partial content actually included in the deployed build. */
export function assertProductionContentReady(manifest: unknown, bundle: BundledContentApproval = bundledContent): void {
  if (!bundle.release.publicLaunchReady || !bundle.release.academicallyReviewed || /draft|partial/i.test(bundle.release.version)) {
    throw new Error('Bundled content is still draft or not approved for public release; an external manifest cannot approve this build.');
  }
  const incomplete = courses.filter(course => {
    const record = bundle.courses[course.id];
    return !record || record.courseId !== course.id || record.status !== 'complete' || record.academicallyReviewed !== true || record.assessmentBankReady !== true || record.releaseEligible !== true || !Array.isArray(record.remaining) || record.remaining.length !== 0;
  });
  if (incomplete.length) throw new Error(`Bundled courses are incomplete or unreviewed: ${incomplete.map(course => course.id).join(', ')}.`);
  if (!bundle.lessons.length || bundle.lessons.some(lesson => lesson.reviewStatus !== 'reviewed')) throw new Error('Bundled lessons must be reviewed before public release.');
  const missingLessons = courses.filter(course => !bundle.lessons.some(lesson => lesson.courseId === course.id));
  if (missingLessons.length) throw new Error(`Bundled content has no reviewed lessons for: ${missingLessons.map(course => course.id).join(', ')}.`);
  if (!['cpp', 'python'].every(track => bundle.lessons.some(lesson => lesson.courseId === 'intro-programming' && lesson.track === track))) throw new Error('Both introductory programming tracks require reviewed bundled lessons.');

  if (!manifest || typeof manifest !== 'object' || Array.isArray(manifest)) throw new Error('Production content manifest must be a valid approval object.');
  const approval = manifest as { curriculumVersion?: unknown; phase1Approved?: unknown; courses?: unknown };
  if (approval.curriculumVersion !== curriculumVersion || approval.phase1Approved !== true || !Array.isArray(approval.courses) || approval.courses.length === 0) throw new Error('Production content manifest is not approved for this curriculum.');
  const known = new Set(courses.map(course => course.id)), approved = new Set<string>();
  for (const item of approval.courses) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) throw new Error('Production content manifest has an invalid course approval.');
    const record = item as { courseId?: unknown; reviewed?: unknown };
    if (typeof record.courseId !== 'string' || !known.has(record.courseId) || record.reviewed !== true || approved.has(record.courseId)) throw new Error('Production content manifest has an unknown, duplicate or unreviewed course.');
    approved.add(record.courseId);
  }
  if (courses.some(course => !approved.has(course.id))) throw new Error('Production content manifest must cover every offered course and noncredit requirement.');
}
