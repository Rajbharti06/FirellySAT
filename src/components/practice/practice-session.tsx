"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, ArrowRight, Bookmark, BookmarkCheck,
  Timer, Check, X, SkipForward, Wind, RefreshCw,
  ChevronDown, ChevronUp, Lightbulb
} from "lucide-react";
import { MathJax, MathJaxContext } from "better-react-mathjax";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent } from "@/components/ui/card";
import { cn, formatTime, difficultyLabel, difficultyColor, domainLabel, getCalmnessMessage } from "@/lib/utils";
import { isQuestionSaved, saveQuestion, unsaveQuestion, recordSessionComplete, saveNoteQuestion } from "@/lib/storage";
import type { Question, SessionAnswer, QuestionDomain, QuestionDifficulty } from "@/types";
import confetti from "canvas-confetti";

interface PracticeSessionProps {
  questions: Question[];
  calmMode?: boolean;
  onComplete?: (answers: SessionAnswer[]) => void;
  onClose?: () => void;
}

const mathJaxConfig = {
  loader: { load: ["input/tex", "output/chtml"] },
  tex: { inlineMath: [["$", "$"], ["\\(", "\\)"]] },
};

export function PracticeSession({
  questions,
  calmMode = false,
  onComplete,
  onClose,
}: PracticeSessionProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Map<number, string>>(new Map());
  const [submitted, setSubmitted] = useState<Set<number>>(new Set());
  const [saved, setSaved] = useState<Set<string>>(new Set());
  const [timeSeconds, setTimeSeconds] = useState(0);
  const [questionTime, setQuestionTime] = useState(0);
  const [showRationale, setShowRationale] = useState(false);
  const [sessionComplete, setSessionComplete] = useState(false);
  const [sessionAnswers, setSessionAnswers] = useState<SessionAnswer[]>([]);
  const [calmMessage, setCalmMessage] = useState("");
  const [showCalm, setShowCalm] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const questionTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef(Date.now());

  const currentQuestion = questions[currentIndex];

  // Initialize saved state
  useEffect(() => {
    const savedSet = new Set(
      questions
        .filter((q) => isQuestionSaved(q.id))
        .map((q) => q.id)
    );
    setSaved(savedSet);
  }, [questions]);

  // Main timer
  useEffect(() => {
    timerRef.current = setInterval(() => {
      setTimeSeconds((t) => t + 1);
    }, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // Per-question timer
  useEffect(() => {
    setQuestionTime(0);
    questionTimerRef.current = setInterval(() => {
      setQuestionTime((t) => t + 1);
    }, 1000);
    return () => {
      if (questionTimerRef.current) clearInterval(questionTimerRef.current);
    };
  }, [currentIndex]);

  // Calm mode trigger — after 60s on a question, show a calming message
  useEffect(() => {
    if (calmMode && questionTime === 60) {
      setCalmMessage(getCalmnessMessage());
      setShowCalm(true);
      setTimeout(() => setShowCalm(false), 5000);
    }
  }, [questionTime, calmMode]);

  const handleAnswer = useCallback(
    (answer: string) => {
      if (submitted.has(currentIndex)) return;
      setAnswers((prev) => new Map(prev).set(currentIndex, answer));
    },
    [currentIndex, submitted]
  );

  const handleSubmit = useCallback(() => {
    if (!currentQuestion || submitted.has(currentIndex)) return;
    const userAnswer = answers.get(currentIndex) || "";
    const isCorrect = currentQuestion.correctAnswer.includes(userAnswer);

    const newSubmitted = new Set(submitted).add(currentIndex);
    setSubmitted(newSubmitted);

    if (isCorrect && !calmMode) {
      confetti({ particleCount: 30, spread: 60, origin: { y: 0.7 } });
    }
  }, [currentQuestion, currentIndex, answers, submitted, calmMode]);

  const handleNext = useCallback(() => {
    setShowRationale(false);
    if (currentIndex < questions.length - 1) {
      setCurrentIndex((i) => i + 1);
    } else {
      handleComplete();
    }
  }, [currentIndex, questions.length]);

  const handlePrev = () => {
    setShowRationale(false);
    if (currentIndex > 0) setCurrentIndex((i) => i - 1);
  };

  const handleSkip = () => {
    setShowRationale(false);
    const sessionAnswer: SessionAnswer = {
      questionId: currentQuestion.id,
      userAnswer: "",
      isCorrect: false,
      timeSpentSeconds: questionTime,
      domain: currentQuestion.domain,
      skill: currentQuestion.skill,
      difficulty: currentQuestion.difficulty,
      skipped: true,
    };
    setSessionAnswers((prev) => [...prev, sessionAnswer]);
    if (currentIndex < questions.length - 1) {
      setCurrentIndex((i) => i + 1);
    } else {
      handleComplete();
    }
  };

  const handleComplete = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (questionTimerRef.current) clearInterval(questionTimerRef.current);

    const allAnswers: SessionAnswer[] = questions.map((q, i) => ({
      questionId: q.id,
      userAnswer: answers.get(i) || "",
      isCorrect: q.correctAnswer.includes(answers.get(i) || ""),
      timeSpentSeconds: questionTime,
      domain: q.domain,
      skill: q.skill,
      difficulty: q.difficulty,
      skipped: !submitted.has(i) && !answers.has(i),
    }));

    recordSessionComplete(
      allAnswers,
      currentQuestion?.domain ?? "mixed",
      timeSeconds,
      calmMode
    );

    setSessionAnswers(allAnswers);
    setSessionComplete(true);
    onComplete?.(allAnswers);
  }, [questions, answers, submitted, timeSeconds, questionTime, currentQuestion, calmMode, onComplete]);

  const handleSaveToggle = () => {
    if (!currentQuestion) return;
    if (saved.has(currentQuestion.id)) {
      unsaveQuestion(currentQuestion.id);
      setSaved((s) => {
        const next = new Set(s);
        next.delete(currentQuestion.id);
        return next;
      });
    } else {
      saveQuestion({
        questionId: currentQuestion.id,
        savedAt: new Date().toISOString(),
        domain: currentQuestion.domain,
        difficulty: currentQuestion.difficulty,
        skill: currentQuestion.skill,
      });
      // Snapshot full question data so it can be attached to notes later
      saveNoteQuestion({
        questionId: currentQuestion.id,
        stem: currentQuestion.stem,
        domain: currentQuestion.domain,
        difficulty: currentQuestion.difficulty,
        skill: currentQuestion.skill,
        correctAnswer: currentQuestion.correctAnswer,
        rationale: currentQuestion.rationale,
        snapshotAt: new Date().toISOString(),
      });
      setSaved((s) => new Set(s).add(currentQuestion.id));
    }
  };

  if (!currentQuestion && !sessionComplete) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-slate-400">No questions available.</p>
      </div>
    );
  }

  if (sessionComplete) {
    return (
      <SessionSummary
        answers={sessionAnswers}
        timeSeconds={timeSeconds}
        calmMode={calmMode}
        onRestart={() => {
          setCurrentIndex(0);
          setAnswers(new Map());
          setSubmitted(new Set());
          setSessionComplete(false);
          setTimeSeconds(0);
          setSessionAnswers([]);
        }}
        onClose={onClose}
      />
    );
  }

  const isSubmitted = submitted.has(currentIndex);
  const userAnswer = answers.get(currentIndex);
  const isCorrect = isSubmitted && currentQuestion.correctAnswer.includes(userAnswer || "");
  const isSaved = saved.has(currentQuestion.id);
  const progress = ((currentIndex + 1) / questions.length) * 100;

  return (
    <MathJaxContext config={mathJaxConfig}>
      <div
        className={cn(
          "min-h-screen flex flex-col",
          calmMode ? "bg-gradient-to-b from-[#050B18] to-[#0A1428]" : "bg-[#050B18]"
        )}
      >
        {/* Top bar */}
        <div className="sticky top-0 z-20 glass border-b border-white/8">
          <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-4">
            <Button variant="ghost" size="icon-sm" onClick={onClose}>
              <ArrowLeft className="w-4 h-4" />
            </Button>

            <div className="flex-1">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs text-slate-500">
                  Question {currentIndex + 1} of {questions.length}
                </span>
                <span className="text-xs text-slate-500 flex items-center gap-1">
                  <Timer className="w-3 h-3" />
                  {formatTime(timeSeconds)}
                </span>
              </div>
              <Progress value={progress} className="h-1" />
            </div>

            <Button
              variant="ghost"
              size="icon-sm"
              onClick={handleSaveToggle}
              className={isSaved ? "text-[#F59E0B]" : "text-slate-500"}
            >
              {isSaved ? (
                <BookmarkCheck className="w-4 h-4" />
              ) : (
                <Bookmark className="w-4 h-4" />
              )}
            </Button>

            {calmMode && (
              <Badge variant="calm" className="hidden sm:flex gap-1">
                <Wind className="w-3 h-3" />
                Calm
              </Badge>
            )}
          </div>
        </div>

        {/* Calm message overlay */}
        <AnimatePresence>
          {showCalm && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="sticky top-16 z-10 mx-4 mt-2"
            >
              <div className="max-w-4xl mx-auto">
                <div className="bg-[#14B8A6]/10 border border-[#14B8A6]/20 rounded-xl px-4 py-3 text-sm text-[#14B8A6] flex items-center gap-2">
                  <Wind className="w-4 h-4 flex-shrink-0" />
                  {calmMessage}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main content */}
        <div className="flex-1 max-w-4xl mx-auto w-full px-4 py-8">
          {/* Metadata */}
          <div className="flex flex-wrap items-center gap-2 mb-6">
            <Badge variant={currentQuestion.domain === "math" ? "math" : "rw"}>
              {domainLabel(currentQuestion.domain)}
            </Badge>
            <Badge
              className={cn(
                "border",
                currentQuestion.difficulty === "E"
                  ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                  : currentQuestion.difficulty === "M"
                  ? "bg-amber-500/15 text-amber-400 border-amber-500/30"
                  : "bg-red-500/15 text-red-400 border-red-500/30"
              )}
            >
              {difficultyLabel(currentQuestion.difficulty)}
            </Badge>
            <Badge variant="outline" className="text-slate-500">
              {currentQuestion.skill}
            </Badge>
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={currentIndex}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              {/* Passage */}
              {currentQuestion.associatedPassage && (
                <Card className="mb-6">
                  <CardContent className="p-5">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
                      Passage
                    </p>
                    <div
                      className="text-sm text-slate-300 leading-relaxed question-content prose-invert"
                      dangerouslySetInnerHTML={{
                        __html: currentQuestion.associatedPassage,
                      }}
                    />
                  </CardContent>
                </Card>
              )}

              {/* Question stem */}
              <div className="mb-6">
                <MathJax>
                  <div
                    className="text-base text-slate-100 leading-relaxed question-content"
                    dangerouslySetInnerHTML={{ __html: currentQuestion.stem }}
                  />
                </MathJax>
              </div>

              {/* Answer options (MCQ) */}
              {currentQuestion.questionType === "mcq" &&
                currentQuestion.answerOptions && (
                  <div className="space-y-3 mb-8">
                    {currentQuestion.answerOptions.map((option) => {
                      const isSelected = userAnswer === option.id;
                      const isCorrectOption =
                        currentQuestion.correctAnswer.includes(option.id);
                      const showResult = isSubmitted;

                      return (
                        <button
                          key={option.id}
                          onClick={() => handleAnswer(option.id)}
                          disabled={isSubmitted}
                          className={cn(
                            "w-full text-left p-4 rounded-xl border transition-all duration-200 flex items-start gap-3",
                            !showResult && isSelected
                              ? "bg-[#F59E0B]/10 border-[#F59E0B]/50 text-white"
                              : !showResult && !isSelected
                              ? "bg-white/3 border-white/8 text-slate-300 hover:bg-white/6 hover:border-white/15"
                              : showResult && isCorrectOption
                              ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-300"
                              : showResult && isSelected && !isCorrectOption
                              ? "bg-red-500/15 border-red-500/40 text-red-300"
                              : "bg-white/3 border-white/8 text-slate-500"
                          )}
                        >
                          <span
                            className={cn(
                              "flex-shrink-0 w-6 h-6 rounded-full border flex items-center justify-center text-xs font-bold mt-0.5",
                              showResult && isCorrectOption
                                ? "bg-emerald-500 border-emerald-500 text-white"
                                : showResult && isSelected && !isCorrectOption
                                ? "bg-red-500 border-red-500 text-white"
                                : isSelected
                                ? "bg-[#F59E0B] border-[#F59E0B] text-[#050B18]"
                                : "border-white/20 text-slate-500"
                            )}
                          >
                            {showResult && isCorrectOption ? (
                              <Check className="w-3 h-3" />
                            ) : showResult && isSelected && !isCorrectOption ? (
                              <X className="w-3 h-3" />
                            ) : (
                              option.id.toUpperCase()
                            )}
                          </span>
                          <MathJax>
                            <span
                              className="text-sm leading-relaxed"
                              dangerouslySetInnerHTML={{ __html: option.content }}
                            />
                          </MathJax>
                        </button>
                      );
                    })}
                  </div>
                )}

              {/* SPR input */}
              {currentQuestion.questionType === "spr" && (
                <div className="mb-8">
                  <input
                    type="text"
                    placeholder="Enter your answer..."
                    value={userAnswer || ""}
                    onChange={(e) => handleAnswer(e.target.value)}
                    disabled={isSubmitted}
                    className={cn(
                      "w-full max-w-xs h-12 px-4 rounded-xl border text-white text-center text-lg font-medium",
                      "bg-white/5 focus:outline-none focus:ring-2 focus:ring-[#F59E0B]/50",
                      isSubmitted
                        ? isCorrect
                          ? "border-emerald-500/50 bg-emerald-500/10"
                          : "border-red-500/50 bg-red-500/10"
                        : "border-white/10 focus:border-[#F59E0B]/50"
                    )}
                  />
                  {isSubmitted && !isCorrect && (
                    <p className="mt-2 text-sm text-slate-400">
                      Correct answer:{" "}
                      <span className="text-emerald-400 font-medium">
                        {currentQuestion.correctAnswer.join(", ")}
                      </span>
                    </p>
                  )}
                </div>
              )}

              {/* Result + rationale */}
              {isSubmitted && (
                <AnimatePresence>
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    <div
                      className={cn(
                        "rounded-xl p-4 mb-4 border flex items-start gap-3",
                        isCorrect
                          ? "bg-emerald-500/10 border-emerald-500/30"
                          : "bg-red-500/10 border-red-500/30"
                      )}
                    >
                      <div
                        className={cn(
                          "flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center",
                          isCorrect ? "bg-emerald-500" : "bg-red-500"
                        )}
                      >
                        {isCorrect ? (
                          <Check className="w-4 h-4 text-white" />
                        ) : (
                          <X className="w-4 h-4 text-white" />
                        )}
                      </div>
                      <div>
                        <p
                          className={cn(
                            "font-semibold",
                            isCorrect ? "text-emerald-300" : "text-red-300"
                          )}
                        >
                          {isCorrect
                            ? calmMode
                              ? "Excellent work! You've got this."
                              : "Correct!"
                            : calmMode
                            ? "Not quite — and that's perfectly fine. Every mistake teaches you something."
                            : "Not quite. Keep going!"}
                        </p>
                        {!isCorrect && currentQuestion.correctAnswer.length > 0 && (
                          <p className="text-sm text-slate-400 mt-1">
                            Correct answer:{" "}
                            <span className="text-emerald-400 font-medium">
                              {currentQuestion.correctAnswer.join(", ")}
                            </span>
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Rationale toggle */}
                    {currentQuestion.rationale && (
                      <div className="mb-4">
                        <button
                          onClick={() => setShowRationale(!showRationale)}
                          className="flex items-center gap-2 text-sm text-[#F59E0B] hover:text-[#FBBF24] transition-colors"
                        >
                          <Lightbulb className="w-4 h-4" />
                          {showRationale ? "Hide" : "Show"} explanation
                          {showRationale ? (
                            <ChevronUp className="w-3 h-3" />
                          ) : (
                            <ChevronDown className="w-3 h-3" />
                          )}
                        </button>
                        <AnimatePresence>
                          {showRationale && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: "auto" }}
                              exit={{ opacity: 0, height: 0 }}
                              className="mt-3 overflow-hidden"
                            >
                              <div className="p-4 glass rounded-xl">
                                <MathJax>
                                  <div
                                    className="text-sm text-slate-300 leading-relaxed question-content"
                                    dangerouslySetInnerHTML={{
                                      __html: currentQuestion.rationale,
                                    }}
                                  />
                                </MathJax>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    )}
                  </motion.div>
                </AnimatePresence>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Bottom actions */}
        <div className="sticky bottom-0 glass border-t border-white/8">
          <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={handlePrev}
              disabled={currentIndex === 0}
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </Button>

            <div className="flex items-center gap-2">
              {!isSubmitted ? (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleSkip}
                    className="text-slate-500"
                  >
                    <SkipForward className="w-4 h-4" />
                    Skip
                  </Button>
                  <Button
                    size="md"
                    onClick={handleSubmit}
                    disabled={!answers.has(currentIndex)}
                  >
                    Check Answer
                  </Button>
                </>
              ) : (
                <Button size="md" onClick={handleNext}>
                  {currentIndex === questions.length - 1 ? "Finish" : "Next"}
                  <ArrowRight className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </MathJaxContext>
  );
}

// Session summary component
function SessionSummary({
  answers,
  timeSeconds,
  calmMode,
  onRestart,
  onClose,
}: {
  answers: SessionAnswer[];
  timeSeconds: number;
  calmMode: boolean;
  onRestart: () => void;
  onClose?: () => void;
}) {
  const attempted = answers.filter((a) => !a.skipped);
  const correct = attempted.filter((a) => a.isCorrect);
  const accuracy = attempted.length > 0 ? (correct.length / attempted.length) * 100 : 0;

  return (
    <div className="min-h-screen bg-[#050B18] flex items-center justify-center px-4 py-16">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-lg w-full"
      >
        <div className="text-center mb-8">
          <div className="w-20 h-20 rounded-full bg-[#F59E0B]/10 border border-[#F59E0B]/20 flex items-center justify-center mx-auto mb-4 animate-glow-breathe">
            <span className="text-3xl">
              {accuracy >= 80 ? "🌟" : accuracy >= 60 ? "✨" : "💪"}
            </span>
          </div>
          <h2 className="text-3xl font-bold text-white mb-2">
            {accuracy >= 80
              ? "Fantastic work!"
              : accuracy >= 60
              ? "Good effort!"
              : "Keep pushing!"}
          </h2>
          <p className="text-slate-400">
            {calmMode
              ? "You completed a calm practice session. Be proud of yourself."
              : "Practice session complete. Here's how you did."}
          </p>
        </div>

        <Card variant="glow" className="mb-6">
          <CardContent className="p-6">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-3xl font-bold text-[#F59E0B]">
                  {Math.round(accuracy)}%
                </div>
                <div className="text-xs text-slate-500 mt-1">Accuracy</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-white">
                  {correct.length}/{attempted.length}
                </div>
                <div className="text-xs text-slate-500 mt-1">Correct</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-[#14B8A6]">
                  {formatTime(timeSeconds)}
                </div>
                <div className="text-xs text-slate-500 mt-1">Time</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex flex-col gap-3">
          <Button size="lg" onClick={onRestart} className="w-full">
            <RefreshCw className="w-4 h-4" />
            Practice Again
          </Button>
          <a href="/dashboard" className="w-full inline-flex items-center justify-center h-12 px-6 text-base rounded-xl font-semibold bg-[#142342] text-slate-200 hover:bg-[#1A2C52] border border-white/10 transition-all">
            View Progress Dashboard
          </a>
          {onClose && (
            <Button variant="ghost" size="md" onClick={onClose} className="w-full">
              Back to Home
            </Button>
          )}
        </div>
      </motion.div>
    </div>
  );
}
