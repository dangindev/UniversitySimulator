import { spawn } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { performance } from "node:perf_hooks";
import { getProgram, type ProgramId } from "@university-simulator/core";
import { createDevelopmentBank } from "../apps/api/src/bank.js";

// An isolated, disposable loopback API: this never sends load to a public service.
const participants = 100;
const port = 3118;
const runId = Date.now().toString(36);
const dataDir = resolve(".data", `load-${runId}`);
mkdirSync(dataDir, { recursive: true });
// Explicit synthetic API-only fixture: this test does not benchmark M1 code assessment/execution.
// The actual M1 development bank retains its required coding questions and distinct retake.
const choiceFixture = createDevelopmentBank();
choiceFixture.version = "api-load-public-choice-fixture.1";
choiceFixture.assessments = choiceFixture.assessments.map((assessment) => ({
  ...assessment,
  id: `load-${assessment.id}`,
  version: "api-load-public-choice-fixture.1",
  questions: assessment.questions.filter((question) => question.kind !== "code"),
}));
const choiceFixturePath = resolve(dataDir, "public-choice-fixture.json");
writeFileSync(choiceFixturePath, JSON.stringify(choiceFixture));
const api = `http://127.0.0.1:${port}/api/v1`;
let serverLog = "";
const child = spawn(
  process.execPath,
  ["--import", "tsx", "apps/api/src/main.ts"],
  {
    cwd: process.cwd(),
    env: {
      ...process.env,
      TSX_TSCONFIG_PATH: resolve("apps/api/tsconfig.json"),
      NODE_ENV: "development",
      PORT: String(port),
      LOCAL_DATA_DIR: dataDir,
      ENABLE_DEV_AUTH: "true",
      ENABLE_DEV_ASSESSMENTS: "false",
      DATABASE_URL: "",
      REDIS_URL: "",
      E2B_API_KEY: "",
      ASSESSMENT_BANK_PATH: choiceFixturePath,
      SUPABASE_URL: "",
    },
    windowsHide: true,
    stdio: ["ignore", "pipe", "pipe"],
  },
);
child.stdout.on("data", (chunk) => {
  serverLog += String(chunk);
});
child.stderr.on("data", (chunk) => {
  serverLog += String(chunk);
});
const samples: number[] = [];
let failures = 0;
async function request(
  path: string,
  token?: string,
  body?: unknown,
  method?: string,
): Promise<any> {
  const started = performance.now();
  const response = await fetch(`${api}${path}`, {
    method: method || (body ? "POST" : "GET"),
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  samples.push(performance.now() - started);
  const result = await response.json();
  if (!response.ok) {
    failures++;
    throw new Error(`${path}: ${response.status} ${result.message}`);
  }
  if (JSON.stringify(result).includes("correctOption"))
    throw new Error("Private assessment key leaked.");
  return result;
}
try {
  let ready = false;
  for (let i = 0; i < 75; i++) {
    if (child.exitCode !== null)
      throw new Error(
        `Load-test API refused startup: ${serverLog.slice(-2000)}`,
      );
    try {
      const response = await fetch(`${api}/health`);
      if (response.ok) {
        ready = true;
        break;
      }
    } catch {
      /* startup */
    }
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  if (!ready) throw new Error("Isolated API startup timed out.");
  const began = performance.now();
  const results = await Promise.allSettled(
    Array.from({ length: participants }, async (_, index) => {
      const major: ProgramId = index % 2 ? "cs" : "it";
      const auth = await request("/auth/dev", undefined, {
        profile: `load-${runId}-${index}`,
        displayName: `Load ${index}`,
      });
      const token = auth.accessToken as string;
      await request("/students", token, {
        displayName: `Load ${index}`,
        major,
        track: index % 2 ? "cpp" : "python",
      });
      await request("/enrollments", token, {
        courseIds: getProgram(major).recommendedPath[0],
      });
      for (let week = 1; week < 8; week++)
        await request("/calendar/advance", token, {
          unit: "week",
          confirm: true,
        });
      const { exam } = await request("/exams", token, {
        courseId: "intro-programming",
        kind: "midterm",
      });
      const answers = Object.fromEntries(
        exam.questions.map((question: any) => [
          question.id,
          question.options[0].id,
        ]),
      );
      await request(`/exams/${exam.id}/answers`, token, { answers }, "PUT");
      const result = await request(`/exams/${exam.id}/submit`, token, {
        idempotencyKey: `load-submit-${index}`,
      });
      if (result.exam.status !== "graded")
        throw new Error("Exam was not finalized.");
      const bootstrap = await request("/bootstrap", token);
      if (
        bootstrap.student.displayName !== `Load ${index}` ||
        bootstrap.student.week !== 8 ||
        bootstrap.student.exams.length !== 1
      )
        throw new Error("Progress/ownership invariant failed.");
      await request("/life/activity", token, {
        activityId: "rest",
        idempotencyKey: `load-rest-${index}`,
      });
      return true;
    }),
  );
  const errors = results
    .filter((result) => result.status === "rejected")
    .map((result) => (result as PromiseRejectedResult).reason.message);
  const sorted = samples.toSorted((a, b) => a - b);
  const report = {
    testedAt: new Date().toISOString(),
    environment: "isolated local SQLite development API with a public choice-only synthetic fixture",
    assessmentFixture: "api-load-public-choice-fixture.1",
    concurrentLearners: participants,
    completedLearners: results.filter((result) => result.status === "fulfilled")
      .length,
    requests: samples.length,
    elapsedSeconds: Number(((performance.now() - began) / 1000).toFixed(2)),
    p95Milliseconds: Number(
      (sorted[Math.ceil(sorted.length * 0.95) - 1] || 0).toFixed(1),
    ),
    httpErrors: failures,
    flowErrors: errors,
    executionLoadVerified: false,
    limitation:
      "This is an API-only smoke/load test using an explicitly synthetic public choice fixture; it does not benchmark the real M1 coding bank, production, external-service execution or real learners.",
  };
  writeFileSync(
    resolve(dataDir, "report.json"),
    JSON.stringify(report, null, 2),
  );
  console.log(JSON.stringify(report, null, 2));
  if (errors.length || failures || report.p95Milliseconds >= 1000)
    process.exitCode = 1;
} finally {
  child.kill("SIGTERM");
  writeFileSync(resolve(dataDir, "server.log"), serverLog);
}
