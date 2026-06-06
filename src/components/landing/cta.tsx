"use client";

import { motion, useInView, useMotionValue, useSpring, useTransform } from "framer-motion";
import Link from "next/link";
import { ArrowRight, Sparkles, Database, Zap, CheckCircle2, Github, ShieldCheck, BookOpen } from "lucide-react";
import { useRef, useEffect } from "react";

/* ── brand palette (matches the hero gradient) ──────────────────────── */
const AMBER   = "#FBBF24";
const PINK    = "#E879B0";
const VIOLET  = "#A855F7";
const INDIGO  = "#6366F1";
const BRAND_GRADIENT = `linear-gradient(135deg, ${AMBER} 0%, ${PINK} 30%, ${VIOLET} 65%, ${INDIGO} 100%)`;

/* ── animated count-up number ────────────────────────────────────────── */
function Counter({ to, suffix = "" }: { to: number; suffix?: string }) {
  const ref  = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  const val    = useMotionValue(0);
  const spring = useSpring(val, { stiffness: 55, damping: 18 });
  const display = useTransform(spring, (n) => `${Math.round(n)}${suffix}`);
  useEffect(() => { if (inView) val.set(to); }, [inView, val, to]);
  return <motion.span ref={ref}>{display}</motion.span>;
}

/* ── floating glow orb ───────────────────────────────────────────────── */
function Orb({
  size, color, style, dur = 10, delay = 0,
}: {
  size: number; color: string;
  style?: React.CSSProperties;
  dur?: number; delay?: number;
}) {
  return (
    <motion.div
      aria-hidden
      animate={{ y: [0, -26, 0], x: [0, 14, 0], scale: [1, 1.08, 1] }}
      transition={{ duration: dur, repeat: Infinity, ease: "easeInOut", delay }}
      className="absolute rounded-full pointer-events-none"
      style={{
        width: size, height: size,
        background: color,
        filter: `blur(${Math.round(size * 0.55)}px)`,
        ...style,
      }}
    />
  );
}

/* ── stat pill ────────────────────────────────────────────────────────── */
const STATS = [
  { label: "AI Models",     to: 197, suffix: "+", accent: AMBER,  Icon: Database    },
  { label: "API Providers", to: 13,  suffix: "",  accent: VIOLET, Icon: Zap         },
  { label: "$/mo to start", to: 0,   suffix: "",  accent: PINK,   Icon: CheckCircle2 },
];

/* ── trust badges ─────────────────────────────────────────────────────── */
const TRUST = [
  { label: "MIT licensed",   color: AMBER  },
  { label: "Open source",    color: PINK   },
  { label: "No credit card", color: VIOLET },
  { label: "Self-hostable",  color: INDIGO },
];

/* ── animation variants ──────────────────────────────────────────────── */
const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.09, delayChildren: 0.12 } },
};
const fadeUp = {
  hidden: { opacity: 0, y: 18 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.52, ease: [0.25, 0.1, 0.25, 1] } },
};

