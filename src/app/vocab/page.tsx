"use client";

export const dynamic = "force-dynamic";

import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  BookOpen, RotateCcw, ChevronLeft, ChevronRight,
  CheckCircle2, XCircle, Shuffle, Search, Star, TrendingUp, Volume2,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { SAT_VOCAB, shuffleVocab } from "@/lib/vocab-words";
import { getVocabProgress, markVocabWord, resetVocabWord } from "@/lib/storage";
import type { VocabWord, VocabProgressData } from "@/types";

type FilterMode = "all" | "easy" | "medium" | "hard" | "mastered" | "review";
type ViewMode = "flashcard" | "browse";

export default function VocabPage() {
  const [viewMode, setViewMode] = useState<ViewMode>("flashcard");
  const [filterMode, setFilterMode] = useState<FilterMode>("all");
  const [search, setSearch] = useState("");
  const [flipped, setFlipped] = useState(false);
  const [cardIndex, setCardIndex] = useState(0);
  const [words, setWords] = useState<VocabWord[]>(SAT_VOCAB);
  const [progress, setProgress] = useState<VocabProgressData>({});
  const [lastAction, setLastAction] = useState<"mastered" | "review" | null>(null);

  useEffect(() => {
    setProgress(getVocabProgress());
  }, []);

  const masteredCount = useMemo(
    () => Object.values(progress).filter(p => p.mastered).length,
    [progress]
  );

  const filteredWords = useMemo(() => {
    let list = SAT_VOCAB;
    if (filterMode === "mastered") list = list.filter(w => progress[w.word]?.mastered);
    else if (filterMode === "review") list = list.filter(w => !progress[w.word]?.mastered);
    else if (filterMode !== "all") list = list.filter(w => w.difficulty === filterMode);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(w =>
        w.word.toLowerCase().includes(q) ||
        w.definition.toLowerCase().includes(q) ||
        w.synonyms.some(s => s.toLowerCase().includes(q))
      );
    }
    return list;
  }, [filterMode, search, progress]);

  const flashcardWords = useMemo(() => {
    if (filterMode === "all" && !search) return words;
    return filteredWords;
  }, [words, filteredWords, filterMode, search]);

  const currentWord = flashcardWords[cardIndex % Math.max(1, flashcardWords.length)];
  const isMastered = currentWord ? !!progress[currentWord.word]?.mastered : false;

  const handleShuffle = () => {
    setWords(shuffleVocab(SAT_VOCAB));
    setCardIndex(0);
    setFlipped(false);
  };

  const handleNext = () => {
    setFlipped(false);
    setLastAction(null);
    setTimeout(() => setCardIndex(i => (i + 1) % Math.max(1, flashcardWords.length)), 100);
  };

  const handlePrev = () => {
    setFlipped(false);
    setLastAction(null);
    setTimeout(() => setCardIndex(i => (i - 1 + flashcardWords.length) % flashcardWords.length), 100);
  };

  const handleMastered = () => {
    if (!currentWord) return;
    markVocabWord(currentWord.word, true);
    setProgress(getVocabProgress());
    setLastAction("mastered");
    setTimeout(handleNext, 400);
  };

  const handleNeedsReview = () => {
    if (!currentWord) return;
    markVocabWord(currentWord.word, false);
    setProgress(getVocabProgress());
    setLastAction("review");
    setTimeout(handleNext, 400);
  };

  const handleResetWord = (word: string) => {
    resetVocabWord(word);
    setProgress(getVocabProgress());
  };

  const difficultyColor = (d: VocabWord["difficulty"]) =>
    d === "easy" ? "text-emerald-400 bg-emerald-400/10 border-emerald-400/30" :
    d === "medium" ? "text-amber-400 bg-amber-400/10 border-amber-400/30" :
    "text-red-400 bg-red-400/10 border-red-400/30";

  return (
    <div className="pt-24 pb-16 min-h-screen">
      <div className="max-w-3xl mx-auto px-4">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-8">
          <div className="inline-flex p-4 rounded-2xl bg-violet-500/10 border border-violet-500/20 mb-4">
            <BookOpen className="w-8 h-8 text-violet-400" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Vocabulary Builder</h1>
          <p className="text-slate-400">Master the words that power SAT Reading & Writing</p>
        </motion.div>

        {/* Progress bar */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Star className="w-4 h-4 text-[#F59E0B]" />
                <span className="text-sm font-semibold text-white">Mastered</span>
              </div>
              <span className="text-sm text-slate-400">{masteredCount} / {SAT_VOCAB.length} words</span>
            </div>
            <Progress
              value={(masteredCount / SAT_VOCAB.length) * 100}
              indicatorClassName="bg-gradient-to-r from-violet-500 to-[#F59E0B]"
            />
            <div className="flex justify-between text-xs text-slate-600 mt-1">
              <span>Newcomer</span>
              <span>{Math.round((masteredCount / SAT_VOCAB.length) * 100)}%</span>
              <span>Vocabulary Master</span>
            </div>
          </CardContent>
        </Card>

        {/* View toggle */}
        <div className="flex items-center gap-2 mb-4">
          <button
            onClick={() => setViewMode("flashcard")}
            className={cn("flex-1 py-2 rounded-xl text-sm font-semibold transition-all border",
              viewMode === "flashcard"
                ? "bg-violet-500/15 border-violet-500/40 text-violet-300"
                : "bg-white/3 border-white/8 text-slate-400 hover:border-white/15"
            )}
          >
            Flashcard Mode
          </button>
          <button
            onClick={() => setViewMode("browse")}
            className={cn("flex-1 py-2 rounded-xl text-sm font-semibold transition-all border",
              viewMode === "browse"
                ? "bg-violet-500/15 border-violet-500/40 text-violet-300"
                : "bg-white/3 border-white/8 text-slate-400 hover:border-white/15"
            )}
          >
            Browse All
          </button>
        </div>

        {/* Filters */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-1 scrollbar-hide">
          {(["all", "easy", "medium", "hard", "review", "mastered"] as FilterMode[]).map(f => (
            <button
              key={f}
              onClick={() => { setFilterMode(f); setCardIndex(0); setFlipped(false); }}
              className={cn(
                "px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all border flex-shrink-0",
                filterMode === f
                  ? f === "mastered" ? "bg-[#F59E0B]/15 border-[#F59E0B]/40 text-[#F59E0B]"
                    : f === "review" ? "bg-red-500/15 border-red-500/40 text-red-400"
                    : f === "easy" ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-400"
                    : f === "medium" ? "bg-amber-500/15 border-amber-500/40 text-amber-400"
                    : f === "hard" ? "bg-red-500/15 border-red-500/40 text-red-400"
                    : "bg-violet-500/15 border-violet-500/40 text-violet-300"
                  : "bg-white/3 border-white/8 text-slate-400 hover:border-white/15"
              )}
            >
              {f === "all" ? `All (${SAT_VOCAB.length})` :
               f === "mastered" ? `Mastered (${masteredCount})` :
               f === "review" ? `To Review (${SAT_VOCAB.length - masteredCount})` :
               `${f.charAt(0).toUpperCase() + f.slice(1)} (${SAT_VOCAB.filter(w => w.difficulty === f).length})`}
            </button>
          ))}
        </div>

        {/* ── FLASHCARD MODE ── */}
        {viewMode === "flashcard" && (
          <div>
            {flashcardWords.length === 0 ? (
              <Card>
                <CardContent className="p-10 text-center">
                  <p className="text-slate-400">No words match your filter. Try a different category.</p>
                </CardContent>
              </Card>
            ) : (
              <>
                {/* Card counter + shuffle */}
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm text-slate-500">
                    {(cardIndex % flashcardWords.length) + 1} / {flashcardWords.length}
                  </span>
                  <button
                    onClick={handleShuffle}
                    className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white px-3 py-1.5 rounded-lg hover:bg-white/8 transition-all border border-white/8"
                  >
                    <Shuffle className="w-3.5 h-3.5" />
                    Shuffle
                  </button>
                </div>

                {/* The flashcard */}
                <div className="perspective-1000 mb-4">
                  <motion.div
                    className="relative w-full cursor-pointer"
                    style={{ minHeight: "280px", transformStyle: "preserve-3d" }}
                    onClick={() => setFlipped(f => !f)}
                    animate={{ rotateY: flipped ? 180 : 0 }}
                    transition={{ duration: 0.45, type: "spring", stiffness: 120, damping: 20 }}
                  >
                    {/* Front */}
                    <div
                      className={cn(
                        "absolute inset-0 rounded-2xl border p-8 flex flex-col items-center justify-center text-center",
                        "bg-gradient-to-br from-[#0A1428] to-[#0F1B35] border-white/10",
                        isMastered && "border-[#F59E0B]/30",
                      )}
                      style={{ backfaceVisibility: "hidden" }}
                    >
                      {isMastered && (
                        <div className="absolute top-3 right-3">
                          <Star className="w-4 h-4 text-[#F59E0B] fill-[#F59E0B]" />
                        </div>
                      )}
                      <div className={cn("text-xs font-semibold px-3 py-1 rounded-full border mb-4", difficultyColor(currentWord.difficulty))}>
                        {currentWord.difficulty}
                      </div>
                      <h2 className="text-4xl font-bold text-white mb-2">{currentWord.word}</h2>
                      <p className="text-slate-500 text-sm italic">{currentWord.partOfSpeech}</p>
                      <p className="text-slate-600 text-xs mt-6">Tap to reveal definition</p>
                    </div>

                    {/* Back */}
                    <div
                      className="absolute inset-0 rounded-2xl border bg-gradient-to-br from-violet-900/30 to-[#0F1B35] border-violet-500/20 p-8 flex flex-col items-center justify-center text-center"
                      style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
                    >
                      <p className="text-xl font-semibold text-white mb-3 leading-relaxed">
                        {currentWord.definition}
                      </p>
                      <p className="text-sm text-slate-400 italic mb-4 leading-relaxed">
                        &quot;{currentWord.example}&quot;
                      </p>
                      <div className="flex flex-wrap gap-1.5 justify-center">
                        {currentWord.synonyms.map(s => (
                          <span key={s} className="px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-xs text-slate-400">
                            {s}
                          </span>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-3 mb-4">
                  <button
                    onClick={handlePrev}
                    className="p-3 rounded-xl border border-white/10 text-slate-400 hover:text-white hover:bg-white/8 transition-all"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>

                  <button
                    onClick={handleNeedsReview}
                    className={cn(
                      "flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border text-sm font-semibold transition-all",
                      lastAction === "review"
                        ? "bg-red-500/20 border-red-500/50 text-red-300"
                        : "bg-red-500/8 border-red-500/20 text-red-400 hover:bg-red-500/15"
                    )}
                  >
                    <XCircle className="w-4 h-4" />
                    Still Learning
                  </button>

                  <button
                    onClick={handleMastered}
                    className={cn(
                      "flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border text-sm font-semibold transition-all",
                      lastAction === "mastered"
                        ? "bg-emerald-500/20 border-emerald-500/50 text-emerald-300"
                        : "bg-emerald-500/8 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/15"
                    )}
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    Got It!
                  </button>

                  <button
                    onClick={handleNext}
                    className="p-3 rounded-xl border border-white/10 text-slate-400 hover:text-white hover:bg-white/8 transition-all"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>

                <p className="text-center text-xs text-slate-600">Tap card to flip · Arrow keys to navigate</p>
              </>
            )}
          </div>
        )}

        {/* ── BROWSE MODE ── */}
        {viewMode === "browse" && (
          <div>
            {/* Search */}
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="text"
                placeholder="Search words..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/30"
              />
            </div>

            <div className="space-y-2">
              {filteredWords.length === 0 && (
                <Card>
                  <CardContent className="p-8 text-center text-slate-400 text-sm">
                    No words found.
                  </CardContent>
                </Card>
              )}
              {filteredWords.map(word => {
                const p = progress[word.word];
                return (
                  <motion.div
                    key={word.word}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                  >
                    <Card className="overflow-hidden">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                              <span className="font-bold text-white">{word.word}</span>
                              <span className={cn("text-xs px-2 py-0.5 rounded-full border", difficultyColor(word.difficulty))}>
                                {word.difficulty}
                              </span>
                              <span className="text-xs text-slate-600 italic">{word.partOfSpeech}</span>
                              {p?.mastered && <Star className="w-3.5 h-3.5 text-[#F59E0B] fill-[#F59E0B]" />}
                            </div>
                            <p className="text-sm text-slate-300 mb-1">{word.definition}</p>
                            <p className="text-xs text-slate-500 italic">&quot;{word.example}&quot;</p>
                            <div className="flex flex-wrap gap-1 mt-2">
                              {word.synonyms.map(s => (
                                <span key={s} className="px-1.5 py-0.5 rounded bg-white/5 text-xs text-slate-500">{s}</span>
                              ))}
                            </div>
                          </div>
                          <div className="flex flex-col gap-1.5 flex-shrink-0">
                            <button
                              onClick={() => { markVocabWord(word.word, true); setProgress(getVocabProgress()); }}
                              className={cn(
                                "px-2 py-1 rounded-lg text-xs font-semibold transition-all border",
                                p?.mastered
                                  ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-400"
                                  : "bg-white/5 border-white/10 text-slate-400 hover:border-emerald-500/30 hover:text-emerald-400"
                              )}
                            >
                              {p?.mastered ? "Mastered" : "Mark"}
                            </button>
                            {p && (
                              <button
                                onClick={() => handleResetWord(word.word)}
                                className="px-2 py-1 rounded-lg text-xs text-slate-600 hover:text-slate-400 border border-white/5 hover:border-white/10 transition-all"
                              >
                                Reset
                              </button>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
