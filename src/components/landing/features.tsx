"use client";

import { motion } from "framer-motion";
import {
  MessageSquare, GitCompare, Calculator, Activity, Library,
  Settings2, Zap, Shield, Globe, BarChart3, Cpu, Brain,
} from "lucide-react";

const FEATURES = [
  { icon: MessageSquare, title: "Multi-model playground",      description: "Stream responses from DeepSeek V4 Pro, Claude Opus 4, Kimi K2.6, Qwen 3.6, Gemini 2.5 and more — temperature, top-p, and system prompts all tunable.",             badge: "13 providers",    color: "bg-blue-500/10 text-blue-500",    glow: "hsl(217 91% 60% / 0.12)" },
  { icon: GitCompare,    title: "3-model compare lab",         description: "Fire the same prompt at up to 3 models in parallel. Instant tok/s, TTFT, and quality diff — pick the right model for the job.",                                       badge: "Side-by-side",    color: "bg-violet-500/10 text-violet-500", glow: "hsl(258 90% 66% / 0.12)" },
  { icon: Calculator,    title: "Cost calculator",             description: "Project monthly LLM spend for any workload. Compare 195+ free models against 15 paid anchors (GPT-4.1, Claude Opus 4, Gemini 2.5…).",                                  badge: "195+ models",     color: "bg-emerald-500/10 text-emerald-500", glow: "hsl(160 84% 39% / 0.12)" },
  { icon: Activity,      title: "Live API status",             description: "Real-time uptime and latency for every major provider. Auto-refreshes every 30 seconds. Bookmark it for the next outage.",                                           badge: "Auto-refresh",    color: "bg-amber-500/10 text-amber-500",   glow: "hsl(38 92% 50% / 0.12)"  },
  { icon: BarChart3,     title: "Public leaderboard",          description: "Multi-axis composite ranking — Quality, Speed, Context, Openness, Value. Sortable table + radar chart. Filter by capability.",                                       badge: "Multi-axis",      color: "bg-sky-500/10 text-sky-500",       glow: "hsl(199 89% 48% / 0.12)" },
  { icon: Library,       title: "Prompt library",              description: "Save, tag, version, and search prompts. Accessible anywhere in the app. Stored locally — your prompts never leave your browser.",                                     badge: "LocalStorage",    color: "bg-fuchsia-500/10 text-fuchsia-500", glow: "hsl(289 91% 52% / 0.12)" },
  { icon: Settings2,     title: "BYOK — bring your own key",   description: "Use the free server-side keys out of the box, or plug in your own for higher limits. Keys stored client-side only — never sent to us.",                             badge: "Privacy-first",   color: "bg-rose-500/10 text-rose-500",     glow: "hsl(0 72% 51% / 0.12)"   },
  { icon: Zap,           title: "Streaming everywhere",        description: "Token-by-token streaming on every model, every feature. No polling, no waiting for full responses. Tight latency budgets respected.",                               badge: "Token streaming", color: "bg-orange-500/10 text-orange-500", glow: "hsl(25 95% 53% / 0.12)"  },
  { icon: Brain,         title: "Reasoning models supported",  description: "DeepSeek R1, QwQ, o3 — thinking-mode models with extended chain-of-thought. Collapsible reasoning traces in the playground.",                                       badge: "CoT / thinking",  color: "bg-indigo-500/10 text-indigo-500", glow: "hsl(239 84% 67% / 0.12)" },
  { icon: Cpu,           title: "Edge & ultra-fast inference",  description: "Cerebras wafer-scale and Groq LPU models serve 800+ tok/s. Cloudflare edge nodes guarantee sub-100ms TTFT globally.",                                             badge: "800+ tok/s",      color: "bg-cyan-500/10 text-cyan-500",     glow: "hsl(187 85% 43% / 0.12)" },
  { icon: Shield,        title: "Privacy & security",          description: "No analytics by default. Keys never leave your browser. Self-host in minutes on Vercel, Cloudflare Pages, or your own server.",                                     badge: "Zero telemetry",  color: "bg-green-500/10 text-green-500",   glow: "hsl(142 76% 36% / 0.12)" },
  { icon: Globe,         title: "100% open-source",            description: "Built on Next.js 15, Tailwind CSS, shadcn/ui, Zustand, and Recharts. Fork it, deploy it, white-label it — MIT license.",                                           badge: "MIT license",     color: "bg-teal-500/10 text-teal-500",     glow: "hsl(173 80% 40% / 0.12)" },
];

/* ── variants ─────────────────────────────────────────────────────── */
const container = {
  hidden: {},
  show:   { transition: { staggerChildren: 0.055, delayChildren: 0.1 } },
};
const card = {
  hidden: { opacity: 0, y: 28, scale: 0.97 },
  show:   { opacity: 1, y: 0,  scale: 1,   transition: { duration: 0.45, ease: [0.25, 0.1, 0.25, 1] } },
};

export function LandingFeatures() {
  return (
    <section id="features" className="py-24 md:py-32 bg-muted/20 dark:bg-muted/10">
      <div className="container">

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="mx-auto max-w-3xl text-center mb-16"
        >
          <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-3">
            What&apos;s inside
          </p>
          <h2 className="text-4xl md:text-5xl font-bold tracking-tight">
            Every tool you need.{" "}
            <span className="gradient-text-blue">Zero you don&apos;t.</span>
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            A fully integrated workspace — not a collection of tabs. Everything talks to everything.
          </p>
        </motion.div>

        {/* Grid */}
        <motion.div
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-60px" }}
          className="grid md:grid-cols-2 lg:grid-cols-3 gap-4"
        >
          {FEATURES.map((f) => (
            <motion.div
              key={f.title}
              variants={card}
              whileHover={{ y: -6, transition: { duration: 0.2 } }}
              className="group relative rounded-xl border bg-card p-6 overflow-hidden
                         transition-shadow duration-300 hover:shadow-xl hover:border-transparent"
            >
              {/* Glow reveal on hover */}
              <motion.div
                className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-300"
                style={{ background: `radial-gradient(ellipse at top left, ${f.glow}, transparent 65%)` }}
              />
              {/* Border gradient on hover */}
              <div
                className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-300"
                style={{
                  padding: "1px",
                  background: `linear-gradient(135deg, ${f.glow.replace("0.12", "0.6")}, transparent 50%)`,
                  WebkitMask: "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
                  WebkitMaskComposite: "xor",
                  maskComposite: "exclude",
                }}
              />

              <div className="relative">
                <div className="flex items-start justify-between mb-4">
                  <motion.div
                    className={`h-10 w-10 rounded-lg flex items-center justify-center ${f.color}`}
                    whileHover={{ scale: 1.15, rotate: 5 }}
                    transition={{ duration: 0.2 }}
                  >
                    <f.icon className="h-5 w-5" />
                  </motion.div>
                  <span className="text-[10px] font-semibold uppercase tracking-wider
                                   text-muted-foreground border rounded-full px-2 py-0.5 group-hover:border-primary/30 transition-colors">
                    {f.badge}
                  </span>
                </div>
                <h3 className="font-semibold mb-1.5 group-hover:text-foreground transition-colors">
                  {f.title}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {f.description}
                </p>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
