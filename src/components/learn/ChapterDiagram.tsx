"use client";

import { motion } from "framer-motion";

/**
 * Registry of inline SVG diagrams used by chapters.
 * Reference them in markdown with a fenced code block: ```diagram:<id>```
 */

interface DiagramProps {
  id: string;
}

export function ChapterDiagram({ id }: DiagramProps) {
  const Diagram = REGISTRY[id];
  if (!Diagram) {
    return (
      <div className="rounded-lg border border-dashed border-muted-foreground/30 p-6 text-center text-sm text-muted-foreground">
        Diagram <code className="font-mono">{id}</code> not found
      </div>
    );
  }
  return (
    <motion.figure
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.5 }}
      className="my-8 rounded-2xl border bg-card/30 p-6 shadow-sm"
    >
      <Diagram />
    </motion.figure>
  );
}

const REGISTRY: Record<string, () => React.ReactElement> = {
  tokenizer: TokenizerDiagram,
  "transformer-attention": TransformerAttentionDiagram,
  "embedding-space": EmbeddingSpaceDiagram,
  "rag-pipeline": RagPipelineDiagram,
  "agent-loop": AgentLoopDiagram,
  "moe-routing": MoERoutingDiagram,
  "scaling-laws": ScalingLawsDiagram,
  "cost-vs-quality": CostVsQualityDiagram,
  "lora-vs-full-finetune": LoRADiagram,
  "safety-stack": SafetyStackDiagram,
};

// ─── 1. Tokenizer ────────────────────────────────────────────────────────────
function TokenizerDiagram() {
  const tokens = [
    { text: "The", color: "#0EA5E9", id: 464 },
    { text: " cat", color: "#8B5CF6", id: 3797 },
    { text: " sat", color: "#F59E0B", id: 7731 },
    { text: " on", color: "#10B981", id: 319 },
    { text: " the", color: "#EF4444", id: 262 },
    { text: " mat", color: "#EC4899", id: 2603 },
    { text: ".", color: "#6366F1", id: 13 },
  ];
  return (
    <div>
      <p className="mb-4 text-sm font-medium text-muted-foreground">
        Text → Tokens → Token IDs
      </p>
      <div className="rounded-md bg-muted/40 p-4 font-mono text-lg">
        <span>&quot;The cat sat on the mat.&quot;</span>
      </div>
      <div className="my-3 text-center text-xl text-muted-foreground">↓</div>
      <div className="flex flex-wrap gap-1.5">
        {tokens.map((t, i) => (
          <motion.span
            key={i}
            initial={{ opacity: 0, scale: 0.8 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.06 }}
            style={{ backgroundColor: t.color + "20", borderColor: t.color, color: t.color }}
            className="rounded-md border px-2.5 py-1 font-mono text-sm font-medium"
          >
            {t.text.replace(" ", "·") || "·"}
          </motion.span>
        ))}
      </div>
      <div className="my-3 text-center text-xl text-muted-foreground">↓</div>
      <div className="flex flex-wrap gap-1.5">
        {tokens.map((t, i) => (
          <span
            key={i}
            style={{ color: t.color }}
            className="rounded-md bg-muted/30 px-2.5 py-1 font-mono text-sm font-semibold"
          >
            {t.id}
          </span>
        ))}
      </div>
      <p className="mt-4 text-xs text-muted-foreground">
        Each token (including its leading space) becomes a single integer the model can look up.
      </p>
    </div>
  );
}

