"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Loader2, Calendar, Target, Clock, Brain, Wind, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { saveStudyPlan } from "@/lib/storage";
import type { StudyPlan, StudentProfile } from "@/types";

const WEAK_AREA_OPTIONS = [
  "Algebra", "Advanced Math", "Problem-Solving & Data Analysis",
  "Geometry & Trigonometry", "Information and Ideas",
  "Craft and Structure", "Expression of Ideas",
  "Standard English Conventions",
];

const ANXIETY_LABELS: Record<number, { label: string; color: string }> = {
  1: { label: "Very Low — I feel relaxed", color: "text-emerald-400" },
  2: { label: "Low — Mild nerves", color: "text-green-400" },
  3: { label: "Medium — Noticeable anxiety", color: "text-amber-400" },
  4: { label: "High — Often stressed", color: "text-orange-400" },
  5: { label: "Very High — Debilitating fear", color: "text-red-400" },
};

const GENERATING_STEPS = [
  "Analyzing your score goals...",
  "Mapping your weak areas...",
  "Building your weekly schedule...",
  "Adding anxiety-reduction strategies...",
  "Finalizing your personalized plan...",
];

function GeneratingState() {
  const [progress, setProgress] = useState(0);
  const [stepIndex, setStepIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((p) => {
        const next = p + 2;
        if (next >= 90) { clearInterval(interval); return 90; }
        if (next % 20 === 0) setStepIndex((i) => Math.min(i + 1, GENERATING_STEPS.length - 1));
        return next;
      });
    }, 400);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] gap-6">
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
      >
        <Sparkles className="w-12 h-12 text-[#F59E0B]" />
      </motion.div>
      <div className="text-center">
        <h3 className="text-xl font-bold text-white mb-2">
          Crafting your personalized plan...
        </h3>
        <AnimatePresence mode="wait">
          <motion.p
            key={stepIndex}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.3 }}
            className="text-slate-400 text-sm max-w-sm"
          >
            {GENERATING_STEPS[stepIndex]}
          </motion.p>
        </AnimatePresence>
      </div>
      <div className="w-64 space-y-1">
        <Progress value={progress} />
        <p className="text-xs text-slate-600 text-right">{progress}%</p>
      </div>
    </div>
  );
}

