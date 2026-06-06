// Client-side attachment helpers: image → data URL, PDF/docx/text → extracted text.
// Heavy parsers (pdfjs, mammoth) are dynamic-imported so the main bundle stays light.
//
// Optional deps: pdfjs-dist + mammoth aren't installed yet. The functions degrade
// gracefully — they prompt the user to install the package when the dep is missing.

import type { Attachment } from "./store";
import { nanoid } from "nanoid";

const MAX_INLINE_SIZE = 4 * 1024 * 1024; // 4 MB inline cap

export const SUPPORTED_MIME = [
  "image/png", "image/jpeg", "image/webp", "image/gif",
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // docx
  "text/plain", "text/markdown", "application/json",
  "text/javascript", "application/javascript", "text/typescript",
  "text/html", "text/css", "text/x-python",
];

export async function fileToAttachment(file: File): Promise<Attachment> {
  if (file.size > MAX_INLINE_SIZE) throw new Error(`File too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Limit: 4 MB.`);

  const kind = classify(file);
  const baseId = nanoid(10);
  const baseMeta = { id: baseId, name: file.name, mime: file.type || "application/octet-stream", size: file.size } as const;

  if (kind === "image") {
    const data = await readDataUrl(file);
    return { ...baseMeta, kind, data };
  }
  if (kind === "pdf") {
    const extractedText = await extractPdfText(file);
    return { ...baseMeta, kind, data: extractedText, extractedText };
  }
  if (kind === "docx") {
    const extractedText = await extractDocxText(file);
    return { ...baseMeta, kind, data: extractedText, extractedText };
  }
  // text / code
  const text = await readText(file);
  return { ...baseMeta, kind, data: text, extractedText: text };
}

function classify(file: File): Attachment["kind"] {
  const mime = (file.type || "").toLowerCase();
  if (mime.startsWith("image/")) return "image";
  if (mime === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) return "pdf";
  if (mime.includes("wordprocessingml") || file.name.toLowerCase().endsWith(".docx")) return "docx";
  if (/\.(js|ts|tsx|jsx|py|rs|go|java|c|cpp|h|hpp|rb|php|cs|swift|kt|sql|sh|yaml|yml|toml|html|css|scss|md|json)$/i.test(file.name)) return "code";
  return "text";
}

function readDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = () => reject(r.error);
    r.readAsDataURL(file);
  });
}

function readText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = () => reject(r.error);
    r.readAsText(file);
  });
}

interface PdfjsModule {
  GlobalWorkerOptions: { workerSrc: string };
  getDocument: (opts: { data: ArrayBuffer }) => { promise: Promise<{
    numPages: number;
    getPage: (n: number) => Promise<{ getTextContent: () => Promise<{ items: Array<{ str?: string }> }> }>;
  }> };
}

async function extractPdfText(file: File): Promise<string> {
  const pdfjs = (await import("pdfjs-dist").catch(() => null)) as PdfjsModule | null;
  if (!pdfjs) return `[PDF: ${file.name}] — pdfjs-dist not loaded.`;
  pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
  const buf = await file.arrayBuffer();
  const doc = await pdfjs.getDocument({ data: buf }).promise;
  const out: string[] = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const tc = await page.getTextContent();
    out.push(tc.items.map((it) => it.str ?? "").join(" "));
  }
  return out.join("\n\n");
}

interface MammothModule {
  extractRawText: (input: { arrayBuffer: ArrayBuffer }) => Promise<{ value: string }>;
}

async function extractDocxText(file: File): Promise<string> {
  const mammoth = (await import("mammoth").catch(() => null)) as MammothModule | null;
  if (!mammoth) return `[DOCX: ${file.name}] — mammoth not loaded.`;
  const buf = await file.arrayBuffer();
  const { value } = await mammoth.extractRawText({ arrayBuffer: buf });
  return value;
}

/** Convert attachments into a system-prompt context block. */
export function attachmentsToContext(atts: Attachment[]): string {
  if (!atts.length) return "";
  const blocks = atts.map((a) => {
    if (a.kind === "image") return `[image: ${a.name} (${a.mime})]`;
    const text = a.extractedText || a.data;
    return `--- attached: ${a.name} ---\n${text.slice(0, 8000)}${text.length > 8000 ? "\n…(truncated)" : ""}\n--- end ---`;
  });
  return `\n\nThe user attached the following files:\n${blocks.join("\n\n")}`;
}

/** Extract image attachments as data URLs suitable for vision models. */
export function attachmentsToImageParts(atts: Attachment[]): Array<{ type: "image_url"; image_url: { url: string } }> {
  return atts.filter((a) => a.kind === "image").map((a) => ({ type: "image_url", image_url: { url: a.data } }));
}
