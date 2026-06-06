"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, ExternalLink, Trophy, Award } from "lucide-react";
import Link from "next/link";
import type { EarnedCertificate } from "@/lib/curriculum";
import { LEVELS, MASTER_CERTIFICATE_LABEL } from "@/lib/curriculum";
import { CertificateCanvas } from "./CertificateCanvas";
import { generateCertificatePDF } from "@/lib/certificate";
import { toast } from "sonner";

interface CertificateModalProps {
  certificate: EarnedCertificate | null;
  learnerName: string;
  onClose: () => void;
}

export function CertificateModal({ certificate, learnerName, onClose }: CertificateModalProps) {
  const [downloading, setDownloading] = useState(false);

  if (!certificate) return null;

  const isMaster = certificate.levelSlug === "master";
  const level = isMaster ? null : LEVELS.find((l) => l.slug === certificate.levelSlug);
  const accent = isMaster ? "#D4AF37" : level?.color ?? "#0EA5E9";
  const label = isMaster ? MASTER_CERTIFICATE_LABEL : level?.certificateLabel ?? "Achievement";

  async function handleDownload() {
    setDownloading(true);
    try {
      await generateCertificatePDF(certificate!, learnerName);
      toast.success("Certificate downloaded");
    } catch (err) {
      console.error(err);
      toast.error("Could not generate PDF. Please try again.");
    } finally {
      setDownloading(false);
    }
  }

  return (
    <>
      {/* Off-screen render target for html2canvas */}
      <div
        style={{
          position: "fixed",
          left: "-20000px",
          top: 0,
          pointerEvents: "none",
          width: "1600px",
          height: "1100px",
        }}
        aria-hidden
      >
        <CertificateCanvas certificate={certificate} learnerName={learnerName} forSnapshot />
      </div>

      <Dialog open={!!certificate} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <div
              className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full"
              style={{ background: `linear-gradient(135deg, ${accent}, ${accent}80)` }}
            >
              {isMaster ? (
                <Award className="h-7 w-7 text-white" />
              ) : (
                <Trophy className="h-7 w-7 text-white" />
              )}
            </div>
            <DialogTitle className="text-center text-2xl">
              {isMaster ? "🎉 Mastery achieved!" : "🎉 Achievement unlocked!"}
            </DialogTitle>
            <DialogDescription className="text-center">
              You&apos;ve earned the <strong style={{ color: accent }}>{label}</strong> certificate.
            </DialogDescription>
          </DialogHeader>

          {/* Mini preview of the certificate */}
          <div className="my-4 overflow-hidden rounded-lg border shadow-xl">
            <CertificateCanvas certificate={certificate} learnerName={learnerName} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Button
              onClick={handleDownload}
              disabled={downloading}
              size="lg"
              className="text-white font-semibold"
              style={{ background: `linear-gradient(135deg, ${accent}, ${accent}DD)` }}
            >
              <Download className="h-4 w-4 mr-2" />
              {downloading ? "Generating PDF…" : "Download PDF"}
            </Button>
            <Button variant="outline" size="lg" asChild>
              <Link href="/learn/certificates" onClick={onClose}>
                <ExternalLink className="h-4 w-4 mr-2" />
                View all certificates
              </Link>
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
