export interface Option {
  id: string;
  text: string;
}

export interface Question {
  id: string;
  points: number;
  syllabus_topic: string;
  context: string | null;
  question_text: string;
  question_type: "single_choice" | "multiple_choice";
  options: Option[];
}

export interface CertificationOverview {
  id: string;
  name: string;
  timeLimitMins: number;
  passScorePercentage: number;
  questionCount: number;
}

export interface CertificationDetail {
  id: string;
  name: string;
  timeLimitMins: number;
  passScorePercentage: number;
  questions: Question[];
}

export interface AttemptSummary {
  id: string;
  certificationId: string;
  certificationName: string;
  mode: "training" | "exam";
  scorePercentage: number;
  verdict: "Passaria" | "Não Passaria";
  date: string;
  timeSpentSeconds: number;
  correctCount: number;
  totalQuestions: number;
}

export interface QuestionResult {
  id: string;
  syllabus_topic: string;
  isCorrect: boolean;
  userSelected: string[];
  correctAnswers: string[];
  justification: string;
}

export interface TimeToBeatResult {
  isFasterThanAverage: boolean;
  improvementPercentage: number;
  averageTimeSeconds: number;
  isNewRecord: boolean;
}

export interface AttemptDetail {
  id: string;
  userId: string;
  userEmail: string;
  certificationId: string;
  certificationName: string;
  mode: "training" | "exam";
  scorePercentage: number;
  correctCount: number;
  totalQuestions: number;
  timeSpentSeconds: number;
  verdict: "Passaria" | "Não Passaria";
  date: string;
  results: QuestionResult[];
  aiAdvice: string;
  hasAIError: boolean;
  timeToBeat?: TimeToBeatResult;
}

export interface ChartProgressionPoint {
  date: string;
  certificationId: string;
  mode: "training" | "exam";
  score: number;
  timeSpentMins: number;
}
