"use client";

export const dynamic = "force-dynamic";

import React, { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Search, Filter, BookMarked, SortAsc, X, Loader2, ChevronLeft, ChevronRight
} from "lucide-react";
import { MathJax, MathJaxContext } from "better-react-mathjax";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { isQuestionSaved, saveQuestion, unsaveQuestion } from "@/lib/storage";
import { difficultyLabel, domainLabel, cn } from "@/lib/utils";
import type { Question, QuestionDomain, QuestionDifficulty } from "@/types";

const mathJaxConfig = {
  loader: { load: ["input/tex", "output/chtml"] },
  tex: { inlineMath: [["$", "$"], ["\\(", "\\)"]] },
};

export default function QuestionBankPage() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [domain, setDomain] = useState<QuestionDomain | "all">("all");
  const [difficulty, setDifficulty] = useState<QuestionDifficulty | "all">("all");
  const [saved, setSaved] = useState<Set<string>>(new Set());
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const limit = 20;
  const totalPages = Math.ceil(total / limit);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (domain !== "all") params.set("domain", domain);
    if (difficulty !== "all") params.set("difficulty", difficulty);
    if (search) params.set("search", search);

    try {
      const res = await fetch(`/api/questions?${params.toString()}`);
      const data = await res.json();
      setQuestions(data.questions || []);
      setTotal(data.total || 0);

      const savedSet = new Set<string>(
        (data.questions || [])
          .filter((q: Question) => isQuestionSaved(q.id))
          .map((q: Question) => q.id)
      );
      setSaved(savedSet);
    } catch {
      setQuestions([]);
    } finally {
      setLoading(false);
    }
  }, [page, domain, difficulty, search]);

  useEffect(() => {
    const timer = setTimeout(fetchData, 300);
    return () => clearTimeout(timer);
  }, [fetchData]);

  const toggleSave = (q: Question) => {
    if (saved.has(q.id)) {
      unsaveQuestion(q.id);
      setSaved((s) => { const n = new Set(s); n.delete(q.id); return n; });
    } else {
      saveQuestion({
        questionId: q.id,
        savedAt: new Date().toISOString(),
        domain: q.domain,
        difficulty: q.difficulty,
        skill: q.skill,
      });
      setSaved((s) => new Set(s).add(q.id));
    }
  };

  return (
    <MathJaxContext config={mathJaxConfig}>
      <div className="pt-24 pb-16 min-h-screen">
        <div className="max-w-5xl mx-auto px-4">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
              <BookMarked className="w-8 h-8 text-[#F59E0B]" />
              Question Bank
            </h1>
            <p className="text-slate-400">
              Browse and practice from 2,000+ official College Board SAT questions.
            </p>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-3 mb-6">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <Input
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                placeholder="Search questions..."
                className="pl-9"
              />
            </div>
            <Select value={domain} onValueChange={(v) => { setDomain(v as typeof domain); setPage(1); }}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="All Sections" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sections</SelectItem>
                <SelectItem value="math">Math</SelectItem>
                <SelectItem value="reading_and_writing">Reading & Writing</SelectItem>
              </SelectContent>
            </Select>
            <Select value={difficulty} onValueChange={(v) => { setDifficulty(v as typeof difficulty); setPage(1); }}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="All Difficulties" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Difficulties</SelectItem>
                <SelectItem value="E">Easy</SelectItem>
                <SelectItem value="M">Medium</SelectItem>
                <SelectItem value="H">Hard</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Results count */}
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-slate-500">
              {loading ? "Loading..." : `${total.toLocaleString()} questions`}
            </p>
            <Badge variant="secondary">
              Page {page} of {totalPages || 1}
            </Badge>
          </div>

          {/* Questions list */}
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="w-8 h-8 text-[#F59E0B] animate-spin" />
            </div>
          ) : questions.length === 0 ? (
            <div className="text-center py-20 text-slate-500">
              No questions found. Try adjusting your filters.
            </div>
          ) : (
            <div className="space-y-3">
              {questions.map((q, i) => (
                <motion.div
                  key={q.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                >
                  <Card
                    className={cn(
                      "cursor-pointer hover:bg-[#0F1B35] transition-all",
                      expandedId === q.id && "border-[#F59E0B]/20"
                    )}
                    onClick={() => setExpandedId(expandedId === q.id ? null : q.id)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2 mb-2">
                            <Badge variant={q.domain === "math" ? "math" : "rw"} className="text-xs">
                              {domainLabel(q.domain)}
                            </Badge>
                            <Badge
                              className={cn(
                                "text-xs border",
                                q.difficulty === "E" ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" :
                                q.difficulty === "M" ? "bg-amber-500/15 text-amber-400 border-amber-500/30" :
                                "bg-red-500/15 text-red-400 border-red-500/30"
                              )}
                            >
                              {difficultyLabel(q.difficulty)}
                            </Badge>
                            <span className="text-xs text-slate-500">{q.skill}</span>
                          </div>
                          <MathJax>
                            <div
                              className={cn(
                                "text-sm text-slate-300 question-content",
                                expandedId !== q.id && "line-clamp-2"
                              )}
                              dangerouslySetInnerHTML={{ __html: q.stem }}
                            />
                          </MathJax>

                          {expandedId === q.id && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: "auto" }}
                              className="mt-4 space-y-2"
                            >
                              {q.answerOptions?.map((opt) => (
                                <div
                                  key={opt.id}
                                  className={cn(
                                    "flex items-start gap-2 p-2 rounded-lg text-sm",
                                    q.correctAnswer.includes(opt.id)
                                      ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-300"
                                      : "bg-white/3 text-slate-400"
                                  )}
                                >
                                  <span className={cn(
                                    "w-5 h-5 rounded-full border flex items-center justify-center text-xs font-bold flex-shrink-0",
                                    q.correctAnswer.includes(opt.id)
                                      ? "bg-emerald-500 border-emerald-500 text-white"
                                      : "border-white/20"
                                  )}>
                                    {opt.id.toUpperCase()}
                                  </span>
                                  <MathJax>
                                    <span dangerouslySetInnerHTML={{ __html: opt.content }} />
                                  </MathJax>
                                </div>
                              ))}
                            </motion.div>
                          )}
                        </div>

                        <button
                          onClick={(e) => { e.stopPropagation(); toggleSave(q); }}
                          className={cn(
                            "flex-shrink-0 p-1.5 rounded-lg transition-all",
                            saved.has(q.id)
                              ? "text-[#F59E0B] hover:bg-[#F59E0B]/10"
                              : "text-slate-600 hover:text-slate-400 hover:bg-white/5"
                          )}
                        >
                          <BookMarked className="w-4 h-4" />
                        </button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-8">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1 || loading}
              >
                <ChevronLeft className="w-4 h-4" />
                Previous
              </Button>
              <span className="text-sm text-slate-400 px-2">
                Page {page} of {totalPages}
              </span>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages || loading}
              >
                Next
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>
      </div>
    </MathJaxContext>
  );
}
