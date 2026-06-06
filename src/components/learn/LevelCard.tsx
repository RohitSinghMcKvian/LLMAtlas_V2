"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import {
  Sparkles, MessageSquare, Network, Rocket, Crown, ArrowRight, Lock, Check, Clock,
  type LucideIcon,
} from "lucide-react";
import type { Level } from "@/lib/curriculum";
import { useLearnStore } from "@/lib/store";
import { Badge } from "@/components/ui/badge";

const ICONS: Record<string, LucideIcon> = {
  Sparkles, MessageSquare, Network, Rocket, Crown,
};

interface LevelCardProps {
  level: Level;
  locked?: boolean;
  index: number;
}

export function LevelCard({ level, locked, index }: LevelCardProps) {
  const quizPassed = useLearnStore((s) => s.quizPassed);
  const certificates = useLearnStore((s) => s.certificates);
  const done = level.chapters.filter((c) => quizPassed[c.slug] !== undefined).length;
  const total = level.chapters.length;
  const percent = (done / total) * 100;
  const isComplete = done === total;
  const earnedCert = certificates.some((c) => c.levelSlug === level.slug);

  const Icon = ICONS[level.icon] ?? Sparkles;
  const Wrapper = locked ? "div" : Link;
  const wrapperProps = locked ? { className: "block" } : { href: `/learn/level/${level.slug}`, className: "block" };

  const cta = isComplete ? "Review level" : done > 0 ? "Resume" : "Begin";

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.5, delay: index * 0.08 }}
    >
      {/* @ts-expect-error -- conditional element type */}
      <Wrapper {...wrapperProps}>
        <div
          className={`group relative overflow-hidden rounded-2xl border-2 bg-card p-6 transition-all ${
            locked
              ? "opacity-50 cursor-not-allowed border-muted"
              : "hover:shadow-xl hover:-translate-y-1 cursor-pointer"
          }`}
          style={{
            borderColor: locked ? undefined : level.color + "40",
          }}
        >
          {/* Hover glow background */}
          {!locked && (
            <div
              className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
              style={{
                background: `radial-gradient(ellipse at top right, ${level.color}20, transparent 60%)`,
              }}
            />
          )}

          <div className="relative">
            {/* Header */}
            <div className="flex items-start justify-between gap-3 mb-4">
              <div
                className="flex h-14 w-14 items-center justify-center rounded-2xl shadow-md"
                style={{
                  background: locked
                    ? "rgba(107, 114, 128, 0.1)"
                    : `linear-gradient(135deg, ${level.color}, ${level.gradient[1]})`,
                  color: locked ? "#6B7280" : "white",
                }}
              >
                {locked ? <Lock className="h-6 w-6" /> : <Icon className="h-7 w-7" />}
              </div>
              <div className="flex items-center gap-2">
                {earnedCert && (
                  <Badge
                    style={{
                      background: `linear-gradient(135deg, ${level.color}, ${level.gradient[1]})`,
                      color: "white",
                      border: "none",
                    }}
                  >
                    <Check className="h-3 w-3 mr-1" />
                    Certified
                  </Badge>
                )}
                <span
                  className="text-sm font-mono font-bold"
                  style={{ color: locked ? "#6B7280" : level.color }}
                >
                  Level {level.number}
                </span>
              </div>
            </div>

            {/* Title */}
            <h3 className="text-2xl font-bold mb-1">{level.title}</h3>
            <p className="text-sm font-medium mb-3" style={{ color: locked ? "#6B7280" : level.color }}>
              {level.tagline}
            </p>
            <p className="text-sm text-muted-foreground leading-relaxed mb-4 line-clamp-2">
              {level.description}
            </p>

            {/* Meta */}
            <div className="flex items-center gap-4 mb-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                ~{level.estimatedHours}h
              </span>
              <span>{total} chapters</span>
              <span>{level.chapters.reduce((s, c) => s + c.quiz.length, 0)} questions</span>
            </div>

            {/* Progress bar */}
            <div className="mb-4">
              <div className="flex justify-between text-xs mb-1.5">
                <span className="text-muted-foreground">Progress</span>
                <span className="font-semibold" style={{ color: locked ? "#6B7280" : level.color }}>
                  {done}/{total}
                </span>
              </div>
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <motion.div
                  className="h-full rounded-full"
                  initial={{ width: 0 }}
                  whileInView={{ width: `${percent}%` }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.8, delay: index * 0.1 }}
                  style={{
                    background: locked ? "#6B7280" : `linear-gradient(90deg, ${level.color}, ${level.gradient[1]})`,
                  }}
                />
              </div>
            </div>

            {/* CTA */}
            <div
              className="flex items-center gap-2 text-sm font-semibold group-hover:gap-3 transition-all"
              style={{ color: locked ? "#6B7280" : level.color }}
            >
              {locked ? "Complete previous level to unlock" : cta}
              {!locked && <ArrowRight className="h-4 w-4" />}
            </div>
          </div>
        </div>
      </Wrapper>
    </motion.div>
  );
}
