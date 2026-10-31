import { introLessons } from './intro-course.ts';
import { languageLessons, placementPractice } from './language.ts';
import { moduleLessons } from './modules.ts';
import { appliedLessons, languageBridgeLessons } from './applied.ts';
import type { CourseReadiness, LearningTrack, Lesson } from './types.ts';

export * from './types.ts';
export { introLessons, makeIntroLessons, practiceReferences, getPracticeReference, introPracticeRequirements } from './intro-course.ts';
export { languageLessons, placementPractice } from './language.ts';
export { moduleLessons } from './modules.ts';
export { appliedLessons, languageBridgeLessons } from './applied.ts';
export { introSyllabus, introOutcomes, introTopicOrder, introTopicOutcomes, introProject } from './intro-syllabus.ts';

export const lessons: Lesson[] = [...introLessons, ...languageLessons, placementPractice, ...moduleLessons, ...appliedLessons, ...languageBridgeLessons];

export function getLessons(courseId: string, track?: LearningTrack): Lesson[] {
  return lessons.filter(lesson => lesson.courseId === courseId && (!track || !lesson.track || lesson.track === track));
}

export function getLesson(id: string): Lesson | undefined {
  return lessons.find(lesson => lesson.id === id);
}

export const curriculumReferences = [
  { title: 'UIT — Chương trình CNTT, khóa 2024', url: 'https://daa.uit.edu.vn/content/cu-nhan-nganh-cong-nghe-thong-tin-ap-dung-tu-khoa-19-2024', note: 'Nguồn tham chiếu khung; chương trình trong trò chơi đã được điều chỉnh.' },
  { title: 'UIT — Chương trình KHMT, khóa 2024', url: 'https://daa.uit.edu.vn/content/cu-nhan-nganh-khoa-hoc-may-tinh-ap-dung-tu-khoa-19-2024', note: 'Lộ trình trò chơi được phân bổ thành tám kỳ, không phải bản sao nguyên mẫu.' },
  { title: 'HUST — Điều chỉnh chương trình', url: 'https://soict.hust.edu.vn/thong-bao-cap-nhat-khung-chuong-trinh-va-ke-hoach-hoc-tap-chuan-cho-cac-ctdt.html', note: 'Tham chiếu cách đưa thực hành máy tính vào giai đoạn đầu.' },
];

export const courseReadiness: Record<string, CourseReadiness> = Object.fromEntries(
  [...new Set(lessons.map(lesson => lesson.courseId))].map(courseId => {
    const courseLessons = getLessons(courseId);
    return [courseId, {
      courseId, lessonCount: courseLessons.length,
      practiceCount: courseLessons.reduce((count, lesson) => count + (lesson.practice?.length ?? 0), 0),
      tracks: [...new Set(courseLessons.flatMap(lesson => lesson.track ? [lesson.track] : []))],
      status: 'partial', academicallyReviewed: false, assessmentBankReady: false, releaseEligible: false,
      remaining: ['Duyệt học thuật độc lập theo chuẩn đầu ra', 'Hoàn thiện toàn bộ học phần và bài ứng dụng', 'Ngân hàng thi riêng có phiên bản và kiểm định'],
    } satisfies CourseReadiness];
  }),
);

export const contentReleaseStatus = {
  version: '2026.v1-draft',
  publicLaunchReady: false,
  academicallyReviewed: false,
  message: 'Học liệu phát triển đang được biên soạn. Bài kiểm tra nhanh là luyện tập công khai; chưa đủ điều kiện công nhận phase 1 hoàn chỉnh.',
} as const;
