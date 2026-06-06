"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft, Trophy, Award } from "lucide-react";
import { useLearnStore } from "@/lib/store";
import { CertificateMedallion } from "@/components/learn/CertificateMedallion";
import { LEVELS } from "@/lib/curriculum";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { toast } from "sonner";

export default function CertificatesPage() {
  const certificates = useLearnStore((s) => s.certificates);
  const learnerName = useLearnStore((s) => s.learnerName);
  const setLearnerName = useLearnStore((s) => s.setLearnerName);
  const [name, setName] = useState(learnerName);

  function saveName() {
    setLearnerName(name);
    toast.success("Name updated. New certificates will use this name.");
  }

  const sorted = [...certificates].sort((a, b) => b.earnedAt - a.earnedAt);

  return (
    <div className="container max-w-5xl py-10">
      <Link
        href="/learn"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-8"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Learn hub
      </Link>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-10"
      >
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight flex items-center gap-3">
          <Award className="h-10 w-10 text-amber-500" />
          Your Certificates
        </h1>
        <p className="mt-3 text-lg text-muted-foreground">
          {certificates.length} earned · {LEVELS.length + 1} possible (5 level + 1 master)
        </p>
      </motion.div>

      {/* Name editor */}
      <div className="mb-10 rounded-2xl border bg-card p-6">
        <h2 className="text-lg font-bold mb-1">Name on certificates</h2>
        <p className="text-sm text-muted-foreground mb-4">
          This name appears on every certificate you download. Update it anytime.
        </p>
        <div className="flex gap-2">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your full name"
            className="max-w-md"
          />
          <Button onClick={saveName} disabled={!name.trim() || name === learnerName}>
            Save
          </Button>
        </div>
      </div>

      {/* Certificate list */}
      {sorted.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed p-12 text-center">
          <Trophy className="h-12 w-12 mx-auto text-muted-foreground/40 mb-4" />
          <p className="text-lg font-semibold mb-1">No certificates yet</p>
          <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
            Complete all chapters in a level to earn your first achievement certificate.
          </p>
          <Button asChild>
            <Link href="/learn/level/foundations">Start Level 1: Foundations</Link>
          </Button>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {sorted.map((cert, i) => (
            <CertificateMedallion key={cert.serial} certificate={cert} index={i} />
          ))}
        </div>
      )}
    </div>
  );
}
