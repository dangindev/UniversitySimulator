# University Simulator

This repository implements the approved University Simulator phase 1 plan. Read `docs/PRODUCT.md`, `docs/content-readiness.md`, `apps/api/API.md`, and `infra/OPERATIONS.md` before changing the corresponding subsystem.

- Preserve both degree paths: IT 125 credits and CS 126 credits, recommended over eight semesters. Run curriculum tests after changing prerequisites, credits or exemptions.
- English placement credits never increase GPA. Technical English remains mandatory. C++/Python entry tracks count as the same course; language bridges carry zero credits.
- Grades, money, deadlines and credentials are server-authoritative. Learner source must run only in the isolated execution adapter; never add host-side `eval`, subprocess execution or a fake passing fallback for learner submissions.
- Public practice answers are intentionally educational. Official assessment banks, expected outputs, credentials and learner data must stay outside this public repository and frontend bundle.
- Development auth and sample assessments are explicitly local-only. Public phase 1 needs every offered course completed and reviewed, private assessments, configured services, learner trials and security/load/recovery validation. Catalog coverage is not content completion.
- Keep curriculum and assessment versions stable for existing learners. Preserve acknowledged answers, accepted submission timestamps, and idempotent grading when recovering from failure.
- Use `npm run typecheck`, `npm test`, and `npm run build` for integration checks. `npm run test:load` runs an isolated local 100-learner API test. Do not describe fake-executor tests or local capacity as live provider/production validation.
