"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { LEVELS, type Level } from "@/lib/curriculum";
import { useLearnStore } from "@/lib/store";
import {
  Sparkles, MessageSquare, Network, Rocket, Crown,
  type LucideIcon,
} from "lucide-react";

const ICONS: Record<string, LucideIcon> = {
  Sparkles, MessageSquare, Network, Rocket, Crown,
};

interface RoadmapGraphProps {
  compact?: boolean;
}

export function RoadmapGraph({ compact = false }: RoadmapGraphProps) {
  const quizPassed = useLearnStore((s) => s.quizPassed);
  const certificates = useLearnStore((s) => s.certificates);

  // Compute level progress
  const levelInfo = LEVELS.map((level, i) => {
    const total = level.chapters.length;
    const done = level.chapters.filter((c) => quizPassed[c.slug] !== undefined).length;
    const isComplete = done === total;
    const hasPrevComplete = i === 0 || LEVELS[i - 1].chapters.every((c) => quizPassed[c.slug] !== undefined);
    const isUnlocked = i === 0 || hasPrevComplete;
    const earnedCert = certificates.some((c) => c.levelSlug === level.slug);
    return { level, done, total, isComplete, isUnlocked, earnedCert };
  });

  const height = compact ? 200 : 320;
  const positions = LEVELS.map((_, i) => {
    const xPercent = (i / (LEVELS.length - 1)) * 88 + 6;
    const yPercent = i % 2 === 0 ? 35 : 65;
    return { x: xPercent, y: yPercent };
  });

  return (
    <div className="relative w-full" style={{ minHeight: `${height}px` }}>
      {/* Connecting path */}
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
      >
        <motion.path
          initial={{ pathLength: 0 }}
          whileInView={{ pathLength: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 1.6, ease: "easeInOut" }}
          d={buildPath(positions)}
          fill="none"
          stroke="url(#roadmapGradient)"
          strokeWidth="0.4"
          strokeDasharray="2 1.5"
          strokeLinecap="round"
        />
        <defs>
          <linearGradient id="roadmapGradient" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#0EA5E9" />
            <stop offset="25%" stopColor="#8B5CF6" />
            <stop offset="50%" stopColor="#F59E0B" />
            <stop offset="75%" stopColor="#10B981" />
            <stop offset="100%" stopColor="#EF4444" />
          </linearGradient>
        </defs>
      </svg>

      {/* Nodes */}
      {levelInfo.map(({ level, done, total, isComplete, isUnlocked, earnedCert }, i) => {
        const pos = positions[i];
        const Icon = ICONS[level.icon] ?? Sparkles;
        const percent = (done / total) * 100;

        return (
          <Link
            key={level.slug}
            href={isUnlocked ? `/learn/level/${level.slug}` : "#"}
            className="absolute"
            style={{
              left: `${pos.x}%`,
              top: `${pos.y}%`,
              transform: "translate(-50%, -50%)",
              pointerEvents: isUnlocked ? "auto" : "none",
            }}
            aria-disabled={!isUnlocked}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.15, type: "spring", stiffness: 200 }}
              whileHover={isUnlocked ? { scale: 1.08 } : undefined}
              className="relative group"
            >
              {/* Outer ring (progress) */}
              <svg
                width={compact ? "76" : "104"}
                height={compact ? "76" : "104"}
                viewBox="0 0 100 100"
                className="absolute inset-0 -rotate-90"
              >
                <circle
                  cx="50" cy="50" r="44"
                  fill="none"
                  stroke="currentColor"
                  strokeOpacity={isUnlocked ? "0.15" : "0.08"}
                  strokeWidth="4"
                />
                {isUnlocked && (
                  <motion.circle
                    cx="50" cy="50" r="44"
                    fill="none"
                    stroke={level.color}
                    strokeWidth="4"
                    strokeLinecap="round"
                    strokeDasharray={2 * Math.PI * 44}
                    initial={{ strokeDashoffset: 2 * Math.PI * 44 }}
                    whileInView={{
                      strokeDashoffset: 2 * Math.PI * 44 - (percent / 100) * 2 * Math.PI * 44,
                    }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.15 + 0.3, duration: 0.8 }}
                  />
                )}
              </svg>

              {/* Inner circle */}
              <div
                className={`relative flex items-center justify-center rounded-full border-2 font-bold shadow-lg ${
                  compact ? "h-[76px] w-[76px]" : "h-[104px] w-[104px]"
                }`}
                style={{
                  backgroundColor: isUnlocked ? level.color + "20" : "#6B7280" + "15",
                  borderColor: isUnlocked ? level.color : "#6B7280" + "40",
                  color: isUnlocked ? level.color : "#6B7280",
                }}
              >
                <div className="text-center">
                  <Icon className={compact ? "h-5 w-5 mx-auto" : "h-7 w-7 mx-auto"} />
                  <div className={`mt-0.5 font-mono font-bold ${compact ? "text-[10px]" : "text-xs"}`}>
                    L{level.number}
                  </div>
                </div>

                {/* Pulse for unlocked-but-incomplete */}
                {isUnlocked && !isComplete && (
                  <motion.div
                    animate={{ scale: [1, 1.15, 1], opacity: [0.4, 0, 0.4] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="absolute inset-0 rounded-full border-2"
                    style={{ borderColor: level.color }}
                  />
                )}

                {/* Cert medallion */}
                {earnedCert && (
                  <div
                    className="absolute -top-1.5 -right-1.5 flex h-7 w-7 items-center justify-center rounded-full text-sm shadow-lg"
                    style={{
                      background: `linear-gradient(135deg, ${level.color}, ${level.gradient[1]})`,
                      color: "white",
                    }}
                    title="Certificate earned"
                  >
                    ✓
                  </div>
                )}
              </div>

              {/* Tooltip label below */}
              <div
                className={`absolute left-1/2 -translate-x-1/2 mt-3 text-center transition-opacity ${
                  compact ? "top-[76px] text-xs" : "top-[104px] text-sm"
                }`}
                style={{ minWidth: "120px" }}
              >
                <div className="font-bold" style={{ color: isUnlocked ? level.color : "#6B7280" }}>
                  {level.title}
                </div>
                <div className="text-[11px] text-muted-foreground mt-0.5">
                  {done}/{total} chapters
                </div>
              </div>
            </motion.div>
          </Link>
        );
      })}
    </div>
  );
}

function buildPath(positions: { x: number; y: number }[]): string {
  if (positions.length === 0) return "";
  let d = `M ${positions[0].x} ${positions[0].y}`;
  for (let i = 1; i < positions.length; i++) {
    const prev = positions[i - 1];
    const curr = positions[i];
    const mx = (prev.x + curr.x) / 2;
    d += ` Q ${mx} ${prev.y}, ${mx} ${(prev.y + curr.y) / 2}`;
    d += ` T ${curr.x} ${curr.y}`;
  }
  return d;
}
