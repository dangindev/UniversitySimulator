import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { JWTPayload } from 'jose';
import { programs } from '@university-simulator/core';
import { verifyAdminIdentity, assertVerifiedAdminActor, type AdminActor } from '../src/admin-auth.js';
import { AdminOperations, createRedisExecutionControl, EXECUTION_PAUSED_KEY, type ExecutionControl } from '../src/admin-operations.js';
import { UniversityService, type Capabilities } from '../src/service.js';
import { SqliteStore, type Store } from '../src/store.js';
import { createDevelopmentBank } from '../src/bank.js';

const issuer = 'https://example.supabase.test/auth/v1';
const signedHeader = 'Bearer signed.jwt.fixture';
const validPayload = (): JWTPayload => ({ sub: 'admin-confirmed', iss: issuer, aud: 'authenticated', exp: Math.floor(Date.now() / 1000) + 3600, role: 'authenticated', aal: 'aal2', app_metadata: { role: 'admin' } });
const admin = (overrides: JWTPayload = {}) => verifyAdminIdentity(signedHeader, { issuer, verifyToken: async () => ({ ...validPayload(), ...overrides }) });
const capabilities: Capabilities = { developmentAuth: true, assessmentMode: 'development-samples', codeExecution: false, productionReady: false, curriculumVersion: '2026.v1', contentStatus: 'draft' };
const reason = 'Sự cố nền tảng đã được xác nhận trong nhật ký vận hành.';
let store: SqliteStore;
let service: UniversityService;
let operations: AdminOperations;
let actor: AdminActor;
let paused: boolean;
let control: ExecutionControl;
const now = Date.parse('2026-11-01T00:00:00Z');

beforeEach(async () => {
  store = new SqliteStore(':memory:');
  service = new UniversityService(store, createDevelopmentBank(), capabilities, () => now);
  paused = false;
  control = { configured: true, isPaused: async () => paused, setPaused: async value => { paused = value; } };
  operations = new AdminOperations(service, store, { executionControl: control, now: () => now });
  actor = await admin();
});
afterEach(async () => { await store.close(); vi.restoreAllMocks(); vi.unstubAllEnvs(); });

function auditRows() { return store.db.prepare('SELECT document FROM admin_audit ORDER BY rowid').all().map(row => JSON.parse(row.document as string)); }
async function attempt() {
  await service.createStudent('student-one', { displayName: 'Sinh viên kiểm thử', major: 'it', track: 'python' });
  await service.enroll('student-one', { courseIds: programs.find(program => program.id === 'it')!.recommendedPath[0] });
  await store.mutateStudent('student-one', student => { student.week = 16; });
  return (await service.startExam('student-one', { courseId: 'intro-programming', kind: 'midterm' })).exam;
}

describe('verified admin identity and MFA boundary', () => {
  it('requires a verified authenticated token with admin app_metadata and aal2', async () => {
    expect(actor).toMatchObject({ id: 'admin-confirmed', role: 'admin', aal: 'aal2', issuer });
    expect(Object.isFrozen(actor)).toBe(true);
    expect(() => assertVerifiedAdminActor(actor)).not.toThrow();
  });

  it('rejects a claimed admin in editable user_metadata, and rejects editor/learner roles', async () => {
    await expect(admin({ app_metadata: { role: 'learner' }, user_metadata: { role: 'admin' } })).rejects.toMatchObject({ status: 403, code: 'admin_role_required' });
    await expect(admin({ app_metadata: { role: 'editor' } })).rejects.toMatchObject({ status: 403 });
    await expect(admin({ app_metadata: undefined, user_metadata: { role: 'admin' } })).rejects.toMatchObject({ status: 403 });
  });

  it('requires the signed MFA assurance claim even for an administrator', async () => {
    await expect(admin({ aal: 'aal1' })).rejects.toMatchObject({ status: 403, code: 'admin_mfa_required' });
    await expect(admin({ aal: undefined })).rejects.toMatchObject({ status: 403, code: 'admin_mfa_required' });
  });

  it('does not accept local development tokens or a missing bearer session', async () => {
    const verifier = vi.fn(async () => validPayload());
    await expect(verifyAdminIdentity('Bearer local.payload.signature', { issuer, verifyToken: verifier })).rejects.toMatchObject({ status: 401 });
    await expect(verifyAdminIdentity(undefined, { issuer, verifyToken: verifier })).rejects.toMatchObject({ status: 401 });
    expect(verifier).not.toHaveBeenCalled();
  });

  it('rejects expired or wrong-issuer/audience/role claims and never leaks verifier errors', async () => {
    for (const payload of [{ exp: Math.floor(Date.now() / 1000) - 1 }, { exp: undefined }, { iss: 'https://attacker.invalid/auth/v1' }, { aud: 'service_role' }, { role: 'service_role' }]) await expect(admin(payload)).rejects.toMatchObject({ status: 401 });
    const result = verifyAdminIdentity(signedHeader, { issuer, verifyToken: async () => { throw new Error('PRIVATE_TOKEN_DO_NOT_LOG'); } });
    await expect(result).rejects.toMatchObject({ status: 401, code: 'invalid_admin_session' });
    await expect(result).rejects.not.toHaveProperty('message', expect.stringContaining('PRIVATE_TOKEN'));
  });

  it('forbids injected verifiers outside the test process even when developer authentication is enabled', async () => {
    vi.stubEnv('VITEST', 'false'); vi.stubEnv('NODE_ENV', 'production'); vi.stubEnv('ENABLE_DEV_AUTH', 'true');
    await expect(verifyAdminIdentity(signedHeader, { issuer, verifyToken: async () => validPayload() })).rejects.toMatchObject({ status: 503, code: 'test_verifier_forbidden' });
  });

  it('rejects a plain or serialized actor, preventing request-body actor spoofing', async () => {
    const fake = { ...actor };
    expect(() => assertVerifiedAdminActor(fake)).toThrow();
    await expect(operations.setExecutionPaused(fake, true, reason)).rejects.toMatchObject({ status: 403 });
    expect(paused).toBe(false); expect(auditRows()).toEqual([]);
  });
});

