"use client";

import React from "react";
import { X, BookOpen } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface ReferenceSheetProps {
  open: boolean;
  onClose: () => void;
}

export function ReferenceSheet({ open, onClose }: ReferenceSheetProps) {
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
            className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-md bg-[#0A1428] border-l border-white/10 overflow-y-auto"
          >
            <div className="sticky top-0 bg-[#0A1428] border-b border-white/10 px-5 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-[#F59E0B]" />
                <span className="font-semibold text-white">Math Reference Sheet</span>
              </div>
              <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-6 text-sm">
              {/* Key Facts */}
              <div>
                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Key Facts</h3>
                <div className="space-y-1.5">
                  {[
                    "A circle contains 360°",
                    "A straight angle (line) measures 180°",
                    "The sum of angles in any triangle is 180°",
                    "The number of radians of arc in a full circle is 2π",
                  ].map((fact) => (
                    <div key={fact} className="flex items-start gap-2 text-slate-300">
                      <span className="text-[#F59E0B] flex-shrink-0 mt-0.5">•</span>
                      {fact}
                    </div>
                  ))}
                </div>
              </div>

              {/* Area & Circumference */}
              <div>
                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Area & Perimeter</h3>
                <div className="grid grid-cols-1 gap-2">
                  {[
                    { shape: "Circle", formulas: ["A = πr²", "C = 2πr"] },
                    { shape: "Rectangle", formulas: ["A = ℓw"] },
                    { shape: "Triangle", formulas: ["A = ½bh"] },
                    { shape: "Trapezoid", formulas: ["A = ½(b₁ + b₂)h"] },
                  ].map(({ shape, formulas }) => (
                    <div key={shape} className="flex items-center justify-between p-3 bg-white/4 rounded-xl border border-white/8">
                      <span className="text-slate-400">{shape}</span>
                      <div className="text-right">
                        {formulas.map((f) => (
                          <div key={f} className="font-mono text-[#F59E0B] text-sm">{f}</div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Volume */}
              <div>
                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Volume</h3>
                <div className="grid grid-cols-1 gap-2">
                  {[
                    { shape: "Rectangular box", formula: "V = ℓwh" },
                    { shape: "Cylinder", formula: "V = πr²h" },
                    { shape: "Sphere", formula: "V = (4/3)πr³" },
                    { shape: "Cone", formula: "V = (1/3)πr²h" },
                    { shape: "Pyramid", formula: "V = (1/3)ℓwh" },
                  ].map(({ shape, formula }) => (
                    <div key={shape} className="flex items-center justify-between p-3 bg-white/4 rounded-xl border border-white/8">
                      <span className="text-slate-400">{shape}</span>
                      <span className="font-mono text-[#14B8A6] text-sm">{formula}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Special Right Triangles */}
              <div>
                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Special Right Triangles</h3>
                <div className="space-y-3">
                  <div className="p-4 bg-violet-500/8 rounded-xl border border-violet-500/20">
                    <div className="font-semibold text-violet-400 mb-2">30° – 60° – 90°</div>
                    <div className="text-slate-300">Sides in ratio: <span className="font-mono text-white">1 : √3 : 2</span></div>
                    <div className="text-xs text-slate-500 mt-1">Short leg : Long leg : Hypotenuse</div>
                    <div className="mt-2 text-sm text-slate-400">
                      If short leg = x → long leg = x√3, hyp = 2x
                    </div>
                  </div>
                  <div className="p-4 bg-teal-500/8 rounded-xl border border-teal-500/20">
                    <div className="font-semibold text-[#14B8A6] mb-2">45° – 45° – 90°</div>
                    <div className="text-slate-300">Sides in ratio: <span className="font-mono text-white">1 : 1 : √2</span></div>
                    <div className="text-xs text-slate-500 mt-1">Leg : Leg : Hypotenuse</div>
                    <div className="mt-2 text-sm text-slate-400">
                      If leg = x → hypotenuse = x√2
                    </div>
                  </div>
                </div>
              </div>

              {/* Pythagorean Theorem */}
              <div>
                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Pythagorean Theorem</h3>
                <div className="p-4 bg-amber-500/8 rounded-xl border border-amber-500/20 text-center">
                  <div className="font-mono text-xl text-[#F59E0B]">a² + b² = c²</div>
                  <div className="text-xs text-slate-500 mt-2">where c is the hypotenuse</div>
                </div>
                <div className="mt-2 p-3 bg-white/4 rounded-xl border border-white/8">
                  <div className="text-xs text-slate-500 mb-1">Common Pythagorean triples:</div>
                  <div className="font-mono text-slate-300 text-xs space-y-0.5">
                    <div>3, 4, 5 (and multiples: 6,8,10 / 9,12,15)</div>
                    <div>5, 12, 13</div>
                    <div>8, 15, 17</div>
                  </div>
                </div>
              </div>

              {/* Coordinate Geometry */}
              <div>
                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Coordinate Geometry</h3>
                <div className="grid grid-cols-1 gap-2">
                  {[
                    { label: "Slope", formula: "m = (y₂−y₁)/(x₂−x₁)" },
                    { label: "Slope-intercept form", formula: "y = mx + b" },
                    { label: "Standard form", formula: "Ax + By = C" },
                    { label: "Distance", formula: "d = √((x₂−x₁)² + (y₂−y₁)²)" },
                    { label: "Midpoint", formula: "M = ((x₁+x₂)/2, (y₁+y₂)/2)" },
                  ].map(({ label, formula }) => (
                    <div key={label} className="flex items-center justify-between p-2.5 bg-white/4 rounded-lg border border-white/8">
                      <span className="text-slate-400 text-xs">{label}</span>
                      <span className="font-mono text-[#F59E0B] text-xs">{formula}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Quadratic */}
              <div>
                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Quadratic Formula</h3>
                <div className="p-4 bg-rose-500/8 rounded-xl border border-rose-500/20 text-center">
                  <div className="font-mono text-lg text-rose-400">x = (−b ± √(b²−4ac)) / 2a</div>
                  <div className="text-xs text-slate-500 mt-2">for ax² + bx + c = 0</div>
                </div>
                <div className="mt-2 p-3 bg-white/4 rounded-xl border border-white/8">
                  <div className="text-xs text-slate-500 mb-1">Discriminant (b²−4ac):</div>
                  <div className="text-xs text-slate-300 space-y-0.5">
                    <div><span className="text-emerald-400">&gt; 0</span> → two real solutions</div>
                    <div><span className="text-amber-400">= 0</span> → one real solution (repeated)</div>
                    <div><span className="text-red-400">&lt; 0</span> → no real solutions</div>
                  </div>
                </div>
              </div>

              {/* Trigonometry */}
              <div>
                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Trigonometry (Right Triangles)</h3>
                <div className="p-3 bg-white/4 rounded-xl border border-white/8 text-center mb-2">
                  <div className="text-xs text-slate-500 italic mb-1">SOH-CAH-TOA</div>
                  <div className="font-mono text-sm text-slate-300 space-y-0.5">
                    <div>sin θ = opposite/hypotenuse</div>
                    <div>cos θ = adjacent/hypotenuse</div>
                    <div>tan θ = opposite/adjacent</div>
                  </div>
                </div>
                <div className="p-2.5 bg-white/4 rounded-xl border border-white/8 text-center">
                  <div className="font-mono text-sm text-[#14B8A6]">sin²θ + cos²θ = 1</div>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
