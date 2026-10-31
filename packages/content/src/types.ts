export type LearningTrack = 'cpp' | 'python';
export type PracticeLanguage = LearningTrack | 'sql' | 'javascript' | 'typescript' | 'text';

export interface PublicTest {
  input: string;
  output: string;
  note?: string;
}

export interface Practice {
  id: string;
  title?: string;
  prompt: string;
  starterCode: string;
  language: PracticeLanguage;
  publicTests: PublicTest[];
  hints: string[];
  outcomeIds?: string[];
  difficulty?: 'guided' | 'independent' | 'integration';
  rubric?: { machineChecked: string[]; selfCheck: string[] };
}

export interface LessonTrace {
  title: string;
  columns: string[];
  rows: string[][];
  explanation: string;
}

export interface PracticeReference {
  exerciseId: string;
  lessonId: string;
  language: LearningTrack;
  source: string;
  tests: PublicTest[];
}

export interface Checkpoint {
  question: string;
  options: string[];
  answerIndex: number;
  explanation: string;
}

export interface Lesson {
  id: string;
  courseId: string;
  track?: LearningTrack;
  title: string;
  objective: string;
  sections: { heading: string; body: string }[];
  example?: { language: PracticeLanguage; code: string; explanation: string };
  practice?: Practice[];
  /** Public self-check only. Never use these answer keys for sealed examinations. */
  checkpoint?: Checkpoint;
  sources: string[];
  estimatedMinutes: number;
  reviewStatus: 'draft';
  outcomeIds?: string[];
  prerequisiteLessonIds?: string[];
  trace?: LessonTrace;
  commonMistakes?: { mistake: string; why: string; fix: string }[];
  reflection?: { prompt: string; criteria: string[]; sampleAnswer?: string };
}

export interface CourseReadiness {
  courseId: string;
  lessonCount: number;
  practiceCount: number;
  tracks: LearningTrack[];
  status: 'partial';
  academicallyReviewed: false;
  assessmentBankReady: false;
  releaseEligible: false;
  remaining: string[];
}
