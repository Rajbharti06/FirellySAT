"use client";

import type {
  PracticeStatistics,
  SessionAnswer,
  PracticeSession,
  SavedQuestion,
  StudyPlan,
  QuestionDomain,
  QuestionDifficulty,
  Note,
  NoteQuestion,
  LogbookEntry,
  MockTestAttempt,
  Folder,
  NoteSnapshot,
} from "@/types";
import { generateId } from "./utils";

const KEYS = {
  STATS: "firellysat_stats",
  SESSIONS: "firellysat_sessions",
  SAVED: "firellysat_saved",
  STUDY_PLAN: "firellysat_study_plan",
  STREAK: "firellysat_streak",
  SETTINGS: "firellysat_settings",
  ONBOARDING_DONE: "firellysat_onboarded",
  NOTES: "firellysat_notes",
  NOTE_QUESTIONS: "firellysat_note_questions",
  LOGBOOK: "firellysat_logbook",
} as const;

function safeGet<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function safeSet<T>(key: string, value: T): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore storage errors
  }
}

export function getDefaultStats(): PracticeStatistics {
  return {
    totalQuestionsAttempted: 0,
    totalQuestionsCorrect: 0,
    totalTimeSpentSeconds: 0,
    currentStreak: 0,
    longestStreak: 0,
    lastPracticeDate: null,
    sessions: [],
    byDomain: {
      math: {
        domain: "math",
        totalAttempted: 0,
        totalCorrect: 0,
        accuracy: 0,
        byDifficulty: {
          E: { attempted: 0, correct: 0 },
          M: { attempted: 0, correct: 0 },
          H: { attempted: 0, correct: 0 },
        },
        bySkill: [],
      },
      reading_and_writing: {
        domain: "reading_and_writing",
        totalAttempted: 0,
        totalCorrect: 0,
        accuracy: 0,
        byDifficulty: {
          E: { attempted: 0, correct: 0 },
          M: { attempted: 0, correct: 0 },
          H: { attempted: 0, correct: 0 },
        },
        bySkill: [],
      },
    },
    savedQuestions: [],
    weeklyGoalMinutes: 30,
    weeklyMinutesPracticed: 0,
  };
}

export function getStats(): PracticeStatistics {
  return safeGet<PracticeStatistics>(KEYS.STATS, getDefaultStats());
}

export function saveStats(stats: PracticeStatistics): void {
  safeSet(KEYS.STATS, stats);
}

export function recordSessionComplete(
  answers: SessionAnswer[],
  domain: QuestionDomain | "mixed",
  timeSpentSeconds: number,
  calmMode: boolean
): PracticeSession {
  const stats = getStats();

  const correct = answers.filter((a) => a.isCorrect && !a.skipped).length;
  const attempted = answers.filter((a) => !a.skipped).length;

  const session: PracticeSession = {
    id: generateId(),
    startedAt: new Date(Date.now() - timeSpentSeconds * 1000).toISOString(),
    completedAt: new Date().toISOString(),
    domain,
    questionsAttempted: attempted,
    questionsCorrect: correct,
    timeSpentSeconds,
    calmMode,
    answers,
  };

  // Update totals
  stats.totalQuestionsAttempted += attempted;
  stats.totalQuestionsCorrect += correct;
  stats.totalTimeSpentSeconds += timeSpentSeconds;
  stats.sessions = [session, ...stats.sessions].slice(0, 100);

  // Update streak
  const today = new Date().toDateString();
  const lastDate = stats.lastPracticeDate
    ? new Date(stats.lastPracticeDate).toDateString()
    : null;

  if (lastDate !== today) {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    if (lastDate === yesterday.toDateString()) {
      stats.currentStreak += 1;
    } else {
      stats.currentStreak = 1;
    }
    stats.longestStreak = Math.max(stats.longestStreak, stats.currentStreak);
    stats.lastPracticeDate = new Date().toISOString();
  }

  // Update weekly minutes
  stats.weeklyMinutesPracticed += Math.floor(timeSpentSeconds / 60);

  // Update domain stats
  for (const answer of answers) {
    if (answer.skipped) continue;
    const d = stats.byDomain[answer.domain];
    if (!d) continue;

    d.totalAttempted += 1;
    if (answer.isCorrect) d.totalCorrect += 1;
    d.accuracy = d.totalAttempted > 0 ? (d.totalCorrect / d.totalAttempted) * 100 : 0;

    // Difficulty breakdown
    const diff = d.byDifficulty[answer.difficulty];
    if (diff) {
      diff.attempted += 1;
      if (answer.isCorrect) diff.correct += 1;
    }

    // Skill breakdown
    const skillEntry = d.bySkill.find((s) => s.skill === answer.skill);
    if (skillEntry) {
      skillEntry.totalAttempted += 1;
      if (answer.isCorrect) skillEntry.totalCorrect += 1;
      skillEntry.accuracy =
        (skillEntry.totalCorrect / skillEntry.totalAttempted) * 100;
    } else {
      d.bySkill.push({
        skill: answer.skill,
        domain: answer.domain,
        totalAttempted: 1,
        totalCorrect: answer.isCorrect ? 1 : 0,
        accuracy: answer.isCorrect ? 100 : 0,
        avgTimeSeconds: answer.timeSpentSeconds,
      });
    }
  }

  saveStats(stats);
  return session;
}

