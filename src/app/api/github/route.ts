// GitHub trending AI repositories feed
// Returns the top 6 most-starred repos tagged with llm / ai topics.
// Cached server-side for 1 hour to avoid hitting rate limits.

import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export interface GithubRepo {
  full_name: string;
  description: string | null;
  stargazers_count: number;
  forks_count: number;
  language: string | null;
  html_url: string;
  topics: string[];
  owner: { avatar_url: string; login: string };
  updated_at: string;
}

export async function GET() {
  const token = process.env.GITHUB_TOKEN;

  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "LLMAtlas/1.0",
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  try {
    // Search for repos with llm + artificial-intelligence topics, sorted by stars
    const res = await fetch(
      `https://api.github.com/search/repositories` +
        `?q=topic:llm+topic:artificial-intelligence+language:python&sort=stars&order=desc&per_page=9`,
      { headers, next: { revalidate: 3600 } },
    );

    if (!res.ok) {
      // Fallback: try simpler query
      const res2 = await fetch(
        `https://api.github.com/search/repositories?q=llm+language:python&sort=stars&order=desc&per_page=9`,
        { headers, next: { revalidate: 3600 } },
      );
      if (!res2.ok) {
        return NextResponse.json({ repos: [], error: `GitHub API ${res2.status}` }, { status: 200 });
      }
      const d2 = await res2.json();
      return NextResponse.json({ repos: mapRepos(d2.items ?? []) }, {
        headers: { "Cache-Control": "s-maxage=3600, stale-while-revalidate=7200" },
      });
    }

    const data = await res.json();
    return NextResponse.json({ repos: mapRepos(data.items ?? []) }, {
      headers: { "Cache-Control": "s-maxage=3600, stale-while-revalidate=7200" },
    });
  } catch (err) {
    return NextResponse.json(
      { repos: [], error: err instanceof Error ? err.message : "fetch failed" },
      { status: 200 },
    );
  }
}

type RawRepo = {
  full_name: string;
  description: string | null;
  stargazers_count: number;
  forks_count: number;
  language: string | null;
  html_url: string;
  topics: string[];
  owner: { avatar_url: string; login: string };
  updated_at: string;
};

function mapRepos(items: RawRepo[]): GithubRepo[] {
  return items.slice(0, 9).map((r) => ({
    full_name: r.full_name,
    description: r.description,
    stargazers_count: r.stargazers_count,
    forks_count: r.forks_count,
    language: r.language,
    html_url: r.html_url,
    topics: (r.topics ?? []).slice(0, 4),
    owner: { avatar_url: r.owner?.avatar_url ?? "", login: r.owner?.login ?? "" },
    updated_at: r.updated_at,
  }));
}
