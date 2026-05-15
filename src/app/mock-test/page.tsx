"use client";

export const dynamic = "force-dynamic";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Flag, BookOpen, Calculator, ArrowLeft, ArrowRight,
  Check, X, Timer, Clock, Grid3x3, ChevronDown, ChevronUp,
  Lightbulb, RefreshCw, TrendingUp, AlertTriangle, Maximize2,
  Minimize2, Shield
} from "lucide-react";
import { MathJax, MathJaxContext } from "better-react-mathjax";
import { cn, formatTime, generateId } from "@/lib/utils";
import {
  addLogbookEntry, recordSessionComplete,
  saveMockAttempt, getMockUsedQuestionIds, addMockUsedQuestionIds,
  getMockAttempts,
} from "@/lib/storage";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ReferenceSheet } from "@/components/practice/reference-sheet";
import { DesmosPanel } from "@/components/practice/desmos-panel";
import type { Question, QuestionDomain, SessionAnswer, MockTestAttempt } from "@/types";

const mathJaxConfig = {
  loader: { load: ["input/tex", "output/chtml"] },
  tex: { inlineMath: [["$", "$"], ["\\(", "\\)"]] },
};

interface ModuleConfig {
  id: number;
  label: string;
  domain: QuestionDomain;
  questionCount: number;
  timeSeconds: number;
  allowCalculator: boolean;
}

const MODULES: ModuleConfig[] = [
  { id: 0, label: "Reading & Writing — Module 1", domain: "reading_and_writing", questionCount: 27, timeSeconds: 1920, allowCalculator: false },
  { id: 1, label: "Reading & Writing — Module 2", domain: "reading_and_writing", questionCount: 27, timeSeconds: 1920, allowCalculator: false },
  { id: 2, label: "Math — Module 1", domain: "math", questionCount: 22, timeSeconds: 2100, allowCalculator: true },
  { id: 3, label: "Math — Module 2", domain: "math", questionCount: 22, timeSeconds: 2100, allowCalculator: true },
];

const BREAK_AFTER: Record<number, number> = { 0: 600, 1: 300, 2: 300 };

type Phase = "setup" | "loading" | "active" | "break" | "module_review" | "results";

interface ModuleState {
  questions: Question[];
  answers: Map<number, string>;
  flagged: Set<number>;
  submitted: boolean;
  timeUsed: number;
}

function scaleScore(rawCorrect: number, maxRaw: number): number {
  const pct = rawCorrect / maxRaw;
  const scaled = Math.round(200 + pct * 600);
  if (pct < 0.4) return Math.max(200, scaled - 20);
  if (pct > 0.85) return Math.min(800, scaled + 20);
  return scaled;
}

