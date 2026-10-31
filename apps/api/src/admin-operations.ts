import { randomUUID } from 'node:crypto';
import { Redis } from 'ioredis';
import { courses, curriculumVersion, validateCurriculum } from '@university-simulator/core';
import { contentReleaseStatus, courseReadiness } from '@university-simulator/content';
import { assertVerifiedAdminActor, type AdminActor } from './admin-auth.js';
import type { UniversityService } from './service.js';
import type { Store } from './store.js';
import { ApiError, type StudentDocument } from './types.js';

export const EXECUTION_PAUSED_KEY = 'usim:execution-paused';
export interface AdminAuditEvent {
  readonly id: string;
  readonly operationId: string;
  readonly action: 'exam.void' | 'exam.retry' | 'execution.pause' | 'execution.resume';
  readonly phase: 'requested' | 'succeeded' | 'failed';
  readonly actorId: string;
  readonly at: string;
  readonly reason: string;
  readonly target: { readonly studentId?: string; readonly examId?: string };
  readonly details?: Readonly<Record<string, string | number | boolean>>;
}
export interface AdministrativeAuditStore { appendAdminAudit(event: AdminAuditEvent): Promise<void> }
export interface ExecutionControl {
  readonly configured: boolean;
  isPaused(): Promise<boolean>;
  setPaused(paused: boolean): Promise<void>;
  close?(): Promise<void>;
}
export interface AdminOperationsOptions { executionControl?: ExecutionControl | null; now?: () => number }

/** Persistent Redis switch. It stops starting new work; already-running jobs may finish safely. */
export function createRedisExecutionControl(url: string | undefined = process.env.REDIS_URL): ExecutionControl | null {
  if (!url) return null;
  const redis = new Redis(url, { lazyConnect: true, enableOfflineQueue: false, maxRetriesPerRequest: 1, connectTimeout: 2000, commandTimeout: 2000 });
  redis.on('error', () => undefined); // The caller receives a sanitized operational error; never log a Redis credential URL.
  let connecting: Promise<void> | undefined;
  const ready = async () => {
    if (redis.status === 'ready') return;
    if (!connecting) connecting = redis.connect().then(() => undefined).finally(() => { connecting = undefined; });
    await connecting;
  };
  return {
    configured: true,
    async isPaused() { await ready(); return await redis.get(EXECUTION_PAUSED_KEY) === '1'; },
    async setPaused(paused) { await ready(); await redis.set(EXECUTION_PAUSED_KEY, paused ? '1' : '0'); },
    async close() { redis.disconnect(); },
  };
}

function reasonText(reason: unknown): string {
  if (typeof reason !== 'string' || reason.trim().length < 10 || reason.length > 500) throw new ApiError(400, 'Lý do quản trị cần từ 10 đến 500 ký tự.', 'admin_reason_required');
  return reason.trim();
}
function identifier(value: unknown, label: string): string {
  if (typeof value !== 'string' || !value.trim() || value.length > 128) throw new ApiError(400, `${label} không hợp lệ.`);
  return value.trim();
}
type AuditedStudent = StudentDocument & { administrativeEvents?: AdminAuditEvent[] };
type AuditedUniversityService = UniversityService & {
  voidExam(userId: string, examId: string, reason: string, audit?: AdminAuditEvent): Promise<StudentDocument>;
  retryExamGrading(userId: string, examId: string, reason: string, audit?: AdminAuditEvent): Promise<StudentDocument>;
};

