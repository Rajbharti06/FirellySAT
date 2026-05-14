"use client";

import React from "react";
import { motion } from "framer-motion";
import {
  Flame, Sparkles, Wind, BookMarked, Brain, TrendingUp,
  Clock, Shield, Heart
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const features = [
  {
    icon: Flame,
    title: "Practice Rush",
    description:
      "Infinite practice with real College Board questions. Adaptive difficulty ensures you're always challenged at the right level.",
    color: "text-[#F59E0B]",
    bg: "bg-[#F59E0B]/10",
    border: "border-[#F59E0B]/20",
  },
  {
    icon: Sparkles,
    title: "AI Study Plan",
    description:
      "Tell us your target score and test date. Our AI builds a week-by-week plan tailored specifically to your strengths and gaps.",
    color: "text-violet-400",
    bg: "bg-violet-400/10",
    border: "border-violet-400/20",
  },
  {
    icon: Wind,
    title: "Calm Mode",
    description:
      "Specially designed for anxious students. Soft animations, breathing exercises, and encouraging messages keep you grounded.",
    color: "text-[#14B8A6]",
    bg: "bg-[#14B8A6]/10",
    border: "border-[#14B8A6]/20",
  },
  {
    icon: Brain,
    title: "AI Study Buddy",
    description:
      "Stuck on a concept? Chat with your AI study buddy. Get explanations, strategies, and encouragement anytime.",
    color: "text-pink-400",
    bg: "bg-pink-400/10",
    border: "border-pink-400/20",
  },
  {
    icon: TrendingUp,
    title: "Score Predictor",
    description:
      "Based on your practice data, we predict your current SAT score and tell you exactly what to focus on to reach your goal.",
    color: "text-emerald-400",
    bg: "bg-emerald-400/10",
    border: "border-emerald-400/20",
  },
  {
    icon: BookMarked,
    title: "Question Bank",
    description:
      "Browse and filter 2,000+ official questions. Save any question for later review. Track every question you've answered.",
    color: "text-blue-400",
    bg: "bg-blue-400/10",
    border: "border-blue-400/20",
  },
  {
    icon: Clock,
    title: "Smart Spaced Repetition",
    description:
      "Wrong answers get scheduled for review at the right time. Our spaced repetition system maximizes long-term retention.",
    color: "text-orange-400",
    bg: "bg-orange-400/10",
    border: "border-orange-400/20",
  },
  {
    icon: Shield,
    title: "Progress Protection",
    description:
      "Never lose your progress. Everything is saved locally and syncs across sessions so you can pick up exactly where you left off.",
    color: "text-slate-400",
    bg: "bg-slate-400/10",
    border: "border-slate-400/20",
  },
  {
    icon: Heart,
    title: "Mental Wellness",
    description:
      "We care about more than just your score. Get test-anxiety strategies, daily affirmations, and breathing exercises built in.",
    color: "text-rose-400",
    bg: "bg-rose-400/10",
    border: "border-rose-400/20",
  },
];

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.08 },
  },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

export function Features() {
  return (
    <section className="py-24 px-4">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <span className="text-sm font-semibold text-[#F59E0B] uppercase tracking-widest mb-3 block">
            Everything you need
          </span>
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
            More than just practice questions
          </h2>
          <p className="text-slate-400 text-lg max-w-2xl mx-auto">
            FirellySAT is a complete SAT prep ecosystem — built to reduce anxiety,
            build confidence, and get you to your target score.
          </p>
        </motion.div>

        <motion.div
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5"
        >
          {features.map((f) => {
            const Icon = f.icon;
            return (
              <motion.div key={f.title} variants={item}>
                <Card
                  className={`h-full border ${f.border} bg-[#0A1428] hover:bg-[#0F1B35] transition-all duration-300 hover:scale-[1.02] cursor-default`}
                >
                  <CardContent className="p-6">
                    <div className={`inline-flex p-2.5 rounded-xl ${f.bg} mb-4`}>
                      <Icon className={`w-5 h-5 ${f.color}`} />
                    </div>
                    <h3 className="text-base font-semibold text-white mb-2">
                      {f.title}
                    </h3>
                    <p className="text-sm text-slate-400 leading-relaxed">
                      {f.description}
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}
