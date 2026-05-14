import type { Question, QuestionDomain, QuestionDifficulty, QuestionFilters } from "@/types";
import { SAMPLE_QUESTIONS } from "./sample-questions";

// CollegeBoard Digital SAT Question Bank API
const CB_API_URL =
  "https://qbank-api.collegeboard.org/msreportingquestionbank-prod/questionbank/digital/get-questions";

export interface CBQuestion {
  questionId?: string;
  externalid?: string;
  id?: string;
  domain?: string;
  skill_cd?: string;
  skill?: string;
  difficulty?: string;
  type?: string;
  stem?: string;
  answerOptions?: Array<{ id: string; content: string } | { letter: string; body: string } | { key: string; value: string }>;
  correct_answer?: string[] | string;
  rationale?: string;
  stimulus?: string;
  calculator?: boolean;
  image?: string;
}

function normalizeDomain(d?: string): QuestionDomain {
  if (!d) return "math";
  const lower = d.toLowerCase();
  if (lower.includes("math")) return "math";
  return "reading_and_writing";
}

function normalizeDifficulty(d?: string): QuestionDifficulty {
  if (!d) return "M";
  const upper = d.toUpperCase();
  if (upper === "E" || upper === "EASY") return "E";
  if (upper === "H" || upper === "HARD") return "H";
  return "M";
}

function normalizeAnswerOptions(
  opts: CBQuestion["answerOptions"]
): Array<{ id: string; content: string }> | undefined {
  if (!opts || !Array.isArray(opts)) return undefined;
  return opts.map((o: Record<string, string>) => ({
    id: o.id || o.letter || o.key || "?",
    content: o.content || o.body || o.value || "",
  }));
}

function normalizeCorrectAnswer(ca: CBQuestion["correct_answer"]): string[] {
  if (!ca) return [];
  if (Array.isArray(ca)) return ca;
  return [ca];
}

export function normalizeQuestion(q: CBQuestion, source = "collegeboard"): Question {
  const id = q.questionId || q.externalid || q.id || Math.random().toString(36).slice(2);
  return {
    id,
    externalId: q.externalid || q.questionId || id,
    domain: normalizeDomain(q.domain),
    skill: q.skill_cd || q.skill || "General",
    difficulty: normalizeDifficulty(q.difficulty),
    questionType: q.type === "spr" ? "spr" : "mcq",
    stem: q.stem || "",
    answerOptions: normalizeAnswerOptions(q.answerOptions),
    correctAnswer: normalizeCorrectAnswer(q.correct_answer),
    rationale: q.rationale,
    associatedPassage: q.stimulus,
    calculator: q.calculator,
    imageUrl: q.image,
  };
}

// Fetch from CollegeBoard — runs server-side only
async function fetchFromCollegeBoard(
  domain: QuestionDomain | undefined
): Promise<Question[]> {
  const cbDomain = domain === "math" ? "Math" : domain === "reading_and_writing" ? "English" : "Math";

  const res = await fetch(CB_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Accept": "application/json",
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      "Origin": "https://satsuitequestionbank.collegeboard.org",
      "Referer": "https://satsuitequestionbank.collegeboard.org/",
    },
    body: JSON.stringify({ asmtEventId: 99, test: 2, domain: cbDomain }),
    next: { revalidate: 3600 },
  });

  if (!res.ok) {
    throw new Error(`CollegeBoard API returned ${res.status}`);
  }

  const data = await res.json();

  // Response is an array of questions
  const arr: CBQuestion[] = Array.isArray(data) ? data : data.results || data.questions || [];
  return arr.map((q) => normalizeQuestion(q, "collegeboard"));
}

// In-memory cache to avoid hammering the API
let cbCache: { math: Question[]; rw: Question[]; fetchedAt: number } | null = null;

