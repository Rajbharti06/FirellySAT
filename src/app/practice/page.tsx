"use client";

export const dynamic = "force-dynamic";

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Flame, Settings2, Wind, Calculator, BookOpen, Zap, X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { PracticeSession } from "@/components/practice/practice-session";
import { getSettings } from "@/lib/storage";
import type { Question, QuestionDomain, QuestionDifficulty } from "@/types";

type PracticeMode = "idle" | "loading" | "active";

export default function PracticePage() {
  const [mode, setMode] = useState<PracticeMode>("idle");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [calmMode, setCalmMode] = useState(false);
  const [domain, setDomain] = useState<QuestionDomain | "mixed">("mixed");
  const [difficulty, setDifficulty] = useState<QuestionDifficulty | "mixed">("mixed");
  const [count, setCount] = useState(10);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const settings = getSettings();
    setCalmMode(settings.calmModeDefault);
    setDomain(settings.preferredDomain);
    setDifficulty(settings.preferredDifficulty);
  }, []);

  const startPractice = async () => {
    setMode("loading");
    setError(null);

    try {
      const params = new URLSearchParams({ count: String(count) });
      if (domain !== "mixed") params.set("domain", domain);
      if (difficulty !== "mixed") params.set("difficulty", difficulty);

      const res = await fetch(`/api/questions?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to load questions");

      const data = await res.json();
      if (!data.questions || data.questions.length === 0) {
        throw new Error("No questions found for these filters");
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
        onClose={() => setMode("idle")}
        onComplete={() => {
          // Session auto-saves, just return to idle after a moment
          setTimeout(() => setMode("idle"), 500);
        }}
      />
    );
  }

  return (
    <div className="pt-24 pb-16 min-h-screen">
      <div className="max-w-2xl mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-10"
        >
          <div className="inline-flex p-4 rounded-2xl bg-[#F59E0B]/10 border border-[#F59E0B]/20 mb-4 animate-glow-breathe">
            <Flame className="w-8 h-8 text-[#F59E0B]" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Practice Rush</h1>
          <p className="text-slate-400">
            Practice with real College Board SAT questions. Infinite sessions,
            instant feedback.
          </p>
        </motion.div>

        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl flex items-start gap-3">
            <X className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}

        {/* Config card */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings2 className="w-5 h-5 text-slate-400" />
              Session Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Domain */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300">Section</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { value: "mixed", label: "Mixed", icon: Zap },
                  { value: "math", label: "Math", icon: Calculator },
                  { value: "reading_and_writing", label: "Reading & Writing", icon: BookOpen },
                ].map(({ value, label, icon: Icon }) => (
                  <button
                    key={value}
                    onClick={() => setDomain(value as typeof domain)}
                    className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border transition-all text-sm font-medium ${
                      domain === value
                        ? "bg-[#F59E0B]/10 border-[#F59E0B]/40 text-[#F59E0B]"
                        : "bg-white/3 border-white/8 text-slate-400 hover:border-white/15"
                    }`}
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
                    className={`py-2 px-3 rounded-xl border text-sm font-medium transition-all ${
                      difficulty === value
                        ? value === "E"
                          ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-400"
                          : value === "M"
                          ? "bg-amber-500/15 border-amber-500/40 text-amber-400"
                          : value === "H"
                          ? "bg-red-500/15 border-red-500/40 text-red-400"
                          : "bg-[#F59E0B]/10 border-[#F59E0B]/40 text-[#F59E0B]"
                        : "bg-white/3 border-white/8 text-slate-400 hover:border-white/15"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Count */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300">
                Questions: {count}
              </label>
              <input
                type="range"
                min={5}
                max={40}
                step={5}
                value={count}
                onChange={(e) => setCount(parseInt(e.target.value))}
                className="w-full accent-[#F59E0B]"
              />
              <div className="flex justify-between text-xs text-slate-600">
                <span>5 (quick)</span>
                <span>20 (standard)</span>
                <span>40 (full)</span>
              </div>
            </div>

            {/* Calm mode toggle */}
            <div className="flex items-center justify-between p-3 bg-[#14B8A6]/5 rounded-xl border border-[#14B8A6]/15">
              <div className="flex items-center gap-2">
                <Wind className="w-4 h-4 text-[#14B8A6]" />
                <div>
                  <div className="text-sm font-medium text-slate-200">
                    Calm Mode
                  </div>
                  <div className="text-xs text-slate-500">
                    Soft pacing, breathing reminders, gentle encouragement
                  </div>
                </div>
              </div>
              <button
                onClick={() => setCalmMode(!calmMode)}
                className={`w-11 h-6 rounded-full transition-all duration-200 relative ${
                  calmMode ? "bg-[#14B8A6]" : "bg-white/10"
                }`}
              >
                <div
                  className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all duration-200 ${
                    calmMode ? "left-5.5" : "left-0.5"
                  }`}
                  style={{ left: calmMode ? "calc(100% - 22px)" : "2px" }}
                />
              </button>
            </div>
          </CardContent>
        </Card>

        {/* Estimated time */}
        <div className="flex items-center justify-center gap-4 mb-6 text-sm text-slate-500">
          <span>~{count} questions</span>
          <span>·</span>
          <span>~{Math.round(count * 1.5)}–{count * 2} minutes</span>
          {calmMode && (
            <>
              <span>·</span>
              <Badge variant="calm" className="gap-1">
                <Wind className="w-3 h-3" />
                Calm Mode On
              </Badge>
            </>
          )}
        </div>

        <Button
          size="xl"
          className="w-full"
          onClick={startPractice}
          loading={mode === "loading"}
        >
          <Flame className="w-5 h-5" />
          {mode === "loading" ? "Loading questions..." : "Start Practice Session"}
        </Button>

        <p className="text-center text-xs text-slate-600 mt-3">
          Questions sourced from the official College Board SAT Suite Question
          Bank
        </p>
      </div>
    </div>
  );
}