// ─── 2. Transformer attention ───────────────────────────────────────────────
function TransformerAttentionDiagram() {
  const tokens = ["The", "cat", "sat", "on", "the", "mat"];
  // attention weights from "sat" -> all tokens
  const weights = [0.12, 0.62, 1.0, 0.18, 0.08, 0.45];
  return (
    <div>
      <p className="mb-4 text-sm font-medium text-muted-foreground">
        Self-attention from <span className="font-mono text-amber-500">sat</span> to all other tokens
      </p>
      <div className="space-y-2">
        {tokens.map((tok, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.08 }}
            className="flex items-center gap-3"
          >
            <span className="w-14 font-mono text-sm font-medium">{tok}</span>
            <div className="flex-1 h-7 rounded-md bg-muted/30 relative overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                whileInView={{ width: `${weights[i] * 100}%` }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 + 0.2, duration: 0.6 }}
                className="h-full rounded-md"
                style={{
                  background:
                    weights[i] > 0.5
                      ? "linear-gradient(90deg, #8B5CF6, #6366F1)"
                      : "linear-gradient(90deg, #4B5563, #6B7280)",
                }}
              />
              <span className="absolute inset-0 flex items-center px-3 text-xs font-mono font-semibold">
                {weights[i].toFixed(2)}
              </span>
            </div>
          </motion.div>
        ))}
      </div>
      <p className="mt-4 text-xs text-muted-foreground">
        For each token, the model computes how much it should &quot;look at&quot; every other token.
        Strong weights are mixed in; weak weights are ignored.
      </p>
    </div>
  );
}

// ─── 3. Embedding space ─────────────────────────────────────────────────────
function EmbeddingSpaceDiagram() {
  // 2D positions for visualization
  const points = [
    { label: "dog", x: 80, y: 200, color: "#F59E0B", cluster: "animal" },
    { label: "cat", x: 110, y: 180, color: "#F59E0B", cluster: "animal" },
    { label: "puppy", x: 95, y: 220, color: "#F59E0B", cluster: "animal" },
    { label: "lion", x: 140, y: 195, color: "#F59E0B", cluster: "animal" },
    { label: "red", x: 320, y: 100, color: "#EF4444", cluster: "color" },
    { label: "blue", x: 350, y: 130, color: "#EF4444", cluster: "color" },
    { label: "green", x: 335, y: 80, color: "#EF4444", cluster: "color" },
    { label: "run", x: 220, y: 280, color: "#10B981", cluster: "verb" },
    { label: "walk", x: 250, y: 295, color: "#10B981", cluster: "verb" },
    { label: "jump", x: 230, y: 250, color: "#10B981", cluster: "verb" },
  ];
  return (
    <div>
      <p className="mb-4 text-sm font-medium text-muted-foreground">
        2D projection of embedding space — similar words cluster
      </p>
      <svg viewBox="0 0 460 360" className="w-full max-h-96 rounded-lg bg-muted/20">
        {/* axes */}
        <line x1="20" y1="340" x2="440" y2="340" stroke="currentColor" strokeOpacity="0.2" />
        <line x1="20" y1="340" x2="20" y2="20" stroke="currentColor" strokeOpacity="0.2" />
        {/* cluster ellipses */}
        <ellipse cx="106" cy="200" rx="55" ry="35" fill="#F59E0B" fillOpacity="0.08" stroke="#F59E0B" strokeOpacity="0.3" strokeDasharray="4 4" />
        <ellipse cx="335" cy="105" rx="40" ry="35" fill="#EF4444" fillOpacity="0.08" stroke="#EF4444" strokeOpacity="0.3" strokeDasharray="4 4" />
        <ellipse cx="233" cy="275" rx="45" ry="32" fill="#10B981" fillOpacity="0.08" stroke="#10B981" strokeOpacity="0.3" strokeDasharray="4 4" />
        {/* cluster labels */}
        <text x="106" y="160" textAnchor="middle" fill="#F59E0B" fontSize="11" fontWeight="600" opacity="0.7">animals</text>
        <text x="335" y="65" textAnchor="middle" fill="#EF4444" fontSize="11" fontWeight="600" opacity="0.7">colours</text>
        <text x="233" y="235" textAnchor="middle" fill="#10B981" fontSize="11" fontWeight="600" opacity="0.7">verbs</text>
        {/* points */}
        {points.map((p, i) => (
          <motion.g
            key={i}
            initial={{ opacity: 0, scale: 0 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.05 }}
          >
            <circle cx={p.x} cy={p.y} r="5" fill={p.color} />
            <text x={p.x + 9} y={p.y + 4} fontSize="11" fill="currentColor" className="font-mono">
              {p.label}
            </text>
          </motion.g>
        ))}
      </svg>
      <p className="mt-4 text-xs text-muted-foreground">
        Meaning becomes geometry. Words near each other in this space share semantic content.
      </p>
    </div>
  );
}

