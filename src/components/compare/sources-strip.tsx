"use client";

import { ExternalLink, Globe } from "lucide-react";
import { type Source, sourceLabel } from "@/lib/compare";

/** Horizontal, numbered source cards shared by every model in a round. */
export function SourcesStrip({ sources }: { sources: Source[] }) {
  if (!sources.length) return null;
  return (
    <div className="mb-3">
      <div className="flex items-center gap-1.5 mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        <Globe className="h-3 w-3 text-sky-500" />
        Sources
        <span className="font-normal normal-case tracking-normal text-muted-foreground/70">
          · {sources.length}
        </span>
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-thin">
        {sources.map((s, i) => (
          <a
            key={s.url + i}
            href={s.url}
            target="_blank"
            rel="noopener noreferrer"
            title={s.snippet}
            className="group relative flex-shrink-0 w-[180px] rounded-xl border bg-card hover:border-sky-400/50 hover:shadow-sm transition-all p-2.5"
          >
            <div className="flex items-center gap-1.5 mb-1 min-w-0">
              <span className="flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full bg-sky-500/15 text-[9px] font-bold text-sky-600 dark:text-sky-400">
                {i + 1}
              </span>
              <span className="min-w-0 flex-1 truncate text-[10px] font-medium text-muted-foreground">
                {sourceLabel(s.url)}
              </span>
              <ExternalLink className="h-2.5 w-2.5 flex-shrink-0 text-muted-foreground/40 group-hover:text-sky-500 transition-colors" />
            </div>
            <p className="line-clamp-2 text-[11px] font-medium leading-snug text-foreground/90">
              {s.title}
            </p>
          </a>
        ))}
      </div>
    </div>
  );
}
