"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Flame, Sparkles, ArrowRight, Wind, Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";

// Floating firefly particles
function FireflyParticles() {
  const [particles, setParticles] = useState<
    Array<{
      id: number;
      x: number;
      y: number;
      size: number;
      duration: number;
      delay: number;
    }>
  >([]);

  useEffect(() => {
    setParticles(
      Array.from({ length: 20 }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: Math.random() * 4 + 2,
        duration: Math.random() * 6 + 4,
        delay: Math.random() * 5,
      }))
    );
  }, []);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className="absolute rounded-full bg-[#FBBF24]"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: p.size,
            height: p.size,
          }}
          animate={{
            opacity: [0, 0.8, 0.8, 0],
            y: [-20, -80],
            x: [0, Math.random() * 40 - 20],
          }}
          transition={{
            duration: p.duration,
            delay: p.delay,
            repeat: Infinity,
            ease: "easeOut",
          }}
        />
      ))}
    </div>
  );
}

export function Hero() {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Night sky gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#050B18] via-[#0A1428] to-[#050B18]" />

      {/* Radial glow */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full bg-[#F59E0B]/5 blur-3xl" />
      <div className="absolute top-1/2 left-1/4 w-[400px] h-[400px] rounded-full bg-[#8B5CF6]/5 blur-3xl" />
      <div className="absolute top-1/2 right-1/4 w-[400px] h-[400px] rounded-full bg-[#14B8A6]/5 blur-3xl" />

      {/* Firefly particles */}
      <FireflyParticles />

      {/* Subtle grid */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }}
      />

      <div className="relative z-10 max-w-5xl mx-auto px-4 text-center py-32">
        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex justify-center mb-6"
        >
          <Badge variant="default" className="px-4 py-1.5 text-sm gap-2">
            <Star className="w-3.5 h-3.5" />
            Free forever · 2,000+ official College Board questions
          </Badge>
        </motion.div>

        {/* Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight leading-tight mb-6"
        >
          <span className="text-white">Your SAT journey, </span>
          <br />
          <span className="gradient-text">lit by fireflies.</span>
        </motion.h1>

        {/* Subheadline */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="text-lg md:text-xl text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed"
        >
          Personalized AI study plans, real College Board practice questions,
          and calming tools that take the fear out of test prep — so you can
          focus on what matters: learning.
        </motion.p>

        {/* CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-16"
        >
          <Link
            href="/practice"
            className="inline-flex items-center justify-center gap-2 h-12 px-6 text-base rounded-xl font-semibold bg-[#F59E0B] text-[#050B18] hover:bg-[#FBBF24] shadow-[0_0_16px_rgba(245,158,11,0.3)] hover:shadow-[0_0_24px_rgba(245,158,11,0.5)] transition-all w-full sm:w-auto"
          >
            <Flame className="w-5 h-5" />
            Start Practicing Now
            <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            href="/study-plan"
            className="inline-flex items-center justify-center gap-2 h-12 px-6 text-base rounded-xl font-semibold bg-[#142342] text-slate-200 hover:bg-[#1A2C52] border border-white/10 transition-all w-full sm:w-auto"
          >
            <Sparkles className="w-5 h-5" />
            Get My AI Study Plan
          </Link>
          <Link
            href="/calm"
            className="inline-flex items-center justify-center gap-2 h-12 px-6 text-base rounded-xl font-semibold bg-[#14B8A6] text-[#050B18] hover:bg-[#2DD4BF] shadow-[0_0_16px_rgba(20,184,166,0.3)] transition-all w-full sm:w-auto"
          >
            <Wind className="w-5 h-5" />
            Try Calm Mode
          </Link>
        </motion.div>

        {/* Social proof */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.5 }}
          className="flex flex-wrap items-center justify-center gap-8 text-sm text-slate-500"
        >
          {[
            { value: "2,000+", label: "Official questions" },
            { value: "Free", label: "Always & forever" },
            { value: "AI", label: "Personalized plans" },
            { value: "0", label: "Test anxiety needed" },
          ].map(({ value, label }) => (
            <div key={label} className="text-center">
              <div className="text-2xl font-bold text-[#F59E0B]">{value}</div>
              <div className="text-xs mt-0.5">{label}</div>
            </div>
          ))}
        </motion.div>
      </div>

      {/* Scroll indicator */}
      <motion.div
        className="absolute bottom-8 left-1/2 -translate-x-1/2"
        animate={{ y: [0, 8, 0] }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
      >
        <div className="w-6 h-10 rounded-full border-2 border-white/20 flex items-start justify-center p-1.5">
          <div className="w-1.5 h-2 bg-[#F59E0B]/60 rounded-full" />
        </div>
      </motion.div>
    </section>
  );
}
