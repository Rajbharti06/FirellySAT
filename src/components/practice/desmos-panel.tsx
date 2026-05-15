"use client";

import React, { useState } from "react";
import { X, Calculator, TrendingUp } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface DemosPanelProps {
  open: boolean;
  onClose: () => void;
}

export function DesmosPanel({ open, onClose }: DemosPanelProps) {
  const [mode, setMode] = useState<"scientific" | "graphing">("scientific");

  const src =
    mode === "scientific"
      ? "https://www.desmos.com/scientific"
      : "https://www.desmos.com/graphing";

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 z-40"
            onClick={onClose}
          />
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-lg bg-[#0A1428] border-l border-white/10 flex flex-col"
          >
            {/* Header */}
            <div className="flex-shrink-0 border-b border-white/10 px-4 py-3 flex items-center gap-3">
              <Calculator className="w-5 h-5 text-violet-400" />
              <span className="font-semibold text-white flex-1">Desmos Calculator</span>

              {/* Mode toggle */}
              <div className="flex rounded-lg border border-white/10 overflow-hidden text-xs">
                <button
                  onClick={() => setMode("scientific")}
                  className={`px-3 py-1.5 flex items-center gap-1.5 transition-colors ${
                    mode === "scientific"
                      ? "bg-violet-500/20 text-violet-300"
                      : "text-slate-500 hover:text-slate-300 hover:bg-white/5"
                  }`}
                >
                  <Calculator className="w-3 h-3" />
                  Scientific
                </button>
                <button
                  onClick={() => setMode("graphing")}
                  className={`px-3 py-1.5 flex items-center gap-1.5 transition-colors ${
                    mode === "graphing"
                      ? "bg-violet-500/20 text-violet-300"
                      : "text-slate-500 hover:text-slate-300 hover:bg-white/5"
                  }`}
                >
                  <TrendingUp className="w-3 h-3" />
                  Graphing
                </button>
              </div>

              <button
                onClick={onClose}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Desmos iframe */}
            <div className="flex-1 relative">
              <iframe
                key={src}
                src={src}
                className="w-full h-full border-0"
                title="Desmos Calculator"
                allow="fullscreen"
              />
            </div>

            <div className="flex-shrink-0 px-4 py-2 border-t border-white/8">
              <p className="text-xs text-slate-600 text-center">
                Powered by Desmos · Available on all Math sections
              </p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
