import { NextRequest, NextResponse } from "next/server";
import type { StudentProfile, StudyPlan, StudyPlanWeek } from "@/types";
import { generateId } from "@/lib/utils";

const NVIDIA_API_KEY = process.env.NVIDIA_API_KEY;
const NVIDIA_API_BASE = process.env.NVIDIA_API_BASE || "https://integrate.api.nvidia.com/v1";
const NVIDIA_MODEL = process.env.NVIDIA_STUDY_MODEL || "meta/llama-3.3-70b-instruct";

const HF_API_KEY = process.env.HF_API_KEY;
const HF_API_BASE = process.env.HF_API_BASE || "https://router.huggingface.co/hf-inference/v1";
const HF_MODEL = process.env.HF_STUDY_PLAN_MODEL || "Qwen/Qwen3-235B-A22B";

const AI_TIMEOUT_MS = 55000;

function withTimeout(ms: number): AbortController {
  const controller = new AbortController();
  setTimeout(() => controller.abort(), ms);
  return controller;
}

// SAT domain weight and score-impact reference used in the prompt
const SAT_CONTEXT = `
Digital SAT Structure (2024+):
- Reading & Writing: 54 questions, 64 min | Math: 44 questions, 70 min
- Module-adaptive: Module 1 sets difficulty; Module 2 adjusts up or down
- Score range: 400–1600 (200–800 per section)

RW Domain weights: Information & Ideas 26%, Craft & Structure 28%, Expression of Ideas 20%, Standard English Conventions 26%
Math Domain weights: Algebra 35%, Advanced Math 35%, Problem-Solving & Data Analysis 15%, Geometry & Trigonometry 15%

Score-to-skill mapping:
400–800:   Focus on foundational grammar, linear equations, and reading comprehension basics
800–1000:  Focus on inference questions, word-in-context, systems of equations, data interpretation
1000–1200: Focus on rhetoric/purpose questions, quadratics, percents, statistics
1200–1400: Focus on complex evidence, transitions, advanced algebra, geometry/trig
1400–1600: Focus on nuance, tone, advanced functions, circle equations, conditional probability

Official free resources (always reference these):
- College Board official practice tests: collegeboard.org/sat/practice
- Khan Academy SAT prep (free, personalized): khanacademy.org/sat
- College Board Bluebook app for full digital practice tests`;

