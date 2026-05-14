import { NextRequest, NextResponse } from "next/server";

const HF_API_KEY = process.env.HF_API_KEY;
const HF_API_BASE = process.env.HF_API_BASE || "https://router.huggingface.co/hf-inference/v1";
const CHAT_MODEL = process.env.HF_CHAT_MODEL || "meta-llama/Llama-3.1-8B-Instruct";

const SYSTEM_PROMPT = `You are FirellySAT's AI study buddy — a warm, knowledgeable, and encouraging SAT tutor.

Your role:
- Help students understand SAT concepts (Math, Reading, Writing)
- Provide test-taking strategies and tips
- Offer emotional support and reduce test anxiety
- Explain why answers are correct or incorrect
- Give specific, actionable advice

Your personality:
- Warm and encouraging, never condescending
- Uses simple, clear language
- Celebrates student effort and progress
- Acknowledges anxiety and responds with empathy
- Growth mindset focused

Important:
- Keep responses concise (2-4 paragraphs max)
- Use concrete examples when explaining concepts
- If a student is anxious, acknowledge that first before giving advice
- Never make students feel stupid for asking any question
- All questions are sourced from the College Board's official SAT question bank`;

export async function POST(req: NextRequest) {
  try {
    const { messages } = await req.json();

    if (!Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: "Invalid messages" }, { status: 400 });
    }

    // Trim to last 10 messages to manage context
    const recentMessages = messages.slice(-10);

    if (!HF_API_KEY) {
      // Fallback responses when no API key
      const lastMessage = recentMessages[recentMessages.length - 1]?.content?.toLowerCase() || "";
      let fallback =
        "I'm your FirellySAT study buddy! I'm here to help you with SAT prep. While I'm having trouble connecting to my AI brain right now, I can tell you this: consistent daily practice is the single most effective thing you can do to improve your SAT score. Even 20 minutes a day adds up to massive improvement over weeks!";

      if (lastMessage.includes("anxiety") || lastMessage.includes("nervous") || lastMessage.includes("scared") || lastMessage.includes("fear")) {
        fallback = "I hear you, and I want you to know — test anxiety is incredibly common, and it doesn't mean you're not capable. The SAT is a learnable skill, not a measure of your intelligence. Start by trying the Calm Mode feature on FirellySAT — it includes a breathing exercise specifically designed to reduce test anxiety. Remember: every practice session you complete is building your confidence. You're doing great just by showing up.";
      } else if (lastMessage.includes("math")) {
        fallback = "For SAT Math, focus on these high-yield areas: Linear equations and systems (about 25% of questions), Quadratics and polynomials, Ratios and percentages, and Data analysis. The key is recognizing question patterns — the SAT reuses the same types over and over. Practice identifying what type of question it is BEFORE solving it. This alone can boost your math score significantly!";
      } else if (lastMessage.includes("reading") || lastMessage.includes("writing")) {
        fallback = "For SAT Reading & Writing, the key is always to go back to the text. Every answer is directly supported by specific words in the passage — there are no 'trick' questions, just questions where students make assumptions instead of reading carefully. Practice the habit of underlining evidence for each answer you choose. This makes eliminating wrong answers much easier!";
      }

      return NextResponse.json({ content: fallback });
    }

    const response = await fetch(`${HF_API_BASE}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${HF_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: CHAT_MODEL,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          ...recentMessages,
        ],
        max_tokens: 600,
        temperature: 0.8,
      }),
    });

    if (!response.ok) {
      throw new Error(`HF API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("Empty response from AI");
    }

    return NextResponse.json({ content });
  } catch (error) {
    console.error("Chat error:", error);
    return NextResponse.json(
      {
        content:
          "I'm having a bit of trouble connecting right now. But remember — you're doing great by practicing! Try the breathing exercise on the Calm page if you need a moment.",
      },
      { status: 200 } // Return 200 with fallback content instead of error
    );
  }
}
