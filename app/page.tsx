import Link from "next/link";
import { SiteShell } from "@/components/site-shell";

const featureCards = [
  {
    title: "Dashboard + analytics",
    text: "Track streaks, score trajectory, and anxiety-support habits in one calm view.",
    href: "/dashboard",
  },
  {
    title: "Practice Rush",
    text: "Fast SAT-style drills with timed focus rounds and adaptive recommendations.",
    href: "/practice-rush",
  },
  {
    title: "AI study planning",
    text: "Generate personalized study plans powered by OpenAI with confidence-first pacing.",
    href: "/study-plan",
  },
  {
    title: "Calm Mode",
    text: "Breathing and anxiety-reduction tools to reset before and during prep sessions.",
    href: "/calm-mode",
  },
];

export default function Home() {
  return (
    <SiteShell
      title="A calm, open-source SAT platform"
      subtitle="Designed for confidence growth: modern UI, adaptive learning, and anxiety-aware prep."
    >
      <div className="grid gap-4 md:grid-cols-2">
        {featureCards.map((card) => (
          <Link
            key={card.title}
            href={card.href}
            className="rounded-2xl border border-slate-200 p-5 transition hover:-translate-y-0.5 hover:shadow-md dark:border-slate-800"
          >
            <h2 className="text-lg font-semibold">{card.title}</h2>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{card.text}</p>
          </Link>
        ))}
      </div>
      <p className="mt-6 text-sm text-slate-600 dark:text-slate-300">
        FirellySAT supports educational, legally safe SAT-style practice content and is structured for beginner-friendly open-source contribution.
      </p>
    </SiteShell>
  );
}
