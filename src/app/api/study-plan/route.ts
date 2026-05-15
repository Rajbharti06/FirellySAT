import { NextRequest, NextResponse } from "next/server";
import type { StudentProfile, StudyPlan, StudyPlanWeek } from "@/types";
import { generateId } from "@/lib/utils";

const NVIDIA_API_KEY = process.env.NVIDIA_API_KEY;
const NVIDIA_API_BASE = process.env.NVIDIA_API_BASE || "https://integrate.api.nvidia.com/v1";
const NVIDIA_MODEL = process.env.NVIDIA_STUDY_MODEL || "google/gemma-4-31b-it";

const HF_API_KEY = process.env.HF_API_KEY;
const HF_API_BASE = process.env.HF_API_BASE || "https://router.huggingface.co/hf-inference/v1";
const HF_MODEL = process.env.HF_STUDY_PLAN_MODEL || "Qwen/Qwen3-235B-A22B";

async function callAI(systemPrompt: string, userPrompt: string): Promise<string | null> {
  // Try NVIDIA first
  if (NVIDIA_API_KEY) {
    try {
      const res = await fetch(`${NVIDIA_API_BASE}/chat/completions`, {
        method: "POST",
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
          temperature: 0.7,
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

  // Fallback to HF
  if (HF_API_KEY) {
    try {
      const res = await fetch(`${HF_API_BASE}/chat/completions`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${HF_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: HF_MODEL,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          max_tokens: 4000,
          temperature: 0.7,
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
    const pointsNeeded = profile.targetScore - profile.currentScore;

    const systemPrompt = `You are FirellySAT's AI study planner. Create personalized, compassionate, and realistic SAT study plans.
Your plans are evidence-based, anxiety-aware, and encouraging. Use growth mindset language.
Always respond with valid JSON only — no markdown fences, no explanation, just the raw JSON object.`;

    const userPrompt = `Create a detailed SAT study plan:
- Current SAT Score: ${profile.currentScore}
- Target SAT Score: ${profile.targetScore} (+${pointsNeeded} points needed)
- Test Date: ${profile.testDate} (${daysUntilTest} days away, ${totalWeeks} weeks)
- Daily Study Time: ${profile.dailyStudyMinutes} minutes/day
- Weak Areas: ${profile.weakAreas.join(", ") || "Not specified"}
- Strong Areas: ${profile.strongAreas.join(", ") || "Not specified"}
- Test Anxiety Level: ${profile.anxietyLevel}/5 ${profile.anxietyLevel >= 4 ? "(HIGH - include specific anxiety reduction strategies daily)" : profile.anxietyLevel >= 3 ? "(MEDIUM)" : "(LOW)"}
- Learning Style: ${profile.learningStyle}

Return ONLY this JSON structure:
{
  "motivationalMessage": "A warm, personalized 2-3 sentence message",
  "keyStrategies": ["strategy1", "strategy2", "strategy3", "strategy4", "strategy5"],
  "anxietyTips": ["tip1", "tip2", "tip3", "tip4"],
  "dailyRoutine": "Paragraph describing ideal daily study routine",
  "weeklyPlan": [
    {
      "weekNumber": 1,
      "theme": "Foundation Building",
      "goals": ["goal1", "goal2", "goal3"],
      "focusDomains": ["math"],
      "expectedImprovement": "+20-30 points",
      "dailyTasks": [
        { "day": "Monday", "tasks": ["Task 1", "Task 2"], "estimatedMinutes": ${profile.dailyStudyMinutes}, "focusArea": "Algebra", "encouragement": "Short message" }
      ]
    }
  ]
}

Create ${Math.min(totalWeeks, 12)} weeks. Each week has 5-6 days (skip Sunday).
Focus on weak areas: ${profile.weakAreas.join(", ") || "all areas equally"}.`;

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
            totalWeeks: Math.min(totalWeeks, 12),
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

function generateFallbackPlan(profile: StudentProfile, totalWeeks: number): StudyPlan {
  const weeks = Math.min(totalWeeks, 12);
  const weeklyPlan: StudyPlanWeek[] = [];

  const weekThemes = [
    "Foundation Assessment", "Math Fundamentals", "Reading Strategies",
    "Writing Mastery", "Advanced Math", "Critical Reading",
    "Test-Taking Strategies", "Weak Area Focus", "Mixed Practice",
    "Timed Practice", "Final Review", "Test Prep",
  ];

  for (let w = 0; w < weeks; w++) {
    const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const dailyTasks = days.slice(0, 6).map((day) => ({
      day,
      tasks: [
        w < weeks / 2
          ? `Review ${profile.weakAreas[w % Math.max(1, profile.weakAreas.length)] || "Algebra"} concepts`
          : `Practice ${profile.weakAreas[w % Math.max(1, profile.weakAreas.length)] || "Algebra"} questions`,
        `Complete ${Math.round(profile.dailyStudyMinutes / 3)} questions on FirellySAT`,
        day === "Saturday" ? "Review all mistakes from this week" : "Note concepts to revisit",
      ],
      estimatedMinutes: profile.dailyStudyMinutes,
      focusArea: profile.weakAreas[w % Math.max(1, profile.weakAreas.length)] || "Mixed",
      encouragement:
        w < weeks / 3 ? "Every expert was once a beginner. You're building your foundation!"
        : w < (weeks * 2) / 3 ? "You're halfway there. Your hard work is paying off!"
        : "The finish line is in sight. Trust your preparation!",
    }));

    weeklyPlan.push({
      weekNumber: w + 1,
      theme: weekThemes[w] || `Week ${w + 1} Practice`,
      goals: [
        `Complete ${Math.round((profile.dailyStudyMinutes * 5) / 2)} minutes of practice`,
        `Focus on ${profile.weakAreas[w % Math.max(1, profile.weakAreas.length)] || "key skills"}`,
        "Review and understand all incorrect answers",
      ],
      dailyTasks,
      focusDomains: w % 2 === 0 ? ["math", "reading_and_writing"] : w % 3 === 0 ? ["math"] : ["reading_and_writing"],
      expectedImprovement: `+${Math.round(((profile.targetScore - profile.currentScore) / weeks) * 1.2)} points`,
    });
  }

  return {
    id: generateId(),
    generatedAt: new Date().toISOString(),
    studentProfile: profile,
    targetScore: profile.targetScore,
    testDate: profile.testDate,
    totalWeeks: weeks,
    weeklyPlan,
    keyStrategies: [
      `Spend 70% of practice time on weak areas: ${profile.weakAreas.join(", ") || "all sections"}`,
      "Daily consistency beats marathon sessions — 30 minutes daily > 3 hours weekly",
      "Review every wrong answer immediately and understand WHY",
      "Use FirellySAT's topic filter to drill specific skills",
      "Take at least one full mock test in your final week",
    ],
    anxietyTips: profile.anxietyLevel >= 3
      ? [
          "Before each session, take 5 deep breaths (4-4-6-2 pattern) to activate calm mode",
          "The SAT is a learnable skill — not a measure of your intelligence or worth",
          "Use FirellySAT Calm Mode — designed specifically for test-anxious students",
          "Every wrong answer is feedback, not failure. Progress over perfection.",
        ]
      : [
          "Maintain a consistent schedule to build confidence",
          "Practice under timed conditions to simulate test day",
          "Celebrate every milestone, no matter how small",
          "Trust your preparation — it's working even when it doesn't feel like it",
        ],
    dailyRoutine: `Start with a 2-minute breathing exercise. Spend ${Math.round(profile.dailyStudyMinutes * 0.2)} minutes reviewing yesterday's mistakes, then ${Math.round(profile.dailyStudyMinutes * 0.6)} minutes on new practice, and ${Math.round(profile.dailyStudyMinutes * 0.2)} minutes reviewing what you learned. Consistency is everything.`,
    motivationalMessage: `You've set an ambitious and achievable goal: going from ${profile.currentScore} to ${profile.targetScore}. With ${profile.dailyStudyMinutes} minutes of focused daily practice, you absolutely have what it takes. The fact you're building a plan shows the discipline that leads to real results. Trust the process, trust yourself.`,
  };
}