async function getCBQuestions(domain: QuestionDomain): Promise<Question[]> {
  const now = Date.now();
  const TTL = 60 * 60 * 1000; // 1 hour

  if (cbCache && now - cbCache.fetchedAt < TTL) {
    return domain === "math" ? cbCache.math : cbCache.rw;
  }

  // Fetch both domains in parallel
  try {
    const [mathQs, rwQs] = await Promise.all([
      fetchFromCollegeBoard("math"),
      fetchFromCollegeBoard("reading_and_writing"),
    ]);
    cbCache = { math: mathQs, rw: rwQs, fetchedAt: now };
    return domain === "math" ? mathQs : rwQs;
  } catch (err) {
    console.error("CollegeBoard API failed:", err);
    throw err;
  }
}

export async function fetchQuestions(filters: QuestionFilters = {}): Promise<{
  questions: Question[];
  total: number;
  source: string;
}> {
  const { domain, difficulty, skill, page = 1, limit = 20, search } = filters;

  let questions: Question[] = [];
  let source = "sample";

  try {
    const cbDomain: QuestionDomain = domain || "math";
    const cbQuestions = await getCBQuestions(cbDomain);
    if (cbQuestions.length > 0) {
      questions = cbQuestions;
      source = "collegeboard";
    }
  } catch {
    // Fall back to sample questions
    questions = SAMPLE_QUESTIONS.filter((q) => !domain || q.domain === domain);
    source = "sample";
  }

  // Apply filters
  if (difficulty) {
    questions = questions.filter((q) => q.difficulty === difficulty);
  }
  if (skill) {
    questions = questions.filter((q) =>
      q.skill.toLowerCase().includes(skill.toLowerCase())
    );
  }
  if (search) {
    const lower = search.toLowerCase();
    questions = questions.filter(
      (q) =>
        q.stem.toLowerCase().includes(lower) ||
        q.skill.toLowerCase().includes(lower)
    );
  }

  // Pagination
  const total = questions.length;
  const start = (page - 1) * limit;
  const paged = questions.slice(start, start + limit);

  return { questions: paged, total, source };
}

export async function fetchRandomQuestions(
  domain?: QuestionDomain,
  difficulty?: QuestionDifficulty,
  count: number = 10
): Promise<Question[]> {
  let allQuestions: Question[] = [];
  let source = "sample";

  try {
    const cbDomain: QuestionDomain = domain || "math";
    const cbQuestions = await getCBQuestions(cbDomain);
    if (cbQuestions.length > 0) {
      allQuestions = cbQuestions;
      source = "collegeboard";
    }
  } catch {
    allQuestions = SAMPLE_QUESTIONS.filter((q) => !domain || q.domain === domain);
  }

  // Also merge sample questions for variety if CB returned few
  if (allQuestions.length < count * 2) {
    const samplePool = SAMPLE_QUESTIONS.filter((q) => !domain || q.domain === domain);
    const existingIds = new Set(allQuestions.map((q) => q.id));
    const extras = samplePool.filter((q) => !existingIds.has(q.id));
    allQuestions = [...allQuestions, ...extras];
  }

  if (difficulty) {
    allQuestions = allQuestions.filter((q) => q.difficulty === difficulty);
  }

  // Shuffle and slice
  const shuffled = [...allQuestions].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, shuffled.length));
}

export async function fetchSingleQuestion(id: string): Promise<Question | null> {
  // Check sample questions first (fast)
  const sample = SAMPLE_QUESTIONS.find((q) => q.id === id);
  if (sample) return sample;

  // Check CB cache
  if (cbCache) {
    const all = [...cbCache.math, ...cbCache.rw];
    const found = all.find((q) => q.id === id || q.externalId === id);
    if (found) return found;
  }

  return null;
}

// Available skills per domain
export const MATH_SKILLS = [
  "Algebra",
  "Advanced Math",
  "Problem-Solving and Data Analysis",
  "Geometry and Trigonometry",
];

export const RW_SKILLS = [
  "Information and Ideas",
  "Craft and Structure",
  "Expression of Ideas",
  "Standard English Conventions",
];

export function getSkillsForDomain(domain: QuestionDomain): string[] {
  return domain === "math" ? MATH_SKILLS : RW_SKILLS;
}