async function callAI(systemPrompt: string, userPrompt: string): Promise<string | null> {
  if (NVIDIA_API_KEY) {
    const controller = withTimeout(AI_TIMEOUT_MS);
    try {
      const res = await fetch(`${NVIDIA_API_BASE}/chat/completions`, {
        method: "POST",
        signal: controller.signal,
        headers: {
          Authorization: `Bearer ${NVIDIA_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: NVIDIA_MODEL,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          max_tokens: 4096,
          temperature: 0.3,
          stream: false,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        const content = data.choices?.[0]?.message?.content;
        if (content) return content;
      }
    } catch (e) {
      console.error("NVIDIA API failed:", e);
    }
  }

  if (HF_API_KEY) {
    const controller = withTimeout(AI_TIMEOUT_MS);
    // Prefix /no_think for Qwen3 so thinking tokens don't consume output budget
    const noThinkPrefix = HF_MODEL.includes("Qwen3") ? "/no_think\n\n" : "";
    try {
      const res = await fetch(`${HF_API_BASE}/chat/completions`, {
        method: "POST",
        signal: controller.signal,
        headers: {
          Authorization: `Bearer ${HF_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: HF_MODEL,
          messages: [
            { role: "system", content: noThinkPrefix + systemPrompt },
            { role: "user", content: userPrompt },
          ],
          max_tokens: 4096,
          temperature: 0.3,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        const content = data.choices?.[0]?.message?.content;
        if (content) return content;
      }
    } catch (e) {
      console.error("HF API failed:", e);
    }
  }

  return null;
}

export async function POST(req: NextRequest) {
  try {
    const { profile }: { profile: StudentProfile } = await req.json();

    if (!profile || !profile.testDate) {
      return NextResponse.json({ error: "Invalid profile" }, { status: 400 });
    }

    const testDate = new Date(profile.testDate);
    const now = new Date();
    const daysUntilTest = Math.max(
      1,
      Math.floor((testDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    );
    const totalWeeks = Math.max(1, Math.floor(daysUntilTest / 7));
    const planWeeks = Math.min(totalWeeks, 12);
    const pointsNeeded = profile.targetScore - profile.currentScore;

    const systemPrompt = `You are an expert SAT tutor with 10+ years of experience and deep knowledge of the Digital SAT (2024+). You create highly personalized, evidence-based, and realistic study plans.

${SAT_CONTEXT}

Planning principles you ALWAYS follow:
1. Week 1 is always diagnostic: identify gaps before drilling content
2. Allocate study time proportional to domain weights AND the student's weak areas
3. For anxiety ≥ 4/5: embed daily 2-min breathing exercises and remove timed pressure in early weeks
4. Use spaced repetition: revisit weak topics every 3rd week
5. Reserve the last week before the test for full mock tests + light review only
6. Include College Board and Khan Academy resources by name — these are free and official
7. Daily tasks must fit inside the student's stated study time. Do not over-assign.
8. Be encouraging but honest about realistic score trajectories.

Always respond with valid JSON only — no markdown fences, no explanation, just the raw JSON object.`;

    const anxietyNote = profile.anxietyLevel >= 4
      ? "CRITICAL: This student has high test anxiety. Every week must include explicit anxiety management. Early weeks must use untimed or low-pressure practice. Gradually introduce timed conditions only after Week 3."
      : profile.anxietyLevel >= 3
      ? "This student has moderate anxiety. Include breathing/mindset tips weekly."
      : "Student has low anxiety. Standard progression is fine.";

    const scoreContext = profile.currentScore < 800
      ? "Score range: needs foundational skills first (grammar basics, linear equations, reading comprehension). Do NOT jump to advanced topics."
      : profile.currentScore < 1000
      ? "Score range: solidify core skills, begin inference and data questions."
      : profile.currentScore < 1200
      ? "Score range: target medium-difficulty questions, work on test strategy and pacing."
      : profile.currentScore < 1400
      ? "Score range: refine advanced skills, reduce careless errors, master time management."
      : "Score range: near-perfect score needed. Focus on the hardest question types and consistency.";

    const userPrompt = `Create a detailed, accurate, personalized SAT study plan:

STUDENT PROFILE:
- Current SAT Score: ${profile.currentScore} / 1600
- Target SAT Score: ${profile.targetScore} / 1600 (+${pointsNeeded} points needed)
- Test Date: ${profile.testDate} (${daysUntilTest} days / ${totalWeeks} weeks away)
- Daily Study Time Available: ${profile.dailyStudyMinutes} minutes/day
- Weak Areas: ${profile.weakAreas.join(", ") || "not specified — assess all areas in Week 1"}
- Strong Areas: ${profile.strongAreas.join(", ") || "not identified yet"}
- Test Anxiety Level: ${profile.anxietyLevel}/5 — ${ANXIETY_LABELS[profile.anxietyLevel]}
- Learning Style: ${profile.learningStyle}

SCORE CONTEXT: ${scoreContext}
ANXIETY GUIDANCE: ${anxietyNote}

PLANNING REQUIREMENTS:
- Create exactly ${planWeeks} weeks. Each week has exactly 5 days (Monday through Friday).
- Daily tasks must realistically fit in ${profile.dailyStudyMinutes} minutes.
- Week 1: Diagnostic week — use free College Board mini test + Khan Academy skill check to identify exact gaps.
- Middle weeks: Targeted skill building on weak areas, following domain weight priorities.
- Week ${planWeeks}: If ≥ 2 weeks of prep, dedicate to full mock tests (College Board Bluebook) + error review only.
- Reference specific free resources (Khan Academy modules, College Board practice tests) in tasks.
- Goals must be measurable (e.g., "Score 80%+ on Khan Academy Algebra module", not vague phrases).
- expectedImprovement per week must be realistic based on research (most students gain 20-40pts/week of focused study).

Return ONLY this JSON (no markdown):
{
  "motivationalMessage": "Warm, specific 2-3 sentence message referencing their exact score gap and timeline",
  "keyStrategies": [
    "Specific strategy 1 with rationale",
    "Specific strategy 2 with rationale",
    "Specific strategy 3 with rationale",
    "Specific strategy 4 with rationale",
    "Specific strategy 5 with rationale"
  ],
  "anxietyTips": [
    "Specific tip 1 with how-to",
    "Specific tip 2 with how-to",
    "Specific tip 3 with how-to",
    "Specific tip 4 with how-to"
  ],
  "dailyRoutine": "Detailed paragraph: how to structure each study session from start to end",
  "weeklyPlan": [
    {
      "weekNumber": 1,
      "theme": "Diagnostic & Foundation",
      "goals": [
        "Measurable goal 1",
        "Measurable goal 2",
        "Measurable goal 3"
      ],
      "focusDomains": ["math", "reading_and_writing"],
      "expectedImprovement": "+15-25 points (diagnostic baseline)",
      "dailyTasks": [
        {
          "day": "Monday",
          "tasks": [
            "Specific task referencing exact resource",
            "Specific task 2",
            "Specific task 3"
          ],
          "estimatedMinutes": ${profile.dailyStudyMinutes},
          "focusArea": "Diagnostic",
          "encouragement": "Short motivational sentence"
        }
      ]
    }
  ]
}`;

    let plan: StudyPlan | null = null;

    const content = await callAI(systemPrompt, userPrompt);
    if (content) {
      try {
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          plan = {
            id: generateId(),
            generatedAt: new Date().toISOString(),
            studentProfile: profile,
            targetScore: profile.targetScore,
            testDate: profile.testDate,
            totalWeeks: planWeeks,
            weeklyPlan: parsed.weeklyPlan || [],
            keyStrategies: parsed.keyStrategies || [],
            anxietyTips: parsed.anxietyTips || [],
            dailyRoutine: parsed.dailyRoutine || "",
            motivationalMessage: parsed.motivationalMessage || "",
          };
        }
      } catch (e) {
        console.error("Failed to parse AI response:", e);
      }
    }

    if (!plan) {
      plan = generateFallbackPlan(profile, totalWeeks);
    }

    return NextResponse.json(plan);
  } catch (error) {
    console.error("Study plan error:", error);
    return NextResponse.json({ error: "Failed to generate study plan" }, { status: 500 });
  }
}

const ANXIETY_LABELS: Record<number, string> = {
  1: "Very Low — feels relaxed about the test",
  2: "Low — mild nerves",
  3: "Medium — noticeable anxiety",
  4: "High — often stressed about testing",
  5: "Very High — debilitating test fear",
};

function generateFallbackPlan(profile: StudentProfile, totalWeeks: number): StudyPlan {
  const weeks = Math.min(totalWeeks, 12);
  const weeklyPlan: StudyPlanWeek[] = [];

  const weekThemes = [
    "Diagnostic & Foundation Assessment",
    "Math Fundamentals & Grammar Basics",
    "Reading Strategies & Algebra",
    "Writing Mastery & Advanced Math",
    "Data Analysis & Inference Questions",
    "Critical Reading & Problem Solving",
    "Test-Taking Strategies & Pacing",
    "Weak Area Intensive Focus",
    "Mixed Timed Practice",
    "Full Mock Test & Error Review",
    "Final Weak Spot Elimination",
    "Test Week Preparation",
  ];

  for (let w = 0; w < weeks; w++) {
    const isLastWeek = w === weeks - 1;
    const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
    const focusArea = profile.weakAreas[w % Math.max(1, profile.weakAreas.length)] || "Algebra";

    const dailyTasks = days.map((day, i) => ({
      day,
      tasks: isLastWeek
        ? [
            day === "Monday" ? "Complete College Board full practice test (Bluebook app)" : `Review all errors from practice test — focus on ${focusArea}`,
            "Rest and light review only — no new concepts this week",
            "Visualization: imagine yourself walking into the test confident and prepared",
          ]
        : [
            w === 0
              ? `Take College Board mini diagnostic (khanacademy.org/sat) to identify your exact gaps`
              : `Khan Academy: Complete one ${focusArea} skill module (20-25 min)`,
            i < 2
              ? `Review concepts: study examples from Khan Academy ${focusArea} lesson`
              : `Practice: 10-question drill on ${focusArea} (College Board question bank)`,
            day === "Friday"
              ? "Weekly review: revisit all errors from this week, note patterns"
              : "Log 3 things you learned today in your error journal",
          ],
      estimatedMinutes: profile.dailyStudyMinutes,
      focusArea: isLastWeek ? "Test Simulation" : focusArea,
      encouragement:
        w === 0
          ? "Every expert was once a beginner. This week is about honest self-assessment — it's your superpower."
          : w < weeks / 3
          ? "You're building your foundation. Consistency now pays off exponentially later."
          : w < (weeks * 2) / 3
          ? "You're past the halfway mark. Your hard work is already showing in your practice scores."
          : isLastWeek
          ? "You've done the work. Trust your preparation and stay relaxed — you're ready."
          : "The finish line is in sight. One focused week and you'll peak at exactly the right time.",
    }));

    weeklyPlan.push({
      weekNumber: w + 1,
      theme: weekThemes[w] || `Week ${w + 1} — Mixed Practice`,
      goals: isLastWeek
        ? [
            "Complete at least one full-length College Board mock test under real conditions",
            "Review every wrong answer and categorize errors (concept gap vs. careless)",
            "Rest well — sleep is as important as study this week",
          ]
        : [
            w === 0
              ? "Complete Khan Academy diagnostic and identify your top 3 skill gaps"
              : `Score 75%+ on Khan Academy ${focusArea} practice set`,
            `Complete ${Math.round((profile.dailyStudyMinutes * 5) / 3)} minutes of deliberate practice this week`,
            "Write and review your error journal every Friday to track progress",
          ],
      dailyTasks,
      focusDomains:
        w % 3 === 0
          ? ["math", "reading_and_writing"]
          : w % 3 === 1
          ? ["math"]
          : ["reading_and_writing"],
      expectedImprovement: isLastWeek
        ? "Consolidation — protect gains"
        : `+${Math.round(((profile.targetScore - profile.currentScore) / weeks) * 1.1)} points`,
    });
  }

  const hasHighAnxiety = profile.anxietyLevel >= 4;
  const hasMedAnxiety = profile.anxietyLevel >= 3;

  return {
    id: generateId(),
    generatedAt: new Date().toISOString(),
    studentProfile: profile,
    targetScore: profile.targetScore,
    testDate: profile.testDate,
    totalWeeks: weeks,
    weeklyPlan,
    keyStrategies: [
      `Spend 60–70% of study time on your weak areas: ${profile.weakAreas.join(", ") || "all sections equally"} — this is where the biggest score gains come from`,
      `Use Khan Academy's free SAT prep (khanacademy.org/sat) — it's personalized and linked to College Board data`,
      "Keep an error journal: every wrong answer gets written down with WHY you got it wrong and the correct approach",
      `Take a full College Board practice test (Bluebook app) every 3–4 weeks to track real progress — not just skill drills`,
      "30 minutes of focused daily practice beats 3-hour weekend sessions — consistency is the #1 predictor of score gains",
    ],
    anxietyTips: hasHighAnxiety
      ? [
          "Before every session, do 4–7–8 breathing: inhale 4s, hold 7s, exhale 8s — activates the parasympathetic nervous system",
          "Reframe wrong answers as data, not failure. Every error you understand now is a point you'll earn on test day",
          "In early weeks, practice without timers — build accuracy first. Add time pressure only in weeks 3–4 onward",
          "Use FirellySAT Calm Mode before studying — the box breathing exercise measurably reduces cortisol before cognitive tasks",
        ]
      : hasMedAnxiety
      ? [
          "Start each session with 2 minutes of deep breathing to shift from stress mode to learning mode",
          "The SAT is a learnable skill test, not an intelligence test — every point gained is earned, not gifted",
          "Practice under timed conditions 2–3 times per week to build familiarity and reduce test-day surprise",
          "Celebrate milestones: every 5-point Khan Academy improvement and every skill module completed is real progress",
        ]
      : [
          "Maintain your consistent schedule — your calm attitude is a competitive advantage on test day",
          "Simulate test-day conditions at least once per week: phone away, timer running, no interruptions",
          "Review errors without self-judgment — analysis mode is more productive than frustration mode",
          "Trust your preparation. Confidence built on evidence (your practice scores) is the best test-day mindset",
        ],
    dailyRoutine: `Start with a 2-minute breathing reset. Spend the first ${Math.round(profile.dailyStudyMinutes * 0.15)} minutes reviewing yesterday's errors — don't move on until you understand each one. Spend the next ${Math.round(profile.dailyStudyMinutes * 0.55)} minutes on new practice (Khan Academy module or College Board questions). Use the last ${Math.round(profile.dailyStudyMinutes * 0.30)} minutes to review what you got wrong today and add to your error journal. End with one thing you did well — positive reinforcement matters for retention.`,
    motivationalMessage: `Going from ${profile.currentScore} to ${profile.targetScore} — a ${profile.targetScore - profile.currentScore}-point improvement — is completely achievable with ${profile.dailyStudyMinutes} minutes of focused daily practice. Students who study consistently with an error journal and official resources regularly hit gains of 200+ points. You've already done the hardest step: making a plan. Every session from here is a deposit in your future score.`,
  };
}
