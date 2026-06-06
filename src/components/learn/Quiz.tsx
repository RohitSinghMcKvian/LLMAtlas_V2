"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, X, Trophy, RotateCcw, ChevronRight } from "lucide-react";
import type { Chapter, Level } from "@/lib/curriculum";
import { useLearnStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface QuizProps {
  level: Level;
  chapter: Chapter;
  onPass: () => void; // called when user passes
  onContinue?: () => void;
}

const PASS_THRESHOLD = 0.7;

export function Quiz({ level, chapter, onPass, onContinue }: QuizProps) {
  const recordQuiz = useLearnStore((s) => s.recordQuiz);
  const quizPassed = useLearnStore((s) => s.quizPassed[chapter.slug]);

  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState(0);

  const isPass = quizPassed !== undefined || (submitted && score / chapter.quiz.length >= PASS_THRESHOLD);

  function selectAnswer(qid: string, idx: number) {
    if (submitted) return;
    setAnswers((a) => ({ ...a, [qid]: idx }));
  }

  function handleSubmit() {
    const correct = chapter.quiz.reduce(
      (n, q) => n + (answers[q.id] === q.correctIndex ? 1 : 0),
      0,
    );
    setScore(correct);
    setSubmitted(true);
    if (correct / chapter.quiz.length >= PASS_THRESHOLD) {
      recordQuiz(chapter.slug, correct, chapter.quiz.length);
      // small delay so the pass banner can render first
      setTimeout(() => onPass(), 400);
    }
  }

  function handleRetry() {
    setAnswers({});
    setSubmitted(false);
    setScore(0);
  }

  const allAnswered = chapter.quiz.every((q) => answers[q.id] !== undefined);
  const percent = submitted ? Math.round((score / chapter.quiz.length) * 100) : 0;

  return (
    <div className="my-12 rounded-2xl border-2 bg-card p-6 md:p-8 shadow-lg" style={{ borderColor: level.color + "40" }}>
      <div className="flex items-center justify-between gap-3 mb-6">
        <div>
          <h3 className="text-xl font-bold flex items-center gap-2">
            <Trophy className="h-5 w-5" style={{ color: level.color }} />
            Knowledge Check
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            Score {Math.round(PASS_THRESHOLD * 100)}% or higher to mark this chapter complete.
            {quizPassed && (
              <span className="ml-2 text-emerald-500 font-medium">
                · Already passed ({Math.round(quizPassed.score * 100)}%)
              </span>
            )}
          </p>
        </div>
      </div>

      <div className="space-y-5">
        {chapter.quiz.map((q, qi) => (
          <QuizQuestion
            key={q.id}
            question={q}
            number={qi + 1}
            selected={answers[q.id]}
            submitted={submitted}
            levelColor={level.color}
            onSelect={(idx) => selectAnswer(q.id, idx)}
          />
        ))}
      </div>

      {/* Submit / result banner */}
      <AnimatePresence mode="wait">
        {!submitted ? (
          <motion.div
            key="submit"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="mt-6 flex items-center justify-between gap-3"
          >
            <p className="text-sm text-muted-foreground">
              {Object.keys(answers).length} / {chapter.quiz.length} answered
            </p>
            <Button
              size="lg"
              disabled={!allAnswered}
              onClick={handleSubmit}
              style={{
                backgroundColor: allAnswered ? level.color : undefined,
                color: allAnswered ? "white" : undefined,
              }}
            >
              Submit answers
            </Button>
          </motion.div>
        ) : isPass ? (
          <motion.div
            key="pass"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mt-6 rounded-xl border-2 border-emerald-500/40 bg-emerald-500/10 p-5"
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500 text-white">
                <Check className="h-6 w-6" />
              </div>
              <div className="flex-1">
                <p className="text-lg font-bold text-emerald-500">Passed — {percent}%</p>
                <p className="text-sm text-muted-foreground">Chapter complete. Your progress is saved.</p>
              </div>
              {onContinue && (
                <Button onClick={onContinue} className="bg-emerald-500 hover:bg-emerald-600 text-white">
                  Continue <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              )}
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="fail"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mt-6 rounded-xl border-2 border-rose-500/40 bg-rose-500/10 p-5"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-rose-500 text-white">
                <X className="h-6 w-6" />
              </div>
              <div className="flex-1">
                <p className="text-lg font-bold text-rose-500">Not quite — {percent}%</p>
                <p className="text-sm text-muted-foreground">
                  You need {Math.round(PASS_THRESHOLD * 100)}% to pass. Review the explanations and try again.
                </p>
              </div>
              <Button variant="outline" onClick={handleRetry}>
                <RotateCcw className="h-4 w-4 mr-2" />
                Try again
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Quiz Question ────────────────────────────────────────────────────────

interface QuizQuestionProps {
  question: import("@/lib/curriculum").QuizQuestion;
  number: number;
  selected: number | undefined;
  submitted: boolean;
  levelColor: string;
  onSelect: (idx: number) => void;
}

function QuizQuestion({ question, number, selected, submitted, levelColor, onSelect }: QuizQuestionProps) {
  const isCorrect = selected === question.correctIndex;
  return (
    <div className="rounded-xl border bg-background/50 p-5">
      <p className="font-semibold mb-4">
        <span className="text-muted-foreground mr-2">Q{number}.</span>
        {question.question}
      </p>
      <div className="space-y-2">
        {question.options.map((opt, i) => {
          const isSelected = selected === i;
          const isAnswer = i === question.correctIndex;
          const showCorrect = submitted && isAnswer;
          const showWrong = submitted && isSelected && !isCorrect;
          return (
            <button
              key={i}
              onClick={() => onSelect(i)}
              disabled={submitted}
              className={cn(
                "w-full text-left rounded-lg border-2 px-4 py-3 text-sm transition-all",
                "flex items-start gap-3",
                !submitted && "hover:bg-accent cursor-pointer",
                submitted && "cursor-default",
                isSelected && !submitted && "border-current",
                showCorrect && "border-emerald-500 bg-emerald-500/10",
                showWrong && "border-rose-500 bg-rose-500/10",
                !isSelected && !showCorrect && "border-border",
              )}
              style={{
                color: isSelected && !submitted ? levelColor : undefined,
              }}
            >
              <div
                className={cn(
                  "flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full border-2 text-xs font-bold",
                  isSelected && !submitted && "border-current",
                  showCorrect && "bg-emerald-500 text-white border-emerald-500",
                  showWrong && "bg-rose-500 text-white border-rose-500",
                  !isSelected && !showCorrect && "border-muted-foreground/30 text-muted-foreground",
                )}
              >
                {showCorrect ? <Check className="h-3 w-3" /> : showWrong ? <X className="h-3 w-3" /> : String.fromCharCode(65 + i)}
              </div>
              <span className="flex-1 pt-0.5">{opt}</span>
            </button>
          );
        })}
      </div>
      {submitted && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className="mt-3 rounded-lg bg-muted/40 px-4 py-3 text-sm"
        >
          <span className="font-semibold text-foreground">Explanation: </span>
          <span className="text-muted-foreground">{question.explanation}</span>
        </motion.div>
      )}
    </div>
  );
}
