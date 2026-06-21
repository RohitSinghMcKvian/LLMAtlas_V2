"use client";

import { motion, useReducedMotion } from "framer-motion";
import { BarChart3, Zap, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PROVIDERS, requiresApiKey } from "@/lib/models";
import type { LeaderboardRow } from "@/lib/leaderboard";
import { Sparkline } from "./sparkline";
import { cn } from "@/lib/utils";

const MEDALS = ["🥇", "🥈", "🥉"];
// left-to-right visual order: silver(1) · gold(0) · bronze(2)
const ORDER = [1, 0, 2];
const RISE = [0.12, 0, 0.24]; // gold rises highest

function TrendPill({ trend }: { trend: number }) {
  const up = trend > 0, flat = trend === 0;
  const Icon = flat ? Minus : up ? TrendingUp : TrendingDown;
  return (
    <span className={cn(
      "inline-flex items-center gap-0.5 text-[10px] font-semibold tabular-nums",
      flat ? "text-muted-foreground" : up ? "text-emerald-500" : "text-rose-500",
    )}>
      <Icon className="h-2.5 w-2.5" />{up ? "+" : ""}{trend}
    </span>
  );
}

export function Podium({
  top3, onSelect,
}: { top3: LeaderboardRow[]; onSelect: (r: LeaderboardRow) => void }) {
  const reduce = useReducedMotion();

  return (
    <div className="grid grid-cols-3 gap-3 md:gap-4 items-end">
      {ORDER.map((idx, pos) => {
        const r = top3[idx];
        if (!r) return <div key={pos} />;
        const m = r.model;
        const provider = PROVIDERS[m.provider];
        const gold = idx === 0;
        return (
          <motion.button
            key={m.id}
            type="button"
            onClick={() => onSelect(r)}
            initial={reduce ? false : { opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: pos * 0.1, ease: [0.16, 1, 0.3, 1] }}
            style={{ marginBottom: `${RISE[idx] * 100}px` }}
            className="text-left focus-brand rounded-xl"
          >
            <Card className={cn(
              "card-hover h-full overflow-hidden relative",
              gold && "ring-2 ring-amber-400/50 glow-brand",
            )}>
              <div className="h-1.5 w-full" style={{ backgroundColor: provider.color }} />
              {gold && !reduce && (
                <motion.div
                  className="absolute inset-0 pointer-events-none"
                  style={{
                    background:
                      "linear-gradient(110deg, transparent 35%, rgba(251,191,36,0.18) 50%, transparent 65%)",
                    backgroundSize: "250% 100%",
                  }}
                  animate={{ backgroundPosition: ["150% 0", "-150% 0"] }}
                  transition={{ duration: 3.5, repeat: Infinity, ease: "linear" }}
                />
              )}
              <CardContent className="p-3 md:p-5 text-center relative">
                <div className="text-2xl md:text-4xl mb-1">{MEDALS[idx]}</div>
                <div className="flex items-center justify-center gap-1.5 text-[10px] md:text-xs font-bold text-muted-foreground mb-1">
                  #{idx + 1} · {r.composite} <TrendPill trend={r.trend} />
                </div>
                <h3 className="font-bold text-xs md:text-base leading-tight mb-0.5 line-clamp-2">{m.name}</h3>
                <p className="text-[10px] md:text-xs text-muted-foreground mb-2 truncate">
                  {m.vendor} · {provider.name}
                </p>
                <div className="flex justify-center gap-3 text-[10px] md:text-xs text-muted-foreground mb-2">
                  <span className="flex items-center gap-1"><BarChart3 className="h-3 w-3 text-blue-500" />{r.quality}</span>
                  <span className="flex items-center gap-1"><Zap className="h-3 w-3 text-amber-500" />{r.speed}</span>
                </div>
                <div className="flex justify-center mb-2 text-emerald-500/80">
                  <Sparkline data={r.spark} color="currentColor" width={72} height={18} />
                </div>
                <div className="flex justify-center gap-1 flex-wrap">
                  {m.free && <Badge variant="success" className="text-[9px] px-1 py-0">FREE</Badge>}
                  {m.openSource && <Badge variant="outline" className="text-[9px] px-1 py-0">Open</Badge>}
                  {requiresApiKey(m) && (
                    <Badge variant="warning" className="text-[9px] px-1 py-0">KEY</Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.button>
        );
      })}
    </div>
  );
}
