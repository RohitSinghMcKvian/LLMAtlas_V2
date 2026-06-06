// AI / LLM news feed — powered by NewsAPI.org
// Returns the 9 most recent English articles about LLMs and AI models.
// Cached server-side for 30 minutes to avoid hitting the free-tier limit.

import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export interface NewsArticle {
  title: string;
  description: string | null;
  url: string;
  urlToImage: string | null;
  publishedAt: string;
  source: { name: string };
  author: string | null;
}

export async function GET() {
  const key = process.env.NEWSAPI_KEY;

  if (!key) {
    return NextResponse.json({ articles: [], error: "NEWSAPI_KEY not configured" }, { status: 200 });
  }

  try {
    // Query for AI/LLM news — everything endpoint gives richer results than top-headlines
    const query = encodeURIComponent(
      '("large language model" OR "LLM" OR "AI model" OR "generative AI" OR "GPT" OR "Claude" OR "Gemini" OR "open source AI")',
    );
    const url =
      `https://newsapi.org/v2/everything` +
      `?q=${query}` +
      `&language=en` +
      `&sortBy=publishedAt` +
      `&pageSize=9` +
      `&domains=techcrunch.com,theverge.com,wired.com,venturebeat.com,arstechnica.com,zdnet.com,towardsdatascience.com,huggingface.co,openai.com`;

    const res = await fetch(url, {
      headers: { "X-Api-Key": key },
      next: { revalidate: 1800 }, // 30-min server cache
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return NextResponse.json(
        { articles: [], error: `NewsAPI ${res.status}: ${text.slice(0, 200)}` },
        { status: 200 },
      );
    }

    const data = await res.json();
    const articles: NewsArticle[] = (data.articles ?? [])
      .filter((a: NewsArticle) => a.title && a.title !== "[Removed]" && a.url)
      .slice(0, 9);

    return NextResponse.json({ articles }, {
      headers: {
        "Cache-Control": "s-maxage=1800, stale-while-revalidate=3600",
      },
    });
  } catch (err) {
    return NextResponse.json(
      { articles: [], error: err instanceof Error ? err.message : "fetch failed" },
      { status: 200 },
    );
  }
}
