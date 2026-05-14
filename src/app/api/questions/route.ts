import { NextRequest, NextResponse } from "next/server";
import { fetchQuestions, fetchRandomQuestions, fetchSingleQuestion } from "@/lib/sat-api";
import type { QuestionDomain, QuestionDifficulty } from "@/types";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);

  const id = searchParams.get("id");
  if (id) {
    try {
      const question = await fetchSingleQuestion(id);
      if (!question) {
        return NextResponse.json({ error: "Question not found" }, { status: 404 });
      }
      return NextResponse.json(question, {
        headers: { "Cache-Control": "public, s-maxage=3600" },
      });
    } catch {
      return NextResponse.json(
        { error: "Failed to fetch question" },
        { status: 500 }
      );
    }
  }

  const domain = searchParams.get("domain") as QuestionDomain | null;
  const difficulty = searchParams.get("difficulty") as QuestionDifficulty | null;
  const skill = searchParams.get("skill");
  const page = parseInt(searchParams.get("page") || "1");
  const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 50);
  const count = parseInt(searchParams.get("count") || "0");
  const search = searchParams.get("search");

  try {
    if (count > 0) {
      const questions = await fetchRandomQuestions(
        domain || undefined,
        difficulty || undefined,
        count
      );
      return NextResponse.json(
        { questions, total: questions.length },
        { headers: { "Cache-Control": "no-store" } }
      );
    }

    const { questions, total, source } = await fetchQuestions({
      domain: domain || undefined,
      difficulty: difficulty || undefined,
      skill: skill || undefined,
      page,
      limit,
      search: search || undefined,
    });

    return NextResponse.json(
      { questions, total, page, limit, source },
      { headers: { "Cache-Control": "public, s-maxage=1800" } }
    );
  } catch (error) {
    console.error("Questions API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch questions. Please try again." },
      { status: 500 }
    );
  }
}
