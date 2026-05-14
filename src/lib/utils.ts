import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import type { QuestionDifficulty, QuestionDomain, PracticeStatistics, ScorePrediction } from "@/types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  return `${h}h ${m % 60}m`;
}

export function difficultyLabel(d: QuestionDifficulty): string {
  return { E: "Easy", M: "Medium", H: "Hard" }[d];
}

export function difficultyColor(d: QuestionDifficulty): string {
  return {
    E: "text-emerald-400",
    M: "text-amber-400",
    H: "text-red-400",
  }[d];
}

export function domainLabel(d: QuestionDomain): string {
  return d === "math" ? "Math" : "Reading & Writing";
}

export function domainColor(d: QuestionDomain): string {
  return d === "math" ? "text-violet-400" : "text-calm-500";
}

export function domainIcon(d: QuestionDomain): string {
  return d === "math" ? "calculator" : "book-open";
}

export function accuracyToGrade(acc: number): { grade: string; color: string } {
  if (acc >= 90) return { grade: "Excellent", color: "text-emerald-400" };
  if (acc >= 75) return { grade: "Good", color: "text-glow-400" };
  if (acc >= 60) return { grade: "Fair", color: "text-amber-400" };
  if (acc >= 40) return { grade: "Needs Work", color: "text-orange-400" };
  return { grade: "Keep Practicing", color: "text-red-400" };
}

export function predictScore(stats: PracticeStatistics): ScorePrediction {
  const total = stats.totalQuestionsAttempted;
  if (total === 0) {
    return {
      predictedScore: 800,
      confidence: 0,
      mathScore: 400,
      rwScore: 400,
      weakestSkills: [],
      nextMilestone: 900,
      estimatedDaysToMilestone: 14,
    };
  }

  const overall = stats.totalQuestionsCorrect / total;
  const mathDomain = stats.byDomain?.math;
  const rwDomain = stats.byDomain?.reading_and_writing;

  const mathAcc = mathDomain
    ? mathDomain.totalCorrect / Math.max(1, mathDomain.totalAttempted)
    : overall;
  const rwAcc = rwDomain
    ? rwDomain.totalCorrect / Math.max(1, rwDomain.totalAttempted)
    : overall;

  // Each section: 200-800. Linear mapping from accuracy to score.
  const mathScore = Math.round(200 + mathAcc * 600);
  const rwScore = Math.round(200 + rwAcc * 600);
  const predictedScore = mathScore + rwScore;

  const confidence = Math.min(95, Math.round((total / 50) * 80));

  const milestones = [800, 900, 1000, 1100, 1200, 1300, 1400, 1500, 1600];
  const nextMilestone = milestones.find((m) => m > predictedScore) ?? 1600;

  const pointsNeeded = nextMilestone - predictedScore;
  const estimatedDaysToMilestone = Math.round(pointsNeeded / 5);

  // Find weakest skills
  const skillAccuracies: { skill: string; acc: number }[] = [];
  if (mathDomain?.bySkill) {
    mathDomain.bySkill.forEach((s) =>
      skillAccuracies.push({ skill: s.skill, acc: s.accuracy })
    );
  }
  if (rwDomain?.bySkill) {
    rwDomain.bySkill.forEach((s) =>
      skillAccuracies.push({ skill: s.skill, acc: s.accuracy })
    );
  }
  skillAccuracies.sort((a, b) => a.acc - b.acc);
  const weakestSkills = skillAccuracies.slice(0, 3).map((s) => s.skill);

  return {
    predictedScore,
    confidence,
    mathScore,
    rwScore,
    weakestSkills,
    nextMilestone,
    estimatedDaysToMilestone,
  };
}

export function getStreakMessage(streak: number): string {
  if (streak === 0) return "Start your streak today!";
  if (streak === 1) return "Great start! Keep going tomorrow.";
  if (streak < 7) return `${streak} days strong! You're building momentum.`;
  if (streak < 14) return `${streak} days! You're on fire.`;
  if (streak < 30) return `${streak} days! Incredible consistency.`;
  return `${streak} days! You're unstoppable!`;
}

export function getDaysSinceLastPractice(lastDate: string | null): number {
  if (!lastDate) return Infinity;
  const last = new Date(lastDate);
  const now = new Date();
  const diffMs = now.getTime() - last.getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

export function getMotivationalQuote(): string {
  const quotes = [
    "Every question you practice is a step closer to your goal.",
    "The SAT is not a measure of your intelligence — it's a learnable skill.",
    "Progress, not perfection. Keep going.",
    "Struggle is where growth happens. Embrace it.",
    "You don't have to be perfect. You just have to be consistent.",
    "Every wrong answer teaches you something right.",
    "Your score will rise as surely as the sun. Keep practicing.",
    "The hardest part is starting. You've already done that.",
    "Trust the process. Trust yourself.",
    "One question at a time. That's all it takes.",
    "You're not behind. You're exactly where you need to be.",
    "Fear is temporary. Your SAT score is permanent — make it count.",
    "The test doesn't define you, but how you prepare reveals your character.",
    "Small daily improvements lead to stunning long-term results.",
  ];
  return quotes[Math.floor(Math.random() * quotes.length)];
}

export function getCalmnessMessage(): string {
  const messages = [
    "Take a deep breath. You've prepared for this.",
    "This is just practice. Each question makes you stronger.",
    "You are capable. You are prepared. You've got this.",
    "Slow down. Think clearly. Trust yourself.",
    "It's okay to not know everything. That's why we practice.",
    "One question at a time. You don't have to solve everything at once.",
    "Your brain is doing great work right now.",
    "Breathe in confidence, breathe out doubt.",
  ];
  return messages[Math.floor(Math.random() * messages.length)];
}

export function getTimeOfDay(): "morning" | "afternoon" | "evening" | "night" {
  const h = new Date().getHours();
  if (h >= 5 && h < 12) return "morning";
  if (h >= 12 && h < 17) return "afternoon";
  if (h >= 17 && h < 21) return "evening";
  return "night";
}

export function getGreeting(name?: string): string {
  const timeOfDay = getTimeOfDay();
  const greetings = {
    morning: "Good morning",
    afternoon: "Good afternoon",
    evening: "Good evening",
    night: "Hey",
  };
  const base = greetings[timeOfDay];
  return name ? `${base}, ${name}!` : `${base}!`;
}

export function sanitizeHtml(html: string): string {
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/on\w+="[^"]*"/gi, "");
}

export function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

export function generateId(): string {
  return Math.random().toString(36).substring(2, 11);
}
