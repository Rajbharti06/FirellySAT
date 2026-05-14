import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold transition-all",
  {
    variants: {
      variant: {
        default: "bg-[#F59E0B]/15 text-[#F59E0B] border border-[#F59E0B]/30",
        secondary: "bg-white/8 text-slate-300 border border-white/10",
        easy: "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30",
        medium: "bg-amber-500/15 text-amber-400 border border-amber-500/30",
        hard: "bg-red-500/15 text-red-400 border border-red-500/30",
        math: "bg-violet-500/15 text-violet-400 border border-violet-500/30",
        rw: "bg-teal-500/15 text-teal-400 border border-teal-500/30",
        calm: "bg-teal-500/15 text-teal-400 border border-teal-500/30",
        success: "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30",
        danger: "bg-red-500/15 text-red-400 border border-red-500/30",
        outline: "border border-white/20 text-slate-400",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
