"use client";

import { BarChart2, Clock, MessageSquare, Zap, TrendingUp } from "lucide-react";
import { useMemo } from "react";

interface Msg {
  role: "user" | "assistant" | "system";
  content: string;
  latencyMs?: number;
  tokens?: number;
}

interface Props {
  messages: Msg[];
  modelName?: string;
}

export function ConversationStats({ messages, modelName }: Props) {
  const stats = useMemo(() => {
    const userMsgs = messages.filter((m) => m.role === "user");
    const asstMsgs = messages.filter((m) => m.role === "assistant");
    const totalTokens = messages.reduce((sum, m) => sum + (m.tokens ?? 0), 0);
    const latencies = asstMsgs.map((m) => m.latencyMs ?? 0).filter(Boolean);
    const avgLatency = latencies.length ? latencies.reduce((a, b) => a + b, 0) / latencies.length : 0;
    const totalWords = messages
      .filter((m) => m.role !== "system")
      .reduce((sum, m) => sum + m.content.split(/\s+/).filter(Boolean).length, 0);
    return { userMsgs: userMsgs.length, asstMsgs: asstMsgs.length, totalTokens, avgLatency, totalWords };
  }, [messages]);

  const items = [
    { icon: MessageSquare, label: "Turns", value: stats.userMsgs, color: "text-blue-500" },
    { icon: Zap, label: "Tokens", value: stats.totalTokens > 1000 ? `${(stats.totalTokens / 1000).toFixed(1)}K` : stats.totalTokens, color: "text-amber-500" },
    { icon: TrendingUp, label: "Words", value: stats.totalWords > 1000 ? `${(stats.totalWords / 1000).toFixed(1)}K` : stats.totalWords, color: "text-violet-500" },
    { icon: Clock, label: "Avg latency", value: stats.avgLatency > 0 ? `${(stats.avgLatency / 1000).toFixed(1)}s` : "—", color: "text-emerald-500" },
  ];

  if (messages.length === 0) return null;

  return (
    <div className="border-t bg-muted/10 px-4 md:px-6 py-2">
      <div className="container max-w-4xl mx-auto">
        <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
          <BarChart2 className="h-3 w-3 mr-1 opacity-60" />
          {items.map((item, i) => (
            <span key={item.label} className="flex items-center gap-1">
              {i > 0 && <span className="opacity-30">·</span>}
              <item.icon className={`h-2.5 w-2.5 ${item.color}`} />
              <span className="font-medium text-foreground/70">{item.value}</span>
              <span className="opacity-60">{item.label}</span>
            </span>
          ))}
          {modelName && (
            <span className="ml-auto opacity-50">{modelName}</span>
          )}
        </div>
      </div>
    </div>
  );
}