/* ══════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════════════════════════════════════ */
export function LandingCTA() {
  const ref    = useRef<HTMLElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.15 });

  return (
    <section ref={ref} className="py-24 px-4 sm:px-6">

      <motion.div
        initial={{ opacity: 0, y: 36, scale: 0.97 }}
        animate={inView ? { opacity: 1, y: 0, scale: 1 } : {}}
        transition={{ duration: 0.75, ease: [0.16, 1, 0.3, 1] }}
        className="relative max-w-[1120px] mx-auto overflow-hidden rounded-3xl
                   border border-slate-200/80 dark:border-white/[0.06]
                   bg-white dark:bg-[#07050f]
                   shadow-2xl shadow-violet-500/5 dark:shadow-violet-500/10"
      >

        {/* ── rainbow top shimmer border ──────────────────────────────── */}
        <div
          aria-hidden
          className="absolute top-0 inset-x-0 h-[2px] z-10"
          style={{ background: `linear-gradient(90deg, transparent 0%, ${AMBER} 18%, ${PINK} 38%, ${VIOLET} 62%, ${INDIGO} 82%, transparent 100%)` }}
        />

        {/* ── dot-grid overlay ──────────────────────────────────────────── */}
        <div
          aria-hidden
          className="absolute inset-0 opacity-[0.025] dark:opacity-[0.055]"
          style={{
            backgroundImage: `radial-gradient(circle, hsl(258 90% 66%) 1px, transparent 1px)`,
            backgroundSize: "28px 28px",
          }}
        />

        {/* ── decorative orbs ───────────────────────────────────────────── */}
        <Orb size={500} color={`radial-gradient(circle, ${AMBER}28 0%, transparent 70%)`}
          style={{ top: -160, left: -120 }} dur={14} delay={0} />
        <Orb size={440} color={`radial-gradient(circle, ${VIOLET}2e 0%, transparent 70%)`}
          style={{ top: -100, right: -80 }} dur={11} delay={2} />
        <Orb size={380} color={`radial-gradient(circle, ${PINK}26 0%, transparent 70%)`}
          style={{ bottom: -80, left: "18%" }} dur={9} delay={4} />
        <Orb size={320} color={`radial-gradient(circle, ${INDIGO}2a 0%, transparent 70%)`}
          style={{ bottom: -100, right: "8%" }} dur={13} delay={1.5} />

        {/* ── aurora center glow ────────────────────────────────────────── */}
        <div
          aria-hidden
          className="absolute inset-0 opacity-0 dark:opacity-100 pointer-events-none"
          style={{
            background: `radial-gradient(ellipse 80% 60% at 50% 50%, ${VIOLET}12 0%, transparent 65%)`,
          }}
        />

        {/* ════════════════ CONTENT ════════════════ */}
        <div className="relative z-10 px-8 py-14 md:px-16 md:py-20 lg:px-24 text-center">

          {/* ── live badge ──────────────────────────────────────────────── */}
          <motion.div
            initial={{ opacity: 0, scale: 0.88 }}
            animate={inView ? { opacity: 1, scale: 1 } : {}}
            transition={{ delay: 0.08, duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
            className="inline-flex mb-7"
          >
            <span
              className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-semibold
                         border border-slate-200 dark:border-white/10
                         bg-slate-50/80 dark:bg-white/[0.04]
                         text-slate-600 dark:text-white/60
                         backdrop-blur-sm select-none"
            >
              <span className="relative flex h-2 w-2 flex-shrink-0">
                <span className="absolute inset-0 animate-ping rounded-full bg-emerald-400 opacity-70" />
                <span className="relative h-2 w-2 rounded-full bg-emerald-500" />
              </span>
              195+ models live · Free forever
            </span>
          </motion.div>

          {/* ── headline ────────────────────────────────────────────────── */}
          <motion.div
            variants={stagger}
            initial="hidden"
            animate={inView ? "show" : "hidden"}
            className="mb-5"
          >
            <motion.h2
              variants={fadeUp}
              className="text-4xl xs:text-5xl md:text-6xl lg:text-7xl font-bold tracking-[-0.022em]
                         text-slate-900 dark:text-white leading-[1.04]"
              style={{ fontFamily: "'General Sans', system-ui, sans-serif" }}
            >
              Build with every LLM.
            </motion.h2>

            {/* gradient second line */}
            <motion.h2
              variants={fadeUp}
              className="text-4xl xs:text-5xl md:text-6xl lg:text-7xl font-bold tracking-[-0.022em] leading-[1.04]"
              style={{
                fontFamily: "'General Sans', system-ui, sans-serif",
                backgroundImage: BRAND_GRADIENT,
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              One workspace.
            </motion.h2>
          </motion.div>

          {/* ── subtitle ────────────────────────────────────────────────── */}
          <motion.p
            initial={{ opacity: 0, y: 14 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: 0.32, duration: 0.52 }}
            className="text-base md:text-lg text-slate-500 dark:text-white/55 max-w-xl mx-auto mb-10 leading-relaxed"
          >
            No setup. No tracking. No vendor lock-in.
            Free models first — from first prompt to production.
          </motion.p>

          {/* ── stat cards ──────────────────────────────────────────────── */}
          <motion.div
            variants={stagger}
            initial="hidden"
            animate={inView ? "show" : "hidden"}
            className="grid grid-cols-3 gap-3 max-w-md mx-auto mb-10"
          >
            {STATS.map((s) => (
              <motion.div
                key={s.label}
                variants={fadeUp}
                whileHover={{ scale: 1.05, y: -2 }}
                transition={{ type: "spring", stiffness: 380, damping: 22 }}
                className="relative rounded-2xl overflow-hidden
                           bg-slate-50/80 dark:bg-white/[0.03]
                           border border-slate-200/70 dark:border-white/[0.07]
                           px-3 py-4 text-center cursor-default group"
              >
                {/* accent top line */}
                <motion.div
                  className="absolute top-0 inset-x-0 h-[2px]"
                  style={{ background: `linear-gradient(90deg, transparent, ${s.accent}, transparent)` }}
                  initial={{ scaleX: 0 }}
                  animate={inView ? { scaleX: 1 } : {}}
                  transition={{ delay: 0.6, duration: 0.55 }}
                />
                {/* hover glow */}
                <div
                  className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                  style={{ background: `radial-gradient(circle at 50% 0%, ${s.accent}18 0%, transparent 65%)` }}
                />
                <div
                  className="text-2xl font-bold tracking-tight mb-0.5 relative z-10"
                  style={{ color: s.accent }}
                >
                  {s.to === 0
                    ? <span>$<span className="text-2xl">0</span><span className="text-sm font-medium">/mo</span></span>
                    : <Counter to={s.to} suffix={s.suffix} />
                  }
                </div>
                <div className="text-[10.5px] text-slate-500 dark:text-white/40 font-medium leading-tight relative z-10">
                  {s.label}
                </div>
              </motion.div>
            ))}
          </motion.div>

          {/* ── CTA buttons ─────────────────────────────────────────────── */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: 0.48, duration: 0.52 }}
            className="flex flex-col xs:flex-row gap-3 justify-center items-center mb-9"
          >

            {/* PRIMARY — brand gradient with shimmer + glow */}
            <motion.div
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.97 }}
              className="relative group w-full xs:w-auto"
            >
              {/* glow halo */}
              <div
                className="absolute -inset-1 rounded-full opacity-0 group-hover:opacity-70 transition-opacity duration-300 blur-md pointer-events-none"
                style={{ background: BRAND_GRADIENT }}
              />
              <Link
                href="/playground"
                className="relative flex items-center justify-center gap-2
                           px-7 py-3.5 text-sm font-semibold text-white rounded-full
                           overflow-hidden w-full xs:w-auto"
                style={{
                  background: BRAND_GRADIENT,
                  boxShadow: `0 4px 24px -4px ${VIOLET}55, inset 0 1px 0 rgba(255,255,255,0.18)`,
                }}
              >
                {/* shimmer sweep */}
                <motion.div
                  className="absolute inset-0"
                  style={{
                    background: "linear-gradient(105deg, transparent 35%, rgba(255,255,255,0.28) 50%, transparent 65%)",
                  }}
                  animate={{ x: ["-100%", "160%"] }}
                  transition={{ duration: 2.8, repeat: Infinity, ease: "linear", repeatDelay: 1.5 }}
                />
                <Sparkles className="h-4 w-4 relative z-10 flex-shrink-0" />
                <span className="relative z-10 whitespace-nowrap">Open the Playground</span>
                <ArrowRight className="h-4 w-4 relative z-10 flex-shrink-0 group-hover:translate-x-0.5 transition-transform duration-150" />
              </Link>
            </motion.div>

            {/* SECONDARY — glass */}
            <motion.div
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.97 }}
              className="w-full xs:w-auto"
            >
              <Link
                href="/learn"
                className="flex items-center justify-center gap-2 px-7 py-3.5 text-sm font-semibold rounded-full
                           border border-slate-300/70 dark:border-white/15
                           text-slate-700 dark:text-white/80
                           bg-white/90 dark:bg-white/[0.05]
                           hover:bg-slate-50 dark:hover:bg-white/[0.1]
                           hover:border-slate-400/50 dark:hover:border-white/30
                           transition-all duration-200 w-full xs:w-auto"
              >
                <BookOpen className="h-4 w-4 flex-shrink-0" />
                <span className="whitespace-nowrap">Browse the Learn hub</span>
                <ArrowRight className="h-4 w-4 flex-shrink-0" />
              </Link>
            </motion.div>
          </motion.div>

          {/* ── trust badges ────────────────────────────────────────────── */}
          <motion.div
            variants={stagger}
            initial="hidden"
            animate={inView ? "show" : "hidden"}
            className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2"
          >
            {TRUST.map((t) => (
              <motion.span
                key={t.label}
                variants={fadeUp}
                className="inline-flex items-center gap-1.5 text-xs text-slate-400 dark:text-white/35 select-none"
              >
                <span
                  className="h-1.5 w-1.5 rounded-full flex-shrink-0"
                  style={{ background: t.color, boxShadow: `0 0 6px ${t.color}` }}
                />
                {t.label}
              </motion.span>
            ))}
          </motion.div>

        </div>{/* /content */}

      </motion.div>
    </section>
  );
}
