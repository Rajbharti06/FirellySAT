"use client";

import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Flame, Target, TrendingUp, Clock, BookMarked,
  CheckCircle2, Sparkles, Brain, Wind, ArrowRight
} from "lucide-react";
import Link from "next/link";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, RadialBarChart, RadialBar
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  getStats, getDefaultStats, getSavedQuestions, getStudyPlan
} from "@/lib/storage";
import {
  predictScore, getGreeting, getMotivationalQuote,
  formatDuration, domainLabel
} from "@/lib/utils";
import type { PracticeStatistics } from "@/types";

export function DashboardOverview() {
  const [stats, setStats] = useState<PracticeStatistics>(getDefaultStats());
  const [savedCount, setSavedCount] = useState(0);
  const [hasStudyPlan, setHasStudyPlan] = useState(false);
  const [quote, setQuote] = useState("");

  useEffect(() => {
    setStats(getStats());
    setSavedCount(getSavedQuestions().length);
    setHasStudyPlan(!!getStudyPlan());
    setQuote(getMotivationalQuote());
  }, []);

  const prediction = predictScore(stats);
  const accuracy =
    stats.totalQuestionsAttempted > 0
      ? Math.round(
          (stats.totalQuestionsCorrect / stats.totalQuestionsAttempted) * 100
        )
      : 0;

  const weeklyGoalProgress = Math.min(
    100,
    (stats.weeklyMinutesPracticed / stats.weeklyGoalMinutes) * 100
  );

  // Build chart data from recent sessions
  const chartData = stats.sessions
    .slice(0, 14)
    .reverse()
    .map((s, i) => ({
      day: `Day ${i + 1}`,
      accuracy: s.questionsAttempted > 0
        ? Math.round((s.questionsCorrect / s.questionsAttempted) * 100)
        : 0,
      questions: s.questionsAttempted,
    }));

  return (
    <div className="space-y-6">
      {/* Greeting */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">{getGreeting()}</h1>
          <p className="text-slate-400 text-sm mt-1 italic">&quot;{quote}&quot;</p>
        </div>
        <div className="flex gap-2">
          <Link href="/study-plan" className="inline-flex items-center gap-2 h-8 px-3 text-xs rounded-xl font-semibold bg-[#142342] text-slate-200 hover:bg-[#1A2C52] border border-white/10 transition-all">
            <Sparkles className="w-4 h-4" />
            Study Plan
          </Link>
          <Link href="/practice" className="inline-flex items-center gap-2 h-8 px-3 text-xs rounded-xl font-semibold bg-[#F59E0B] text-[#050B18] hover:bg-[#FBBF24] shadow-[0_0_12px_rgba(245,158,11,0.3)] transition-all">
            <Flame className="w-4 h-4" />
            Practice
          </Link>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          {
            icon: TrendingUp,
            label: "Predicted Score",
            value: prediction.confidence > 0 ? prediction.predictedScore : "—",
            sub: prediction.confidence > 0 ? `${prediction.confidence}% confidence` : "Start practicing!",
            color: "text-[#F59E0B]",
            iconBg: "bg-[#F59E0B]/10",
          },
          {
            icon: CheckCircle2,
            label: "Total Practiced",
            value: stats.totalQuestionsAttempted,
            sub: `${accuracy}% accuracy`,
            color: "text-emerald-400",
            iconBg: "bg-emerald-400/10",
          },
          {
            icon: Flame,
            label: "Current Streak",
            value: `${stats.currentStreak}d`,
            sub: `Best: ${stats.longestStreak} days`,
            color: "text-orange-400",
            iconBg: "bg-orange-400/10",
          },
          {
            icon: Clock,
            label: "Time Studied",
            value: formatDuration(stats.totalTimeSpentSeconds),
            sub: `This week: ${stats.weeklyMinutesPracticed}m`,
            color: "text-[#14B8A6]",
            iconBg: "bg-[#14B8A6]/10",
          },
        ].map(({ icon: Icon, label, value, sub, color, iconBg }) => (
          <motion.div
            key={label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Card className="h-full">
              <CardContent className="p-4">
                <div className={`inline-flex p-2 rounded-lg ${iconBg} mb-3`}>
                  <Icon className={`w-4 h-4 ${color}`} />
                </div>
                <div className={`text-2xl font-bold ${color}`}>{value}</div>
                <div className="text-xs text-slate-500 mt-0.5">{label}</div>
                <div className="text-xs text-slate-600 mt-1">{sub}</div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Weekly goal */}
      <Card>
        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Target className="w-4 h-4 text-[#F59E0B]" />
              <span className="text-sm font-semibold text-white">
                Weekly Goal
              </span>
            </div>
            <span className="text-sm text-slate-400">
              {stats.weeklyMinutesPracticed}m / {stats.weeklyGoalMinutes}m
            </span>
          </div>
          <Progress
            value={weeklyGoalProgress}
            className="h-2"
            indicatorClassName={
              weeklyGoalProgress >= 100
                ? "bg-gradient-to-r from-emerald-500 to-emerald-400"
                : "bg-gradient-to-r from-[#F59E0B] to-[#FCD34D]"
            }
          />
          {weeklyGoalProgress >= 100 && (
            <p className="text-xs text-emerald-400 mt-2">
              Weekly goal achieved! Amazing work.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Charts + Score breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Accuracy chart */}
        <Card>
          <CardHeader>
            <CardTitle>Accuracy Over Time</CardTitle>
          </CardHeader>
          <CardContent>
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={180}>
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="accGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#F59E0B" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="day" tick={{ fill: "#64748b", fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis domain={[0, 100]} tick={{ fill: "#64748b", fontSize: 10 }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{ background: "#0F1B35", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 12 }}
                    labelStyle={{ color: "#94a3b8" }}
                    itemStyle={{ color: "#F59E0B" }}
                  />
                  <Area type="monotone" dataKey="accuracy" stroke="#F59E0B" fill="url(#accGrad)" strokeWidth={2} dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[180px] flex items-center justify-center text-slate-500 text-sm">
                Start practicing to see your progress chart
              </div>
            )}
          </CardContent>
        </Card>

        {/* Score prediction */}
        <Card variant="glow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="w-5 h-5 text-violet-400" />
              Score Prediction
            </CardTitle>
          </CardHeader>
          <CardContent>
            {prediction.confidence > 0 ? (
              <div className="space-y-4">
                <div className="text-center">
                  <div className="text-5xl font-bold gradient-text">
                    {prediction.predictedScore}
                  </div>
                  <div className="text-xs text-slate-500 mt-1">
                    Predicted SAT Score ({prediction.confidence}% confidence)
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-violet-500/10 rounded-xl text-center border border-violet-500/20">
                    <div className="text-xl font-bold text-violet-400">
                      {prediction.mathScore}
                    </div>
                    <div className="text-xs text-slate-500">Math</div>
                  </div>
                  <div className="p-3 bg-[#14B8A6]/10 rounded-xl text-center border border-[#14B8A6]/20">
                    <div className="text-xl font-bold text-[#14B8A6]">
                      {prediction.rwScore}
                    </div>
                    <div className="text-xs text-slate-500">R&amp;W</div>
                  </div>
                </div>
                {prediction.weakestSkills.length > 0 && (
                  <div>
                    <p className="text-xs text-slate-500 mb-2">
                      Focus areas to boost score:
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {prediction.weakestSkills.map((s) => (
                        <Badge key={s} variant="danger" className="text-xs">
                          {s}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-4">
                <p className="text-slate-400 text-sm mb-4">
                  Practice more questions to unlock your score prediction
                </p>
                <Link href="/practice" className="inline-flex items-center gap-2 h-8 px-3 text-xs rounded-xl font-semibold bg-[#F59E0B] text-[#050B18] hover:bg-[#FBBF24] transition-all">
                  <Flame className="w-4 h-4" />
                  Start Practicing
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Domain breakdown */}
      {stats.totalQuestionsAttempted > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Performance by Domain</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {(["math", "reading_and_writing"] as const).map((domain) => {
                const d = stats.byDomain[domain];
                if (!d || d.totalAttempted === 0) return null;
                const acc = Math.round(d.accuracy);
                return (
                  <div key={domain}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-sm text-slate-300">
                        {domainLabel(domain)}
                      </span>
                      <span className="text-sm font-semibold text-white">
                        {acc}%
                      </span>
                    </div>
                    <Progress
                      value={acc}
                      indicatorClassName={
                        domain === "math"
                          ? "bg-gradient-to-r from-violet-500 to-violet-400"
                          : "bg-gradient-to-r from-[#14B8A6] to-[#2DD4BF]"
                      }
                    />
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-xs text-slate-600">
                        {d.totalCorrect}/{d.totalAttempted} correct
                      </span>
                      <div className="flex gap-2 text-xs">
                        {(["E", "M", "H"] as const).map((diff) => {
                          const dd = d.byDifficulty[diff];
                          if (!dd || dd.attempted === 0) return null;
                          const dAcc = Math.round(
                            (dd.correct / dd.attempted) * 100
                          );
                          return (
                            <span
                              key={diff}
                              className={
                                diff === "E"
                                  ? "text-emerald-500"
                                  : diff === "M"
                                  ? "text-amber-500"
                                  : "text-red-500"
                              }
                            >
                              {diff}: {dAcc}%
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { href: "/practice", icon: Flame, label: "Practice Rush", color: "text-[#F59E0B]" },
          { href: "/study-plan", icon: Sparkles, label: "AI Study Plan", color: "text-violet-400" },
          { href: "/calm", icon: Wind, label: "Calm Mode", color: "text-[#14B8A6]" },
          { href: "/questionbank", icon: BookMarked, label: "Question Bank", color: "text-blue-400" },
        ].map(({ href, icon: Icon, label, color }) => (
          <Link key={href} href={href}>
            <Card className="hover:bg-[#0F1B35] transition-all hover:scale-[1.02] cursor-pointer h-full">
              <CardContent className="p-4 flex flex-col items-center text-center gap-2">
                <Icon className={`w-6 h-6 ${color}`} />
                <span className="text-sm font-medium text-slate-200">{label}</span>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* No study plan prompt */}
      {!hasStudyPlan && (
        <Card variant="glow">
          <CardContent className="p-6 flex flex-col sm:flex-row items-center gap-4">
            <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-[#F59E0B]/10 border border-[#F59E0B]/20 flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-[#F59E0B]" />
            </div>
            <div className="flex-1 text-center sm:text-left">
              <h3 className="font-semibold text-white mb-1">
                You don&apos;t have a study plan yet
              </h3>
              <p className="text-sm text-slate-400">
                Get a personalized AI-powered week-by-week study plan based on
                your goals and schedule.
              </p>
            </div>
            <Link href="/study-plan" className="inline-flex items-center gap-2 h-10 px-4 text-sm rounded-xl font-semibold bg-[#F59E0B] text-[#050B18] hover:bg-[#FBBF24] shadow-[0_0_16px_rgba(245,158,11,0.3)] transition-all">
              Create Plan
              <ArrowRight className="w-4 h-4" />
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
