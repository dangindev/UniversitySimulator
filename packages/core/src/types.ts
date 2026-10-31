export type ProgramId = 'it' | 'cs';
export type ProgrammingTrack = 'cpp' | 'python';
export type CourseCategory = 'general' | 'foundation' | 'core' | 'specialization' | 'internship' | 'capstone' | 'requirement';

export interface SourceReference {
  title: string;
  url: string;
  version: string;
  accessedAt: string;
}

export interface Course {
  id: string;
  code: string;
  title: string;
  credits: number;
  category: CourseCategory;
  programs: ProgramId[];
  semester: number;
  prerequisites: string[];
  outcomes: string[];
  description: string;
  /** Alternative section times; an enrollment chooses exactly one. */
  slots: string[];
  kind: 'standard' | 'project' | 'requirement';
  contentStatus: 'draft' | 'reviewed';
  sources: SourceReference[];
  minimumCredits?: number;
  language?: 'cpp' | 'python' | 'sql' | 'javascript';
  bridges?: ProgrammingTrack[];
}

export interface Program {
  id: ProgramId;
  title: string;
  shortTitle: string;
  description: string;
  version: string;
  credits: number;
  durationSemesters: number;
  requiredCourseIds: string[];
  specializationCourseIds: string[];
  specializationCredits: number;
  electiveCredits: number;
  requirementIds: string[];
  recommendedPath: string[][];
  sources: SourceReference[];
}

export interface GradeRecord {
  courseId: string;
  status: 'passed' | 'failed' | 'exempt';
  score?: number;
  semester: number;
  /** Server-authored explanation when an essential assessment criterion was not met. */
  reason?: string;
}

export interface GradeComponents {
  attendance: number;
  practice: number;
  midterm: number;
  final: number;
}

export interface CalculatedGrade {
  score: number;
  passed: boolean;
  gradePoint: number;
  letter: 'A' | 'B' | 'C' | 'D' | 'F';
}

export interface TranscriptSummary {
  credits: number;
  gpa: number;
  gradedCredits: number;
  passedCourseIds: string[];
  exemptCourseIds: string[];
  failedCourseIds: string[];
  records: GradeRecord[];
}

export interface EnrollmentRequest {
  major: ProgramId;
  courseIds: string[];
  transcript: GradeRecord[];
  semester: number;
  sections?: Record<string, string>;
  allowUnderload?: boolean;
  allowImprovement?: boolean;
}

export interface EnrollmentValidation {
  valid: boolean;
  errors: string[];
  credits: number;
}

export interface GraduationAudit {
  eligible: boolean;
  credits: number;
  earnedCredits: number;
  requiredCredits: number;
  gpa: number;
  missingRequired: string[];
  missingRequirements: string[];
  specializationCredits: number;
  electiveCredits: number;
  deficits: string[];
}

export interface LanguageBridge {
  id: string;
  title: string;
  language: 'cpp' | 'python' | 'sql' | 'javascript';
  forTracks: ProgrammingTrack[];
  beforeCourseIds: string[];
  credits: 0;
  outcomes: string[];
}
