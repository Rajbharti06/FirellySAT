"use client";

export const dynamic = "force-dynamic";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Flag, BookOpen, Calculator, ArrowLeft, ArrowRight,
  Check, X, Timer, Clock, Grid3x3, Lightbulb,
  RefreshCw, TrendingUp, AlertTriangle, Maximize2,
  Minimize2, Shield, PenLine, Highlighter, Trash2,
  ChevronDown, ChevronUp, Target
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
  notes: Map<number, string>;
}

const HIGHLIGHT_COLORS = [
  { id: "yellow", label: "Yellow", class: "hl-yellow", bg: "#FEF08A" },
  { id: "blue", label: "Blue", class: "hl-blue", bg: "#BFDBFE" },
  { id: "green", label: "Green", class: "hl-green", bg: "#BBF7D0" },
  { id: "pink", label: "Pink", class: "hl-pink", bg: "#FBCFE8" },
];

function scaleScore(rawCorrect: number, maxRaw: number): number {
  const pct = rawCorrect / maxRaw;
  const scaled = Math.round(200 + pct * 600);
  if (pct < 0.4) return Math.max(200, scaled - 20);
  if (pct > 0.85) return Math.min(800, scaled + 20);
  return scaled;
}

function getScoreLabel(pct: number): { label: string; color: string } {
  if (pct >= 80) return { label: "Proficient", color: "#16A34A" };
  if (pct >= 60) return { label: "Approaching", color: "#D97706" };
  return { label: "Needs Work", color: "#DC2626" };
}

// ─── Highlighting utility ────────────────────────────────────────────────────

function applyHighlight(colorClass: string, passageEl: HTMLElement) {
  const selection = window.getSelection();
  if (!selection || selection.isCollapsed || selection.rangeCount === 0) return false;
  const range = selection.getRangeAt(0);
  if (!passageEl.contains(range.commonAncestorContainer)) return false;

  const mark = document.createElement("mark");
  mark.className = colorClass;
  try {
    range.surroundContents(mark);
  } catch {
    const frag = range.extractContents();
    mark.appendChild(frag);
    range.insertNode(mark);
  }
  selection.removeAllRanges();
  return true;
}

function clearHighlights(passageEl: HTMLElement) {
  const marks = passageEl.querySelectorAll("mark");
  marks.forEach(m => {
    const parent = m.parentNode;
    if (!parent) return;
    while (m.firstChild) parent.insertBefore(m.firstChild, m);
    parent.removeChild(m);
  });
  // Normalize to merge adjacent text nodes
  passageEl.normalize();
}

// ─── Score Report Component ───────────────────────────────────────────────────

interface ScoreReportProps {
  modules: ModuleState[];
  pastAttempts: MockTestAttempt[];
  onRetake: () => void;
}

