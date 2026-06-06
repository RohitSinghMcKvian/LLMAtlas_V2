"use client";

import Link from "next/link";
import { motion, useInView, AnimatePresence } from "framer-motion";
import { useRef, useState } from "react";
import {
  Github, Twitter, MessageCircle,
  ArrowUpRight, Check, Send,
} from "lucide-react";
import { HexMark } from "@/components/brand/logo";

/* ─── data ───────────────────────────────────────────────────────────── */

const COLS = [
  {
    heading: "Product",
    links: [
      { label: "Playground",      href: "/playground"  },
      { label: "Compare Lab",     href: "/compare"     },
      { label: "Model Tracker",   href: "/models"      },
      { label: "Cost Calculator", href: "/calculator"  },
      { label: "Leaderboard",     href: "/leaderboard" },
      { label: "API Status",      href: "/status"      },
      { label: "Prompt Library",  href: "/prompts"     },
    ],
  },
  {
    heading: "Learn",
    links: [
      { label: "Lesson Library",   href: "/learn"                        },
      { label: "Beginner Path",    href: "/learn/path/absolute-beginner" },
      { label: "Production Path",  href: "/learn/path/production-ready"  },
      { label: "AI Architect",     href: "/learn/path/ai-architect"      },
      { label: "Roadmap",          href: "/learn/roadmap"                },
      { label: "Certificates",     href: "/learn/certificates"           },
    ],
  },
  {
    heading: "Providers",
    wide: true,
    links: [
      { label: "Groq",          href: "https://console.groq.com/keys",               external: true },
      { label: "Google AI",     href: "https://aistudio.google.com/app/apikey",       external: true },
      { label: "NVIDIA NIM",    href: "https://build.nvidia.com/explore/discover",    external: true },
      { label: "Mistral AI",    href: "https://console.mistral.ai/api-keys/",         external: true },
      { label: "Together AI",   href: "https://api.together.xyz/settings/api-keys",   external: true },
      { label: "Cerebras",      href: "https://cloud.cerebras.ai",                   external: true },
      { label: "OpenRouter",    href: "https://openrouter.ai/keys",                  external: true },
      { label: "xAI / Grok",    href: "https://console.x.ai/",                       external: true },
      { label: "Cloudflare AI", href: "https://dash.cloudflare.com/?to=/:account/ai", external: true },
      { label: "Hugging Face",  href: "https://huggingface.co/settings/tokens",      external: true },
      { label: "GitHub Models", href: "https://github.com/marketplace/models",       external: true },
      { label: "Pollinations",  href: "https://pollinations.ai",                     external: true },
    ],
  },
  {
    heading: "Company",
    links: [
      { label: "Pricing",          href: "#pricing"            },
      { label: "About",            href: "#"                   },
      { label: "Blog",             href: "#"                   },
      { label: "Contact",          href: "/contact"            },
      { label: "Privacy",          href: "#"                   },
      { label: "Terms",            href: "#"                   },
      { label: "GitHub ↗",         href: "https://github.com", external: true },
    ],
  },
];

const STATS = [
  { value: "195+", label: "models",    g: "from-blue-400 to-cyan-300"      },
  { value: "13",   label: "providers", g: "from-violet-400 to-purple-300"  },
  { value: "3",    label: "paths",     g: "from-sky-400 to-blue-300"       },
  { value: "MIT",  label: "licensed",  g: "from-amber-400 to-orange-300"   },
];

const SOCIALS = [
  { href: "https://github.com", Icon: Github,        label: "GitHub",
    cls: "hover:border-white/20 hover:text-white hover:bg-white/[0.08]" },
  { href: "#",                  Icon: Twitter,       label: "Twitter",
    cls: "hover:border-blue-500/40 hover:text-blue-400 hover:bg-blue-500/[0.08]" },
  { href: "#",                  Icon: MessageCircle, label: "Discord",
    cls: "hover:border-violet-500/40 hover:text-violet-400 hover:bg-violet-500/[0.08]" },
];

/* ─── animation variants ─────────────────────────────────────────────── */

const colStagger = {
  hidden: {},
  show:   { transition: { staggerChildren: 0.07, delayChildren: 0.1 } },
};
const colItem = {
  hidden: { opacity: 0, y: 14 },
  show:   { opacity: 1, y: 0,  transition: { duration: 0.42, ease: [0.25, 0.1, 0.25, 1] } },
};

/* ─── tiny helpers ───────────────────────────────────────────────────── */

function Orb({ color, size, top, left, right, bottom, duration = 12, delay = 0 }: {
  color: string; size: number; duration?: number; delay?: number;
  top?: string; left?: string; right?: string; bottom?: string;
}) {
  return (
    <motion.div
      className="absolute rounded-full pointer-events-none"
      style={{ width: size, height: size, top, left, right, bottom,
               background: `radial-gradient(circle, ${color} 0%, transparent 70%)` }}
      animate={{ y: [0, -22, 0], x: [0, 12, 0] }}
      transition={{ duration, repeat: Infinity, ease: "easeInOut", delay }}
    />
  );
}

