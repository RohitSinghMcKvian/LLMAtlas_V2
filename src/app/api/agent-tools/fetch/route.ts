// ─────────────────────────────────────────────────────────────────────────────
// Atlas Brain — fetch_url tool route (Phase 4: real-world use)
//
// Fetches a URL server-side and returns cleaned, readable text for the agent.
// Dependency-free extraction (no Readability install): strips scripts/styles/nav
// chrome, pulls <title> + meta description, then flattens the main body to text.
//
// SSRF protection is the critical concern — the agent (or a prompt-injected web
// page) must not be able to make us hit internal services or cloud metadata:
//   • only http(s)
//   • DNS-resolve the host and reject if ANY resolved address is private/loopback
//     /link-local (defeats hostname tricks and most rebinding at fetch time)
//   • block the cloud metadata IP (169.254.169.254) explicitly
//   • optional allow-list via FETCH_ALLOWLIST (comma-sep host suffixes)
// ─────────────────────────────────────────────────────────────────────────────

import { NextResponse } from "next/server";
import dns from "node:dns/promises";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TIMEOUT_MS = 15_000;
const MAX_BYTES = 2_000_000; // 2 MB cap on downloaded body
const MAX_TEXT = 12_000; // chars of readable text returned to the model
const UA =
  "Mozilla/5.0 (compatible; LLMAtlasBot/0.1; +https://llmatlas.is-a.dev)";

function isPrivateIPv4(ip: string): boolean {
  const p = ip.split(".").map(Number);
  if (p.length !== 4 || p.some((n) => Number.isNaN(n))) return false;
  const [a, b] = p;
  if (a === 10) return true;
  if (a === 127) return true; // loopback
  if (a === 0) return true;
  if (a === 169 && b === 254) return true; // link-local + cloud metadata
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT
  return false;
}

function isPrivateIPv6(ip: string): boolean {
  const v = ip.toLowerCase();
  if (v === "::1" || v === "::") return true; // loopback / unspecified
  if (v.startsWith("fe80")) return true; // link-local
  if (v.startsWith("fc") || v.startsWith("fd")) return true; // unique-local
  if (v.startsWith("::ffff:")) return isPrivateIPv4(v.slice(7)); // IPv4-mapped
  return false;
}

function isPrivateAddr(ip: string): boolean {
  return ip.includes(":") ? isPrivateIPv6(ip) : isPrivateIPv4(ip);
}

async function assertSafeUrl(raw: string): Promise<URL> {
  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    throw new Error("invalid URL");
  }
  if (u.protocol !== "http:" && u.protocol !== "https:") {
    throw new Error("only http(s) URLs are allowed");
  }
  const host = u.hostname.toLowerCase();
  if (host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local") || host.endsWith(".internal")) {
    throw new Error("refusing to fetch internal host");
  }

  const allowlist = (process.env.FETCH_ALLOWLIST ?? "")
    .split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
  if (allowlist.length && !allowlist.some((suffix) => host === suffix || host.endsWith("." + suffix))) {
    throw new Error("host is not in FETCH_ALLOWLIST");
  }

  // If the host is a literal IP, check it directly; otherwise resolve it.
  const literalIp = /^[\d.]+$/.test(host) || host.includes(":");
  if (literalIp) {
    if (isPrivateAddr(host)) throw new Error("refusing to fetch a private/loopback address");
    return u;
  }
  let addrs: { address: string }[];
  try {
    addrs = await dns.lookup(host, { all: true });
  } catch {
    throw new Error("could not resolve host");
  }
  if (addrs.length === 0 || addrs.some((a) => isPrivateAddr(a.address))) {
    throw new Error("host resolves to a private/loopback address");
  }
  return u;
}

/** Extract a readable title + text from an HTML document, dependency-free. */
function extractReadable(html: string): { title: string; text: string } {
  const titleMatch = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(html);
  const metaDesc =
    /<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["']/i.exec(html) ??
    /<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']*)["']/i.exec(html);

  let body = html;
  // Drop non-content regions entirely.
  body = body.replace(/<script[\s\S]*?<\/script>/gi, " ");
  body = body.replace(/<style[\s\S]*?<\/style>/gi, " ");
  body = body.replace(/<noscript[\s\S]*?<\/noscript>/gi, " ");
  body = body.replace(/<svg[\s\S]*?<\/svg>/gi, " ");
  body = body.replace(/<(nav|header|footer|aside)[\s\S]*?<\/\1>/gi, " ");
  body = body.replace(/<!--[\s\S]*?-->/g, " ");
  // Preserve block structure as newlines so the text stays legible.
  body = body.replace(/<\/(p|div|li|h[1-6]|tr|section|article|br)>/gi, "\n");
  body = body.replace(/<[^>]+>/g, " ");
  const text = body
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"').replace(/&#x27;/g, "'").replace(/&#39;/g, "'").replace(/&nbsp;/g, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s*\n\s*\n+/g, "\n\n")
    .trim();

  const decode = (s: string) => s.replace(/&amp;/g, "&").replace(/&#39;/g, "'").replace(/\s+/g, " ").trim();
  let title = titleMatch ? decode(titleMatch[1]) : "";
  if (metaDesc && metaDesc[1]) title = title || decode(metaDesc[1]);
  return { title, text };
}

export async function POST(req: Request) {
  let body: { url?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid JSON body" }, { status: 400 });
  }
  const raw = (body.url ?? "").trim();
  if (!raw) return NextResponse.json({ ok: false, error: "url is required" }, { status: 400 });

  let url: URL;
  try {
    url = await assertSafeUrl(raw);
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : "blocked URL" }, { status: 400 });
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url.toString(), {
      headers: { "User-Agent": UA, Accept: "text/html,application/xhtml+xml,application/json,text/plain;q=0.9,*/*;q=0.8" },
      redirect: "follow",
      signal: controller.signal,
    });
    const ctype = res.headers.get("content-type") ?? "";

    // Read with a hard byte cap.
    const reader = res.body?.getReader();
    let received = 0;
    const chunks: Uint8Array[] = [];
    if (reader) {
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        if (value) {
          received += value.length;
          if (received > MAX_BYTES) { chunks.push(value.slice(0, value.length - (received - MAX_BYTES))); break; }
          chunks.push(value);
        }
      }
    }
    const buf = Buffer.concat(chunks.map((c) => Buffer.from(c)));
    const rawText = buf.toString("utf8");

    if (!res.ok) {
      return NextResponse.json({ ok: false, error: `upstream HTTP ${res.status}`, finalUrl: res.url }, { status: 502 });
    }

    let title = "";
    let text: string;
    if (ctype.includes("application/json")) {
      text = rawText.slice(0, MAX_TEXT);
    } else if (ctype.includes("html") || /<html[\s>]/i.test(rawText)) {
      const r = extractReadable(rawText);
      title = r.title;
      text = r.text.slice(0, MAX_TEXT);
    } else {
      text = rawText.replace(/[ \t]+/g, " ").trim().slice(0, MAX_TEXT);
    }

    return NextResponse.json({
      ok: true,
      url: res.url || url.toString(),
      title,
      contentType: ctype.split(";")[0] || "",
      bytes: received,
      truncated: rawText.length > MAX_TEXT,
      text,
    });
  } catch (e) {
    const msg = (e as Error)?.name === "AbortError" ? "request timed out" : e instanceof Error ? e.message : "fetch failed";
    return NextResponse.json({ ok: false, error: msg }, { status: 502 });
  } finally {
    clearTimeout(timer);
  }
}
