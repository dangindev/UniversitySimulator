import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { Pool } from 'pg';
import { ApiError, type StudentDocument, type Submission, type AuditEvent } from './types.js';

export interface Store {
  getStudent(id: string): Promise<StudentDocument | null>;
  createStudent(student: StudentDocument): Promise<StudentDocument>;
  mutateStudent(id: string, operation: (student: StudentDocument) => void | ExecutionReservation[]): Promise<StudentDocument>;
  enqueueSubmission(submission: Submission, budget?: {month:string;seconds:number;limit:number}): Promise<void>;
  getSubmission(id: string): Promise<Submission | null>;
  updateSubmission(id: string, operation: (submission: Submission) => void): Promise<Submission>;
  claimSubmission(id:string,claim:string,leaseUntil:string):Promise<boolean>;
  gradingBacklog():Promise<number>;
  hasPendingSubmission(userId:string):Promise<boolean>;
  examReconciliationStudents(now:string):Promise<string[]>;
  pendingSubmissions(): Promise<Submission[]>;
  markDispatched(id: string): Promise<void>;
  findCredential(code: string): Promise<StudentDocument | null>;
  monthlyExecutionSeconds(month: string): Promise<number>;
  reserveExecution(id: string, month: string, seconds: number, limit: number): Promise<boolean>;
  close(): Promise<void>;
  appendAdminAudit(event:AuditEvent):Promise<void>;
  executionPaused():Promise<boolean>;
  setExecutionPaused(paused:boolean):Promise<void>;
}
export interface ExecutionReservation {id:string;month:string;seconds:number;limit:number}