function NavLink({ href, label, external }: { href: string; label: string; external?: boolean }) {
  return (
    <Link
      href={href}
      target={external ? "_blank" : undefined}
      rel={external ? "noreferrer" : undefined}
      className="group inline-flex items-center gap-0.5 text-[11.5px] text-white/38
                 hover:text-white/90 transition-colors duration-150"
    >
      <span className="relative">
        {label}
        <span
          className="absolute -bottom-px left-0 h-px w-0 group-hover:w-full transition-all duration-200"
          style={{ background: "linear-gradient(90deg,hsl(217 91% 60%),hsl(258 90% 66%))" }}
        />
      </span>
      {external && (
        <ArrowUpRight className="h-2 w-2 shrink-0 opacity-0 group-hover:opacity-40 transition-opacity" />
      )}
    </Link>
  );
}

/* ─── main component ─────────────────────────────────────────────────── */

export function LandingFooter() {
  const ref         = useRef<HTMLDivElement>(null);
  const inView      = useInView(ref, { once: true, margin: "-40px" });
  const [email, setEmail]           = useState("");
  const [subscribed, setSubscribed] = useState(false);

  return (
    <footer
      ref={ref}
      className="relative overflow-hidden"
      style={{ background: "hsl(260 87% 3%)", color: "hsl(40 6% 95%)" }}
    >
      {/* floating orbs */}
      <div className="absolute inset-0 pointer-events-none">
        <Orb color="hsl(217 91% 60% / 0.10)" size={560} top="-15%"  left="8%"   duration={14}         />
        <Orb color="hsl(258 90% 66% / 0.08)" size={420} bottom="-8%" right="6%"  duration={18} delay={3} />
        <Orb color="hsl(38 92% 50% / 0.06)"  size={320} top="35%"   right="22%" duration={11} delay={6} />
      </div>

      {/* dot grid */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: "radial-gradient(circle,rgba(255,255,255,0.04) 1px,transparent 1px)",
          backgroundSize: "24px 24px",
          maskImage: "radial-gradient(ellipse 100% 100% at 50% 0%,black 20%,transparent 90%)",
          WebkitMaskImage: "radial-gradient(ellipse 100% 100% at 50% 0%,black 20%,transparent 90%)",
        }}
      />

      {/* shimmer top border */}
      <div className="absolute top-0 inset-x-0 h-px overflow-hidden">
        <div className="h-full w-full" style={{
          background: "linear-gradient(90deg,transparent 0%,hsl(217 91% 60%/0.9) 30%,hsl(258 90% 66%/0.9) 50%,hsl(38 92% 50%/0.9) 70%,transparent 100%)",
        }} />
        <motion.div
          className="absolute top-0 h-px w-[22%]"
          style={{ background: "linear-gradient(90deg,transparent,rgba(255,255,255,0.75),transparent)" }}
          animate={{ x: ["-100%", "560%"] }}
          transition={{ duration: 4, repeat: Infinity, ease: "linear", repeatDelay: 5 }}
        />
      </div>

      <div className="container relative z-10">

        {/* ════ band 1 — brand + newsletter ════════════════════════════ */}
        <motion.div
          className="py-8 border-b border-white/[0.06]
                     flex flex-col sm:flex-row items-start sm:items-center
                     justify-between gap-5"
          initial={{ opacity: 0, y: 18 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.55, ease: [0.25, 0.1, 0.25, 1] }}
        >
          {/* brand */}
          <div className="flex items-center gap-5 flex-shrink-0">
            <Link href="/" className="flex items-center gap-2.5 group" aria-label="LLMAtlas home">
              <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }}>
                <HexMark size={30} glow />
              </motion.div>
              <span className="text-base font-bold tracking-tight text-white">LLMAtlas</span>
            </Link>

            {/* vertical rule */}
            <div className="hidden sm:block h-8 w-px bg-white/[0.08]" />

            <p className="hidden sm:block text-[11.5px] text-white/38 max-w-[200px] leading-relaxed">
              Open-source workspace for the entire LLM lifecycle.
            </p>
          </div>

          {/* newsletter */}
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="hidden md:block text-right flex-shrink-0">
              <p className="text-xs font-semibold text-white/80 leading-none mb-0.5">Stay current</p>
              <p className="text-[10.5px] text-white/30">No spam. Unsubscribe anytime.</p>
            </div>

            <AnimatePresence mode="wait">
              {!subscribed ? (
                <motion.form
                  key="form"
                  onSubmit={(e) => { e.preventDefault(); if (email.trim()) setSubscribed(true); }}
                  className="flex gap-1.5 w-full sm:w-auto"
                  initial={{ opacity: 0, x: 8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -8 }}
                  transition={{ duration: 0.22 }}
                >
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@email.com"
                    className="h-8 px-3 rounded-lg flex-1 sm:w-48 text-[11.5px]
                               bg-white/[0.06] border border-white/10 text-white
                               placeholder:text-white/22
                               focus:outline-none focus:border-blue-500/45 focus:bg-white/[0.09]
                               transition-all duration-200"
                  />
                  <motion.button
                    type="submit"
                    className="h-8 px-3.5 rounded-lg text-[11.5px] font-semibold text-white
                               flex items-center gap-1.5 whitespace-nowrap flex-shrink-0"
                    style={{ background: "linear-gradient(135deg,hsl(239 84% 67%),hsl(271 91% 65%))" }}
                    whileHover={{ scale: 1.04, boxShadow: "0 0 18px hsl(252 90% 66%/0.4)" }}
                    whileTap={{ scale: 0.96 }}
                  >
                    <Send className="h-2.5 w-2.5" />
                    Subscribe
                  </motion.button>
                </motion.form>
              ) : (
                <motion.div
                  key="ok"
                  className="flex items-center gap-1.5 h-8 px-3.5 rounded-lg border text-[11.5px] font-medium"
                  style={{
                    background: "hsl(142 76% 36%/0.12)",
                    borderColor: "hsl(142 76% 36%/0.3)",
                    color: "hsl(142 76% 55%)",
                  }}
                  initial={{ opacity: 0, scale: 0.88 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.28, ease: [0.34, 1.56, 0.64, 1] }}
                >
                  <Check className="h-3 w-3" />
                  You&apos;re in!
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>

        {/* ════ band 2 — nav columns ════════════════════════════════════ */}
        <motion.div
          className="py-8 border-b border-white/[0.06]
                     grid grid-cols-2 md:grid-cols-[1fr_1fr_1.6fr_1fr] gap-x-6 gap-y-7"
          variants={colStagger}
          initial="hidden"
          animate={inView ? "show" : "hidden"}
        >
          {COLS.map((col) => (
            <motion.div key={col.heading} variants={colItem}>
              <p className="text-[9.5px] font-bold uppercase tracking-[0.22em] text-white/24 mb-3">
                {col.heading}
              </p>

              {/* providers → 2-col inner grid to stay compact */}
              <ul className={
                col.wide
                  ? "grid grid-cols-2 gap-x-4 gap-y-[5px]"
                  : "flex flex-col gap-[5px]"
              }>
                {col.links.map((link) => (
                  <li key={link.label}>
                    <NavLink
                      href={link.href}
                      label={link.label}
                      external={"external" in link ? link.external : undefined}
                    />
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </motion.div>

        {/* ════ band 3 — bottom bar ════════════════════════════════════ */}
        <motion.div
          className="py-4 flex flex-col sm:flex-row items-center justify-between gap-3"
          initial={{ opacity: 0 }}
          animate={inView ? { opacity: 1 } : {}}
          transition={{ delay: 0.38, duration: 0.5 }}
        >
          {/* left: socials + stats pills */}
          <div className="flex items-center gap-3 flex-wrap justify-center sm:justify-start">
            {/* social icons */}
            <div className="flex items-center gap-1.5">
              {SOCIALS.map(({ href, Icon, label, cls }) => (
                <motion.div key={label} whileHover={{ scale: 1.14, y: -1 }} whileTap={{ scale: 0.93 }}>
                  <Link
                    href={href}
                    target={href.startsWith("http") ? "_blank" : undefined}
                    rel={href.startsWith("http") ? "noreferrer" : undefined}
                    aria-label={label}
                    className={`h-6 w-6 rounded-md border border-white/10 flex items-center justify-center
                                text-white/28 transition-all duration-200 ${cls}`}
                  >
                    <Icon className="h-3 w-3" />
                  </Link>
                </motion.div>
              ))}
            </div>

            {/* divider */}
            <span className="h-3.5 w-px bg-white/[0.1]" />

            {/* stats pills */}
            <div className="flex items-center gap-2.5">
              {STATS.map(({ value, label, g }, i) => (
                <span key={label} className="flex items-center gap-1.5">
                  {i > 0 && <span className="text-white/[0.08] text-[10px]">·</span>}
                  <span className={`text-[10.5px] font-semibold bg-gradient-to-r ${g} bg-clip-text text-transparent`}>
                    {value}
                  </span>
                  <span className="text-[10px] text-white/28">{label}</span>
                </span>
              ))}
            </div>
          </div>

          {/* right: copyright + stack */}
          <div className="flex items-center gap-2 text-[10.5px] text-white/22 flex-wrap justify-center">
            <span className="flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              MIT
            </span>
            <span className="text-white/[0.1]">·</span>
            <span>© {new Date().getFullYear()} LLMAtlas</span>
            <span className="text-white/[0.1]">·</span>
            <span>Next.js 15 · Tailwind · Vercel</span>
          </div>
        </motion.div>

      </div>

      {/* bottom glow line */}
      <div
        className="absolute bottom-0 inset-x-0 h-px"
        style={{
          background: "linear-gradient(90deg,transparent,hsl(217 91% 60%/0.22) 30%,hsl(258 90% 66%/0.22) 70%,transparent)",
        }}
      />
    </footer>
  );
}
