"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { aggregateProviders } from "@/lib/leaderboard";
import { ScoreBar } from "./score-bar";

const aggregates = aggregateProviders();

export function ProviderBoard() {
  const reduce = useReducedMotion();
  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {aggregates.map((p, i) => (
        <motion.div
          key={p.id}
          initial={reduce ? false : { opacity: 0, y: 14 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "0px 0px -8% 0px" }}
          transition={{ duration: 0.35, delay: Math.min(i * 0.04, 0.25) }}
        >
          <Card className="card-hover h-full overflow-hidden">
            <div className="h-1 w-full" style={{ backgroundColor: p.color }} />
            <CardContent className="p-4">
              <div className="flex items-center gap-2.5 mb-3">
                <div
                  className="h-9 w-9 rounded-lg grid place-items-center text-white text-xs font-bold flex-shrink-0"
                  style={{ backgroundColor: p.color }}
                >
                  {p.name.slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-sm leading-tight truncate">{p.name}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {p.count} models · {p.freeCount} free
                  </p>
                </div>
                <span className="ml-auto text-2xl font-bold tabular-nums">{p.avgComposite}</span>
              </div>

              <div className="space-y-2 mb-3">
                <div className="flex items-center gap-2 text-[11px]">
                  <span className="w-16 text-muted-foreground">Avg quality</span>
                  <ScoreBar value={p.avgComposite} color="violet" />
                </div>
                <div className="flex items-center gap-2 text-[11px]">
                  <span className="w-16 text-muted-foreground">Avg speed</span>
                  <ScoreBar value={p.avgSpeed} color="amber" />
                </div>
              </div>

              <div className="rounded-lg bg-muted/50 px-2.5 py-2">
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-0.5">Top model</p>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-medium truncate">{p.best.model.name}</span>
                  <Badge variant="outline" className="text-[10px] flex-shrink-0">{p.best.composite}</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </div>
  );
}
