import { ScoreChart } from "@/components/score-chart";
import { SiteShell } from "@/components/site-shell";
import { dashboardStats, scoreHistory } from "@/lib/mock-data";

export default function DashboardPage() {
  return (
    <SiteShell
      title="Progress Dashboard"
      subtitle="Monitor score growth, study consistency, and emotional readiness."
    >
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {dashboardStats.map((stat) => (
          <article
            key={stat.label}
            className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800"
          >
            <p className="text-xs uppercase tracking-wide text-slate-500">{stat.label}</p>
            <p className="mt-1 text-2xl font-semibold">{stat.value}</p>
          </article>
        ))}
      </section>

      <div className="mt-6">
        <h2 className="text-lg font-semibold">SAT estimate trend</h2>
        <p className="mb-3 text-sm text-slate-600 dark:text-slate-300">
          Adaptive recommendations currently focus on algebra pacing and reading synthesis.
        </p>
        <ScoreChart data={scoreHistory} />
      </div>
    </SiteShell>
  );
}
