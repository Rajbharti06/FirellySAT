"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, Bookmark, BookmarkCheck,
  Timer, Check, SkipForward, Wind, RefreshCw,
  ChevronDown, ChevronUp, Lightbulb, Flag, PenLine,
  Save, Calculator, BookOpen, Grid3x3, TrendingUp
} from "lucide-react";
import { MathJax, MathJaxContext } from "better-react-mathjax";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent } from "@/components/ui/card";
import { cn, formatTime, difficultyLabel, domainLabel, getCalmnessMessage } from "@/lib/utils";
import {
  isQuestionSaved, saveQuestion, unsaveQuestion,
  recordSessionComplete, saveNoteQuestion, addLogbookEntry,
} from "@/lib/storage";
import type { Question, SessionAnswer, QuestionDifficulty } from "@/types";
import confetti from "canvas-confetti";
import { ReferenceSheet } from "./reference-sheet";
import { DesmosPanel } from "./desmos-panel";

interface PracticeSessionProps {
  questions: Question[];
  isAdaptive?: boolean;
  calmMode?: boolean;
  onComplete?: (answers: SessionAnswer[]) => void;
  onClose?: () => void;
}

const mathJaxConfig = {
  loader: { load: ["input/tex", "output/chtml"] },
  tex: { inlineMath: [["$", "$"], ["\\(", "\\)"]] },
};

function pickInitialIndex(questions: Question[]): number {
  const idx = questions.findIndex(q => q.difficulty === "M");
  return idx >= 0 ? idx : 0;
}

