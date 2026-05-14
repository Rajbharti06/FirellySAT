"use client";

import React from "react";
import { motion } from "framer-motion";
import { Wind, Heart, Smile, BookOpen } from "lucide-react";
import Link from "next/link";

const tips = [
  {
    icon: Wind,
    title: "Breathe First",
    description:
      "Before every practice session, FirellySAT offers a 60-second breathing exercise. Science shows this lowers cortisol and improves focus.",
    color: "text-[#14B8A6]",
  },
  {
    icon: Heart,
    title: "Progress, Not Perfection",
    description:
      "Every wrong answer is data, not failure. Our system celebrates improvement, not just correct answers.",
    color: "text-rose-400",
  },
  {
    icon: Smile,
    title: "Encouragement Built In",
    description:
      "Real, thoughtful encouragement after every question. We never shame you for a wrong answer.",
    color: "text-[#F59E0B]",
  },
  {
    icon: BookOpen,
    title: "Know Your Enemy",
    description:
      "The SAT is a learnable skill — not an IQ test. We'll show you exactly which patterns appear and how to crack them.",
    color: "text-violet-400",
  },
];

export function AnxietySection() {
  return (
    <section className="py-24 px-4 bg-[#0A1428]/50">
      <div className="max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <span className="text-sm font-semibold text-[#14B8A6] uppercase tracking-widest mb-3 block">
            For anxious students
          </span>
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
            The SAT doesn&apos;t have to be scary
          </h2>
          <p className="text-slate-400 text-lg max-w-2xl mx-auto">
            Test anxiety is real. FirellySAT is specifically designed to
            reduce it — so your score reflects your actual ability, not
            your nerves.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
          {tips.map((tip, i) => {
            const Icon = tip.icon;
            return (
              <motion.div
                key={tip.title}
                initial={{ opacity: 0, x: i % 2 === 0 ? -20 : 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="flex gap-4 p-6 glass rounded-2xl"
              >
                <div className="flex-shrink-0 mt-1">
                  <Icon className={`w-6 h-6 ${tip.color}`} />
                </div>
                <div>
                  <h3 className="font-semibold text-white mb-1">{tip.title}</h3>
                  <p className="text-sm text-slate-400 leading-relaxed">
                    {tip.description}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center"
        >
          <Link
            href="/calm"
            className="inline-flex items-center gap-2 h-12 px-6 text-base rounded-xl font-semibold bg-[#14B8A6] text-[#050B18] hover:bg-[#2DD4BF] shadow-[0_0_16px_rgba(20,184,166,0.3)] transition-all"
          >
            <Wind className="w-5 h-5" />
            Try Calm Mode Now
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