export class AdminOperations {
  private readonly now: () => number;
  constructor(readonly university: UniversityService, readonly store: Store, readonly options: AdminOperationsOptions = {}) { this.now = options.now ?? Date.now; }
  private event(actor: AdminActor, action: AdminAuditEvent['action'], phase: AdminAuditEvent['phase'], operationId: string, reason: string, target: AdminAuditEvent['target'], details?: AdminAuditEvent['details']): AdminAuditEvent {
    return Object.freeze({ id: randomUUID(), operationId, action, phase, actorId: actor.id, at: new Date(this.now()).toISOString(), reason, target: Object.freeze({ ...target }), ...(details ? { details: Object.freeze({ ...details }) } : {}) });
  }
  private async append(event: AdminAuditEvent) {
    const audit = this.store as Store & Partial<AdministrativeAuditStore>;
    if (typeof audit.appendAdminAudit !== 'function') throw new ApiError(503, 'Chưa cấu hình nhật ký quản trị bất biến; thao tác bị từ chối.', 'admin_audit_unavailable');
    try { await audit.appendAdminAudit(event); }
    catch { throw new ApiError(503, 'Không ghi được nhật ký quản trị. Kiểm tra trạng thái thao tác trước khi thử lại.', 'admin_audit_unavailable'); }
  }
  async voidAttempt(actor: AdminActor, studentIdValue: unknown, examIdValue: unknown, reasonValue: unknown) {
    assertVerifiedAdminActor(actor);
    const studentId = identifier(studentIdValue, 'Mã sinh viên'), examId = identifier(examIdValue, 'Mã lượt thi'), reason = reasonText(reasonValue);
    const student = await this.store.getStudent(studentId);
    const exam = student?.exams.find(item => item.id === examId);
    if (!student || !exam) throw new ApiError(404, 'Không tìm thấy lượt thi cần xử lý.');
    const operationId = randomUUID(), target = { studentId, examId };
    await this.append(this.event(actor, 'exam.void', 'requested', operationId, reason, target, { previousStatus: exam.status }));
    const completed = this.event(actor, 'exam.void', 'succeeded', operationId, reason, target, { previousStatus: exam.status, status: 'void' });
    let updated: AuditedStudent;
    try { updated = await (this.university as AuditedUniversityService).voidExam(studentId, examId, reason, completed); }
    catch (error) {
      await this.append(this.event(actor, 'exam.void', 'failed', operationId, reason, target, { error: 'operation_failed' }));
      if (error instanceof ApiError) throw error;
      throw new ApiError(503, 'Không hoàn tất được thao tác xử lý lượt thi.', 'admin_operation_failed');
    }
    if (!updated.administrativeEvents?.some(event => event.id === completed.id)) throw new ApiError(503, 'Thao tác cần được đối soát: nhật ký sinh viên chưa xác nhận.', 'student_audit_unavailable');
    await this.append(completed);
    return { operationId, studentId, examId, status: 'void' as const, audit: completed };
  }

  async retryGrading(actor: AdminActor, studentIdValue: unknown, examIdValue: unknown, reasonValue: unknown) {
    assertVerifiedAdminActor(actor);
    const studentId = identifier(studentIdValue, 'Mã sinh viên'), examId = identifier(examIdValue, 'Mã lượt thi'), reason = reasonText(reasonValue);
    const student = await this.store.getStudent(studentId), exam = student?.exams.find(item => item.id === examId);
    if (!student || !exam) throw new ApiError(404, 'Không tìm thấy lượt thi cần xử lý.');
    const operationId = randomUUID(), target = { studentId, examId };
    await this.append(this.event(actor, 'exam.retry', 'requested', operationId, reason, target, { previousStatus: exam.status }));
    const completed = this.event(actor, 'exam.retry', 'succeeded', operationId, reason, target, { previousStatus: exam.status, status: 'grading' });
    let updated: AuditedStudent;
    try { updated = await (this.university as AuditedUniversityService).retryExamGrading(studentId, examId, reason, completed); }
    catch (error) {
      await this.append(this.event(actor, 'exam.retry', 'failed', operationId, reason, target, { error: 'operation_failed' }));
      if (error instanceof ApiError) throw error;
      throw new ApiError(503, 'Không hoàn tất được thao tác chấm lại.', 'admin_operation_failed');
    }
    if (!updated.administrativeEvents?.some(event => event.id === completed.id)) throw new ApiError(503, 'Thao tác cần được đối soát: nhật ký sinh viên chưa xác nhận.', 'student_audit_unavailable');
    await this.append(completed);
    return { operationId, studentId, examId, status: 'grading' as const, audit: completed };
  }

