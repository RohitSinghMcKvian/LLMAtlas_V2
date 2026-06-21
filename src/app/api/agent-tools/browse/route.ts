// ─────────────────────────────────────────────────────────────────────────────
// Atlas Brain — browse tool route (Phase 4: real-world use, feature-flagged)
//
// A headless browser (Playwright) is heavy infra — it can't run inside the
// Next.js serverless runtime. So `browse` is a thin, stateless proxy to an
// EXTERNAL browser service (e.g. a small Playwright server on the Oracle Cloud
// box from reference_deployment). It's disabled until that service URL is set,
// via BROWSER_SERVICE_URL (server env) or the per-request serviceUrl from the
// user's Web-tools settings.
//
// The external service contract (request → response):
//   POST {serviceUrl}  { url, actions? }
//     → { ok, title?, text?, screenshot?, finalUrl? }
//
// Until configured, the route returns a clear, actionable "not enabled" message
// so the agent reports it gracefully instead of hanging.
// ─────────────────────────────────────────────────────────────────────────────

import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TIMEOUT_MS = 45_000; // browsing is slow; allow generous time

interface Body {
  url?: string;
  actions?: unknown;
  serviceUrl?: string;
  authHeader?: string;
}

export async function POST(req: Request) {
  let body: Body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid JSON body" }, { status: 400 });
  }

  const url = (body.url ?? "").trim();
  if (!url) return NextResponse.json({ ok: false, error: "url is required" }, { status: 400 });
  if (!/^https?:\/\//i.test(url)) {
    return NextResponse.json({ ok: false, error: "only http(s) URLs are allowed" }, { status: 400 });
  }

  const serviceUrl = (body.serviceUrl || process.env.BROWSER_SERVICE_URL || "").trim();
  if (!serviceUrl) {
    return NextResponse.json({
      ok: false,
      disabled: true,
      error:
        "Advanced browsing isn't enabled on this deployment. Set BROWSER_SERVICE_URL to a Playwright service (or configure it under Settings → Web tools) to enable browse(). For now, use web_search + fetch_url instead.",
    }, { status: 200 }); // 200 so the agent treats it as a normal tool result
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(serviceUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(body.authHeader || process.env.BROWSER_SERVICE_TOKEN
          ? { Authorization: body.authHeader || `Bearer ${process.env.BROWSER_SERVICE_TOKEN}` }
          : {}),
      },
      body: JSON.stringify({ url, actions: body.actions ?? [] }),
      signal: controller.signal,
    });
    if (!res.ok) {
      return NextResponse.json({ ok: false, error: `browser service HTTP ${res.status}` }, { status: 502 });
    }
    const json = await res.json();
    return NextResponse.json({ ok: true, ...json });
  } catch (e) {
    const msg = (e as Error)?.name === "AbortError" ? "browse timed out" : e instanceof Error ? e.message : "browse failed";
    return NextResponse.json({ ok: false, error: msg }, { status: 502 });
  } finally {
    clearTimeout(timer);
  }
}
