"use client";

export const dynamic = "force-dynamic";

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Flame, Settings2, Wind, Calculator, BookOpen, Zap, X,
  Target, TrendingUp, CheckSquare, Square, ChevronDown, ChevronUp,
  Timer, Shuffle, AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PracticeSession } from "@/components/practice/practice-session";
import { getSettings, getWeakSkills } from "@/lib/storage";
import { cn } from "@/lib/utils";
import type { Question, QuestionDomain, QuestionDifficulty } from "@/types";

type PracticeMode = "idle" | "loading" | "active";
type QuickMode = "random" | "weak" | "speedrun" | "hard";

const MATH_SKILLS = [
  {
    skill: "Algebra",
    icon: "📊",
    subtopics: [
      "Linear equations in one variable",
      "Linear functions",
      "Linear equations in two variables",
      "Systems of two linear equations in two variables",
      "Linear inequalities in one or two variables",
    ],
  },
  {
    skill: "Advanced Math",
    icon: "🧮",
    subtopics: [
      "Nonlinear functions",
      "Nonlinear equations in one variable and systems of equations in two variables",
      "Equivalent expressions",
    ],
  },
  {
    skill: "Problem-Solving and Data Analysis",
    icon: "📈",
    subtopics: [
      "Ratios, rates, proportional relationships, and units",
      "Percentages",
      "One-variable data: Distributions and measures of center and spread",
      "Two-variable data: Models and scatterplots",
      "Probability and conditional probability",
      "Inference from sample statistics and margin of error",
      "Evaluating statistical claims: Observational studies and experiments",
    ],
  },
  {
    skill: "Geometry and Trigonometry",
    icon: "📐",
    subtopics: [
      "Area and volume",
      "Lines, angles, and triangles",
      "Right triangles and trigonometry",
      "Circles",
    ],
  },
];

const RW_SKILLS = [
  {
    skill: "Information and Ideas",
    icon: "💡",
    subtopics: [
      "Central Ideas and Details",
      "Command of Evidence (Textual)",
      "Command of Evidence (Quantitative)",
      "Inferences",
    ],
  },
  {
    skill: "Craft and Structure",
    icon: "🔤",
    subtopics: [
      "Words in Context",
      "Text Structure and Purpose",
      "Cross-Text Connections",
    ],
  },
  {
    skill: "Expression of Ideas",
    icon: "✍️",
    subtopics: [
      "Rhetorical Synthesis",
      "Transitions",
    ],
  },
  {
    skill: "Standard English Conventions",
    icon: "📝",
    subtopics: [
      "Boundaries",
      "Form, Structure, and Sense",
    ],
  },
];

