import type { Metadata } from "next";
import { Hero } from "@/components/home/hero";
import { Features } from "@/components/home/features";
import { AnxietySection } from "@/components/home/anxiety-section";

export const metadata: Metadata = {
  title: "FirellySAT — AI-Powered SAT Prep That Calms Your Nerves",
  description:
    "Your free, AI-powered SAT companion. Personalized study plans, 2000+ official College Board questions, calm mode for anxious students, and a score predictor.",
};

export default function HomePage() {
  return (
    <>
      <Hero />
      <Features />
      <AnxietySection />

      {/* CTA section */}
      <section className="py-24 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Ready to{" "}
            <span className="gradient-text">light your path?</span>
          </h2>
          <p className="text-slate-400 text-lg mb-10">
            Join thousands of students using FirellySAT to reach their SAT
            goals — free, forever.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <a
              href="/practice"
              className="inline-flex items-center gap-2 bg-[#F59E0B] text-[#050B18] px-8 py-3 rounded-xl font-semibold text-lg hover:bg-[#FBBF24] transition-all shadow-[0_0_24px_rgba(245,158,11,0.4)] hover:shadow-[0_0_32px_rgba(245,158,11,0.6)]"
            >
              Start Practicing Free
            </a>
            <a
              href="/study-plan"
              className="inline-flex items-center gap-2 bg-white/5 text-slate-200 border border-white/10 px-8 py-3 rounded-xl font-semibold text-lg hover:bg-white/10 transition-all"
            >
              Get My Study Plan
            </a>
          </div>
        </div>
      </section>
    </>
  );
}
