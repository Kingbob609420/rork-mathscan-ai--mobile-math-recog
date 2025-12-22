export type ProblemType = 'arithmetic' | 'algebra' | 'geometry' | 'other';

export interface MathProblem {
  problemText: string;
  userAnswer?: string;
  correctAnswer?: string;
  isCorrect: boolean;
  explanation?: string;
  problemType?: ProblemType;
  steps?: string[];
  confidence?: number;
  qualityIssues?: string[];
}

export interface Scan {
  id: string;
  timestamp: number;
  imageUri: string;
  problems: MathProblem[];
  imageQuality?: {
    score: number;
    issues: string[];
  };
}

export interface Stats {
  totalScans: number;
  totalProblems: number;
  correctAnswers: number;
}