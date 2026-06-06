// Push a code workspace to GitHub.
// The user supplies their own Personal Access Token (PAT) per-request — we never store it.

import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface PushFile {
  path: string;
  content: string;
}
interface Body {
  token: string;
  repoName: string;
  isPrivate?: boolean;
  files: PushFile[];
  commitMessage?: string;
}

function gh(token: string) {
  return async (path: string, init?: RequestInit) => {
    const res = await fetch(`https://api.github.com${path}`, {
      ...init,
      headers: {
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "User-Agent": "LLMAtlas/1.0",
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        ...(init?.headers ?? {}),
      },
    });
    return res;
  };
}

export async function POST(req: Request) {
  let body: Body;
  try { body = await req.json(); } catch { return new Response("Invalid JSON", { status: 400 }); }
  if (!body.token || !body.repoName || !Array.isArray(body.files) || body.files.length === 0) {
    return NextResponse.json({ error: "token, repoName, files required" }, { status: 400 });
  }

  const api = gh(body.token);

  // 1. Identify the authenticated user
  const meRes = await api("/user");
  if (!meRes.ok) {
    return NextResponse.json({ error: "Invalid token or unauthorized" }, { status: 401 });
  }
  const me = (await meRes.json()) as { login: string };
  const owner = me.login;

  // 2. Ensure repo exists (create if missing)
  let repoUrl = "";
  const repoRes = await api(`/repos/${owner}/${body.repoName}`);
  if (repoRes.status === 404) {
    const createRes = await api("/user/repos", {
      method: "POST",
      body: JSON.stringify({
        name: body.repoName,
        private: body.isPrivate ?? false,
        auto_init: true,
        description: "Created from LLMAtlas Playground Code",
      }),
    });
    if (!createRes.ok) {
      const errText = await createRes.text().catch(() => "");
      return NextResponse.json({ error: `Could not create repo: ${errText.slice(0, 200)}` }, { status: 500 });
    }
    const created = (await createRes.json()) as { html_url: string };
    repoUrl = created.html_url;
    // Tiny pause to let auto_init settle (GitHub races otherwise).
    await new Promise((r) => setTimeout(r, 1200));
  } else if (repoRes.ok) {
    const r = (await repoRes.json()) as { html_url: string };
    repoUrl = r.html_url;
  } else {
    return NextResponse.json({ error: `Repo lookup failed (${repoRes.status})` }, { status: 500 });
  }

  // 3. PUT each file via Contents API (creates or updates).
  const results: Array<{ path: string; status: number; ok: boolean }> = [];
  for (const f of body.files) {
    const encoded = Buffer.from(f.content, "utf-8").toString("base64");
    // Fetch existing sha (if file exists) so we update instead of failing.
    let sha: string | undefined;
    const existing = await api(`/repos/${owner}/${body.repoName}/contents/${encodeURIComponent(f.path)}`);
    if (existing.ok) {
      const ex = (await existing.json()) as { sha?: string };
      sha = ex.sha;
    }
    const putRes = await api(`/repos/${owner}/${body.repoName}/contents/${encodeURIComponent(f.path)}`, {
      method: "PUT",
      body: JSON.stringify({
        message: body.commitMessage ?? `Update ${f.path}`,
        content: encoded,
        ...(sha ? { sha } : {}),
      }),
    });
    results.push({ path: f.path, status: putRes.status, ok: putRes.ok });
  }

  const failed = results.filter((r) => !r.ok);
  return NextResponse.json({
    ok: failed.length === 0,
    repoUrl,
    pushed: results.length - failed.length,
    failed: failed.length,
    details: results,
  });
}