export default function PracticePage() {
  const [mode, setMode] = useState<PracticeMode>("idle");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [calmMode, setCalmMode] = useState(false);
  const [isAdaptive, setIsAdaptive] = useState(false);
  const [domain, setDomain] = useState<QuestionDomain | "mixed">("mixed");
  const [difficulty, setDifficulty] = useState<QuestionDifficulty | "mixed">("mixed");
  const [count, setCount] = useState(10);
  const [selectedTopics, setSelectedTopics] = useState<Set<string>>(new Set());
  const [expandedSkills, setExpandedSkills] = useState<Set<string>>(new Set());
  const [showTopicFilter, setShowTopicFilter] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [speedrunMode, setSpeedrunMode] = useState(false);

  useEffect(() => {
    const settings = getSettings();
    setCalmMode(settings.calmModeDefault);
    setDomain(settings.preferredDomain);
    setDifficulty(settings.preferredDifficulty);
  }, []);

  useEffect(() => {
    setSelectedTopics(new Set());
    setExpandedSkills(new Set());
  }, [domain]);

  const availableSkillGroups = domain === "math"
    ? MATH_SKILLS
    : domain === "reading_and_writing"
    ? RW_SKILLS
    : [...MATH_SKILLS, ...RW_SKILLS];

  const toggleTopic = (topic: string) => {
    setSelectedTopics(prev => {
      const next = new Set(prev);
      if (next.has(topic)) next.delete(topic); else next.add(topic);
      return next;
    });
  };

  const toggleSkillGroup = (skill: string) => {
    const group = availableSkillGroups.find(g => g.skill === skill);
    if (!group) return;
    const allSelected = group.subtopics.every(s => selectedTopics.has(s));
    setSelectedTopics(prev => {
      const next = new Set(prev);
      if (allSelected) {
        group.subtopics.forEach(s => next.delete(s));
        next.delete(skill);
      } else {
        group.subtopics.forEach(s => next.add(s));
      }
      return next;
    });
  };

  const selectAllTopics = () => {
    const all = new Set<string>();
    availableSkillGroups.forEach(g => g.subtopics.forEach(s => all.add(s)));
    setSelectedTopics(all);
  };

  const clearAllTopics = () => setSelectedTopics(new Set());

  const toggleSkillExpand = (skill: string) => {
    setExpandedSkills(prev => {
      const next = new Set(prev);
      if (next.has(skill)) next.delete(skill); else next.add(skill);
      return next;
    });
  };

  const startQuickPractice = async (quick: QuickMode) => {
    setMode("loading");
    setError(null);
    setSpeedrunMode(quick === "speedrun");
    try {
      const params = new URLSearchParams({ count: "15" });
      if (quick === "hard") {
        params.set("difficulty", "H");
      } else if (quick === "weak") {
        const weakSkills = getWeakSkills(2);
        if (weakSkills.length > 0) {
          params.set("skill", weakSkills[0]);
        }
      }
      // speedrun and random use defaults (mixed, medium)
      const res = await fetch(`/api/questions?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to load questions");
      const data = await res.json();
      const qs: Question[] = data.questions ?? [];
      if (qs.length === 0) throw new Error("No questions found.");
      setQuestions(qs);
      setMode("active");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start practice");
      setMode("idle");
    }
  };

  const startPractice = async () => {
    setSpeedrunMode(false);
    setMode("loading");
    setError(null);

    try {
      const fetchCount = isAdaptive ? 60 : count;
      const params = new URLSearchParams({ count: String(fetchCount) });
      if (domain !== "mixed") params.set("domain", domain);
      if (!isAdaptive && difficulty !== "mixed") params.set("difficulty", difficulty);

      // For multi-topic: use the first selected topic for initial fetch (server-side),
      // then filter client-side for multiple topics
      if (selectedTopics.size === 1) {
        params.set("skill", Array.from(selectedTopics)[0]);
      }

      const res = await fetch(`/api/questions?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to load questions");

      const data = await res.json();
      let qs: Question[] = data.questions || [];

      if (qs.length === 0) throw new Error("No questions found. Try broadening your selection.");

      // Client-side multi-topic filter
      if (selectedTopics.size > 1) {
        const filtered = qs.filter(q =>
          Array.from(selectedTopics).some(t =>
            q.skill?.toLowerCase().includes(t.toLowerCase()) || t.toLowerCase().includes(q.skill?.toLowerCase() || "")
          )
        );
        if (filtered.length > 0) qs = filtered;
      }

      setQuestions(qs);
      setMode("active");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start practice");
      setMode("idle");
    }
  };

  if (mode === "active" && questions.length > 0) {
    return (
      <PracticeSession
        questions={questions}
        calmMode={calmMode}
        isAdaptive={isAdaptive}
        speedrunMode={speedrunMode}
        onClose={() => { setMode("idle"); setSpeedrunMode(false); }}
        onComplete={() => {}}
      />
    );
  }

  return (
    <div className="pt-24 pb-16 min-h-screen">
      <div className="max-w-2xl mx-auto px-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-10">
          <div className="inline-flex p-4 rounded-2xl bg-[#F59E0B]/10 border border-[#F59E0B]/20 mb-4 animate-glow-breathe">
            <Flame className="w-8 h-8 text-[#F59E0B]" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Practice Rush</h1>
          <p className="text-slate-400">Target any topic or go broad. Real SAT-style questions, instant feedback.</p>
        </motion.div>

        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl flex items-start gap-3">
            <X className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}

        {/* Quick Launch */}
        <div className="mb-5">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Quick Launch</p>
          <div className="grid grid-cols-2 gap-3">
            {[
              {
                mode: "random" as QuickMode,
                icon: Shuffle,
                label: "Random Drill",
                sub: "10 mixed questions, start now",
                color: "text-[#F59E0B]",
                bg: "bg-[#F59E0B]/8 hover:bg-[#F59E0B]/15",
                border: "border-[#F59E0B]/20 hover:border-[#F59E0B]/40",
              },
              {
                mode: "weak" as QuickMode,
                icon: Target,
                label: "Fix Weak Spots",
                sub: "Target your lowest-scoring skills",
                color: "text-red-400",
                bg: "bg-red-500/8 hover:bg-red-500/15",
                border: "border-red-500/20 hover:border-red-500/40",
              },
              {
                mode: "speedrun" as QuickMode,
                icon: Timer,
                label: "Speedrun",
                sub: "45 seconds per question",
                color: "text-violet-400",
                bg: "bg-violet-500/8 hover:bg-violet-500/15",
                border: "border-violet-500/20 hover:border-violet-500/40",
              },
              {
                mode: "hard" as QuickMode,
                icon: Flame,
                label: "Hard Mode",
                sub: "Hard questions only",
                color: "text-orange-400",
                bg: "bg-orange-500/8 hover:bg-orange-500/15",
                border: "border-orange-500/20 hover:border-orange-500/40",
              },
            ].map(({ mode: qMode, icon: Icon, label, sub, color, bg, border }) => (
              <button
                key={qMode}
                onClick={() => startQuickPractice(qMode)}
                disabled={mode === "loading"}
                className={cn(
                  "p-4 rounded-xl border text-left transition-all",
                  bg, border,
                  mode === "loading" && "opacity-50 cursor-not-allowed"
                )}
              >
                <Icon className={cn("w-5 h-5 mb-2", color)} />
                <div className="text-sm font-semibold text-white">{label}</div>
                <div className="text-xs text-slate-500 mt-0.5">{sub}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Divider */}
        <div className="flex items-center gap-3 mb-5">
          <div className="flex-1 h-px bg-white/8" />
          <span className="text-xs text-slate-600 font-medium">or configure your own</span>
          <div className="flex-1 h-px bg-white/8" />
        </div>

        {/* Main settings */}
        <Card className="mb-4">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings2 className="w-5 h-5 text-slate-400" />
              Session Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Section */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300">Section</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { value: "mixed", label: "Mixed", icon: Zap },
                  { value: "math", label: "Math", icon: Calculator },
                  { value: "reading_and_writing", label: "R&W", icon: BookOpen },
                ].map(({ value, label, icon: Icon }) => (
                  <button
                    key={value}
                    onClick={() => setDomain(value as typeof domain)}
                    className={cn(
                      "flex flex-col items-center gap-1.5 p-3 rounded-xl border transition-all text-sm font-medium",
                      domain === value
                        ? "bg-[#F59E0B]/10 border-[#F59E0B]/40 text-[#F59E0B]"
                        : "bg-white/3 border-white/8 text-slate-400 hover:border-white/15"
                    )}
                  >
                    <Icon className="w-4 h-4" />
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Difficulty */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300">Difficulty</label>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { value: "mixed", label: "Mixed" },
                  { value: "E", label: "Easy" },
                  { value: "M", label: "Medium" },
                  { value: "H", label: "Hard" },
                ].map(({ value, label }) => (
                  <button
                    key={value}
                    onClick={() => setDifficulty(value as typeof difficulty)}
                    className={cn(
                      "py-2 px-3 rounded-xl border text-sm font-medium transition-all",
                      difficulty === value
                        ? value === "E" ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-400"
                          : value === "M" ? "bg-amber-500/15 border-amber-500/40 text-amber-400"
                          : value === "H" ? "bg-red-500/15 border-red-500/40 text-red-400"
                          : "bg-[#F59E0B]/10 border-[#F59E0B]/40 text-[#F59E0B]"
                        : "bg-white/3 border-white/8 text-slate-400 hover:border-white/15"
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Count */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300">Questions: {count}</label>
              <input
                type="range" min={5} max={40} step={5} value={count}
                onChange={(e) => setCount(parseInt(e.target.value))}
                className="w-full accent-[#F59E0B]"
              />
              <div className="flex justify-between text-xs text-slate-600">
                <span>5 (quick)</span><span>20 (standard)</span><span>40 (full)</span>
              </div>
            </div>

            {/* Calm mode */}
            <div className="flex items-center justify-between p-3 bg-[#14B8A6]/5 rounded-xl border border-[#14B8A6]/15">
              <div className="flex items-center gap-2">
                <Wind className="w-4 h-4 text-[#14B8A6]" />
                <div>
                  <div className="text-sm font-medium text-slate-200">Calm Mode</div>
                  <div className="text-xs text-slate-500">Breathing reminders, gentle pacing</div>
                </div>
              </div>
              <button
                onClick={() => setCalmMode(!calmMode)}
                className={cn("w-11 h-6 rounded-full transition-all duration-200 relative", calmMode ? "bg-[#14B8A6]" : "bg-white/10")}
              >
                <div className="absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all duration-200" style={{ left: calmMode ? "calc(100% - 22px)" : "2px" }} />
              </button>
            </div>

            {/* Adaptive mode */}
            <div className="flex items-center justify-between p-3 bg-violet-500/5 rounded-xl border border-violet-500/15">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-violet-400" />
                <div>
                  <div className="text-sm font-medium text-slate-200">Adaptive Mode</div>
                  <div className="text-xs text-slate-500">Questions adapt to your performance</div>
                </div>
              </div>
              <button
                onClick={() => setIsAdaptive(!isAdaptive)}
                className={cn("w-11 h-6 rounded-full transition-all duration-200 relative", isAdaptive ? "bg-violet-500" : "bg-white/10")}
              >
                <div className="absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all duration-200" style={{ left: isAdaptive ? "calc(100% - 22px)" : "2px" }} />
              </button>
            </div>
          </CardContent>
        </Card>

        {/* Topic Focus — multi-select */}
        <Card className="mb-6">
          <button
            onClick={() => setShowTopicFilter(!showTopicFilter)}
            className="w-full p-4 flex items-center justify-between hover:bg-white/3 transition-colors rounded-2xl"
          >
            <div className="flex items-center gap-2 flex-wrap">
              <Target className="w-5 h-5 text-violet-400" />
              <span className="text-sm font-semibold text-white">Topic Focus</span>
              {selectedTopics.size > 0 && (
                <Badge variant="secondary" className="text-xs">
                  {selectedTopics.size} topic{selectedTopics.size !== 1 ? "s" : ""} selected
                </Badge>
              )}
            </div>
            {showTopicFilter ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
          </button>

          {showTopicFilter && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="px-4 pb-4 space-y-3">
              {/* Select all / Clear */}
              <div className="flex items-center gap-2">
                <button onClick={selectAllTopics} className="text-xs px-3 py-1 rounded-full bg-violet-500/10 border border-violet-500/30 text-violet-400 hover:bg-violet-500/20 transition-colors">Select All</button>
                {selectedTopics.size > 0 && (
                  <button onClick={clearAllTopics} className="text-xs px-3 py-1 rounded-full bg-white/5 border border-white/10 text-slate-400 hover:bg-white/10 transition-colors">Clear All</button>
                )}
                <span className="text-xs text-slate-600 ml-auto">{selectedTopics.size} selected</span>
              </div>

              {/* Skill groups */}
              <div className="space-y-2">
                {availableSkillGroups.map(({ skill, icon, subtopics }) => {
                  const allSelected = subtopics.every(s => selectedTopics.has(s));
                  const someSelected = subtopics.some(s => selectedTopics.has(s));
                  const isExpanded = expandedSkills.has(skill);

                  return (
                    <div key={skill} className="rounded-xl border border-white/8 overflow-hidden">
                      <div className="flex items-center gap-2 p-2.5 bg-white/3">
                        <button
                          onClick={() => toggleSkillGroup(skill)}
                          className="flex-shrink-0"
                        >
                          {allSelected
                            ? <CheckSquare className="w-4 h-4 text-violet-400" />
                            : someSelected
                            ? <CheckSquare className="w-4 h-4 text-violet-400/50" />
                            : <Square className="w-4 h-4 text-slate-600" />
                          }
                        </button>
                        <span className="text-sm">{icon}</span>
                        <span className="text-sm font-semibold text-white flex-1">{skill}</span>
                        <span className="text-xs text-slate-600">{subtopics.filter(s => selectedTopics.has(s)).length}/{subtopics.length}</span>
                        <button onClick={() => toggleSkillExpand(skill)} className="text-slate-500 hover:text-white transition-colors p-0.5">
                          {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                        </button>
                      </div>

                      {isExpanded && (
                        <div className="border-t border-white/8 px-3 py-2 space-y-1">
                          {subtopics.map(sub => (
                            <button
                              key={sub}
                              onClick={() => toggleTopic(sub)}
                              className={cn(
                                "w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs text-left transition-all",
                                selectedTopics.has(sub)
                                  ? "bg-teal-500/10 text-teal-300"
                                  : "text-slate-500 hover:text-slate-300 hover:bg-white/5"
                              )}
                            >
                              {selectedTopics.has(sub)
                                ? <CheckSquare className="w-3.5 h-3.5 text-teal-400 flex-shrink-0" />
                                : <Square className="w-3.5 h-3.5 text-slate-600 flex-shrink-0" />
                              }
                              {sub}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}
        </Card>

        {/* Summary + Start */}
        <div className="flex items-center justify-center gap-4 mb-6 text-sm text-slate-500 flex-wrap">
          <span>{count} questions</span>
          <span>·</span>
          <span>~{Math.round(count * 1.5)}–{count * 2} min</span>
          {selectedTopics.size > 0 && (
            <><span>·</span><span className="text-violet-400">{selectedTopics.size} topic{selectedTopics.size > 1 ? "s" : ""}</span></>
          )}
          {calmMode && (
            <><span>·</span><Badge variant="calm" className="gap-1"><Wind className="w-3 h-3" />Calm</Badge></>
          )}
        </div>

        <Button size="xl" className="w-full" onClick={startPractice} loading={mode === "loading"}>
          <Flame className="w-5 h-5" />
          {mode === "loading" ? "Loading questions..." : "Start Practice Session"}
        </Button>

        <div className="mt-6 grid grid-cols-2 gap-3">
          <a
            href="/mock-test"
            className="flex flex-col items-center gap-1.5 p-4 rounded-xl border border-white/10 bg-white/3 hover:bg-white/6 hover:border-white/20 transition-all text-center"
          >
            <span className="text-xl">📝</span>
            <span className="text-sm font-semibold text-white">Full Mock Test</span>
            <span className="text-xs text-slate-500">Bluebook format, 4 modules</span>
          </a>
          <a
            href="/questionbank"
            className="flex flex-col items-center gap-1.5 p-4 rounded-xl border border-white/10 bg-white/3 hover:bg-white/6 hover:border-white/20 transition-all text-center"
          >
            <span className="text-xl">🏦</span>
            <span className="text-sm font-semibold text-white">Question Bank</span>
            <span className="text-xs text-slate-500">Browse all questions</span>
          </a>
        </div>

        <p className="text-center text-xs text-slate-600 mt-4">
          Questions from CollegeBoard SAT Suite Question Bank + original practice set
        </p>
      </div>
    </div>
  );
}
