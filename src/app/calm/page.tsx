"use client";

export const dynamic = "force-dynamic";

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Wind, Play, Pause, Heart, ArrowRight } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const BREATHING_PHASES = [
  { label: "Breathe In", duration: 4, color: "#14B8A6", scale: 1.3 },
  { label: "Hold", duration: 4, color: "#8B5CF6", scale: 1.3 },
  { label: "Breathe Out", duration: 6, color: "#F59E0B", scale: 1 },
  { label: "Hold", duration: 2, color: "#F1F5F9", scale: 1 },
];

const AFFIRMATIONS = [
  "You are more prepared than you think.",
  "Every practice question makes you stronger.",
  "The SAT is a skill, and skills can be learned.",
  "Your worth is not measured by a test score.",
  "You have everything you need to succeed.",
  "Breathe. Focus. Trust yourself.",
  "Mistakes are lessons, not failures.",
  "You are capable of more than you know.",
  "Progress, not perfection — always.",
  "Take it one question at a time.",
];

export default function CalmPage() {
  const [breathing, setBreathing] = useState(false);
  const [phase, setPhase] = useState(0);
  const [countdown, setCountdown] = useState(BREATHING_PHASES[0].duration);
  const [cycles, setCycles] = useState(0);
  const [affirmation, setAffirmation] = useState(AFFIRMATIONS[0]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    setAffirmation(AFFIRMATIONS[Math.floor(Math.random() * AFFIRMATIONS.length)]);
  }, []);

  useEffect(() => {
    if (!breathing) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    timerRef.current = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          const nextPhase = (phase + 1) % BREATHING_PHASES.length;
          setPhase(nextPhase);
          if (nextPhase === 0) {
            setCycles((cy) => cy + 1);
            setAffirmation(
              AFFIRMATIONS[Math.floor(Math.random() * AFFIRMATIONS.length)]
            );
          }
          return BREATHING_PHASES[nextPhase].duration;
        }
        return c - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [breathing, phase]);

  const currentPhase = BREATHING_PHASES[phase];

  const toggleBreathing = () => {
    if (!breathing) {
      setPhase(0);
      setCountdown(BREATHING_PHASES[0].duration);
    }
    setBreathing(!breathing);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#050B18] via-[#050F1E] to-[#050B18] pt-20">
      {/* Background glow */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full bg-[#14B8A6]/5 blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] rounded-full bg-[#8B5CF6]/5 blur-3xl" />
      </div>

      <div className="relative z-10 max-w-2xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex p-3 rounded-2xl bg-[#14B8A6]/10 border border-[#14B8A6]/20 mb-4">
            <Wind className="w-7 h-7 text-[#14B8A6]" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Calm Mode</h1>
          <p className="text-slate-400">
            Take a moment to breathe. Your score will reflect your true
            ability when your mind is calm.
          </p>
        </div>

        {/* Breathing exercise */}
        <div className="flex flex-col items-center mb-12">
          {/* Circle */}
          <div className="relative flex items-center justify-center mb-8">
            <motion.div
              className="w-56 h-56 rounded-full flex items-center justify-center"
              animate={{
                scale: breathing ? currentPhase.scale : 1,
                boxShadow: breathing
                  ? `0 0 60px ${currentPhase.color}50`
                  : "0 0 20px rgba(20, 184, 166, 0.15)",
              }}
              transition={{
                duration: breathing ? currentPhase.duration * 0.9 : 0.3,
                ease: "easeInOut",
              }}
              style={{
                background: `radial-gradient(circle, ${currentPhase.color}20 0%, ${currentPhase.color}08 60%, transparent 100%)`,
                border: `2px solid ${currentPhase.color}40`,
              }}
            >
              <div className="text-center">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={phase}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="text-center"
                  >
                    <div
                      className="text-2xl font-bold mb-1"
                      style={{ color: currentPhase.color }}
                    >
                      {breathing ? currentPhase.label : "Ready"}
                    </div>
                    {breathing && (
                      <div className="text-4xl font-bold text-white">
                        {countdown}
                      </div>
                    )}
                  </motion.div>
                </AnimatePresence>
                {cycles > 0 && (
                  <div className="text-xs text-slate-500 mt-2">
                    Cycle {cycles}
                  </div>
                )}
              </div>
            </motion.div>
          </div>

          <Button
            variant={breathing ? "secondary" : "calm"}
            size="lg"
            onClick={toggleBreathing}
          >
            {breathing ? (
              <>
                <Pause className="w-5 h-5" />
                Pause
              </>
            ) : (
              <>
                <Play className="w-5 h-5" />
                Start Breathing Exercise
              </>
            )}
          </Button>

          <p className="text-xs text-slate-600 mt-3 text-center">
            4-4-6-2 breathing pattern (box breathing) — proven to reduce anxiety
          </p>
        </div>

        {/* Affirmation */}
        <AnimatePresence mode="wait">
          <motion.div
            key={affirmation}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="text-center mb-12"
          >
            <Heart className="w-5 h-5 text-rose-400 mx-auto mb-3" />
            <blockquote className="text-xl text-slate-200 italic font-medium">
              &quot;{affirmation}&quot;
            </blockquote>
          </motion.div>
        </AnimatePresence>

        {/* Tips */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-10">
          {[
            {
              title: "Before Your Test",
              tips: [
                "Sleep at least 8 hours the night before",
                "Eat a balanced breakfast",
                "Arrive 15 minutes early",
                "Do a 2-minute breathing exercise",
              ],
            },
            {
              title: "During Your Test",
              tips: [
                "Skip hard questions, come back later",
                "Use process of elimination",
                "If anxious, take 3 slow breaths",
                "Trust your preparation",
              ],
            },
          ].map((section) => (
            <Card key={section.title} variant="calm">
              <CardContent className="p-4">
                <h3 className="font-semibold text-[#14B8A6] mb-3 text-sm">
                  {section.title}
                </h3>
                <ul className="space-y-1.5">
                  {section.tips.map((tip) => (
                    <li key={tip} className="flex gap-2 text-sm text-slate-300">
                      <span className="text-[#14B8A6] flex-shrink-0 mt-0.5">
                        •
                      </span>
                      {tip}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* CTA */}
        <div className="text-center">
          <p className="text-slate-400 text-sm mb-4">
            Ready to practice? Calm mode is available in all practice sessions.
          </p>
          <Link
            href="/practice?calm=true"
            className="inline-flex items-center gap-2 h-12 px-6 text-base rounded-xl font-semibold bg-[#14B8A6] text-[#050B18] hover:bg-[#2DD4BF] shadow-[0_0_16px_rgba(20,184,166,0.3)] transition-all"
          >
            <Wind className="w-5 h-5" />
            Practice in Calm Mode
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