describe('audited incident operations', () => {
  it('voids the target attempt, preserves its evidence and atomically stores a private student audit', async () => {
    const exam = await attempt();
    await service.saveExam('student-one', exam.id, { answers: { variable: '1' } });
    const before = (await store.getStudent('student-one'))!.exams[0]!;
    const result = await operations.voidAttempt(actor, 'student-one', exam.id, reason);
    expect(result).toMatchObject({ studentId: 'student-one', examId: exam.id, status: 'void' });
    const saved = (await store.getStudent('student-one'))!;
    expect(saved.exams[0]!.status).toBe('void');
    expect(saved.exams[0]!.answers).toEqual(before.answers);
    expect(saved.exams[0]!.deadlineAt).toBe(before.deadlineAt);
    expect(saved.administrativeEvents).toHaveLength(1);
    expect(saved.administrativeEvents![0]).toMatchObject({ actorId: actor.id, reason, action: 'exam.void', phase: 'succeeded' });
    const journal = auditRows();
    expect(journal.map(event => event.phase)).toEqual(['requested', 'succeeded']);
    expect(journal.every(event => event.operationId === result.operationId)).toBe(true);
    expect(JSON.stringify(result)).not.toContain('correctOption');
    expect(JSON.stringify(result)).not.toContain('definition');
    const publicData = JSON.stringify(await service.bootstrap('student-one'));
    expect(publicData).not.toContain('administrativeEvents'); expect(publicData).not.toContain('actorId');
  });

  it('requires a meaningful reason and an existing target without modifying either state or audit', async () => {
    const exam = await attempt();
    await expect(operations.voidAttempt(actor, 'student-one', exam.id, 'short')).rejects.toMatchObject({ status: 400 });
    await expect(operations.voidAttempt(actor, 'student-one', 'missing-exam', reason)).rejects.toMatchObject({ status: 404 });
    expect((await store.getStudent('student-one'))!.exams[0]!.status).toBe('active');
    expect(auditRows()).toEqual([]);
  });

  it('fails closed before the action if the persistent global audit cannot be written', async () => {
    const exam = await attempt();
    vi.spyOn(store, 'appendAdminAudit').mockRejectedValue(new Error('SECRET_DATABASE_CONNECTION'));
    await expect(operations.voidAttempt(actor, 'student-one', exam.id, reason)).rejects.toMatchObject({ status: 503, code: 'admin_audit_unavailable' });
    expect((await store.getStudent('student-one'))!.exams[0]!.status).toBe('active');
  });

  it('records a failed operation without private exception details', async () => {
    const exam = await attempt();
    vi.spyOn(service, 'voidExam').mockRejectedValue(new Error('SECRET_DATABASE_CONNECTION'));
    await expect(operations.voidAttempt(actor, 'student-one', exam.id, reason)).rejects.toMatchObject({ status: 503, code: 'admin_operation_failed' });
    expect(auditRows().map(event => event.phase)).toEqual(['requested', 'failed']);
    expect(JSON.stringify(auditRows())).not.toContain('SECRET_DATABASE_CONNECTION');
  });

  it('keeps the student audit if final global confirmation fails after a successful action', async () => {
    const exam = await attempt(), originalAppend = store.appendAdminAudit.bind(store); let writes = 0;
    vi.spyOn(store, 'appendAdminAudit').mockImplementation(async event => { if (++writes === 2) throw new Error('unavailable'); await originalAppend(event); });
    await expect(operations.voidAttempt(actor, 'student-one', exam.id, reason)).rejects.toMatchObject({ status: 503, code: 'admin_audit_unavailable' });
    const saved = (await store.getStudent('student-one'))!;
    expect(saved.exams[0]!.status).toBe('void'); expect(saved.administrativeEvents).toHaveLength(1);
    expect(auditRows().map(event => event.phase)).toEqual(['requested']);
  });

  it('makes the global audit append-only at the local database boundary', async () => {
    await operations.setExecutionPaused(actor, true, reason);
    expect(() => store.db.prepare('UPDATE admin_audit SET document=?').run('{}')).toThrow(/append-only/);
    expect(() => store.db.prepare('DELETE FROM admin_audit').run()).toThrow(/append-only/);
    expect(auditRows()).toHaveLength(2);
  });

  it('wraps grading-error retry with a verified actor and linked persistent audits', async () => {
    const exam = await attempt();
    vi.spyOn(service, 'retryExamGrading').mockImplementation(async (studentId, examId, _reason, event) => store.mutateStudent(studentId, student => {
      student.exams.find(item => item.id === examId)!.status = 'grading';
      if (event) (student.administrativeEvents ??= []).push(structuredClone(event));
    }));
    const result = await operations.retryGrading(actor, 'student-one', exam.id, reason);
    expect(result.status).toBe('grading');
    expect(auditRows().map(event => [event.action, event.phase])).toEqual([['exam.retry', 'requested'], ['exam.retry', 'succeeded']]);
    expect((await store.getStudent('student-one'))!.administrativeEvents![0]!.operationId).toBe(result.operationId);
  });
});

