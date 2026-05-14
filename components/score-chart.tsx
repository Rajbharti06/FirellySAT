"use client";

import { motion } from "framer-motion";
import { Line, LineChart, Tooltip, XAxis, YAxis } from "recharts";

type Point = {
  week: string;
  score: number;
};

export function ScoreChart({ data }: { data: Point[] }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="w-full overflow-x-auto rounded-2xl border border-slate-200 p-3 dark:border-slate-800"
    >
      <LineChart width={760} height={260} data={data} margin={{ top: 12, right: 8, bottom: 8, left: 0 }}>
        <XAxis dataKey="week" stroke="#64748b" />
        <YAxis stroke="#64748b" domain={[900, 1600]} />
        <Tooltip />
        <Line type="monotone" dataKey="score" stroke="#10b981" strokeWidth={3} dot={false} />
      </LineChart>
    </motion.div>
  );
}
