import { NextRequest, NextResponse } from "next/server";

const NVIDIA_API_KEY = process.env.NVIDIA_API_KEY;
const NVIDIA_API_BASE = process.env.NVIDIA_API_BASE || "https://integrate.api.nvidia.com/v1";
const NVIDIA_MODEL = process.env.NVIDIA_CHAT_MODEL || "mistralai/mistral-small-4-119b-2603";

const HF_API_KEY = process.env.HF_API_KEY;
const HF_API_BASE = process.env.HF_API_BASE || "https://router.huggingface.co/hf-inference/v1";
const HF_MODEL = process.env.HF_CHAT_MODEL || "meta-llama/Llama-3.1-8B-Instruct";

function buildSystemPrompt(): string {
  return `You are an expert SAT tutor who gives deep, structured explanations. When explaining a question, you MUST return a JSON object (no markdown code blocks, pure JSON) with exactly these keys:

{
  "concept": "The core SAT concept being tested (1-2 sentences)",
  "stepByStep": ["Step 1: ...", "Step 2: ...", "Step 3: ..."],
  "whyCorrect": "Why the correct answer is right — be specific and cite the text or math",
  "whyStudentWasWrong": "A compassionate, non-judgmental explanation of why the student's answer was tempting and what cognitive trap it represents",
  "commonMistake": "The most common mistake students make on this type of question and how to avoid it",
  "memoryTip": "A memorable tip, pattern, or rule of thumb to remember for next time",
  "relatedConcepts": ["concept1", "concept2"]
}

Rules:
- Be specific — cite actual words from the question
- Be concise but thorough — 2-4 sentences per section
- Be encouraging and non-judgmental about wrong answers
- For math: show the actual arithmetic steps
- For reading/writing: quote specific words from the passage
- Never say "the student" — say "you"
- Return ONLY the JSON object, no preamble or explanation`;
}

async function callAI(prompt: string): Promise<string | null> {
  const messages = [
    { role: "system", content: buildSystemPrompt() },
    { role: "user", content: prompt },
  ];

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
          messages,
          max_tokens: 1200,
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
      console.error("NVIDIA explain API failed:", e);
    }
  }

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
          messages,
          max_tokens: 1200,
          temperature: 0.3,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        const content = data.choices?.[0]?.message?.content;
        if (content) return content;
      }
    } catch (e) {
      console.error("HF explain API failed:", e);
    }
  }

  return null;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { stem, answerOptions, correctAnswer, userAnswer, skill, domain, rationale, passage } = body;

    if (!stem || !correctAnswer) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const optionsText = answerOptions
      ? answerOptions.map((o: { id: string; content: string }) => `${o.id.toUpperCase()}: ${o.content}`).join("\n")
      : "";

    const prompt = `
Question Skill: ${skill || "General"}
Domain: ${domain === "math" ? "Math" : "Reading & Writing"}
${passage ? `\nPassage:\n${passage.replace(/<[^>]+>/g, " ").trim()}\n` : ""}
Question:
${stem.replace(/<[^>]+>/g, " ").trim()}
${optionsText ? `\nAnswer Choices:\n${optionsText}` : ""}

Correct Answer: ${Array.isArray(correctAnswer) ? correctAnswer.join(", ") : correctAnswer}
Student's Answer: ${userAnswer || "(unanswered)"}
${rationale ? `\nOfficial Rationale: ${rationale.replace(/<[^>]+>/g, " ").trim()}` : ""}

Provide a deep, structured explanation in the JSON format specified.`.trim();

    const raw = await callAI(prompt);

    if (raw) {
      try {
        // Extract JSON from the response (handle cases where model wraps in markdown)
        const jsonMatch = raw.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          return NextResponse.json({ explanation: parsed });
        }
      } catch {
        // Return raw text if JSON parsing fails
        return NextResponse.json({ explanation: { concept: raw, stepByStep: [], whyCorrect: "", whyStudentWasWrong: "", commonMistake: "", memoryTip: "", relatedConcepts: [] } });
      }
    }

    // Fallback explanation based on domain
    const fallback = domain === "math"
      ? {
          concept: `This question tests your understanding of ${skill || "SAT Math concepts"}.`,
          stepByStep: ["Re-read the question carefully", "Identify what is given and what is asked", "Apply the relevant formula or reasoning", "Check your work"],
          whyCorrect: `The correct answer is ${Array.isArray(correctAnswer) ? correctAnswer[0] : correctAnswer} because it satisfies all conditions in the problem.`,
          whyStudentWasWrong: "A common trap on this type of question is rushing to calculate without fully reading the constraints. Take a moment to re-read the question.",
          commonMistake: "Students often misread what the question is asking — make sure you're solving for the right variable.",
          memoryTip: "Always underline the key question phrase before solving.",
          relatedConcepts: [skill || "Algebra"],
        }
      : {
          concept: `This question tests ${skill || "Reading & Writing"} skills.`,
          stepByStep: ["Read the passage carefully", "Identify the specific claim or structure being tested", "Eliminate answers that contradict the passage", "Choose the answer best supported by the text"],
          whyCorrect: `The correct answer directly aligns with what the passage states.`,
          whyStudentWasWrong: "In reading questions, wrong answers often sound plausible but go slightly beyond what the passage actually says. Always anchor your answer in specific text.",
          commonMistake: "Selecting answers that feel right rather than those directly supported by evidence in the passage.",
          memoryTip: "Every correct R&W answer can be proven with specific words from the passage.",
          relatedConcepts: [skill || "Reading Comprehension"],
        };

    return NextResponse.json({ explanation: fallback });
  } catch (error) {
    console.error("Explain API error:", error);
    return NextResponse.json({ error: "Failed to generate explanation" }, { status: 500 });
  }
}
