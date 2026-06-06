// Curated learning content for the Learn pillar.
// Each lesson is short, practical, and links naturally into Research / Develop.

export interface Lesson {
  slug: string;
  title: string;
  level: "Beginner" | "Intermediate" | "Advanced";
  minutes: number;
  category: string;
  summary: string;
  content: string; // markdown
  tags: string[];
}

export interface LearningPath {
  slug: string;
  title: string;
  description: string;
  icon: string; // lucide icon name
  color: string;
  lessons: string[]; // lesson slugs
}

export const LESSONS: Lesson[] = [
  {
    slug: "what-is-an-llm",
    title: "What is a Large Language Model?",
    level: "Beginner",
    minutes: 6,
    category: "Foundations",
    summary: "Start here. The 60-second mental model for what an LLM actually is.",
    tags: ["intro", "concept"],
    content: `# What is a Large Language Model?

A **Large Language Model (LLM)** is a neural network trained to predict the next word — given a sequence of words. That's it. Everything else — chat, code, reasoning, summarisation — emerges from doing that prediction extremely well, at very large scale.

## The three ideas you need

1. **Tokens** — LLMs don't see characters or words. They see **tokens** (subword pieces). The word "unbelievable" might be three tokens: \`un\`, \`believ\`, \`able\`. Models charge per token and have a maximum **context window** measured in tokens.

2. **Parameters** — These are the learned weights. A 7B model has 7 billion of them. More parameters generally mean more capability, but also more cost.

3. **Context window** — How much text the model can consider at once. Tiny: 4K (an essay). Modern: 128K (a novella). Frontier: 1M+ (a small codebase).

## Why "Large"?

Three scaling axes drive capability:
- Model size (parameters)
- Training data (tokens seen)
- Compute (FLOPs spent training)

The "scaling laws" discovered by OpenAI and DeepMind showed that loss decreases predictably as you push all three. That single insight launched the modern era of AI.

## What's next

In the next lesson we'll look at **how to choose** a model from the 1,000+ available — the same problem LLMAtlas was built to solve.
`,
  },
  {
    slug: "choosing-a-model",
    title: "How to Choose a Model",
    level: "Beginner",
    minutes: 8,
    category: "Foundations",
    summary: "A practical framework: cost, latency, quality, context, compliance.",
    tags: ["selection", "framework"],
    content: `# How to Choose a Model

There are over 1,000 publicly tracked LLMs. You will never benchmark all of them. Use this five-axis framework instead.

## The five axes

| Axis | Question | Where it matters |
|---|---|---|
| **Cost** | $ per million tokens? | High-volume apps |
| **Latency** | Tokens/sec, time-to-first-token? | User-facing chat |
| **Quality** | MMLU / GSM8K / your eval? | Anything quality-sensitive |
| **Context** | How much text can it hold? | Long docs, RAG |
| **Compliance** | Where does data go? | Regulated industries |

## The shortlist heuristic

> Pick **3 candidates**, run **5 of your real prompts** through each, and rate the outputs 1-5. The winner of *your* eval is the winner. Public benchmarks are a starting point, not a verdict.

## When in doubt

- **Need it free, fast, and good?** → Llama 3.3 70B via Groq.
- **Need long context?** → Gemini 1.5 Flash (1M tokens, free).
- **Need top-tier reasoning?** → DeepSeek V3 or R1 distills.
- **Need code?** → Qwen 2.5 Coder 32B.

Open the **Comparison Lab** to test any three of these on your prompts in under a minute.
`,
  },
  {
    slug: "prompt-engineering-101",
    title: "Prompt Engineering 101",
    level: "Beginner",
    minutes: 10,
    category: "Prompting",
    summary: "The seven moves that account for 80% of good prompts.",
    tags: ["prompting", "practice"],
    content: `# Prompt Engineering 101

Forget tricks. There are seven core moves. Master these and you'll outperform most "prompt engineers."

## The seven moves

1. **Be specific about the output format.**  Don't say "summarize this" — say "summarize this in 3 bullet points, each under 15 words."
2. **Give examples (few-shot).**  Two or three input→output examples beats any amount of explanation.
3. **State the role.**  "You are a senior financial analyst." gives the model a persona to perform.
4. **Decompose.**  Break complex tasks into steps. Ask the model to "think step by step" or use explicit numbered subtasks.
5. **Show, don't tell.**  Paste an example of "good" — the model will reverse-engineer it.
6. **Constrain.**  "Reply in valid JSON matching this schema: {...}" cuts hallucinations dramatically.
7. **Iterate.**  Your first prompt is a draft. Refine based on the actual output.

## A complete template

\`\`\`
ROLE: You are an experienced [persona].
TASK: [single sentence].
INPUT: [the data].
OUTPUT FORMAT:
- [constraint 1]
- [constraint 2]
EXAMPLES:
Input: ...
Output: ...
\`\`\`

Try this template on any task in the Playground. The improvement over a one-liner is usually dramatic.
`,
  },
  {
    slug: "rag-explained",
    title: "Retrieval-Augmented Generation (RAG)",
    level: "Intermediate",
    minutes: 12,
    category: "Architectures",
    summary: "Give an LLM external knowledge without retraining it.",
    tags: ["rag", "vector", "architecture"],
    content: `# Retrieval-Augmented Generation (RAG)

LLMs forget. They also hallucinate. RAG is the architecture that solves both, and it's the single most-deployed AI pattern in production today.

## The pipeline (4 steps)

1. **Chunk** — split your documents into small pieces (~500 tokens each).
2. **Embed** — turn each chunk into a vector using an embedding model.
3. **Retrieve** — at query time, embed the user's question and find the top-k nearest chunks via cosine similarity.
4. **Generate** — pass those chunks as context to the LLM along with the question.

## Why it works

The LLM doesn't need to *know* the answer — it just needs the relevant text in its context window. This shifts the hard problem from training to retrieval, and retrieval is much cheaper.

## Common pitfalls

- **Bad chunking** — splitting in the middle of a sentence destroys meaning. Use semantic chunking or overlap.
- **Wrong embedding model** — use one trained on similar data (e.g., \`nomic-embed-text\` for English, multilingual ones for other languages).
- **No re-ranking** — the top-k from cosine similarity isn't always optimal. A cheap re-ranker (e.g., a cross-encoder) on the top-50 → top-5 dramatically improves quality.

## Try it

Open the Playground, paste a long document into the system prompt, and ask questions. You've just simulated RAG by hand.
`,
  },
  {
    slug: "agents-and-tool-use",
    title: "Agents & Tool Use",
    level: "Intermediate",
    minutes: 14,
    category: "Architectures",
    summary: "When the LLM stops talking and starts doing.",
    tags: ["agents", "tools", "architecture"],
    content: `# Agents & Tool Use

An **agent** is an LLM that can call functions. That single capability — calling code — turns a chatbot into a programmable system.

## The loop

\`\`\`
while not done:
  1. LLM looks at conversation + available tools
  2. LLM decides: respond, OR call a tool
  3. If tool call: run it, append result to conversation
  4. Else: return final answer
\`\`\`

## Why it's powerful

- **Real data.** The LLM can call \`get_weather()\` instead of guessing.
- **Real actions.** It can send an email, book a meeting, file a PR.
- **Long horizons.** It can run for hours, decomposing a goal into many tool calls.

## Why it's dangerous

- **Loops.** Agents get stuck repeating themselves. Always set a step budget.
- **Hallucinated tool calls.** Validate every argument before executing.
- **Cost explosion.** Each step is another LLM call. A 50-step agent on a paid model isn't free.

## Patterns

- **ReAct** (Reason + Act) — the OG pattern; the LLM verbalises its plan, then acts.
- **Plan-and-Execute** — generate the full plan up front, then execute deterministically.
- **Multi-agent** — multiple specialised agents (planner, coder, critic) that hand work off.

Most production agents are simpler than the hype. They usually have 3-5 tools and a tight loop budget.
`,
  },
  {
    slug: "evaluation-and-evals",
    title: "Evaluation: Stop Vibing, Start Measuring",
    level: "Intermediate",
    minutes: 11,
    category: "Evaluation",
    summary: "If you can't measure it, you can't ship it.",
    tags: ["evals", "production"],
    content: `# Evaluation: Stop Vibing, Start Measuring

The single biggest reason AI features fail in production is the lack of evals. "Vibe checking" works for demos and dies in scale.

## The eval stack

1. **A golden dataset** — 20-200 representative inputs with expected outputs.
2. **A grader** — code (regex / JSON match), another LLM, or a human.
3. **A baseline** — what's the score *today* on your current model?
4. **A regression loop** — re-run when you change the prompt or model.

## Types of graders

- **Exact match** — for structured outputs (JSON, code).
- **LLM-as-judge** — a stronger model rates the response 1-5 with a rubric.
- **Embedding similarity** — for "is this semantically close enough?"
- **Human** — slow but the gold standard. Use sparingly to calibrate the others.

## Custom benchmarks in LLMAtlas

Upload a CSV of \`{input, expected}\` pairs. Pick three candidate models. Run. Get a scored leaderboard. The whole loop takes a few minutes and gives you a defensible answer to "which model should we use?"
`,
  },
  {
    slug: "fine-tuning-vs-prompting",
    title: "Fine-Tuning vs Prompting vs RAG",
    level: "Advanced",
    minutes: 9,
    category: "Production",
    summary: "When to reach for which tool.",
    tags: ["fine-tune", "decision"],
    content: `# Fine-Tuning vs Prompting vs RAG

A common (and expensive) mistake: jumping to fine-tuning before exhausting cheaper options. Decision tree:

\`\`\`
Does the model already know the answer?
├── Yes → Better prompting
└── No  → Does it need facts that change?
         ├── Yes → RAG
         └── No  → Does it need a new skill or style?
                  ├── Yes → Fine-tuning (LoRA first, full only if needed)
                  └── No  → Reconsider — maybe a different base model
\`\`\`

## Rough costs

| Approach | Setup | Per-request | Maintenance |
|---|---|---|---|
| Prompting | $0 | Inference only | None |
| RAG | $50-$500 | Inference + retrieval | Re-index when data changes |
| Fine-tuning (LoRA) | $20-$2,000 | Inference (slightly higher) | Re-tune when base model deprecates |

## A pragmatic order

1. **Try harder on the prompt.** A great prompt closes 70% of the gap.
2. **Add RAG.** If the gap is factual, retrieval almost always wins.
3. **Switch base models.** Sometimes a bigger or different model already does what you want.
4. **Then consider fine-tuning.** And start with LoRA — full fine-tuning is rarely worth it.
`,
  },
  {
    slug: "tokens-cost-budget",
    title: "Tokens, Cost, and Budget Anxiety",
    level: "Beginner",
    minutes: 7,
    category: "Foundations",
    summary: "Demystify pricing. Build a back-of-napkin cost model in 5 minutes.",
    tags: ["cost", "tokens", "budget"],
    content: `# Tokens, Cost, and Budget Anxiety

Token math is the most useful spreadsheet skill in AI. Five minutes here saves five-figure surprises later.

## The formula

\`\`\`
monthly_cost = (avg_input_tokens × in_price + avg_output_tokens × out_price)
               × requests_per_user × users × 30
               / 1,000,000
\`\`\`

## A realistic example

- 1,000 daily users
- 5 requests/user/day
- 800 input + 400 output tokens per request
- Model: Llama 3.3 70B on Groq (\`$0 / $0\` — free tier) → **$0**
- Same workload on GPT-4o (\`$2.50 / $10\`) → **$510/month**

That's the open-source-first thesis in one calculation.

## Tactics to reduce cost

1. **Use the smallest model that passes your evals** — not the biggest you can afford.
2. **Cache aggressively.** Anthropic and Google both support prompt caching now.
3. **Shorten outputs.** "Reply in 50 words" is real money.
4. **Truncate context.** Don't pass the entire conversation forever — summarise older turns.

Try the **Cost Calculator** in LLMAtlas with your real numbers — it does this math live across 20+ models.
`,
  },
  {
    slug: "open-source-stack",
    title: "The Open-Source AI Stack",
    level: "Intermediate",
    minutes: 10,
    category: "Production",
    summary: "Everything you need is free. Here's the map.",
    tags: ["oss", "infra", "stack"],
    content: `# The Open-Source AI Stack

You can build a production AI app today without spending a cent — on free tiers and open-source software. Here's the stack we use to power LLMAtlas itself.

## Models (free APIs)
- **Groq** — fastest Llama 3.3 70B inference on the planet
- **OpenRouter** — gateway to 30+ free model variants
- **Google AI Studio** — Gemini 1.5 Flash, 1500 free requests/day
- **Cerebras** — Llama 3.3 70B at record speeds
- **Cloudflare Workers AI** — edge-deployed at zero cost

## Local & self-hosted
- **Ollama** — one-line install, runs Llama / Qwen / Phi locally
- **vLLM** — production-grade serving for self-hosted
- **llama.cpp** — CPU/GPU inference, even on a laptop

## Embeddings & vector search
- **Nomic Embed** & **BGE** — open embedding models
- **pgvector** — Postgres extension, free with Supabase
- **ChromaDB / Qdrant** — open vector DBs

## App framework
- **Next.js + Tailwind + shadcn/ui** — what LLMAtlas runs on
- **LangChain / LlamaIndex** — orchestration
- **Promptfoo / DeepEval** — evals

## Hosting
- **Vercel** — generous free tier
- **Cloudflare** — free CDN + Workers
- **Supabase / Neon** — free Postgres tiers

Total cost to launch a real AI app: **$0**.
`,
  },
];

export const PATHS: LearningPath[] = [
  {
    slug: "absolute-beginner",
    title: "Absolute Beginner",
    description: "Never written a prompt? Start here. Three short lessons.",
    icon: "Sparkles",
    color: "#0EA5E9",
    lessons: ["what-is-an-llm", "tokens-cost-budget", "prompt-engineering-101"],
  },
  {
    slug: "production-ready",
    title: "Ship to Production",
    description: "Take an AI feature from prototype to mission-critical.",
    icon: "Rocket",
    color: "#8B5CF6",
    lessons: ["choosing-a-model", "evaluation-and-evals", "rag-explained", "tokens-cost-budget"],
  },
  {
    slug: "architect",
    title: "AI Architect",
    description: "Design end-to-end systems with RAG, agents, and evals.",
    icon: "Layers",
    color: "#F59E0B",
    lessons: ["rag-explained", "agents-and-tool-use", "fine-tuning-vs-prompting", "open-source-stack"],
  },
];

export function getLesson(slug: string): Lesson | undefined {
  return LESSONS.find((l) => l.slug === slug);
}

export function getPath(slug: string): LearningPath | undefined {
  return PATHS.find((p) => p.slug === slug);
}
