"use client";

import { CheckCircle2, Circle, Loader2, ListTodo } from "lucide-react";
import type { PlanStep } from "@/lib/code/agent-store";
import { cn } from "@/lib/utils";

/** Renders the agent's live plan/todo checklist at the top of the rail. */
export function AgentPlan({ plan }: { plan: PlanStep[] }) {
  if (!plan.length) return null;
  const done = plan.filter((s) => s.status === "done").length;
  const pct = Math.round((done / plan.length) * 100);

  return (
    <div className="border-b bg-muted/20 px-3 py-2.5">
      <div className="flex items-center gap-1.5 mb-2">
        <ListTodo className="h-3.5 w-3.5 text-violet-500 shrink-0" />
        <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Plan</span>
        <span className="text-[11px] text-muted-foreground ml-auto tabular-nums">{done}/{plan.length}</span>
      </div>
      <div className="h-1.5 rounded-full bg-border overflow-hidden mb-2.5">
        <div className="h-full bg-violet-500 transition-all rounded-full" style={{ width: `${pct}%` }} />
      </div>
      <ul className="space-y-1.5">
        {plan.map((s) => (
          <li key={s.id} className="flex items-start gap-2 text-xs leading-relaxed">
            {s.status === "done" ? (
              <CheckCircle2 className="h-3.5 w-3.5 text-green-500 mt-0.5 shrink-0" />
            ) : s.status === "in_progress" ? (
              <Loader2 className="h-3.5 w-3.5 text-violet-500 animate-spin mt-0.5 shrink-0" />
            ) : (
              <Circle className="h-3.5 w-3.5 text-muted-foreground/40 mt-0.5 shrink-0" />
            )}
            <span className={cn("min-w-0 break-words", s.status === "done" && "line-through text-muted-foreground", s.status === "in_progress" && "font-medium")}>
              {s.text}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