export function StudyPlanGenerator() {
  const [step, setStep] = useState<"form" | "generating" | "result">("form");
  const [plan, setPlan] = useState<StudyPlan | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expandedWeek, setExpandedWeek] = useState<number | null>(0);

  const [profile, setProfile] = useState<StudentProfile>({
    currentScore: 1000,
    targetScore: 1400,
    testDate: "",
    dailyStudyMinutes: 30,
    weakAreas: [],
    strongAreas: [],
    anxietyLevel: 3,
    learningStyle: "mixed",
  });

  const toggleWeakArea = (area: string) => {
    setProfile((p) => ({
      ...p,
      weakAreas: p.weakAreas.includes(area)
        ? p.weakAreas.filter((a) => a !== area)
        : [...p.weakAreas, area],
    }));
  };

  const handleGenerate = async () => {
    setStep("generating");
    setError(null);

    try {
      const res = await fetch("/api/study-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profile }),
      });

      if (!res.ok) {
        throw new Error(`Failed to generate plan: ${res.statusText}`);
      }

      const data: StudyPlan = await res.json();
      setPlan(data);
      saveStudyPlan(data);
      setStep("result");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate plan. Please try again.");
      setStep("form");
    }
  };

  if (step === "generating") {
    return <GeneratingState />;
  }

  if (step === "result" && plan) {
    return <PlanDisplay plan={plan} onRegenerate={() => setStep("form")} />;
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">
          Build Your <span className="gradient-text">AI Study Plan</span>
        </h1>
        <p className="text-slate-400">
          Tell us about yourself and we&apos;ll create a personalized roadmap to your
          target score.
        </p>
      </div>

      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Scores */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="w-5 h-5 text-[#F59E0B]" />
            Score Goals
          </CardTitle>
          <CardDescription>
            Where are you now and where do you want to be?
          </CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="current-score">Current Score</Label>
            <Input
              id="current-score"
              type="number"
              min={400}
              max={1600}
              step={10}
              value={profile.currentScore}
              onChange={(e) =>
                setProfile((p) => ({
                  ...p,
                  currentScore: parseInt(e.target.value) || 0,
                }))
              }
              placeholder="e.g. 1050"
            />
            <p className="text-xs text-slate-500">
              Estimated if you haven&apos;t taken it yet
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="target-score">Target Score</Label>
            <Input
              id="target-score"
              type="number"
              min={400}
              max={1600}
              step={10}
              value={profile.targetScore}
              onChange={(e) =>
                setProfile((p) => ({
                  ...p,
                  targetScore: parseInt(e.target.value) || 0,
                }))
              }
              placeholder="e.g. 1400"
            />
            <p className="text-xs text-[#F59E0B] text-xs font-medium">
              +{Math.max(0, profile.targetScore - profile.currentScore)} point
              improvement
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Schedule */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-violet-400" />
            Test Schedule
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="test-date">Test Date</Label>
            <Input
              id="test-date"
              type="date"
              value={profile.testDate}
              min={new Date().toISOString().split("T")[0]}
              onChange={(e) =>
                setProfile((p) => ({ ...p, testDate: e.target.value }))
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="daily-time">Daily Study Time</Label>
            <Select
              value={String(profile.dailyStudyMinutes)}
              onValueChange={(v) =>
                setProfile((p) => ({
                  ...p,
                  dailyStudyMinutes: parseInt(v),
                }))
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[15, 20, 30, 45, 60, 90, 120, 150, 180, 210, 240, 270, 300].map((m) => (
                  <SelectItem key={m} value={String(m)}>
                    {m >= 60 ? `${Math.floor(m / 60)}h${m % 60 ? ` ${m % 60}m` : ""}` : `${m} minutes`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Weak areas */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="w-5 h-5 text-pink-400" />
            Weak Areas
          </CardTitle>
          <CardDescription>
            Select the areas you find most challenging (the plan will prioritize
            these)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {WEAK_AREA_OPTIONS.map((area) => (
              <button
                key={area}
                onClick={() => toggleWeakArea(area)}
                className={cn(
                  "px-3 py-1.5 rounded-full text-sm border transition-all duration-200",
                  profile.weakAreas.includes(area)
                    ? "bg-[#F59E0B]/15 border-[#F59E0B]/40 text-[#F59E0B]"
                    : "bg-white/3 border-white/10 text-slate-400 hover:border-white/20"
                )}
              >
                {area}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Anxiety level */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wind className="w-5 h-5 text-[#14B8A6]" />
            Test Anxiety Level
          </CardTitle>
          <CardDescription>
            Be honest — we&apos;ll build anxiety-reduction strategies into your plan
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500">No anxiety</span>
              <span
                className={cn(
                  "text-sm font-medium",
                  ANXIETY_LABELS[profile.anxietyLevel].color
                )}
              >
                {ANXIETY_LABELS[profile.anxietyLevel].label}
              </span>
              <span className="text-xs text-slate-500">Severe</span>
            </div>
            <input
              type="range"
              min={1}
              max={5}
              value={profile.anxietyLevel}
              onChange={(e) =>
                setProfile((p) => ({
                  ...p,
                  anxietyLevel: parseInt(e.target.value) as 1 | 2 | 3 | 4 | 5,
                }))
              }
              className="w-full accent-[#F59E0B]"
            />
            <div className="flex justify-between text-xs text-slate-600">
              {[1, 2, 3, 4, 5].map((n) => (
                <span key={n}>{n}</span>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Learning style */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-[#F59E0B]" />
            Learning Style
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-2">
            {[
              { value: "practice-heavy", label: "Practice Heavy", desc: "Lots of questions" },
              { value: "conceptual", label: "Conceptual", desc: "Learn the theory first" },
              { value: "visual", label: "Visual", desc: "Diagrams & examples" },
              { value: "mixed", label: "Mixed", desc: "Balanced approach" },
            ].map((style) => (
              <button
                key={style.value}
                onClick={() =>
                  setProfile((p) => ({
                    ...p,
                    learningStyle: style.value as StudentProfile["learningStyle"],
                  }))
                }
                className={cn(
                  "p-3 rounded-xl border text-left transition-all",
                  profile.learningStyle === style.value
                    ? "bg-[#F59E0B]/10 border-[#F59E0B]/40"
                    : "bg-white/3 border-white/8 hover:border-white/15"
                )}
              >
                <div className="text-sm font-medium text-white">{style.label}</div>
                <div className="text-xs text-slate-500">{style.desc}</div>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      <Button
        size="xl"
        className="w-full"
        onClick={handleGenerate}
        disabled={!profile.testDate || profile.targetScore <= profile.currentScore}
      >
        <Sparkles className="w-5 h-5" />
        Generate My Personalized Study Plan
      </Button>

      {!profile.testDate && (
        <p className="text-center text-xs text-slate-500">
          Please set a test date to generate your plan
        </p>
      )}
    </div>
  );
}

// Plan display component
function PlanDisplay({ plan, onRegenerate }: { plan: StudyPlan; onRegenerate: () => void }) {
  const [expandedWeek, setExpandedWeek] = useState<number | null>(0);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center"
      >
        <div className="w-16 h-16 rounded-full bg-[#F59E0B]/10 border border-[#F59E0B]/20 flex items-center justify-center mx-auto mb-4">
          <Sparkles className="w-8 h-8 text-[#F59E0B]" />
        </div>
        <h2 className="text-3xl font-bold text-white mb-2">
          Your Study Plan is Ready
        </h2>
        <p className="text-slate-400 max-w-lg mx-auto">
          {plan.motivationalMessage}
        </p>
      </motion.div>

      {/* Overview stats */}
      <Card variant="glow">
        <CardContent className="p-6">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-[#F59E0B]">
                {plan.studentProfile.currentScore}
                <span className="text-base text-slate-400 ml-1">→</span>
                {plan.targetScore}
              </div>
              <div className="text-xs text-slate-500 mt-1">Score Goal</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-white">
                {plan.totalWeeks}
              </div>
              <div className="text-xs text-slate-500 mt-1">Weeks</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-[#14B8A6]">
                {plan.studentProfile.dailyStudyMinutes}m
              </div>
              <div className="text-xs text-slate-500 mt-1">Daily</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Key strategies */}
      {plan.keyStrategies && plan.keyStrategies.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Key Strategies</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {plan.keyStrategies.map((s, i) => (
                <li key={i} className="flex gap-2 text-sm text-slate-300">
                  <span className="text-[#F59E0B] font-bold flex-shrink-0">
                    {i + 1}.
                  </span>
                  {s}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Anxiety tips */}
      {plan.anxietyTips && plan.anxietyTips.length > 0 && (
        <Card variant="calm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-[#14B8A6]">
              <Wind className="w-5 h-5" />
              Anxiety Management
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {plan.anxietyTips.map((tip, i) => (
                <li key={i} className="flex gap-2 text-sm text-slate-300">
                  <span className="text-[#14B8A6] flex-shrink-0">•</span>
                  {tip}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Weekly plan */}
      <div>
        <h3 className="text-lg font-bold text-white mb-4">Week-by-Week Plan</h3>
        <div className="space-y-3">
          {plan.weeklyPlan.map((week) => (
            <Card key={week.weekNumber} className="overflow-hidden">
              <button
                className="w-full p-4 flex items-center justify-between text-left hover:bg-white/3 transition-colors"
                onClick={() =>
                  setExpandedWeek(
                    expandedWeek === week.weekNumber - 1
                      ? null
                      : week.weekNumber - 1
                  )
                }
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-[#F59E0B]/10 border border-[#F59E0B]/20 flex items-center justify-center text-sm font-bold text-[#F59E0B]">
                    {week.weekNumber}
                  </div>
                  <div>
                    <div className="font-semibold text-white text-sm">
                      Week {week.weekNumber}: {week.theme}
                    </div>
                    <div className="text-xs text-slate-500">
                      {week.focusDomains.join(" & ")} ·{" "}
                      {week.expectedImprovement}
                    </div>
                  </div>
                </div>
                {expandedWeek === week.weekNumber - 1 ? (
                  <ChevronUp className="w-4 h-4 text-slate-400" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-slate-400" />
                )}
              </button>

              <AnimatePresence>
                {expandedWeek === week.weekNumber - 1 && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="px-4 pb-4 border-t border-white/5">
                      {/* Goals */}
                      {week.goals && week.goals.length > 0 && (
                        <div className="mt-3 mb-4">
                          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                            Goals
                          </div>
                          <ul className="space-y-1">
                            {week.goals.map((g, i) => (
                              <li
                                key={i}
                                className="text-sm text-slate-300 flex gap-2"
                              >
                                <span className="text-[#F59E0B]">→</span> {g}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Daily tasks */}
                      {week.dailyTasks && week.dailyTasks.length > 0 && (
                        <div>
                          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                            Daily Schedule
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {week.dailyTasks.map((day, i) => (
                              <div
                                key={i}
                                className="p-3 bg-white/3 rounded-lg border border-white/5"
                              >
                                <div className="flex items-center justify-between mb-1.5">
                                  <span className="text-xs font-semibold text-[#F59E0B]">
                                    {day.day}
                                  </span>
                                  <span className="text-xs text-slate-500">
                                    {day.estimatedMinutes}m
                                  </span>
                                </div>
                                <ul className="space-y-0.5">
                                  {day.tasks.map((task, j) => (
                                    <li
                                      key={j}
                                      className="text-xs text-slate-400"
                                    >
                                      • {task}
                                    </li>
                                  ))}
                                </ul>
                                {day.encouragement && (
                                  <p className="text-xs text-[#14B8A6] mt-2 italic">
                                    &quot;{day.encouragement}&quot;
                                  </p>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </Card>
          ))}
        </div>
      </div>

      {/* Daily routine */}
      {plan.dailyRoutine && (
        <Card>
          <CardHeader>
            <CardTitle>Your Daily Routine</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-line">
              {plan.dailyRoutine}
            </p>
          </CardContent>
        </Card>
      )}

      <div className="flex gap-3">
        <Button variant="secondary" onClick={onRegenerate} className="flex-1">
          Regenerate Plan
        </Button>
        <a href="/practice" className="flex-1 inline-flex items-center justify-center gap-2 h-10 px-4 text-sm rounded-xl font-semibold bg-[#F59E0B] text-[#050B18] hover:bg-[#FBBF24] shadow-[0_0_16px_rgba(245,158,11,0.3)] transition-all">
          Start Practicing
        </a>
      </div>
    </div>
  );
}
