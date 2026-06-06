"use client";

import { Code2, AlignLeft, Braces } from "lucide-react";
import { cn } from "@/lib/utils";

export type ResponseFormat = "markdown" | "plain" | "json";

interface Props {
  value: ResponseFormat;
  onChange: (v: ResponseFormat) => void;
}

const OPTIONS: { value: ResponseFormat; icon: React.ElementType; label: string; title: string }[] = [
  { value: "markdown", icon: AlignLeft, label: "MD", title: "Markdown (default)" },
  { value: "plain", icon: Code2, label: "TXT", title: "Plain text" },
  { value: "json", icon: Braces, label: "JSON", title: "JSON output" },
];

export function FormatToggle({ value, onChange }: Props) {
  return (
    <div
      className="inline-flex items-center rounded-md border bg-muted/30 p-0.5 gap-0.5"
      title="Response format"
    >
      {OPTIONS.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          title={opt.title}
          className={cn(
            "inline-flex items-center gap-1 h-6 px-2 rounded text-[10px] font-medium transition-all",
            value === opt.value
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          <opt.icon className="h-3 w-3" />
          <span>{opt.label}</span>
        </button>
      ))}
    </div>
  );
}

export function formatSystemPromptSuffix(format: ResponseFormat): string {
  switch (format) {
    case "plain": return "\n\nRespond in plain text only. Do not use markdown formatting, bullet points, headers, or code blocks.";
    case "json": return "\n\nRespond ONLY with valid JSON. No prose, no markdown. The output must be parseable JSON.";
    default: return "";
  }
}
