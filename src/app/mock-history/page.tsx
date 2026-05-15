"use client";

export const dynamic = "force-dynamic";

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { TrendingUp, Clock, Target, Award, BookOpen } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { getMockAttempts } from "@/lib/storage";
import { formatTime, cn } from "@/lib/utils";
import type { MockTestAttempt } from "@/types";
import Link from "next/link";

export default function MockHistoryPage() {
  const [attempts, setAttempts] = useState<MockTestAttempt[]>([]);

  useEffect(() => {
    setAttempts(getMockAttempts());
  }, []);

  if (attempts.length === 0) {
    return (
      <div className="min-h-screen bg-[#050B18] pt-24 pb-16 flex items-center justify-center px-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center max-w-sm">
          <div className="w-16 h-16 rounded-2xl bg-[#F59E0B]/10 border border-[#F59E0B]/20 flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">📝</span>
          </div>
          <h2 className="text-xl font-bold text-white mb-2">No Mock Tests Yet</h2>
          <p className="text-slate-400 text-sm mb-6">Complete your first full SAT mock test to see your history and score trends.</p>
          <Link href="/mock-test">
            <Button size="lg" className="w-full">Take Your First Mock Test</Button>
          </Link>
        </motion.div>
      </div>
    );
  }

  const best = Math.max(...attempts.map(a => a.totalScore));
  const latest = attempts[0];
  const improvement = attempts.length > 1 ? attempts[0].totalScore - attempts[attempts.length - 1].totalScore : null;

  return (
    <div className="min-h-screen bg-[#050B18] pt-24 pb-16">
      <div className="max-w-3xl mx-auto px-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
            <TrendingUp className="w-8 h-8 text-[#F59E0B]" />
            Mock Test History
          </h1>
          <p className="text-slate-400">{attempts.length} test{attempts.length !== 1 ? "s" : ""} taken</p>
        </motion.div>

        {/* Summary stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-3xl font-bold text-[#F59E0B]">{latest.totalScore}</div>
              <div className="text-xs text-slate-500 mt-1">Latest Score</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-3xl font-bold text-emerald-400">{best}</div>
              <div className="text-xs text-slate-500 mt-1">Best Score</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className={cn("text-3xl font-bold", improvement !== null && improvement >= 0 ? "text-emerald-400" : "text-red-400")}>
                {improvement !== null ? (improvement >= 0 ? `+${improvement}` : improvement) : "—"}
              </div>
              <div className="text-xs text-slate-500 mt-1">Total Progress</div>
            </CardContent>
          </Card>
        </div>

        {/* Score trend chart */}
        {attempts.length > 1 && (
          <Card className="mb-8">
            <CardHeader><CardTitle>Score Trend</CardTitle></CardHeader>
            <CardContent>
              <div className="flex items-end gap-2 h-24">
                {[...attempts].reverse().map((a, i) => {
                  const h = Math.max(8, ((a.totalScore - 400) / 1200) * 96);
                  const isLatest = i === attempts.length - 1;
                  return (
                    <div key={a.id} className="flex-1 flex flex-col items-center gap-1">
                      <span className="text-xs text-slate-500">{a.totalScore}</span>
                      <div
                        className={cn("w-full rounded-t transition-colors", isLatest ? "bg-[#F59E0B]" : "bg-[#F59E0B]/40")}
                        style={{ height: `${h}px` }}
                        title={`Test #${a.attemptNumber}: ${a.totalScore}`}
                      />
                      <span className="text-xs text-slate-600">#{a.attemptNumber}</span>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Individual attempts */}
        <div className="space-y-4">
          {attempts.map((attempt, i) => {
            const rwPct = Math.round((attempt.rwCorrect / attempt.rwTotal) * 100);
            const mathPct = Math.round((attempt.mathCorrect / attempt.mathTotal) * 100);
            const isBest = attempt.totalScore === best;

            return (
              <motion.div key={attempt.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                <Card className={cn(isBest && "border-[#F59E0B]/30")}>
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-lg font-bold text-white">Test #{attempt.attemptNumber}</h3>
                          {isBest && <Badge variant="secondary" className="text-xs gap-1"><Award className="w-3 h-3" />Best</Badge>}
                          {i === 0 && attempts.length > 1 && <Badge variant="secondary" className="text-xs">Latest</Badge>}
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {new Date(attempt.completedAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                          {attempt.durationSeconds > 0 && ` · ${formatTime(attempt.durationSeconds)}`}
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="text-3xl font-bold gradient-text">{attempt.totalScore}</div>
                        <div className="text-xs text-slate-500">Total Score</div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div>
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-xs text-[#14B8A6]">Reading & Writing</span>
                          <span className="text-sm font-semibold text-[#14B8A6]">{attempt.rwScore}</span>
                        </div>
                        <Progress value={rwPct} className="h-1.5" indicatorClassName="bg-gradient-to-r from-teal-500 to-teal-400" />
                        <span className="text-xs text-slate-600">{attempt.rwCorrect}/{attempt.rwTotal} correct ({rwPct}%)</span>
                      </div>
                      <div>
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-xs text-violet-400">Math</span>
                          <span className="text-sm font-semibold text-violet-400">{attempt.mathScore}</span>
                        </div>
                        <Progress value={mathPct} className="h-1.5" indicatorClassName="bg-gradient-to-r from-violet-500 to-violet-400" />
                        <span className="text-xs text-slate-600">{attempt.mathCorrect}/{attempt.mathTotal} correct ({mathPct}%)</span>
                      </div>
                    </div>

                    <Link href={`/notes?tab=logbook&mock=${attempt.id}`} className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-[#F59E0B] transition-colors">
                      <BookOpen className="w-3.5 h-3.5" />View wrong answers from this test
                    </Link>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>

        <div className="mt-8 text-center">
          <Link href="/mock-test">
            <Button size="lg">Take Another Mock Test</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
