"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { Check, Sparkles, Zap, Building2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { planDisplay } from "@/lib/billing/plans";

/* Prices come from the billing single-source-of-truth so the page can never
   drift from what the checkout actually charges. */
const pro = planDisplay("pro");
const teams = planDisplay("teams");

interface Tier {
  name: string;
  price: string;
  cadence?: string;
  annualNote?: string;
  description: string;
  features: string[];
  cta: string;
  href: string;
  featured?: boolean;
  icon: React.ElementType;
  accentClass: string;
  badgeLabel?: string;
}

const TIERS: Tier[] = [
  {
    name: "Explorer",
    price: "$0",
    cadence: " / forever",
    description: "Everything you need to learn, prototype, and evaluate models — no credit card, no time limit.",
    icon: Zap,
    accentClass: "text-sky-500 bg-sky-500/10",
    features: [
      "Playground with 3 concurrent model slots",
      "Full Learn library — 9 lessons, 3 paths",
      "195+ model tracker & leaderboard (GPT-4o, Claude Opus 4, DeepSeek V4, Grok included)",
      "Cost calculator & API status dashboard",
      "Prompt library — 10 saved prompts",
      "BYOK — bring your own API keys",
      "Dark / light / system theme",
    ],
    cta: "Start for free",
    href: "/playground",
  },
  {
    name: "Pro",
    price: pro.price,
    cadence: pro.cadence,
    annualNote: pro.annualNote,
    description: "For developers shipping real AI features — full model access, eval tooling, and priority support.",
    icon: Sparkles,
    accentClass: "text-violet-500 bg-violet-500/10",
    featured: true,
    badgeLabel: "Most popular",
    features: [
      "Everything in Explorer",
      "All 195+ models unlocked across 13 providers",
      "Unlimited saved prompts + version history",
      "Custom benchmark builder",
      "Regression eval suite with nightly runs",
      "Email + Slack alerts on model drift",
      "CSV / JSON export of eval results",
      "Priority support — 48 h SLA",
    ],
    cta: "Get Pro",
    href: "/upgrade?plan=pro",
  },
  {
    name: "Teams",
    price: teams.price,
    cadence: teams.cadence,
    annualNote: teams.annualNote,
    description: "Shared workspaces, RBAC, and team budgets — built for AI-native engineering teams.",
    icon: Building2,
    accentClass: "text-amber-500 bg-amber-500/10",
    features: [
      "Everything in Pro",
      "Shared prompt libraries & workspaces",
      "Role-based access control (RBAC)",
      "Full audit log & activity history",
      "Team budget controls per provider",
      "Marketplace credits — $50 / team / mo",
      "SSO (Google + GitHub)",
      "Priority support — 24 h SLA",
    ],
    cta: "Get Teams",
    href: "/upgrade?plan=teams",
  },
];

/* ── variants ─────────────────────────────────────────────────────── */
const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1, delayChildren: 0.05 } },
};
const cardVariant = {
  hidden: { opacity: 0, y: 40 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.55, ease: [0.25, 0.1, 0.25, 1] } },
};
const listContainer = {
  hidden: {},
  show: { transition: { staggerChildren: 0.05, delayChildren: 0.15 } },
};
const listItem = {
  hidden: { opacity: 0, x: -8 },
  show:   { opacity: 1, x: 0, transition: { duration: 0.3 } },
};

