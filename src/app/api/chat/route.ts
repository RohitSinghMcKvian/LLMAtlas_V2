import { NextRequest } from "next/server";
import { streamChat, type ChatMessage, type ContentBlock, type ToolFunction } from "@/lib/providers";
import { findModel } from "@/lib/models";
import {
  composeCapabilityPrimers,
  modePrimer,
  UCL_BASE_PRIMER,
  type CapabilityId,
  type UltraMode,
} from "@/lib/ucl";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface AttachmentLike {
  kind: "image" | "pdf" | "docx" | "text" | "code";
  name: string;
  mime: string;
  data: string;
  extractedText?: string;
}

/** Ultra-Capability flags applied server-side. Every surface can opt in. */
interface UltraFlags {
  mode?: UltraMode;
  capabilities?: CapabilityId[];
  /** Inject the base UCL persona (default true when any other ultra flag is set). */
  base?: boolean;
}

interface Body {
  modelId: string;
  messages: ChatMessage[];
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  apiKey?: string;
  /** When true, prepend artifact-authoring instructions to the system message. */
  artifactMode?: boolean;
  /** Last-user-message attachments. Images become image_url blocks for vision models. */
  attachments?: AttachmentLike[];
  /** Native function-calling tools (OpenAI format). Passed through to supported providers. */
  tools?: ToolFunction[];
  /** Opt-in Ultra-Capability flags. Server-side primer injection. */
  ultra?: UltraFlags;
}

const ARTIFACT_PRIMER = `
When the user asks you to create something self-contained that benefits from a live preview — a webpage, a UI component, an SVG illustration, a Mermaid diagram, a long-form document, or a substantial piece of code — emit it as a fenced code block whose language tag describes the kind:
  - \`\`\`html ... \`\`\` for complete HTML documents or fragments (sandboxed iframe preview). Tailwind CSS is preloaded — use Tailwind utility classes freely for styling; you may also use <script> and inline <style>.
  - \`\`\`svg ... \`\`\` for SVG illustrations
  - \`\`\`mermaid ... \`\`\` for diagrams
  - \`\`\`markdown ... \`\`\` for long structured documents (supports GFM tables and KaTeX math)
  - \`\`\`jsx ... \`\`\` or \`\`\`tsx ... \`\`\` for React components. Default-export the top-level component (preferably named App). These libraries are available to import: react, lucide-react (icons), recharts (charts), framer-motion (animation), clsx, tailwind-merge, class-variance-authority, date-fns. Tailwind CSS is available for styling. Do NOT import other packages.
  - Any other language tag for plain code (Python, TypeScript, SQL, ...)

Guidance for high quality, like the best AI artifacts:
  - Build complete, polished, production-grade results — realistic sample data, sensible empty/loading states, responsive layout, and accessible markup. Avoid "TODO" placeholders.
  - Prefer one cohesive, substantial artifact over many fragments. Make UIs visually refined (spacing, typography, color, subtle motion).
  - Wrap the block in <artifact identifier="stable-id" type="html|svg|mermaid|markdown|react|code" title="Short title">...</artifact>. Reuse the SAME identifier when revising so the panel versions it in place instead of creating a duplicate.
  - Keep your conversational reply short — explanation outside the artifact, the full content inside it.
`.trim();

export async function POST(req: NextRequest) {
  let body: Body;
  try {
    body = await req.json();
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  if (!body.modelId || !Array.isArray(body.messages) || body.messages.length === 0) {
    return new Response("modelId and messages are required", { status: 400 });
  }

  // Inject artifact primer + Ultra-Capability primers into the leading system message.
  let messages = body.messages;
  const ultraParts: string[] = [];
  if (body.artifactMode) ultraParts.push(ARTIFACT_PRIMER);
  if (body.ultra) {
    const wantBase = body.ultra.base !== false;
    if (wantBase) ultraParts.push(UCL_BASE_PRIMER);
    const m = modePrimer(body.ultra.mode ?? "standard");
    if (m) ultraParts.push(m);
    if (body.ultra.capabilities?.length) {
      const cap = composeCapabilityPrimers(body.ultra.capabilities);
      if (cap) ultraParts.push(cap);
    }
  }
  if (ultraParts.length) {
    const injected = ultraParts.join("\n\n");
    const [first, ...rest] = messages;
    if (first && first.role === "system") {
      const firstText = typeof first.content === "string" ? first.content : "";
      messages = [{ ...first, content: `${firstText}\n\n${injected}` }, ...rest];
    } else {
      messages = [{ role: "system", content: injected }, ...messages];
    }
  }

  // If attachments are supplied AND the model supports vision, convert the LAST user message
  // into OpenAI-style content blocks: text + image_url for each image attachment.
  if (body.attachments && body.attachments.length) {
    const model = findModel(body.modelId);
    const supportsVision = !!model && model.modalities.includes("vision");
    const lastUserIdx = (() => {
      for (let i = messages.length - 1; i >= 0; i--) if (messages[i].role === "user") return i;
      return -1;
    })();
    if (lastUserIdx >= 0) {
      const last = messages[lastUserIdx];
      const textPart = typeof last.content === "string" ? last.content : "";
      const blocks: ContentBlock[] = [];
      if (textPart) blocks.push({ type: "text", text: textPart });

      // Append non-image attachments as plaintext context (always).
      const textBlocks = body.attachments
        .filter((a) => a.kind !== "image" && (a.extractedText || a.data))
        .map((a) => `--- attached: ${a.name} ---\n${(a.extractedText ?? a.data).slice(0, 8000)}\n--- end ---`);
      if (textBlocks.length) blocks.push({ type: "text", text: textBlocks.join("\n\n") });

      if (supportsVision) {
        for (const att of body.attachments) {
          if (att.kind === "image") {
            blocks.push({ type: "image_url", image_url: { url: att.data } });
          }
        }
      } else {
        // Non-vision model — describe the image
        const imgCount = body.attachments.filter((a) => a.kind === "image").length;
        if (imgCount > 0) blocks.push({ type: "text", text: `(${imgCount} image${imgCount === 1 ? "" : "s"} attached but the selected model does not support vision — switch to a vision-capable model to analyze them.)` });
      }

      messages = [...messages];
      messages[lastUserIdx] = { ...last, content: blocks.length === 1 && blocks[0].type === "text" ? blocks[0].text : blocks };
    }
  }

  try {
    const { stream } = await streamChat({
      modelId: body.modelId,
      messages,
      temperature: body.temperature,
      maxTokens: body.maxTokens,
      topP: body.topP,
      frequencyPenalty: body.frequencyPenalty,
      presencePenalty: body.presencePenalty,
      apiKey: body.apiKey,
      tools: body.tools,
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
