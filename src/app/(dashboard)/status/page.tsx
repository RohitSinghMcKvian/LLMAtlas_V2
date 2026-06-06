"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Activity, RefreshCw, CheckCircle2, XCircle, Loader2,
  Newspaper, Github,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PROVIDERS, type ProviderId } from "@/lib/models";
import { formatLatency, cn } from "@/lib/utils";

interface StatusResult {
  provider: string;
  name: string;
  ok: boolean;
  latencyMs: number;
  status?: number;
  message?: string;
  category: "llm" | "data";
}

const DATA_META: Record<string, { color: string; icon: React.ReactNode }> = {
  newsapi: { color: "#EF4444", icon: <Newspaper className="h-4 w-4" /> },
  github:  { color: "#24292F", icon: <Github className="h-4 w-4" /> },
};

export default function StatusPage() {
  const [results, setResults] = useState<StatusResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);

  async function refresh() {
    setLoading(true);
    try {
      const res = await fetch("/api/status", { cache: "no-store" });
      const data = await res.json();
      setResults(data.providers);
      setLastChecked(new Date(data.ts));
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, 60_000);
    return () => clearInterval(id);
  }, []);

  const okCount = results.filter((r) => r.ok).length;
  const allOk = okCount === results.length && results.length > 0;

  const llmResults = results.filter((r) => r.category === "llm");
  const dataResults = results.filter((r) => r.category === "data");

  return (
    <div className="container max-w-5xl py-8">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <div className="inline-flex items-center gap-2 mb-2">
          <Activity className="h-5 w-5 text-violet-500" />
          <span className="text-xs font-semibold text-violet-500 uppercase tracking-wider">
            Live API Status
          </span>
        </div>
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
          Is the LLM API I depend on up right now?
        </h1>
        <p className="mt-2 text-muted-foreground">
          Real-time reachability and latency for every free provider + data service. Bookmark this page.
        </p>
      </motion.div>

      {/* ─── Summary banner ─── */}
      <Card className={cn(
        "mb-6 border-2",
        allOk ? "border-emerald-500/30 bg-emerald-500/5" : "border-amber-500/30 bg-amber-500/5",
      )}>
        <CardContent className="p-6 flex items-center gap-4">
          <div className={cn(
            "h-14 w-14 rounded-full flex items-center justify-center",
            allOk ? "bg-emerald-500/20" : "bg-amber-500/20",
          )}>
            {loading ? (
              <Loader2 className="h-7 w-7 animate-spin text-muted-foreground" />
            ) : allOk ? (
              <CheckCircle2 className="h-7 w-7 text-emerald-600" />
            ) : (
              <XCircle className="h-7 w-7 text-amber-600" />
            )}
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-bold">
              {loading ? "Checking all services…" : allOk ? "All systems operational" : `${results.length - okCount} service(s) impaired`}
            </h2>
            <p className="text-sm text-muted-foreground">
              {okCount}/{results.length} services reachable
              {lastChecked && ` · last checked ${lastChecked.toLocaleTimeString()}`}
            </p>
          </div>
          <Button onClick={refresh} variant="outline" size="sm" disabled={loading}>
            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
            Refresh
          </Button>
        </CardContent>
      </Card>

      {/* ─── LLM Providers ─── */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Activity className="h-4 w-4 text-violet-500" />
            LLM Providers
            <Badge variant="outline" className="text-[10px]">{llmResults.length} providers</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y">
            {llmResults.map((r) => {
              const provider = PROVIDERS[r.provider as ProviderId];
              return (
                <ProviderRow
                  key={r.provider}
                  result={r}
                  color={provider?.color ?? "#999"}
                  label={provider?.name.slice(0, 2).toUpperCase() ?? "??"}
                />
              );
            })}
            {loading && llmResults.length === 0 && <SkeletonRows n={9} />}
          </div>
        </CardContent>
      </Card>

      {/* ─── Data Services ─── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Newspaper className="h-4 w-4 text-sky-500" />
            Data Services
            <Badge variant="outline" className="text-[10px]">NewsAPI · GitHub</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y">
            {dataResults.map((r) => {
              const meta = DATA_META[r.provider] ?? { color: "#999", icon: null };
              return (
                <ProviderRow
                  key={r.provider}
                  result={r}
                  color={meta.color}
                  label={r.name.slice(0, 2).toUpperCase()}
                />
              );
            })}
            {loading && dataResults.length === 0 && <SkeletonRows n={2} />}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function ProviderRow({ result: r, color, label }: {
  result: StatusResult;
  color: string;
  label: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex items-center gap-4 p-4"
    >
      <div
        className="h-10 w-10 rounded-lg flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
        style={{ backgroundColor: color }}
      >
        {label}
      </div>

      <div className="flex-1 min-w-0">
        <p className="font-medium truncate">{r.name}</p>
        {r.message && (
          <p className="text-xs text-destructive truncate">{r.message}</p>
        )}
        {r.status && (
          <p className="text-xs text-muted-foreground">HTTP {r.status}</p>
        )}
      </div>

      <div className="text-right">
        <p className="text-sm font-mono">{formatLatency(r.latencyMs)}</p>
        <p className="text-xs text-muted-foreground">latency</p>
      </div>

      <Badge
        variant={r.ok ? "success" : "destructive"}
        className="ml-2 flex-shrink-0"
      >
        {r.ok ? (
          <><CheckCircle2 className="h-3 w-3 mr-1" />UP</>
        ) : (
          <><XCircle className="h-3 w-3 mr-1" />DOWN</>
        )}
      </Badge>
    </motion.div>
  );
}

function SkeletonRows({ n }: { n: number }) {
  return (
    <>
      {Array.from({ length: n }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 p-4 animate-pulse">
          <div className="h-10 w-10 rounded-lg bg-muted flex-shrink-0" />
          <div className="flex-1 space-y-1.5">
            <div className="h-3 w-32 bg-muted rounded" />
          </div>
          <div className="h-3 w-16 bg-muted rounded" />
          <div className="h-6 w-12 bg-muted rounded-full" />
        </div>
      ))}
    </>
  );
}
