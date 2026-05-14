import OpenAI from "openai";

function fallbackPlan(goal: string) {
  return [
    `Goal: ${goal}`,
    "Week 1-2: Baseline diagnostic + low-stress routines (15 min calm mode + 45 min SAT section practice).",
    "Week 3-5: Alternate math and reading days, review mistakes with an error log, keep one recovery day weekly.",
    "Week 6-7: Timed mixed sets and targeted weak-skill drills using question bank filters.",
    "Week 8: Full-length rehearsals, confidence scripts, and sleep-focused pacing before test day.",
  ].join("\n");
}

export async function POST(request: Request) {
  const { goal = "Improve my SAT score with balanced prep" } =
    (await request.json()) as { goal?: string };

  if (!process.env.OPENAI_API_KEY) {
    return Response.json({ plan: fallbackPlan(goal) });
  }

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const response = await openai.responses.create({
    model: "gpt-4.1-mini",
    input: `Create a concise SAT study plan that reduces anxiety and improves score progression. Student goal: ${goal}`,
  });

  const plan = response.output_text?.trim() || fallbackPlan(goal);

  return Response.json({ plan });
}
