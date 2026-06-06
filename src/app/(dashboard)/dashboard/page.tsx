"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  MessageSquare, GitCompare, Database, BookOpen,
  Calculator, Activity, Sparkles, ArrowRight, Zap, BarChart3,
  Newspaper, Github, Star, GitFork, ExternalLink, Loader2,
  TrendingUp, Clock, RefreshCw, Mail, MessageCircle, HeartHandshake,
  Twitter, Shield,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MODELS, PROVIDERS } from "@/lib/models";
import type { NewsArticle } from "@/app/api/news/route";
import type { GithubRepo } from "@/app/api/github/route";

const QUICK_ACTIONS = [
  { title: "Open Playground", desc: "Stream responses from Llama 4, DeepSeek, Gemini & more", icon: MessageSquare, href: "/playground", color: "amber" },
  { title: "Compare models", desc: "Same prompt, 3 models, instant tok/s + TTFT comparison", icon: GitCompare, href: "/compare", color: "violet" },
  { title: "Browse models", desc: `${MODELS.length}+ models — filter by provider, speed & context`, icon: Database, href: "/models", color: "sky" },
  { title: "Continue learning", desc: "9 lessons · 3 paths · From foundations to production AI", icon: BookOpen, href: "/learn", color: "emerald" },
  { title: "Contact & Support", desc: "Talk to the team · partnership · bug reports · press", icon: Mail, href: "/contact", color: "indigo" },
];

const ACTION_COLORS: Record<string, string> = {
  amber:  "from-amber-500/20 to-orange-500/10 text-amber-600 border-amber-500/30",
  violet: "from-violet-500/20 to-purple-500/10 text-violet-600 border-violet-500/30",
  sky:    "from-sky-500/20 to-blue-500/10 text-sky-600 border-sky-500/30",
  emerald:"from-emerald-500/20 to-teal-500/10 text-emerald-600 border-emerald-500/30",
  indigo: "from-indigo-500/20 to-blue-500/10 text-indigo-600 border-indigo-500/30",
};