const sqliteSchema = `
PRAGMA journal_mode=WAL;
PRAGMA busy_timeout=5000;
CREATE TABLE IF NOT EXISTS schema_migrations(version INTEGER PRIMARY KEY, applied_at TEXT NOT NULL);
INSERT OR IGNORE INTO schema_migrations VALUES(1, datetime('now'));
CREATE TABLE IF NOT EXISTS student_documents(id TEXT PRIMARY KEY, revision INTEGER NOT NULL, document TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS submissions(id TEXT PRIMARY KEY, user_id TEXT NOT NULL, status TEXT NOT NULL, document TEXT NOT NULL);
CREATE INDEX IF NOT EXISTS submission_owner ON submissions(user_id);
CREATE TABLE IF NOT EXISTS submission_outbox(id TEXT PRIMARY KEY, dispatched INTEGER NOT NULL DEFAULT 0);
CREATE TABLE IF NOT EXISTS execution_reservations(id TEXT PRIMARY KEY, month TEXT NOT NULL, seconds INTEGER NOT NULL);
CREATE INDEX IF NOT EXISTS execution_month ON execution_reservations(month);
CREATE TABLE IF NOT EXISTS admin_audit(id TEXT PRIMARY KEY,document TEXT NOT NULL);
CREATE TRIGGER IF NOT EXISTS immutable_admin_audit_update BEFORE UPDATE ON admin_audit BEGIN SELECT RAISE(ABORT,'Admin audit is append-only'); END;
CREATE TRIGGER IF NOT EXISTS immutable_admin_audit_delete BEFORE DELETE ON admin_audit BEGIN SELECT RAISE(ABORT,'Admin audit is append-only'); END;
INSERT OR IGNORE INTO schema_migrations VALUES(2, datetime('now'));
UPDATE student_documents SET document=json_set(document,'$.curriculumVersion','2026.v1') WHERE json_type(document,'$.curriculumVersion') IS NULL;
INSERT OR IGNORE INTO schema_migrations VALUES(3, datetime('now'));
CREATE TABLE IF NOT EXISTS runtime_settings(key TEXT PRIMARY KEY,value TEXT NOT NULL);
INSERT OR IGNORE INTO schema_migrations VALUES(4, datetime('now'));
`;
export class SqliteStore implements Store {
  readonly db: DatabaseSync;
  constructor(path = resolve(process.env.LOCAL_DATA_DIR ?? '.data', 'university.sqlite')) {
    if (path !== ':memory:') mkdirSync(dirname(path), { recursive: true });
    this.db = new DatabaseSync(path);
    this.db.exec(sqliteSchema);
  }
  async getStudent(id: string) {
    const row = this.db.prepare('SELECT document FROM student_documents WHERE id=?').get(id);
    return row ? JSON.parse(row.document as string) as StudentDocument : null;
  }
  async createStudent(student: StudentDocument) {
    try {
      this.db.prepare('INSERT INTO student_documents(id,revision,document) VALUES(?,?,?)')
        .run(student.id, student.revision, JSON.stringify(student));
    } catch (error) {
      if ((error as Error).message.includes('UNIQUE')) throw new ApiError(409, 'Bạn đã tạo sinh viên.', 'student_exists');
      throw error;
    }
    return student;
  }
  async mutateStudent(id: string, operation: (student: StudentDocument) => void | ExecutionReservation[]) {
    this.db.exec('BEGIN IMMEDIATE');
    try {
      const row = this.db.prepare('SELECT document FROM student_documents WHERE id=?').get(id);
      if (!row) throw new ApiError(404, 'Chưa tạo sinh viên.', 'student_missing');
      const student = JSON.parse(row.document as string) as StudentDocument;
      const reservations=operation(student);
      for(const reservation of reservations??[]){
        if(this.db.prepare('SELECT id FROM execution_reservations WHERE id=?').get(reservation.id))continue;
        const total=Number(this.db.prepare('SELECT COALESCE(SUM(seconds),0) AS seconds FROM execution_reservations WHERE month=?').get(reservation.month)!.seconds);
        if(total+reservation.seconds>reservation.limit)throw new ApiError(503,'Chưa đủ ngân sách thực thi để mở lượt thi.','execution_budget_exhausted');
        this.db.prepare('INSERT INTO execution_reservations VALUES(?,?,?)').run(reservation.id,reservation.month,reservation.seconds);
      }
      student.revision += 1;
      student.updatedAt = new Date().toISOString();
      this.db.prepare('UPDATE student_documents SET revision=?,document=? WHERE id=?')
        .run(student.revision, JSON.stringify(student), id);
      this.db.exec('COMMIT');
      return student;
    } catch (error) {
      this.db.exec('ROLLBACK');
      throw error;
    }
  }
  async enqueueSubmission(submission: Submission,budget?:{month:string;seconds:number;limit:number}) {
    this.db.exec('BEGIN IMMEDIATE');
    try {
      const existing = this.db.prepare('SELECT id FROM submissions WHERE user_id=? AND status IN (?,?)').get(submission.userId, 'queued', 'running');
      if (existing) throw new ApiError(409, 'Bạn đang có bài chấm trong hàng đợi.', 'submission_pending');
      if(budget){
        const total=Number(this.db.prepare('SELECT COALESCE(SUM(seconds),0) AS seconds FROM execution_reservations WHERE month=?').get(budget.month)!.seconds);
        if(total+budget.seconds>budget.limit)throw new ApiError(503,'Đã chạm hạn mức thực thi tháng. Bài học và tiến độ vẫn được bảo toàn.','execution_budget_exhausted');
        this.db.prepare('INSERT INTO execution_reservations VALUES(?,?,?)').run(submission.id,budget.month,budget.seconds);
      }
      this.db.prepare('INSERT INTO submissions(id,user_id,status,document) VALUES(?,?,?,?)')
        .run(submission.id, submission.userId, submission.status, JSON.stringify(submission));
      this.db.prepare('INSERT INTO submission_outbox(id) VALUES(?)').run(submission.id);
      this.db.exec('COMMIT');
    } catch (error) { this.db.exec('ROLLBACK'); throw error; }
  }
  async getSubmission(id: string) {
    const row = this.db.prepare('SELECT document FROM submissions WHERE id=?').get(id);
    return row ? JSON.parse(row.document as string) as Submission : null;
  }
  async updateSubmission(id: string, operation: (submission: Submission) => void) {
    this.db.exec('BEGIN IMMEDIATE');
    try {
      const row = this.db.prepare('SELECT document FROM submissions WHERE id=?').get(id);
      if (!row) throw new ApiError(404, 'Không tìm thấy bài nộp.');
      const submission = JSON.parse(row.document as string) as Submission;
      operation(submission);
      this.db.prepare('UPDATE submissions SET status=?,document=? WHERE id=?').run(submission.status, JSON.stringify(submission), id);
      this.db.exec('COMMIT');
      return submission;
    } catch (error) { this.db.exec('ROLLBACK'); throw error; }
  }
  async pendingSubmissions() {
    const now=new Date().toISOString();
    const expired=this.db.prepare("SELECT id,document FROM submissions WHERE status='running' AND json_extract(document,'$.executionLeaseUntil')<=?").all(now);
    for(const row of expired){
      const submission=JSON.parse(row.document as string) as Submission;
      submission.status='error';submission.completedAt=now;
      submission.result={passed:0,total:0,feedback:'Phiên chấm bị gián đoạn. Mã nguồn đã được lưu; hãy gửi lại để chấm, không ghi điểm trượt.'};
      this.db.prepare("UPDATE submissions SET status='error',document=? WHERE id=? AND status='running'").run(JSON.stringify(submission),row.id as string);
    }
    return this.db.prepare('SELECT document FROM submissions WHERE status=? LIMIT 100').all('queued')
      .map(row => JSON.parse(row.document as string) as Submission);
  }
  async claimSubmission(id:string,claim:string,leaseUntil:string){
    const result=this.db.prepare("UPDATE submissions SET status='running',document=json_set(document,'$.status','running','$.executionClaim',?,'$.executionLeaseUntil',?) WHERE id=? AND status='queued'").run(claim,leaseUntil,id);
    return Number(result.changes)===1;
  }
  async gradingBacklog(){return Number(this.db.prepare("SELECT COUNT(*) AS count FROM submissions WHERE status IN ('queued','running')").get()!.count);}
  async hasPendingSubmission(userId:string){return Boolean(this.db.prepare("SELECT id FROM submissions WHERE user_id=? AND status IN ('queued','running') LIMIT 1").get(userId));}
  async examReconciliationStudents(now:string){
    return this.db.prepare("SELECT id FROM student_documents WHERE EXISTS (SELECT 1 FROM json_each(document,'$.exams') e WHERE (json_extract(e.value,'$.status')='active' AND json_extract(e.value,'$.deadlineAt')<=?) OR json_extract(e.value,'$.status')='grading') LIMIT 200").all(now).map(row=>row.id as string);
  }
  async markDispatched(id: string) { this.db.prepare('UPDATE submission_outbox SET dispatched=1 WHERE id=?').run(id); }
  async findCredential(code: string) {
    const rows = this.db.prepare('SELECT document FROM student_documents').all();
    return rows.map(row => JSON.parse(row.document as string) as StudentDocument).find(student => student.credentials.some(c => c.code === code)) ?? null;
  }
  async monthlyExecutionSeconds(month: string) {
    const row = this.db.prepare('SELECT COALESCE(SUM(seconds),0) AS seconds FROM execution_reservations WHERE month=?').get(month)!;
    return Number(row.seconds);
  }
  async reserveExecution(id: string, month: string, seconds: number, limit: number) {
    this.db.exec('BEGIN IMMEDIATE');
    try {
      const existing = this.db.prepare('SELECT id FROM execution_reservations WHERE id=?').get(id);
      const row = this.db.prepare('SELECT COALESCE(SUM(seconds),0) AS seconds FROM execution_reservations WHERE month=?').get(month)!;
      if (existing) { this.db.exec('COMMIT'); return true; }
      if (Number(row.seconds) + seconds > limit) { this.db.exec('COMMIT'); return false; }
      this.db.prepare('INSERT INTO execution_reservations VALUES(?,?,?)').run(id, month, seconds);
      this.db.exec('COMMIT'); return true;
    } catch (error) { this.db.exec('ROLLBACK'); throw error; }
  }
  async close() { this.db.close(); }
  async appendAdminAudit(event:AuditEvent){this.db.prepare('INSERT INTO admin_audit(id,document) VALUES(?,?)').run(event.id,JSON.stringify(event));}
  async executionPaused(){return this.db.prepare("SELECT value FROM runtime_settings WHERE key='execution-paused'").get()?.value==='1';}
  async setExecutionPaused(paused:boolean){this.db.prepare("INSERT INTO runtime_settings(key,value) VALUES('execution-paused',?) ON CONFLICT(key) DO UPDATE SET value=excluded.value").run(paused?'1':'0');}
}

