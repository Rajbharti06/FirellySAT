"use client";

export const dynamic = "force-dynamic";

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Flame, Settings2, Wind, Calculator, BookOpen, Zap, X,
  ChevronDown, ChevronUp, Target, TrendingUp
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PracticeSession } from "@/components/practice/practice-session";
import { getSettings } from "@/lib/storage";
import { cn } from "@/lib/utils";
import type { Question, QuestionDomain, QuestionDifficulty } from "@/types";

type PracticeMode = "idle" | "loading" | "active";

const MATH_SKILLS = [
  { skill: "Algebra", subtopics: ["Linear equations", "Linear functions", "Systems of equations", "Linear inequalities"] },
  { skill: "Advanced Math", subtopics: ["Quadratic equations", "Polynomials", "Exponential functions", "Radical & rational expressions"] },
  { skill: "Problem-Solving and Data Analysis", subtopics: ["Ratios & rates", "Percentages", "Statistics & data", "Probability"] },
  { skill: "Geometry and Trigonometry", subtopics: ["Lines & angles", "Triangles", "Circles", "Volume & surface area", "Trigonometry"] },
];

const RW_SKILLS = [
  { skill: "Information and Ideas", subtopics: ["Main idea & details", "Command of evidence", "Inferences"] },
  { skill: "Craft and Structure", subtopics: ["Words in context", "Text structure & purpose", "Cross-text connections"] },
  { skill: "Expression of Ideas", subtopics: ["Rhetorical synthesis", "Transitions"] },
  { skill: "Standard English Conventions", subtopics: ["Subject-verb agreement", "Punctuation", "Sentence boundaries", "Pronoun usage", "Parallel structure"] },
];

export default function PracticePage() {
  const [mode, setMode] = useState<PracticeMode>("idle");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [calmMode, setCalmMode] = useState(false);
  const [isAdaptive, setIsAdaptive] = useState(false);
  const [domain, setDomain] = useState<QuestionDomain | "mixed">("mixed");
  const [difficulty, setDifficulty] = useState<QuestionDifficulty | "mixed">("mixed");
  const [count, setCount] = useState(10);
  const [selectedSkill, setSelectedSkill] = useState<string | null>(null);
  const [selectedSubtopic, setSelectedSubtopic] = useState<string | null>(null);
  const [showTopicFilter, setShowTopicFilter] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const settings = getSettings();
    setCalmMode(settings.calmModeDefault);
    setDomain(settings.preferredDomain);
    setDifficulty(settings.preferredDifficulty);
  }, []);

  // Reset skill when domain changes
  useEffect(() => {
    setSelectedSkill(null);
    setSelectedSubtopic(null);
  }, [domain]);

  // Reset subtopic when skill changes
  useEffect(() => {
    setSelectedSubtopic(null);
  }, [selectedSkill]);

  const availableSkills =
    domain === "math" ? MATH_SKILLS :
    domain === "reading_and_writing" ? RW_SKILLS :
    [...MATH_SKILLS, ...RW_SKILLS];

  const selectedSkillData = availableSkills.find((s) => s.skill === selectedSkill);

  const startPractice = async () => {
    setMode("loading");
    setError(null);

    try {
      // For adaptive mode, fetch a larger pool of mixed-difficulty questions
      const fetchCount = isAdaptive ? 60 : count;
      const params = new URLSearchParams({ count: String(fetchCount) });
      if (domain !== "mixed") params.set("domain", domain);
      if (!isAdaptive && difficulty !== "mixed") params.set("difficulty", difficulty);
      if (selectedSkill) params.set("skill", selectedSubtopic || selectedSkill);

      const res = await fetch(`/api/questions?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to load questions");

      const data = await res.json();
      if (!data.questions || data.questions.length === 0) {
        throw new Error("No questions found for these filters. Try broadening your selection.");
      }

      setQuestions(data.questions);
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
        onClose={() => setMode("idle")}
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
          <p className="text-slate-400">
            Target any topic or go broad. Real SAT-style questions, instant feedback.
          </p>
        </motion.div>

        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl flex items-start gap-3">
            <X className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}

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
                <div
                  className="absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all duration-200"
                  style={{ left: calmMode ? "calc(100% - 22px)" : "2px" }}
                />
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

        {/* Topic Focus — collapsible */}
        <Card className="mb-6">
          <button
            onClick={() => setShowTopicFilter(!showTopicFilter)}
            className="w-full p-4 flex items-center justify-between hover:bg-white/3 transition-colors rounded-2xl"
          >
            <div className="flex items-center gap-2">
              <Target className="w-5 h-5 text-violet-400" />
              <span className="text-sm font-semibold text-white">Topic Focus</span>
              {selectedSkill && (
                <Badge variant="secondary" className="text-xs gap-1">
                  {selectedSubtopic || selectedSkill}
                  <X className="w-3 h-3" onClick={(e) => { e.stopPropagation(); setSelectedSkill(null); setSelectedSubtopic(null); }} />
                </Badge>
              )}
            </div>
            {showTopicFilter ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
          </button>

          {showTopicFilter && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="px-4 pb-4 space-y-4">
              {/* Skill picker */}
              <div>
                <p className="text-xs text-slate-500 mb-2 font-medium">Select a skill to focus on:</p>
                <div className="flex flex-wrap gap-2">
                  {availableSkills.map(({ skill }) => (
                    <button
                      key={skill}
                      onClick={() => setSelectedSkill(selectedSkill === skill ? null : skill)}
                      className={cn(
                        "px-3 py-1.5 rounded-full text-xs font-medium border transition-all",
                        selectedSkill === skill
                          ? "bg-violet-500/15 border-violet-500/40 text-violet-400"
                          : "bg-white/5 border-white/10 text-slate-400 hover:border-white/20 hover:text-slate-200"
                      )}
                    >
                      {skill}
                    </button>
                  ))}
                </div>
              </div>

              {/* Subtopic picker */}
              {selectedSkillData && (
                <div>
                  <p className="text-xs text-slate-500 mb-2 font-medium">Narrow to a subtopic (optional):</p>
                  <div className="flex flex-wrap gap-2">
                    {selectedSkillData.subtopics.map((sub) => (
                      <button
                        key={sub}
                        onClick={() => setSelectedSubtopic(selectedSubtopic === sub ? null : sub)}
                        className={cn(
                          "px-2.5 py-1 rounded-full text-xs border transition-all",
                          selectedSubtopic === sub
                            ? "bg-teal-500/15 border-teal-500/40 text-teal-400"
                            : "bg-white/3 border-white/8 text-slate-500 hover:border-white/15 hover:text-slate-300"
                        )}
                      >
                        {sub}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {!selectedSkill && (
                <p className="text-xs text-slate-600 italic">Leave unset for mixed topics</p>
              )}
            </motion.div>
          )}
        </Card>

        {/* Summary + Start */}
        <div className="flex items-center justify-center gap-4 mb-6 text-sm text-slate-500 flex-wrap">
          <span>{count} questions</span>
          <span>·</span>
          <span>~{Math.round(count * 1.5)}–{count * 2} min</span>
          {selectedSkill && (
            <><span>·</span><Badge variant="secondary" className="text-xs">{selectedSubtopic || selectedSkill}</Badge></>
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