export function LandingPricing() {
  return (
    <section id="pricing" className="py-24 md:py-32">
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
            Open-source-first pricing
          </p>
          <h2 className="text-4xl md:text-5xl font-bold tracking-tight">
            Free until you scale.
            <br />
            <span className="gradient-text-blue">Then absurdly cheap.</span>
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Every tier rides on free-tier APIs. Premium upgrades unlock only the tooling you
            can&apos;t build yourself.
          </p>
        </motion.div>

        {/* Pricing cards */}
        <motion.div
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-40px" }}
          className="grid md:grid-cols-3 gap-6 max-w-6xl mx-auto items-start"
        >
          {TIERS.map((tier) => (
            <motion.div
              key={tier.name}
              variants={cardVariant}
              whileHover={
                tier.featured
                  ? {}
                  : { y: -6, transition: { duration: 0.2 } }
              }
              className={cn(
                "relative rounded-2xl border bg-card p-8 transition-shadow",
                tier.featured
                  ? "border-primary/40 shadow-2xl shadow-primary/8 md:scale-[1.04] md:-translate-y-1"
                  : "hover:border-primary/20 hover:shadow-xl",
              )}
            >
              {/* Featured animated glow border */}
              {tier.featured && (
                <motion.div
                  className="absolute inset-0 rounded-2xl pointer-events-none"
                  style={{
                    background:
                      "linear-gradient(135deg, hsl(258 90% 66% / 0.3), hsl(217 91% 60% / 0.3), hsl(258 90% 66% / 0.3))",
                    backgroundSize: "200% 200%",
                    padding: "1px",
                    WebkitMask: "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
                    WebkitMaskComposite: "xor",
                    maskComposite: "exclude",
                  }}
                  animate={{ backgroundPosition: ["0% 0%", "100% 100%", "0% 0%"] }}
                  transition={{ duration: 5, repeat: Infinity, ease: "linear" }}
                />
              )}

              {/* Featured badge */}
              {tier.badgeLabel && (
                <motion.div
                  className="absolute -top-3.5 left-1/2 -translate-x-1/2"
                  initial={{ y: -4, opacity: 0 }}
                  whileInView={{ y: 0, opacity: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.3, duration: 0.4, ease: "backOut" }}
                >
                  <div className="inline-flex items-center gap-1.5 rounded-full
                                  bg-gradient-to-r from-violet-600 to-indigo-600
                                  px-3 py-1 text-xs font-semibold text-white shadow-lg">
                    <motion.div
                      animate={{ rotate: [0, 20, -10, 0] }}
                      transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", repeatDelay: 2 }}
                    >
                      <Sparkles className="h-3 w-3" />
                    </motion.div>
                    {tier.badgeLabel}
                  </div>
                </motion.div>
              )}

              {/* Icon */}
              <motion.div
                className={cn("inline-flex h-9 w-9 rounded-lg items-center justify-center mb-4", tier.accentClass)}
                whileHover={{ scale: 1.12, rotate: 5 }}
                transition={{ duration: 0.2 }}
              >
                <tier.icon className="h-5 w-5" />
              </motion.div>

              <h3 className="text-xl font-bold">{tier.name}</h3>
              <p className="text-sm text-muted-foreground mt-1 mb-5 min-h-[48px]">
                {tier.description}
              </p>

              {/* Price */}
              <div className="mb-1">
                <span className="text-5xl font-bold tracking-tight">{tier.price}</span>
                {tier.cadence && (
                  <span className="text-sm text-muted-foreground">{tier.cadence}</span>
                )}
              </div>
              {tier.annualNote && (
                <p className="text-xs text-emerald-500 font-medium mb-5">{tier.annualNote}</p>
              )}
              {!tier.annualNote && <div className="mb-5" />}

              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Button
                  asChild
                  variant={tier.featured ? "gradient" : "outline"}
                  className="w-full mb-7"
                  size="lg"
                >
                  <Link href={tier.href} className="flex items-center gap-2">
                    {tier.cta}
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </motion.div>

              {/* Staggered checklist */}
              <motion.ul
                variants={listContainer}
                initial="hidden"
                whileInView="show"
                viewport={{ once: true }}
                className="space-y-2.5"
              >
                {tier.features.map((f) => (
                  <motion.li key={f} variants={listItem} className="flex items-start gap-2.5 text-sm">
                    <motion.div whileHover={{ scale: 1.2 }} transition={{ duration: 0.15 }}>
                      <Check className="h-4 w-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                    </motion.div>
                    <span className="text-muted-foreground">{f}</span>
                  </motion.li>
                ))}
              </motion.ul>
            </motion.div>
          ))}
        </motion.div>

        {/* Enterprise row */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.3 }}
          whileHover={{ scale: 1.005 }}
          className="mt-8 max-w-6xl mx-auto rounded-2xl border bg-card/50 p-6 sm:p-8
                     flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6
                     hover:border-primary/20 hover:shadow-lg transition-shadow"
        >
          <div>
            <p className="font-semibold text-lg">Enterprise</p>
            <p className="text-sm text-muted-foreground mt-1 max-w-lg">
              On-premise gateway (Ollama / vLLM), SOC 2 audit log exports, EU AI Act compliance
              module, dedicated SLA, and a shared Slack channel with the core team.
            </p>
          </div>
          <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}>
            <Button asChild variant="outline" size="lg" className="flex-shrink-0">
              <Link href="/contact">
                Contact us
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
