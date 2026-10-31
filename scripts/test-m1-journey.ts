/** Real development-only API/Docker integration. Uses authored reference programs as test learners. */
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { getProgram } from "@university-simulator/core";
import {
  getLessons,
  practiceReferences,
  type LearningTrack,
} from "@university-simulator/content";
import { createDevelopmentBank } from "../apps/api/src/bank.js";
import { developmentAssessmentReferences } from "../apps/api/src/development-intro.js";

const api = process.env.M1_API_URL || "http://127.0.0.1:3001/api/v1";
const url = new URL(api);
assert(
  ["127.0.0.1", "localhost", "[::1]"].includes(url.hostname) &&
    url.protocol === "http:",
  "M1 fixture only targets a loopback HTTP development API.",
);
assert(
  process.argv.slice(2).every((arg) => arg === "--restore"),
  "Only the optional --restore flag is accepted.",
);
const reportDir = resolve(process.env.M1_REPORT_DIR || ".data/m1-journey");
const bank = createDevelopmentBank();
const delay = (ms: number) => new Promise<void>((done) => setTimeout(done, ms));

async function call(
  path: string,
  token?: string,
  body?: unknown,
  method?: string,
): Promise<any> {
  for (let retry = 0; retry < 2; retry++) {
    const response = await fetch(api + path, {
      method: method || (body === undefined ? "GET" : "POST"),
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      signal: AbortSignal.timeout(20000),
    });
    if (response.status === 429 && retry === 0) {
      await delay(
        Math.min(60, Number(response.headers.get("retry-after")) || 60) * 1000,
      );
      continue;
    }
    const result = await response.json();
    assert(
      response.ok,
      `${path}: HTTP ${response.status} ${result.message || result.error || ""}`,
    );
    if (path === "/bootstrap") {
      assert(
        !JSON.stringify(result).includes("correctOption"),
        "Exam answer key leaked.",
      );
      assert(
        !JSON.stringify(result).includes("codeExerciseSnapshot"),
        "Execution snapshot leaked.",
      );
    }
    return result;
  }
  throw new Error("Rate limit did not recover.");
}

async function pollSubmission(id: string, token: string) {
  for (let turn = 0; turn < 180; turn++) {
    const { submission } = await call(`/submissions/${id}`, token);
    if (!["queued", "running"].includes(submission.status)) return submission;
    await delay(2000);
  }
  throw new Error("Submission remained pending for six minutes.");
}
async function pollExam(id: string, token: string) {
  for (let turn = 0; turn < 180; turn++) {
    const { exam, student } = await call(`/exams/${id}`, token);
    if (exam.status === "graded") return { exam, student };
    assert(
      exam.status !== "grading-error",
      `Exam grading failed: ${exam.gradingError}`,
    );
    await delay(2000);
  }
  throw new Error("Exam remained pending for six minutes.");
}
async function takeExam(
  token: string,
  track: LearningTrack,
  kind: "midterm" | "final",
  attempt: 1 | 2,
  wrongCode = false,
) {
  const definition = bank.assessments.find(
    (item) =>
      item.courseId === "intro-programming" &&
      item.kind === kind &&
      (item.attemptNumber || 1) === attempt,
  )!;
  assert(definition, "Missing authored development assessment.");
  const opened = await call("/exams", token, {
    courseId: "intro-programming",
    kind,
  });
  const resumed = await call("/exams", token, {
    courseId: "intro-programming",
    kind,
  });
  assert.equal(
    resumed.exam.id,
    opened.exam.id,
    "Opening twice created a second timer.",
  );
  assert.equal(opened.exam.assessmentVersion, definition.version);
  const answers = Object.fromEntries(
    definition.questions.map((question) => {
      if (question.kind !== "code")
        return [question.id, question.correctOption];
      const id = question.exerciseIds?.[track] || question.exerciseId;
      const reference = developmentAssessmentReferences.find(
        (item) => item.exerciseId === id && item.language === track,
      );
      assert(reference, "Missing trusted assessment reference.");
      return [
        question.id,
        wrongCode
          ? track === "cpp"
            ? "#include <iostream>\nint main(){std::cout << 0;}"
            : "print(0)"
          : reference.source,
      ];
    }),
  );
  const saved = await call(
    `/exams/${opened.exam.id}/answers`,
    token,
    { answers },
    "PUT",
  );
  assert(saved.exam.savedAt, "Server did not acknowledge saving.");
  assert.deepEqual(
    (await call(`/exams/${opened.exam.id}`, token)).exam.answers,
    answers,
    "Saved answers did not survive re-read.",
  );
  const key = randomUUID();
  const [first, duplicate] = await Promise.all([
    call(`/exams/${opened.exam.id}/submit`, token, { idempotencyKey: key }),
    call(`/exams/${opened.exam.id}/submit`, token, { idempotencyKey: key }),
  ]);
  assert.equal(
    first.exam.gradingSubmissionId,
    duplicate.exam.gradingSubmissionId,
    "Duplicate submission created two jobs.",
  );
  const result = await pollExam(opened.exam.id, token);
  assert(
    result.exam.acceptedAt &&
      Date.parse(result.exam.acceptedAt) <= Date.parse(result.exam.deadlineAt),
    "Accepted timestamp is late or missing.",
  );
  assert.equal(result.exam.codeResult.criterionPassed, !wrongCode);
  if (!wrongCode) assert.equal(result.exam.score, 10);
  return result;
}

