"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { SiteShell } from "@/components/site-shell";
import { practiceQuestions } from "@/lib/mock-data";

export default function PracticeRushPage() {
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [score, setScore] = useState(0);

  const question = practiceQuestions[index];
  const completed = index >= practiceQuestions.length;

  const recommendation = useMemo(() => {
    if (score >= 2) return "Move to harder mixed-topic drills next session.";
    if (score === 1) return "Stay on medium difficulty to strengthen consistency.";
    return "Drop one level, focus on fundamentals, then reattempt Practice Rush.";
  }, [score]);

  const submitAnswer = () => {
    if (!selected || !question) {
      return;
    }

    if (selected === question.answer) {
      setScore((current) => current + 1);
    }

    setSelected(null);
    setIndex((current) => current + 1);
  };

  return (
    <SiteShell
      title="Practice Rush"
      subtitle="Timed SAT-style focus rounds with adaptive progression suggestions."
    >
      {!completed && question ? (
        <motion.div
          key={question.id}
          initial={{ opacity: 0, x: 12 }}
          animate={{ opacity: 1, x: 0 }}
          className="space-y-4"
        >
          <div className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
            <p className="text-sm text-slate-500">
              Question {index + 1}/{practiceQuestions.length} · {question.topic} · {question.difficulty}
            </p>
            <p className="mt-2 text-lg font-medium">{question.prompt}</p>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {question.options.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setSelected(option)}
                className={`rounded-xl border p-3 text-left transition ${
                  selected === option
                    ? "border-emerald-500 bg-emerald-50 text-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-200"
                    : "border-slate-200 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800"
                }`}
              >
                {option}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={submitAnswer}
            disabled={!selected}
            className="rounded-full bg-emerald-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            Submit & Next
          </button>
        </motion.div>
      ) : (
        <div className="rounded-2xl border border-slate-200 p-5 dark:border-slate-800">
          <h2 className="text-xl font-semibold">Rush complete</h2>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
            Score: {score}/{practiceQuestions.length}
          </p>
          <p className="mt-1 text-sm">Adaptive recommendation: {recommendation}</p>
        </div>
      )}
    </SiteShell>
  );
}