describe('execution emergency controls and truthful readiness', () => {
  it('persists pause/resume through the injected Redis control and writes linked audit records', async () => {
    expect(EXECUTION_PAUSED_KEY).toBe('usim:execution-paused');
    expect((await operations.setExecutionPaused(actor, true, reason)).scope).toBe('new-executions-only');
    expect(paused).toBe(true);
    await operations.setExecutionPaused(actor, false, 'Dịch vụ đã được kiểm tra và đủ điều kiện tiếp tục.');
    expect(paused).toBe(false);
    expect(auditRows().map(event => event.action)).toEqual(['execution.pause', 'execution.pause', 'execution.resume', 'execution.resume']);
  });

  it('does not mutate state when execution controls or the journal are unavailable', async () => {
    const unavailable = new AdminOperations(service, store, { executionControl: null });
    await expect(unavailable.setExecutionPaused(actor, true, reason)).rejects.toMatchObject({ status: 503, code: 'execution_control_unavailable' });
    expect(auditRows()).toEqual([]);
    const noJournal = Object.assign(Object.create(store), { appendAdminAudit: undefined }) as Store;
    await expect(new AdminOperations(service, noJournal, { executionControl: control }).setExecutionPaused(actor, true, reason)).rejects.toMatchObject({ status: 503, code: 'admin_audit_unavailable' });
    expect(paused).toBe(false);
    expect(createRedisExecutionControl('')).toBeNull();
  });

  it('does not leak Redis connection failures and records the failed administrative command', async () => {
    control.setPaused = async () => { throw new Error('redis://SECRET_PASSWORD@host'); };
    await expect(operations.setExecutionPaused(actor, true, reason)).rejects.toMatchObject({ status: 503, code: 'execution_control_unavailable' });
    expect(auditRows().map(event => event.phase)).toEqual(['requested', 'failed']);
    expect(JSON.stringify(auditRows())).not.toContain('SECRET_PASSWORD');
    expect(paused).toBe(false);
  });

  it('reports actual draft content, curriculum validation and budget thresholds without secrets or answer keys', async () => {
    vi.stubEnv('EXECUTION_MONTHLY_SECONDS', '1000');
    await store.reserveExecution('budget-a', '2026-11', 700, 1000);
    let report = await operations.readiness(actor);
    expect(report.publicLaunchReady).toBe(false);
    expect(report.content.academicallyReviewed).toBe(false);
    expect(report.curriculum.errors).toEqual([]);
    expect(report.execution).toMatchObject({ reservedSeconds: 700, limitSeconds: 1000, utilization: 0.7, paused: false, warnings: ['execution_budget_70_percent'] });
    await store.reserveExecution('budget-b', '2026-11', 150, 1000);
    report = await operations.readiness(actor);
    expect(report.execution.warnings).toEqual(['execution_budget_85_percent']);
    expect(JSON.stringify(report)).not.toContain('correctOption'); expect(JSON.stringify(report)).not.toContain('E2B_API_KEY'); expect(JSON.stringify(report)).not.toContain('definition');
    expect(auditRows()).toEqual([]);
  });

  it('reports an invalid budget or unavailable pause state explicitly instead of presenting a healthy limit', async () => {
    vi.stubEnv('EXECUTION_MONTHLY_SECONDS', 'not-a-number');
    control.isPaused = async () => { throw new Error('PRIVATE_REDIS_URL'); };
    const report = await operations.readiness(actor);
    expect(report.execution.limitSeconds).toBeNull(); expect(report.execution.paused).toBeNull();
    expect(report.execution.warnings).toContain('execution_budget_invalid'); expect(report.execution.warnings).toContain('execution_control_unavailable');
    expect(JSON.stringify(report)).not.toContain('PRIVATE_REDIS_URL');
  });
});
