"use client";

import { use, useMemo } from "react";
import Link from "next/link";
import { Sparkles, User, ArrowLeft, MessageSquare } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { decodeShare } from "@/lib/share";
import { findModel } from "@/lib/models";
import { cn } from "@/lib/utils";

export default function ShareConversationPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const payload = useMemo(() => decodeShare(token), [token]);

  if (!payload) {
    return (
      <div className="container max-w-2xl py-20 text-center">
        <h1 className="text-xl font-semibold mb-2">Couldn&apos;t open this share link</h1>
        <p className="text-sm text-muted-foreground mb-6">The payload is missing or corrupted.</p>
        <Link href="/" className="text-primary hover:underline text-sm">Go home</Link>
      </div>
    );
  }
  const model = findModel(payload.modelId);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b sticky top-0 bg-background z-10">
        <div className="container max-w-3xl py-3 flex items-center gap-3">
          <Link href="/" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-3 w-3" /> LLMAtlas
          </Link>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold truncate">{payload.title}</div>
            <div className="text-[10px] text-muted-foreground">
              Shared on {new Date(payload.createdAt).toLocaleDateString()} · {model?.name ?? payload.modelId}
            </div>
          </div>
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground border rounded px-1.5 py-0.5">read only</span>
        </div>
      </header>

      <main className="container max-w-3xl py-6">
        {payload.messages.length === 0 ? (
          <div className="text-center text-sm text-muted-foreground py-10">
            <MessageSquare className="h-5 w-5 mx-auto mb-2 opacity-50" />
            No messages in this conversation.
          </div>
        ) : (
          <div>
            {payload.messages.map((m, i) => {
              const isUser = m.role === "user";
              return (
                <div key={i} className={cn("flex gap-3 py-4 px-2", !isUser && "bg-muted/30 rounded-lg")}>
                  <div className={cn(
                    "h-8 w-8 rounded-lg flex items-center justify-center text-white shadow-sm flex-shrink-0",
                    isUser ? "bg-gradient-to-br from-slate-500 to-slate-700"
                           : "bg-gradient-to-br from-blue-500 via-violet-500 to-indigo-600",
                  )}>
                    {isUser ? <User className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold mb-1">{isUser ? "User" : "Assistant"}</div>
                    <div className="text-sm leading-relaxed prose prose-sm dark:prose-invert max-w-none prose-pre:bg-background prose-pre:border prose-pre:rounded-lg">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{m.content}</ReactMarkdown>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
