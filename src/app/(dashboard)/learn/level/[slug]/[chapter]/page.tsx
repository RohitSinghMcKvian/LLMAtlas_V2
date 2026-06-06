"use client";

import { use } from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { getChapter, getNextChapter, getPreviousChapter } from "@/lib/curriculum";
import { ChapterReader } from "@/components/learn/ChapterReader";
import { Quiz } from "@/components/learn/Quiz";
import { CertificateModal } from "@/components/learn/CertificateModal";
import { NamePromptDialog } from "@/components/learn/NamePromptDialog";
import { useCertificateFlow } from "@/components/learn/useCertificateFlow";
import { Button } from "@/components/ui/button";

interface PageProps {
  params: Promise<{ slug: string; chapter: string }>;
}

export default function ChapterPage({ params }: PageProps) {
  const { slug: levelSlug, chapter: chapterSlug } = use(params);

  const info = getChapter(levelSlug, chapterSlug);
  if (!info) {
    notFound();
  }

  const { level, chapter, chapterIndex } = info!;
  const prev = getPreviousChapter(levelSlug, chapterSlug);
  const next = getNextChapter(levelSlug, chapterSlug);
  const flow = useCertificateFlow();

  function handleQuizPass() {
    flow.handleChapterPassed(level);
  }

  function continueToNext() {
    if (next) {
      window.location.href = `/learn/level/${next.levelSlug}/${next.chapterSlug}`;
    } else {
      window.location.href = `/learn/level/${level.slug}`;
    }
  }

  return (
    <div className="min-h-screen">
      <ChapterReader
        level={level}
        chapter={chapter}
        prev={prev}
        next={next}
        chapterIndex={chapterIndex}
      />

      {/* Quiz */}
      <div className="mx-auto max-w-3xl px-4 pb-20">
        <Quiz
          level={level}
          chapter={chapter}
          onPass={handleQuizPass}
          onContinue={continueToNext}
        />

        {/* Final next/prev row */}
        <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
          {prev ? (
            <Button variant="outline" asChild size="lg">
              <Link href={`/learn/level/${prev.levelSlug}/${prev.chapterSlug}`}>
                <ChevronLeft className="h-4 w-4 mr-1" /> Previous chapter
              </Link>
            </Button>
          ) : (
            <Button variant="outline" asChild size="lg">
              <Link href={`/learn/level/${level.slug}`}>
                <ChevronLeft className="h-4 w-4 mr-1" /> Back to level
              </Link>
            </Button>
          )}
          {next && (
            <Button asChild size="lg" style={{ backgroundColor: level.color, color: "white" }}>
              <Link href={`/learn/level/${next.levelSlug}/${next.chapterSlug}`}>
                Next chapter <ChevronRight className="h-4 w-4 ml-1" />
              </Link>
            </Button>
          )}
        </div>
      </div>

      {/* Name prompt + certificate modal flow */}
      <NamePromptDialog open={flow.askForName} onSubmit={flow.handleNameSubmit} />
      <CertificateModal
        certificate={flow.pendingCertificate}
        learnerName={flow.learnerName}
        onClose={flow.handleModalClose}
      />
    </div>
  );
}