function ScoreReport({ modules, pastAttempts, onRetake }: ScoreReportProps) {
  const rwModules = modules.slice(0, 2);
  const mathModules = modules.slice(2, 4);
  const rwCorrect = rwModules.reduce((sum, m) => sum + m.questions.filter((q, i) => q.correctAnswer.includes(m.answers.get(i) || "")).length, 0);
  const mathCorrect = mathModules.reduce((sum, m) => sum + m.questions.filter((q, i) => q.correctAnswer.includes(m.answers.get(i) || "")).length, 0);
  const rwScaled = scaleScore(rwCorrect, 54);
  const mathScaled = scaleScore(mathCorrect, 44);
  const totalScore = rwScaled + mathScaled;

  const prevBest = pastAttempts.length > 1 ? Math.max(...pastAttempts.slice(1).map(a => a.totalScore)) : null;
  const improvement = prevBest !== null ? totalScore - prevBest : null;

  // Skill breakdown
  const skillMap: Record<string, { correct: number; total: number; domain: QuestionDomain }> = {};
  modules.forEach(m => {
    m.questions.forEach((q, i) => {
      if (!skillMap[q.skill]) skillMap[q.skill] = { correct: 0, total: 0, domain: q.domain };
      skillMap[q.skill].total += 1;
      if (q.correctAnswer.includes(m.answers.get(i) || "")) skillMap[q.skill].correct += 1;
    });
  });

  const mathSkills = Object.entries(skillMap).filter(([, v]) => v.domain === "math");
  const rwSkills = Object.entries(skillMap).filter(([, v]) => v.domain === "reading_and_writing");

  const ScoreBar = ({ label, correct, total, domain }: { label: string; correct: number; total: number; domain: string }) => {
    const pct = Math.round((correct / total) * 100);
    const { color } = getScoreLabel(pct);
    return (
      <div className="mb-3">
        <div className="flex items-center justify-between mb-1">
          <span className="text-sm text-slate-700 font-medium truncate max-w-[200px]">{label}</span>
          <div className="flex items-center gap-2 ml-2 flex-shrink-0">
            <span className="text-xs font-bold" style={{ color }}>{pct}%</span>
            <span className="text-xs text-slate-500">{correct}/{total}</span>
          </div>
        </div>
        <div className="h-2 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ delay: 0.3, duration: 0.8, ease: "easeOut" }}
            className="h-full rounded-full"
            style={{ backgroundColor: color }}
          />
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] pt-16 pb-16">
      <div className="max-w-3xl mx-auto px-4">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-8 pt-4">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-green-100 text-green-700 rounded-full text-sm font-semibold mb-4 border border-green-200">
            <Check className="w-4 h-4" /> Mock Test Complete
          </div>
          <h1 className="text-3xl font-bold text-slate-900 mb-1">Your Score Report</h1>
          <p className="text-slate-500">
            {improvement !== null && improvement > 0
              ? `+${improvement} points from your previous best!`
              : "Here's how you performed today."}
          </p>
        </motion.div>

        {/* Total Score Hero */}
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1 }} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 mb-6 text-center">
          <div className="text-7xl font-bold text-slate-900 mb-1 tracking-tight">{totalScore}</div>
          <div className="text-slate-500 text-sm mb-6">Estimated Total SAT Score (400–1600)</div>

          <div className="grid grid-cols-2 gap-4 max-w-sm mx-auto">
            <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
              <div className="text-3xl font-bold text-blue-700">{rwScaled}</div>
              <div className="text-xs text-blue-600 font-semibold mt-0.5">Reading & Writing</div>
              <div className="text-xs text-slate-400 mt-1">{rwCorrect}/54 correct</div>
            </div>
            <div className="p-4 bg-violet-50 rounded-xl border border-violet-100">
              <div className="text-3xl font-bold text-violet-700">{mathScaled}</div>
              <div className="text-xs text-violet-600 font-semibold mt-0.5">Math</div>
              <div className="text-xs text-slate-400 mt-1">{mathCorrect}/44 correct</div>
            </div>
          </div>

          {improvement !== null && (
            <div className={cn("mt-4 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-semibold", improvement >= 0 ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700")}>
              {improvement >= 0 ? `↑ +${improvement} vs last attempt` : `↓ ${improvement} vs last attempt`}
            </div>
          )}
        </motion.div>

        {/* Module breakdown */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 mb-6">
          <h2 className="text-base font-bold text-slate-800 mb-4 flex items-center gap-2">
            <Grid3x3 className="w-4 h-4 text-slate-400" /> Module Breakdown
          </h2>
          <div className="space-y-3">
            {modules.map((m, idx) => {
              const cfg = MODULES[idx];
              const correct = m.questions.filter((q, i) => q.correctAnswer.includes(m.answers.get(i) || "")).length;
              const total = m.questions.length;
              const pct = Math.round((correct / total) * 100);
              const isMath = cfg.domain === "math";
              return (
                <div key={idx}>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm text-slate-600">{cfg.label}</span>
                    <span className="text-sm font-bold text-slate-800">{correct}/{total} <span className="font-normal text-slate-400">({pct}%)</span></span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ delay: 0.4 + idx * 0.1, duration: 0.7 }}
                      className={cn("h-full rounded-full", isMath ? "bg-violet-500" : "bg-blue-500")}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>

        {/* Skills: RW */}
        {rwSkills.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 mb-6">
            <h2 className="text-base font-bold text-slate-800 mb-4 flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-blue-500" /> Reading & Writing — Skills
            </h2>
            {rwSkills
              .sort(([, a], [, b]) => (a.correct / a.total) - (b.correct / b.total))
              .map(([skill, { correct, total }]) => (
                <ScoreBar key={skill} label={skill} correct={correct} total={total} domain="reading_and_writing" />
              ))}

            <div className="flex items-center gap-4 mt-4 pt-4 border-t border-slate-100">
              {[{ label: "Proficient", color: "#16A34A" }, { label: "Approaching", color: "#D97706" }, { label: "Needs Work", color: "#DC2626" }].map(({ label, color }) => (
                <div key={label} className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
                  <span className="text-xs text-slate-500">{label}</span>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Skills: Math */}
        {mathSkills.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 mb-6">
            <h2 className="text-base font-bold text-slate-800 mb-4 flex items-center gap-2">
              <Calculator className="w-4 h-4 text-violet-500" /> Math — Skills
            </h2>
            {mathSkills
              .sort(([, a], [, b]) => (a.correct / a.total) - (b.correct / b.total))
              .map(([skill, { correct, total }]) => (
                <ScoreBar key={skill} label={skill} correct={correct} total={total} domain="math" />
              ))}
          </motion.div>
        )}

        {/* Past attempts */}
        {pastAttempts.length > 1 && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 mb-6">
            <h2 className="text-base font-bold text-slate-800 mb-4 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-green-500" /> Score History
            </h2>
            <div className="space-y-2">
              {pastAttempts.slice(0, 5).map((a, i) => (
                <div key={a.id} className={cn("flex items-center justify-between p-3 rounded-xl border", i === 0 ? "bg-blue-50 border-blue-200" : "bg-slate-50 border-slate-200")}>
                  <div>
                    <span className="text-sm font-semibold text-slate-800">Test #{a.attemptNumber}</span>
                    <span className="text-xs text-slate-500 ml-2">{new Date(a.completedAt).toLocaleDateString()}</span>
                    {i === 0 && <span className="text-xs bg-blue-100 text-blue-700 rounded px-1.5 py-0.5 ml-2 font-semibold">Latest</span>}
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-blue-600">R&W: {a.rwScore}</span>
                    <span className="text-xs text-violet-600">Math: {a.mathScore}</span>
                    <span className="text-sm font-bold text-slate-900">{a.totalScore}</span>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Actions */}
        <div className="grid grid-cols-2 gap-3">
          <button onClick={onRetake} className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 transition-all">
            <RefreshCw className="w-4 h-4" /> New Test
          </button>
          <a href="/notes" className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold bg-slate-900 text-white hover:bg-slate-800 transition-all">
            <BookOpen className="w-4 h-4" /> View Logbook
          </a>
        </div>
        <a href="/mock-history" className="block text-center text-xs text-slate-400 hover:text-slate-600 transition-colors mt-4">View all past mock tests →</a>
      </div>
    </div>
  );
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────

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
  const [localAnswer, setLocalAnswer] = useState("");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [fullscreenWarning, setFullscreenWarning] = useState(false);
  const [mockAttemptId] = useState(() => generateId());
  const [testStartTime] = useState(() => new Date().toISOString());
  const [pastAttempts, setPastAttempts] = useState<MockTestAttempt[]>([]);
  const [passageHighlights, setPassageHighlights] = useState<Map<string, string>>(new Map());
  const [showHighlightToolbar, setShowHighlightToolbar] = useState(false);
  const [highlightPos, setHighlightPos] = useState({ x: 0, y: 0 });
  const [showNotes, setShowNotes] = useState(false);
  const [noteInput, setNoteInput] = useState("");
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const passageRef = useRef<HTMLDivElement>(null);

  const currentModule = modules[currentModuleIdx];
  const currentConfig = MODULES[currentModuleIdx];
  const currentQuestion = currentModule?.questions[currentQIdx];
  const isRW = currentConfig?.domain === "reading_and_writing";

  useEffect(() => { setPastAttempts(getMockAttempts()); }, []);

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
    document.documentElement.requestFullscreen?.().then(() => setIsFullscreen(true)).catch(() => {});
  }, []);

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
    const attempt: MockTestAttempt = {
      id: mockAttemptId, attemptNumber, startedAt: testStartTime,
      completedAt: new Date().toISOString(),
      totalScore: scaleScore(rwCorrect, 54) + scaleScore(mathCorrect, 44),
      rwScore: scaleScore(rwCorrect, 54), mathScore: scaleScore(mathCorrect, 44),
      rwCorrect, mathCorrect, rwTotal: 54, mathTotal: 44,
      durationSeconds: modules.reduce((sum, m) => sum + m.timeUsed, 0),
    };
    saveMockAttempt(attempt);
    setPastAttempts(getMockAttempts());
    if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
  }, [phase]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadQuestions = async () => {
    setPhase("loading");
    try {
      const usedIds = getMockUsedQuestionIds();
      const [rwQs, mathQs] = await Promise.all([
        fetch("/api/questions?domain=reading_and_writing&count=80").then(r => r.json()),
        fetch("/api/questions?domain=math&count=60").then(r => r.json()),
      ]);
      const shuffle = <T,>(arr: T[]): T[] => [...arr].sort(() => Math.random() - 0.5);
      const padTo = (arr: Question[], n: number): Question[] => {
        if (arr.length >= n) return arr.slice(0, n);
        const padded = [...arr];
        while (padded.length < n) padded.push(...arr);
        return padded.slice(0, n);
      };
      let rwList: Question[] = shuffle((rwQs.questions || []).filter((q: Question) => !usedIds.includes(q.id)));
      let mathList: Question[] = shuffle((mathQs.questions || []).filter((q: Question) => !usedIds.includes(q.id)));
      if (rwList.length < 54) rwList = [...rwList, ...shuffle((rwQs.questions || []) as Question[])];
      if (mathList.length < 44) mathList = [...mathList, ...shuffle((mathQs.questions || []) as Question[])];
      const rw54 = padTo(rwList, 54);
      const math44 = padTo(mathList, 44);
      setModules(MODULES.map((m, i) => ({
        questions: m.domain === "reading_and_writing" ? (i === 0 ? rw54.slice(0, 27) : rw54.slice(27, 54)) : (i === 2 ? math44.slice(0, 22) : math44.slice(22, 44)),
        answers: new Map(), flagged: new Set(), submitted: false, timeUsed: 0, notes: new Map(),
      })));
      setTimeLeft(MODULES[0].timeSeconds);
      setCurrentModuleIdx(0);
      setCurrentQIdx(0);
      setPassageHighlights(new Map());
      setPhase("active");
      requestFullscreen();
    } catch (e) {
      console.error("Failed to load mock test questions", e);
      setPhase("setup");
    }
  };

  useEffect(() => {
    if (phase === "active") {
      timerRef.current = setInterval(() => {
        setTimeLeft(t => {
          if (t <= 1) { clearInterval(timerRef.current!); handleModuleTimeUp(); return 0; }
          return t - 1;
        });
      }, 1000);
    } else if (phase === "break") {
      timerRef.current = setInterval(() => {
        setBreakTimeLeft(t => {
          if (t <= 1) { clearInterval(timerRef.current!); startNextModule(); return 0; }
          return t - 1;
        });
      }, 1000);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [phase, currentModuleIdx]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleModuleTimeUp = useCallback(() => { submitCurrentModule(true); }, [currentModuleIdx, modules, timeLeft]); // eslint-disable-line react-hooks/exhaustive-deps

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
      if (!q.correctAnswer.includes(ua) && ua) {
        addLogbookEntry({ timestamp: new Date().toISOString(), questionId: q.id, stem: q.stem, domain: q.domain, skill: q.skill, difficulty: q.difficulty, userAnswer: ua, correctAnswer: q.correctAnswer, rationale: q.rationale, source: "mock_test", mockAttemptId });
      }
    });
    if (currentModuleIdx >= MODULES.length - 1) { setPhase("results"); }
    else { setBreakTimeLeft(BREAK_AFTER[currentModuleIdx] ?? 300); setPhase("break"); }
  }, [currentModule, currentConfig, currentModuleIdx, timeLeft, mockAttemptId]);

  const startNextModule = useCallback(() => {
    const next = currentModuleIdx + 1;
    if (next >= MODULES.length) { setPhase("results"); return; }
    setCurrentModuleIdx(next);
    setCurrentQIdx(0);
    setTimeLeft(MODULES[next].timeSeconds);
    setLocalAnswer("");
    setNoteInput("");
    setShowNotes(false);
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
      if (flagged.has(currentQIdx)) flagged.delete(currentQIdx); else flagged.add(currentQIdx);
      next[currentModuleIdx] = { ...next[currentModuleIdx], flagged };
      return next;
    });
  };

  const saveNote = () => {
    if (!currentQuestion) return;
    setModules(prev => {
      const next = [...prev];
      const notes = new Map(next[currentModuleIdx].notes);
      notes.set(currentQIdx, noteInput);
      next[currentModuleIdx] = { ...next[currentModuleIdx], notes };
      return next;
    });
  };

  const handleHighlight = (colorClass: string) => {
    if (!passageRef.current) return;
    const success = applyHighlight(colorClass, passageRef.current);
    if (success && currentQuestion) {
      setPassageHighlights(prev => new Map(prev).set(currentQuestion.id, passageRef.current!.innerHTML));
    }
    setShowHighlightToolbar(false);
  };

  const handleClearHighlights = () => {
    if (!passageRef.current || !currentQuestion) return;
    clearHighlights(passageRef.current);
    setPassageHighlights(prev => {
      const next = new Map(prev);
      next.delete(currentQuestion.id);
      return next;
    });
    setShowHighlightToolbar(false);
  };

  const handlePassageMouseUp = (e: React.MouseEvent) => {
    if (!isRW) return;
    const selection = window.getSelection();
    if (selection && !selection.isCollapsed && selection.toString().trim().length > 0) {
      setHighlightPos({ x: e.clientX, y: e.clientY });
      setShowHighlightToolbar(true);
    } else {
      setShowHighlightToolbar(false);
    }
  };

  const goToQuestion = (idx: number) => {
    setCurrentQIdx(idx);
    setLocalAnswer(currentModule?.answers.get(idx) || "");
    setNoteInput(currentModule?.notes.get(idx) || "");
    setShowNavigator(false);
    setShowHighlightToolbar(false);
  };

  const handleNext = () => {
    if (currentQIdx < (currentModule?.questions.length ?? 0) - 1) {
      saveNote();
      setCurrentQIdx(i => i + 1);
      const nextIdx = currentQIdx + 1;
      setLocalAnswer(currentModule?.answers.get(nextIdx) || "");
      setNoteInput(currentModule?.notes.get(nextIdx) || "");
      setShowHighlightToolbar(false);
    } else {
      saveNote();
      setPhase("module_review");
    }
  };

  const handlePrev = () => {
    if (currentQIdx > 0) {
      saveNote();
      setCurrentQIdx(i => i - 1);
      const prevIdx = currentQIdx - 1;
      setLocalAnswer(currentModule?.answers.get(prevIdx) || "");
      setNoteInput(currentModule?.notes.get(prevIdx) || "");
      setShowHighlightToolbar(false);
    }
  };

  const timerRed = timeLeft <= 60;
  const timerAmber = timeLeft <= 300 && timeLeft > 60;

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
            <p className="text-slate-400">Bluebook format · 4 modules · ~2 hours 14 minutes · Always white like real exam</p>
          </motion.div>

          {pastAttempts.length > 0 && (
            <Card className="mb-4">
              <CardHeader><CardTitle className="text-sm">Mock Test History</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {pastAttempts.slice(0, 3).map(a => (
                  <div key={a.id} className="flex items-center justify-between p-2.5 bg-white/3 rounded-xl border border-white/8">
                    <div>
                      <span className="text-sm text-white font-semibold">Test #{a.attemptNumber}</span>
                      <span className="text-xs text-slate-500 ml-2">{new Date(a.completedAt).toLocaleDateString()}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-blue-400">R&W: {a.rwScore}</span>
                      <span className="text-xs text-violet-400">Math: {a.mathScore}</span>
                      <span className="text-sm font-bold text-[#F59E0B]">{a.totalScore}</span>
                    </div>
                  </div>
                ))}
                <a href="/mock-history" className="block text-center text-xs text-slate-500 hover:text-[#F59E0B] transition-colors pt-1">View all →</a>
              </CardContent>
            </Card>
          )}

          <Card className="mb-6">
            <CardHeader><CardTitle>Test Structure</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {MODULES.map((m, i) => (
                <div key={m.id} className="flex items-center justify-between p-3 bg-white/3 rounded-xl border border-white/8">
                  <div className="flex items-center gap-3">
                    <div className={cn("w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold", m.domain === "math" ? "bg-violet-500/20 text-violet-400" : "bg-blue-500/20 text-blue-400")}>{i + 1}</div>
                    <div>
                      <div className="text-sm font-medium text-white">{m.label}</div>
                      <div className="text-xs text-slate-500">{m.questionCount} questions · {m.timeSeconds / 60} min</div>
                    </div>
                  </div>
                  <div className="flex gap-1.5">
                    {m.allowCalculator && <Badge variant="secondary" className="text-xs gap-1"><Calculator className="w-3 h-3" />Calc</Badge>}
                    {!m.allowCalculator && <Badge variant="secondary" className="text-xs gap-1"><Highlighter className="w-3 h-3" />Highlight</Badge>}
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
              { icon: "🖊️", label: "Text Highlighting", desc: "Highlight passages in R&W" },
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
            <p className="text-xs text-slate-500">Find a quiet spot, set aside ~2h 15min. The test enters fullscreen mode with a white background, just like the real Bluebook exam.</p>
          </div>
        </div>
      </div>
    );
  }

  // ─── BREAK ────────────────────────────────────────────────────────────────
  if (phase === "break") {
    const nextConfig = MODULES[currentModuleIdx + 1];
    return (
      <div className="min-h-screen bg-white flex items-center justify-center px-4">
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="max-w-md w-full text-center">
          <div className="w-20 h-20 rounded-full bg-blue-50 border border-blue-200 flex items-center justify-center mx-auto mb-6">
            <span className="text-3xl">☕</span>
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Break Time</h2>
          <p className="text-slate-500 mb-6">Module {currentModuleIdx + 1} complete. Take a breath.</p>
          <div className="text-5xl font-mono font-bold text-blue-600 mb-6">{formatTime(breakTimeLeft)}</div>
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 mb-6 text-left">
            <div className="text-sm font-semibold text-slate-800 mb-1">Next: {nextConfig?.label}</div>
            <div className="text-xs text-slate-500">{nextConfig?.questionCount} questions · {nextConfig && nextConfig.timeSeconds / 60} min{nextConfig?.allowCalculator ? " · Calculator allowed" : ""}</div>
          </div>
          <button onClick={() => { requestFullscreen(); startNextModule(); }} className="w-full py-3 rounded-xl bg-slate-900 text-white font-semibold hover:bg-slate-800 transition-all">
            Continue to Next Module
          </button>
          <p className="text-xs text-slate-400 mt-2">Timer continues automatically</p>
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
      <div className="min-h-screen bg-white flex items-center justify-center px-4">
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="max-w-lg w-full">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-slate-900 mb-1">Review Before Submitting</h2>
            <p className="text-slate-500">{currentConfig?.label}</p>
          </div>
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 mb-6 space-y-3">
            <div className="flex justify-between items-center"><span className="text-slate-500">Answered</span><span className="font-semibold text-green-600">{answered} / {total}</span></div>
            {unanswered > 0 && <div className="flex justify-between items-center"><span className="text-slate-500">Unanswered</span><span className="font-semibold text-amber-600">{unanswered}</span></div>}
            {flaggedCount > 0 && <div className="flex justify-between items-center"><span className="text-slate-500">Flagged</span><span className="font-semibold text-orange-600">{flaggedCount}</span></div>}
            <div className="flex justify-between items-center">
              <span className="text-slate-500">Time remaining</span>
              <span className={cn("font-mono font-semibold", timerRed ? "text-red-600" : timerAmber ? "text-amber-600" : "text-slate-900")}>{formatTime(timeLeft)}</span>
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5 mb-6">
            {currentModule?.questions.map((_, i) => {
              const isAns = currentModule.answers.has(i);
              const isMrk = currentModule.flagged.has(i);
              return (
                <button key={i} onClick={() => { setCurrentQIdx(i); setLocalAnswer(currentModule.answers.get(i) || ""); setPhase("active"); }}
                  className={cn("w-8 h-8 rounded text-xs font-semibold transition-all border", isMrk ? "bg-orange-100 text-orange-700 border-orange-300" : isAns ? "bg-blue-100 text-blue-700 border-blue-300" : "bg-slate-100 text-slate-400 border-slate-300")}>{i + 1}</button>
              );
            })}
          </div>
          <div className="flex gap-2">
            <button onClick={() => setPhase("active")} className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-semibold hover:bg-slate-50 transition-all text-sm">
              <ArrowLeft className="w-4 h-4" /> Back to Module
            </button>
            <button onClick={() => submitCurrentModule()} className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-slate-900 text-white font-semibold hover:bg-slate-800 transition-all text-sm">
              Submit Module <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  // ─── RESULTS ──────────────────────────────────────────────────────────────
  if (phase === "results") {
    return (
      <ScoreReport
        modules={modules}
        pastAttempts={pastAttempts}
        onRetake={() => { setPhase("setup"); setModules([]); }}
      />
    );
  }

  // ─── ACTIVE MODULE ────────────────────────────────────────────────────────
  if (!currentQuestion) return null;

  const isFlagged = currentModule?.flagged.has(currentQIdx) ?? false;
  const userAnswer = currentModule?.answers.get(currentQIdx) ?? "";
  const qProgress = ((currentQIdx + 1) / (currentConfig?.questionCount ?? 1)) * 100;
  const currentNote = currentModule?.notes.get(currentQIdx) ?? "";
  const passageHtml = passageHighlights.get(currentQuestion.id) || currentQuestion.associatedPassage || "";

  return (
    <MathJaxContext config={mathJaxConfig}>
      {/* Overlay click to dismiss highlight toolbar */}
      {showHighlightToolbar && (
        <div className="fixed inset-0 z-[105]" onClick={() => setShowHighlightToolbar(false)} />
      )}

      <div className="fixed inset-0 z-[100] flex flex-col exam-mode">
        <ReferenceSheet open={showReference} onClose={() => setShowReference(false)} />
        <DesmosPanel open={showDesmos} onClose={() => setShowDesmos(false)} />

        {/* Fullscreen warning */}
        <AnimatePresence>
          {fullscreenWarning && (
            <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="absolute top-16 left-4 right-4 z-[110] max-w-lg mx-auto">
              <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 flex items-center gap-3 text-sm text-red-700">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                <span>You exited fullscreen. On test day, this would flag your test.</span>
                <button onClick={requestFullscreen} className="ml-auto px-2 py-0.5 rounded bg-red-100 text-xs hover:bg-red-200 transition-colors flex-shrink-0">Re-enter</button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Highlight floating toolbar */}
        <AnimatePresence>
          {showHighlightToolbar && isRW && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="fixed z-[120] flex items-center gap-1 p-1.5 bg-white rounded-xl shadow-xl border border-slate-200"
              style={{ left: Math.min(highlightPos.x - 60, window.innerWidth - 250), top: highlightPos.y - 50 }}
            >
              <span className="text-xs text-slate-400 px-1 font-medium">Highlight:</span>
              {HIGHLIGHT_COLORS.map(c => (
                <button
                  key={c.id}
                  onClick={(e) => { e.stopPropagation(); handleHighlight(c.class); }}
                  className="w-6 h-6 rounded-full border-2 border-white shadow-sm hover:scale-110 transition-transform"
                  style={{ backgroundColor: c.bg }}
                  title={c.label}
                />
              ))}
              <div className="w-px h-4 bg-slate-200 mx-0.5" />
              <button onClick={(e) => { e.stopPropagation(); handleClearHighlights(); }} className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded" title="Clear highlights">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Exam Header */}
        <div className="flex-shrink-0 exam-header" style={{ background: '#fff', borderBottom: '1px solid #E2E8F0' }}>
          <div className="max-w-6xl mx-auto px-3 py-2">
            <div className="flex items-center gap-2 mb-2">
              <div className={cn("px-2.5 py-1 rounded-lg text-xs font-semibold", isRW ? "bg-blue-100 text-blue-700" : "bg-violet-100 text-violet-700")}>
                {isRW ? "Reading & Writing" : "Math"} — Module {(currentModuleIdx % 2) + 1}
              </div>
              <div className="flex-1" />
              <span className="text-xs text-slate-500">Question {currentQIdx + 1} of {currentConfig?.questionCount}</span>
              <div className={cn(
                "flex items-center gap-1 text-sm font-mono font-bold px-2.5 py-1 rounded-lg",
                timerRed ? "bg-red-100 text-red-600" : timerAmber ? "bg-amber-100 text-amber-700" : "text-slate-700"
              )}>
                <Clock className="w-3.5 h-3.5" />{formatTime(timeLeft)}
              </div>

              {/* Actions */}
              <button onClick={handleFlag} className={cn("p-1.5 rounded-lg transition-colors", isFlagged ? "text-orange-600 bg-orange-100" : "text-slate-400 hover:text-slate-700 hover:bg-slate-100")} title="Flag for review">
                <Flag className="w-4 h-4" />
              </button>
              {isRW && (
                <button onClick={() => setShowHighlightToolbar(!showHighlightToolbar)} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors" title="Highlight text">
                  <Highlighter className="w-4 h-4" />
                </button>
              )}
              {isRW && (
                <button onClick={() => setShowNotes(!showNotes)} className={cn("p-1.5 rounded-lg transition-colors", showNotes ? "text-amber-700 bg-amber-100" : "text-slate-400 hover:text-slate-700 hover:bg-slate-100")} title="Notes">
                  <PenLine className="w-4 h-4" />
                </button>
              )}
              {!isRW && (
                <button onClick={() => setShowReference(true)} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors" title="Reference sheet">
                  <BookOpen className="w-4 h-4" />
                </button>
              )}
              {currentConfig?.allowCalculator && (
                <button onClick={() => setShowDesmos(true)} className="p-1.5 rounded-lg text-violet-600 hover:bg-violet-50 transition-colors" title="Calculator">
                  <Calculator className="w-4 h-4" />
                </button>
              )}
              <button onClick={() => setShowNavigator(!showNavigator)} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors">
                <Grid3x3 className="w-4 h-4" />
              </button>
              <button onClick={isFullscreen ? () => document.exitFullscreen?.() : requestFullscreen} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors">
                {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </button>
            </div>
            {/* Progress bar */}
            <div className="h-1 bg-slate-100 rounded-full overflow-hidden">
              <div className={cn("h-full rounded-full transition-all", isRW ? "bg-blue-500" : "bg-violet-500")} style={{ width: `${qProgress}%` }} />
            </div>
          </div>

          {/* Timer warning */}
          {timeLeft <= 300 && timeLeft > 0 && (
            <div className="border-t border-amber-200 bg-amber-50">
              <div className="max-w-6xl mx-auto px-3 py-1 flex items-center gap-2 text-xs text-amber-700">
                <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                {timeLeft <= 60 ? "Less than 1 minute remaining!" : `${Math.ceil(timeLeft / 60)} minutes remaining`}
              </div>
            </div>
          )}

          {/* Navigator */}
          <AnimatePresence>
            {showNavigator && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden border-t border-slate-200">
                <div className="max-w-6xl mx-auto px-3 py-2 flex flex-wrap gap-1">
                  {currentModule?.questions.map((_, i) => {
                    const isAns = currentModule.answers.has(i);
                    const isMrk = currentModule.flagged.has(i);
                    const isCur = i === currentQIdx;
                    return (
                      <button key={i} onClick={() => goToQuestion(i)}
                        className={cn("w-7 h-7 rounded text-xs font-semibold transition-all border",
                          isCur ? "bg-slate-900 text-white border-slate-900"
                          : isMrk ? "bg-orange-100 text-orange-700 border-orange-300"
                          : isAns ? "bg-blue-100 text-blue-700 border-blue-300"
                          : "bg-slate-100 text-slate-400 border-slate-200 hover:bg-slate-200"
                        )}>{i + 1}</button>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {isFlagged && (
          <div className="flex-shrink-0 max-w-6xl mx-auto w-full px-4 pt-2">
            <div className="flex items-center gap-2 text-xs text-orange-700 bg-orange-50 border border-orange-200 rounded-lg px-3 py-1.5">
              <Flag className="w-3 h-3" />Flagged for review
            </div>
          </div>
        )}

        {/* Main Content */}
        <div className="flex-1 overflow-y-auto">
          <div className={cn("max-w-6xl mx-auto px-4 py-5", isRW && passageHtml ? "grid grid-cols-2 gap-6" : "max-w-3xl")}>

            {/* Left: Passage (RW only) */}
            {isRW && passageHtml && (
              <div className="overflow-y-auto pr-2 border-r border-slate-200">
                <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Passage</div>
                <div
                  ref={passageRef}
                  onMouseUp={handlePassageMouseUp}
                  className="exam-passage select-text cursor-text"
                  dangerouslySetInnerHTML={{ __html: passageHtml }}
                />
              </div>
            )}

            {/* Right: Question */}
            <div>
              {/* Difficulty badge */}
              <div className="flex items-center gap-2 mb-4">
                <span className={cn("text-xs font-semibold px-2 py-0.5 rounded-full border",
                  currentQuestion.difficulty === "E" ? "bg-green-50 text-green-700 border-green-200"
                  : currentQuestion.difficulty === "H" ? "bg-red-50 text-red-700 border-red-200"
                  : "bg-amber-50 text-amber-700 border-amber-200"
                )}>
                  {currentQuestion.difficulty === "E" ? "Easy" : currentQuestion.difficulty === "H" ? "Hard" : "Medium"}
                </span>
                <span className="text-xs text-slate-400">{currentQuestion.skill}</span>
                {currentConfig?.allowCalculator && <span className="text-xs text-violet-600 font-semibold">Calculator</span>}
              </div>

              <AnimatePresence mode="wait">
                <motion.div key={`${currentModuleIdx}-${currentQIdx}`} initial={{ opacity: 0, x: 15 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -15 }} transition={{ duration: 0.15 }}>
                  {/* Passage when no left column (math or no passage) */}
                  {(!isRW || !passageHtml) && currentQuestion.associatedPassage && (
                    <div className="mb-5 p-4 bg-slate-50 rounded-xl border border-slate-200">
                      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Passage</p>
                      <MathJax>
                        <div
                          ref={passageRef}
                          onMouseUp={handlePassageMouseUp}
                          className="exam-passage select-text"
                          dangerouslySetInnerHTML={{ __html: passageHighlights.get(currentQuestion.id) || currentQuestion.associatedPassage }}
                        />
                      </MathJax>
                    </div>
                  )}

                  {/* Question stem */}
                  <div className="mb-5">
                    <MathJax>
                      <div className="text-[0.9375rem] text-slate-900 leading-relaxed question-content" dangerouslySetInnerHTML={{ __html: currentQuestion.stem }} />
                    </MathJax>
                  </div>

                  {/* MCQ options */}
                  {currentQuestion.questionType === "mcq" && currentQuestion.answerOptions && (
                    <div className="space-y-2.5 mb-6">
                      {currentQuestion.answerOptions.map(opt => (
                        <button
                          key={opt.id}
                          onClick={() => handleAnswer(opt.id)}
                          className={cn("exam-option w-full text-left p-3.5 flex items-start gap-3", userAnswer === opt.id ? "selected" : "")}
                        >
                          <span className={cn("exam-option-letter", userAnswer === opt.id ? "selected" : "")}>
                            {opt.id.toUpperCase()}
                          </span>
                          <MathJax>
                            <span className="text-sm leading-relaxed question-content text-slate-800" dangerouslySetInnerHTML={{ __html: opt.content }} />
                          </MathJax>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* SPR input */}
                  {currentQuestion.questionType === "spr" && (
                    <div className="mb-6">
                      <label className="text-xs text-slate-500 mb-2 block font-medium">Your Answer</label>
                      <input
                        type="text"
                        placeholder="Enter your answer…"
                        value={userAnswer}
                        onChange={e => handleAnswer(e.target.value)}
                        className="w-full max-w-xs h-12 px-4 rounded-xl border-2 border-slate-300 text-slate-900 text-center text-lg font-medium bg-white focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-500"
                      />
                    </div>
                  )}

                  {/* Notes for RW */}
                  {isRW && showNotes && (
                    <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-xl">
                      <div className="flex items-center gap-1.5 mb-2">
                        <PenLine className="w-3.5 h-3.5 text-amber-600" />
                        <span className="text-xs font-semibold text-amber-700">Question Notes</span>
                      </div>
                      <textarea
                        value={noteInput}
                        onChange={e => setNoteInput(e.target.value)}
                        onBlur={saveNote}
                        placeholder="Write your reasoning or annotations here…"
                        rows={3}
                        className="w-full text-sm text-slate-700 bg-transparent border-none outline-none resize-none placeholder-amber-300"
                      />
                      {currentNote && noteInput === currentNote && (
                        <p className="text-xs text-amber-500 mt-1">Saved</p>
                      )}
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* Footer Nav */}
        <div className="flex-shrink-0 border-t border-slate-200 bg-white">
          <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
            <button
              onClick={handlePrev}
              disabled={currentQIdx === 0}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-slate-300 text-slate-700 text-sm font-semibold hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              <ArrowLeft className="w-4 h-4" /> Back
            </button>
            <div className="text-xs text-slate-400">{currentModule?.answers.size ?? 0} of {currentConfig?.questionCount} answered</div>
            <button
              onClick={handleNext}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800 transition-all"
            >
              {currentQIdx === (currentConfig?.questionCount ?? 0) - 1 ? "Review" : "Next"}
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </MathJaxContext>
  );
}
