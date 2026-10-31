# University Simulator API v1

Base URL: `http://127.0.0.1:3001/api/v1` in local development. All routes except `health`, `auth/dev`, and public credential lookup require `Authorization: Bearer <accessToken>`. Errors use `{error: string, message: string}` with an appropriate HTTP status. Scores, elapsed time, balances and account IDs supplied by a client are never accepted as authority.

## Authentication and bootstrap

- `GET /health` → `{status, developmentAuth, assessmentMode, codeExecution, productionReady, curriculumVersion, contentStatus, serverTime, executionLimit}`. `assessmentMode` is `unavailable | development-samples | private-reviewed`.
- `POST /auth/dev` body `{profile?: string, displayName?: string}` → `{accessToken, user:{id,displayName}, development:true}`. This exists only with `ENABLE_DEV_AUTH=true`, outside production, on a loopback-bound development API. `profile` is a stable local testing profile, not an authentication mechanism for public hosting. Tokens expire after 24 hours and are invalidated when the API restarts.
- With Supabase configured, the browser obtains a Google/email-link session through Supabase Auth and sends its access token. The API verifies signature, issuer, audience and authenticated role against the project's JWKS.
- `GET /bootstrap` → `{student, courses, programs, capabilities, placementQuestions, activities, exercises, serverTime}`. Before character creation `student` is `null`.
- `GET /catalog` → `{courses,programs}`. `GET /me` → `{student}`.
- `POST /students` body `{displayName:string,major:'it'|'cs',track:'cpp'|'python'}` → `{student}`.

The public student document has:

```ts
{
  id, displayName, major, track, curriculumVersion, semester, week, day,
  energy, stress, balance, housing:'dorm'|'rental', createdAt, updatedAt, revision,
  enrollments:Array<{courseId,semester,section,enrolledAt}>,
  grades:Array<{courseId,semester,status:'passed'|'failed'|'exempt',score?:number}>,
  completedLessons:string[], attendance:string[],
  progress:Record<string, {courseId,lessons,attendance,practice,checkpointScores,midterm?,final?}>,
  relationships:Record<string,number>,
  ledger:Array<{id,activityId,amount,balance,at}>, exemptions:string[],
  placementLevel?, placementAt?, placementSemester?,
  credentials:Array<{code,type,issuedAt,public,curriculumVersion}>,
  exams:PublicExam[], summary:TranscriptSummary, graduation:GraduationAudit
}
```

Exam answer keys and private definitions are removed by the single `publicStudent` serializer on **every** student response.

## Learning and enrollment

- `POST /placement` body `{answers:Record<questionId,optionId>}` → `{student,level,breakdown,developmentSample}`. Bootstrap placement groups contain `{level,questions:[{id,prompt,options:[{id,text}]}]}`. Levels pass consecutively at 75%; exemptions count credits but not GPA. Retesting is allowed in a later simulated semester. The public development placement is a short demonstration, not a validated language proficiency test.
- `POST /enrollments` body `{courseIds:string[],sections?:Record<courseId,section>,allowImprovement?:boolean}` → `{student}`. This **replaces** the current term's desired registration set during weeks 1–2. Unchanged courses retain fees/progress; removing a course refunds its server-recorded tuition and reverses the corresponding tuition support, preventing grant/refund farming. A course with a nonvoid formal assessment cannot be withdrawn. An empty set withdraws all eligible registrations. Other sets enforce 12–22 credits except final/repeat/improvement terms, plus prerequisites, duplicate courses and section collisions. `allowImprovement:true` permits courses passed in an earlier semester, resets their new-term assessment progress, and keeps earlier earned credit/GPA until a better valid result exists; it cannot convert English exemptions into GPA grades. Registration closes after week 2.
- `POST /learning/checkpoint` body `{courseId,lessonId,answer:string}` → `{student,correct,explanation}`. `answer` is a zero-based option index encoded as a string. Lesson checkpoint keys are public practice feedback. Attendance is recorded after a valid response even when it is wrong; lesson completion requires a correct response. This does not fabricate formal exam results. For a language bridge, use the bridge ID as `courseId` (e.g. `bridge-cpp`); it does not require enrollment, does not add academic attendance/credits/GPA and records `completedBridges` only after all its checkpoints pass. Enrollment enforces required bridges for the selected entry track.
- `POST /practice` body `{courseId,exerciseId,language:'cpp'|'python'|'javascript'|'sql',source:string}` → `{submission}`. Exercise descriptors come from bootstrap. Returns 503 if the isolated executor/queue is not configured; never evaluates learner source on the application host.
- `GET /submissions/:id` → `{submission}` for its owner only. Status: `queued | running | passed | failed | error`. A system error is not a failing academic grade.
- `POST /projects/:courseId/submit` body `{exerciseId,language,source}` → the same queued submission response. A private exercise declares `projectStage:1|2|3`; client-supplied stages or scores are ignored. Only three verified artifact results can produce a project course grade, weighted 20/30/50. Project courses reject the multiple-choice exam endpoint.

## Timed exams

