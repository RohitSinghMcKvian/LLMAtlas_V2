"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Sparkles, ArrowRight, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";

/* ── Constants ──────────────────────────────────────────────────────────── */
const VIDEO_URL =
  "https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260328_065045_c44942da-53c6-4804-b734-f9e07fc22e08.mp4";

const LOGOS = [
  "Groq", "Google AI", "NVIDIA", "Mistral", "Together AI", "Cerebras",
  "OpenRouter", "xAI", "Cloudflare", "Hugging Face", "DeepSeek", "GitHub Models",
];

const LOGO_SLUGS: Record<string, string> = {
  "Groq": "GR", "Google AI": "GG", "NVIDIA": "NV", "Mistral": "MS",
  "Together AI": "TA", "Cerebras": "CB", "OpenRouter": "OR", "xAI": "xA",
  "Cloudflare": "CF", "Hugging Face": "HF", "DeepSeek": "DS", "GitHub Models": "GH",
};

/* ── Hero ──────────────────────────────────────────────────────────────── */
export function LandingHero() {
  const videoRef = useRef<HTMLVideoElement>(null);
  /* Decorative bg video shows on every device (incl. mobile). We only skip it
     when the user has explicitly opted into data-saving or reduced motion —
     respecting those preferences without hiding it from normal phone users.
     Starts false so SSR/first paint never ship the video, then enables on mount. */
  const [showVideo, setShowVideo] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const conn = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
    const evaluate = () => {
      const saveData = !!conn?.saveData;
      setShowVideo(!saveData && !mq.matches);
    };
    evaluate();
    mq.addEventListener?.("change", evaluate);
    return () => {
      mq.removeEventListener?.("change", evaluate);
    };
  }, []);

  /* Video fade-loop — requestAnimationFrame driven (only runs when the video
     is actually mounted) */
  useEffect(() => {
    if (!showVideo) return;
    const video = videoRef.current;
    if (!video) return;

    let raf: number;
    const FADE = 0.5; // seconds

    const tick = () => {
      const t   = video.currentTime;
      const dur = video.duration;
      if (!isNaN(dur) && dur > 0) {
        if (t < FADE) {
          video.style.opacity = String(Math.min(1, t / FADE));
        } else if (t > dur - FADE) {
          video.style.opacity = String(Math.max(0, (dur - t) / FADE));
        } else {
          video.style.opacity = "1";
        }
      }
      raf = requestAnimationFrame(tick);
    };

    const onPlay  = () => { raf = requestAnimationFrame(tick); };
    const onPause = () => { cancelAnimationFrame(raf); };
    const onEnded = () => {
      cancelAnimationFrame(raf);
      video.style.opacity = "0";
      setTimeout(() => {
        video.currentTime = 0;
        video.play().catch(() => {});
      }, 100);
    };

    video.addEventListener("play",   onPlay);
    video.addEventListener("pause",  onPause);
    video.addEventListener("ended",  onEnded);
    video.play().catch(() => {});

    return () => {
      cancelAnimationFrame(raf);
      video.removeEventListener("play",   onPlay);
      video.removeEventListener("pause",  onPause);
      video.removeEventListener("ended",  onEnded);
    };
  }, [showVideo]);

  /* The section's overflow-x is clipped so the decorative blob can never
     balloon the mobile layout viewport; overflow-y stays visible so nothing
     else changes. `clip` (unlike `hidden`) creates no scroll container, so the
     sticky nav and absolute children keep working. */
  return (
    <section
      className="relative min-h-screen flex flex-col"
      style={{ background: "hsl(260 87% 3%)", overflowX: "clip", overflowY: "visible" }}
    >
      {/* ── Background video (wrapper clips to section bounds) ─────────── */}
      {showVideo && (
      <div className="absolute inset-0 overflow-hidden">
        <video
          ref={videoRef}
          src={VIDEO_URL}
          muted
          playsInline
          preload="auto"
          className="absolute inset-0 w-full h-full object-cover"
          style={{ opacity: 0 }}
        />
      </div>
      )}

      {/* ── Blurred dark blob centred behind hero content ──────────────── */}
      <div
        aria-hidden
        className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
        style={{
          /* clamp to viewport so the glow never forces horizontal overflow;
             at desktop widths min() resolves to 984px → visually unchanged */
          width: "min(984px, 100vw)",
          height: "527px",
          opacity: 0.9,
          background: "#030712",
          filter: "blur(82px)",
          zIndex: 1,
        }}
      />

      {/* ── All visible content (z-10) ─────────────────────────────────── */}
      <div className="relative flex flex-col flex-1" style={{ zIndex: 10 }}>

        {/* ───────────────── Hero content (vertically centred) ─────────── */}
        {/* pt-[68px] offsets the fixed MainNav so content is never hidden beneath it */}
        <div className="flex-1 flex items-center justify-center px-4 sm:px-8 py-10 pt-[68px] text-center">
          <div className="w-full">

            {/* Live badge */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="inline-flex mb-5 sm:mb-6"
            >
              <span
                className="liquid-glass inline-flex items-center gap-2 rounded-full
                           px-4 py-1.5 text-xs font-medium"
                style={{ color: "hsl(40 6% 82%)" }}
              >
                <span className="relative flex h-2 w-2 flex-shrink-0">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                </span>
                195+ LLMs &nbsp;·&nbsp; DeepSeek V4 Pro, Claude Opus 4, Kimi K2.6, Qwen 3.6 &nbsp;·&nbsp; Free to start
              </span>
            </motion.div>

            {/* ── Giant headline "LLM Atlas" — letter-by-letter reveal ── */}
            <h1
              className="relative font-normal leading-[1.02] tracking-[-0.024em] select-none"
              style={{
                fontFamily: "'General Sans', system-ui, -apple-system, sans-serif",
                fontSize: "clamp(68px, 11vw, 185px)",
              }}
            >
              {/* ── "LLM" — animated gradient shimmer, letter-by-letter clip-rise ── */}
              <span
                style={{
                  /* Looping gradient: amber→pink→violet→indigo→violet→pink→amber */
                  backgroundImage:
                    "linear-gradient(to right, #FBBF24, #E879B0, #A855F7, #6366F1, #A855F7, #E879B0, #FBBF24)",
                  backgroundSize: "400% 100%",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                  /* CSS keyframe — cycles through the wider gradient endlessly */
                  animation: "gradient-x 5s ease infinite",
                }}
              >
                {(["L", "L", "M"] as const).map((char, i) => (
                  /* Overflow-hidden clip box: hides the letter until it rises in */
                  <span
                    key={i}
                    style={{
                      display: "inline-block",
                      overflow: "hidden",
                      verticalAlign: "bottom",
                      /* Extra height so descenders don't clip */
                      lineHeight: 1.08,
                    }}
                  >
                    <motion.span
                      style={{ display: "inline-block" }}
                      initial={{ y: "108%", opacity: 0 }}
                      animate={{ y: "0%",   opacity: 1 }}
                      transition={{
                        delay:    0.06 + i * 0.1,
                        duration: 0.72,
                        ease:     [0.16, 1, 0.3, 1],
                      }}
                    >
                      {char}
                    </motion.span>
                  </span>
                ))}
              </span>

              {/* Word gap */}
              <span aria-hidden style={{ display: "inline-block", width: "0.28em" }} />

              {/* ── "Atlas" — pure white, single-word blur+rise, delayed ── */}
              <span
                style={{
                  display: "inline-block",
                  overflow: "hidden",
                  verticalAlign: "bottom",
                  lineHeight: 1.08,
                }}
              >
                <motion.span
                  style={{
                    display: "inline-block",
                    color: "hsl(40 6% 96%)",
                  }}
                  initial={{ y: "108%", opacity: 0, filter: "blur(6px)" }}
                  animate={{ y: "0%",   opacity: 1, filter: "blur(0px)" }}
                  transition={{
                    delay:    0.38,
                    duration: 0.8,
                    ease:     [0.16, 1, 0.3, 1],
                  }}
                >
                  Atlas
                </motion.span>
              </span>
            </h1>

            {/* Subtitle */}
            <motion.p
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.18 }}
              className="text-lg leading-8 max-w-xl mx-auto mt-[9px]"
              style={{ color: "hsl(40 6% 82%)", opacity: 0.82 }}
            >
              One workspace. Every LLM. 195+ models across
              <br className="hidden sm:block" />
              {" "}Groq, DeepSeek, Google AI, NVIDIA, Mistral &amp; 8 more providers.
            </motion.p>

            {/* Primary CTA */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.28 }}
              className="mt-[25px] flex flex-col sm:flex-row items-center justify-center gap-3"
            >
              <Button
                variant="heroSecondary"
                className="rounded-full h-auto px-[29px] py-[18px] sm:py-[24px] text-sm sm:text-base font-medium"
                asChild
              >
                <Link href="/playground">
                  <Sparkles className="h-4 w-4" />
                  Open the Playground
                </Link>
              </Button>
              <Button
                variant="heroSecondary"
                className="rounded-full h-auto px-6 py-[14px] sm:py-[20px] text-sm font-medium"
                asChild
              >
                <Link href="#pricing">
                  <ArrowRight className="h-4 w-4" />
                  See plans
                </Link>
              </Button>
            </motion.div>

            {/* Secondary contact link */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.48 }}
              className="mt-5 flex items-center justify-center"
            >
              <Link
                href="/contact"
                className="group inline-flex items-center gap-1.5 text-sm transition-all duration-200"
                style={{ color: "hsl(40 6% 95% / 0.38)" }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = "hsl(40 6% 95% / 0.75)"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = "hsl(40 6% 95% / 0.38)"; }}
              >
                <Mail className="h-3.5 w-3.5" />
                Have questions?
                <span
                  className="font-semibold underline underline-offset-2"
                  style={{ color: "hsl(40 6% 95% / 0.55)" }}
                >
                  Talk to our team
                </span>
                <ArrowRight className="h-3 w-3 -translate-x-0.5 group-hover:translate-x-0.5 transition-transform duration-200" />
              </Link>
            </motion.div>
          </div>
        </div>

        {/* ───────────────── Logo marquee — pinned to bottom ───────────── */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.9, delay: 0.5 }}
          className="pb-10 px-4 sm:px-8"
        >
          <div className="max-w-5xl mx-auto flex items-center gap-8 sm:gap-12">

            {/* Left: static label */}
            <p
              className="hidden sm:block flex-shrink-0 text-sm leading-snug"
              style={{ color: "hsl(40 6% 95% / 0.45)" }}
            >
              Powered by the world&apos;s
              <br />
              leading AI providers
            </p>

            {/* Right: infinite scroll */}
            <div className="flex-1 overflow-hidden relative">
              {/* Left fade mask */}
              <div
                className="pointer-events-none absolute inset-y-0 left-0 w-10 sm:w-14"
                style={{
                  background:
                    "linear-gradient(to right, hsl(260 87% 3%), transparent)",
                  zIndex: 2,
                }}
              />
              {/* Right fade mask */}
              <div
                className="pointer-events-none absolute inset-y-0 right-0 w-10 sm:w-14"
                style={{
                  background:
                    "linear-gradient(to left, hsl(260 87% 3%), transparent)",
                  zIndex: 2,
                }}
              />

              {/* Scrolling track — logos duplicated for seamless loop */}
              <div
                className="flex items-center gap-16 whitespace-nowrap"
                style={{ animation: "marquee-hero 32s linear infinite" }}
              >
                {[...LOGOS, ...LOGOS].map((name, i) => (
                  <div key={i} className="flex items-center gap-3 flex-shrink-0">
                    <div
                      className="liquid-glass w-7 h-7 rounded-lg flex-shrink-0
                                 flex items-center justify-center text-[10px] font-bold tracking-wide"
                      style={{ color: "hsl(40 6% 95%)" }}
                    >
                      {LOGO_SLUGS[name] ?? name[0]}
                    </div>
                    <span
                      className="text-sm font-semibold"
                      style={{ color: "hsl(40 6% 95%)" }}
                    >
                      {name}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>

      </div>{/* /z-10 */}
    </section>
  );
}
