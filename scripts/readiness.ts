import {
  courses,
  programs,
  validateCurriculum,
} from "@university-simulator/core";
import { lessons, courseReadiness } from "@university-simulator/content";

const validation = validateCurriculum();
const readiness = Array.isArray(courseReadiness)
  ? courseReadiness
  : Object.values(courseReadiness);
const reviewed = readiness.filter(
  (record) => record.academicallyReviewed,
).length;
console.log(
  JSON.stringify(
    {
      project: "University Simulator",
      curriculumVersion: "2026.v1",
      audience: "internal-development-only",
      publicLaunchReady: false,
      programs: programs.map((program) => ({
        id: program.id,
        credits: program.credits,
        semesters: program.durationSemesters,
      })),
      offeredCourses: courses.length,
      authoredLessons: lessons.length,
      academicallyReviewedCourses: reviewed,
      curriculumErrors: validation,
      requiredBeforePublicLaunch: [
        "Complete and academically verify every offered course and assessment.",
        "Provide a reviewed private assessment bank outside the public repository.",
        "Configure Supabase, PostgreSQL, Redis, isolated execution and service budgets.",
        "Pass real learner, security, recovery and 100-concurrent-user validation.",
      ],
    },
    null,
    2,
  ),
);
if (validation.length || process.argv.includes("--strict"))
  process.exitCode = 1;
