"use client";

import { use, useState } from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft, Download } from "lucide-react";
import { useLearnStore } from "@/lib/store";
import { CertificateCanvas } from "@/components/learn/CertificateCanvas";
import { Button } from "@/components/ui/button";
import { generateCertificatePDF } from "@/lib/certificate";
import { LEVELS, MASTER_CERTIFICATE_LABEL } from "@/lib/curriculum";
import { toast } from "sonner";

interface PageProps {
  params: Promise<{ levelSlug: string }>;
}

export default function CertificateDetailPage({ params }: PageProps) {
  const { levelSlug } = use(params);
  const certificates = useLearnStore((s) => s.certificates);
  const learnerName = useLearnStore((s) => s.learnerName);
  const cert = certificates.find((c) => c.levelSlug === levelSlug);
  const [downloading, setDownloading] = useState(false);

  if (!cert) notFound();

  const isMaster = cert!.levelSlug === "master";
  const level = isMaster ? null : LEVELS.find((l) => l.slug === cert!.levelSlug);
  const accent = isMaster ? "#D4AF37" : level?.color ?? "#0EA5E9";
  const label = isMaster ? MASTER_CERTIFICATE_LABEL : level?.certificateLabel ?? "Achievement";

  async function handleDownload() {
    setDownloading(true);
    try {
      await generateCertificatePDF(cert!, learnerName);
      toast.success("Certificate downloaded");
    } catch (err) {
      console.error(err);
      toast.error("Could not generate PDF.");
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="container max-w-5xl py-10">
      <Link
        href="/learn/certificates"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-8"
      >
        <ArrowLeft className="h-4 w-4" />
        All certificates
      </Link>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <p className="text-sm font-semibold uppercase tracking-wider mb-2" style={{ color: accent }}>
          {label}
        </p>
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
          {isMaster ? "Certificate of Mastery" : "Certificate of Achievement"}
        </h1>
      </motion.div>

      {/* Off-screen render for the PDF snapshot */}
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
        <CertificateCanvas certificate={cert!} learnerName={learnerName} forSnapshot />
      </div>

      {/* On-screen preview */}
      <div className="overflow-hidden rounded-2xl border-2 shadow-2xl mb-6" style={{ borderColor: accent + "40" }}>
        <CertificateCanvas certificate={cert!} learnerName={learnerName} />
      </div>

      <div className="flex flex-wrap gap-3">
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
        {!learnerName && (
          <p className="text-sm text-muted-foreground self-center">
            Tip: set your name in the{" "}
            <Link href="/learn/certificates" className="underline">
              certificates page
            </Link>{" "}
            for a personalised PDF.
          </p>
        )}
      </div>
    </div>
  );
}
