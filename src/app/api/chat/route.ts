import { NextRequest, NextResponse } from "next/server";

const NVIDIA_API_KEY = process.env.NVIDIA_API_KEY;
const NVIDIA_API_BASE = process.env.NVIDIA_API_BASE || "https://integrate.api.nvidia.com/v1";
const NVIDIA_MODEL = process.env.NVIDIA_CHAT_MODEL || "mistralai/mistral-small-4-119b-2603";

const HF_API_KEY = process.env.HF_API_KEY;
const HF_API_BASE = process.env.HF_API_BASE || "https://router.huggingface.co/hf-inference/v1";
const HF_MODEL = process.env.HF_CHAT_MODEL || "meta-llama/Llama-3.1-8B-Instruct";

const SYSTEM_PROMPT = `You are FirellySAT's AI study buddy — a warm, knowledgeable, and encouraging SAT tutor.

Your role:
- Help students understand SAT concepts (Math: Algebra, Advanced Math, Data Analysis, Geometry; Reading & Writing: grammar, reading comprehension, expression of ideas)
- Provide test-taking strategies and tips
- Offer emotional support and reduce test anxiety
- Explain why answers are correct or incorrect
- Give specific, actionable advice

Your personality:
- Warm and encouraging, never condescending
- Uses simple, clear language
- Celebrates student effort and progress
- Acknowledges anxiety and responds with empathy first
- Growth mindset focused

Rules:
- Keep responses concise (2-4 paragraphs max)
- Use concrete examples when explaining concepts
- If a student is anxious, acknowledge that FIRST before giving advice
- Never make students feel stupid for asking any question`;

async function callAI(messages: Array<{role: string; content: string}>): Promise<string | null> {
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
          messages: [{ role: "system", content: SYSTEM_PROMPT }, ...messages],
          max_tokens: 600,
          temperature: 0.8,
          stream: false,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        const content = data.choices?.[0]?.message?.content;
        if (content) return content;
      }
    } catch (e) {
      console.error("NVIDIA chat API failed:", e);
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
          messages: [{ role: "system", content: SYSTEM_PROMPT }, ...messages],
          max_tokens: 600,
          temperature: 0.8,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        const content = data.choices?.[0]?.message?.content;
        if (content) return content;
      }
    } catch (e) {
      console.error("HF chat API failed:", e);
    }
  }

  return null;
}

export async function POST(req: NextRequest) {
  try {
    const { messages } = await req.json();

    if (!Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: "Invalid messages" }, { status: 400 });
    }

    const recentMessages = messages.slice(-10);
    const content = await callAI(recentMessages);

    if (content) {
      return NextResponse.json({ content });
    }

    // Fallback static responses
    const lastMessage = recentMessages[recentMessages.length - 1]?.content?.toLowerCase() || "";
    let fallback = "I'm your FirellySAT study buddy! I'm here to help you with SAT prep. Consistent daily practice — even 20 minutes — is the single most effective thing you can do to improve your score.";

    if (lastMessage.includes("anxiety") || lastMessage.includes("nervous") || lastMessage.includes("scared")) {
      fallback = "I hear you, and test anxiety is incredibly common — it doesn't mean you're not capable. The SAT is a learnable skill, not a measure of your intelligence. Try the Calm Mode breathing exercise on FirellySAT — it's specifically designed for test-anxious students. Remember: every practice session builds your confidence.";
    } else if (lastMessage.includes("math")) {
      fallback = "For SAT Math, focus on: Linear equations & systems (~25% of questions), Quadratics, Ratios & percentages, and Data analysis. The key is recognizing question types BEFORE solving. The SAT reuses the same patterns over and over — practice identifying them.";
    } else if (lastMessage.includes("reading") || lastMessage.includes("writing")) {
      fallback = "For SAT R&W, every answer is directly supported by words in the passage — there are no trick questions. Practice underlining evidence for each answer you choose. This makes eliminating wrong answers much easier!";
    }

    return NextResponse.json({ content: fallback });
  } catch (error) {
    console.error("Chat error:", error);
    return NextResponse.json({
      content: "I'm having a moment of trouble connecting. But you're doing great by practicing! Try the breathing exercise on the Calm page if you need a break.",
    }, { status: 200 });
  }
}