export function getSavedQuestions(): SavedQuestion[] {
  return safeGet<SavedQuestion[]>(KEYS.SAVED, []);
}

export function saveQuestion(q: SavedQuestion): void {
  const saved = getSavedQuestions();
  const exists = saved.find((s) => s.questionId === q.questionId);
  if (!exists) {
    safeSet(KEYS.SAVED, [q, ...saved]);
  }
}

export function unsaveQuestion(questionId: string): void {
  const saved = getSavedQuestions().filter((s) => s.questionId !== questionId);
  safeSet(KEYS.SAVED, saved);
}

export function isQuestionSaved(questionId: string): boolean {
  return getSavedQuestions().some((s) => s.questionId === questionId);
}

export function getStudyPlan(): StudyPlan | null {
  return safeGet<StudyPlan | null>(KEYS.STUDY_PLAN, null);
}

export function saveStudyPlan(plan: StudyPlan): void {
  safeSet(KEYS.STUDY_PLAN, plan);
}

export interface AppSettings {
  calmModeDefault: boolean;
  soundEnabled: boolean;
  showTimer: boolean;
  weeklyGoalMinutes: number;
  preferredDomain: QuestionDomain | "mixed";
  preferredDifficulty: QuestionDifficulty | "mixed";
}

export function getSettings(): AppSettings {
  return safeGet<AppSettings>(KEYS.SETTINGS, {
    calmModeDefault: false,
    soundEnabled: true,
    showTimer: true,
    weeklyGoalMinutes: 30,
    preferredDomain: "mixed",
    preferredDifficulty: "mixed",
  });
}

export function saveSettings(settings: AppSettings): void {
  safeSet(KEYS.SETTINGS, settings);
}

export function isOnboardingDone(): boolean {
  return safeGet<boolean>(KEYS.ONBOARDING_DONE, false);
}

export function markOnboardingDone(): void {
  safeSet(KEYS.ONBOARDING_DONE, true);
}

// ─── Notes ────────────────────────────────────────────────────────────────────

export function getNotes(): Note[] {
  return safeGet<Note[]>(KEYS.NOTES, []);
}

export function saveNote(note: Note): void {
  const notes = getNotes();
  const idx = notes.findIndex((n) => n.id === note.id);
  if (idx >= 0) {
    notes[idx] = note;
  } else {
    notes.unshift(note);
  }
  safeSet(KEYS.NOTES, notes);
}

export function deleteNote(noteId: string): void {
  const notes = getNotes().filter((n) => n.id !== noteId);
  safeSet(KEYS.NOTES, notes);
}

