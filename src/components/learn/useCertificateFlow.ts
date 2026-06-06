"use client";

import { useCallback, useState } from "react";
import type { EarnedCertificate, Level } from "@/lib/curriculum";
import { LEVELS } from "@/lib/curriculum";
import { useLearnStore } from "@/lib/store";
import { fireCelebration, fireMasterCelebration } from "./celebration";

/**
 * Orchestration hook used by chapter pages:
 *   const flow = useCertificateFlow();
 *   ...after quiz pass...
 *   flow.handleChapterPassed(level);
 *
 * Manages: certificate award (idempotent), confetti firing,
 * name prompt + certificate modal opening.
 */
export function useCertificateFlow() {
  const learnerName = useLearnStore((s) => s.learnerName);
  const setLearnerName = useLearnStore((s) => s.setLearnerName);
  const awardCertificate = useLearnStore((s) => s.awardCertificate);
  const isLevelComplete = useLearnStore((s) => s.isLevelComplete);
  const isCurriculumComplete = useLearnStore((s) => s.isCurriculumComplete);

  const [pendingCertificate, setPendingCertificate] = useState<EarnedCertificate | null>(null);
  const [askForName, setAskForName] = useState(false);

  // Called after a chapter quiz has been recorded as passed
  const handleChapterPassed = useCallback(
    (level: Level) => {
      // small visual celebration on every chapter pass
      fireCelebration(level.color);

      // Check if level newly complete
      if (isLevelComplete(level.slug)) {
        const cert = awardCertificate(level.slug);
        if (cert) {
          // newly earned
          setTimeout(() => {
            fireCelebration(level.color);
            setPendingCertificate(cert);
            if (!learnerName) setAskForName(true);
          }, 500);
        }
      }

      // Master cert
      if (isCurriculumComplete()) {
        const masterCert = awardCertificate("master");
        if (masterCert) {
          setTimeout(() => {
            fireMasterCelebration();
            setPendingCertificate(masterCert);
            if (!learnerName) setAskForName(true);
          }, 1200);
        }
      }
    },
    [awardCertificate, isLevelComplete, isCurriculumComplete, learnerName],
  );

  const handleNameSubmit = useCallback(
    (name: string) => {
      setLearnerName(name);
      setAskForName(false);
    },
    [setLearnerName],
  );

  const handleModalClose = useCallback(() => {
    setPendingCertificate(null);
  }, []);

  return {
    pendingCertificate,
    askForName,
    learnerName,
    handleChapterPassed,
    handleNameSubmit,
    handleModalClose,
  };
}

// Helper for finding level from chapter slug
export function findLevelByChapter(chapterSlug: string): Level | undefined {
  return LEVELS.find((l) => l.chapters.some((c) => c.slug === chapterSlug));
}