const health = await call("/health");
assert(
  health.developmentAuth &&
    health.assessmentMode === "development-samples" &&
    health.executionProvider === "docker-local" &&
    health.codeExecution &&
    !health.productionReady,
  "A healthy private development API with actual Docker execution is required.",
);
await mkdir(reportDir, { recursive: true });
if (process.argv.includes("--restore")) {
  const report = JSON.parse(
    await readFile(resolve(reportDir, "latest.json"), "utf8"),
  );
  for (const learner of report.learners) {
    const auth = await call("/auth/dev", undefined, {
      profile: learner.profile,
    });
    const { student } = await call("/bootstrap", auth.accessToken);
    assert.equal(student.id, learner.studentId);
    assert.equal(
      student.progress["intro-programming"].practiceAssessment.completed,
      38,
    );
    assert.equal(
      student.grades.find(
        (grade: any) => grade.courseId === "intro-programming",
      ).status,
      "passed",
    );
  }
  report.restoredAfterRestartAt = new Date().toISOString();
  await writeFile(
    resolve(reportDir, "latest.json"),
    JSON.stringify(report, null, 2),
  );
  console.log(
    "Both fictional learners and completed M1 grades survived API restart.",
  );
} else {
  const began = Date.now(),
    runId = randomUUID().slice(0, 8);
  const learners = await Promise.all(
    (["cpp", "python"] as const).map(async (track) => {
      const profile = `m1-journey-${runId}-${track}`;
      const { accessToken: token } = await call("/auth/dev", undefined, {
        profile,
      });
      let { student } = await call("/students", token, {
        displayName: `M1 QA ${track}`,
        major: track === "cpp" ? "cs" : "it",
        track,
      });
      await call("/enrollments", token, {
        courseIds: getProgram(student.major)!.recommendedPath[0],
      });
      const lessons = getLessons("intro-programming", track);
      for (const lesson of lessons)
        await call("/learning/checkpoint", token, {
          courseId: "intro-programming",
          lessonId: lesson.id,
          answer: String(lesson.checkpoint!.answerIndex),
        });
      student = (await call("/bootstrap", token)).student;
      assert.equal(
        student.progress["intro-programming"].practiceAssessment.score,
        0,
        "Checkpoint clicks fabricated programming practice points.",
      );
      let testedCases = 0;
      const references = practiceReferences.filter(
        (item) => item.language === track,
      );
      for (let index = 0; index < references.length; index++) {
        const reference = references[index]!;
        const { submission } = await call("/practice", token, {
          courseId: "intro-programming",
          exerciseId: reference.exerciseId,
          language: track,
          source: reference.source,
        });
        const result = await pollSubmission(submission.id, token);
        assert.equal(
          result.status,
          "passed",
          `${track}/${reference.exerciseId}: ${result.result?.feedback} ${result.result?.compileErrors || ""}`,
        );
        assert.equal(result.result.passed, result.result.total);
        testedCases += result.result.total;
        console.log(
          `${track}: ${index + 1}/${references.length} practices verified through API + Docker`,
        );
      }
      student = (await call("/bootstrap", token)).student;
      assert.equal(
        student.progress["intro-programming"].practiceAssessment.completed,
        38,
      );
      assert.equal(
        student.progress["intro-programming"].practiceAssessment.score,
        10,
      );
      for (let week = 1; week < 8; week++)
        await call("/calendar/advance", token, { unit: "week", confirm: true });
      const midterm = await takeExam(token, track, "midterm", 1);
      for (let week = 8; week < 16; week++)
        await call("/calendar/advance", token, { unit: "week", confirm: true });
      const failed = await takeExam(token, track, "final", 1, true);
      assert.equal(
        failed.student.grades.find(
          (grade: any) => grade.courseId === "intro-programming",
        ).status,
        "failed",
        "Correct choices bypassed required code criterion.",
      );
      const retake = await takeExam(token, track, "final", 2);
      assert.notEqual(
        retake.exam.assessmentVersion,
        failed.exam.assessmentVersion,
        "Retake reused the original definition.",
      );
      const grade = retake.student.grades.find(
        (grade: any) => grade.courseId === "intro-programming",
      );
      assert.equal(grade.status, "passed");
      assert.equal(grade.score, 10);
      return {
        track,
        profile,
        studentId: student.id,
        lessons: lessons.length,
        practices: references.length,
        testedCases,
        midterm: midterm.exam.score,
        failedFinal: failed.exam.score,
        retake: retake.exam.score,
        courseScore: grade.score,
        examHistoryCount: retake.student.exams.length,
      };
    }),
  );
  const report = {
    testedAt: new Date().toISOString(),
    environment:
      "private loopback development API with real restricted Docker execution",
    elapsedSeconds: Math.round((Date.now() - began) / 1000),
    learners,
    productionCertified: false,
    limitation:
      "Authored reference learners only; not independent academic review, production load or real beginner validation.",
  };
  await writeFile(
    resolve(reportDir, "latest.json"),
    JSON.stringify(report, null, 2),
  );
  console.log(JSON.stringify(report, null, 2));
}
