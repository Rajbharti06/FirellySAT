import { NextRequest, NextResponse } from "next/server";
import type { StudentProfile, StudyPlan, StudyPlanWeek } from "@/types";
import { generateId } from "@/lib/utils";

const HF_API_KEY = process.env.HF_API_KEY;
const HF_API_BASE = process.env.HF_API_BASE || "https://router.huggingface.co/hf-inference/v1";
const MODEL = process.env.HF_STUDY_PLAN_MODEL || "Qwen/Qwen3-235B-A22B";

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

    const systemPrompt = `You are FirellySAT's AI study planner. You create personalized, compassionate, and realistic SAT study plans for students.
Your plans are evidence-based, anxiety-aware, and encouraging. You use growth mindset language.
Always respond with valid JSON only, no markdown, no explanation.`;

    const userPrompt = `Create a detailed SAT study plan for this student:
- Current SAT Score: ${profile.currentScore}
- Target SAT Score: ${profile.targetScore} (+${pointsNeeded} points needed)
- Test Date: ${profile.testDate} (${daysUntilTest} days away, ${totalWeeks} weeks)
- Daily Study Time: ${profile.dailyStudyMinutes} minutes/day
- Weak Areas: ${profile.weakAreas.join(", ") || "Not specified"}
- Strong Areas: ${profile.strongAreas.join(", ") || "Not specified"}
- Test Anxiety Level: ${profile.anxietyLevel}/5 (${profile.anxietyLevel >= 4 ? "HIGH - include specific anxiety reduction strategies" : profile.anxietyLevel >= 3 ? "MEDIUM" : "LOW"})
- Learning Style: ${profile.learningStyle}

Return a JSON object with this EXACT structure:
{
  "motivationalMessage": "A warm, personalized 2-3 sentence message acknowledging their goal and encouraging them",
  "keyStrategies": ["strategy1", "strategy2", "strategy3", "strategy4", "strategy5"],
  "anxietyTips": ["tip1", "tip2", "tip3", "tip4"],
  "dailyRoutine": "A paragraph describing the ideal daily study routine for this student",
  "weeklyPlan": [
    {
      "weekNumber": 1,
      "theme": "Foundation Building",
      "goals": ["goal1", "goal2", "goal3"],
      "focusDomains": ["math", "reading_and_writing"],
      "expectedImprovement": "+20-30 points",
      "dailyTasks": [
        {
          "day": "Monday",
          "tasks": ["Task 1", "Task 2"],
          "estimatedMinutes": ${profile.dailyStudyMinutes},
          "focusArea": "Algebra",
          "encouragement": "Short encouraging message"
        }
      ]
    }
  ]
}

Create ${Math.min(totalWeeks, 12)} weeks. Each week should have 5-6 days (skip Sunday).
Make it realistic for ${profile.dailyStudyMinutes} minutes/day.
Focus heavily on weak areas: ${profile.weakAreas.join(", ") || "all areas equally"}.
${profile.anxietyLevel >= 4 ? "Include breathing exercises and confidence-building activities daily since this student has HIGH anxiety." : ""}`;

    let plan: StudyPlan | null = null;

    if (HF_API_KEY) {
      try {
        const response = await fetch(`${HF_API_BASE}/chat/completions`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${HF_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: MODEL,
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: userPrompt },
            ],
            max_tokens: 4000,
            temperature: 0.7,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          const content = data.choices?.[0]?.message?.content;
          if (content) {
            // Extract JSON from response
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
          }
        }
      } catch (aiError) {
        console.error("AI generation failed, using fallback:", aiError);
      }
    }

    // Fallback: generate a structured plan without AI
    if (!plan) {
      plan = generateFallbackPlan(profile, totalWeeks);
    }

    return NextResponse.json(plan);
  } catch (error) {
    console.error("Study plan error:", error);
    return NextResponse.json(
      { error: "Failed to generate study plan" },
      { status: 500 }
    );
  }
}

