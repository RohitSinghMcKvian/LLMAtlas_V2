"use client";

import { motion, useInView, useMotionValue, useTransform, animate } from "framer-motion";
import { useEffect, useRef } from "react";

interface Stat {
  value: number;
  suffix: string;
  label: string;
  prefix?: string;
  sublabel?: string;
}

const STATS: Stat[] = [
  { value: 197, suffix: "+",   label: "AI models · 149+ free, Claude, GPT-5, DeepSeek, Kimi — keyless",  sublabel: "across 13 providers"  },
  { value: 13,  suffix: "",    label: "API providers integrated", sublabel: "DeepSeek, GitHub Models, Groq, NVIDIA, Kimi, MiniMax…" },
  { value: 0,   prefix: "$",  suffix: "/mo", label: "to start, forever", sublabel: "No credit card"  },
  { value: 100, suffix: "%",   label: "Open-source codebase",   sublabel: "MIT licensed, self-hostable" },
];

function Counter({
  value,
  prefix = "",
  suffix = "",
}: {
  value: number;
  prefix?: string;
  suffix?: string;
}) {
  const ref       = useRef<HTMLSpanElement>(null);
  const inView    = useInView(ref, { once: true });
  const motionVal = useMotionValue(0);
  const rounded   = useTransform(motionVal, (v) => Math.round(v));

  useEffect(() => {
    if (inView) {
      const ctrl = animate(motionVal, value, { duration: 1.6, ease: "easeOut" });
      return ctrl.stop;
    }
  }, [inView, value, motionVal]);

  useEffect(() =>
    rounded.on("change", (v) => {
      if (ref.current) ref.current.textContent = `${prefix}${v}${suffix}`;
    }),
    [rounded, prefix, suffix],
  );

  return <span ref={ref}>{prefix}0{suffix}</span>;
}

export function LandingStats() {
  return (
    <section className="py-16 border-y bg-card/30 dark:bg-card/20">
      <div className="container">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12">
          {STATS.map((s, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, scale: 0.88 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="text-center"
            >
              <div className="text-4xl md:text-5xl font-bold tracking-tight gradient-text-blue">
                <Counter value={s.value} prefix={s.prefix} suffix={s.suffix} />
              </div>
              <p className="text-sm font-semibold mt-2">{s.label}</p>
              {s.sublabel && (
                <p className="text-xs text-muted-foreground mt-0.5">{s.sublabel}</p>
              )}
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
