import { NextRequest, NextResponse } from "next/server";
import type { StudentProfile, StudyPlan, StudyPlanWeek, TestAnalysis } from "@/types";
import { generateId } from "@/lib/utils";

const NVIDIA_API_KEY = process.env.NVIDIA_API_KEY;
const NVIDIA_API_BASE = process.env.NVIDIA_API_BASE || "https://integrate.api.nvidia.com/v1";
const NVIDIA_MODEL = process.env.NVIDIA_STUDY_MODEL || "meta/llama-3.3-70b-instruct";

const HF_API_KEY = process.env.HF_API_KEY;
const HF_API_BASE = process.env.HF_API_BASE || "https://router.huggingface.co/hf-inference/v1";
const HF_MODEL = process.env.HF_STUDY_PLAN_MODEL || "Qwen/Qwen3-235B-A22B";

const AI_TIMEOUT_MS = 25000;

function withTimeout(ms: number): AbortController {
  const controller = new AbortController();
  setTimeout(() => controller.abort(), ms);
  return controller;
}

const SAT_CONTEXT = `
Digital SAT Structure (2024+):
- Reading & Writing: 54 questions, 64 min | Math: 44 questions, 70 min
- Module-adaptive: Module 1 sets difficulty; Module 2 adjusts up or down based on performance
- Score range: 400-1600 (200-800 per section)
- Time per question: RW ~71 sec/question | Math ~95 sec/question

RW Domain weights: Information & Ideas 26%, Craft & Structure 28%, Expression of Ideas 20%, Standard English Conventions 26%
Math Domain weights: Algebra 35%, Advanced Math 35%, Problem-Solving & Data Analysis 15%, Geometry & Trigonometry 15%

Score-to-skill mapping:
400-800:   Careless errors on easy questions cost most. Master foundational grammar and linear equations first.
800-1000:  Medium questions are the growth zone. Learn question patterns, not just content. Target inference & data.
1000-1200: Eliminate careless errors on E+M. Work on test strategy, pacing, rhetoric, and quadratics.
1200-1400: Hard question patterns are identifiable. Complex evidence, transitions, advanced algebra, geometry.
1400-1600: Nuance, tone, advanced functions, circle equations, conditional probability. Each error costs 10-20 pts.

Official free resources:
- College Board practice tests: collegeboard.org/sat/practice
- Khan Academy SAT prep (personalized, free): khanacademy.org/sat
- College Board Bluebook app for full digital practice tests`;

const SAT_PEDAGOGY = `
PROVEN SAT COACHING STRATEGIES (what the best SAT teachers teach):

SCORE-SPECIFIC COACHING:
- 400-800: Get all Easy questions correct first — these are free points. Missing easy questions is the biggest score killer.
- 800-1000: Medium questions are your growth zone. The SAT repeats the same patterns — learn to recognize them.
- 1000-1200: Build an error log. Classify each miss: concept gap (need to learn), careless (need to slow down), time pressure (need pacing practice).
- 1200-1400: Hard questions have identifiable traps. Study wrong answer explanations as carefully as correct ones.
- 1400-1600: Every error is solvable. Time management is usually the final barrier. Analyze each miss obsessively.

READING & WRITING MASTERY:
- Evidence Rule: Every correct R&W answer is directly proven by specific words in the passage. Can't cite it? It's wrong.
- Word-in-Context: Never pick the most common definition. The word must fit the exact passage context.
- Transitions: SAT tests 5 relationships — addition, contrast, cause-effect, sequence, example. Identify the relationship FIRST.
- Standard English Conventions: 8 rules cover 90%+ of grammar questions:
  (1) Comma splices — can't join two independent clauses with only a comma
  (2) Subject-verb agreement — watch for interrupting phrases between subject and verb
  (3) Pronoun-antecedent agreement
  (4) Apostrophes — its vs it's, possessives
  (5) Parallelism — list items must match grammatically
  (6) Modifier placement — modifiers must touch what they modify
  (7) Verb tense consistency
  (8) Semicolon/colon use
- Information & Ideas inference: Wrong answers are true but too extreme, too broad, or not directly stated in the text.
- Expression of Ideas: Focus on the writer's PURPOSE. The correct answer logically serves that purpose.

MATH MASTERY:
- If your algebra solution looks messy or complicated, re-read the question — SAT problems usually have clean solutions.
- Back-solving: When choices are specific numbers, plug them in. Start with B or C (answers are usually ordered).
- Substitution: Pick simple numbers (0, 1, 2) for variables to test answer choices — faster than pure algebra.
- Advanced Math: Know all three quadratic forms — vertex form y=a(x-h)^2+k, factored form, standard form. Know when to use each.
- Desmos strategy: In Module 2, use Desmos for graphing/intersection problems — graphing is faster than algebra.
- Data Analysis: Always read graph axis labels and units first. Watch for "per 100" vs absolute numbers.
- Geometry: Draw every geometry problem and label all given values. Most problems use Pythagorean theorem, similar triangles, or basic area formulas.

DIGITAL SAT TACTICS:
- Module 1 is critical: performance here determines whether Module 2 is easier or harder. Don't rush Module 1.
- Mark & Review: Flag questions that will take >2.5 minutes and return later — never get stuck on one question.
- Process of Elimination: On hard questions, 2-3 choices are identifiably wrong. Eliminate them first.
- Pacing benchmarks: RW — at question 27, you should have ~32 minutes left. Math — at question 22, ~35 minutes left.

STUDY METHODOLOGY:
- Error Journal (most powerful tool): After every session — write each wrong answer with (1) correct answer (2) WHY you missed it (3) what to do differently.
- Spaced repetition: Review error journal entries from 3, 7, and 14 days ago — not just today's mistakes.
- Active recall beats passive re-reading: Do questions. Don't re-read notes.
- Interleaved practice: Mix RW and Math question types — don't drill one skill for hours straight.
- Official sources only for serious practice: Khan Academy and College Board questions match real SAT difficulty precisely.`;