function timeAgo(iso: string) {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function formatStars(n: number) {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

export default function DashboardPage() {
  const featuredModels = MODELS.slice(0, 4);

  const [greeting, setGreeting] = useState("Welcome");
  const [news, setNews] = useState<NewsArticle[]>([]);
  const [repos, setRepos] = useState<GithubRepo[]>([]);
  const [newsLoading, setNewsLoading] = useState(true);
  const [reposLoading, setReposLoading] = useState(true);
  const [newsError, setNewsError] = useState<string | null>(null);
  const [reposError, setReposError] = useState<string | null>(null);

  useEffect(() => { setGreeting(getGreeting()); }, []);

  async function loadNews() {
    setNewsLoading(true);
    setNewsError(null);
    try {
      const r = await fetch("/api/news");
      const d = await r.json();
      if (d.error && d.articles.length === 0) setNewsError(d.error);
      setNews(d.articles ?? []);
    } catch {
      setNewsError("Failed to load news");
    } finally {
      setNewsLoading(false);
    }
  }

  async function loadRepos() {
    setReposLoading(true);
    setReposError(null);
    try {
      const r = await fetch("/api/github");
      const d = await r.json();
      if (d.error && d.repos.length === 0) setReposError(d.error);
      setRepos(d.repos ?? []);
    } catch {
      setReposError("Failed to load repos");
    } finally {
      setReposLoading(false);
    }
  }

  useEffect(() => {
    loadNews();
    loadRepos();
  }, []);

  const providerCount = Object.keys(PROVIDERS).length;
  const freeCount = MODELS.filter((m) => m.free).length;

  return (
    <div className="container max-w-7xl py-8 md:py-12 space-y-12">

      {/* ─── Header ─── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight">{greeting}</h1>
        <p className="mt-2 text-muted-foreground">
          {freeCount} free models across {providerCount} providers — explore, compare, and build without a credit card.
        </p>
      </motion.div>

      {/* ─── Quick actions ─── */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {QUICK_ACTIONS.map((action, i) => (
          <motion.div
            key={action.href}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: i * 0.05 }}
          >
            <Link href={action.href}>
              <Card className={`bg-gradient-to-br ${ACTION_COLORS[action.color]} group hover:shadow-lg hover:scale-[1.02] transition-all cursor-pointer border`}>
                <CardContent className="p-5">
                  <action.icon className="h-7 w-7 mb-3" />
                  <h3 className="font-semibold mb-1">{action.title}</h3>
                  <p className="text-xs text-muted-foreground">{action.desc}</p>
                  <ArrowRight className="h-4 w-4 mt-3 group-hover:translate-x-1 transition-transform" />
                </CardContent>
              </Card>
            </Link>
          </motion.div>
        ))}
      </div>

      {/* ─── Stats ─── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Free models available",  value: freeCount,     icon: Sparkles },
          { label: "Integrated providers",   value: providerCount, icon: Activity },
          { label: "Peak speed on Groq",     value: "850+ tok/s",  icon: Zap },
          { label: "Largest context window", value: "2M tokens",   icon: BarChart3 },
        ].map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.2 + i * 0.05 }}
          >
            <Card className="card-hover h-full">
              <CardContent className="p-5 flex items-center gap-4">
                <div className="h-12 w-12 rounded-lg bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
                  <s.icon className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-2xl font-bold">{s.value}</div>
                  <div className="text-xs text-muted-foreground">{s.label}</div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* ─── AI News Feed ─── */}
      <motion.section
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.35 }}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Newspaper className="h-5 w-5 text-sky-500" />
            <h2 className="text-xl font-bold">Latest AI News</h2>
            <Badge variant="outline" className="text-[10px]">Live · NewsAPI</Badge>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={loadNews}
            disabled={newsLoading}
            className="gap-1.5 text-xs"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${newsLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>

        {newsLoading && (
          <div className="flex items-center justify-center h-40 text-muted-foreground gap-2">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span className="text-sm">Fetching latest AI headlines…</span>
          </div>
        )}

        {!newsLoading && newsError && news.length === 0 && (
          <Card className="border-dashed">
            <CardContent className="p-8 text-center text-muted-foreground">
              <Newspaper className="h-8 w-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm font-medium">News feed unavailable</p>
              <p className="text-xs mt-1">
                {newsError.includes("NEWSAPI_KEY") ? (
                  "Add NEWSAPI_KEY to .env.local to enable live headlines."
                ) : (
                  newsError
                )}
              </p>
            </CardContent>
          </Card>
        )}

        {!newsLoading && news.length > 0 && (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {news.map((article, i) => (
              <motion.div
                key={article.url}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: i * 0.04 }}
              >
                <a href={article.url} target="_blank" rel="noopener noreferrer" className="block h-full group">
                  <Card className="h-full hover:shadow-md hover:border-sky-400/40 transition-all overflow-hidden">
                    {article.urlToImage && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={article.urlToImage}
                        alt=""
                        loading="lazy"
                        className="w-full h-36 object-cover"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                      />
                    )}
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <Badge variant="secondary" className="text-[10px] truncate max-w-[120px]">
                          {article.source.name}
                        </Badge>
                        <span className="text-[11px] text-muted-foreground flex items-center gap-1 flex-shrink-0">
                          <Clock className="h-3 w-3" />
                          {timeAgo(article.publishedAt)}
                        </span>
                      </div>
                      <h3 className="font-semibold text-sm leading-snug line-clamp-2 group-hover:text-sky-500 transition-colors">
                        {article.title}
                      </h3>
                      {article.description && (
                        <p className="text-xs text-muted-foreground mt-1.5 line-clamp-2">
                          {article.description}
                        </p>
                      )}
                      <div className="flex items-center gap-1 mt-3 text-xs text-sky-500 group-hover:underline">
                        Read more <ExternalLink className="h-3 w-3" />
                      </div>
                    </CardContent>
                  </Card>
                </a>
              </motion.div>
            ))}
          </div>
        )}
      </motion.section>

      {/* ─── GitHub Trending ─── */}
      <motion.section
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.5 }}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Github className="h-5 w-5 text-violet-500" />
            <h2 className="text-xl font-bold">Trending AI Repos</h2>
            <Badge variant="outline" className="text-[10px]">Live · GitHub</Badge>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={loadRepos}
            disabled={reposLoading}
            className="gap-1.5 text-xs"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${reposLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>

        {reposLoading && (
          <div className="flex items-center justify-center h-40 text-muted-foreground gap-2">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span className="text-sm">Fetching trending repositories…</span>
          </div>
        )}

        {!reposLoading && reposError && repos.length === 0 && (
          <Card className="border-dashed">
            <CardContent className="p-8 text-center text-muted-foreground">
              <Github className="h-8 w-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm font-medium">GitHub feed unavailable</p>
              <p className="text-xs mt-1">
                {reposError.includes("rate") ? (
                  "Add GITHUB_TOKEN to .env.local for higher rate limits."
                ) : (
                  reposError
                )}
              </p>
            </CardContent>
          </Card>
        )}

        {!reposLoading && repos.length > 0 && (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {repos.map((repo, i) => (
              <motion.div
                key={repo.full_name}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: i * 0.04 }}
              >
                <a href={repo.html_url} target="_blank" rel="noopener noreferrer" className="block h-full group">
                  <Card className="h-full hover:shadow-md hover:border-violet-400/40 transition-all">
                    <CardContent className="p-4">
                      {/* owner + repo */}
                      <div className="flex items-center gap-2 mb-2">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={repo.owner.avatar_url}
                          alt={repo.owner.login}
                          className="h-5 w-5 rounded-full"
                          loading="lazy"
                        />
                        <p className="text-sm font-semibold truncate group-hover:text-violet-500 transition-colors">
                          {repo.full_name}
                        </p>
                      </div>

                      {/* description */}
                      <p className="text-xs text-muted-foreground line-clamp-2 min-h-[2.5rem]">
                        {repo.description ?? "No description provided."}
                      </p>

                      {/* topics */}
                      {repo.topics.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2.5">
                          {repo.topics.map((t) => (
                            <Badge key={t} variant="secondary" className="text-[10px]">{t}</Badge>
                          ))}
                        </div>
                      )}

                      {/* meta row */}
                      <div className="flex items-center gap-3 mt-3 text-xs text-muted-foreground">
                        {repo.language && (
                          <span className="flex items-center gap-1">
                            <span className="h-2.5 w-2.5 rounded-full bg-amber-400 inline-block" />
                            {repo.language}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Star className="h-3 w-3 text-amber-500" />
                          {formatStars(repo.stargazers_count)}
                        </span>
                        <span className="flex items-center gap-1">
                          <GitFork className="h-3 w-3" />
                          {formatStars(repo.forks_count)}
                        </span>
                        <span className="ml-auto flex items-center gap-1">
                          <TrendingUp className="h-3 w-3 text-violet-400" />
                          trending
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                </a>
              </motion.div>
            ))}
          </div>
        )}
      </motion.section>

      {/* ─── Featured models ─── */}
      <motion.section
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.65 }}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">Top-rated free models</h2>
          <Link href="/models" className="text-sm text-primary hover:underline inline-flex items-center gap-1">
            Browse all {MODELS.length} <ArrowRight className="h-3 w-3" />
          </Link>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {featuredModels.map((m, i) => (
            <motion.div
              key={m.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4, delay: 0.7 + i * 0.05 }}
            >
              <Link href={`/playground?model=${m.id}`}>
                <Card className="h-full hover:shadow-md hover:border-primary/30 transition-all cursor-pointer">
                  <CardContent className="p-5">
                    <div className="flex items-center justify-between mb-3">
                      <Badge variant="success" className="text-[10px]">FREE</Badge>
                      <Badge variant="outline" className="text-[10px]">{m.vendor}</Badge>
                    </div>
                    <h3 className="font-semibold text-sm mb-1 truncate">{m.name}</h3>
                    <p className="text-xs text-muted-foreground line-clamp-2">{m.description}</p>
                    <div className="flex items-center gap-3 mt-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><Zap className="h-3 w-3" /> {m.speedScore}</span>
                      <span className="flex items-center gap-1"><BarChart3 className="h-3 w-3" /> {m.benchmark}</span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            </motion.div>
          ))}
        </div>
      </motion.section>

      {/* ─── Get in Touch banner ─── */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.8 }}
      >
        <div className="relative overflow-hidden rounded-2xl border bg-gradient-to-br from-indigo-500/8 via-violet-500/5 to-blue-500/8 border-indigo-500/20 p-8">
          {/* Background glow */}
          <div className="absolute -top-16 -right-16 w-48 h-48 rounded-full bg-indigo-500/10 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-12 -left-12 w-40 h-40 rounded-full bg-violet-500/10 blur-3xl pointer-events-none" />

          <div className="relative flex flex-col lg:flex-row items-start lg:items-center justify-between gap-8">
            {/* Left copy */}
            <div className="flex items-start gap-4">
              <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center flex-shrink-0 shadow-lg shadow-indigo-500/20">
                <HeartHandshake className="h-6 w-6 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-lg font-bold">Questions, feedback, or a partnership idea?</h3>
                  <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Replies in &lt; 24h
                  </span>
                </div>
                <p className="text-sm text-muted-foreground max-w-md">
                  Our team reads every message. Whether it&apos;s a bug, a feature idea, enterprise inquiry, or just a hello — we&apos;d love to hear from you.
                </p>

                {/* Channel chips */}
                <div className="flex flex-wrap gap-2 mt-3">
                  {[
                    { icon: Mail,           label: "hello@llmatlas.com",   color: "text-sky-500   border-sky-500/20   bg-sky-500/5"    },
                    { icon: MessageCircle,  label: "Discord Community",    color: "text-indigo-500 border-indigo-500/20 bg-indigo-500/5" },
                    { icon: Twitter,        label: "@llmatlas",            color: "text-blue-500   border-blue-500/20   bg-blue-500/5"   },
                    { icon: Shield,         label: "security@llmatlas.com",color: "text-emerald-500 border-emerald-500/20 bg-emerald-500/5"},
                  ].map(({ icon: Icon, label, color }) => (
                    <span
                      key={label}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border ${color}`}
                    >
                      <Icon className="h-3 w-3" />
                      {label}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Right CTAs */}
            <div className="flex flex-col sm:flex-row lg:flex-col xl:flex-row gap-2.5 flex-shrink-0">
              <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                <Link href="/contact">
                  <Button
                    className="gap-2 bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 text-white border-0 shadow-md shadow-indigo-500/25 w-full sm:w-auto"
                    size="sm"
                  >
                    <Mail className="h-4 w-4" />
                    Open Contact Page
                    <ArrowRight className="h-3.5 w-3.5 opacity-75" />
                  </Button>
                </Link>
              </motion.div>
              <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                <a href="https://github.com" target="_blank" rel="noreferrer">
                  <Button variant="outline" size="sm" className="gap-2 w-full sm:w-auto">
                    <Github className="h-4 w-4" />
                    GitHub Issues
                  </Button>
                </a>
              </motion.div>
            </div>
          </div>
        </div>
      </motion.section>

    </div>
  );
}