- `POST /exams` body `{courseId,kind:'midterm'|'final'}` → `{student,exam,serverTime}`. This resumes an existing live/pending attempt instead of creating a duplicate. Development availability: multiple-choice midterm week 8; final week 16 with six choices and one **actual code question**, selected as C++ or Python for the entry track. Intro final requires verified code practice. Before a new code timer starts, the API checks a live worker heartbeat, operational pause, queue capacity, one pending submission per learner, and atomically reserves the complete VM time with the attempt. If any prerequisite fails, no timer or attempt is created.
- `GET /exams/:id` → `{student,exam,serverTime}`. Also finalizes an expired attempt using the last server-acknowledged answers.
- `PUT /exams/:id/answers` body `{answers:Record<questionId,string>}` → `{student,exam,expired,serverTime}`. Choice values are option IDs; a code question's value is the complete source text (at most 64,000 characters). A save received after the deadline cannot change answers. `savedAt` confirms the last durable server save; a local editor draft is not proof of server receipt.
- `POST /exams/:id/submit` body `{idempotencyKey:string}` → `{student,exam}`. The last acknowledged answers/source, accepted timestamp and grading-outbox marker are committed before a grading job is created. Repeated/concurrent submit uses one stable submission ID. A code exam returns `grading` with no final score until isolated tests finish; queue delay past the deadline does not make accepted source late.

`PublicExam = {id,courseId,kind,semester,startedAt,deadlineAt,savedAt?,acceptedAt?,submittedAt?,status:'active'|'grading'|'grading-error'|'graded'|'void',score?,answers,reason?,assessmentVersion,developmentSample,gradingSubmissionId?,gradingError?,codeResult?,questions}`.

Questions expose `{id,prompt,options,kind:'choice'|'code',language?,starterCode?,weight,requiredPassRatio?}`. Code options are an empty array. No answer key, exercise ID mapping, private test input/output, or execution snapshot is exposed. Version 1 accepts at most one code question per assessment; bank validation rejects unsupported multi-code definitions. Numeric score is the weighted sum of correct choices and code test fraction. Development final assigns each choice weight 1 and the code question weight 4.

`codeResult = {passed,total,feedback,requiredPassRatio,criterionPassed}`. A final code question has an essential pass ratio (default 0.5, validated from 0 to 1). A learner with all choices correct and zero passing code tests keeps the actual numeric score but receives a **failed course**, with a server-authored `GradeRecord.reason`; passing choices cannot substitute for this essential coding outcome. Retakes use the best final attempt that met its own required criterion.

One midterm and at most two final attempts per semester. A server reconciliation loop closes expired attempts even when the browser is offline and rebuilds missing grading submissions from their durable attempt outbox after restart. Code test definitions are frozen privately with the attempt. Execution/provider failures leave the accepted source intact with `grading-error`, no invented failing academic score, and require an audited administrator retry. Semester advancement is blocked while a code grade or incident remains unresolved.

## Administrative operations

These routes require a cryptographically verified Supabase JWT with signed `app_metadata.role='admin'` and `aal='aal2'`. Local development tokens, learner tokens, user-editable metadata and request-body actor objects cannot grant administrative access. Every mutation needs a 10–500-character incident reason, an immutable global requested/outcome audit and an atomic private student journal for exam changes.

- `GET /admin/readiness` → curriculum/content gates, assessment mode, reserved seconds, configured monthly limit, pause status and 70%/85% budget warnings. No service keys or exam answers.
- `POST /admin/exams/:studentId/:examId/void` body `{reason}` → operation ID and audit outcome. Preserves answers, invalidates the affected result and releases the attempt quota.
- `POST /admin/exams/:studentId/:examId/retry` body `{reason}` → operation ID and audit outcome. Only retries a `grading-error` using the **same frozen source and accepted timestamp**, a new job ID and a new atomic execution reservation.
- `POST /admin/execution` body `{paused:boolean,reason}` → audited persistent Redis switch. Preflight, dispatcher and worker all check the switch before starting new work. Already-running isolated jobs may finish; source and queued jobs remain durable.

Administrative journal entries are removed from learner responses. Global audit supports insert/select only for the runtime role; local SQLite additionally rejects audit update/delete through triggers.

## Student life and records

- `POST /skills/office/submit` body `{artifact}` → `{student,assessment}`. Uses the shared `assessOfficeArtifact` validator on the server. Passing requires score at least 8/10 **and** every required criterion. It records `office-skills` as a zero-credit requirement and issues one private office credential per assessment version. Repeated submissions never add GPA/credits or duplicate certificates. The task uses public internal-practice criteria, not a MOS exam. The multiple-choice exam endpoint cannot complete this requirement.

- `POST /life/activity` body `{activityId,idempotencyKey}` → `{student,message}`. Activity IDs: `meal`, `rest`, `job`, `volunteer`, `friend`, `commute`, `aid`, `rent`, `dorm`. Rewards/costs are fixed on the server. Each activity is limited to once per simulated day; client minigame scores do not determine money.
- `POST /calendar/advance` body `{unit:'day'|'week'|'semester',confirm?:true}` → `{student}`. Week/semester transitions require confirmation. Simulated time never passes due to logout. Semester closure with unfinished courses requires confirmation and records them as failed rather than silently awarding credit.
- `POST /credentials` → `{student}` after the graduation audit passes.
- `POST /credentials/:code/share` body `{enabled:boolean}` → `{student}`. Credentials are private by default.
- `GET /credentials/:code` → `{credential,displayName,major,summary,disclaimer}` only if explicitly shared. Otherwise returns 404 without exposing account existence. Graduation summary contains credits/GPA only, never the transcript records; an Office credential exposes only its own practical score.

## Persistence and deployment status

Local mode uses Node 24 SQLite under ignored `.data/`. Production requires PostgreSQL migration 3, Supabase, Redis, E2B, a reviewed private assessment bank, and a reviewed content manifest covering **all** offered courses. Startup refuses public deployment without those prerequisites. `curriculumVersion` is pinned to `2026.v1` at profile creation; the compatibility backfill only fills missing version fields and never overwrites an existing version. Private banks and their keys must never be placed in this public repository. `/api/docs` serves OpenAPI.
