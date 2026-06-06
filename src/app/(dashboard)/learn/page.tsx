"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  BookOpen, Map, ArrowRight, Sparkles, Rocket, Layers, CheckCircle2, Award,
  ChevronDown, GraduationCap, Trophy, Clock, Zap,
} from "lucide-react";
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LESSONS, PATHS } from "@/lib/learn-content";
import { LEVELS, totalChapters } from "@/lib/curriculum";
import { useProgressStore, useLearnStore } from "@/lib/store";
import { LevelCard } from "@/components/learn/LevelCard";
import { RoadmapGraph } from "@/components/learn/RoadmapGraph";
import { CertificateMedallion } from "@/components/learn/CertificateMedallion";
import { cn } from "@/lib/utils";

const iconMap: Record<string, typeof Sparkles> = {
  Sparkles, Rocket, Layers,
};

const LEVEL_COLOR: Record<string, string> = {
  Beginner: "success",
  Intermediate: "default",
  Advanced: "warning",
};

export default function LearnPage() {
  const completed = useProgressStore((s) => s.completed);
  const quizPassed = useLearnStore((s) => s.quizPassed);
  const certificates = useLearnStore((s) => s.certificates);
  const isCurriculumComplete = useLearnStore((s) => s.isCurriculumComplete);

  const completedCount = Object.keys(completed).length;
  const chaptersDone = Object.keys(quizPassed).length;
  const overallPercent = (chaptersDone / totalChapters()) * 100;

  const [quickLessonsOpen, setQuickLessonsOpen] = useState(false);

  // Determine which level cards should be unlocked
  const unlockedSet = new Set<string>();
  unlockedSet.add(LEVELS[0].slug); // L1 always unlocked
  for (let i = 0; i < LEVELS.length - 1; i++) {
    if (LEVELS[i].chapters.every((c) => quizPassed[c.slug])) {
      unlockedSet.add(LEVELS[i + 1].slug);
    }
  }

  return (
    <div className="container max-w-7xl py-10">
      {/* Hero */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mb-12 relative overflow-hidden rounded-3xl border bg-card p-8 md:p-12"
      >
        <div
          className="absolute inset-0 opacity-30 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse at top right, #8B5CF640 0%, transparent 50%), radial-gradient(ellipse at bottom left, #0EA5E940 0%, transparent 50%)",
          }}
        />
        <div className="relative flex flex-wrap items-start gap-8">
          <div className="flex-1 min-w-[280px]">
            <div className="inline-flex items-center gap-2 mb-3">
              <GraduationCap className="h-5 w-5 text-primary" />
              <span className="text-xs font-semibold text-primary uppercase tracking-wider">
                The world&apos;s open LLM curriculum
              </span>
            </div>
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight">
              Master the AI &<br />
              <span className="gradient-text-blue">LLM ecosystem.</span>
            </h1>
            <p className="mt-4 text-lg text-muted-foreground max-w-2xl leading-relaxed">
              5 levels · 25 chapters · 100+ quiz questions · 6 certificates.
              From &quot;what is an LLM&quot; to shipping production AI — all free, forever.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Button asChild size="lg" className="bg-gradient-to-r from-sky-500 to-violet-600 text-white font-semibold hover:opacity-90">
                <Link href={chaptersDone === 0 ? "/learn/level/foundations/what-is-an-llm" : "/learn/roadmap"}>
                  {chaptersDone === 0 ? (
                    <>
                      <Zap className="h-4 w-4 mr-2" />
                      Start with Level 1
                    </>
                  ) : (
                    <>
                      <Map className="h-4 w-4 mr-2" />
                      View the roadmap
                    </>
                  )}
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Link>
              </Button>
              {certificates.length > 0 && (
                <Button asChild size="lg" variant="outline">
                  <Link href="/learn/certificates">
                    <Award className="h-4 w-4 mr-2" />
                    {certificates.length} certificate{certificates.length !== 1 ? "s" : ""}
                  </Link>
                </Button>
              )}
            </div>
          </div>
          {/* Progress ring */}
          <div className="flex-shrink-0">
            <ProgressRing percent={overallPercent} chaptersDone={chaptersDone} />
          </div>
        </div>
      </motion.div>

      {/* Mastery banner */}
      {isCurriculumComplete() && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="mb-10 rounded-2xl border-2 p-6 text-center"
          style={{
            borderColor: "#D4AF37",
            background: "linear-gradient(135deg, #D4AF3720, #FFD70030)",
          }}
        >
          <div className="flex items-center justify-center gap-3 mb-2">
            <Award className="h-7 w-7 text-amber-500" />
            <p className="text-xl font-bold">LLMAtlas Certified AI Engineer</p>
          </div>
          <p className="text-sm text-muted-foreground">
            You&apos;ve completed every chapter. Your Master Certificate is ready.
          </p>
          <Button asChild size="lg" className="mt-4 bg-gradient-to-r from-amber-500 to-yellow-500 text-white">
            <Link href="/learn/certificates/master">View Master Certificate</Link>
          </Button>
        </motion.div>
      )}

      {/* Roadmap preview */}
      <section className="mb-16">
        <div className="flex items-end justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold">The Roadmap</h2>
            <p className="text-sm text-muted-foreground mt-1">Five levels, each unlocked by completing the last.</p>
          </div>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/learn/roadmap" className="flex items-center gap-1.5">
              Full roadmap <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>
        <div className="rounded-3xl border bg-card/40 p-6 md:p-10">
          <RoadmapGraph compact />
        </div>
      </section>

      {/* Level cards */}
      <section className="mb-16">
        <h2 className="text-2xl font-bold mb-6">All five levels</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {LEVELS.map((level, i) => (
            <LevelCard key={level.slug} level={level} locked={!unlockedSet.has(level.slug)} index={i} />
          ))}
        </div>
      </section>

      {/* Certificates strip */}
      <section className="mb-16">
        <div className="flex items-end justify-between mb-6">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Trophy className="h-6 w-6 text-amber-500" />
            Your certificates
          </h2>
          {certificates.length > 0 && (
            <Button variant="ghost" size="sm" asChild>
              <Link href="/learn/certificates" className="flex items-center gap-1.5">
                View all <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          )}
        </div>
        {certificates.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed p-10 text-center">
            <Trophy className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
            <p className="font-semibold mb-1">No certificates yet</p>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              Complete every chapter in a level (pass each quiz with ≥70%) to earn that level&apos;s certificate.
              Finish all 5 levels for your Master Certificate.
            </p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {certificates.slice(0, 6).map((cert, i) => (
              <CertificateMedallion key={cert.serial} certificate={cert} index={i} />
            ))}
          </div>
        )}
      </section>

      {/* Quick lessons (legacy lessons) */}
      <section>
        <button
          onClick={() => setQuickLessonsOpen(!quickLessonsOpen)}
          className="flex items-center gap-2 text-xl font-bold mb-4 hover:opacity-80 transition-opacity"
        >
          <BookOpen className="h-5 w-5 text-muted-foreground" />
          Quick Lessons Library
          <Badge variant="outline" className="ml-2 text-xs">
            {LESSONS.length} bonus lessons
          </Badge>
          <ChevronDown
            className={`h-4 w-4 text-muted-foreground transition-transform ${quickLessonsOpen ? "rotate-180" : ""}`}
          />
        </button>
        <p className="text-sm text-muted-foreground mb-4">
          Stand-alone bite-sized lessons. Great refreshers or to fill specific gaps without committing to a full level.
          {completedCount > 0 && (
            <span className="ml-1">
              You&apos;ve completed <span className="text-foreground font-semibold">{completedCount}</span>.
            </span>
          )}
        </p>

        {quickLessonsOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
          >
            {/* Paths */}
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                Guided paths
              </h3>
              <div className="grid md:grid-cols-3 gap-3">
                {PATHS.map((path, i) => {
                  const Icon = iconMap[path.icon] ?? Sparkles;
                  const pathDone = path.lessons.every((s) => completed[s]);
                  return (
                    <Link key={path.slug} href={`/learn/path/${path.slug}`}>
                      <Card className="hover:shadow-md transition-all cursor-pointer h-full">
                        <CardContent className="p-4 flex items-start gap-3">
                          <div
                            className="h-10 w-10 rounded-lg flex items-center justify-center text-white shadow flex-shrink-0"
                            style={{ backgroundColor: path.color }}
                          >
                            <Icon className="h-5 w-5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-sm">{path.title}</p>
                            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                              {path.lessons.length} lessons
                            </p>
                          </div>
                          {pathDone && <CheckCircle2 className="h-4 w-4 text-emerald-500" />}
                        </CardContent>
                      </Card>
                    </Link>
                  );
                })}
              </div>
            </div>

            {/* Lessons grid */}
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              All lessons
            </h3>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {LESSONS.map((lesson, i) => {
                const isDone = !!completed[lesson.slug];
                return (
                  <motion.div
                    key={lesson.slug}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(i * 0.03, 0.3) }}
                  >
                    <Link href={`/learn/${lesson.slug}`}>
                      <Card
                        className={cn(
                          "h-full hover:shadow-md transition-all cursor-pointer",
                          isDone && "bg-emerald-500/5 border-emerald-500/20",
                        )}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between mb-2">
                            <Badge
                              variant={
                                LEVEL_COLOR[lesson.level] as "success" | "default" | "warning"
                              }
                              className="text-[10px]"
                            >
                              {lesson.level}
                            </Badge>
                            <div className="flex items-center gap-2">
                              {isDone && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />}
                              <span className="text-xs text-muted-foreground flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {lesson.minutes}m
                              </span>
                            </div>
                          </div>
                          <p className="font-semibold text-sm line-clamp-2">{lesson.title}</p>
                        </CardContent>
                      </Card>
                    </Link>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        )}
      </section>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
function ProgressRing({ percent, chaptersDone }: { percent: number; chaptersDone: number }) {
  const radius = 56;
  const circ = 2 * Math.PI * radius;
  return (
    <div className="relative" style={{ width: "144px", height: "144px" }}>
      <svg viewBox="0 0 144 144" className="absolute inset-0 -rotate-90">
        <circle cx="72" cy="72" r={radius} fill="none" stroke="currentColor" strokeOpacity="0.1" strokeWidth="8" />
        <motion.circle
          cx="72" cy="72" r={radius}
          fill="none"
          stroke="url(#progressGradient)"
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circ}
          initial={{ strokeDashoffset: circ }}
          animate={{ strokeDashoffset: circ - (percent / 100) * circ }}
          transition={{ duration: 1.2, ease: "easeOut" }}
        />
        <defs>
          <linearGradient id="progressGradient" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#0EA5E9" />
            <stop offset="50%" stopColor="#8B5CF6" />
            <stop offset="100%" stopColor="#F59E0B" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-bold">{Math.round(percent)}%</span>
        <span className="text-xs text-muted-foreground">{chaptersDone}/{totalChapters()} chapters</span>
      </div>
    </div>
  );
}
