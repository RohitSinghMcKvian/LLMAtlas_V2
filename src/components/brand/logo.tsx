"use client";

/**
 * LLMAtlas brand logo — hexagon outline with amber → pink → violet → indigo
 * gradient stroke, matching the provided brand image.
 *
 * Exports
 *   HexMark   – the SVG hexagon icon alone (any size)
 *   BrandLogo – icon + "LLMAtlas" wordmark (optionally wrapped in a Link)
 */

import { useId } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

/* ── Brand gradient stops (bottom-left → top-right diagonal) ──────────── */
const STOPS = [
  { offset: "0%",   stopColor: "#FBBF24" }, // amber-400  — bottom-left
  { offset: "30%",  stopColor: "#E879B0" }, // rose-pink  — top-left arc
  { offset: "65%",  stopColor: "#A855F7" }, // purple-500 — top-right arc
  { offset: "100%", stopColor: "#6366F1" }, // indigo-500 — bottom-right
] as const;

/**
 * Flat-top regular hexagon centred at (50, 50) in a 100 × 100 viewBox.
 * Circumradius R = 43 px — enough margin for the 5.5 px stroke.
 *
 * Vertices (clockwise from upper-left, matches brand image orientation):
 *   UL (28.5, 12.8) · UR (71.5, 12.8) · R (93, 50)
 *   LR (71.5, 87.2) · LL (28.5, 87.2) · L (7, 50)
 */
const HEX_PATH =
  "M 28.5 12.8 L 71.5 12.8 L 93 50 L 71.5 87.2 L 28.5 87.2 L 7 50 Z";

/* ── HexMark ──────────────────────────────────────────────────────────── */

interface HexMarkProps {
  /**
   * Rendered width/height in px.
   * The SVG scales perfectly to any value (viewBox-based).
   * @default 36
   */
  size?: number;
  /** Extra className on the outer wrapper div. */
  className?: string;
  /**
   * Soft violet/indigo radial glow that pulses behind the mark.
   * Looks best on dark backgrounds (hero, footer, sidebar dark-mode).
   */
  glow?: boolean;
  /**
   * A bright shimmer segment that travels continuously around the hexagon
   * outline.  Adds visible motion to prominent logo placements.
   */
  shimmer?: boolean;
}

/**
 * Just the hexagon mark — no text.
 * Use wherever you need the icon on its own (nav, sidebar, favicon-style).
 */
export function HexMark({
  size = 36,
  className,
  glow = false,
  shimmer = false,
}: HexMarkProps) {
  /* useId gives a unique suffix per instance → safe multiple on one page */
  const uid = useId().replace(/:/g, "x");

  return (
    <div
      className={cn("relative flex-shrink-0 isolate", className)}
      style={{ width: size, height: size }}
    >
      {/* ── Pulsing ambient glow ────────────────────────────────────── */}
      {glow && (
        <motion.div
          aria-hidden
          className="absolute inset-0 pointer-events-none"
          style={{
            /* biased slightly toward amber bottom-left ↔ violet top-right */
            background:
              "radial-gradient(ellipse at 38% 64%, rgba(168,85,247,0.65) 0%, rgba(99,102,241,0.22) 48%, transparent 70%)",
            scale: 2.4,
            filter: `blur(${Math.max(4, Math.round(size * 0.15))}px)`,
            zIndex: -1,
          }}
          animate={{ opacity: [0.32, 0.82, 0.32] }}
          transition={{ duration: 2.9, repeat: Infinity, ease: "easeInOut" }}
        />
      )}

      {/* ── SVG hexagon ─────────────────────────────────────────────── */}
      <svg
        width={size}
        height={size}
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden
        focusable="false"
      >
        <defs>
          <linearGradient
            id={`hg-${uid}`}
            x1="7"
            y1="87"
            x2="90"
            y2="10"
            gradientUnits="userSpaceOnUse"
          >
            {STOPS.map((s) => (
              <stop key={s.offset} offset={s.offset} stopColor={s.stopColor} />
            ))}
          </linearGradient>
        </defs>

        {/* Gradient-stroke hexagon (brand mark) */}
        <path
          d={HEX_PATH}
          stroke={`url(#hg-${uid})`}
          strokeWidth="5.5"
          strokeLinejoin="round"
          strokeLinecap="round"
          fill="none"
        />

        {/* Traveling shimmer — 7 % bright segment sweeps one full loop */}
        {shimmer && (
          <motion.path
            d={HEX_PATH}
            stroke="rgba(255,255,255,0.46)"
            strokeWidth="5.5"
            strokeLinejoin="round"
            strokeLinecap="round"
            fill="none"
            initial={{ pathOffset: 0, pathLength: 0.07 }}
            animate={{ pathOffset: [0, 1] }}
            transition={{ duration: 3.6, repeat: Infinity, ease: "linear" }}
          />
        )}
      </svg>
    </div>
  );
}

/* ── BrandLogo ────────────────────────────────────────────────────────── */

interface BrandLogoProps {
  /**
   * If provided, the whole lock-up is wrapped in a Next.js `<Link>`.
   * Pass `null` to suppress the link.
   * @default "/"
   */
  href?: string | null;
  /** Mark size in px. @default 36 */
  size?: number;
  /** Extra className on the outer element. */
  className?: string;
  /** Text className (the "LLMAtlas" span). */
  textClassName?: string;
  /** Show the wordmark next to the mark. @default true */
  showText?: boolean;
  /** Enable the pulsing glow on the mark. */
  glow?: boolean;
  /** Enable the traveling shimmer on the mark. */
  shimmer?: boolean;
}

/**
 * Full brand lock-up: hexagon mark + "LLMAtlas" wordmark.
 * Optionally wrapped in a Link.
 */
export function BrandLogo({
  href = "/",
  size = 36,
  className,
  textClassName,
  showText = true,
  glow = false,
  shimmer = false,
}: BrandLogoProps) {
  const inner = (
    <span className={cn("flex items-center gap-2.5", className)}>
      <HexMark size={size} glow={glow} shimmer={shimmer} />
      {showText && (
        <span
          className={cn(
            "font-semibold tracking-tight select-none",
            textClassName,
          )}
        >
          LLMAtlas
        </span>
      )}
    </span>
  );

  if (href) {
    return (
      <Link href={href} aria-label="LLMAtlas — go to home">
        {inner}
      </Link>
    );
  }
  return inner;
}