// ─── 4. RAG pipeline ────────────────────────────────────────────────────────
function RagPipelineDiagram() {
  const steps = [
    { label: "User Query", color: "#0EA5E9", icon: "?" },
    { label: "Embed", color: "#8B5CF6", icon: "→" },
    { label: "Search Vectors", color: "#F59E0B", icon: "🔍" },
    { label: "Top-K Chunks", color: "#10B981", icon: "📄" },
    { label: "LLM + Context", color: "#EC4899", icon: "🤖" },
    { label: "Answer", color: "#EF4444", icon: "✓" },
  ];
  return (
    <div>
      <p className="mb-4 text-sm font-medium text-muted-foreground">Retrieval → Augmentation → Generation</p>
      <div className="flex flex-wrap items-center justify-between gap-2">
        {steps.map((s, i) => (
          <>
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
              className="flex flex-col items-center gap-2"
            >
              <div
                className="flex h-14 w-14 items-center justify-center rounded-xl border-2 text-xl font-bold"
                style={{ borderColor: s.color, color: s.color, backgroundColor: s.color + "15" }}
              >
                {s.icon}
              </div>
              <span className="text-xs font-medium text-center max-w-[80px]" style={{ color: s.color }}>
                {s.label}
              </span>
            </motion.div>
            {i < steps.length - 1 && (
              <motion.div
                key={`arrow-${i}`}
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 + 0.2 }}
                className="text-muted-foreground"
              >
                →
              </motion.div>
            )}
          </>
        ))}
      </div>
      <p className="mt-5 text-xs text-muted-foreground">
        Three steps. Each one can be optimised independently — embeddings, vector DB, retrieval, prompt template, generation.
      </p>
    </div>
  );
}

// ─── 5. Agent loop ──────────────────────────────────────────────────────────
function AgentLoopDiagram() {
  return (
    <div>
      <p className="mb-4 text-sm font-medium text-muted-foreground">ReAct Loop: Thought → Action → Observation</p>
      <svg viewBox="0 0 400 280" className="w-full rounded-lg bg-muted/20">
        {/* Loop circle background */}
        <circle cx="200" cy="140" r="100" fill="none" stroke="currentColor" strokeOpacity="0.1" strokeWidth="1" strokeDasharray="4 4" />
        {/* Nodes */}
        <g>
          <circle cx="200" cy="40" r="32" fill="#8B5CF6" fillOpacity="0.15" stroke="#8B5CF6" strokeWidth="2" />
          <text x="200" y="46" textAnchor="middle" fill="#8B5CF6" fontWeight="600" fontSize="13">Thought</text>
        </g>
        <g>
          <circle cx="320" cy="170" r="32" fill="#F59E0B" fillOpacity="0.15" stroke="#F59E0B" strokeWidth="2" />
          <text x="320" y="176" textAnchor="middle" fill="#F59E0B" fontWeight="600" fontSize="13">Action</text>
        </g>
        <g>
          <circle cx="80" cy="170" r="32" fill="#10B981" fillOpacity="0.15" stroke="#10B981" strokeWidth="2" />
          <text x="80" y="170" textAnchor="middle" fill="#10B981" fontWeight="600" fontSize="11">Observe</text>
          <text x="80" y="184" textAnchor="middle" fill="#10B981" fontWeight="600" fontSize="11">result</text>
        </g>
        {/* Arrows */}
        <defs>
          <marker id="arrowhead" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto">
            <polygon points="0 0, 10 3, 0 6" fill="currentColor" opacity="0.6" />
          </marker>
        </defs>
        <path d="M 225 65 Q 290 90 305 145" stroke="currentColor" strokeOpacity="0.5" fill="none" strokeWidth="2" markerEnd="url(#arrowhead)" />
        <path d="M 295 195 Q 200 240 105 195" stroke="currentColor" strokeOpacity="0.5" fill="none" strokeWidth="2" markerEnd="url(#arrowhead)" />
        <path d="M 95 145 Q 110 90 175 65" stroke="currentColor" strokeOpacity="0.5" fill="none" strokeWidth="2" markerEnd="url(#arrowhead)" />
        {/* Center: final */}
        <circle cx="200" cy="140" r="22" fill="#EF4444" fillOpacity="0.15" stroke="#EF4444" strokeWidth="2" />
        <text x="200" y="146" textAnchor="middle" fill="#EF4444" fontWeight="600" fontSize="11">Final</text>
      </svg>
      <p className="mt-4 text-xs text-muted-foreground">
        The model reasons, calls a tool, reads the result, repeats — until it emits a final answer.
      </p>
    </div>
  );
}