export const postgresSchema = `
CREATE TABLE IF NOT EXISTS schema_migrations(version INTEGER PRIMARY KEY, applied_at TIMESTAMPTZ NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS student_documents(id TEXT PRIMARY KEY, revision INTEGER NOT NULL, document JSONB NOT NULL);
CREATE TABLE IF NOT EXISTS submissions(id TEXT PRIMARY KEY,user_id TEXT NOT NULL,status TEXT NOT NULL,document JSONB NOT NULL);
CREATE INDEX IF NOT EXISTS submission_owner ON submissions(user_id);
CREATE UNIQUE INDEX IF NOT EXISTS one_pending_submission_per_user ON submissions(user_id) WHERE status IN ('queued','running');
CREATE TABLE IF NOT EXISTS submission_outbox(id TEXT PRIMARY KEY REFERENCES submissions(id),dispatched BOOLEAN NOT NULL DEFAULT false);
CREATE TABLE IF NOT EXISTS execution_reservations(id TEXT PRIMARY KEY,month TEXT NOT NULL,seconds INTEGER NOT NULL);
CREATE INDEX IF NOT EXISTS execution_month ON execution_reservations(month);
CREATE TABLE IF NOT EXISTS admin_audit(id TEXT PRIMARY KEY,document JSONB NOT NULL);
INSERT INTO schema_migrations(version) VALUES(1) ON CONFLICT DO NOTHING;
ALTER TABLE student_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE submission_outbox ENABLE ROW LEVEL SECURITY;
ALTER TABLE execution_reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_audit ENABLE ROW LEVEL SECURITY;
INSERT INTO schema_migrations(version) VALUES(2) ON CONFLICT DO NOTHING;
UPDATE student_documents SET document=jsonb_set(document,'{curriculumVersion}','"2026.v1"'::jsonb) WHERE NOT document ? 'curriculumVersion';
INSERT INTO schema_migrations(version) VALUES(3) ON CONFLICT DO NOTHING;
CREATE TABLE IF NOT EXISTS runtime_settings(key TEXT PRIMARY KEY,value TEXT NOT NULL);
ALTER TABLE runtime_settings ENABLE ROW LEVEL SECURITY;
INSERT INTO schema_migrations(version) VALUES(4) ON CONFLICT DO NOTHING;
`;

