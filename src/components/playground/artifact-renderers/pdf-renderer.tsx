"use client";

// PDF renderer — generates a PDF inside a sandboxed iframe and shows it inline
// (data: URL → <embed>). Two input modes:
//
//   1. JS mode: content starts with `// jsPDF` (or contains `new jsPDF`). The
//      script runs in the iframe with the jsPDF library preloaded; it must end
//      by calling `__send(doc.output('blob'))` (helper injected) which posts
//      the PDF blob to the parent. We use the message to render an <embed>.
//
//   2. Markdown mode: anything else is treated as markdown and rendered with
//      a tasteful default stylesheet, then converted to PDF in-browser via
//      html2pdf.js. This is the default path — models can just emit markdown.
//
// In either case the user gets an inline preview + a download button.

import { useEffect, useMemo, useRef, useState } from "react";
import { CONSOLE_BRIDGE } from "./console-bridge";
import { Download, AlertCircle, Loader2 } from "lucide-react";

interface Props {
  content: string;
  reloadKey?: number;
}

function isJsMode(s: string): boolean {
  return /\b(new\s+jsPDF|jsPDF\s*\()/i.test(s);
}

function buildJsDoc(src: string): string {
  // Escape closing tags so the script can be safely inlined.
  const escaped = src.replace(/<\/script>/gi, "<\\/script>");
  return `<!doctype html><html><head>
${CONSOLE_BRIDGE}
<script src="https://cdn.jsdelivr.net/npm/jspdf@2.5.2/dist/jspdf.umd.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/jspdf-autotable@3.8.4/dist/jspdf.plugin.autotable.min.js"></script>
</head><body>
<script>
(async function(){
  const { jsPDF } = window.jspdf;
  window.jsPDF = jsPDF; // expose at top level too
  function __send(blob){
    const reader = new FileReader();
    reader.onload = () => parent.postMessage({ __llmatlas_pdf: true, dataUrl: reader.result }, '*');
    reader.readAsDataURL(blob);
  }
  try {
    ${escaped}
  } catch(e){
    parent.postMessage({ __llmatlas_pdf_error: true, message: String(e && (e.stack||e.message)) }, '*');
  }
})();
</script>
</body></html>`;
}

function buildMarkdownDoc(md: string): string {
  const escaped = md.replace(/<\/script>/gi, "<\\/script>");
  return `<!doctype html><html><head>
${CONSOLE_BRIDGE}
<style>
  body{font-family:'Inter','Segoe UI',system-ui,sans-serif;color:#1a1a1a;line-height:1.6;padding:48px 64px;max-width:780px;margin:0 auto}
  h1{font-size:32px;margin:0 0 8px;font-weight:800;letter-spacing:-0.02em}
  h2{font-size:22px;margin:32px 0 12px;font-weight:700;border-bottom:1px solid #e5e7eb;padding-bottom:6px}
  h3{font-size:18px;margin:24px 0 8px;font-weight:600}
  p{margin:0 0 14px}
  ul,ol{margin:0 0 14px;padding-left:24px}
  li{margin:4px 0}
  code{background:#f1f5f9;padding:2px 6px;border-radius:4px;font-family:'JetBrains Mono',ui-monospace,monospace;font-size:0.92em}
  pre{background:#0f172a;color:#e2e8f0;padding:16px;border-radius:8px;overflow-x:auto;font-size:13px;line-height:1.5}
  pre code{background:transparent;padding:0;color:inherit}
  blockquote{border-left:4px solid #6366f1;background:#eef2ff;padding:12px 16px;margin:16px 0;border-radius:0 6px 6px 0;color:#3730a3}
  table{border-collapse:collapse;width:100%;margin:16px 0;font-size:14px}
  th,td{border:1px solid #e5e7eb;padding:8px 12px;text-align:left}
  th{background:#f8fafc;font-weight:600}
  a{color:#4f46e5;text-decoration:none}
  hr{border:0;border-top:1px solid #e5e7eb;margin:32px 0}
</style>
<script src="https://cdn.jsdelivr.net/npm/marked@13.0.3/marked.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/html2pdf.js@0.10.2/dist/html2pdf.bundle.min.js"></script>
</head><body>
<div id="doc"></div>
<script>
(function(){
  const md = ${JSON.stringify(escaped)};
  document.getElementById('doc').innerHTML = marked.parse(md, { breaks: true, gfm: true });
  // Wait for fonts/images, then generate the PDF.
  setTimeout(() => {
    html2pdf().set({
      margin: 0,
      filename: 'document.pdf',
      image: { type: 'jpeg', quality: 0.96 },
      html2canvas: { scale: 2, useCORS: true, backgroundColor: '#ffffff' },
      jsPDF: { unit: 'pt', format: 'a4', orientation: 'portrait' },
      pagebreak: { mode: ['css', 'legacy'] },
    }).from(document.getElementById('doc')).outputPdf('blob').then(blob => {
      const reader = new FileReader();
      reader.onload = () => parent.postMessage({ __llmatlas_pdf: true, dataUrl: reader.result }, '*');
      reader.readAsDataURL(blob);
    }).catch(e => {
      parent.postMessage({ __llmatlas_pdf_error: true, message: String(e) }, '*');
    });
  }, 200);
})();
</script>
</body></html>`;
}

export function PdfRenderer({ content, reloadKey = 0 }: Props) {
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const builderRef = useRef<HTMLIFrameElement>(null);

  const builderSrc = useMemo(() => {
    return isJsMode(content) ? buildJsDoc(content) : buildMarkdownDoc(content);
  }, [content]);

  useEffect(() => {
    setPdfUrl(null);
    setError(null);
    setLoading(true);
    const onMsg = (e: MessageEvent) => {
      const d = e.data;
      if (d?.__llmatlas_pdf && typeof d.dataUrl === "string") {
        setPdfUrl(d.dataUrl);
        setLoading(false);
      } else if (d?.__llmatlas_pdf_error) {
        setError(String(d.message ?? "PDF generation failed"));
        setLoading(false);
      }
    };
    window.addEventListener("message", onMsg);
    return () => window.removeEventListener("message", onMsg);
  }, [content, reloadKey]);

  return (
    <div className="relative w-full h-full bg-muted/30 flex flex-col">
      {/* Hidden builder iframe — generates the PDF then posts it back. */}
      <iframe
        ref={builderRef}
        key={reloadKey}
        title="PDF builder"
        srcDoc={builderSrc}
        sandbox="allow-scripts"
        className="hidden"
      />
      {loading && (
        <div className="flex-1 flex flex-col items-center justify-center gap-3 text-sm text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <span>Generating PDF…</span>
        </div>
      )}
      {error && (
        <div className="flex-1 flex flex-col items-center justify-center gap-2 text-sm text-red-600 dark:text-red-400 px-6 text-center">
          <AlertCircle className="h-6 w-6" />
          <div className="font-semibold">PDF generation failed</div>
          <pre className="text-[11px] font-mono whitespace-pre-wrap text-left max-w-md">{error}</pre>
        </div>
      )}
      {pdfUrl && (
        <>
          <div className="absolute top-2 right-2 z-10">
            <a
              href={pdfUrl}
              download="document.pdf"
              className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-primary text-primary-foreground text-xs font-medium shadow hover:opacity-90"
              title="Download PDF"
            >
              <Download className="h-3.5 w-3.5" /> Download
            </a>
          </div>
          <embed src={pdfUrl} type="application/pdf" className="flex-1 w-full" />
        </>
      )}
    </div>
  );
}
