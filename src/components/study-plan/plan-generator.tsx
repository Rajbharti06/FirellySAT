"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles, Loader2, Calendar, Target, Clock, Brain, Wind,
  ChevronDown, ChevronUp, Upload, FileSearch, CheckCircle,
  AlertCircle, X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { saveStudyPlan } from "@/lib/storage";
import type { StudyPlan, StudentProfile, TestAnalysis } from "@/types";

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
  "Adding coaching strategies...",
  "Finalizing your personalized plan...",
];

function GeneratingState() {
  const [progress, setProgress] = useState(0);
  const [stepIndex, setStepIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((p) => {
        const next = p + 3;
        if (next >= 90) { clearInterval(interval); return 90; }
        if (next % 18 === 0) setStepIndex((i) => Math.min(i + 1, GENERATING_STEPS.length - 1));
        return next;
      });
    }, 300);
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

// ── Test Analysis Upload Card ──────────────────────────────────────────────

function TestUploadCard({
  testAnalysis,
  onAnalysis,
  onClear,
}: {
  testAnalysis: TestAnalysis | null;
  onAnalysis: (a: TestAnalysis) => void;
  onClear: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  const processFile = async (file: File) => {
    if (!file) return;

    const allowed = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif"];
    if (!allowed.includes(file.type)) {
      setUploadError("Please upload a JPG, PNG, or WEBP image. For a PDF, take a screenshot first (Win+Shift+S on Windows).");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setUploadError("File too large — please use an image under 5 MB.");
      return;
    }

    setFileName(file.name);
    setAnalyzing(true);
    setUploadError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/analyze-test", { method: "POST", body: formData });
      const data = await res.json();

      if (!res.ok || data.error) {
        throw new Error(data.error || "Analysis failed");
      }

      onAnalysis(data as TestAnalysis);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Could not analyze — please try again.");
      setFileName(null);
    } finally {
      setAnalyzing(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  };

  const handleClear = () => {
    setFileName(null);
    setUploadError(null);
    if (inputRef.current) inputRef.current.value = "";
    onClear();
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <FileSearch className="w-5 h-5 text-violet-400" />
            Upload Your Practice Test
          </CardTitle>
          <Badge variant="secondary" className="text-xs">Optional</Badge>
        </div>
        <CardDescription>
          Upload a score report or answer sheet screenshot — AI will analyze your exact weak spots and build the plan around them.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {testAnalysis ? (
          <TestAnalysisDisplay analysis={testAnalysis} fileName={fileName} onClear={handleClear} />
        ) : analyzing ? (
          <div className="flex flex-col items-center gap-3 py-6">
            <Loader2 className="w-8 h-8 text-violet-400 animate-spin" />
            <p className="text-sm text-slate-400">Analyzing your test results...</p>
            <p className="text-xs text-slate-600">Vision AI is reading your score report</p>
          </div>
        ) : (
          <div className="space-y-3">
            <label
              htmlFor="test-upload"
              className={cn(
                "flex flex-col items-center justify-center w-full h-36 border-2 border-dashed rounded-xl cursor-pointer transition-all duration-200",
                dragging
                  ? "border-violet-400/60 bg-violet-500/10"
                  : "border-white/10 bg-white/2 hover:border-violet-400/30 hover:bg-white/4"
              )}
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
            >
              <Upload className="w-8 h-8 text-slate-500 mb-2" />
              <p className="text-sm text-slate-400 font-medium">Click to upload or drag & drop</p>
              <p className="text-xs text-slate-600 mt-1">PNG, JPG, WEBP · Max 5 MB</p>
              <input
                id="test-upload"
                ref={inputRef}
                type="file"
                accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
                className="hidden"
                onChange={handleFileChange}
              />
            </label>

            <p className="text-xs text-slate-600 text-center">
              📄 Have a PDF? Take a screenshot (<span className="text-slate-500">Win+Shift+S</span>) and upload that image.
            </p>

            {uploadError && (
              <div className="flex items-start gap-2 p-3 bg-red-500/8 border border-red-500/20 rounded-lg">
                <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-red-400">{uploadError}</p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function TestAnalysisDisplay({
  analysis,
  fileName,
  onClear,
}: {
  analysis: TestAnalysis;
  fileName: string | null;
  onClear: () => void;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-emerald-400" />
          <span className="text-sm font-medium text-white">Test analyzed</span>
          {fileName && <span className="text-xs text-slate-500">{fileName}</span>}
        </div>
        <button
          onClick={onClear}
          className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-300 transition-colors"
        >
          <X className="w-3 h-3" />
          Remove
        </button>
      </div>

      {/* Score breakdown */}
      {(analysis.totalScore || analysis.mathScore || analysis.readingWritingScore) && (
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-white/5 rounded-lg p-2.5 text-center">
            <div className="text-xl font-bold text-[#F59E0B]">{analysis.totalScore ?? "—"}</div>
            <div className="text-xs text-slate-500 mt-0.5">Total</div>
          </div>
          <div className="bg-white/5 rounded-lg p-2.5 text-center">
            <div className="text-xl font-bold text-violet-400">{analysis.mathScore ?? "—"}</div>
            <div className="text-xs text-slate-500 mt-0.5">Math</div>
          </div>
          <div className="bg-white/5 rounded-lg p-2.5 text-center">
            <div className="text-xl font-bold text-[#14B8A6]">{analysis.readingWritingScore ?? "—"}</div>
            <div className="text-xs text-slate-500 mt-0.5">R&W</div>
          </div>
        </div>
      )}

      {/* Weak domains */}
      {analysis.weakDomains?.length > 0 && (
        <div>
          <p className="text-xs text-slate-500 mb-1.5 font-medium uppercase tracking-wider">Weak areas detected</p>
          <div className="flex flex-wrap gap-1.5">
            {analysis.weakDomains.map((d, i) => (
              <span
                key={i}
                className="px-2 py-0.5 bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-full"
              >
                {d.domain}{d.correctRate ? ` · ${d.correctRate}` : ""}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Strong domains */}
      {analysis.strongDomains?.length > 0 && (
        <div>
          <p className="text-xs text-slate-500 mb-1.5 font-medium uppercase tracking-wider">Strong areas</p>
          <div className="flex flex-wrap gap-1.5">
            {analysis.strongDomains.map((d, i) => (
              <span
                key={i}
                className="px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs rounded-full"
              >
                {d}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Error pattern summary */}
      {analysis.wrongQuestions?.length > 0 && (
        <div>
          <p className="text-xs text-slate-500 mb-1.5 font-medium uppercase tracking-wider">Error patterns</p>
          <div className="flex flex-wrap gap-1.5">
            {(() => {
              const counts = analysis.wrongQuestions.reduce<Record<string, number>>((acc, q) => {
                acc[q.likelyError] = (acc[q.likelyError] || 0) + 1;
                return acc;
              }, {});
              const colors: Record<string, string> = {
                "concept gap": "bg-amber-500/10 border-amber-500/20 text-amber-400",
                "careless": "bg-blue-500/10 border-blue-500/20 text-blue-400",
                "time pressure": "bg-orange-500/10 border-orange-500/20 text-orange-400",
              };
              return Object.entries(counts).map(([type, count]) => (
                <span key={type} className={cn("px-2 py-0.5 border text-xs rounded-full", colors[type] || "bg-white/5 border-white/10 text-slate-400")}>
                  {type} × {count}
                </span>
              ));
            })()}
          </div>
        </div>
      )}

      {/* AI summary */}
      {analysis.summary && (
        <p className="text-xs text-slate-400 bg-white/3 rounded-lg p-3 border border-white/5 leading-relaxed">
          {analysis.summary}
        </p>
      )}

      <p className="text-xs text-emerald-400 font-medium">
        Weak areas auto-added below. Your plan will be built around these exact gaps.
      </p>
    </div>
  );
}

// ── Main Generator ─────────────────────────────────────────────────────────

export function StudyPlanGenerator() {
  const [step, setStep] = useState<"form" | "generating" | "result">("form");
  const [plan, setPlan] = useState<StudyPlan | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [testAnalysis, setTestAnalysis] = useState<TestAnalysis | null>(null);

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

  const handleAnalysis = (analysis: TestAnalysis) => {
    setTestAnalysis(analysis);
    setProfile((p) => ({
      ...p,
      ...(analysis.totalScore ? { currentScore: analysis.totalScore } : {}),
      weakAreas: analysis.weakDomains?.map(d => d.domain).filter(Boolean) || p.weakAreas,
      strongAreas: analysis.strongDomains?.filter(Boolean) || p.strongAreas,
    }));
  };

  const handleClearAnalysis = () => {
    setTestAnalysis(null);
    setProfile((p) => ({ ...p, weakAreas: [], strongAreas: [] }));
  };

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
        body: JSON.stringify({ profile, testAnalysis }),
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

  if (step === "generating") return <GeneratingState />;
  if (step === "result" && plan) return <PlanDisplay plan={plan} onRegenerate={() => setStep("form")} />;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">
          Build Your <span className="gradient-text">AI Study Plan</span>
        </h1>
        <p className="text-slate-400">
          Tell us about yourself — or upload your practice test for a hyper-personalized plan.
        </p>
      </div>

      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Upload test section */}
      <TestUploadCard
        testAnalysis={testAnalysis}
        onAnalysis={handleAnalysis}
        onClear={handleClearAnalysis}
      />

      {/* Scores */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="w-5 h-5 text-[#F59E0B]" />
            Score Goals
            {testAnalysis?.totalScore && (
              <Badge variant="secondary" className="text-xs ml-1">Auto-filled from test</Badge>
            )}
          </CardTitle>
          <CardDescription>Where are you now and where do you want to be?</CardDescription>
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
              onChange={(e) => setProfile((p) => ({ ...p, currentScore: parseInt(e.target.value) || 0 }))}
              placeholder="e.g. 1050"
            />
            <p className="text-xs text-slate-500">Estimated if you haven&apos;t taken it yet</p>
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
              onChange={(e) => setProfile((p) => ({ ...p, targetScore: parseInt(e.target.value) || 0 }))}
              placeholder="e.g. 1400"
            />
            <p className="text-xs text-[#F59E0B] font-medium">
              +{Math.max(0, profile.targetScore - profile.currentScore)} point improvement
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
              onChange={(e) => setProfile((p) => ({ ...p, testDate: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="daily-time">Daily Study Time</Label>
            <Select
              value={String(profile.dailyStudyMinutes)}
              onValueChange={(v) => setProfile((p) => ({ ...p, dailyStudyMinutes: parseInt(v) }))}
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
            {testAnalysis?.weakDomains?.length ? (
              <Badge variant="secondary" className="text-xs ml-1">Auto-detected from test</Badge>
            ) : null}
          </CardTitle>
          <CardDescription>
            Select the areas you find most challenging — the plan will prioritize these.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {WEAK_AREA_OPTIONS.map((area) => {
              const isFromTest = testAnalysis?.weakDomains?.some(d =>
                d.domain.toLowerCase().includes(area.toLowerCase()) ||
                area.toLowerCase().includes(d.domain.toLowerCase())
              );
              return (
                <button
                  key={area}
                  onClick={() => toggleWeakArea(area)}
                  className={cn(
                    "px-3 py-1.5 rounded-full text-sm border transition-all duration-200 relative",
                    profile.weakAreas.includes(area)
                      ? isFromTest
                        ? "bg-red-500/15 border-red-500/40 text-red-400"
                        : "bg-[#F59E0B]/15 border-[#F59E0B]/40 text-[#F59E0B]"
                      : "bg-white/3 border-white/10 text-slate-400 hover:border-white/20"
                  )}
                >
                  {area}
                  {isFromTest && profile.weakAreas.includes(area) && (
                    <span className="ml-1 text-xs opacity-60">●</span>
                  )}
                </button>
              );
            })}
          </div>
          {testAnalysis?.weakDomains?.length ? (
            <p className="text-xs text-red-400 mt-2">
              Red areas were detected as weak in your uploaded test.
            </p>
          ) : null}
        </CardContent>
      </Card>

      {/* Anxiety level */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wind className="w-5 h-5 text-[#14B8A6]" />
            Test Anxiety Level
          </CardTitle>
          <CardDescription>Be honest — we&apos;ll build anxiety-reduction strategies into your plan</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500">No anxiety</span>
              <span className={cn("text-sm font-medium", ANXIETY_LABELS[profile.anxietyLevel].color)}>
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
                setProfile((p) => ({ ...p, anxietyLevel: parseInt(e.target.value) as 1 | 2 | 3 | 4 | 5 }))
              }
              className="w-full accent-[#F59E0B]"
            />
            <div className="flex justify-between text-xs text-slate-600">
              {[1, 2, 3, 4, 5].map((n) => <span key={n}>{n}</span>)}
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
                onClick={() => setProfile((p) => ({ ...p, learningStyle: style.value as StudentProfile["learningStyle"] }))}
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
        {testAnalysis ? "Generate Plan from My Test Results" : "Generate My Personalized Study Plan"}
      </Button>

      {!profile.testDate && (
        <p className="text-center text-xs text-slate-500">Please set a test date to generate your plan</p>
      )}
    </div>
  );
}

// ── Plan Display ───────────────────────────────────────────────────────────

function PlanDisplay({ plan, onRegenerate }: { plan: StudyPlan; onRegenerate: () => void }) {
  const [expandedWeek, setExpandedWeek] = useState<number | null>(0);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center"
      >
        <div className="w-16 h-16 rounded-full bg-[#F59E0B]/10 border border-[#F59E0B]/20 flex items-center justify-center mx-auto mb-4">
          <Sparkles className="w-8 h-8 text-[#F59E0B]" />
        </div>
        <h2 className="text-3xl font-bold text-white mb-2">Your Study Plan is Ready</h2>
        <p className="text-slate-400 max-w-lg mx-auto">{plan.motivationalMessage}</p>
      </motion.div>

      {/* Stats */}
      <Card variant="glow">
        <CardContent className="p-6">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-[#F59E0B]">
                {plan.studentProfile.currentScore}
                <span className="text-base text-slate-400 mx-1">→</span>
                {plan.targetScore}
              </div>
              <div className="text-xs text-slate-500 mt-1">Score Goal</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-white">{plan.totalWeeks}</div>
              <div className="text-xs text-slate-500 mt-1">Weeks</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-[#14B8A6]">{plan.studentProfile.dailyStudyMinutes}m</div>
              <div className="text-xs text-slate-500 mt-1">Daily</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Key strategies */}
      {plan.keyStrategies?.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Key Strategies</CardTitle></CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {plan.keyStrategies.map((s, i) => (
                <li key={i} className="flex gap-2 text-sm text-slate-300">
                  <span className="text-[#F59E0B] font-bold flex-shrink-0">{i + 1}.</span>
                  {s}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Anxiety tips */}
      {plan.anxietyTips?.length > 0 && (
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
                  setExpandedWeek(expandedWeek === week.weekNumber - 1 ? null : week.weekNumber - 1)
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
                      {week.focusDomains.join(" & ")} · {week.expectedImprovement}
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
                      {week.goals?.length > 0 && (
                        <div className="mt-3 mb-4">
                          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Goals</div>
                          <ul className="space-y-1">
                            {week.goals.map((g, i) => (
                              <li key={i} className="text-sm text-slate-300 flex gap-2">
                                <span className="text-[#F59E0B]">→</span> {g}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {week.dailyTasks?.length > 0 && (
                        <div>
                          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Daily Schedule</div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {week.dailyTasks.map((day, i) => (
                              <div key={i} className="p-3 bg-white/3 rounded-lg border border-white/5">
                                <div className="flex items-center justify-between mb-1.5">
                                  <span className="text-xs font-semibold text-[#F59E0B]">{day.day}</span>
                                  <span className="text-xs text-slate-500">{day.estimatedMinutes}m</span>
                                </div>
                                <ul className="space-y-0.5">
                                  {day.tasks.map((task, j) => (
                                    <li key={j} className="text-xs text-slate-400">• {task}</li>
                                  ))}
                                </ul>
                                {day.encouragement && (
                                  <p className="text-xs text-[#14B8A6] mt-2 italic">&quot;{day.encouragement}&quot;</p>
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
          <CardHeader><CardTitle>Your Daily Routine</CardTitle></CardHeader>
          <CardContent>
            <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-line">{plan.dailyRoutine}</p>
          </CardContent>
        </Card>
      )}

      <div className="flex gap-3">
        <Button variant="secondary" onClick={onRegenerate} className="flex-1">
          Regenerate Plan
        </Button>
        <a
          href="/practice"
          className="flex-1 inline-flex items-center justify-center gap-2 h-10 px-4 text-sm rounded-xl font-semibold bg-[#F59E0B] text-[#050B18] hover:bg-[#FBBF24] shadow-[0_0_16px_rgba(245,158,11,0.3)] transition-all"
        >
          Start Practicing
        </a>
      </div>
    </div>
  );
}
