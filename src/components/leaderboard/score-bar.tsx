"use client";

import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

export type BarColor = "violet" | "blue" | "amber" | "green" | "rose" | "sky" | "slate";

const COLOR: Record<BarColor, string> = {
  violet: "bg-violet-500",
  blue: "bg-blue-500",
  amber: "bg-amber-500",
  green: "bg-emerald-500",
  rose: "bg-rose-500",
  sky: "bg-sky-500",
  slate: "bg-slate-400",
};

interface ScoreBarProps {
  value: number;
  max?: number;
  color?: BarColor;
  showValue?: boolean;
  /** Estimated values render slightly translucent. */
  estimated?: boolean;
  className?: string;
  valueClassName?: string;
}

/** Animated horizontal score bar — fills once on scroll-into-view. */
export function ScoreBar({
  value, max = 100, color = "violet", showValue = true, estimated = false,
  className, valueClassName,
}: ScoreBarProps) {
  const reduce = useReducedMotion();
  const pct = Math.max(0, Math.min(100, (value / max) * 100));

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className="relative h-1.5 flex-1 min-w-[2.5rem] rounded-full bg-muted overflow-hidden">
        {reduce ? (
          <div
            className={cn("h-full rounded-full", COLOR[color], estimated && "opacity-60")}
            style={{ width: `${pct}%` }}
          />
        ) : (
          <motion.div
            className={cn("h-full rounded-full", COLOR[color], estimated && "opacity-60")}
            initial={{ width: 0 }}
            whileInView={{ width: `${pct}%` }}
            viewport={{ once: true, margin: "0px 0px -8% 0px" }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          />
        )}
      </div>
      {showValue && (
        <span className={cn("text-xs font-mono tabular-nums w-7 text-right", valueClassName)}>
          {Math.round(value)}
        </span>
      )}
    </div>
  );
}
