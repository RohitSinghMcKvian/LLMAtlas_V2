"use client";

import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { CountUp } from "./count-up";
import { cn } from "@/lib/utils";

export interface Stat {
  label: string;
  value: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  icon: LucideIcon;
  /** tailwind text color class for the icon, e.g. "text-amber-500" */
  tint: string;
}

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06 } },
};
const item = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] } },
};

export function StatStrip({ stats }: { stats: Stat[] }) {
  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3"
    >
      {stats.map((s) => (
        <motion.div key={s.label} variants={item}>
          <Card className="card-hover p-3.5 h-full">
            <div className="flex items-center gap-1.5 mb-1.5">
              <s.icon className={cn("h-3.5 w-3.5", s.tint)} />
              <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide truncate">
                {s.label}
              </span>
            </div>
            <div className="text-2xl font-bold tabular-nums tracking-tight">
              <CountUp
                value={s.value}
                decimals={s.decimals ?? 0}
                prefix={s.prefix}
                suffix={s.suffix}
              />
            </div>
          </Card>
        </motion.div>
      ))}
    </motion.div>
  );
}
