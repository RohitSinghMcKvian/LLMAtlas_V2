"use client";

import { LEVELS, MASTER_CERTIFICATE_LABEL, type EarnedCertificate, type Level } from "@/lib/curriculum";
import { format } from "date-fns";

interface CertificateCanvasProps {
  certificate: EarnedCertificate;
  learnerName: string;
  /** When true, this is rendered off-screen for html2canvas snapshot. */
  forSnapshot?: boolean;
}

const MASTER_ACCENT = "#D4AF37";
const MASTER_ACCENT_LIGHT = "#FFD700";

export function CertificateCanvas({
  certificate,
  learnerName,
  forSnapshot = false,
}: CertificateCanvasProps) {
  const isMaster = certificate.levelSlug === "master";
  const level = isMaster ? undefined : LEVELS.find((l) => l.slug === certificate.levelSlug);
  const accent = isMaster ? MASTER_ACCENT : level?.color ?? "#0EA5E9";
  const accentLight = isMaster ? MASTER_ACCENT_LIGHT : level?.gradient[1] ?? accent;
  const label = isMaster ? MASTER_CERTIFICATE_LABEL : level?.certificateLabel ?? "Achievement";
  const title = isMaster ? "Certificate of Mastery" : "Certificate of Achievement";
  const bodyTitle = isMaster ? "the complete LLMAtlas curriculum" : `the ${level?.title} curriculum`;
  const topics = isMaster
    ? "foundations, prompting, RAG & agents, production engineering, and frontier mastery"
    : level?.keyTopics.join(", ") ?? "";

  const date = format(certificate.earnedAt, "MMMM d, yyyy");

  return (
    <div
      id={`cert-${certificate.serial}`}
      style={{
        width: forSnapshot ? "1600px" : "100%",
        aspectRatio: forSnapshot ? undefined : "1600 / 1100",
        height: forSnapshot ? "1100px" : undefined,
        background: `radial-gradient(ellipse at top left, ${accent}22 0%, transparent 50%),
                     radial-gradient(ellipse at bottom right, ${accent}33 0%, transparent 60%),
                     linear-gradient(135deg, #0A0510 0%, #1A0A2E 50%, #0A0510 100%)`,
        position: "relative",
        fontFamily: "'Playfair Display', Georgia, serif",
        color: "#F5F5F5",
        overflow: "hidden",
      }}
    >
      {/* Outer double border */}
      <div
        style={{
          position: "absolute",
          inset: "32px",
          border: `2px solid ${accent}`,
          borderRadius: "12px",
          boxShadow: `0 0 60px ${accent}55, inset 0 0 60px ${accent}22`,
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: "48px",
          border: `1px solid ${accent}88`,
          borderRadius: "8px",
        }}
      />

      {/* Top decorative corners */}
      <div style={{ position: "absolute", top: 60, left: 60, color: accent, opacity: 0.5 }}>
        <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
          <path d="M0 0 L40 0 M0 0 L0 40" stroke="currentColor" strokeWidth="2" />
          <circle cx="0" cy="0" r="4" fill="currentColor" />
        </svg>
      </div>
      <div style={{ position: "absolute", top: 60, right: 60, color: accent, opacity: 0.5 }}>
        <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
          <path d="M40 0 L0 0 M40 0 L40 40" stroke="currentColor" strokeWidth="2" />
          <circle cx="40" cy="0" r="4" fill="currentColor" />
        </svg>
      </div>
      <div style={{ position: "absolute", bottom: 60, left: 60, color: accent, opacity: 0.5 }}>
        <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
          <path d="M0 40 L40 40 M0 40 L0 0" stroke="currentColor" strokeWidth="2" />
          <circle cx="0" cy="40" r="4" fill="currentColor" />
        </svg>
      </div>
      <div style={{ position: "absolute", bottom: 60, right: 60, color: accent, opacity: 0.5 }}>
        <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
          <path d="M40 40 L0 40 M40 40 L40 0" stroke="currentColor" strokeWidth="2" />
          <circle cx="40" cy="40" r="4" fill="currentColor" />
        </svg>
      </div>

      {/* Top row: logo + serial */}
      <div
        style={{
          position: "absolute",
          top: forSnapshot ? "80px" : "5%",
          left: forSnapshot ? "100px" : "6%",
          right: forSnapshot ? "100px" : "6%",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div
            style={{
              width: "44px",
              height: "44px",
              borderRadius: "10px",
              background: `linear-gradient(135deg, ${accent} 0%, ${accentLight} 100%)`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontFamily: "system-ui, sans-serif",
              fontWeight: 800,
              fontSize: "22px",
              color: "white",
            }}
          >
            L
          </div>
          <div style={{ fontFamily: "system-ui, sans-serif" }}>
            <div style={{ fontSize: "20px", fontWeight: 700, letterSpacing: "-0.02em" }}>LLMAtlas</div>
            <div style={{ fontSize: "11px", color: "#A0A0A0", letterSpacing: "0.1em", textTransform: "uppercase" }}>
              Open Ecosystem
            </div>
          </div>
        </div>
        <div style={{ fontFamily: "ui-monospace, monospace", fontSize: "12px", color: "#A0A0A0" }}>
          {certificate.serial}
        </div>
      </div>

      {/* Main content */}
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          textAlign: "center",
          width: "78%",
        }}
      >
        {/* Achievement label badge */}
        <div
          style={{
            display: "inline-block",
            padding: "6px 18px",
            borderRadius: "999px",
            border: `1px solid ${accent}`,
            background: `${accent}15`,
            fontFamily: "system-ui, sans-serif",
            fontSize: "12px",
            fontWeight: 600,
            color: accent,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            marginBottom: "28px",
          }}
        >
          {label}
        </div>

        {/* Title */}
        <h1
          style={{
            fontSize: forSnapshot ? "62px" : "44px",
            fontWeight: 400,
            margin: 0,
            color: "#FFFFFF",
            letterSpacing: "-0.02em",
            fontStyle: "italic",
          }}
        >
          {title}
        </h1>

        {/* Subtitle */}
        <div
          style={{
            marginTop: "32px",
            fontFamily: "system-ui, sans-serif",
            fontSize: "16px",
            color: "#A0A0A0",
            letterSpacing: "0.05em",
          }}
        >
          This is to certify that
        </div>

        {/* Name */}
        <div
          style={{
            marginTop: "20px",
            fontSize: forSnapshot ? "84px" : "60px",
            fontWeight: 500,
            color: "#FFFFFF",
            letterSpacing: "-0.01em",
            paddingBottom: "12px",
            display: "inline-block",
            borderBottom: `2px solid ${accent}`,
            minWidth: "60%",
            fontStyle: "italic",
          }}
        >
          {learnerName || "Your Name Here"}
        </div>

        {/* Body */}
        <p
          style={{
            marginTop: "32px",
            fontFamily: "system-ui, sans-serif",
            fontSize: forSnapshot ? "18px" : "15px",
            lineHeight: 1.6,
            color: "#D0D0D0",
            maxWidth: "85%",
            margin: "32px auto 0",
          }}
        >
          has successfully completed{" "}
          <strong style={{ color: accent }}>{bodyTitle}</strong>, demonstrating proficiency in{" "}
          <span style={{ color: "#E0E0E0", fontStyle: "italic" }}>{topics}</span>.
        </p>
      </div>

      {/* Right medallion */}
      <div
        style={{
          position: "absolute",
          right: forSnapshot ? "100px" : "6%",
          top: "50%",
          transform: "translateY(-50%)",
          width: forSnapshot ? "180px" : "120px",
          height: forSnapshot ? "180px" : "120px",
          display: "none", // hidden — center-text design preferred
        }}
      />

      {/* Footer row */}
      <div
        style={{
          position: "absolute",
          bottom: forSnapshot ? "100px" : "6%",
          left: forSnapshot ? "100px" : "6%",
          right: forSnapshot ? "100px" : "6%",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-end",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        {/* Date */}
        <div>
          <div
            style={{
              fontSize: "11px",
              color: "#909090",
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              marginBottom: "4px",
            }}
          >
            Issued
          </div>
          <div style={{ fontSize: "14px", color: "#E0E0E0", fontWeight: 500 }}>{date}</div>
        </div>

        {/* Signature */}
        <div style={{ textAlign: "center" }}>
          <div
            style={{
              fontFamily: "'Playfair Display', Georgia, serif",
              fontStyle: "italic",
              fontSize: forSnapshot ? "28px" : "20px",
              color: "#FFFFFF",
              paddingBottom: "6px",
              borderBottom: `1px solid ${accent}66`,
              marginBottom: "6px",
              minWidth: "200px",
            }}
          >
            LLMAtlas
          </div>
          <div style={{ fontSize: "11px", color: "#909090", letterSpacing: "0.05em" }}>
            Founder · LLMAtlas
          </div>
        </div>

        {/* Serial block */}
        <div style={{ textAlign: "right" }}>
          <div
            style={{
              fontSize: "11px",
              color: "#909090",
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              marginBottom: "4px",
            }}
          >
            Serial
          </div>
          <div
            style={{
              fontFamily: "ui-monospace, monospace",
              fontSize: "13px",
              color: accent,
              fontWeight: 600,
            }}
          >
            {certificate.serial}
          </div>
        </div>
      </div>
    </div>
  );
}
