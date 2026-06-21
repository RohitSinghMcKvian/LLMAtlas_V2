"use client";

import { useMemo, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import {
  Brain, Code2, Eye, Sigma, Maximize2, Bot, Gauge, Languages, Lock, Zap,
  Trophy, ChevronRight,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  type CapabilityCategory, type GlobalRow,
  CAPABILITY_CATEGORIES, topInCategory,
} from "@/lib/global-leaderboard";
import { formatContext } from "@/lib/leaderboard";
import { ScoreBar } from "./score-bar";
import { cn } from "@/lib/utils";

const ICONS = {
  Brain, Code2, Eye, Sigma, Maximize2, Bot, Gauge, Languages, Lock, Zap,
};

function vendorColor(v: string): string {
  let h = 0;
  for (let i = 0; i < v.length; i++) h = (h * 31 + v.charCodeAt(i)) >>> 0;
  return `hsl(${h % 360} 65% 50%)`;
}

const TOP_N_PER_CATEGORY = 5;

interface CategoryCardProps {
  cat: CapabilityCategory;
  rows: GlobalRow[];
  index: number;
  expanded: boolean;
  onToggle: () => void;
  onSelect: (r: GlobalRow) => void;
}

function CategoryCard({ cat, rows, index, expanded, onToggle, onSelect }: CategoryCardProps) {
  const reduce = useReducedMotion();
  const top = useMemo(() => topInCategory(rows, cat, TOP_N_PER_CATEGORY), [rows, cat]);
  const Icon = ICONS[cat.iconKey];

  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "0px 0px -8% 0px" }}
      transition={{ duration: 0.4, delay: Math.min(index * 0.04, 0.3) }}
    >
      <Card className={cn("overflow-hidden", expanded && "ring-1 ring-primary/20")}>
        {/* Tint strip */}
        <div className="h-1 w-full" style={{ backgroundColor: cat.color }} />

        {/* Header */}
        <button
          type="button"
          onClick={onToggle}
          className="w-full text-left p-4 sm:p-5 hover:bg-accent/30 transition-colors"
        >
          <div className="flex items-center gap-3 mb-2">
            <div
              className="h-10 w-10 rounded-xl grid place-items-center flex-shrink-0"
              style={{ backgroundColor: `${cat.color}1a`, color: cat.color }}
            >
              <Icon className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-bold tracking-tight">{cat.label}</h3>
                <Badge variant="outline" className="text-[10px]">{top.length} models</Badge>
              </div>
              <p className="text-[11px] sm:text-xs text-muted-foreground line-clamp-2 mt-0.5">{cat.description}</p>
            </div>
            <ChevronRight
              className={cn(
                "h-4 w-4 text-muted-foreground flex-shrink-0 transition-transform",
                expanded && "rotate-90",
              )}
            />
          </div>

          {/* Always-visible: top 1 leader */}
          {top[0] && (
            <div className="flex items-center gap-2 mt-2 rounded-lg bg-muted/40 px-2.5 py-1.5">
              <Trophy className="h-3.5 w-3.5 flex-shrink-0" style={{ color: cat.color }} />
              <span className="text-xs font-semibold truncate flex-1">{top[0].model.name}</span>
              <span className="text-[10px] text-muted-foreground hidden sm:inline">{top[0].model.vendor}</span>
              <span className="text-sm font-bold tabular-nums flex-shrink-0">{top[0].composite}</span>
            </div>
          )}
        </button>

        {/* Expanded: top 5 with bars */}
        {expanded && (
          <motion.div
            initial={reduce ? false : { opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <CardContent className="p-0">
              <div className="px-4 sm:px-5 pb-4 pt-0 space-y-2">
                {top.map((r, i) => (
                  <button
                    key={r.model.id}
                    type="button"
                    onClick={() => onSelect(r)}
                    className="w-full text-left rounded-lg hover:bg-accent/40 transition-colors p-2 group"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="text-xs font-mono tabular-nums text-muted-foreground w-5">#{i + 1}</span>
                      <span
                        className="h-2.5 w-2.5 rounded-full flex-shrink-0"
                        style={{ backgroundColor: vendorColor(r.model.vendor) }}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <p className="text-xs font-medium truncate">{r.model.name}</p>
                        </div>
                        <p className="text-[10px] text-muted-foreground truncate">
                          {r.model.vendor} · {formatContext(r.model.context)}
                          {r.model.inputPrice === 0 ? " · free" : ` · $${r.model.inputPrice.toFixed(2)}/M`}
                        </p>
                      </div>
                      <div className="w-20 flex-shrink-0">
                        <ScoreBar value={r.composite} color="violet" showValue={false} />
                      </div>
                      <span className="text-sm font-bold tabular-nums w-8 text-right flex-shrink-0">{r.composite}</span>
                    </div>
                  </button>
                ))}
                {top.length === 0 && (
                  <div className="text-xs text-muted-foreground text-center py-4">
                    No models qualify for this category in the current catalogue.
                  </div>
                )}
              </div>
            </CardContent>
          </motion.div>
        )}
      </Card>
    </motion.div>
  );
}

export function GlobalCategories({
  rows, onSelect,
}: { rows: GlobalRow[]; onSelect: (r: GlobalRow) => void }) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>(() => ({
    reasoning: true, coding: true, // first two open by default to invite exploration
  }));

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-dashed bg-muted/30 px-4 py-3 text-xs text-muted-foreground flex items-start gap-2">
        <Trophy className="h-4 w-4 mt-0.5 flex-shrink-0 text-amber-500" />
        <span>
          Ten capability boards ranking the entire global universe by real-world strength — not just composite.
          Each board uses a category-specific scoring function (see description) so a coding-tuned model can lead
          even with a lower overall composite. Tap any card to expand the top {TOP_N_PER_CATEGORY}.
        </span>
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        {CAPABILITY_CATEGORIES.map((cat, i) => (
          <CategoryCard
            key={cat.id}
            cat={cat}
            rows={rows}
            index={i}
            expanded={!!expanded[cat.id]}
            onToggle={() => setExpanded((e) => ({ ...e, [cat.id]: !e[cat.id] }))}
            onSelect={onSelect}
          />
        ))}
      </div>
    </div>
  );
}