// ─── 6. MoE routing ─────────────────────────────────────────────────────────
function MoERoutingDiagram() {
  const experts = Array.from({ length: 8 }, (_, i) => ({
    active: i === 2 || i === 5,
    label: `E${i + 1}`,
  }));
  return (
    <div>
      <p className="mb-4 text-sm font-medium text-muted-foreground">
        Mixture-of-Experts: router picks top-2 of 8 experts per token
      </p>
      <div className="space-y-5">
        {/* Token input */}
        <div className="flex justify-center">
          <div className="rounded-md bg-sky-500/10 border border-sky-500 px-4 py-2 font-mono text-sm font-semibold text-sky-500">
            token: &quot;protein&quot;
          </div>
        </div>
        {/* Router */}
        <div className="flex justify-center">
          <div className="rounded-md bg-violet-500/10 border border-violet-500 px-4 py-2 text-sm font-semibold text-violet-500">
            Router (learned gating network)
          </div>
        </div>
        {/* Arrows down to experts */}
        <div className="grid grid-cols-8 gap-2">
          {experts.map((e, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.05 }}
              className={`rounded-lg p-3 text-center border-2 transition-all ${
                e.active
                  ? "bg-amber-500/20 border-amber-500 shadow-lg shadow-amber-500/20"
                  : "bg-muted/30 border-muted-foreground/20 opacity-40"
              }`}
            >
              <div className={`text-xs font-bold ${e.active ? "text-amber-500" : "text-muted-foreground"}`}>
                {e.label}
              </div>
              <div className={`text-[10px] mt-0.5 ${e.active ? "text-amber-500" : "text-muted-foreground"}`}>
                {e.active ? "ACTIVE" : "idle"}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
      <p className="mt-5 text-xs text-muted-foreground">
        For this token, only 2 of 8 experts run. Total params high; per-token compute low.
      </p>
    </div>
  );
}

// ─── 7. Scaling laws (simplified curve) ─────────────────────────────────────
function ScalingLawsDiagram() {
  // approximate compute vs capability
  const points = [
    { x: 30, y: 280, label: "GPT-2" },
    { x: 90, y: 220, label: "GPT-3" },
    { x: 170, y: 150, label: "GPT-4" },
    { x: 250, y: 110, label: "Reasoning models" },
    { x: 340, y: 85, label: "?" },
  ];
  return (
    <div>
      <p className="mb-4 text-sm font-medium text-muted-foreground">
        Capability vs compute — and the regime shift with reasoning models
      </p>
      <svg viewBox="0 0 420 320" className="w-full rounded-lg bg-muted/20">
        {/* axes */}
        <line x1="40" y1="290" x2="400" y2="290" stroke="currentColor" strokeOpacity="0.3" strokeWidth="1.5" />
        <line x1="40" y1="290" x2="40" y2="20" stroke="currentColor" strokeOpacity="0.3" strokeWidth="1.5" />
        <text x="220" y="312" textAnchor="middle" fontSize="11" fill="currentColor" opacity="0.6">log(Compute)</text>
        <text x="20" y="155" textAnchor="middle" fontSize="11" fill="currentColor" opacity="0.6" transform="rotate(-90 20 155)">Capability</text>
        {/* curve - smooth path through points */}
        <motion.path
          initial={{ pathLength: 0 }}
          whileInView={{ pathLength: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 1.5, ease: "easeOut" }}
          d="M 30 280 Q 60 250, 90 220 T 170 150 Q 200 130, 250 110 T 340 85"
          fill="none"
          stroke="#8B5CF6"
          strokeWidth="3"
          strokeLinecap="round"
        />
        {/* points */}
        {points.map((p, i) => (
          <motion.g
            key={i}
            initial={{ opacity: 0, scale: 0 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.2 + 0.5 }}
          >
            <circle cx={p.x} cy={p.y} r="6" fill="#8B5CF6" />
            <text x={p.x + 12} y={p.y - 8} fontSize="11" fill="currentColor" fontWeight="500">
              {p.label}
            </text>
          </motion.g>
        ))}
        {/* regime shift annotation */}
        <line x1="210" y1="20" x2="210" y2="290" stroke="#F59E0B" strokeWidth="1" strokeDasharray="6 4" opacity="0.6" />
        <text x="215" y="35" fontSize="10" fill="#F59E0B" fontWeight="500">RL on reasoning</text>
      </svg>
      <p className="mt-4 text-xs text-muted-foreground">
        Old laws: more compute → smooth capability gains. New regime: training on RL with verifiable rewards unlocks step-changes.
      </p>
    </div>
  );
}

// ─── 8. Cost vs Quality ────────────────────────────────────────────────────
function CostVsQualityDiagram() {
  const models = [
    { name: "Llama 3.3 70B (Groq)", x: 5, y: 80, color: "#0EA5E9" },
    { name: "Gemini 2.5 Flash", x: 15, y: 84, color: "#10B981" },
    { name: "DeepSeek V3", x: 30, y: 86, color: "#8B5CF6" },
    { name: "Claude 4 Haiku", x: 50, y: 87, color: "#EC4899" },
    { name: "GPT-4.1 mini", x: 60, y: 89, color: "#F59E0B" },
    { name: "Claude 4 Sonnet", x: 110, y: 92, color: "#6366F1" },
    { name: "Gemini 2.5 Pro", x: 90, y: 93, color: "#10B981" },
    { name: "GPT-4.1", x: 140, y: 93, color: "#F59E0B" },
    { name: "Claude 4 Opus", x: 280, y: 95, color: "#6366F1" },
    { name: "o3", x: 320, y: 96, color: "#EF4444" },
  ];
  // pareto frontier line - just use the convex hull approximation
  return (
    <div>
      <p className="mb-4 text-sm font-medium text-muted-foreground">
        Cost vs Quality — the Pareto frontier of frontier models
      </p>
      <svg viewBox="0 0 420 280" className="w-full rounded-lg bg-muted/20">
        <line x1="40" y1="240" x2="400" y2="240" stroke="currentColor" strokeOpacity="0.3" />
        <line x1="40" y1="240" x2="40" y2="20" stroke="currentColor" strokeOpacity="0.3" />
        <text x="220" y="262" textAnchor="middle" fontSize="11" fill="currentColor" opacity="0.6">
          Relative cost ($/1M output)
        </text>
        <text x="18" y="135" textAnchor="middle" fontSize="11" fill="currentColor" opacity="0.6" transform="rotate(-90 18 135)">
          Quality
        </text>
        {/* frontier curve */}
        <path
          d="M 45 165 Q 100 70 200 50 Q 300 38 380 36"
          fill="none"
          stroke="#10B981"
          strokeOpacity="0.4"
          strokeWidth="2"
          strokeDasharray="4 4"
        />
        {models.map((m, i) => (
          <motion.g
            key={i}
            initial={{ opacity: 0, scale: 0 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.06 }}
          >
            <circle cx={45 + m.x} cy={240 - (m.y - 75) * 8} r="5" fill={m.color} />
            <text x={45 + m.x + 8} y={240 - (m.y - 75) * 8 + 3} fontSize="9" fill="currentColor" opacity="0.8">
              {m.name}
            </text>
          </motion.g>
        ))}
      </svg>
      <p className="mt-4 text-xs text-muted-foreground">
        The frontier (dashed) is where quality scales with cost. Models below the frontier are dominated — pick the model on the frontier that matches your quality bar.
      </p>
    </div>
  );
}

// ─── 9. LoRA vs full fine-tune ─────────────────────────────────────────────
function LoRADiagram() {
  return (
    <div>
      <p className="mb-4 text-sm font-medium text-muted-foreground">
        Full fine-tuning vs LoRA — same outcome, very different cost
      </p>
      <div className="grid grid-cols-2 gap-6">
        {/* Full FT */}
        <div className="rounded-lg border-2 border-rose-500/40 bg-rose-500/5 p-5 space-y-3">
          <h4 className="text-sm font-bold text-rose-500">Full fine-tuning</h4>
          <div className="space-y-2">
            <div className="h-3 rounded bg-rose-500/30 w-full" />
            <div className="h-3 rounded bg-rose-500/30 w-full" />
            <div className="h-3 rounded bg-rose-500/30 w-full" />
            <div className="h-3 rounded bg-rose-500/30 w-full" />
          </div>
          <p className="text-xs text-muted-foreground">All weights updated</p>
          <ul className="text-xs space-y-1 text-rose-500">
            <li>• 8× GPU memory</li>
            <li>• Hours to days of training</li>
            <li>• Catastrophic forgetting risk</li>
          </ul>
        </div>
        {/* LoRA */}
        <div className="rounded-lg border-2 border-emerald-500/40 bg-emerald-500/5 p-5 space-y-3">
          <h4 className="text-sm font-bold text-emerald-500">LoRA</h4>
          <div className="space-y-2">
            <div className="h-3 rounded bg-muted/40 w-full opacity-60" />
            <div className="h-3 rounded bg-muted/40 w-full opacity-60" />
            <div className="flex gap-1">
              <div className="h-3 rounded bg-emerald-500 w-2" />
              <div className="h-3 rounded bg-muted/40 flex-1 opacity-60" />
            </div>
            <div className="flex gap-1">
              <div className="h-3 rounded bg-emerald-500 w-2" />
              <div className="h-3 rounded bg-muted/40 flex-1 opacity-60" />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">Base frozen + tiny adapters trained</p>
          <ul className="text-xs space-y-1 text-emerald-500">
            <li>• 1× GPU memory</li>
            <li>• Minutes to hours</li>
            <li>• Adapters swappable</li>
          </ul>
        </div>
      </div>
      <p className="mt-4 text-xs text-muted-foreground">
        LoRA freezes the giant pre-trained model and learns small low-rank adapters (red) — 100× faster, no quality loss.
      </p>
    </div>
  );
}

// ─── 10. Safety stack ──────────────────────────────────────────────────────
function SafetyStackDiagram() {
  const layers = [
    { label: "Provider safety filter", color: "#0EA5E9", width: "100%" },
    { label: "System prompt hardening", color: "#8B5CF6", width: "88%" },
    { label: "Input classification", color: "#F59E0B", width: "76%" },
    { label: "Output classification", color: "#10B981", width: "64%" },
    { label: "Action authorization", color: "#EF4444", width: "52%" },
  ];
  return (
    <div>
      <p className="mb-4 text-sm font-medium text-muted-foreground">
        Defence in depth — each layer catches what the others miss
      </p>
      <div className="flex flex-col items-center gap-1.5">
        {layers.map((l, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: -10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.08 }}
            style={{
              width: l.width,
              backgroundColor: l.color + "20",
              borderColor: l.color,
              color: l.color,
            }}
            className="rounded-lg border-2 px-4 py-2.5 text-center text-sm font-semibold"
          >
            {l.label}
          </motion.div>
        ))}
        <div className="mt-3 rounded-full bg-amber-500/20 border-2 border-amber-500 px-5 py-2 text-xs font-bold text-amber-500">
          🎯 Actual user request
        </div>
      </div>
      <p className="mt-5 text-xs text-muted-foreground">
        An attack has to bypass every layer to cause harm. Each layer is imperfect alone; stacked they catch nearly everything.
      </p>
    </div>
  );
}
