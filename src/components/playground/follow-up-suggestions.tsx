"use client";

import { Lightbulb, ChevronRight, Loader2, RefreshCw } from "lucide-react";
import { useState, useCallback } from "react";
import { cn } from "@/lib/utils";

interface Props {
  lastUserMessage: string;
  lastAssistantMessage: string;
  modelId: string;
  apiKey?: string;
  onSelect: (prompt: string) => void;
  disabled?: boolean;
}

export function FollowUpSuggestions({ lastUserMessage, lastAssistantMessage, modelId, apiKey, onSelect, disabled }: Props) {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [shown, setShown] = useState(false);

  const generate = useCallback(async () => {
    if (loading) return;
    setLoading(true);
    setShown(true);
    setSuggestions([]);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          modelId,
          messages: [
            {
              role: "system",
              content: "Generate exactly 3 short follow-up questions the user might want to ask next, based on the conversation. Output ONLY a JSON array of 3 strings, no other text. Example: [\"What about X?\", \"Can you explain Y?\", \"How does Z work?\"]",
            },
            {
              role: "user",
              content: `User asked: ${lastUserMessage}\n\nAssistant replied: ${lastAssistantMessage.slice(0, 500)}`,
            },
          ],
          temperature: 0.8,
          maxTokens: 200,
          apiKey,
        }),
      });
      if (!res.body) throw new Error("No response");
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let text = "";
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        text += decoder.decode(value, { stream: true });
      }
      // Extract JSON array from response
      const match = text.match(/\[[\s\S]*\]/);
      if (match) {
        const parsed = JSON.parse(match[0]);
        if (Array.isArray(parsed)) {
          setSuggestions(parsed.slice(0, 3).filter((s): s is string => typeof s === "string"));
        }
      }
    } catch {
      setSuggestions(["Tell me more about this.", "Can you give an example?", "What are the alternatives?"]);
    } finally {
      setLoading(false);
    }
  }, [loading, modelId, apiKey, lastUserMessage, lastAssistantMessage]);

  if (!shown && !loading) {
    return (
      <div className="px-4 md:px-6 pb-3">
        <button
          onClick={generate}
          disabled={disabled}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors group"
        >
          <Lightbulb className="h-3.5 w-3.5 group-hover:text-amber-500 transition-colors" />
          <span>Suggest follow-ups</span>
        </button>
      </div>
    );
  }

  return (
    <div className="px-4 md:px-6 pb-4">
      <div className="flex items-center gap-2 mb-2">
        <Lightbulb className="h-3.5 w-3.5 text-amber-500" />
        <span className="text-xs font-medium text-muted-foreground">Suggested follow-ups</span>
        {!loading && (
          <button
            onClick={generate}
            className="ml-auto text-muted-foreground hover:text-foreground transition-colors"
            title="Regenerate suggestions"
          >
            <RefreshCw className="h-3 w-3" />
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          <span>Thinking of follow-ups…</span>
        </div>
      ) : (
        <div className="flex flex-col gap-1.5">
          {suggestions.map((s, i) => (
            <button
              key={i}
              onClick={() => { onSelect(s); setShown(false); setSuggestions([]); }}
              disabled={disabled}
              className={cn(
                "flex items-center gap-2 text-left text-xs px-3 py-2 rounded-lg border",
                "bg-card hover:bg-accent hover:border-primary/30 transition-all",
                "text-muted-foreground hover:text-foreground group",
                disabled && "opacity-50 cursor-not-allowed",
              )}
            >
              <ChevronRight className="h-3 w-3 flex-shrink-0 text-primary/50 group-hover:text-primary transition-colors" />
              <span>{s}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
