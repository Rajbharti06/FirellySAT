// Question types from CollegeBoard API
export type QuestionDomain = "math" | "reading_and_writing";
export type QuestionDifficulty = "E" | "M" | "H";
export type QuestionType = "mcq" | "spr"; // multiple choice or student-produced response

export interface AnswerOption {
  id: string;
  content: string;
}

export interface Question {
  id: string;
  externalId: string;
  domain: QuestionDomain;
  skill: string;
  difficulty: QuestionDifficulty;
  questionType: QuestionType;
  stem: string;
  answerOptions?: AnswerOption[];
  correctAnswer: string[];
  rationale?: string;
  associatedPassage?: string;
  calculator?: boolean;
  imageUrl?: string;
}

// Practice session
export interface PracticeSession {
  id: string;
  startedAt: string;
  completedAt?: string;
  domain: QuestionDomain | "mixed";
  difficulty?: QuestionDifficulty | "mixed";
  questionsAttempted: number;
  questionsCorrect: number;
  timeSpentSeconds: number;
  calmMode: boolean;
  answers: SessionAnswer[];
}

export interface SessionAnswer {
  questionId: string;
  userAnswer: string;
  isCorrect: boolean;
  timeSpentSeconds: number;
  domain: QuestionDomain;
  skill: string;
  difficulty: QuestionDifficulty;
  skipped: boolean;
}

// Practice statistics
export interface SkillStats {
  skill: string;
  domain: QuestionDomain;
  totalAttempted: number;
  totalCorrect: number;
  accuracy: number;
  avgTimeSeconds: number;
}

export interface DomainStats {
  domain: QuestionDomain;
  totalAttempted: number;
  totalCorrect: number;
  accuracy: number;
  byDifficulty: Record<QuestionDifficulty, { attempted: number; correct: number }>;
  bySkill: SkillStats[];
}

export interface PracticeStatistics {
  totalQuestionsAttempted: number;
  totalQuestionsCorrect: number;
  totalTimeSpentSeconds: number;
  currentStreak: number;
  longestStreak: number;
  lastPracticeDate: string | null;
  sessions: PracticeSession[];
  byDomain: Record<QuestionDomain, DomainStats>;
  savedQuestions: string[];
  weeklyGoalMinutes: number;
  weeklyMinutesPracticed: number;
}

// Study plan
export type StudyPlanWeek = {
  weekNumber: number;
  theme: string;
  goals: string[];
  dailyTasks: DailyTask[];
  focusDomains: QuestionDomain[];
  expectedImprovement: string;
};

export type DailyTask = {
  day: string;
  tasks: string[];
  estimatedMinutes: number;
  focusArea: string;
  encouragement: string;
};

export interface StudyPlan {
  id: string;
  generatedAt: string;
  studentProfile: StudentProfile;
  targetScore: number;
  testDate: string;
  totalWeeks: number;
  weeklyPlan: StudyPlanWeek[];
  keyStrategies: string[];
  anxietyTips: string[];
  dailyRoutine: string;
  motivationalMessage: string;
}

export interface StudentProfile {
  currentScore: number;
  targetScore: number;
  testDate: string;
  dailyStudyMinutes: number;
  weakAreas: string[];
  strongAreas: string[];
  anxietyLevel: 1 | 2 | 3 | 4 | 5;
  learningStyle: "visual" | "practice-heavy" | "conceptual" | "mixed";
}

// Question bank filters
export interface QuestionFilters {
  domain?: QuestionDomain;
  difficulty?: QuestionDifficulty;
  skill?: string;
  page?: number;
  limit?: number;
  search?: string;
}

// Saved questions
export interface SavedQuestion {
  questionId: string;
  savedAt: string;
  note?: string;
  domain: QuestionDomain;
  difficulty: QuestionDifficulty;
  skill: string;
}

// Vocabulary
export interface VocabWord {
  word: string;
  definition: string;
  partOfSpeech: string;
  example: string;
  synonyms: string[];
  difficulty: "easy" | "medium" | "hard";
}

// AI Chat
export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

// Score predictor
export interface ScorePrediction {
  predictedScore: number;
  confidence: number;
  mathScore: number;
  rwScore: number;
  weakestSkills: string[];
  nextMilestone: number;
  estimatedDaysToMilestone: number;
}

// Notes
export interface Note {
  id: string;
  createdAt: string;
  updatedAt: string;
  title: string;
  content: string;
  savedQuestionIds: string[];
  color: "default" | "amber" | "teal" | "violet" | "rose";
  tags: string[];
  folderId?: string;
  pinned?: boolean;
  status?: "draft" | "review" | "mastered";
  snapshotIds?: string[];
}

export interface Folder {
  id: string;
  name: string;
  emoji: string;
  color: "amber" | "teal" | "violet" | "rose" | "blue" | "slate";
  createdAt: string;
}

export interface NoteSnapshot {
  id: string;
  noteId: string;
  questionId: string;
  stem: string;
  skill: string;
  domain: QuestionDomain;
  difficulty: QuestionDifficulty;
  correctAnswer: string[];
  rationale?: string;
  takenAt: string;
}

export interface NoteQuestion {
  questionId: string;
  stem: string;
  domain: QuestionDomain;
  difficulty: QuestionDifficulty;
  skill: string;
  correctAnswer: string[];
  rationale?: string;
  snapshotAt: string;
  userNote?: string;
}

export interface LogbookEntry {
  id: string;
  timestamp: string;
  questionId: string;
  stem: string;
  domain: QuestionDomain;
  skill: string;
  difficulty: QuestionDifficulty;
  userAnswer: string;
  correctAnswer: string[];
  rationale?: string;
  source: "practice" | "mock_test";
  mockAttemptId?: string;
}

export interface TestAnalysis {
  totalScore: number | null;
  mathScore: number | null;
  readingWritingScore: number | null;
  testDate: string | null;
  weakDomains: Array<{
    domain: string;
    score: number | null;
    correctRate: string | null;
    issues: string[];
  }>;
  strongDomains: string[];
  wrongQuestions: Array<{
    questionType: string;
    skill: string;
    likelyError: "concept gap" | "careless" | "time pressure";
  }>;
  timeManagementIssues: boolean;
  summary: string;
}

export interface MockTestAttempt {
  id: string;
  attemptNumber: number;
  startedAt: string;
  completedAt: string;
  totalScore: number;
  rwScore: number;
  mathScore: number;
  rwCorrect: number;
  mathCorrect: number;
  rwTotal: 54;
  mathTotal: 44;
  durationSeconds: number;
}

// XP / Level system
export interface XPData {
  totalXP: number;
  level: number;
}

// Daily goal
export interface DailyGoalData {
  targetQuestions: number;
  completedToday: number;
  date: string;
}

// Vocab progress
export interface VocabProgressItem {
  mastered: boolean;
  attempts: number;
  lastSeen: string;
}
export type VocabProgressData = Record<string, VocabProgressItem>;