export default function MockTestPage() {
  const [phase, setPhase] = useState<Phase>("setup");
  const [currentModuleIdx, setCurrentModuleIdx] = useState(0);
  const [currentQIdx, setCurrentQIdx] = useState(0);
  const [modules, setModules] = useState<ModuleState[]>([]);
  const [timeLeft, setTimeLeft] = useState(0);
  const [breakTimeLeft, setBreakTimeLeft] = useState(0);
  const [showReference, setShowReference] = useState(false);
  const [showDesmos, setShowDesmos] = useState(false);
  const [showNavigator, setShowNavigator] = useState(false);
  const [showRationale, setShowRationale] = useState(false);
  const [localAnswer, setLocalAnswer] = useState("");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [fullscreenWarning, setFullscreenWarning] = useState(false);
  const [mockAttemptId] = useState(() => generateId());
  const [testStartTime] = useState(() => new Date().toISOString());
  const [pastAttempts, setPastAttempts] = useState<MockTestAttempt[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const currentModule = modules[currentModuleIdx];
  const currentConfig = MODULES[currentModuleIdx];
  const currentQuestion = currentModule?.questions[currentQIdx];

  useEffect(() => {
    setPastAttempts(getMockAttempts());
  }, []);

  // Fullscreen change listener
  useEffect(() => {
    const handleFsChange = () => {
      const fs = !!document.fullscreenElement;
      setIsFullscreen(fs);
      if (!fs && phase === "active") {
        setFullscreenWarning(true);
        setTimeout(() => setFullscreenWarning(false), 8000);
      }
    };
    document.addEventListener("fullscreenchange", handleFsChange);
    return () => document.removeEventListener("fullscreenchange", handleFsChange);
  }, [phase]);

  const requestFullscreen = useCallback(() => {
    document.documentElement.requestFullscreen?.().then(() => {
      setIsFullscreen(true);
    }).catch(() => {});
  }, []);

  // Save results when test completes
  useEffect(() => {
    if (phase !== "results" || modules.length === 0) return;

    const allIds = modules.flatMap(m => m.questions.map(q => q.id));
    addMockUsedQuestionIds(allIds);

    const attempts = getMockAttempts();
    const attemptNumber = attempts.length + 1;

    const rwModules = modules.slice(0, 2);
    const mathModules = modules.slice(2, 4);
    const rwCorrect = rwModules.reduce((sum, m) => sum + m.questions.filter((q, i) => q.correctAnswer.includes(m.answers.get(i) || "")).length, 0);
    const mathCorrect = mathModules.reduce((sum, m) => sum + m.questions.filter((q, i) => q.correctAnswer.includes(m.answers.get(i) || "")).length, 0);
    const rwScaled = scaleScore(rwCorrect, 54);
    const mathScaled = scaleScore(mathCorrect, 44);

    const attempt: MockTestAttempt = {
      id: mockAttemptId,
      attemptNumber,
      startedAt: testStartTime,
      completedAt: new Date().toISOString(),
      totalScore: rwScaled + mathScaled,
      rwScore: rwScaled,
      mathScore: mathScaled,
      rwCorrect,
      mathCorrect,
      rwTotal: 54,
      mathTotal: 44,
      durationSeconds: modules.reduce((sum, m) => sum + m.timeUsed, 0),
    };

    saveMockAttempt(attempt);
    setPastAttempts(getMockAttempts());

    // Exit fullscreen
    if (document.fullscreenElement) {
      document.exitFullscreen?.().catch(() => {});
    }
  }, [phase]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadQuestions = async () => {
    setPhase("loading");
    try {
      const usedIds = getMockUsedQuestionIds();

      // Fetch extra to account for deduplication
      const [rwQs, mathQs] = await Promise.all([
        fetch("/api/questions?domain=reading_and_writing&count=80").then(r => r.json()),
        fetch("/api/questions?domain=math&count=60").then(r => r.json()),
      ]);

      let rwList: Question[] = (rwQs.questions || []).filter((q: Question) => !usedIds.includes(q.id));
      let mathList: Question[] = (mathQs.questions || []).filter((q: Question) => !usedIds.includes(q.id));

      // Pad with any available if not enough
      if (rwList.length < 54) {
        const extra = (rwQs.questions || []).filter((q: Question) => !rwList.find((r: Question) => r.id === q.id));
        rwList = [...rwList, ...extra];
      }
      if (mathList.length < 44) {
        const extra = (mathQs.questions || []).filter((q: Question) => !mathList.find((r: Question) => r.id === q.id));
        mathList = [...mathList, ...extra];
      }

      // Shuffle
      const shuffle = <T,>(arr: T[]): T[] => [...arr].sort(() => Math.random() - 0.5);
      rwList = shuffle(rwList);
      mathList = shuffle(mathList);

      const padTo = (arr: Question[], n: number): Question[] => {
        if (arr.length >= n) return arr.slice(0, n);
        const padded = [...arr];
        while (padded.length < n) padded.push(...arr);
        return padded.slice(0, n);
      };

      const rw54 = padTo(rwList, 54);
      const math44 = padTo(mathList, 44);

      const initialModules: ModuleState[] = MODULES.map((m, i) => ({
        questions:
          m.domain === "reading_and_writing"
            ? i === 0 ? rw54.slice(0, 27) : rw54.slice(27, 54)
            : i === 2 ? math44.slice(0, 22) : math44.slice(22, 44),
        answers: new Map(),
        flagged: new Set(),
        submitted: false,
        timeUsed: 0,
      }));

      setModules(initialModules);
      setTimeLeft(MODULES[0].timeSeconds);
      setCurrentModuleIdx(0);
      setCurrentQIdx(0);
      setPhase("active");

      // Enter fullscreen
      requestFullscreen();
    } catch (e) {
      console.error("Failed to load mock test questions", e);
      setPhase("setup");
    }
  };

  // Countdown timer
  useEffect(() => {
    if (phase === "active") {
      timerRef.current = setInterval(() => {
        setTimeLeft(t => {
          if (t <= 1) {
            clearInterval(timerRef.current!);
            handleModuleTimeUp();
            return 0;
          }
          return t - 1;
        });
      }, 1000);
    } else if (phase === "break") {
      timerRef.current = setInterval(() => {
        setBreakTimeLeft(t => {
          if (t <= 1) {
            clearInterval(timerRef.current!);
            startNextModule();
            return 0;
          }
          return t - 1;
        });
      }, 1000);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [phase, currentModuleIdx]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleModuleTimeUp = useCallback(() => {
    submitCurrentModule(true);
  }, [currentModuleIdx, modules, timeLeft]); // eslint-disable-line react-hooks/exhaustive-deps

  const submitCurrentModule = useCallback((timeUp = false) => {
    if (!currentModule) return;
    const used = currentConfig.timeSeconds - timeLeft;
    setModules(prev => {
      const next = [...prev];
      next[currentModuleIdx] = { ...next[currentModuleIdx], submitted: true, timeUsed: used };
      return next;
    });

    currentModule.questions.forEach((q, i) => {
      const ua = currentModule.answers.get(i) || "";
      const correct = q.correctAnswer.includes(ua);
      if (!correct && ua) {
        addLogbookEntry({
          timestamp: new Date().toISOString(),
          questionId: q.id,
          stem: q.stem,
          domain: q.domain,
          skill: q.skill,
          difficulty: q.difficulty,
          userAnswer: ua,
          correctAnswer: q.correctAnswer,
          rationale: q.rationale,
          source: "mock_test",
          mockAttemptId,
        });
      }
    });

    if (currentModuleIdx >= MODULES.length - 1) {
      setPhase("results");
    } else {
      const breakDur = BREAK_AFTER[currentModuleIdx] ?? 300;
      setBreakTimeLeft(breakDur);
      setPhase("break");
    }
  }, [currentModule, currentConfig, currentModuleIdx, timeLeft, mockAttemptId]);

  const startNextModule = useCallback(() => {
    const next = currentModuleIdx + 1;
    if (next >= MODULES.length) { setPhase("results"); return; }
    setCurrentModuleIdx(next);
    setCurrentQIdx(0);
    setTimeLeft(MODULES[next].timeSeconds);
    setLocalAnswer("");
    setShowRationale(false);
    setPhase("active");
  }, [currentModuleIdx]);

  const handleAnswer = (ans: string) => {
    setLocalAnswer(ans);
    setModules(prev => {
      const next = [...prev];
      next[currentModuleIdx].answers = new Map(next[currentModuleIdx].answers).set(currentQIdx, ans);
      return next;
    });
  };

  const handleFlag = () => {
    setModules(prev => {
      const next = [...prev];
      const flagged = new Set(next[currentModuleIdx].flagged);
      if (flagged.has(currentQIdx)) flagged.delete(currentQIdx);
      else flagged.add(currentQIdx);
      next[currentModuleIdx] = { ...next[currentModuleIdx], flagged };
      return next;
    });
  };

  const goToQuestion = (idx: number) => {
    setCurrentQIdx(idx);
    setLocalAnswer(currentModule?.answers.get(idx) || "");
    setShowRationale(false);
    setShowNavigator(false);
  };

  const handleNext = () => {
    if (currentQIdx < (currentModule?.questions.length ?? 0) - 1) {
      setCurrentQIdx(i => i + 1);
      setLocalAnswer(currentModule?.answers.get(currentQIdx + 1) || "");
      setShowRationale(false);
    } else {
      setPhase("module_review");
    }
  };

  const handlePrev = () => {
    if (currentQIdx > 0) {
      setCurrentQIdx(i => i - 1);
      setLocalAnswer(currentModule?.answers.get(currentQIdx - 1) || "");
      setShowRationale(false);
    }
  };

  const timerColor = timeLeft > 300 ? "text-white" : timeLeft > 60 ? "text-amber-400" : "text-red-400";

  // ─── SETUP ────────────────────────────────────────────────────────────────
  if (phase === "setup" || phase === "loading") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#050B18] to-[#050F1E] pt-24 pb-16">
        <div className="max-w-2xl mx-auto px-4">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-10">
            <div className="inline-flex p-4 rounded-2xl bg-white/5 border border-white/10 mb-4">
              <span className="text-3xl">📝</span>
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">Full SAT Mock Test</h1>
            <p className="text-slate-400">Bluebook format · 4 modules · ~2 hours 14 minutes</p>
          </motion.div>

          {/* Past attempts */}
          {pastAttempts.length > 0 && (
            <Card className="mb-4">
              <CardHeader><CardTitle className="text-sm">Your Mock Test History</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {pastAttempts.slice(0, 3).map((a) => (
                  <div key={a.id} className="flex items-center justify-between p-2.5 bg-white/3 rounded-xl border border-white/8">
                    <div>
                      <span className="text-sm text-white font-semibold">Test #{a.attemptNumber}</span>
                      <span className="text-xs text-slate-500 ml-2">{new Date(a.completedAt).toLocaleDateString()}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-[#14B8A6]">R&amp;W: {a.rwScore}</span>
                      <span className="text-xs text-violet-400">Math: {a.mathScore}</span>
                      <span className="text-sm font-bold text-[#F59E0B]">{a.totalScore}</span>
                    </div>
                  </div>
                ))}
                <a href="/mock-history" className="block text-center text-xs text-slate-500 hover:text-[#F59E0B] transition-colors pt-1">View all attempts →</a>
              </CardContent>
            </Card>
          )}

          <Card className="mb-6">
            <CardHeader><CardTitle>Test Structure</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {MODULES.map((m, i) => (
                <div key={m.id} className="flex items-center justify-between p-3 bg-white/3 rounded-xl border border-white/8">
                  <div className="flex items-center gap-3">
                    <div className={cn("w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold", m.domain === "math" ? "bg-violet-500/20 text-violet-400" : "bg-teal-500/20 text-teal-400")}>{i + 1}</div>
                    <div>
                      <div className="text-sm font-medium text-white">{m.label}</div>
                      <div className="text-xs text-slate-500">{m.questionCount} questions · {m.timeSeconds / 60} minutes</div>
                    </div>
                  </div>
                  <div className="flex gap-1.5">
                    {m.allowCalculator && <Badge variant="secondary" className="text-xs gap-1"><Calculator className="w-3 h-3" />Calc</Badge>}
                    {i < MODULES.length - 1 && <Badge variant="secondary" className="text-xs">{BREAK_AFTER[i] / 60}m break</Badge>}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <div className="grid grid-cols-2 gap-3 mb-6">
            {[
              { icon: "📐", label: "Reference Sheet", desc: "Math formulas always available" },
              { icon: "🔢", label: "Desmos Calculator", desc: "On Math modules" },
              { icon: "📖", label: "Auto Logbook", desc: "Wrong answers saved per test" },
              { icon: "🖥️", label: "Proctor Mode", desc: "Fullscreen like real test day" },
            ].map(({ icon, label, desc }) => (
              <div key={label} className="p-3 bg-white/3 rounded-xl border border-white/8 text-center">
                <div className="text-2xl mb-1">{icon}</div>
                <div className="text-xs font-semibold text-white">{label}</div>
                <div className="text-xs text-slate-500 mt-0.5">{desc}</div>
              </div>
            ))}
          </div>

          <Button size="xl" className="w-full" onClick={loadQuestions} loading={phase === "loading"} disabled={phase === "loading"}>
            {phase === "loading" ? "Loading questions…" : "Begin Mock Test"}
          </Button>

          <div className="flex items-start gap-2 mt-4 p-3 bg-white/3 rounded-xl border border-white/8">
            <Shield className="w-4 h-4 text-[#14B8A6] flex-shrink-0 mt-0.5" />
            <p className="text-xs text-slate-500">
              Find a quiet spot, set aside ~2h 15min, and treat this like the real thing. The test will enter fullscreen mode. Previously seen questions will be excluded when possible.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ─── BREAK ────────────────────────────────────────────────────────────────
  if (phase === "break") {
    const nextConfig = MODULES[currentModuleIdx + 1];
    return (
      <div className="min-h-screen bg-[#050B18] flex items-center justify-center px-4">
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="max-w-md w-full text-center">
          <div className="w-20 h-20 rounded-full bg-[#14B8A6]/10 border border-[#14B8A6]/20 flex items-center justify-center mx-auto mb-6">
            <span className="text-3xl">☕</span>
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Break Time</h2>
          <p className="text-slate-400 mb-6">Module {currentModuleIdx + 1} complete. Take a breath.</p>
          <div className="text-5xl font-mono font-bold text-[#14B8A6] mb-6">{formatTime(breakTimeLeft)}</div>
          <div className="p-4 bg-white/5 rounded-xl border border-white/10 mb-6 text-left">
            <div className="text-sm font-semibold text-white mb-1">Next: {nextConfig?.label}</div>
            <div className="text-xs text-slate-400">{nextConfig?.questionCount} questions · {nextConfig && nextConfig.timeSeconds / 60} min{nextConfig?.allowCalculator ? " · Calculator allowed" : ""}</div>
          </div>
          <Button size="lg" className="w-full" onClick={() => { requestFullscreen(); startNextModule(); }}>Continue to Next Module</Button>
          <p className="text-xs text-slate-600 mt-2">Timer continues automatically</p>
        </motion.div>
      </div>
    );
  }

  // ─── MODULE REVIEW ────────────────────────────────────────────────────────
  if (phase === "module_review") {
    const answered = currentModule?.answers.size ?? 0;
    const total = currentConfig?.questionCount ?? 0;
    const unanswered = total - answered;
    const flaggedCount = currentModule?.flagged.size ?? 0;
    return (
      <div className="min-h-screen bg-[#050B18] flex items-center justify-center px-4">
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="max-w-lg w-full">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-white mb-1">Review Before Submitting</h2>
            <p className="text-slate-400">{currentConfig?.label}</p>
          </div>
          <Card className="mb-6">
            <CardContent className="p-5 space-y-3">
              <div className="flex justify-between items-center"><span className="text-slate-400">Answered</span><span className="font-semibold text-emerald-400">{answered} / {total}</span></div>
              {unanswered > 0 && <div className="flex justify-between items-center"><span className="text-slate-400">Unanswered</span><span className="font-semibold text-amber-400">{unanswered}</span></div>}
              {flaggedCount > 0 && <div className="flex justify-between items-center"><span className="text-slate-400">Flagged for review</span><span className="font-semibold text-orange-400">{flaggedCount}</span></div>}
              <div className="flex justify-between items-center"><span className="text-slate-400">Time remaining</span><span className={cn("font-mono font-semibold", timerColor)}>{formatTime(timeLeft)}</span></div>
            </CardContent>
          </Card>
          <div className="flex flex-wrap gap-1.5 mb-6">
            {currentModule?.questions.map((_, i) => {
              const isAns = currentModule.answers.has(i);
              const isMrk = currentModule.flagged.has(i);
              return (
                <button key={i} onClick={() => { setCurrentQIdx(i); setLocalAnswer(currentModule.answers.get(i) || ""); setPhase("active"); }}
                  className={cn("w-8 h-8 rounded text-xs font-semibold transition-all", isMrk ? "bg-orange-500/15 text-orange-400 border border-orange-400/40" : isAns ? "bg-white/12 text-white border border-white/20" : "bg-red-500/10 text-red-400 border border-red-500/30")}>{i + 1}</button>
              );
            })}
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => setPhase("active")} className="flex-1"><ArrowLeft className="w-4 h-4" />Back to Module</Button>
            <Button onClick={() => submitCurrentModule()} className="flex-1">Submit Module<ArrowRight className="w-4 h-4" /></Button>
          </div>
        </motion.div>
      </div>
    );
  }

  // ─── RESULTS ──────────────────────────────────────────────────────────────
  if (phase === "results") {
    const rwModules = modules.slice(0, 2);
    const mathModules = modules.slice(2, 4);

    const rwCorrect = rwModules.reduce((sum, m) => sum + m.questions.filter((q, i) => q.correctAnswer.includes(m.answers.get(i) || "")).length, 0);
    const mathCorrect = mathModules.reduce((sum, m) => sum + m.questions.filter((q, i) => q.correctAnswer.includes(m.answers.get(i) || "")).length, 0);
    const rwTotal = 54;
    const mathTotal = 44;

    const rwScaled = scaleScore(rwCorrect, rwTotal);
    const mathScaled = scaleScore(mathCorrect, mathTotal);
    const totalScore = rwScaled + mathScaled;

    const skillMap: Record<string, { correct: number; total: number }> = {};
    modules.forEach(m => {
      m.questions.forEach((q, i) => {
        if (!skillMap[q.skill]) skillMap[q.skill] = { correct: 0, total: 0 };
        skillMap[q.skill].total += 1;
        if (q.correctAnswer.includes(m.answers.get(i) || "")) skillMap[q.skill].correct += 1;
      });
    });

    const prevBest = pastAttempts.length > 1 ? Math.max(...pastAttempts.slice(1).map(a => a.totalScore)) : null;
    const improvement = prevBest ? totalScore - prevBest : null;

    return (
      <div className="min-h-screen bg-[#050B18] pt-20 pb-16">
        <div className="max-w-2xl mx-auto px-4">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-8">
            <div className="w-20 h-20 rounded-full bg-[#F59E0B]/10 border border-[#F59E0B]/20 flex items-center justify-center mx-auto mb-4">
              <TrendingUp className="w-10 h-10 text-[#F59E0B]" />
            </div>
            <h1 className="text-3xl font-bold text-white mb-1">Mock Test Complete!</h1>
            <p className="text-slate-400">
              {improvement !== null && improvement > 0 ? `+${improvement} points from your previous best!` : "Your estimated score breakdown:"}
            </p>
          </motion.div>

          <Card variant="glow" className="mb-6">
            <CardContent className="p-8 text-center">
              <div className="text-6xl font-bold gradient-text mb-2">{totalScore}</div>
              <div className="text-slate-400 text-sm mb-6">Estimated Total SAT Score</div>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-teal-500/10 rounded-xl border border-teal-500/20">
                  <div className="text-2xl font-bold text-[#14B8A6]">{rwScaled}</div>
                  <div className="text-xs text-slate-500 mt-1">Reading &amp; Writing</div>
                  <div className="text-xs text-slate-600">{rwCorrect}/{rwTotal} correct</div>
                </div>
                <div className="p-4 bg-violet-500/10 rounded-xl border border-violet-500/20">
                  <div className="text-2xl font-bold text-violet-400">{mathScaled}</div>
                  <div className="text-xs text-slate-500 mt-1">Math</div>
                  <div className="text-xs text-slate-600">{mathCorrect}/{mathTotal} correct</div>
                </div>
              </div>
              {improvement !== null && (
                <div className={cn("mt-4 text-sm font-semibold", improvement >= 0 ? "text-emerald-400" : "text-red-400")}>
                  {improvement >= 0 ? `↑ +${improvement}` : `↓ ${improvement}`} vs previous attempt
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="mb-6">
            <CardHeader><CardTitle>Module Breakdown</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {modules.map((m, idx) => {
                const cfg = MODULES[idx];
                const correct = m.questions.filter((q, i) => q.correctAnswer.includes(m.answers.get(i) || "")).length;
                const total = m.questions.length;
                const pct = Math.round((correct / total) * 100);
                return (
                  <div key={idx}>
                    <div className="flex justify-between items-center mb-1.5">
                      <span className="text-sm text-slate-300 truncate">{cfg.label}</span>
                      <span className="text-sm font-semibold text-white ml-2">{correct}/{total} ({pct}%)</span>
                    </div>
                    <Progress value={pct} indicatorClassName={cfg.domain === "math" ? "bg-gradient-to-r from-violet-500 to-violet-400" : "bg-gradient-to-r from-teal-500 to-teal-400"} />
                  </div>
                );
              })}
            </CardContent>
          </Card>

          <Card className="mb-6">
            <CardHeader><CardTitle>Performance by Skill</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-2">
                {Object.entries(skillMap).sort((a, b) => (a[1].correct / a[1].total) - (b[1].correct / b[1].total)).map(([skill, { correct, total }]) => {
                  const pct = Math.round((correct / total) * 100);
                  return (
                    <div key={skill} className="flex items-center gap-3">
                      <span className="text-xs text-slate-400 w-48 truncate flex-shrink-0">{skill}</span>
                      <div className="flex-1 h-1.5 bg-white/8 rounded-full overflow-hidden">
                        <div className={cn("h-full rounded-full", pct >= 80 ? "bg-emerald-500" : pct >= 60 ? "bg-amber-500" : "bg-red-500")} style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-xs text-slate-500 w-12 text-right">{correct}/{total}</span>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-2 gap-3">
            <Button onClick={() => { setPhase("setup"); setModules([]); }} variant="secondary"><RefreshCw className="w-4 h-4" />New Test</Button>
            <a href="/notes" className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-[#F59E0B] text-[#050B18] hover:bg-[#FBBF24] transition-all">View Logbook</a>
          </div>
          <a href="/mock-history" className="block text-center text-xs text-slate-500 hover:text-[#F59E0B] transition-colors mt-4">View all past mock tests →</a>
        </div>
      </div>
    );
  }

  // ─── ACTIVE MODULE ────────────────────────────────────────────────────────
  if (!currentQuestion) return null;

  const isFlagged = currentModule?.flagged.has(currentQIdx) ?? false;
  const userAnswer = currentModule?.answers.get(currentQIdx) ?? "";
  const qProgress = ((currentQIdx + 1) / (currentConfig?.questionCount ?? 1)) * 100;

  return (
    <MathJaxContext config={mathJaxConfig}>
      <div className="fixed inset-0 z-[100] flex flex-col bg-[#050B18]">
        <ReferenceSheet open={showReference} onClose={() => setShowReference(false)} />
        <DesmosPanel open={showDesmos} onClose={() => setShowDesmos(false)} />

        {/* Fullscreen warning */}
        <AnimatePresence>
          {fullscreenWarning && (
            <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="absolute top-16 left-4 right-4 z-[110] max-w-lg mx-auto">
              <div className="bg-red-500/20 border border-red-500/40 rounded-xl px-4 py-3 flex items-center gap-3 text-sm text-red-300">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                <span>You exited fullscreen. On test day, this would flag your test.</span>
                <button onClick={requestFullscreen} className="ml-auto px-2 py-0.5 rounded bg-red-500/20 text-xs hover:bg-red-500/40 transition-colors flex-shrink-0">Re-enter</button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Test header */}
        <div className="flex-shrink-0 border-b border-white/8 bg-[#050B18]/95">
          <div className="max-w-4xl mx-auto px-3 py-2">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs text-slate-400 font-medium hidden sm:block truncate max-w-[200px]">{currentConfig?.label}</span>
              <div className="flex-1" />
              <span className="text-xs text-slate-400 font-medium flex-shrink-0">Q {currentQIdx + 1}/{currentConfig?.questionCount}</span>
              <div className={cn("flex items-center gap-1 text-sm font-mono font-bold flex-shrink-0 px-2 py-0.5 rounded-lg", timeLeft <= 60 ? "bg-red-500/15 text-red-400" : timeLeft <= 300 ? "bg-amber-500/10 text-amber-400" : "text-white")}>
                <Clock className="w-3.5 h-3.5" />{formatTime(timeLeft)}
              </div>
              <button onClick={handleFlag} className={cn("p-1.5 rounded-lg transition-colors flex-shrink-0", isFlagged ? "text-orange-400 bg-orange-400/10" : "text-slate-500 hover:text-orange-400 hover:bg-white/5")} title="Flag for review"><Flag className="w-4 h-4" /></button>
              <button onClick={() => setShowReference(true)} className="p-1.5 rounded-lg text-slate-500 hover:text-violet-400 hover:bg-white/5 transition-colors flex-shrink-0" title="Reference sheet"><BookOpen className="w-4 h-4" /></button>
              {currentConfig?.allowCalculator && (
                <button onClick={() => setShowDesmos(true)} className="p-1.5 rounded-lg text-violet-400 hover:bg-violet-400/10 transition-colors flex-shrink-0" title="Desmos calculator"><Calculator className="w-4 h-4" /></button>
              )}
              <button onClick={() => setShowNavigator(!showNavigator)} className="p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-white/5 transition-colors flex-shrink-0"><Grid3x3 className="w-4 h-4" /></button>
              <button onClick={isFullscreen ? () => document.exitFullscreen?.() : requestFullscreen} className="p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-white/5 transition-colors flex-shrink-0" title={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}>
                {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </button>
            </div>
            <Progress value={qProgress} className="h-1" />
          </div>

          {timeLeft <= 300 && timeLeft > 0 && (
            <div className="border-t border-amber-500/20 bg-amber-500/5">
              <div className="max-w-4xl mx-auto px-3 py-1.5 flex items-center gap-2 text-xs text-amber-400">
                <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                {timeLeft <= 60 ? "Less than 1 minute remaining!" : `${Math.ceil(timeLeft / 60)} minutes remaining`}
              </div>
            </div>
          )}

          <AnimatePresence>
            {showNavigator && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden border-t border-white/8">
                <div className="max-w-4xl mx-auto px-3 py-2 flex flex-wrap gap-1">
                  {currentModule?.questions.map((_, i) => {
                    const isAns = currentModule.answers.has(i);
                    const isMrk = currentModule.flagged.has(i);
                    const isCur = i === currentQIdx;
                    return (
                      <button key={i} onClick={() => goToQuestion(i)} className={cn("w-7 h-7 rounded text-xs font-semibold transition-all", isCur ? "ring-2 ring-[#F59E0B] bg-[#F59E0B] text-[#050B18]" : isMrk ? "bg-orange-500/15 text-orange-400 border border-orange-400/40" : isAns ? "bg-white/10 text-white border border-white/20" : "bg-white/5 text-slate-500 border border-white/8 hover:bg-white/10")}>{i + 1}</button>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {isFlagged && (
          <div className="flex-shrink-0 max-w-4xl mx-auto w-full px-4 pt-3">
            <div className="flex items-center gap-2 text-xs text-orange-400 bg-orange-400/8 border border-orange-400/20 rounded-lg px-3 py-1.5"><Flag className="w-3 h-3" />Flagged for review</div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto">
          <div className="max-w-4xl mx-auto w-full px-4 py-5">
            <div className="flex flex-wrap items-center gap-2 mb-4">
              <Badge variant={currentQuestion.domain === "math" ? "math" : "rw"}>{currentQuestion.domain === "math" ? "Math" : "Reading & Writing"}</Badge>
              <Badge variant={currentQuestion.difficulty === "E" ? "easy" : currentQuestion.difficulty === "H" ? "hard" : "medium"}>{currentQuestion.difficulty === "E" ? "Easy" : currentQuestion.difficulty === "H" ? "Hard" : "Medium"}</Badge>
              <Badge variant="outline" className="text-slate-500 text-xs">{currentQuestion.skill}</Badge>
              {currentConfig?.allowCalculator && <Badge variant="secondary" className="text-xs gap-1"><Calculator className="w-3 h-3" />Calculator</Badge>}
            </div>

            <AnimatePresence mode="wait">
              <motion.div key={`${currentModuleIdx}-${currentQIdx}`} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.15 }}>
                {currentQuestion.associatedPassage && (
                  <Card className="mb-4">
                    <CardContent className="p-4 sm:p-5">
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Passage</p>
                      <MathJax>
                        <div className="text-sm text-slate-300 leading-relaxed question-content" dangerouslySetInnerHTML={{ __html: currentQuestion.associatedPassage }} />
                      </MathJax>
                    </CardContent>
                  </Card>
                )}

                <div className="mb-5">
                  <MathJax>
                    <div className="text-base text-slate-100 leading-relaxed question-content" dangerouslySetInnerHTML={{ __html: currentQuestion.stem }} />
                  </MathJax>
                </div>

                {currentQuestion.questionType === "mcq" && currentQuestion.answerOptions && (
                  <div className="space-y-2.5 mb-6">
                    {currentQuestion.answerOptions.map(opt => (
                      <button key={opt.id} onClick={() => handleAnswer(opt.id)}
                        className={cn("w-full text-left p-4 rounded-xl border transition-all flex items-start gap-3", userAnswer === opt.id ? "bg-[#F59E0B]/10 border-[#F59E0B]/50 text-white" : "bg-white/3 border-white/8 text-slate-300 hover:bg-white/6 hover:border-white/15")}>
                        <span className={cn("flex-shrink-0 w-6 h-6 rounded-full border flex items-center justify-center text-xs font-bold mt-0.5", userAnswer === opt.id ? "bg-[#F59E0B] border-[#F59E0B] text-[#050B18]" : "border-white/20 text-slate-500")}>
                          {opt.id.toUpperCase()}
                        </span>
                        <MathJax>
                          <span className="text-sm leading-relaxed question-content" dangerouslySetInnerHTML={{ __html: opt.content }} />
                        </MathJax>
                      </button>
                    ))}
                  </div>
                )}

                {currentQuestion.questionType === "spr" && (
                  <div className="mb-6">
                    <input type="text" placeholder="Enter your answer…" value={userAnswer} onChange={e => handleAnswer(e.target.value)}
                      className="w-full max-w-xs h-12 px-4 rounded-xl border border-white/10 text-white text-center text-lg font-medium bg-white/5 focus:outline-none focus:ring-2 focus:ring-[#F59E0B]/50 focus:border-[#F59E0B]/50" />
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        <div className="flex-shrink-0 border-t border-white/8 bg-[#050B18]/95">
          <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
            <Button variant="ghost" size="sm" onClick={handlePrev} disabled={currentQIdx === 0}><ArrowLeft className="w-4 h-4" />Back</Button>
            <div className="text-xs text-slate-600">{currentModule?.answers.size ?? 0}/{currentConfig?.questionCount} answered</div>
            <Button size="sm" onClick={handleNext}>
              {currentQIdx === (currentConfig?.questionCount ?? 0) - 1 ? "Review" : "Next"}
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </MathJaxContext>
  );
}
