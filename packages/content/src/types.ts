export type LearningTrack = 'cpp' | 'python';
export type PracticeLanguage = LearningTrack | 'sql' | 'javascript' | 'typescript' | 'text';

export interface PublicTest {
  input: string;
  output: string;
  note?: string;
}

export interface Practice {
  id: string;
  prompt: string;
  starterCode: string;
  language: PracticeLanguage;
  publicTests: PublicTest[];
  hints: string[];
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