function generateFallbackPlan(
  profile: StudentProfile,
  totalWeeks: number
): StudyPlan {
  const weeks = Math.min(totalWeeks, 12);
  const weeklyPlan: StudyPlanWeek[] = [];

  const weekThemes = [
    "Foundation Assessment",
    "Math Fundamentals",
    "Reading Strategies",
    "Writing Mastery",
    "Advanced Math",
    "Critical Reading",
    "Test-Taking Strategies",
    "Weak Area Focus",
    "Mixed Practice",
    "Timed Practice",
    "Final Review",
    "Test Prep",
  ];

  for (let w = 0; w < weeks; w++) {
    const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const dailyTasks = days.slice(0, Math.min(6, 5 + (profile.dailyStudyMinutes > 30 ? 1 : 0))).map((day) => ({
      day,
      tasks: [
        w < weeks / 2
          ? `Review ${profile.weakAreas[w % profile.weakAreas.length] || "Algebra"} concepts`
          : `Practice ${profile.weakAreas[w % profile.weakAreas.length] || "Algebra"} questions`,
        `Complete ${Math.round(profile.dailyStudyMinutes / 3)} questions on FirellySAT`,
        day === "Saturday" ? "Review mistakes from the week" : "Note down any concepts to revisit",
      ],
      estimatedMinutes: profile.dailyStudyMinutes,
      focusArea: profile.weakAreas[w % Math.max(1, profile.weakAreas.length)] || "Mixed",
      encouragement:
        w < weeks / 3
          ? "Every expert was once a beginner. You're building your foundation!"
          : w < (weeks * 2) / 3
          ? "You're halfway there. Your hard work is paying off!"
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
      focusDomains:
        w % 2 === 0
          ? ["math", "reading_and_writing"]
          : w % 3 === 0
          ? ["math"]
          : ["reading_and_writing"],
      expectedImprovement: `+${Math.round(
        ((profile.targetScore - profile.currentScore) / weeks) * 1.2
      )} points`,
    });
  }

  const anxietyTips =
    profile.anxietyLevel >= 3
      ? [
          "Before each study session, take 5 slow, deep breaths to activate your parasympathetic nervous system",
          "Remember: the SAT is a learnable skill, not a measure of your intelligence or worth",
          "Use the FirellySAT Calm Mode feature — it's specifically designed for test-anxious students",
          `Every wrong answer is feedback, not failure. Aim for progress, not perfection`,
        ]
      : [
          "Maintain a consistent study schedule to build confidence",
          "Practice under timed conditions to simulate test day",
          "Celebrate every milestone, no matter how small",
          "Trust your preparation — it's working even when it doesn't feel like it",
        ];

  return {
    id: generateId(),
    generatedAt: new Date().toISOString(),
    studentProfile: profile,
    targetScore: profile.targetScore,
    testDate: profile.testDate,
    totalWeeks: weeks,
    weeklyPlan,
    keyStrategies: [
      `Focus ${Math.round((2 / 3) * 100)}% of practice time on your weak areas: ${profile.weakAreas.join(", ") || "all sections"}`,
      "Practice daily consistency over marathon sessions",
      "Review every wrong answer immediately — understand WHY",
      "Use the FirellySAT question bank to target specific skills",
      "Take at least one timed full-length practice in your final week",
    ],
    anxietyTips,
    dailyRoutine: `Start each session with a 2-minute breathing exercise to calm your mind. Then spend ${Math.round(profile.dailyStudyMinutes * 0.2)} minutes reviewing your previous mistakes before tackling ${Math.round(profile.dailyStudyMinutes * 0.6)} minutes of new practice. End with ${Math.round(profile.dailyStudyMinutes * 0.2)} minutes reviewing what you learned. This routine builds consistent progress.`,
    motivationalMessage: `You've set an ambitious and achievable goal: going from ${profile.currentScore} to ${profile.targetScore}. With ${profile.dailyStudyMinutes} minutes of focused daily practice, you absolutely have what it takes to get there. The fact that you're building a plan shows the kind of discipline that leads to real results. Trust the process, and trust yourself.`,
  };
}
