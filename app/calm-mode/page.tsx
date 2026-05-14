"use client";

import { motion } from "framer-motion";
import { SiteShell } from "@/components/site-shell";
import { calmExercises } from "@/lib/mock-data";

export default function CalmModePage() {
  return (
    <SiteShell
      title="Calm Mode"
      subtitle="Anxiety-reduction tools designed for focus before high-stakes practice."
    >
      <div className="grid gap-5 md:grid-cols-[1fr,1.3fr]">
        <div className="rounded-2xl border border-slate-200 p-5 dark:border-slate-800">
          <h2 className="font-semibold">Breathing orb</h2>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">Inhale 4s · Hold 4s · Exhale 4s</p>
          <div className="mt-8 flex justify-center">
            <motion.div
              animate={{ scale: [1, 1.28, 1] }}
              transition={{ duration: 8, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
              className="h-28 w-28 rounded-full bg-emerald-500/70"
              aria-hidden="true"
            />
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 p-5 dark:border-slate-800">
          <h2 className="font-semibold">Guided sessions</h2>
          <ul className="mt-3 space-y-2">
            {calmExercises.map((exercise) => (
              <li key={exercise.name} className="rounded-xl border border-slate-200 p-3 dark:border-slate-700">
                <p className="font-medium">{exercise.name}</p>
                <p className="text-sm text-slate-600 dark:text-slate-300">{exercise.length}</p>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </SiteShell>
  );
}
