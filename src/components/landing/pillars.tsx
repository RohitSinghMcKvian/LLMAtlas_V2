"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import {
  BookOpen, Search, Code2, ArrowRight,
  Sparkles, Layers, Rocket, GraduationCap,
  BarChart3, DollarSign, Activity, MessageSquare,
  Library, Cpu, Zap,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Pillar {
  id: "learn" | "research" | "develop";
  title: string;
  subtitle: string;
  description: string;
  href: string;
  icon: LucideIcon;
  color: string;
  gradient: string;
  ring: string;
  glowColor: string;
  features: { icon: LucideIcon; label: string }[];
}

const PILLARS: Pillar[] = [
  {
    id: "learn",
    title: "LEARN",
    subtitle: "From zero to AI-fluent",
    description: '9 curated lessons and 3 guided learning paths take you from "what is an LLM" to shipping production AI in under two weeks.',
    href: "/learn",
    icon: BookOpen,
    color: "text-sky-500",
    gradient: "from-sky-500/15 via-cyan-500/8 to-transparent",
    ring: "ring-sky-500/20 hover:ring-sky-500/50",
    glowColor: "hsl(199 89% 48% / 0.15)",
    features: [
      { icon: GraduationCap, label: "9 lessons · 3 guided learning paths"        },
      { icon: BookOpen,      label: "Foundations → Architecture → Production"    },
      { icon: Sparkles,      label: "AI concept explainers (RAG, agents, MoE)"   },
      { icon: Rocket,        label: "Progress badges & completion tracking"       },
    ],
  },
  {
    id: "research",
    title: "RESEARCH",
    subtitle: "Discover & decide",
    description: "195+ models across 13 providers — DeepSeek V4 Pro, Claude Opus 4, Kimi K2.6, Qwen 3.6 included free. Compare costs, benchmarks, uptime in one place.",
    href: "/models",
    icon: Search,
    color: "text-violet-500",
    gradient: "from-violet-500/15 via-fuchsia-500/8 to-transparent",
    ring: "ring-violet-500/20 hover:ring-violet-500/50",
    glowColor: "hsl(258 90% 66% / 0.15)",
    features: [
      { icon: Search,     label: "195+ model tracker — grid + list views"     },
      { icon: BarChart3,  label: "Multi-axis leaderboard with radar charts"   },
      { icon: DollarSign, label: "Cost calculator vs 15 paid anchors"         },
      { icon: Activity,   label: "Live API status for every provider"         },
    ],
  },
  {
    id: "develop",
    title: "DEVELOP",
    subtitle: "Build & ship",
    description: "Streaming playground, 3-way compare lab, BYOK key router, and saved prompt library — from idea to shipped feature without a billing page in sight.",
    href: "/playground",
    icon: Code2,
    color: "text-amber-500",
    gradient: "from-amber-500/15 via-orange-500/8 to-transparent",
    ring: "ring-amber-500/20 hover:ring-amber-500/50",
    glowColor: "hsl(38 92% 50% / 0.15)",
    features: [
      { icon: MessageSquare, label: "Multi-model playground with streaming" },
      { icon: Layers,        label: "3-model compare lab — tok/s + TTFT"    },
      { icon: Library,       label: "Prompt library — save, tag, version"   },
      { icon: Cpu,           label: "BYOK + free-tier API router built-in"  },
    ],
  },
];

/* ── variants ─────────────────────────────────────────────────────── */
const featureList = {
  hidden: {},
  show:   { transition: { staggerChildren: 0.07, delayChildren: 0.15 } },
};
const featureItem = {
  hidden: { opacity: 0, x: -12 },
  show:   { opacity: 1, x: 0,  transition: { duration: 0.35, ease: "easeOut" } },
};

export function LandingPillars() {
  return (
    <section id="pillars" className="py-24 md:py-32 relative">
      <div className="container">

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
          className="mx-auto max-w-3xl text-center mb-16"
        >
          <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-3">
            Three pillars · One workspace
          </p>
          <h2 className="text-4xl md:text-5xl font-bold tracking-tight">
            The full journey from{" "}
            <span className="gradient-text-blue">curious to production-ready.</span>
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Every AI persona enters somewhere on the curve — hobbyist, developer, or architect.
            LLMAtlas meets you where you are and pulls you forward.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-6">
          {PILLARS.map((pillar, i) => (
            <motion.div
              key={pillar.id}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.6, delay: i * 0.1 }}
            >
              <Link
                href={pillar.href}
                className={cn(
                  "group relative block rounded-2xl border bg-card p-8 ring-1 transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl overflow-hidden",
                  pillar.ring,
                )}
              >
                {/* Hover gradient */}
                <div
                  className={cn(
                    "absolute inset-0 rounded-2xl bg-gradient-to-br opacity-0 group-hover:opacity-100 transition-opacity duration-300",
                    pillar.gradient,
                  )}
                />
                {/* Radial glow on hover */}
                <div
                  className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
                  style={{
                    background: `radial-gradient(ellipse at top right, ${pillar.glowColor}, transparent 60%)`,
                  }}
                />

                <div className="relative">
                  {/* Icon */}
                  <motion.div
                    className={cn(
                      "inline-flex h-12 w-12 items-center justify-center rounded-xl bg-background ring-1 ring-border shadow-sm mb-6",
                      pillar.color,
                    )}
                    whileHover={{ scale: 1.12, rotate: 5 }}
                    transition={{ duration: 0.2 }}
                  >
                    <pillar.icon className="h-6 w-6" />
                  </motion.div>

                  <p className={cn("text-xs font-bold tracking-widest mb-1.5", pillar.color)}>
                    {pillar.title}
                  </p>
                  <h3 className="text-2xl font-bold mb-2">{pillar.subtitle}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed mb-6">
                    {pillar.description}
                  </p>

                  {/* Staggered feature list */}
                  <motion.ul
                    variants={featureList}
                    initial="hidden"
                    whileInView="show"
                    viewport={{ once: true }}
                    className="space-y-2.5 mb-6"
                  >
                    {pillar.features.map((f, j) => (
                      <motion.li
                        key={j}
                        variants={featureItem}
                        className="flex items-center gap-3 text-sm text-muted-foreground"
                      >
                        <motion.div
                          whileHover={{ scale: 1.2 }}
                          transition={{ duration: 0.15 }}
                        >
                          <f.icon className={cn("h-4 w-4 flex-shrink-0", pillar.color)} />
                        </motion.div>
                        <span>{f.label}</span>
                      </motion.li>
                    ))}
                  </motion.ul>

                  {/* CTA row */}
                  <div
                    className={cn(
                      "flex items-center gap-2 text-sm font-semibold group-hover:gap-3 transition-all duration-200",
                      pillar.color,
                    )}
                  >
                    Explore
                    <motion.div
                      animate={{ x: 0 }}
                      whileHover={{ x: 4 }}
                      transition={{ duration: 0.2 }}
                    >
                      <ArrowRight className="h-4 w-4" />
                    </motion.div>
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
