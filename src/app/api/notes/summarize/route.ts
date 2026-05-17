import { NextRequest, NextResponse } from "next/server";

const NVIDIA_API_KEY = process.env.NVIDIA_API_KEY;
const NVIDIA_API_BASE = process.env.NVIDIA_API_BASE || "https://integrate.api.nvidia.com/v1";
const NVIDIA_MODEL = process.env.NVIDIA_CHAT_MODEL || "mistralai/mistral-small-4-119b-2603";

const HF_API_KEY = process.env.HF_API_KEY;
const HF_API_BASE = process.env.HF_API_BASE || "https://router.huggingface.co/hf-inference/v1";
const HF_MODEL = process.env.HF_CHAT_MODEL || "meta-llama/Llama-3.1-8B-Instruct";

const SYSTEM_PROMPT = `You are an expert SAT tutor analyzing a student's study notes. Return ONLY a JSON object (no markdown, no explanation) with this exact structure:

{
  "summary": "2-3 sentences summarizing what was studied and the main ideas",
  "keyPoints": ["key concept or rule 1", "key concept 2", "key concept 3"],
  "studyQuestions": ["A practice question about this content?", "Another question to test understanding?", "A third review question?"],
  "connections": ["related SAT topic 1", "related SAT topic 2"],
  "studyTip": "One specific, actionable tip based on the note content",
  "weaknessHint": "What the notes suggest this student may need more practice on"
}

Rules:
- Be SAT-specific and practical
- keyPoints should be memorable rules or strategies, not summaries
- studyQuestions should be testable, not vague
- Return ONLY the JSON object`;

async function callAI(noteTitle: string, noteContent: string): Promise<string | null> {
  const userMsg = `Note Title: "${noteTitle}"\n\nNote Content:\n${noteContent.slice(0, 3000)}`;
  const messages = [
    { role: "system", content: SYSTEM_PROMPT },
    { role: "user", content: userMsg },
  ];

  if (NVIDIA_API_KEY) {
    try {
      const res = await fetch(`${NVIDIA_API_BASE}/chat/completions`, {
        method: "POST",
        headers: { Authorization: `Bearer ${NVIDIA_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model: NVIDIA_MODEL, messages, max_tokens: 800, temperature: 0.4, stream: false }),
      });
      if (res.ok) {
        const data = await res.json();
        const content = data.choices?.[0]?.message?.content;
        if (content) return content;
      }
    } catch (e) {
      console.error("NVIDIA summarize failed:", e);
    }
  }

  if (HF_API_KEY) {
    try {
      const res = await fetch(`${HF_API_BASE}/chat/completions`, {
        method: "POST",
        headers: { Authorization: `Bearer ${HF_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model: HF_MODEL, messages, max_tokens: 800, temperature: 0.4 }),
      });
      if (res.ok) {
        const data = await res.json();
        const content = data.choices?.[0]?.message?.content;
        if (content) return content;
      }
    } catch (e) {
      console.error("HF summarize failed:", e);
    }
  }

  return null;
}

export async function POST(req: NextRequest) {
  try {
    const { title, content } = await req.json();
    if (!content?.trim()) {
      return NextResponse.json({ error: "No content to summarize" }, { status: 400 });
    }

    const raw = await callAI(title || "Untitled", content);

    if (raw) {
      try {
        const jsonMatch = raw.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          return NextResponse.json({ summary: JSON.parse(jsonMatch[0]) });
        }
      } catch {
        // fallthrough to fallback
      }
    }

    return NextResponse.json({
      summary: {
        summary: `Notes on "${title || "this topic"}" have been reviewed. Keep engaging with these concepts regularly to build retention.`,
        keyPoints: ["Review the core concepts covered", "Practice similar questions", "Connect this material to related SAT skills"],
        studyQuestions: [
          "Can you explain the main idea in your own words?",
          "What common mistakes should you avoid on this topic?",
          "How would you apply this on a timed SAT section?",
        ],
        connections: ["Related SAT concepts", "Cross-domain applications"],
        studyTip: "Review these notes before your next practice session and try to recall the key rules without looking.",
        weaknessHint: "Continue tracking which types of questions take the most time — that's where focused practice pays off most.",
      },
    });
  } catch (error) {
    console.error("Summarize API error:", error);
    return NextResponse.json({ error: "Failed to summarize" }, { status: 500 });
  }
}