export function PracticeSession({
  questions,
  isAdaptive = false,
  calmMode = false,
  onComplete,
  onClose,
}: PracticeSessionProps) {
  // Adaptive: questionOrder holds actual indices into questions[]
  const [questionOrder, setQuestionOrder] = useState<number[]>(() =>
    isAdaptive ? [pickInitialIndex(questions)] : questions.map((_, i) => i)
  );
  const [currentIndex, setCurrentIndex] = useState(0);
  const [adaptiveScore, setAdaptiveScore] = useState(0);

  const [answers, setAnswers] = useState<Map<number, string>>(new Map());
  const [submitted, setSubmitted] = useState<Set<number>>(new Set());
  const [saved, setSaved] = useState<Set<string>>(new Set());
  const [marked, setMarked] = useState<Set<number>>(new Set());
  const [questionNotes, setQuestionNotes] = useState<Map<string, string>>(new Map());
  const [noteInput, setNoteInput] = useState("");
  const [showNoteInput, setShowNoteInput] = useState(false);
  const [timeSeconds, setTimeSeconds] = useState(0);
  const [questionTime, setQuestionTime] = useState(0);
  const [perQuestionTimes, setPerQuestionTimes] = useState<Map<number, number>>(new Map());
  const [showRationale, setShowRationale] = useState(false);
  const [sessionComplete, setSessionComplete] = useState(false);
  const [sessionAnswers, setSessionAnswers] = useState<SessionAnswer[]>([]);
  const [calmMessage, setCalmMessage] = useState("");
  const [showCalm, setShowCalm] = useState(false);
  const [showNavigator, setShowNavigator] = useState(false);
  const [showReference, setShowReference] = useState(false);
  const [showDesmos, setShowDesmos] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const questionTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const actualIdx = questionOrder[currentIndex] ?? 0;
  const currentQuestion = questions[actualIdx];
  const isMath = currentQuestion?.domain === "math";
  const displayQuestions = isAdaptive ? questionOrder.length : questions.length;

  useEffect(() => {
    const savedSet = new Set(questions.filter(q => isQuestionSaved(q.id)).map(q => q.id));
    setSaved(savedSet);
  }, [questions]);

  useEffect(() => {
    timerRef.current = setInterval(() => setTimeSeconds(t => t + 1), 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  useEffect(() => {
    setQuestionTime(0);
    setShowRationale(false);
    setShowNoteInput(false);
    setNoteInput(questionNotes.get(questions[actualIdx]?.id ?? "") ?? "");
    questionTimerRef.current = setInterval(() => setQuestionTime(t => t + 1), 1000);
    return () => { if (questionTimerRef.current) clearInterval(questionTimerRef.current); };
  }, [currentIndex]);

  useEffect(() => {
    if (calmMode && questionTime === 60) {
      setCalmMessage(getCalmnessMessage());
      setShowCalm(true);
      setTimeout(() => setShowCalm(false), 5000);
    }
  }, [questionTime, calmMode]);

  // Pick next adaptive question based on performance
  const pickAdaptiveNext = useCallback((isCorrect: boolean) => {
    const newScore = adaptiveScore + (isCorrect ? 1 : -1);
    setAdaptiveScore(newScore);

    const targetDiff: QuestionDifficulty =
      newScore >= 3 ? "H" : newScore >= 0 ? "M" : "E";

    const usedSet = new Set(questionOrder);
    const preferred: number[] = [];
    const fallback: number[] = [];

    questions.forEach((q, i) => {
      if (usedSet.has(i)) return;
      if (q.difficulty === targetDiff) preferred.push(i);
      else fallback.push(i);
    });

    const pool = preferred.length > 0 ? preferred : fallback;
    if (pool.length > 0) {
      const next = pool[Math.floor(Math.random() * pool.length)];
      setQuestionOrder(prev => [...prev, next]);
    }
  }, [adaptiveScore, questionOrder, questions]);

  const handleAnswer = useCallback((answer: string) => {
    if (submitted.has(currentIndex)) return;
    setAnswers(prev => new Map(prev).set(currentIndex, answer));
  }, [currentIndex, submitted]);

  const handleSubmit = useCallback(() => {
    if (!currentQuestion || submitted.has(currentIndex)) return;
    const userAnswer = answers.get(currentIndex) || "";
    const isCorrect = currentQuestion.correctAnswer.includes(userAnswer);

    setSubmitted(prev => new Set(prev).add(currentIndex));
    setPerQuestionTimes(prev => new Map(prev).set(currentIndex, questionTime));

    if (isCorrect && !calmMode) {
      confetti({ particleCount: 30, spread: 60, origin: { y: 0.7 } });
    }

    if (!isCorrect && userAnswer) {
      addLogbookEntry({
        timestamp: new Date().toISOString(),
        questionId: currentQuestion.id,
        stem: currentQuestion.stem,
        domain: currentQuestion.domain,
        skill: currentQuestion.skill,
        difficulty: currentQuestion.difficulty,
        userAnswer,
        correctAnswer: currentQuestion.correctAnswer,
        rationale: currentQuestion.rationale,
        source: "practice",
      });
    }

    if (isAdaptive) {
      pickAdaptiveNext(isCorrect);
    }
  }, [currentQuestion, currentIndex, answers, submitted, calmMode, questionTime, isAdaptive, pickAdaptiveNext]);

  const handleComplete = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (questionTimerRef.current) clearInterval(questionTimerRef.current);

    const allAnswers: SessionAnswer[] = questionOrder.slice(0, currentIndex + 1).map((qIdx, i) => {
      const q = questions[qIdx];
      return {
        questionId: q.id,
        userAnswer: answers.get(i) || "",
        isCorrect: q.correctAnswer.includes(answers.get(i) || ""),
        timeSpentSeconds: perQuestionTimes.get(i) ?? 0,
        domain: q.domain,
        skill: q.skill,
        difficulty: q.difficulty,
        skipped: !submitted.has(i) && !answers.has(i),
      };
    });

    recordSessionComplete(allAnswers, currentQuestion?.domain ?? "mixed", timeSeconds, calmMode);
    setSessionAnswers(allAnswers);
    setSessionComplete(true);
    onComplete?.(allAnswers);
  }, [questionOrder, questions, answers, submitted, timeSeconds, perQuestionTimes, currentQuestion, calmMode, currentIndex, onComplete]);

  const handleNext = useCallback(() => {
    setShowRationale(false);
    const maxIndex = isAdaptive ? questionOrder.length - 1 : questions.length - 1;
    if (currentIndex < maxIndex) {
      setCurrentIndex(i => i + 1);
    } else {
      handleComplete();
    }
  }, [currentIndex, isAdaptive, questionOrder.length, questions.length, handleComplete]);

  const handlePrev = () => {
    if (currentIndex > 0) setCurrentIndex(i => i - 1);
  };

  const handleSkip = () => {
    const q = currentQuestion;
    if (!q) return;
    const sessionAnswer: SessionAnswer = {
      questionId: q.id,
      userAnswer: "",
      isCorrect: false,
      timeSpentSeconds: questionTime,
      domain: q.domain,
      skill: q.skill,
      difficulty: q.difficulty,
      skipped: true,
    };
    setSessionAnswers(prev => [...prev, sessionAnswer]);
    const maxIndex = isAdaptive ? questionOrder.length - 1 : questions.length - 1;
    if (currentIndex < maxIndex) setCurrentIndex(i => i + 1);
    else handleComplete();
  };

  const handleSaveToggle = () => {
    if (!currentQuestion) return;
    if (saved.has(currentQuestion.id)) {
      unsaveQuestion(currentQuestion.id);
      setSaved(s => { const n = new Set(s); n.delete(currentQuestion.id); return n; });
    } else {
      saveQuestion({ questionId: currentQuestion.id, savedAt: new Date().toISOString(), domain: currentQuestion.domain, difficulty: currentQuestion.difficulty, skill: currentQuestion.skill });
      saveNoteQuestion({ questionId: currentQuestion.id, stem: currentQuestion.stem, domain: currentQuestion.domain, difficulty: currentQuestion.difficulty, skill: currentQuestion.skill, correctAnswer: currentQuestion.correctAnswer, rationale: currentQuestion.rationale, snapshotAt: new Date().toISOString() });
      setSaved(s => new Set(s).add(currentQuestion.id));
    }
  };

  const handleToggleMark = () => {
    setMarked(prev => { const next = new Set(prev); if (next.has(currentIndex)) next.delete(currentIndex); else next.add(currentIndex); return next; });
  };

  const handleSaveNote = () => {
    if (!currentQuestion) return;
    const text = noteInput.trim();
    const newNotes = new Map(questionNotes);
    if (text) newNotes.set(currentQuestion.id, text); else newNotes.delete(currentQuestion.id);
    setQuestionNotes(newNotes);
    saveNoteQuestion({ questionId: currentQuestion.id, stem: currentQuestion.stem, domain: currentQuestion.domain, difficulty: currentQuestion.difficulty, skill: currentQuestion.skill, correctAnswer: currentQuestion.correctAnswer, rationale: currentQuestion.rationale, snapshotAt: new Date().toISOString(), userNote: text || undefined });
    setShowNoteInput(false);
  };

  if (!currentQuestion && !sessionComplete) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#050B18]">
        <p className="text-slate-400">No questions available.</p>
      </div>
    );
  }

  if (sessionComplete) {
    return (
      <div className="fixed inset-0 z-[100] overflow-y-auto bg-[#050B18]">
        <SessionSummary
          answers={sessionAnswers}
          timeSeconds={timeSeconds}
          calmMode={calmMode}
          isAdaptive={isAdaptive}
          onRestart={() => {
            setCurrentIndex(0);
            setAnswers(new Map());
            setSubmitted(new Set());
            setMarked(new Set());
            setSessionComplete(false);
            setTimeSeconds(0);
            setSessionAnswers([]);
            setPerQuestionTimes(new Map());
            setAdaptiveScore(0);
            setQuestionOrder(isAdaptive ? [pickInitialIndex(questions)] : questions.map((_, i) => i));
          }}
          onClose={onClose}
        />
      </div>
    );
  }

  const isSubmitted = submitted.has(currentIndex);
  const userAnswer = answers.get(currentIndex);
  const isCorrect = isSubmitted && currentQuestion.correctAnswer.includes(userAnswer || "");
  const isSaved = saved.has(currentQuestion.id);
  const isMarked = marked.has(currentIndex);
  const progress = ((currentIndex + 1) / displayQuestions) * 100;
  const hasNote = questionNotes.has(currentQuestion.id);

  const qtColor =
    questionTime < 60 ? "text-emerald-400" :
    questionTime < 120 ? "text-amber-400" : "text-red-400";

  const diffBadgeVariant = currentQuestion.difficulty === "E" ? "easy" : currentQuestion.difficulty === "H" ? "hard" : "medium";

  return (
    <MathJaxContext config={mathJaxConfig}>
      <div className={cn("fixed inset-0 z-[100] flex flex-col overflow-hidden", calmMode ? "bg-gradient-to-b from-[#050B18] to-[#0A1428]" : "bg-[#050B18]")}>
        <ReferenceSheet open={showReference} onClose={() => setShowReference(false)} />
        <DesmosPanel open={showDesmos} onClose={() => setShowDesmos(false)} />

        {/* Top bar */}
        <div className="flex-shrink-0 border-b border-white/8 bg-[#050B18]/95 backdrop-blur-sm">
          <div className="max-w-4xl mx-auto px-3 py-2">
            <div className="flex items-center gap-2 mb-1.5">
              {/* Left: Exit + Q counter + CB ID */}
              <button
                onClick={onClose}
                className="flex-shrink-0 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/8 transition-colors text-xs font-medium border border-white/10"
              >
                <X className="w-3.5 h-3.5" />
                Exit
              </button>

              <div className="flex items-center gap-1.5 flex-shrink-0">
                <span className="text-xs font-semibold text-white">
                  Q {currentIndex + 1}
                </span>
                <span className="text-xs text-slate-600">/ {displayQuestions}</span>
              </div>

              {currentQuestion.externalId && (
                <div className="hidden sm:flex items-center gap-1 px-2 py-0.5 rounded-md bg-white/5 border border-white/8">
                  <span className="text-xs text-slate-500">CB</span>
                  <span className="text-xs font-mono text-slate-400 truncate max-w-[80px]">{currentQuestion.externalId}</span>
                </div>
              )}

              {isAdaptive && (
                <Badge variant="secondary" className="text-xs gap-1 hidden sm:flex">
                  <TrendingUp className="w-3 h-3" />
                  Adaptive
                </Badge>
              )}

              <div className="flex-1" />

              {/* Right: Timers + Tools */}
              <div className={cn("flex items-center gap-1 text-xs font-mono font-bold flex-shrink-0", qtColor)}>
                <Timer className="w-3.5 h-3.5" />
                {formatTime(questionTime)}
              </div>
              <span className="text-slate-700 text-xs">|</span>
              <span className="text-xs text-slate-500 font-mono flex-shrink-0">{formatTime(timeSeconds)}</span>

              <button onClick={handleToggleMark} title="Mark for review" className={cn("p-1.5 rounded-lg transition-colors flex-shrink-0", isMarked ? "text-orange-400 bg-orange-400/10" : "text-slate-500 hover:text-orange-400 hover:bg-white/5")}>
                <Flag className="w-4 h-4" />
              </button>
              <button onClick={handleSaveToggle} title={isSaved ? "Unsave" : "Save"} className={cn("p-1.5 rounded-lg transition-colors flex-shrink-0", isSaved ? "text-[#F59E0B] bg-[#F59E0B]/10" : "text-slate-500 hover:text-[#F59E0B] hover:bg-white/5")}>
                {isSaved ? <BookmarkCheck className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />}
              </button>
              <button onClick={() => setShowReference(true)} title="Math reference sheet" className="p-1.5 rounded-lg text-slate-500 hover:text-violet-400 hover:bg-white/5 transition-colors flex-shrink-0">
                <BookOpen className="w-4 h-4" />
              </button>
              <button onClick={() => setShowDesmos(true)} title="Desmos calculator" className={cn("p-1.5 rounded-lg transition-colors flex-shrink-0", isMath ? "text-violet-400 hover:bg-violet-400/10" : "text-slate-600 hover:text-slate-400 hover:bg-white/5")}>
                <Calculator className="w-4 h-4" />
              </button>
              <button onClick={() => setShowNavigator(!showNavigator)} title="Question navigator" className="p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-white/5 transition-colors flex-shrink-0">
                <Grid3x3 className="w-4 h-4" />
              </button>
              {calmMode && <Badge variant="calm" className="hidden sm:flex gap-1 flex-shrink-0"><Wind className="w-3 h-3" />Calm</Badge>}
            </div>
            <Progress value={progress} className="h-1" />
          </div>

          {/* Navigator strip */}
          <AnimatePresence>
            {showNavigator && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden border-t border-white/8">
                <div className="max-w-4xl mx-auto px-3 py-2 flex flex-wrap gap-1">
                  {(isAdaptive ? questionOrder : questions.map((_, i) => i)).map((qIdx, i) => {
                    const q = questions[qIdx];
                    const isAns = answers.has(i);
                    const isSub = submitted.has(i);
                    const isMrk = marked.has(i);
                    const isCur = i === currentIndex;
                    const wasCorrect = isSub && q?.correctAnswer.includes(answers.get(i) || "");
                    return (
                      <button key={i} onClick={() => { setCurrentIndex(i); setShowNavigator(false); }}
                        className={cn("w-7 h-7 rounded text-xs font-semibold transition-all",
                          isCur ? "ring-2 ring-[#F59E0B] bg-[#F59E0B] text-[#050B18]" :
                          isSub && wasCorrect ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40" :
                          isSub && !wasCorrect ? "bg-red-500/20 text-red-400 border border-red-500/40" :
                          isMrk ? "bg-orange-500/15 text-orange-400 border border-orange-400/40" :
                          isAns ? "bg-white/10 text-white border border-white/20" :
                          "bg-white/5 text-slate-500 border border-white/8 hover:bg-white/10"
                        )}>
                        {i + 1}
                      </button>
                    );
                  })}
                  <div className="w-full flex gap-3 mt-1 text-xs text-slate-600">
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-emerald-500/40 inline-block" />Correct</span>
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-red-500/40 inline-block" />Wrong</span>
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-orange-500/30 inline-block" />Flagged</span>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Calm message */}
        <AnimatePresence>
          {showCalm && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="flex-shrink-0 mx-4 mt-2">
              <div className="max-w-4xl mx-auto">
                <div className="bg-[#14B8A6]/10 border border-[#14B8A6]/20 rounded-xl px-4 py-2.5 text-sm text-[#14B8A6] flex items-center gap-2">
                  <Wind className="w-4 h-4 flex-shrink-0" />{calmMessage}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Marked indicator */}
        {isMarked && (
          <div className="flex-shrink-0 max-w-4xl mx-auto w-full px-4 pt-2">
            <div className="flex items-center gap-2 text-xs text-orange-400 bg-orange-400/8 border border-orange-400/20 rounded-lg px-3 py-1.5">
              <Flag className="w-3 h-3" />Marked for review
            </div>
          </div>
        )}

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-4xl mx-auto w-full px-4 py-5">
            {/* Meta badges */}
            <div className="flex flex-wrap items-center gap-2 mb-4">
              <Badge variant={currentQuestion.domain === "math" ? "math" : "rw"}>{domainLabel(currentQuestion.domain)}</Badge>
              <Badge variant={diffBadgeVariant}>{difficultyLabel(currentQuestion.difficulty)}</Badge>
              <Badge variant="outline" className="text-slate-500 text-xs">{currentQuestion.skill}</Badge>
              {isMath && currentQuestion.calculator && (
                <Badge variant="secondary" className="text-xs gap-1"><Calculator className="w-3 h-3" />Calculator</Badge>
              )}
              {isAdaptive && (
                <Badge variant="secondary" className="text-xs text-slate-500">
                  Score: {adaptiveScore > 0 ? `+${adaptiveScore}` : adaptiveScore}
                </Badge>
              )}
            </div>

            <AnimatePresence mode="wait">
              <motion.div key={`${currentIndex}-${actualIdx}`} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.18 }}>
                {/* Passage */}
                {currentQuestion.associatedPassage && (
                  <Card className="mb-4">
                    <CardContent className="p-4 sm:p-5">
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Passage</p>
                      <MathJax>
                        <div className="text-sm text-slate-300 leading-relaxed question-content" dangerouslySetInnerHTML={{ __html: currentQuestion.associatedPassage }} />
                      </MathJax>
                    </CardContent>
                  </Card>
                )}

                {/* Stem */}
                <div className="mb-5">
                  <MathJax>
                    <div className="text-base text-slate-100 leading-relaxed question-content" dangerouslySetInnerHTML={{ __html: currentQuestion.stem }} />
                  </MathJax>
                </div>

                {/* MCQ options */}
                {currentQuestion.questionType === "mcq" && currentQuestion.answerOptions && (
                  <div className="space-y-2.5 mb-6">
                    {currentQuestion.answerOptions.map(option => {
                      const isSelected = userAnswer === option.id;
                      const isCorrectOption = currentQuestion.correctAnswer.includes(option.id);
                      return (
                        <button key={option.id} onClick={() => handleAnswer(option.id)} disabled={isSubmitted}
                          className={cn("w-full text-left p-4 rounded-xl border transition-all duration-200 flex items-start gap-3",
                            !isSubmitted && isSelected ? "bg-[#F59E0B]/10 border-[#F59E0B]/50 text-white" :
                            !isSubmitted ? "bg-white/3 border-white/8 text-slate-300 hover:bg-white/6 hover:border-white/15" :
                            isCorrectOption ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-300" :
                            isSelected ? "bg-red-500/15 border-red-500/40 text-red-300" :
                            "bg-white/3 border-white/8 text-slate-500"
                          )}>
                          <span className={cn("flex-shrink-0 w-6 h-6 rounded-full border flex items-center justify-center text-xs font-bold mt-0.5",
                            isSubmitted && isCorrectOption ? "bg-emerald-500 border-emerald-500 text-white" :
                            isSubmitted && isSelected ? "bg-red-500 border-red-500 text-white" :
                            isSelected ? "bg-[#F59E0B] border-[#F59E0B] text-[#050B18]" :
                            "border-white/20 text-slate-500"
                          )}>
                            {isSubmitted && isCorrectOption ? <Check className="w-3 h-3" /> :
                             isSubmitted && isSelected ? <X className="w-3 h-3" /> :
                             option.id.toUpperCase()}
                          </span>
                          <MathJax>
                            <span className="text-sm leading-relaxed question-content" dangerouslySetInnerHTML={{ __html: option.content }} />
                          </MathJax>
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* SPR input */}
                {currentQuestion.questionType === "spr" && (
                  <div className="mb-6">
                    <input
                      type="text" placeholder="Enter your answer..."
                      value={userAnswer || ""} onChange={e => handleAnswer(e.target.value)} disabled={isSubmitted}
                      className={cn("w-full max-w-xs h-12 px-4 rounded-xl border text-white text-center text-lg font-medium bg-white/5 focus:outline-none focus:ring-2 focus:ring-[#F59E0B]/50",
                        isSubmitted ? isCorrect ? "border-emerald-500/50 bg-emerald-500/10" : "border-red-500/50 bg-red-500/10" : "border-white/10 focus:border-[#F59E0B]/50"
                      )}
                    />
                    {isSubmitted && !isCorrect && (
                      <p className="mt-2 text-sm text-slate-400">Correct: <span className="text-emerald-400 font-medium">{currentQuestion.correctAnswer.join(", ")}</span></p>
                    )}
                  </div>
                )}

                {/* Result + rationale + note */}
                {isSubmitted && (
                  <AnimatePresence>
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                      <div className={cn("rounded-xl p-4 mb-4 border flex items-start gap-3", isCorrect ? "bg-emerald-500/10 border-emerald-500/30" : "bg-red-500/10 border-red-500/30")}>
                        <div className={cn("flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center", isCorrect ? "bg-emerald-500" : "bg-red-500")}>
                          {isCorrect ? <Check className="w-4 h-4 text-white" /> : <X className="w-4 h-4 text-white" />}
                        </div>
                        <div>
                          <p className={cn("font-semibold", isCorrect ? "text-emerald-300" : "text-red-300")}>
                            {isCorrect ? (calmMode ? "Excellent work! You've got this." : "Correct!") : (calmMode ? "Not quite — every mistake teaches you something." : "Not quite. Keep going!")}
                          </p>
                          {!isCorrect && currentQuestion.correctAnswer.length > 0 && (
                            <p className="text-sm text-slate-400 mt-1">Correct answer: <span className="text-emerald-400 font-medium">{currentQuestion.correctAnswer.join(", ")}</span></p>
                          )}
                          <p className="text-xs text-slate-600 mt-1 flex items-center gap-1">
                            <Timer className="w-3 h-3" />Time: {formatTime(perQuestionTimes.get(currentIndex) ?? questionTime)}
                          </p>
                        </div>
                      </div>

                      {currentQuestion.rationale && (
                        <div className="mb-4">
                          <button onClick={() => setShowRationale(!showRationale)} className="flex items-center gap-2 text-sm text-[#F59E0B] hover:text-[#FBBF24] transition-colors">
                            <Lightbulb className="w-4 h-4" />
                            {showRationale ? "Hide" : "Show"} explanation
                            {showRationale ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                          </button>
                          <AnimatePresence>
                            {showRationale && (
                              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="mt-3 overflow-hidden">
                                <div className="p-4 glass rounded-xl">
                                  <MathJax>
                                    <div className="text-sm text-slate-300 leading-relaxed question-content" dangerouslySetInnerHTML={{ __html: currentQuestion.rationale }} />
                                  </MathJax>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      )}

                      <div className="border-t border-white/8 pt-4">
                        {hasNote && !showNoteInput ? (
                          <div className="p-3 bg-amber-500/6 border border-amber-500/15 rounded-xl mb-2">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex items-start gap-2">
                                <PenLine className="w-3.5 h-3.5 text-amber-400/70 flex-shrink-0 mt-0.5" />
                                <p className="text-xs text-slate-300 leading-relaxed">{questionNotes.get(currentQuestion.id)}</p>
                              </div>
                              <button onClick={() => { setNoteInput(questionNotes.get(currentQuestion.id) ?? ""); setShowNoteInput(true); }} className="text-xs text-slate-500 hover:text-amber-400 transition-colors flex-shrink-0">Edit</button>
                            </div>
                          </div>
                        ) : (
                          <button onClick={() => { setNoteInput(questionNotes.get(currentQuestion.id) ?? ""); setShowNoteInput(true); }} className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-[#F59E0B] transition-colors">
                            <PenLine className="w-3.5 h-3.5" />Add note
                          </button>
                        )}
                        <AnimatePresence>
                          {showNoteInput && (
                            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                              <div className="mt-2 space-y-2">
                                <textarea autoFocus value={noteInput} onChange={e => setNoteInput(e.target.value)} placeholder="Your thoughts, strategy, what you learned..." className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm text-slate-300 resize-none h-20 focus:outline-none focus:border-[#F59E0B]/50 focus:ring-1 focus:ring-[#F59E0B]/30 placeholder:text-slate-600" />
                                <div className="flex gap-2">
                                  <Button size="sm" onClick={handleSaveNote} className="gap-1.5"><Save className="w-3.5 h-3.5" />Save Note</Button>
                                  <Button variant="ghost" size="sm" onClick={() => setShowNoteInput(false)}>Cancel</Button>
                                </div>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </motion.div>
                  </AnimatePresence>
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        {/* Bottom actions */}
        <div className="flex-shrink-0 border-t border-white/8 bg-[#050B18]/95 backdrop-blur-sm">
          <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
            <Button variant="ghost" size="sm" onClick={handlePrev} disabled={currentIndex === 0}>
              ← Back
            </Button>
            <div className="flex items-center gap-2">
              {!isSubmitted ? (
                <>
                  <Button variant="ghost" size="sm" onClick={handleSkip} className="text-slate-500">
                    <SkipForward className="w-4 h-4" />Skip
                  </Button>
                  <Button size="md" onClick={handleSubmit} disabled={!answers.has(currentIndex)}>
                    Check Answer
                  </Button>
                </>
              ) : (
                <Button size="md" onClick={handleNext}>
                  {currentIndex >= (isAdaptive ? questionOrder.length - 1 : questions.length - 1) ? "Finish" : "Next →"}
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </MathJaxContext>
  );
}

// Session Summary (full-screen)
function SessionSummary({ answers, timeSeconds, calmMode, isAdaptive, onRestart, onClose }: {
  answers: SessionAnswer[]; timeSeconds: number; calmMode: boolean; isAdaptive?: boolean; onRestart: () => void; onClose?: () => void;
}) {
  const attempted = answers.filter(a => !a.skipped);
  const correct = attempted.filter(a => a.isCorrect);
  const wrong = attempted.filter(a => !a.isCorrect);
  const accuracy = attempted.length > 0 ? (correct.length / attempted.length) * 100 : 0;

  const bySkill = wrong.reduce<Record<string, number>>((acc, a) => {
    acc[a.skill] = (acc[a.skill] || 0) + 1;
    return acc;
  }, {});
  const worstSkills = Object.entries(bySkill).sort((a, b) => b[1] - a[1]).slice(0, 3);

  const byDiff = {
    E: { correct: 0, total: 0 }, M: { correct: 0, total: 0 }, H: { correct: 0, total: 0 }
  };
  attempted.forEach(a => {
    byDiff[a.difficulty].total += 1;
    if (a.isCorrect) byDiff[a.difficulty].correct += 1;
  });

  const avgTime = attempted.length > 0
    ? Math.round(attempted.reduce((sum, a) => sum + (a.timeSpentSeconds || 0), 0) / attempted.length)
    : 0;

  return (
    <div className="min-h-screen bg-[#050B18] flex items-center justify-center px-4 py-16">
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="max-w-lg w-full">
        <div className="text-center mb-8">
          <div className="w-20 h-20 rounded-full bg-[#F59E0B]/10 border border-[#F59E0B]/20 flex items-center justify-center mx-auto mb-4 animate-glow-breathe">
            <span className="text-3xl">{accuracy >= 80 ? "🌟" : accuracy >= 60 ? "✨" : "💪"}</span>
          </div>
          <h2 className="text-3xl font-bold text-white mb-2">
            {accuracy >= 80 ? "Fantastic work!" : accuracy >= 60 ? "Good effort!" : "Keep pushing!"}
          </h2>
          <p className="text-slate-400">
            {isAdaptive ? "Adaptive session complete — you faced questions matched to your level." :
             calmMode ? "Calm practice session complete. Be proud of yourself." :
             "Practice session complete. Here's how you did."}
          </p>
        </div>

        <Card variant="glow" className="mb-4">
          <CardContent className="p-6">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-3xl font-bold text-[#F59E0B]">{Math.round(accuracy)}%</div>
                <div className="text-xs text-slate-500 mt-1">Accuracy</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-white">{correct.length}/{attempted.length}</div>
                <div className="text-xs text-slate-500 mt-1">Correct</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-[#14B8A6]">{formatTime(timeSeconds)}</div>
                <div className="text-xs text-slate-500 mt-1">Total Time</div>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-white/8 grid grid-cols-3 gap-2 text-center">
              {(["E", "M", "H"] as QuestionDifficulty[]).map(d => {
                const dd = byDiff[d];
                if (dd.total === 0) return null;
                const acc = Math.round((dd.correct / dd.total) * 100);
                return (
                  <div key={d}>
                    <div className={cn("text-lg font-bold", d === "E" ? "text-emerald-400" : d === "M" ? "text-amber-400" : "text-red-400")}>{acc}%</div>
                    <div className="text-xs text-slate-600">{d === "E" ? "Easy" : d === "M" ? "Medium" : "Hard"} ({dd.correct}/{dd.total})</div>
                  </div>
                );
              })}
            </div>
            {avgTime > 0 && (
              <p className="text-xs text-slate-600 text-center mt-3">Avg. {avgTime}s per question</p>
            )}
          </CardContent>
        </Card>

        {worstSkills.length > 0 && (
          <Card className="mb-4">
            <CardContent className="p-4">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Weak Areas — Auto-saved to Logbook</p>
              <div className="space-y-1.5">
                {worstSkills.map(([skill, count]) => (
                  <div key={skill} className="flex items-center justify-between">
                    <span className="text-sm text-slate-300">{skill}</span>
                    <Badge variant="danger" className="text-xs">{count} wrong</Badge>
                  </div>
                ))}
              </div>
              <p className="text-xs text-slate-600 mt-2">Check Notes → Logbook to review all mistakes.</p>
            </CardContent>
          </Card>
        )}

        <div className="flex flex-col gap-3">
          <Button size="lg" onClick={onRestart} className="w-full"><RefreshCw className="w-4 h-4" />Practice Again</Button>
          <a href="/notes" className="w-full inline-flex items-center justify-center gap-2 h-12 px-6 text-base rounded-xl font-semibold bg-[#142342] text-slate-200 hover:bg-[#1A2C52] border border-white/10 transition-all">
            <PenLine className="w-4 h-4" />Review Logbook
          </a>
          <a href="/dashboard" className="w-full inline-flex items-center justify-center h-10 text-sm rounded-xl font-semibold bg-white/5 text-slate-400 hover:bg-white/10 transition-all">
            View Dashboard
          </a>
          {onClose && <Button variant="ghost" size="md" onClick={onClose} className="w-full">Back to Practice Settings</Button>}
        </div>
      </motion.div>
    </div>
  );
}
