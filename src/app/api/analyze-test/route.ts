import { NextRequest, NextResponse } from "next/server";

const NVIDIA_API_KEY = process.env.NVIDIA_API_KEY;
const NVIDIA_API_BASE = process.env.NVIDIA_API_BASE || "https://integrate.api.nvidia.com/v1";
const NVIDIA_VISION_MODEL = process.env.NVIDIA_VISION_MODEL || "meta/llama-3.2-11b-vision-instruct";

const HF_API_KEY = process.env.HF_API_KEY;
const HF_API_BASE = process.env.HF_API_BASE || "https://router.huggingface.co/hf-inference/v1";
const HF_VISION_MODEL = process.env.HF_VISION_MODEL || "Qwen/Qwen2.5-VL-7B-Instruct";

const VISION_TIMEOUT_MS = 30000;
const MAX_FILE_BYTES = 5 * 1024 * 1024;

function withTimeout(ms: number): AbortController {
  const controller = new AbortController();
  setTimeout(() => controller.abort(), ms);
  return controller;
}

const SYSTEM_PROMPT = `You are an expert SAT score analyst. Your job is to read SAT practice test score reports, answer sheets, or score breakdowns from images and extract structured data.

Digital SAT sections:
- Reading & Writing (RW): 200–800, tests Information & Ideas, Craft & Structure, Expression of Ideas, Standard English Conventions
- Math: 200–800, tests Algebra, Advanced Math, Problem-Solving & Data Analysis, Geometry & Trigonometry
- Total: 400–1600

Return ONLY valid JSON. No markdown, no explanation.`;

const USER_PROMPT = `Analyze this SAT practice test image and extract all visible data.

Return ONLY this JSON:
{
  "totalScore": <number 400-1600, or null>,
  "mathScore": <number 200-800, or null>,
  "readingWritingScore": <number 200-800, or null>,
  "testDate": "<date string, or null>",
  "weakDomains": [
    {
      "domain": "<exact SAT skill/domain name>",
      "score": <scaled score or null>,
      "correctRate": "<e.g. '10/16', or null>",
      "issues": ["<specific observed weakness>"]
    }
  ],
  "strongDomains": ["<domains where student performed well>"],
  "wrongQuestions": [
    {
      "questionType": "<SAT question category>",
      "skill": "<specific skill tested>",
      "likelyError": "<'concept gap' | 'careless' | 'time pressure'>"
    }
  ],
  "timeManagementIssues": <true if evidence of rushing or blank answers, else false>,
  "summary": "<2-3 sentence analysis: biggest weaknesses and top opportunities for improvement>"
}

If the image is not an SAT score report, return: {"error": "Not an SAT score report — please upload a score report or answer sheet screenshot"}`;

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }
    if (file.size > MAX_FILE_BYTES) {
      return NextResponse.json({ error: "File too large — please upload an image under 5 MB" }, { status: 400 });
    }

    const allowed = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif"];
    if (!allowed.includes(file.type)) {
      return NextResponse.json(
        { error: "Unsupported format — please upload a JPG, PNG, or WEBP screenshot" },
        { status: 400 }
      );
    }

    const bytes = await file.arrayBuffer();
    const base64 = Buffer.from(bytes).toString("base64");
    const imageUrl = `data:${file.type};base64,${base64}`;

    const raw = await analyzeImage(imageUrl);
    if (!raw) {
      return NextResponse.json(
        { error: "Vision AI unavailable — please try again or fill in your details manually" },
        { status: 503 }
      );
    }

    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json({ error: "Could not parse analysis — please try a clearer screenshot" }, { status: 500 });
    }

    const parsed = JSON.parse(jsonMatch[0]);
    if (parsed.error) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }
    return NextResponse.json(parsed);
  } catch (error) {
    console.error("analyze-test error:", error);
    return NextResponse.json({ error: "Analysis failed — please try again" }, { status: 500 });
  }
}

async function analyzeImage(imageUrl: string): Promise<string | null> {
  const messages = [
    { role: "system", content: SYSTEM_PROMPT },
    {
      role: "user",
      content: [
        { type: "image_url", image_url: { url: imageUrl } },
        { type: "text", text: USER_PROMPT },
      ],
    },
  ];

  type Entry = { promise: Promise<string | null> };
  const entries: Entry[] = [];

  const addRequest = (url: string, key: string, model: string) => {
    const controller = withTimeout(VISION_TIMEOUT_MS);
    const promise = fetch(url, {
      method: "POST",
      signal: controller.signal,
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model, messages, max_tokens: 1500, temperature: 0.1, stream: false }),
    })
      .then(async (res) => {
        if (!res.ok) return null;
        const data = await res.json();
        return (data.choices?.[0]?.message?.content as string) ?? null;
      })
      .catch(() => null);
    entries.push({ promise });
  };

  if (NVIDIA_API_KEY) addRequest(`${NVIDIA_API_BASE}/chat/completions`, NVIDIA_API_KEY, NVIDIA_VISION_MODEL);
  if (HF_API_KEY) addRequest(`${HF_API_BASE}/chat/completions`, HF_API_KEY, HF_VISION_MODEL);

  if (entries.length === 0) return null;

  return new Promise<string | null>((resolve) => {
    let settled = 0;
    let won = false;
    const total = entries.length;
    for (const { promise } of entries) {
      promise.then((result) => {
        settled++;
        if (!won && result) { won = true; resolve(result); }
        else if (settled === total && !won) resolve(null);
      });
    }
  });
}
