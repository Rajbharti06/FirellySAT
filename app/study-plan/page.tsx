"use client";

import { FormEvent, useState } from "react";
import { SiteShell } from "@/components/site-shell";

type PlanResponse = {
  plan: string;
};

export default function StudyPlanPage() {
  const [goal, setGoal] = useState("Increase my SAT score from 1250 to 1450 in 8 weeks");
  const [plan, setPlan] = useState("");
  const [loading, setLoading] = useState(false);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);

    try {
      const response = await fetch("/api/study-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ goal }),
      });

      const data = (await response.json()) as PlanResponse;
      setPlan(data.plan);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SiteShell
      title="AI-Powered Study Plan"
      subtitle="Personalized planning for score growth with low-stress pacing."
    >
      <form onSubmit={onSubmit} className="space-y-3">
        <label htmlFor="goal" className="text-sm font-medium">
          Study goal
        </label>
        <textarea
          id="goal"
          value={goal}
          onChange={(event) => setGoal(event.target.value)}
          className="h-24 w-full rounded-xl border border-slate-300 bg-transparent p-3 text-sm dark:border-slate-700"
        />
        <button
          type="submit"
          disabled={loading}
          className="rounded-full bg-emerald-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
        >
          {loading ? "Generating..." : "Generate plan"}
        </button>
      </form>

      <div className="mt-5 rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
        <h2 className="font-semibold">Your plan</h2>
        <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700 dark:text-slate-200">
          {plan ||
            "Create a plan to receive a week-by-week schedule with SAT sections, calm practice, and progress checkpoints."}
        </p>
      </div>
    </SiteShell>
  );
}
