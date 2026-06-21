"use client";

import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { RefreshCw } from "lucide-react";
import { relativeTime } from "@/lib/leaderboard";
import { cn } from "@/lib/utils";

interface LiveSyncBadgeProps {
  source: "live" | "fallback";
  updatedAt: string;
  liveModelCount: number;
  refreshing: boolean;
  onRefresh: () => void;
}

export function LiveSyncBadge({
  source, updatedAt, liveModelCount, refreshing, onRefresh,
}: LiveSyncBadgeProps) {
  const reduce = useReducedMotion();
  const [, setTick] = useState(0);

  // refresh the "x ago" label periodically
  useEffect(() => {
    const i = setInterval(() => setTick((t) => t + 1), 20_000);
    return () => clearInterval(i);
  }, []);

  const live = source === "live";

  return (
    <div className="inline-flex items-center gap-2 rounded-full glass-card px-3 py-1.5 text-xs">
      <span className="relative flex h-2 w-2">
        {live && !reduce && (
          <motion.span
            className="absolute inline-flex h-full w-full rounded-full bg-emerald-500"
            animate={{ scale: [1, 2.2, 1], opacity: [0.7, 0, 0.7] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: "easeOut" }}
          />
        )}
        <span className={cn("relative inline-flex h-2 w-2 rounded-full", live ? "bg-emerald-500" : "bg-amber-500")} />
      </span>

      <span className="font-semibold">{live ? "Live" : "Cached"}</span>
      <span className="text-muted-foreground hidden sm:inline">· synced {relativeTime(updatedAt)}</span>
      {live && liveModelCount > 0 && (
        <span className="text-muted-foreground hidden md:inline">
          · {liveModelCount.toLocaleString()} OpenRouter models
        </span>
      )}

      <button
        type="button"
        onClick={onRefresh}
        disabled={refreshing}
        aria-label="Refresh leaderboard data"
        className="tap-target ml-0.5 inline-flex items-center justify-center rounded-full p-1 text-muted-foreground hover:text-foreground hover:bg-accent transition-colors disabled:opacity-60"
      >
        <RefreshCw className={cn("h-3.5 w-3.5", refreshing && "animate-spin")} />
      </button>
    </div>
  );
}
