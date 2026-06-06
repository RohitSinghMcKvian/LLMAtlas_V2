"use client";

import { use } from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Sparkles, MessageSquare, Network, Rocket, Crown, ArrowLeft, Clock, Check, Lock, ArrowRight, Trophy,
  type LucideIcon,
} from "lucide-react";
import { getLevel } from "@/lib/curriculum";
import { useLearnStore } from "@/lib/store";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const ICONS: Record<string, LucideIcon> = {
  Sparkles, MessageSquare, Network, Rocket, Crown,
};

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default function LevelPage({ params }: PageProps) {
  const { slug } = use(params);
  const level = getLevel(slug);
  if (!level) notFound();

  const quizPassed = useLearnStore((s) => s.quizPassed);
  const certificates = useLearnStore((s) => s.certificates);
  const done = level!.chapters.filter((c) => quizPassed[c.slug] !== undefined).length;
  const total = level!.chapters.length;
  const percent = (done / total) * 100;
  const earnedCert = certificates.find((c) => c.levelSlug === level!.slug);
  const Icon = ICONS[level!.icon] ?? Sparkles;

  return (
    <div className="container max-w-5xl py-10">
      {/* Back */}
      <Link
        href="/learn"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-8"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Learn hub
      </Link>

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mb-12 relative overflow-hidden rounded-3xl border p-8 md:p-10"
        style={{
          background: `radial-gradient(ellipse at top right, ${level!.color}22, transparent 60%), linear-gradient(135deg, var(--card), var(--card))`,
          borderColor: level!.color + "30",
        }}
      >
        <div className="flex flex-wrap items-start gap-6">
          {/* Icon */}
          <div
            className="flex h-20 w-20 items-center justify-center rounded-3xl shadow-lg flex-shrink-0"
            style={{
              background: `linear-gradient(135deg, ${level!.color}, ${level!.gradient[1]})`,
            }}
          >
            <Icon className="h-10 w-10 text-white" />
          </div>

          {/* Title block */}
          <div className="flex-1 min-w-[280px]">
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="outline" style={{ borderColor: level!.color, color: level!.color }}>
                Level {level!.number}
              </Badge>
              {earnedCert && (
                <Badge
                  style={{
                    background: `linear-gradient(135deg, ${level!.color}, ${level!.gradient[1]})`,
                    color: "white",
                    border: "none",
                  }}
                >
                  <Trophy className="h-3 w-3 mr-1" />
                  Certified
                </Badge>
              )}
            </div>
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight">{level!.title}</h1>
            <p className="mt-2 text-lg font-medium" style={{ color: level!.color }}>
              {level!.tagline}
            </p>
            <p className="mt-3 text-muted-foreground leading-relaxed max-w-2xl">
              {level!.description}
            </p>
            {/* Meta */}
            <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <Clock className="h-4 w-4" />
                ~{level!.estimatedHours} hours
              </span>
              <span>{total} chapters</span>
              <span>{level!.chapters.reduce((s, c) => s + c.quiz.length, 0)} quiz questions</span>
            </div>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-8">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-muted-foreground">Your progress</span>
            <span className="font-bold" style={{ color: level!.color }}>
              {done}/{total} · {Math.round(percent)}%
            </span>
          </div>
          <div className="h-3 rounded-full bg-muted overflow-hidden">
            <motion.div
              className="h-full rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${percent}%` }}
              transition={{ duration: 0.8 }}
              style={{
                background: `linear-gradient(90deg, ${level!.color}, ${level!.gradient[1]})`,
              }}
            />
          </div>
        </div>

        {/* Cert CTA */}
        {earnedCert && (
          <div className="mt-6">
            <Button asChild size="lg" style={{ backgroundColor: level!.color, color: "white" }}>
              <Link href={`/learn/certificates/${level!.slug}`}>
                <Trophy className="h-4 w-4 mr-2" />
                View certificate
              </Link>
            </Button>
          </div>
        )}
      </motion.div>

      {/* Chapter list */}
      <div className="space-y-3">
        <h2 className="text-2xl font-bold mb-4">Chapters</h2>
        {level!.chapters.map((chapter, i) => {
          const isDone = quizPassed[chapter.slug] !== undefined;
          // a chapter is unlocked if the previous chapter is done OR it's the first
          const prevDone = i === 0 || quizPassed[level!.chapters[i - 1].slug] !== undefined;
          const isLocked = !prevDone && !isDone;
          return (
            <motion.div
              key={chapter.slug}
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <Link
                href={isLocked ? "#" : `/learn/level/${level!.slug}/${chapter.slug}`}
                className={`block rounded-xl border-2 p-5 transition-all ${
                  isLocked
                    ? "opacity-50 cursor-not-allowed"
                    : "hover:shadow-md hover:border-current group"
                }`}
                style={{
                  borderColor: isDone ? level!.color : undefined,
                  backgroundColor: isDone ? level!.color + "08" : undefined,
                }}
                aria-disabled={isLocked}
              >
                <div className="flex items-center gap-4">
                  {/* Step number / status */}
                  <div
                    className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full border-2 font-bold ${
                      isDone
                        ? "text-white border-transparent"
                        : isLocked
                          ? "text-muted-foreground/40"
                          : "text-foreground"
                    }`}
                    style={{
                      backgroundColor: isDone ? level!.color : undefined,
                      borderColor: !isDone && !isLocked ? level!.color : undefined,
                      color: !isDone && !isLocked ? level!.color : undefined,
                    }}
                  >
                    {isDone ? (
                      <Check className="h-6 w-6" />
                    ) : isLocked ? (
                      <Lock className="h-5 w-5" />
                    ) : (
                      <span>{i + 1}</span>
                    )}
                  </div>

                  {/* Title */}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-lg leading-tight">{chapter.title}</h3>
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-1">
                      {chapter.summary}
                    </p>
                    <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {chapter.minutes} min
                      </span>
                      <span>{chapter.quiz.length} questions</span>
                    </div>
                  </div>

                  {/* Right arrow */}
                  {!isLocked && (
                    <ArrowRight
                      className="h-5 w-5 opacity-40 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all"
                      style={{ color: level!.color }}
                    />
                  )}
                </div>
              </Link>
            </motion.div>
          );
        })}
      </div>

      {/* Bottom CTA: completion */}
      {done === total && !earnedCert && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-10 rounded-2xl border-2 p-8 text-center"
          style={{
            borderColor: level!.color,
            background: `linear-gradient(135deg, ${level!.color}15, ${level!.gradient[1]}15)`,
          }}
        >
          <p className="text-xl font-bold">You finished {level!.title}!</p>
          <p className="text-muted-foreground mt-2">Your certificate will be issued automatically.</p>
        </motion.div>
      )}
    </div>
  );
}
