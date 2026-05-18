"use client";

export const dynamic = "force-dynamic";

import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Brain, ChevronRight, Check, X, XCircle, TrendingUp, Target,
  Zap, ArrowRight, RotateCcw, CheckCircle2, AlertCircle,
} from "lucide-react";
import { MathJax, MathJaxContext } from "better-react-mathjax";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import Link from "next/link";
import type { Question, QuestionDomain } from "@/types";

const mathJaxConfig = {
  loader: { load: ["input/tex", "output/chtml"] },
  tex: { inlineMath: [["$", "$"], ["\\(", "\\)"]] },
};

interface DiagResult {
  questionId: string;
  domain: QuestionDomain;
  skill: string;
  isCorrect: boolean;
}

type Stage = "intro" | "loading" | "active" | "results";

const SKILL_GROUPS = {
  Math: ["Algebra", "Advanced Math", "Problem-Solving and Data Analysis", "Geometry and Trigonometry"],
  "Reading & Writing": ["Information and Ideas", "Craft and Structure", "Expression of Ideas", "Standard English Conventions"],
};

export default function DiagnosticPage() {
  const [stage, setStage] = useState<Stage>("intro");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [results, setResults] = useState<DiagResult[]>([]);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sprAnswer, setSprAnswer] = useState("");

  const loadQuestions = useCallback(async () => {
    setStage("loading");
    setError(null);
    try {
      // Fetch 10 Math + 10 R&W questions
      const [mathRes, rwRes] = await Promise.all([
        fetch("/api/questions?count=10&domain=math"),
        fetch("/api/questions?count=10&domain=reading_and_writing"),
      ]);
      const mathData = await mathRes.json();
      const rwData = await rwRes.json();
      const mathQs: Question[] = (mathData.questions ?? []).slice(0, 10);
      const rwQs: Question[] = (rwData.questions ?? []).slice(0, 10);
      const combined = [...mathQs, ...rwQs].slice(0, 20);
      if (combined.length === 0) throw new Error("Could not load questions. Please try again.");
      setQuestions(combined);
      setResults([]);
      setCurrentIndex(0);
      setSelectedAnswer(null);
      setSubmitted(false);
      setSprAnswer("");
      setStage("active");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load questions.");
      setStage("intro");
    }
  }, []);

  const handleSubmit = () => {
    const q = questions[currentIndex];
    if (!q) return;
    const answer = q.questionType === "spr" ? sprAnswer.trim() : (selectedAnswer ?? "");
    const isCorrect = q.correctAnswer.map(a => a.toLowerCase()).includes(answer.toLowerCase());
    setResults(prev => [...prev, { questionId: q.id, domain: q.domain, skill: q.skill, isCorrect }]);
    setSubmitted(true);
  };

  const handleNext = () => {
    if (currentIndex + 1 >= questions.length) {
      setStage("results");
    } else {
      setCurrentIndex(i => i + 1);
      setSelectedAnswer(null);
      setSprAnswer("");
      setSubmitted(false);
    }
  };

  const q = questions[currentIndex];

  // Compute results summary
  const totalCorrect = results.filter(r => r.isCorrect).length;
  const mathResults = results.filter(r => r.domain === "math");
  const rwResults = results.filter(r => r.domain === "reading_and_writing");
  const mathScore = mathResults.filter(r => r.isCorrect).length;
  const rwScore = rwResults.filter(r => r.isCorrect).length;

  const skillAccuracy: Record<string, { correct: number; total: number }> = {};
  for (const r of results) {
    if (!skillAccuracy[r.skill]) skillAccuracy[r.skill] = { correct: 0, total: 0 };
    skillAccuracy[r.skill].total++;
    if (r.isCorrect) skillAccuracy[r.skill].correct++;
  }

  const weakAreas = Object.entries(skillAccuracy)
    .filter(([, v]) => v.total > 0 && v.correct / v.total < 0.6)
    .sort((a, b) => a[1].correct / a[1].total - b[1].correct / b[1].total)
    .slice(0, 4)
    .map(([skill]) => skill);

  const strongAreas = Object.entries(skillAccuracy)
    .filter(([, v]) => v.total > 0 && v.correct / v.total >= 0.8)
    .map(([skill]) => skill);

  const estimatedScore = Math.round(400 + (totalCorrect / Math.max(1, results.length)) * 800);

  const studyPlanParams = new URLSearchParams({
    weakAreas: weakAreas.join(","),
    currentScore: String(estimatedScore),
  });

  // ── INTRO ──
  if (stage === "intro") {
    return (
      <div className="pt-24 pb-16 min-h-screen flex items-center justify-center px-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-xl w-full text-center">
          <div className="inline-flex p-5 rounded-2xl bg-[#F59E0B]/10 border border-[#F59E0B]/20 mb-6">
            <Brain className="w-10 h-10 text-[#F59E0B]" />
          </div>
          <h1 className="text-4xl font-bold text-white mb-4">Diagnostic Test</h1>
          <p className="text-slate-400 mb-6 leading-relaxed">
            Answer 20 real SAT questions — 10 Math, 10 Reading & Writing. We&apos;ll identify your
            strengths, expose your weak spots, and show you exactly where to focus.
          </p>
          <div className="grid grid-cols-3 gap-3 mb-8">
            {[
              { icon: "📝", label: "20 Questions", sub: "~15 min" },
              { icon: "🎯", label: "All Domains", sub: "Math + R&W" },
              { icon: "📊", label: "Instant Report", sub: "Skills breakdown" },
            ].map(({ icon, label, sub }) => (
              <Card key={label}>
                <CardContent className="p-4 text-center">
                  <div className="text-2xl mb-1">{icon}</div>
                  <div className="text-sm font-semibold text-white">{label}</div>
                  <div className="text-xs text-slate-500">{sub}</div>
                </CardContent>
              </Card>
            ))}
          </div>
          {error && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-xl flex items-center gap-2 text-red-400 text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}
          <Button size="xl" className="w-full" onClick={loadQuestions}>
            <Zap className="w-5 h-5" />
            Start Diagnostic
          </Button>
          <p className="text-xs text-slate-600 mt-3">No timer · Real CollegeBoard questions</p>
        </motion.div>
      </div>
    );
  }

  // ── LOADING ──
  if (stage === "loading") {
    return (
      <div className="pt-24 pb-16 min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-2 border-[#F59E0B]/30 border-t-[#F59E0B] rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-400">Loading questions...</p>
        </div>
      </div>
    );
  }

  // ── RESULTS ──
  if (stage === "results") {
    return (
      <div className="pt-24 pb-16 min-h-screen">
        <div className="max-w-2xl mx-auto px-4">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            {/* Score banner */}
            <Card className="mb-6 overflow-hidden">
              <div className="bg-gradient-to-r from-[#F59E0B]/15 to-violet-500/15 p-6 text-center border-b border-white/8">
                <p className="text-sm text-slate-400 mb-1">Estimated SAT Score</p>
                <div className="text-6xl font-bold text-white mb-1">{estimatedScore}</div>
                <p className="text-xs text-slate-500">Based on {results.length} diagnostic questions</p>
              </div>
              <CardContent className="p-5">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-violet-500/10 rounded-xl border border-violet-500/20 text-center">
                    <div className="text-2xl font-bold text-violet-400">{mathScore}/{mathResults.length}</div>
                    <div className="text-xs text-slate-500 mt-1">Math Correct</div>
                    <div className="text-xs text-slate-600">{Math.round((mathScore / Math.max(1, mathResults.length)) * 100)}% accuracy</div>
                  </div>
                  <div className="p-4 bg-[#14B8A6]/10 rounded-xl border border-[#14B8A6]/20 text-center">
                    <div className="text-2xl font-bold text-[#14B8A6]">{rwScore}/{rwResults.length}</div>
                    <div className="text-xs text-slate-500 mt-1">R&W Correct</div>
                    <div className="text-xs text-slate-600">{Math.round((rwScore / Math.max(1, rwResults.length)) * 100)}% accuracy</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Weak areas */}
            {weakAreas.length > 0 && (
              <Card className="mb-4">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-red-400">
                    <AlertCircle className="w-5 h-5" />
                    Focus Areas (Needs Work)
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-2">
                    {weakAreas.map(skill => {
                      const s = skillAccuracy[skill];
                      const acc = s ? Math.round((s.correct / s.total) * 100) : 0;
                      return (
                        <div key={skill} className="flex items-center justify-between p-2.5 bg-red-500/8 rounded-xl border border-red-500/15">
                          <span className="text-sm text-slate-300">{skill}</span>
                          <span className="text-xs font-semibold text-red-400">{acc}%</span>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Strong areas */}
            {strongAreas.length > 0 && (
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-emerald-400">
                    <CheckCircle2 className="w-5 h-5" />
                    Strengths (Keep It Up!)
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex flex-wrap gap-2">
                    {strongAreas.map(skill => (
                      <Badge key={skill} variant="success" className="text-xs">{skill}</Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Question-by-question */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="text-sm">Question Results</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex flex-wrap gap-2">
                  {results.map((r, i) => (
                    <div
                      key={r.questionId}
                      title={`Q${i + 1}: ${r.skill} — ${r.isCorrect ? "Correct" : "Wrong"}`}
                      className={cn(
                        "w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold",
                        r.isCorrect
                          ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                          : "bg-red-500/20 text-red-400 border border-red-500/30"
                      )}
                    >
                      {i + 1}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* CTAs */}
            <div className="space-y-3">
              <Link href={`/study-plan?${studyPlanParams.toString()}`} className="block">
                <Button size="xl" className="w-full">
                  <Target className="w-5 h-5" />
                  Generate Personalized Study Plan
                  <ArrowRight className="w-4 h-4 ml-auto" />
                </Button>
              </Link>
              <div className="grid grid-cols-2 gap-3">
                <Link href="/practice" className="flex items-center justify-center gap-2 py-3 rounded-xl border border-white/10 bg-white/3 hover:bg-white/6 text-sm font-semibold text-slate-300 transition-all">
                  <Zap className="w-4 h-4" />
                  Practice Weak Areas
                </Link>
                <button
                  onClick={() => { setResults([]); loadQuestions(); }}
                  className="flex items-center justify-center gap-2 py-3 rounded-xl border border-white/10 bg-white/3 hover:bg-white/6 text-sm font-semibold text-slate-300 transition-all"
                >
                  <RotateCcw className="w-4 h-4" />
                  Retake Diagnostic
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  // ── ACTIVE ──
  if (!q) return null;

  const isSubmittedNow = submitted;
  const correctAnswer = q.correctAnswer[0];
  const userAnswer = q.questionType === "spr" ? sprAnswer : (selectedAnswer ?? "");
  const isCorrectNow = q.correctAnswer.map(a => a.toLowerCase()).includes(userAnswer.toLowerCase());
  const progressPct = ((currentIndex + (submitted ? 1 : 0)) / questions.length) * 100;

  return (
    <MathJaxContext config={mathJaxConfig}>
      <div className="pt-24 pb-16 min-h-screen">
        <div className="max-w-2xl mx-auto px-4">
          {/* Progress */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold text-white">Diagnostic Test</span>
              <span className="text-sm text-slate-400">{currentIndex + 1} / {questions.length}</span>
            </div>
            <Progress value={progressPct} indicatorClassName="bg-gradient-to-r from-[#F59E0B] to-violet-500" />
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={currentIndex}
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
              transition={{ duration: 0.2 }}
            >
              <Card className="mb-4">
                <CardContent className="p-5">
                  {/* Meta */}
                  <div className="flex flex-wrap gap-2 mb-4">
                    <Badge variant={q.domain === "math" ? "math" : "rw"}>
                      {q.domain === "math" ? "Math" : "Reading & Writing"}
                    </Badge>
                    <Badge variant={q.difficulty === "E" ? "easy" : q.difficulty === "H" ? "hard" : "medium"}>
                      {q.difficulty === "E" ? "Easy" : q.difficulty === "H" ? "Hard" : "Medium"}
                    </Badge>
                    <Badge variant="outline" className="text-slate-500 text-xs">{q.skill}</Badge>
                  </div>

                  {/* Passage */}
                  {q.associatedPassage && (
                    <div className="mb-4 p-4 bg-white/3 rounded-xl border border-white/8">
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Passage</p>
                      <MathJax>
                        <div className="text-sm text-slate-300 leading-relaxed question-content"
                          dangerouslySetInnerHTML={{ __html: q.associatedPassage }} />
                      </MathJax>
                    </div>
                  )}

                  {/* Stem */}
                  <MathJax>
                    <div className="text-base text-slate-100 leading-relaxed question-content mb-5"
                      dangerouslySetInnerHTML={{ __html: q.stem }} />
                  </MathJax>

                  {/* MCQ */}
                  {q.questionType === "mcq" && q.answerOptions && (
                    <div className="space-y-2">
                      {q.answerOptions.map(opt => {
                        const isSelected = selectedAnswer === opt.id;
                        const isCorrectOpt = q.correctAnswer.includes(opt.id);
                        return (
                          <button
                            key={opt.id}
                            onClick={() => !isSubmittedNow && setSelectedAnswer(opt.id)}
                            disabled={isSubmittedNow}
                            className={cn(
                              "w-full text-left p-3.5 rounded-xl border transition-all flex items-start gap-3",
                              !isSubmittedNow && isSelected
                                ? "bg-[#F59E0B]/10 border-[#F59E0B]/50 text-white"
                                : !isSubmittedNow
                                ? "bg-white/3 border-white/8 text-slate-300 hover:bg-white/6 hover:border-white/15"
                                : isCorrectOpt
                                ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-300"
                                : isSelected
                                ? "bg-red-500/15 border-red-500/40 text-red-300"
                                : "bg-white/3 border-white/8 text-slate-500"
                            )}
                          >
                            <span className={cn(
                              "w-6 h-6 rounded-full border flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5",
                              isSubmittedNow && isCorrectOpt ? "bg-emerald-500 border-emerald-500 text-white" :
                              isSubmittedNow && isSelected ? "bg-red-500 border-red-500 text-white" :
                              isSelected ? "bg-[#F59E0B] border-[#F59E0B] text-[#050B18]" :
                              "border-white/20 text-slate-500"
                            )}>
                              {isSubmittedNow && isCorrectOpt ? <Check className="w-3 h-3" /> :
                               isSubmittedNow && isSelected ? <X className="w-3 h-3" /> :
                               opt.id.toUpperCase()}
                            </span>
                            <MathJax>
                              <span className="text-sm leading-relaxed question-content"
                                dangerouslySetInnerHTML={{ __html: opt.content }} />
                            </MathJax>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* SPR */}
                  {q.questionType === "spr" && (
                    <div>
                      <input
                        type="text"
                        placeholder="Enter your answer..."
                        value={sprAnswer}
                        onChange={e => setSprAnswer(e.target.value)}
                        disabled={isSubmittedNow}
                        className={cn(
                          "w-full max-w-xs h-11 px-4 rounded-xl border text-white text-center text-lg font-medium bg-white/5 focus:outline-none focus:ring-2 focus:ring-[#F59E0B]/50",
                          isSubmittedNow
                            ? isCorrectNow ? "border-emerald-500/50 bg-emerald-500/10" : "border-red-500/50 bg-red-500/10"
                            : "border-white/10 focus:border-[#F59E0B]/50"
                        )}
                      />
                      {isSubmittedNow && !isCorrectNow && (
                        <p className="mt-2 text-sm text-slate-400">
                          Correct: <span className="text-emerald-400 font-medium">{q.correctAnswer.join(", ")}</span>
                        </p>
                      )}
                    </div>
                  )}

                  {/* Result feedback */}
                  {isSubmittedNow && (
                    <div className={cn(
                      "mt-4 p-3 rounded-xl border flex items-start gap-2",
                      isCorrectNow ? "bg-emerald-500/10 border-emerald-500/30" : "bg-red-500/10 border-red-500/30"
                    )}>
                      {isCorrectNow
                        ? <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                        : <XCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />}
                      <div>
                        <p className={cn("text-sm font-semibold", isCorrectNow ? "text-emerald-300" : "text-red-300")}>
                          {isCorrectNow ? "Correct!" : "Not quite."}
                        </p>
                        {!isCorrectNow && (
                          <p className="text-xs text-slate-400 mt-0.5">
                            Answer: <span className="text-emerald-400">{correctAnswer}</span>
                          </p>
                        )}
                        {q.rationale && (
                          <p className="text-xs text-slate-500 mt-1 leading-relaxed">{q.rationale.replace(/<[^>]*>/g, "").slice(0, 200)}{q.rationale.length > 200 ? "…" : ""}</p>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Action buttons */}
              {!isSubmittedNow ? (
                <Button
                  size="xl"
                  className="w-full"
                  onClick={handleSubmit}
                  disabled={q.questionType === "mcq" ? !selectedAnswer : !sprAnswer.trim()}
                >
                  Submit Answer
                </Button>
              ) : (
                <Button size="xl" className="w-full" onClick={handleNext}>
                  {currentIndex + 1 < questions.length ? (
                    <>Next Question <ChevronRight className="w-4 h-4" /></>
                  ) : (
                    <>View Results <TrendingUp className="w-4 h-4" /></>
                  )}
                </Button>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </MathJaxContext>
  );
}