export function createNote(partial: Partial<Note> = {}): Note {
  const note: Note = {
    id: generateId(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    title: "Untitled Note",
    content: "",
    savedQuestionIds: [],
    color: "default",
    tags: [],
    ...partial,
  };
  saveNote(note);
  return note;
}

// Snapshot question data into notes storage (so notes work offline even if question disappears)
export function getNoteQuestions(): NoteQuestion[] {
  return safeGet<NoteQuestion[]>(KEYS.NOTE_QUESTIONS, []);
}

export function saveNoteQuestion(q: NoteQuestion): void {
  const all = getNoteQuestions();
  const idx = all.findIndex((nq) => nq.questionId === q.questionId);
  if (idx >= 0) {
    all[idx] = q;
  } else {
    all.unshift(q);
  }
  safeSet(KEYS.NOTE_QUESTIONS, all);
}

export function addQuestionToNote(noteId: string, questionId: string): void {
  const notes = getNotes();
  const note = notes.find((n) => n.id === noteId);
  if (!note) return;
  if (!note.savedQuestionIds.includes(questionId)) {
    note.savedQuestionIds.push(questionId);
    note.updatedAt = new Date().toISOString();
    saveNote(note);
  }
}

export function removeQuestionFromNote(noteId: string, questionId: string): void {
  const notes = getNotes();
  const note = notes.find((n) => n.id === noteId);
  if (!note) return;
  note.savedQuestionIds = note.savedQuestionIds.filter((id) => id !== questionId);
  note.updatedAt = new Date().toISOString();
  saveNote(note);
}

// ─── Logbook ──────────────────────────────────────────────────────────────────

export function getLogbook(): LogbookEntry[] {
  return safeGet<LogbookEntry[]>(KEYS.LOGBOOK, []);
}

export function addLogbookEntry(entry: Omit<LogbookEntry, "id">): void {
  const logbook = getLogbook();
  // Avoid exact duplicates (same questionId + timestamp within 5 seconds)
  const recent = logbook.find(
    (e) =>
      e.questionId === entry.questionId &&
      Math.abs(new Date(e.timestamp).getTime() - new Date(entry.timestamp).getTime()) < 5000
  );
  if (recent) return;
  safeSet(KEYS.LOGBOOK, [{ ...entry, id: generateId() }, ...logbook].slice(0, 500));
}

export function clearLogbook(): void {
  safeSet(KEYS.LOGBOOK, []);
}

export function getLogbookStats(): { total: number; byDomain: Record<string, number>; bySkill: Record<string, number> } {
  const entries = getLogbook();
  const byDomain: Record<string, number> = {};
  const bySkill: Record<string, number> = {};
  for (const e of entries) {
    byDomain[e.domain] = (byDomain[e.domain] || 0) + 1;
    bySkill[e.skill] = (bySkill[e.skill] || 0) + 1;
  }
  return { total: entries.length, byDomain, bySkill };
}

// ─── Mock Test Attempts ───────────────────────────────────────────────────────

export function getMockAttempts(): MockTestAttempt[] {
  return safeGet<MockTestAttempt[]>("firellysat_mock_attempts", []);
}

export function saveMockAttempt(attempt: MockTestAttempt): void {
  const attempts = getMockAttempts();
  safeSet("firellysat_mock_attempts", [attempt, ...attempts].slice(0, 20));
}

export function getLatestMockScore(): MockTestAttempt | null {
  const attempts = getMockAttempts();
  return attempts.length > 0 ? attempts[0] : null;
}

// ─── Folders ──────────────────────────────────────────────────────────────────

export function getFolders(): Folder[] {
  return safeGet<Folder[]>("firellysat_folders", []);
}

export function saveFolder(folder: Folder): void {
  const folders = getFolders();
  const idx = folders.findIndex((f) => f.id === folder.id);
  if (idx >= 0) { folders[idx] = folder; } else { folders.unshift(folder); }
  safeSet("firellysat_folders", folders);
}

export function deleteFolder(folderId: string): void {
  const notes = getNotes();
  for (const n of notes) {
    if (n.folderId === folderId) {
      saveNote({ ...n, folderId: undefined });
    }
  }
  safeSet("firellysat_folders", getFolders().filter((f) => f.id !== folderId));
}

export function createFolder(partial: Partial<Folder> = {}): Folder {
  const folder: Folder = {
    id: generateId(),
    name: "New Folder",
    emoji: "📁",
    color: "slate",
    createdAt: new Date().toISOString(),
    ...partial,
  };
  saveFolder(folder);
  return folder;
}

// ─── Note Snapshots ───────────────────────────────────────────────────────────

export function getNoteSnapshots(): NoteSnapshot[] {
  return safeGet<NoteSnapshot[]>("firellysat_note_snapshots", []);
}

export function saveNoteSnapshot(snapshot: NoteSnapshot): void {
  const snapshots = getNoteSnapshots();
  const idx = snapshots.findIndex((s) => s.id === snapshot.id);
  if (idx >= 0) { snapshots[idx] = snapshot; } else { snapshots.unshift(snapshot); }
  safeSet("firellysat_note_snapshots", snapshots);
}

export function deleteNoteSnapshot(snapshotId: string): void {
  safeSet("firellysat_note_snapshots", getNoteSnapshots().filter((s) => s.id !== snapshotId));
}

export function getSnapshotsForNote(noteId: string): NoteSnapshot[] {
  return getNoteSnapshots().filter((s) => s.noteId === noteId);
}

// ─── Mock Test Question Deduplication ─────────────────────────────────────────

export function getMockUsedQuestionIds(): string[] {
  return safeGet<string[]>("firellysat_mock_used_qs", []);
}

export function addMockUsedQuestionIds(ids: string[]): void {
  const existing = getMockUsedQuestionIds();
  const merged = [...new Set([...existing, ...ids])];
  safeSet("firellysat_mock_used_qs", merged.slice(-400));
}