export class PostgresStore implements Store {
  constructor(readonly pool: Pool) {}
  async initialize() { await this.pool.query(postgresSchema); }
  async getStudent(id: string) {
    return (await this.pool.query('SELECT document FROM student_documents WHERE id=$1', [id])).rows[0]?.document as StudentDocument ?? null;
  }
  async createStudent(student: StudentDocument) {
    try { await this.pool.query('INSERT INTO student_documents VALUES($1,$2,$3)', [student.id, student.revision, student]); }
    catch (error) { if ((error as {code?:string}).code === '23505') throw new ApiError(409, 'Bạn đã tạo sinh viên.'); throw error; }
    return student;
  }
  async mutateStudent(id: string, operation: (student: StudentDocument) => void | ExecutionReservation[]) {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const student = (await client.query('SELECT document FROM student_documents WHERE id=$1 FOR UPDATE', [id])).rows[0]?.document as StudentDocument | undefined;
      if (!student) throw new ApiError(404, 'Chưa tạo sinh viên.', 'student_missing');
      const reservations=operation(student);
      for(const reservation of reservations??[]){
        await client.query('SELECT pg_advisory_xact_lock(hashtext($1))',['execution-'+reservation.month]);
        if((await client.query('SELECT id FROM execution_reservations WHERE id=$1',[reservation.id])).rowCount)continue;
        const total=Number((await client.query('SELECT COALESCE(SUM(seconds),0) AS seconds FROM execution_reservations WHERE month=$1',[reservation.month])).rows[0].seconds);
        if(total+reservation.seconds>reservation.limit)throw new ApiError(503,'Chưa đủ ngân sách thực thi để mở lượt thi.','execution_budget_exhausted');
        await client.query('INSERT INTO execution_reservations VALUES($1,$2,$3)',[reservation.id,reservation.month,reservation.seconds]);
      }
      student.revision++; student.updatedAt = new Date().toISOString();
      await client.query('UPDATE student_documents SET revision=$2,document=$3 WHERE id=$1', [id, student.revision, student]);
      await client.query('COMMIT'); return student;
    } catch (error) { await client.query('ROLLBACK'); throw error; } finally { client.release(); }
  }
  async enqueueSubmission(submission: Submission,budget?:{month:string;seconds:number;limit:number}) {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      if(budget){
        await client.query('SELECT pg_advisory_xact_lock(hashtext($1))',['execution-'+budget.month]);
        const total=Number((await client.query('SELECT COALESCE(SUM(seconds),0) AS seconds FROM execution_reservations WHERE month=$1',[budget.month])).rows[0].seconds);
        if(total+budget.seconds>budget.limit)throw new ApiError(503,'Đã chạm hạn mức thực thi tháng. Bài học và tiến độ vẫn được bảo toàn.','execution_budget_exhausted');
        await client.query('INSERT INTO execution_reservations VALUES($1,$2,$3)',[submission.id,budget.month,budget.seconds]);
      }
      await client.query('INSERT INTO submissions VALUES($1,$2,$3,$4)', [submission.id, submission.userId, submission.status, submission]);
      await client.query('INSERT INTO submission_outbox(id) VALUES($1)', [submission.id]);
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      if ((error as {code?:string}).code === '23505') throw new ApiError(409, 'Bạn đang có bài chấm trong hàng đợi.', 'submission_pending');
      throw error;
    } finally { client.release(); }
  }
  async getSubmission(id: string) { return (await this.pool.query('SELECT document FROM submissions WHERE id=$1', [id])).rows[0]?.document as Submission ?? null; }
  async updateSubmission(id: string, operation: (submission: Submission) => void) {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const submission = (await client.query('SELECT document FROM submissions WHERE id=$1 FOR UPDATE', [id])).rows[0]?.document as Submission | undefined;
      if (!submission) throw new ApiError(404, 'Không tìm thấy bài nộp.');
      operation(submission);
      await client.query('UPDATE submissions SET status=$2,document=$3 WHERE id=$1', [id, submission.status, submission]);
      await client.query('COMMIT'); return submission;
    } catch (error) { await client.query('ROLLBACK'); throw error; } finally { client.release(); }
  }
  async pendingSubmissions() {
    const now=new Date().toISOString();
    await this.pool.query("UPDATE submissions SET status='error',document=document || $2::jsonb WHERE status='running' AND document->>'executionLeaseUntil'<=$1",[now,JSON.stringify({status:'error',completedAt:now,result:{passed:0,total:0,feedback:'Phiên chấm bị gián đoạn. Mã nguồn đã được lưu; hãy gửi lại để chấm, không ghi điểm trượt.'}})]);
    return (await this.pool.query("SELECT document FROM submissions WHERE status='queued' LIMIT 100")).rows.map(row => row.document as Submission);
  }
  async claimSubmission(id:string,claim:string,leaseUntil:string){
    const result=await this.pool.query("UPDATE submissions SET status='running',document=document || $2::jsonb WHERE id=$1 AND status='queued' RETURNING id",[id,JSON.stringify({status:'running',executionClaim:claim,executionLeaseUntil:leaseUntil})]);
    return result.rowCount===1;
  }
  async gradingBacklog(){return Number((await this.pool.query("SELECT COUNT(*) AS count FROM submissions WHERE status IN ('queued','running')")).rows[0].count);}
  async hasPendingSubmission(userId:string){return Boolean((await this.pool.query("SELECT id FROM submissions WHERE user_id=$1 AND status IN ('queued','running') LIMIT 1",[userId])).rowCount);}
  async examReconciliationStudents(now:string){
    return (await this.pool.query("SELECT id FROM student_documents WHERE EXISTS (SELECT 1 FROM jsonb_array_elements(document->'exams') e WHERE (e->>'status'='active' AND e->>'deadlineAt'<=$1) OR e->>'status'='grading') LIMIT 200",[now])).rows.map(row=>row.id as string);
  }
  async markDispatched(id: string) { await this.pool.query('UPDATE submission_outbox SET dispatched=true WHERE id=$1', [id]); }
  async findCredential(code: string) {
    return (await this.pool.query("SELECT document FROM student_documents WHERE document->'credentials' @> $1::jsonb LIMIT 1", [JSON.stringify([{code}])])).rows[0]?.document as StudentDocument ?? null;
  }
  async monthlyExecutionSeconds(month: string) { return Number((await this.pool.query('SELECT COALESCE(SUM(seconds),0) AS seconds FROM execution_reservations WHERE month=$1', [month])).rows[0].seconds); }
  async reserveExecution(id: string, month: string, seconds: number, limit: number) {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', ['execution-' + month]);
      if ((await client.query('SELECT id FROM execution_reservations WHERE id=$1', [id])).rowCount) { await client.query('COMMIT'); return true; }
      const current = Number((await client.query('SELECT COALESCE(SUM(seconds),0) AS seconds FROM execution_reservations WHERE month=$1', [month])).rows[0].seconds);
      if (current + seconds > limit) { await client.query('COMMIT'); return false; }
      await client.query('INSERT INTO execution_reservations VALUES($1,$2,$3)', [id, month, seconds]);
      await client.query('COMMIT'); return true;
    } catch (error) { await client.query('ROLLBACK'); throw error; } finally { client.release(); }
  }
  async close() { await this.pool.end(); }
  async appendAdminAudit(event:AuditEvent){await this.pool.query('INSERT INTO admin_audit(id,document) VALUES($1,$2)',[event.id,event]);}
  async executionPaused(){return (await this.pool.query("SELECT value FROM runtime_settings WHERE key='execution-paused'")).rows[0]?.value==='1';}
  async setExecutionPaused(paused:boolean){await this.pool.query("INSERT INTO runtime_settings(key,value) VALUES('execution-paused',$1) ON CONFLICT(key) DO UPDATE SET value=excluded.value",[paused?'1':'0']);}
}

export async function createStore(): Promise<Store> {
  if (process.env.DATABASE_URL) {
    const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 10 });
    const store = new PostgresStore(pool);
    if(process.env.NODE_ENV!=='production'||process.env.RUN_DATABASE_MIGRATIONS==='true')await store.initialize();
    else {
      const version=(await pool.query('SELECT version FROM schema_migrations WHERE version=4')).rowCount;
      if(!version)throw new Error('Apply PostgreSQL schema migrations with the migration role before starting the API.');
    }
    return store;
  }
  if (process.env.NODE_ENV === 'production') throw new Error('DATABASE_URL is required in production.');
  return new SqliteStore();
}
