import type { GradeRecord, ProgramId, ProgrammingTrack } from '@university-simulator/core';

export interface Enrollment {
  courseId: string;
  semester: number;
  section: string;
  enrolledAt: string;
  tuitionPaid?: number;
  tuitionSupport?: number;
}
export interface LedgerEntry {
  id: string;
  activityId: string;
  amount: number;
  balance: number;
  at: string;
}
export interface ExamQuestion {
  id: string;
  prompt: string;
  options: { id: string; text: string }[];
  kind?: 'choice' | 'code';
  language?: Submission['language'];
  starterCode?: string;
  weight?: number;
  requiredPassRatio?: number;
}
export interface PrivateQuestion extends ExamQuestion {
  correctOption: string;
  explanation: string;
  exerciseId?: string;
  exerciseIds?: {cpp:string;python:string};
  starterCodes?: {cpp:string;python:string};
}
export interface AssessmentDefinition {
  id: string;
  version: string;
  courseId: string;
  kind: 'midterm' | 'final';
  durationSeconds: number;
  availableWeek: number;
  questions: PrivateQuestion[];
  isPublicDevelopmentSample: boolean;
}
export interface ExamAttempt {
  id: string;
  courseId: string;
  kind: 'midterm' | 'final';
  definition: AssessmentDefinition;
  semester: number;
  startedAt: string;
  deadlineAt: string;
  savedAt?: string;
  submittedAt?: string;
  acceptedAt?: string;
  status: 'active' | 'grading' | 'grading-error' | 'graded' | 'void';
  answers: Record<string, string>;
  score?: number;
  submissionKey?: string;
  reason?: string;
  gradingSubmissionId?: string;
  gradingDispatchPending?: boolean;
  gradingError?: string;
  codeResult?: {passed:number;total:number;feedback:string;requiredPassRatio:number;criterionPassed:boolean};
  gradingRetries?: number;
  gradingRetryReason?: string;
  bankVersion?: string;
  codeExerciseSnapshot?: PrivateExercise;
}
export interface CourseProgress {
  courseId: string;
  lessons: string[];
  attendance: string[];
  practice: number[];
  checkpointScores: Record<string, number>;
  midterm?: number;
  final?: number;
  finalCodeCriterionPassed?: boolean;
  codeCriterionReason?: string;
}
export interface Credential {
  code: string;
  type: 'graduation' | 'office-skills';
  issuedAt: string;
  public: boolean;
  curriculumVersion: string;
  assessmentVersion?: string;
}
export interface StudentDocument {
  id: string;
  displayName: string;
  major: ProgramId;
  track: ProgrammingTrack;
  curriculumVersion: string;
  semester: number;
  week: number;
  day: number;
  energy: number;
  stress: number;
  balance: number;
  createdAt: string;
  updatedAt: string;
  revision: number;
  enrollments: Enrollment[];
  grades: GradeRecord[];
  completedLessons: string[];
  completedBridges: string[];
  attendance: string[];
  progress: Record<string, CourseProgress>;
  relationships: Record<string, number>;
  ledger: LedgerEntry[];
  exemptions: string[];
  credentials: Credential[];
  exams: ExamAttempt[];
  placementLevel?: number;
  placementAt?: string;
  placementSemester?: number;
  activityKeys: string[];
  housing: 'dorm' | 'rental';
  office?: {version:string;submittedAt:string;score:number;passed:boolean;artifact:unknown};
  administrativeEvents?: AuditEvent[];
}
export interface AuditEvent {
  id:string;operationId:string;action:'exam.void'|'exam.retry'|'execution.pause'|'execution.resume';phase:'requested'|'succeeded'|'failed';actorId:string;at:string;reason:string;
  target:{studentId?:string;examId?:string};details?:Record<string,string|number|boolean>;
}
export interface Submission {
  id: string;
  userId: string;
  courseId: string;
  exerciseId: string;
  language: 'cpp' | 'python' | 'javascript' | 'sql';
  source: string;
  status: 'queued' | 'running' | 'passed' | 'failed' | 'error';
  createdAt: string;
  acceptedAt: string;
  assessmentVersion: string;
  semester: number;
  completedAt?: string;
  result?: { passed: number; total: number; feedback: string; output?: string };
  progressApplied?: boolean;
  executionClaim?: string;
  executionLeaseUntil?: string;
  examId?: string;
  questionId?: string;
}
export interface PrivateExercise {
  id: string;
  courseId: string;
  title: string;
  language: Submission['language'];
  prompt: string;
  tests: { input: string; expected: string; public?: boolean }[];
  timeoutSeconds: number;
  templateId: string;
  projectStage?: 1 | 2 | 3;
}
export interface LessonCheckpoint {
  lessonId: string;
  courseId: string;
  question: PrivateQuestion;
}
export class ApiError extends Error {
  constructor(public readonly status: number, message: string, public readonly code = 'invalid_request') {
    super(message);
  }
}