  async setExecutionPaused(actor: AdminActor, pausedValue: unknown, reasonValue: unknown) {
    assertVerifiedAdminActor(actor);
    if (typeof pausedValue !== 'boolean') throw new ApiError(400, 'Trạng thái tạm dừng phải là true hoặc false.');
    const paused = pausedValue, reason = reasonText(reasonValue), control = this.options.executionControl;
    if (!control?.configured) throw new ApiError(503, 'Chưa cấu hình Redis điều khiển thực thi; trạng thái không bị thay đổi.', 'execution_control_unavailable');
    const operationId = randomUUID(), action = paused ? 'execution.pause' : 'execution.resume';
    await this.append(this.event(actor, action, 'requested', operationId, reason, {}, { paused }));
    try { await control.setPaused(paused); }
    catch {
      await this.append(this.event(actor, action, 'failed', operationId, reason, {}, { error: 'control_unavailable' }));
      throw new ApiError(503, 'Không xác nhận được trạng thái thực thi. Kiểm tra Redis trước khi thử lại.', 'execution_control_unavailable');
    }
    const audit = this.event(actor, action, 'succeeded', operationId, reason, {}, { paused });
    await this.append(audit);
    return { operationId, paused, audit, scope: 'new-executions-only' as const };
  }

  async readiness(actor: AdminActor) {
    assertVerifiedAdminActor(actor);
    const at = new Date(this.now()).toISOString(), month = at.slice(0, 7), reservedSeconds = await this.store.monthlyExecutionSeconds(month);
    const configuredLimit = Number(process.env.EXECUTION_MONTHLY_SECONDS ?? 1000000), validLimit = Number.isFinite(configuredLimit) && configuredLimit > 0;
    const limitSeconds = validLimit ? configuredLimit : null;
    const utilization = limitSeconds === null ? null : reservedSeconds / limitSeconds;
    const warnings: string[] = [];
    if (utilization === null) warnings.push('execution_budget_invalid');
    else if (utilization >= 1) warnings.push('execution_budget_exhausted');
    else if (utilization >= 0.85) warnings.push('execution_budget_85_percent');
    else if (utilization >= 0.7) warnings.push('execution_budget_70_percent');
    let paused: boolean | null = null;
    const control = this.options.executionControl;
    if (!control?.configured) warnings.push('execution_control_unavailable');
    else { try { paused = await control.isPaused(); } catch { warnings.push('execution_control_unavailable'); } }
    const errors = validateCurriculum(), readiness = courses.map(course => courseReadiness[course.id]);
    const contentComplete = readiness.every(course => course?.academicallyReviewed && course.releaseEligible && course.assessmentBankReady);
    const privateAssessmentReady = Boolean(this.university.bank?.reviewed && !this.university.bank.development);
    return {
      at, publicLaunchReady: Boolean(contentReleaseStatus.publicLaunchReady) && contentComplete && errors.length === 0 && privateAssessmentReady && this.university.capabilities.codeExecution && validLimit && Boolean(control?.configured) && paused === false && utilization !== null && utilization < 1,
      content: { ...contentReleaseStatus, totalCourses: courses.length, reviewedCourses: readiness.filter(course => course?.academicallyReviewed).length, releaseEligibleCourses: readiness.filter(course => course?.releaseEligible).length },
      curriculum: { version: curriculumVersion, errors },
      assessment: { mode: this.university.capabilities.assessmentMode, executionConfigured: this.university.capabilities.codeExecution },
      execution: { month, reservedSeconds, limitSeconds, utilization, paused, controlConfigured: Boolean(control?.configured), warnings },
    };
  }
}
