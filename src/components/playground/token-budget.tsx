"use client";

import { cn } from "@/lib/utils";

interface Props {
  used: number;
  total: number;
  className?: string;
}

export function TokenBudgetBar({ used, total, className }: Props) {
  const pct = total > 0 ? Math.min(100, (used / total) * 100) : 0;
  const color =
    pct > 90 ? "bg-red-500" :
    pct > 75 ? "bg-orange-500" :
    pct > 50 ? "bg-amber-500" :
    "bg-emerald-500";
  const label =
    pct > 90 ? "Critical" :
    pct > 75 ? "High" :
    pct > 50 ? "Medium" :
    "Low";

  const formatCtx = (n: number) =>
    n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M` :
    n >= 1000 ? `${Math.round(n / 1000)}K` : `${n}`;

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className="relative flex-1 h-1.5 bg-muted rounded-full overflow-hidden min-w-[60px]">
        <div
          className={cn("absolute inset-y-0 left-0 rounded-full transition-all duration-300", color)}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className={cn(
        "text-[10px] font-mono tabular-nums whitespace-nowrap",
        pct > 90 ? "text-red-500" : pct > 75 ? "text-orange-500" : "text-muted-foreground",
      )}>
        {formatCtx(used)}/{formatCtx(total)}
      </span>
    </div>
  );
}
