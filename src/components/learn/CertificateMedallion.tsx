"use client";

import { motion } from "framer-motion";
import { Award, Trophy } from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";
import type { EarnedCertificate } from "@/lib/curriculum";
import { LEVELS, MASTER_CERTIFICATE_LABEL } from "@/lib/curriculum";

interface CertificateMedallionProps {
  certificate: EarnedCertificate;
  index?: number;
}

export function CertificateMedallion({ certificate, index = 0 }: CertificateMedallionProps) {
  const isMaster = certificate.levelSlug === "master";
  const level = isMaster ? null : LEVELS.find((l) => l.slug === certificate.levelSlug);
  const accent = isMaster ? "#D4AF37" : level?.color ?? "#0EA5E9";
  const accentLight = isMaster ? "#FFD700" : level?.gradient[1] ?? accent;
  const label = isMaster ? MASTER_CERTIFICATE_LABEL : level?.certificateLabel ?? "Achievement";
  const title = isMaster ? "Mastery" : level?.title ?? "";

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.06, type: "spring" }}
    >
      <Link
        href={`/learn/certificates/${certificate.levelSlug}`}
        className="block group"
      >
        <div
          className="relative rounded-xl border-2 p-4 transition-all hover:shadow-lg hover:-translate-y-0.5"
          style={{
            borderColor: accent + "40",
            background: `linear-gradient(135deg, ${accent}10, ${accent}20)`,
          }}
        >
          <div className="flex items-center gap-3">
            <div
              className="flex h-12 w-12 items-center justify-center rounded-full shadow-md"
              style={{ background: `linear-gradient(135deg, ${accent}, ${accentLight})` }}
            >
              {isMaster ? <Award className="h-6 w-6 text-white" /> : <Trophy className="h-6 w-6 text-white" />}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold truncate" style={{ color: accent }}>
                {label}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                {title} · {format(certificate.earnedAt, "MMM d, yyyy")}
              </p>
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
