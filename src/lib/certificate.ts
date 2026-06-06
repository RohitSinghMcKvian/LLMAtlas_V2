"use client";

import type { EarnedCertificate } from "./curriculum";

/**
 * Snapshots a rendered CertificateCanvas element and saves it as PDF.
 * The element must already be mounted in the DOM (typically off-screen).
 */
export async function generateCertificatePDF(
  certificate: EarnedCertificate,
  learnerName: string,
): Promise<void> {
  // dynamic import — keeps these heavy libs out of the initial bundle
  const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([
    import("html2canvas-pro"),
    import("jspdf"),
  ]);

  const node = document.getElementById(`cert-${certificate.serial}`);
  if (!node) {
    throw new Error(`Certificate DOM node not found for serial ${certificate.serial}`);
  }

  // Snapshot with 2× scale for crisp print
  const canvas = await html2canvas(node, {
    scale: 2,
    backgroundColor: null,
    useCORS: true,
    logging: false,
  });

  const pdf = new jsPDF({
    orientation: "landscape",
    unit: "px",
    format: [1600, 1100],
    hotfixes: ["px_scaling"],
  });

  pdf.addImage(canvas.toDataURL("image/png", 1.0), "PNG", 0, 0, 1600, 1100);

  const safeName = slugifyName(learnerName);
  const safeLevel = certificate.levelSlug;
  pdf.save(`llmatlas-${safeLevel}-${safeName || certificate.serial}.pdf`);
}

function slugifyName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}
