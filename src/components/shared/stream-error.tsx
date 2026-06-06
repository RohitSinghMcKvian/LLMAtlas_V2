"use client";

import Link from "next/link";
import { AlertTriangle, ArrowRight, KeyRound, RefreshCw, ShieldAlert, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import type { StreamEvent } from "@/lib/stream-events";

interface Props {
  event: StreamEvent;
  onRetry?: () => void;
  className?: string;
}

interface Style {
  Icon: typeof AlertTriangle;
  tone: string;
  title: string;
  cta?: { label: string; href?: string; action?: "retry" };
}

function styleFor(ev: StreamEvent): Style {
  const code = ev.code ?? "provider_error";
  switch (code) {
    case "rate_limited":
      return {
        Icon: Zap,
        tone: "border-amber-500/30 bg-amber-500/5 text-amber-200",
        title: "Free model is rate-limited",
        cta: { label: "Add your own API key", href: "/settings#byok" },
      };
    case "model_decommissioned":
      return {
        Icon: ShieldAlert,
        tone: "border-rose-500/30 bg-rose-500/5 text-rose-200",
        title: "Model retired by provider",
        cta: { label: "Browse alternatives", href: "/models" },
      };
    case "unauthorized":
      return {
        Icon: KeyRound,
        tone: "border-sky-500/30 bg-sky-500/5 text-sky-200",
        title: "API key missing or invalid",
        cta: { label: "Open Settings", href: "/settings#byok" },
      };
    case "model_not_found":
      return {
        Icon: AlertTriangle,
        tone: "border-amber-500/30 bg-amber-500/5 text-amber-200",
        title: "Model not found on provider",
        cta: { label: "Browse models", href: "/models" },
      };
    case "upstream_outage":
      return {
        Icon: RefreshCw,
        tone: "border-orange-500/30 bg-orange-500/5 text-orange-200",
        title: "Upstream provider outage",
        cta: { label: "Retry", action: "retry" },
      };
    case "stream_aborted":
      return {
        Icon: RefreshCw,
        tone: "border-orange-500/30 bg-orange-500/5 text-orange-200",
        title: "Stream interrupted",
        cta: { label: "Retry", action: "retry" },
      };
    default:
      return {
        Icon: AlertTriangle,
        tone: "border-rose-500/30 bg-rose-500/5 text-rose-200",
        title: "Request failed",
        cta: { label: "Retry", action: "retry" },
      };
  }
}

export function StreamError({ event, onRetry, className }: Props) {
  const s = styleFor(event);
  const Icon = s.Icon;
  return (
    <div className={cn("rounded-lg border p-3 text-sm flex gap-3 items-start", s.tone, className)}>
      <Icon className="h-4 w-4 shrink-0 mt-0.5" aria-hidden />
      <div className="flex-1 min-w-0">
        <div className="font-medium leading-tight">{s.title}</div>
        <div className="opacity-80 mt-0.5 text-xs">{event.message}</div>
        {s.cta && (
          <div className="mt-2">
            {s.cta.action === "retry" ? (
              <button
                type="button"
                onClick={onRetry}
                className="inline-flex items-center gap-1 rounded-md border border-current/40 px-2 py-1 text-xs font-medium hover:bg-current/10 transition"
              >
                <RefreshCw className="h-3 w-3" /> {s.cta.label}
              </button>
            ) : (
              <Link
                href={s.cta.href!}
                className="inline-flex items-center gap-1 rounded-md border border-current/40 px-2 py-1 text-xs font-medium hover:bg-current/10 transition"
              >
                {s.cta.label} <ArrowRight className="h-3 w-3" />
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

interface BannerProps {
  event: StreamEvent;
  className?: string;
}

export function FallbackBanner({ event, className }: BannerProps) {
  return (
    <div
      className={cn(
        "rounded-md border border-violet-500/30 bg-violet-500/5 text-violet-200 px-3 py-1.5 text-xs flex items-center gap-2",
        className,
      )}
    >
      <Zap className="h-3 w-3 shrink-0" aria-hidden />
      <span className="truncate">{event.message}</span>
    </div>
  );
}
