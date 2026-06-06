"use client";

import { use } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowLeft, ArrowRight, CheckCircle2, Sparkles, Rocket, Layers, Clock,
} from "lucide-react";
import { notFound } from "next/navigation";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getPath, getLesson } from "@/lib/learn-content";
import { useProgressStore } from "@/lib/store";
import { cn } from "@/lib/utils";

const iconMap: Record<string, typeof Sparkles> = { Sparkles, Rocket, Layers };

export default function PathPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const path = getPath(slug);
  const completed = useProgressStore((s) => s.completed);

  if (!path) notFound();

  const Icon = iconMap[path.icon] ?? Sparkles;
  const doneCount = path.lessons.filter((l) => completed[l]).length;
  const pct = Math.round((doneCount / path.lessons.length) * 100);

  return (
    <div className="container max-w-3xl py-8">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <Link href="/learn" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Learn
        </Link>

        <Card className="mb-6 overflow-hidden">
          <div className="h-2" style={{ backgroundColor: path.color }} />
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div
                className="h-14 w-14 rounded-xl flex items-center justify-center text-white shadow-lg flex-shrink-0"
                style={{ backgroundColor: path.color }}
              >
                <Icon className="h-7 w-7" />
              </div>
              <div className="flex-1">
                <h1 className="text-2xl md:text-3xl font-bold mb-1">{path.title}</h1>
                <p className="text-muted-foreground">{path.description}</p>
                <div className="mt-4">
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="text-muted-foreground">
                      Progress: {doneCount}/{path.lessons.length} lessons
                    </span>
                    <span className="font-semibold">{pct}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <motion.div
                      className="h-full"
                      style={{ backgroundColor: path.color }}
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ duration: 0.6, ease: "easeOut" }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <div className="space-y-3">
        {path.lessons.map((lessonSlug, i) => {
          const lesson = getLesson(lessonSlug);
          if (!lesson) return null;
          const isDone = !!completed[lessonSlug];
          return (
            <motion.div
              key={lessonSlug}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: i * 0.05 }}
            >
              <Link href={`/learn/${lessonSlug}`}>
                <Card className={cn(
                  "hover:shadow-md hover:border-primary/30 transition-all cursor-pointer",
                  isDone && "bg-emerald-500/5 border-emerald-500/20",
                )}>
                  <CardContent className="p-4 flex items-center gap-4">
                    <div className={cn(
                      "h-10 w-10 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 border-2",
                      isDone
                        ? "bg-emerald-500 border-emerald-500 text-white"
                        : "bg-background border-border",
                    )}>
                      {isDone ? <CheckCircle2 className="h-5 w-5" /> : i + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-sm truncate">{lesson.title}</h3>
                        <Badge variant="outline" className="text-[10px] flex-shrink-0">{lesson.level}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-1">{lesson.summary}</p>
                    </div>
                    <div className="text-xs text-muted-foreground flex items-center gap-1 flex-shrink-0">
                      <Clock className="h-3 w-3" />{lesson.minutes}m
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  </CardContent>
                </Card>
              </Link>
            </motion.div>
          );
        })}
      </div>

      {pct === 100 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="mt-8 p-6 rounded-xl bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border-2 border-emerald-500/30 text-center"
        >
          <div className="text-4xl mb-2">🎉</div>
          <h2 className="text-xl font-bold mb-1">Path complete!</h2>
          <p className="text-sm text-muted-foreground mb-4">
            You've finished the {path.title} path. Take what you've learned into the Playground.
          </p>
          <Button asChild variant="gradient">
            <Link href="/playground">
              Open Playground
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </motion.div>
      )}
    </div>
  );
}
