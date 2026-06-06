import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatNumber(n: number, digits = 1): string {
  if (n >= 1_000_000_000) return (n / 1_000_000_000).toFixed(digits) + "B";
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(digits) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(digits) + "K";
  return n.toString();
}

export function formatCurrency(n: number, digits = 2): string {
  if (n === 0) return "$0";
  if (n < 0.01) return "<$0.01";
  return "$" + n.toFixed(digits);
}

export function formatLatency(ms: number): string {
  if (ms < 1000) return `${Math.round(ms)} ms`;
  return `${(ms / 1000).toFixed(2)} s`;
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function estimateTokens(text: string): number {
  // approx 4 chars per token for english
  return Math.ceil(text.length / 4);
}

export function truncate(str: string, n: number): string {
  return str.length > n ? str.slice(0, n - 1).trimEnd() + "…" : str;
}

export function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const el = document.createElement("textarea");
      el.value = text;
      el.style.cssText = "position:fixed;left:-9999px;top:-9999px;opacity:0";
      document.body.appendChild(el);
      el.focus();
      el.select();
      const ok = document.execCommand("copy");
      document.body.removeChild(el);
      return ok;
    } catch {
      return false;
    }
  }
}

/** Strip <artifact>…</artifact> tags from markdown before rendering.
 *  Artifacts are already extracted and shown in the artifact panel. */
export function stripArtifactTags(content: string): string {
  return content.replace(/<artifact(?:\s[^>]*)?>[\s\S]*?<\/artifact>/gi, "").trim();
}