async function callAI(systemPrompt: string, userPrompt: string): Promise<string | null> {
  type RequestEntry = { controller: AbortController; promise: Promise<string | null> };
  const requests: RequestEntry[] = [];

  const addRequest = (url: string, key: string, model: string, sysPrefix = "") => {
    const controller = withTimeout(AI_TIMEOUT_MS);
    const promise = fetch(url, {
      method: "POST",
      signal: controller.signal,
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: sysPrefix + systemPrompt },
          { role: "user", content: userPrompt },
        ],
        max_tokens: 3000,
        temperature: 0.3,
        stream: false,
      }),
    })
      .then(async (res) => {
        if (!res.ok) return null;
        const data = await res.json();
        return (data.choices?.[0]?.message?.content as string) ?? null;
      })
      .catch(() => null);
    requests.push({ controller, promise });
  };

  if (NVIDIA_API_KEY) {
    addRequest(`${NVIDIA_API_BASE}/chat/completions`, NVIDIA_API_KEY, NVIDIA_MODEL);
  }
  if (HF_API_KEY) {
    // Prefix /no_think for Qwen3 so thinking tokens don't consume output budget
    const prefix = HF_MODEL.includes("Qwen3") ? "/no_think\n\n" : "";
    addRequest(`${HF_API_BASE}/chat/completions`, HF_API_KEY, HF_MODEL, prefix);
  }

  if (requests.length === 0) return null;

  // Race all providers — first valid response wins, losers get aborted
  return new Promise<string | null>((resolve) => {
    let settled = 0;
    let won = false;
    const total = requests.length;
    const cancelAll = () =>
      requests.forEach(({ controller }) => { try { controller.abort(); } catch { /* ignore */ } });

    for (const { promise } of requests) {
      promise.then((result) => {
        settled++;
        if (!won && result) {
          won = true;
          cancelAll();
          resolve(result);
        } else if (settled === total && !won) {
          resolve(null);
        }
      });
    }
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { profile, testAnalysis }: { profile: StudentProfile; testAnalysis?: TestAnalysis } = body;

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

    const systemPrompt = `You are a world-class SAT coach with 15+ years of experience helping students improve 200-400+ points. You build highly personalized, evidence-based study plans grounded in how the Digital SAT actually works.

${SAT_CONTEXT}

${SAT_PEDAGOGY}

Planning principles you ALWAYS follow:
1. Week 1 is diagnostic: identify precise gaps before drilling content
2. Allocate time proportional to domain weights AND confirmed weak areas
3. For anxiety >= 4/5: embed daily breathing exercises; start untimed, add time pressure gradually after Week 3
4. Use spaced repetition: revisit weak topics every 3rd week
5. Reserve the last week for full mock tests + light review only
6. Reference College Board and Khan Academy by name in tasks — they are free and official
7. Daily tasks must fit inside the student's stated study time — never over-assign
8. Each day must have DIFFERENT tasks — Monday must not equal Tuesday
9. Include specific question counts, time allocations, and measurable targets
10. Be encouraging but honest about realistic score trajectories

Always respond with valid JSON only — no markdown fences, no preamble, just the raw JSON object.`;

    const anxietyNote = profile.anxietyLevel >= 4
      ? "CRITICAL: High test anxiety. Every week must include explicit anxiety management. Use untimed practice in early weeks. Introduce timed conditions gradually after Week 3."
      : profile.anxietyLevel >= 3
      ? "Moderate anxiety. Include breathing and mindset tips each week."
      : "Low anxiety. Standard progression is fine.";

    const scoreContext = profile.currentScore < 800
      ? "Foundational skills needed: grammar basics, linear equations, reading comprehension. Do NOT jump to advanced topics."
      : profile.currentScore < 1000
      ? "Solidify core skills. Target medium-difficulty questions. Begin inference and data interpretation."
      : profile.currentScore < 1200
      ? "Work on test strategy and pacing. Tackle medium-hard questions. Reduce careless errors."
      : profile.currentScore < 1400
      ? "Refine advanced skills. Build error log. Master time management and hard question patterns."
      : "Near-perfect score needed. Obsessive error analysis. Hardest question types only.";

    const testAnalysisSection = testAnalysis
      ? `
UPLOADED PRACTICE TEST DATA (use for hyper-specific daily tasks):
- Verified score: ${testAnalysis.totalScore ?? "unknown"}/1600 | Math: ${testAnalysis.mathScore ?? "unknown"} | R&W: ${testAnalysis.readingWritingScore ?? "unknown"}
- Confirmed weak domains: ${testAnalysis.weakDomains.map(d => `${d.domain}${d.correctRate ? ` (${d.correctRate} correct)` : ""}${d.issues.length ? `: ${d.issues[0]}` : ""}`).join(" | ")}
- Strong domains: ${testAnalysis.strongDomains.join(", ") || "none identified"}
- Error patterns: ${testAnalysis.wrongQuestions.slice(0, 8).map(q => `${q.skill} (${q.likelyError})`).join(", ")}
- Time management issues: ${testAnalysis.timeManagementIssues ? "YES — build explicit pacing drills into Weeks 2-3" : "No"}
- AI summary: ${testAnalysis.summary}

CRITICAL: Use exact correct rates to set measurable goals (e.g., "improve from 10/16 to 13/16 on Standard English Conventions"). Reference specific error patterns in daily tasks.`
      : "";

    const userPrompt = `Create a detailed, personalized SAT study plan:

STUDENT PROFILE:
- Current SAT Score: ${profile.currentScore} / 1600
- Target SAT Score: ${profile.targetScore} / 1600 (+${pointsNeeded} points needed)
- Test Date: ${profile.testDate} (${daysUntilTest} days / ${totalWeeks} weeks away)
- Daily Study Time: ${profile.dailyStudyMinutes} minutes/day
- Weak Areas: ${profile.weakAreas.join(", ") || "assess all in Week 1"}
- Strong Areas: ${profile.strongAreas.join(", ") || "not identified yet"}
- Test Anxiety: ${profile.anxietyLevel}/5 — ${ANXIETY_LABELS[profile.anxietyLevel]}
- Learning Style: ${profile.learningStyle}
${testAnalysisSection}

SCORE CONTEXT: ${scoreContext}
ANXIETY GUIDANCE: ${anxietyNote}

REQUIREMENTS:
- Create exactly ${planWeeks} weeks. Each week has exactly 5 days (Monday-Friday).
- Daily tasks must fit in ${profile.dailyStudyMinutes} minutes.
- Each day must have DIFFERENT tasks (Monday = concept intro, Tuesday = timed drill, Wednesday = error review, Thursday = mixed practice, Friday = weekly review).
- Week 1: Diagnostic — Khan Academy diagnostic + College Board mini test to identify exact gaps.
- Middle weeks: Alternate between RW and Math. Include specific question counts (e.g., "10 questions", "15-minute drill").
- Final week: Full mock test + error review. Light review only — no new concepts.
- Reference specific Khan Academy modules and College Board Bluebook in tasks.
- Goals must be measurable ("Score 80%+ on Khan Academy Algebra module", not "improve at algebra").
- expectedImprovement must be realistic (15-30 pts/week of focused study).
- motivationalMessage must reference their EXACT score gap, timeline, and top opportunity.

Return ONLY this JSON (no markdown):
{
  "motivationalMessage": "Warm, specific 2-3 sentence message referencing exact score gap, timeline, and biggest improvement opportunity",
  "keyStrategies": [
    "Specific strategy 1 with coaching rationale",
    "Specific strategy 2 with coaching rationale",
    "Specific strategy 3 with coaching rationale",
    "Specific strategy 4 with coaching rationale",
    "Specific strategy 5 with coaching rationale"
  ],
  "anxietyTips": [
    "Specific tip 1 with step-by-step instructions",
    "Specific tip 2 with step-by-step instructions",
    "Specific tip 3 with step-by-step instructions",
    "Specific tip 4 with step-by-step instructions"
  ],
  "dailyRoutine": "Detailed paragraph: exactly how to structure each study session from start to end",
  "weeklyPlan": [
    {
      "weekNumber": 1,
      "theme": "Diagnostic & Baseline",
      "goals": ["Measurable goal 1", "Measurable goal 2", "Measurable goal 3"],
      "focusDomains": ["math", "reading_and_writing"],
      "expectedImprovement": "+10-20 points (diagnostic baseline)",
      "dailyTasks": [
        {
          "day": "Monday",
          "tasks": ["Specific task with named resource", "Specific task 2", "Specific task 3"],
          "estimatedMinutes": ${profile.dailyStudyMinutes},
          "focusArea": "Diagnostic",
          "encouragement": "Short motivational sentence specific to this day"
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
      plan = generateFallbackPlan(profile, totalWeeks, testAnalysis);
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

function generateFallbackPlan(
  profile: StudentProfile,
  totalWeeks: number,
  testAnalysis?: TestAnalysis
): StudyPlan {
  const weeks = Math.min(totalWeeks, 12);
  const weeklyPlan: StudyPlanWeek[] = [];
  const weakAreas = (testAnalysis?.weakDomains?.map(d => d.domain) || profile.weakAreas);
  const getFocus = (i: number) => weakAreas[i % Math.max(1, weakAreas.length)] || "Algebra";

  const WEEK_THEMES = [
    "Diagnostic & Foundation Assessment",
    "Core Skill Building",
    "Reading Strategy & Math Fundamentals",
    "Writing Mastery & Advanced Math",
    "Data Analysis & Inference",
    "Critical Reading & Problem Solving",
    "Test-Taking Strategy & Pacing",
    "Weak Area Intensive",
    "Mixed Timed Practice",
    "Full Mock Test & Deep Review",
    "Final Weak Spot Elimination",
    "Test Week Preparation",
  ];

  for (let w = 0; w < weeks; w++) {
    const isLastWeek = w === weeks - 1;
    const isFirstWeek = w === 0;
    const focus = getFocus(w);
    const theme = isLastWeek ? "Final Mock Test & Review" : (WEEK_THEMES[w] || `Week ${w + 1} Mixed Practice`);
    const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"] as const;

    const LAST_WEEK_TASKS: Record<string, { tasks: string[]; enc: string }> = {
      Monday: {
        tasks: [
          "Full College Board practice test in Bluebook app under real conditions — phone away, timer on, no interruptions",
          "After test: note your estimated section scores and which 3 question types felt hardest",
          "Rest after the test — mental recovery is part of test prep",
        ],
        enc: "This is your dress rehearsal. Treat it exactly like the real thing.",
      },
      Tuesday: {
        tasks: [
          "Deep review of Monday's test — go through every wrong answer one by one with the official explanation",
          "Categorize each error: (1) concept gap = need to relearn, (2) careless = need to slow down, (3) time pressure = need pacing",
          "For concept gaps: do 5 targeted practice questions on that exact skill from Khan Academy",
        ],
        enc: "The review is more valuable than the test itself. This is where real learning happens.",
      },
      Wednesday: {
        tasks: [
          "Light review only — re-read your error journal highlights from the past 2-3 weeks",
          "Do 10 Easy questions in your strongest skill area to build confidence, not stress",
          "Spend 5 minutes on visualization: imagine walking in calm, working through questions steadily, finishing confident",
        ],
        enc: "Protect your energy and confidence. Light review, not heavy drilling.",
      },
      Thursday: {
        tasks: [
          "Final strategy sweep: re-read your sticky notes with key grammar rules, math shortcuts, and pacing benchmarks",
          "Do 15 mixed Easy + Medium questions — verify you've locked in your core skills",
          "Prepare test-day logistics: confirm test center location, set two alarms, pack your ID and permitted supplies",
        ],
        enc: "You've done the work. Today is about trust and logistics.",
      },
      Friday: {
        tasks: [
          "Rest day — no practice today",
          "Light walk, good meal, normal bedtime — sleep is the best performance enhancer you have",
          "Read one encouraging entry from your error journal to remind yourself how much you've improved",
        ],
        enc: "You've prepared. The best thing you can do now is rest and let it set.",
      },
    };

    const MID_WEEK_TASKS: Record<string, { tasks: string[]; focusArea: string; enc: string }> = {
      Monday: {
        tasks: isFirstWeek
          ? [
              "Take the full Khan Academy diagnostic at khanacademy.org/sat — do not skip questions, log every flagged skill",
              "After the diagnostic: write down your top 3 gap areas and their estimated score impact",
              "Set up your error journal (notebook or notes app) — this is your most powerful study tool",
            ]
          : [
              `Khan Academy: study the concept lesson for ${focus} (20 min) — take brief notes on the key rule or pattern`,
              `Do 8 College Board ${focus} questions from the question bank — no timer, focus on accuracy`,
              "Add any wrong answers to your error journal: correct answer + why you missed it",
            ],
        focusArea: isFirstWeek ? "Diagnostic Setup" : focus,
        enc: isFirstWeek
          ? "Every expert started exactly where you are. This diagnostic is your roadmap."
          : "Concept first. Once you understand the rule, the questions become predictable.",
      },
      Tuesday: {
        tasks: isFirstWeek
          ? [
              "Take one College Board mini-section (27 questions, timed) from collegeboard.org/sat/practice",
              "Review every wrong answer — don't move on until you understand exactly why the correct answer is right",
              "Log error types: concept gap, careless mistake, or time pressure",
            ]
          : [
              `Timed drill: 10 ${focus} questions in ${Math.round(profile.dailyStudyMinutes * 0.4)} min — practice real exam pacing`,
              "Review answers: for each wrong one, identify the error type (concept / careless / pacing)",
              `Watch one Khan Academy ${focus} video — focus on their technique, not just the answer`,
            ],
        focusArea: isFirstWeek ? "Timed Diagnostic" : focus,
        enc: isFirstWeek
          ? "The mini practice test shows exactly where your points are hiding."
          : "Timed practice builds the mental stamina you need. Small sessions create big results.",
      },
      Wednesday: {
        tasks: isFirstWeek
          ? [
              "Read Khan Academy's SAT strategy guide for your weakest section (in your Khan Academy dashboard)",
              `Do 15 Easy questions in your weakest domain — no time limit, focus entirely on accuracy`,
              "Review your error journal from Mon-Tue: look for the pattern in your mistakes",
            ]
          : [
              `Error journal review: re-attempt 3-4 questions from last week's wrong answers in ${focus} — can you solve them now?`,
              `Practice: 12 Medium-difficulty ${focus} questions — target 80%+ accuracy`,
              "Identify the ONE rule or concept you miss most frequently — write it on a sticky note to review daily",
            ],
        focusArea: isFirstWeek ? "Error Pattern Analysis" : focus,
        enc: isFirstWeek
          ? "Understanding error patterns is more valuable than doing 100 random questions."
          : "Midweek review. You're building the patterns that save you on test day.",
      },
      Thursday: {
        tasks: isFirstWeek
          ? [
              `Focus on your #1 weak skill: complete one full Khan Academy ${profile.weakAreas[0] || "weak area"} skill module (25-30 min)`,
              `Practice: 10 targeted questions on ${profile.weakAreas[0] || "your weakest area"} from College Board question bank`,
              "Score your practice and note which sub-type of questions you still miss most",
            ]
          : [
              `Mixed drill: 15 questions spanning Easy + Medium ${focus} — simulate the actual exam difficulty mix`,
              "Apply back-solving on math problems: plug answer choices into the equation when choices are specific numbers",
              "Write a 3-sentence summary of what you learned this week in your error journal",
            ],
        focusArea: isFirstWeek ? (profile.weakAreas[0] || "Top Weak Area") : focus,
        enc: isFirstWeek
          ? "One focused skill at a time. Depth beats breadth in SAT prep."
          : "You're in the rhythm now. Thursday practice often shows your biggest weekly improvement.",
      },
      Friday: {
        tasks: isFirstWeek
          ? [
              "Weekly synthesis: review your full error journal from this week — what patterns repeat across all sessions?",
              "Build your priority list: rank your top 5 skills to improve, ordered by score impact",
              "Plan next week: choose specific Khan Academy modules to complete based on your priority list",
            ]
          : [
              "Weekly error journal review: categorize all mistakes from this week by type (concept / careless / pacing)",
              `Spaced repetition: redo 5 questions from your error journal from 7+ days ago — have you truly mastered them?`,
              `Track progress: compare this week's accuracy to last week. Note any skill you've improved — celebrate it.`,
            ],
        focusArea: "Weekly Review",
        enc: isFirstWeek
          ? "A week of honest self-assessment is worth a month of unfocused practice."
          : "Consistency is the #1 predictor of score gains. You've completed another full week — that matters.",
      },
    };

    const dailyTasks = days.map((day) => {
      if (isLastWeek) {
        const d = LAST_WEEK_TASKS[day] || LAST_WEEK_TASKS.Monday;
        return {
          day,
          tasks: d.tasks,
          estimatedMinutes: day === "Friday" ? 20 : profile.dailyStudyMinutes,
          focusArea: "Test Simulation",
          encouragement: d.enc,
        };
      }
      const d = MID_WEEK_TASKS[day];
      return {
        day,
        tasks: d.tasks,
        estimatedMinutes: profile.dailyStudyMinutes,
        focusArea: d.focusArea,
        encouragement: d.enc,
      };
    });

    const improvementPerWeek = isLastWeek
      ? "Consolidation — protect your gains"
      : isFirstWeek
      ? "+10-20 points (establishing diagnostic baseline)"
      : `+${Math.round(((profile.targetScore - profile.currentScore) / weeks) * 0.9)}-${Math.round(((profile.targetScore - profile.currentScore) / weeks) * 1.1)} points`;

    weeklyPlan.push({
      weekNumber: w + 1,
      theme,
      goals: isLastWeek
        ? [
            "Complete at least one full College Board practice test under real exam conditions",
            "Review every wrong answer and categorize: concept gap vs. careless error",
            "Arrive test day rested, confident, and with logistics sorted",
          ]
        : isFirstWeek
        ? [
            "Complete Khan Academy diagnostic and identify your top 3 skill gaps",
            "Set up your error journal and begin recording patterns",
            `Establish baseline accuracy on ${weakAreas[0] || "your weakest area"}`,
          ]
        : [
            (() => {
              const wdInfo = testAnalysis?.weakDomains?.[w % Math.max(1, testAnalysis.weakDomains.length)];
              if (wdInfo?.correctRate) {
                const [correct, total] = wdInfo.correctRate.split("/").map(Number);
                return `Improve ${focus} from ${wdInfo.correctRate} to ${correct + 2}/${total} correct`;
              }
              return `Score 75%+ on Khan Academy ${focus} practice set`;
            })(),
            `Complete ${Math.round((profile.dailyStudyMinutes * 5) / 3)} minutes of deliberate practice this week`,
            "Write and review your error journal every Friday — identify repeating mistake patterns",
          ],
      dailyTasks,
      focusDomains:
        w % 3 === 0
          ? ["math", "reading_and_writing"]
          : w % 3 === 1
          ? ["math"]
          : ["reading_and_writing"],
      expectedImprovement: improvementPerWeek,
    });
  }

  const hasHighAnxiety = profile.anxietyLevel >= 4;
  const hasMedAnxiety = profile.anxietyLevel >= 3;
  const scoreGap = profile.targetScore - profile.currentScore;

  return {
    id: generateId(),
    generatedAt: new Date().toISOString(),
    studentProfile: profile,
    targetScore: profile.targetScore,
    testDate: profile.testDate,
    totalWeeks: weeks,
    weeklyPlan,
    keyStrategies: [
      testAnalysis?.weakDomains?.length
        ? `Your practice test confirms ${testAnalysis.weakDomains[0].domain} is your biggest opportunity — spend 40% of study time here. ${testAnalysis.weakDomains[0].correctRate ? `You scored ${testAnalysis.weakDomains[0].correctRate} — every additional correct answer in this domain is worth real points.` : ""}`
        : `Spend 60-70% of study time on your weakest areas: ${weakAreas.join(", ") || "all sections"}. This is where the biggest score gains hide.`,
      `Use Khan Academy's free personalized SAT prep (khanacademy.org/sat) — it adapts to your exact skill level and uses official College Board question data. The diagnostic alone will identify your exact gaps.`,
      "Keep an error journal religiously: every wrong answer gets written down with (1) the correct answer, (2) WHY you got it wrong, (3) what you'll do differently. This single habit separates students who improve 50 points from those who improve 200.",
      `Take a full College Board practice test (Bluebook app) every 3-4 weeks to measure real progress. Drill accuracy is not the same as test performance. The test environment itself requires practice.`,
      `${profile.dailyStudyMinutes} minutes of focused daily practice beats 3-hour weekend sessions. Spaced repetition and daily consistency are the #1 predictors of SAT score gains — the research is clear on this.`,
    ],
    anxietyTips: hasHighAnxiety
      ? [
          "Before every session: 4-7-8 breathing — inhale for 4 counts, hold for 7, exhale slowly for 8. This activates the parasympathetic nervous system and measurably reduces cortisol before cognitive tasks.",
          "Reframe every wrong answer as data, not failure. The SAT is a learnable skill test — every error you analyze now is a point you'll earn on test day. Progress is not linear, and that is normal.",
          "In early weeks, practice without timers — build accuracy first. Add time pressure only in weeks 3-4 onward. Speed always follows accuracy, never the other way around.",
          "Use FirellySAT Calm Mode before studying. Box breathing before timed practice is clinically shown to reduce test anxiety and improve working memory performance.",
        ]
      : hasMedAnxiety
      ? [
          "Start each session with 2 minutes of slow deep breathing — this actively shifts your brain from stress response to learning mode before you begin.",
          "The SAT is a skill test, not an intelligence test. Every point gained is earned through practice, not talent. Students regularly improve 200+ points with the right methods.",
          "Practice under timed conditions 2-3 times per week starting in week 2. Familiarity with time pressure dramatically reduces test-day surprise.",
          "Celebrate concrete milestones: every completed skill module, every 5-point accuracy improvement, every error journal entry. These are real, measurable progress.",
        ]
      : [
          "Your calm mindset is a competitive advantage. Many students lose points to anxiety, not knowledge gaps. Protect it with a consistent routine.",
          "Simulate real test conditions at least once per week: phone away, timer running, no interruptions. Familiarity with the environment builds natural confidence.",
          "Review errors with analytical curiosity, not frustration. Every wrong answer is a puzzle to solve — the answer is always findable.",
          "Confidence built on evidence — your improving practice scores — is the best test-day mindset. Let your data speak.",
        ],
    dailyRoutine: `Start every session with a 2-minute breathing reset to shift into focus mode. Spend the first ${Math.round(profile.dailyStudyMinutes * 0.15)} minutes reviewing your most recent error journal entries — past mistakes are more valuable to study than new questions. Spend the next ${Math.round(profile.dailyStudyMinutes * 0.6)} minutes on focused practice: Khan Academy module or College Board question bank (not random searches — follow your plan). Use the final ${Math.round(profile.dailyStudyMinutes * 0.25)} minutes to review today's wrong answers, add to your error journal, and write down one thing you did well. End on a positive note — this reinforcement is not sentimental, it's neuroscientific.`,
    motivationalMessage: testAnalysis?.totalScore
      ? `Your practice test shows ${testAnalysis.totalScore}/1600 — with ${testAnalysis.weakDomains?.[0]?.domain || "identified areas"} as your clearest opportunity. Going from ${profile.currentScore} to ${profile.targetScore} (a ${scoreGap}-point gain) is completely achievable with ${profile.dailyStudyMinutes} minutes of focused daily practice. Students who work their error journal and use official resources consistently hit 200+ point gains. You already have your data — that's the hardest step.`
      : `Going from ${profile.currentScore} to ${profile.targetScore} — a ${scoreGap}-point improvement — is completely achievable with ${profile.dailyStudyMinutes} minutes of focused daily practice. Students who use an error journal and official College Board resources consistently hit gains of 200+ points. You've already done the hardest step: making a plan. Every session from here is a deposit toward your goal score.`,
  };
}
