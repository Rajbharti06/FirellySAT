"use client";

import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Flame, Target, TrendingUp, Clock, BookMarked,
  CheckCircle2, Sparkles, Brain, Wind, ArrowRight, FileText,
  Zap, Star, Trophy, BookOpen,
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
  getStats, getDefaultStats, getSavedQuestions, getStudyPlan,
  getLatestMockScore, getMockAttempts, getXPData, getLevelInfo,
  getDailyGoal, getSuperScore, LEVEL_TITLES,
} from "@/lib/storage";
import {
  predictScore, getGreeting, getMotivationalQuote,
  formatDuration, formatTime, domainLabel
} from "@/lib/utils";
import type { PracticeStatistics, MockTestAttempt, XPData, DailyGoalData } from "@/types";

export function DashboardOverview() {
  const [stats, setStats] = useState<PracticeStatistics>(getDefaultStats());
  const [savedCount, setSavedCount] = useState(0);
  const [hasStudyPlan, setHasStudyPlan] = useState(false);
  const [quote, setQuote] = useState("");
  const [latestMock, setLatestMock] = useState<MockTestAttempt | null>(null);
  const [mockAttempts, setMockAttempts] = useState<MockTestAttempt[]>([]);
  const [xpData, setXpData] = useState<XPData>({ totalXP: 0, level: 1 });
  const [dailyGoal, setDailyGoal] = useState<DailyGoalData>({ targetQuestions: 10, completedToday: 0, date: "" });
  const [superScore, setSuperScore] = useState<{ math: number; rw: number; total: number } | null>(null);

  useEffect(() => {
    setStats(getStats());
    setSavedCount(getSavedQuestions().length);
    setHasStudyPlan(!!getStudyPlan());
    setQuote(getMotivationalQuote());
    setLatestMock(getLatestMockScore());
    setMockAttempts(getMockAttempts());
    setXpData(getXPData());
    setDailyGoal(getDailyGoal());
    setSuperScore(getSuperScore());
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

      {/* XP / Level + Daily Goal row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* XP Level card */}
        <Card>
          <CardContent className="p-4">
            {(() => {
              const info = getLevelInfo(xpData.totalXP);
              return (
                <>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-[#F59E0B]/10 border border-[#F59E0B]/20 flex items-center justify-center">
                        <Zap className="w-4 h-4 text-[#F59E0B]" />
                      </div>
                      <div>
                        <div className="text-sm font-bold text-white">Level {info.level}</div>
                        <div className="text-xs text-slate-500">{info.title}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-semibold text-[#F59E0B]">{xpData.totalXP} XP</div>
                      <div className="text-xs text-slate-600">{info.xpForNext > xpData.totalXP ? `${info.xpForNext - xpData.totalXP} to next` : "Max level!"}</div>
                    </div>
                  </div>
                  <Progress value={info.progress} className="h-1.5" indicatorClassName="bg-gradient-to-r from-[#F59E0B] to-amber-300" />
                  <div className="flex justify-between text-xs text-slate-600 mt-1">
                    <span>{info.title}</span>
                    <span>{LEVEL_TITLES[info.level] ?? "SAT Legend"}</span>
                  </div>
                </>
              );
            })()}
          </CardContent>
        </Card>

        {/* Daily Goal card */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-400/10 border border-emerald-400/20 flex items-center justify-center">
                  <Target className="w-4 h-4 text-emerald-400" />
                </div>
                <div>
                  <div className="text-sm font-bold text-white">Daily Goal</div>
                  <div className="text-xs text-slate-500">Questions today</div>
                </div>
              </div>
              <div className="text-right">
                <div className={`text-sm font-semibold ${dailyGoal.completedToday >= dailyGoal.targetQuestions ? "text-emerald-400" : "text-slate-300"}`}>
                  {dailyGoal.completedToday} / {dailyGoal.targetQuestions}
                </div>
                <div className="text-xs text-slate-600">
                  {dailyGoal.completedToday >= dailyGoal.targetQuestions ? "Goal achieved!" : `${dailyGoal.targetQuestions - dailyGoal.completedToday} to go`}
                </div>
              </div>
            </div>
            <Progress
              value={Math.min(100, (dailyGoal.completedToday / dailyGoal.targetQuestions) * 100)}
              className="h-1.5"
              indicatorClassName={dailyGoal.completedToday >= dailyGoal.targetQuestions ? "bg-gradient-to-r from-emerald-500 to-emerald-400" : "bg-gradient-to-r from-[#14B8A6] to-[#2DD4BF]"}
            />
            {dailyGoal.completedToday >= dailyGoal.targetQuestions && (
              <p className="text-xs text-emerald-400 mt-1.5 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> Daily goal complete!
              </p>
            )}
          </CardContent>
        </Card>
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
              {latestMock ? "Latest Mock Test Score" : "Score Prediction"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {latestMock ? (
              <div className="space-y-4">
                <div className="text-center">
                  <div className="text-5xl font-bold gradient-text">{latestMock.totalScore}</div>
                  <div className="text-xs text-slate-500 mt-1">
                    Test #{latestMock.attemptNumber} · {new Date(latestMock.completedAt).toLocaleDateString()}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-[#14B8A6]/10 rounded-xl text-center border border-[#14B8A6]/20">
                    <div className="text-xl font-bold text-[#14B8A6]">{latestMock.rwScore}</div>
                    <div className="text-xs text-slate-500">R&W ({latestMock.rwCorrect}/{latestMock.rwTotal})</div>
                  </div>
                  <div className="p-3 bg-violet-500/10 rounded-xl text-center border border-violet-500/20">
                    <div className="text-xl font-bold text-violet-400">{latestMock.mathScore}</div>
                    <div className="text-xs text-slate-500">Math ({latestMock.mathCorrect}/{latestMock.mathTotal})</div>
                  </div>
                </div>
                {mockAttempts.length > 1 && (
                  <div className="space-y-1">
                    <p className="text-xs text-slate-500">Score history:</p>
                    <div className="flex items-end gap-1 h-10">
                      {mockAttempts.slice(0, 8).reverse().map((a, i) => {
                        const h = Math.max(4, ((a.totalScore - 400) / 1200) * 40);
                        return (
                          <div key={a.id} title={`Test #${a.attemptNumber}: ${a.totalScore}`}
                            className="flex-1 bg-[#F59E0B]/40 hover:bg-[#F59E0B]/70 rounded-sm transition-colors cursor-default"
                            style={{ height: `${h}px` }}
                          />
                        );
                      })}
                    </div>
                  </div>
                )}
                <Link href="/mock-history" className="block text-center text-xs text-slate-500 hover:text-[#F59E0B] transition-colors">View all mock tests →</Link>
              </div>
            ) : prediction.confidence > 0 ? (
              <div className="space-y-4">
                <div className="text-center">
                  <div className="text-5xl font-bold gradient-text">{prediction.predictedScore}</div>
                  <div className="text-xs text-slate-500 mt-1">Practice-based estimate ({prediction.confidence}% confidence)</div>
                  <p className="text-xs text-slate-600 mt-1 italic">Take a mock test for your real score</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-violet-500/10 rounded-xl text-center border border-violet-500/20">
                    <div className="text-xl font-bold text-violet-400">{prediction.mathScore}</div>
                    <div className="text-xs text-slate-500">Math</div>
                  </div>
                  <div className="p-3 bg-[#14B8A6]/10 rounded-xl text-center border border-[#14B8A6]/20">
                    <div className="text-xl font-bold text-[#14B8A6]">{prediction.rwScore}</div>
                    <div className="text-xs text-slate-500">R&W</div>
                  </div>
                </div>
                {prediction.weakestSkills.length > 0 && (
                  <div>
                    <p className="text-xs text-slate-500 mb-2">Focus areas:</p>
                    <div className="flex flex-wrap gap-1">
                      {prediction.weakestSkills.map(s => <Badge key={s} variant="danger" className="text-xs">{s}</Badge>)}
                    </div>
                  </div>
                )}
                <Link href="/mock-test" className="block text-center text-xs text-[#F59E0B] hover:text-[#FBBF24] transition-colors font-medium">→ Take a mock test now</Link>
              </div>
            ) : (
              <div className="text-center py-4">
                <p className="text-slate-400 text-sm mb-4">Complete a mock test or practice more to unlock your score estimate</p>
                <div className="flex gap-2">
                  <Link href="/practice" className="flex-1 inline-flex items-center justify-center gap-1 h-8 px-3 text-xs rounded-xl font-semibold bg-[#F59E0B] text-[#050B18] hover:bg-[#FBBF24] transition-all">
                    <Flame className="w-4 h-4" />Practice
                  </Link>
                  <Link href="/mock-test" className="flex-1 inline-flex items-center justify-center gap-1 h-8 px-3 text-xs rounded-xl font-semibold bg-white/5 text-slate-300 hover:bg-white/10 border border-white/10 transition-all">
                    Mock Test
                  </Link>
                </div>
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

      {/* Recent sessions */}
      {stats.sessions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Recent Practice Sessions</span>
              <span className="text-xs font-normal text-slate-500">{stats.sessions.length} total</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {stats.sessions.slice(0, 5).map((s, i) => {
                const acc = s.questionsAttempted > 0 ? Math.round((s.questionsCorrect / s.questionsAttempted) * 100) : 0;
                const date = new Date(s.completedAt || s.startedAt);
                return (
                  <div key={s.id} className="flex items-center gap-3 p-2.5 bg-white/3 rounded-xl border border-white/8">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center bg-[#F59E0B]/10 text-xs font-bold text-[#F59E0B]">
                      {acc}%
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs text-slate-300 font-medium">
                        {s.questionsCorrect}/{s.questionsAttempted} correct · {formatTime(s.timeSpentSeconds)}
                      </div>
                      <div className="text-xs text-slate-600">
                        {date.toLocaleDateString()} · {s.domain === "math" ? "Math" : s.domain === "reading_and_writing" ? "R&W" : "Mixed"}{s.calmMode ? " · Calm" : ""}
                      </div>
                    </div>
                    <Badge variant={acc >= 80 ? "success" : acc >= 60 ? "medium" : "danger"} className="text-xs flex-shrink-0">
                      {acc >= 80 ? "Great" : acc >= 60 ? "Good" : "Keep Going"}
                    </Badge>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Super Score banner */}
      {superScore && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Trophy className="w-5 h-5 text-[#F59E0B]" />
                <div>
                  <div className="text-sm font-bold text-white">Super Score</div>
                  <div className="text-xs text-slate-500">Best Math + Best R&W across all mocks</div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-[#F59E0B]">{superScore.total}</div>
                <div className="text-xs text-slate-500">
                  <span className="text-violet-400">{superScore.math}</span>
                  <span className="text-slate-600"> + </span>
                  <span className="text-[#14B8A6]">{superScore.rw}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick actions */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { href: "/practice", icon: Flame, label: "Practice Rush", color: "text-[#F59E0B]" },
          { href: "/diagnostic", icon: Brain, label: "Diagnostic", color: "text-violet-400" },
          { href: "/vocab", icon: BookOpen, label: "Vocabulary", color: "text-blue-400" },
          { href: "/mock-test", icon: FileText, label: "Mock Test", color: "text-emerald-400" },
          { href: "/study-plan", icon: Sparkles, label: "AI Study Plan", color: "text-amber-400" },
          { href: "/calm", icon: Wind, label: "Calm Mode", color: "text-[#14B8A6]" },
          { href: "/questionbank", icon: BookMarked, label: "Question Bank", color: "text-teal-400" },
          { href: "/notes", icon: Star, label: "Notes", color: "text-rose-400" },
        ].map(({ href, icon: Icon, label, color }) => (
          <Link key={href} href={href}>
            <Card className="hover:bg-[#0F1B35] transition-all hover:scale-[1.02] cursor-pointer h-full">
              <CardContent className="p-3 flex flex-col items-center text-center gap-2">
                <Icon className={`w-5 h-5 ${color}`} />
                <span className="text-xs font-medium text-slate-200">{label}</span>
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
