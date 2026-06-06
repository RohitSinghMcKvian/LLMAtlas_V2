# LLMAtlas

> The open-source-first workspace for the entire LLM ecosystem.
> Learn it. Research it. Build with it. All in one place — for free.

LLMAtlas is a fully working web app that bundles a multi-model playground, a
side-by-side comparison lab, a model tracker, a cost calculator, a live API
status dashboard, a curated Learn hub, and a local prompt library. Every
feature is powered by **free-tier APIs** from the major open-model providers.

## Features

**Develop**
- 🤖 **Playground** — streaming multi-model chat with temperature / max tokens / top-p controls
- ⚖️ **Compare Lab** — run the same prompt against 2–3 models in parallel with tok/s + TTFT metrics
- 📚 **Prompt library** — save, tag, version, search (localStorage)
- 🔑 **BYOK** — bring your own API keys (stored only in your browser)

**Research**
- 🗂️ **Model tracker** — 153+ models, grid/list view, capability tabs, filterable by vendor / provider / modality
- 💰 **Cost calculator** — compare 153+ free models vs 15 paid anchors (GPT-4.1, Claude 4, Gemini 2.5…) with live sliders
- 📊 **Public leaderboard** — multi-axis composite ranking (quality/speed/context/openness/value) + sortable table + radar
- 🟢 **Live API status** — uptime & latency for every provider, auto-refreshed

**Learn**
- 📖 **Lesson library** — 9 ready lessons (foundations → architecture → production)
- 🛤️ **Learning paths** — Absolute Beginner, Ship to Production, AI Architect
- ✅ **Progress tracking** — local, with completion badges

**UX polish**
- 🌗 Light + dark + system theme
- 🎨 Mesh-gradient hero, marquee, animated counters
- 🪟 Glassy nav, animated sidebar active marker
- 📱 Fully responsive (mobile drawer included)
- ⚡ Token-by-token streaming everywhere

## Supported free providers

### LLM Providers (9)

| Provider | Models | Env Variable | How to get a key |
|---|---|---|---|
| [Groq](https://console.groq.com/keys) | Llama 3.3 70B, Llama 3.1 8B, Mixtral, Gemma 2, DeepSeek R1 | `GROQ_API_KEY` | Free, instant |
| [OpenRouter](https://openrouter.ai/keys) | Gemini Flash, DeepSeek V3, Qwen, Nemotron (30+ free) | `OPENROUTER_API_KEY` | Free credits |
| [Google AI Studio](https://aistudio.google.com/app/apikey) | Gemini 1.5 Flash, Gemini 1.5 Pro | `GOOGLE_AI_API_KEY` | 1500 req/day free |
| [Cerebras](https://cloud.cerebras.ai) | Llama 3.3 70B (record-speed) | `CEREBRAS_API_KEY` | Free tier |
| [Mistral](https://console.mistral.ai/api-keys/) | Mistral Small | `MISTRAL_API_KEY` | Free experimental tier |
| [Hugging Face](https://huggingface.co/settings/tokens) | Zephyr 7B + thousands more | `HUGGINGFACE_API_KEY` | Free inference |
| [Together AI](https://api.together.ai/settings/api-keys) | All open Llama / Qwen / Mixtral | `TOGETHER_API_KEY` | $1 free credits |
| [Cloudflare](https://dash.cloudflare.com/) | Llama 3.1 8B | `CLOUDFLARE_API_KEY` + `CLOUDFLARE_ACCOUNT_ID` | Free Workers AI tier |
| [NVIDIA NIM](https://build.nvidia.com/explore/discover) | Llama 4 Maverick, GPT-OSS 120B/20B, Nemotron Super 49B, Llama 3.3 70B, Qwen3 Next 80B, DeepSeek V4 Flash (13 models) | `NVIDIA_API_KEY` | Free tier |

### Data Services (2)

| Service | Used for | Env Variable | How to get a key |
|---|---|---|---|
| [NewsAPI](https://newsapi.org/register) | Live AI/LLM headlines on dashboard | `NEWSAPI_KEY` | Free developer tier |
| [GitHub](https://github.com/settings/tokens) | Trending AI repos on dashboard | `GITHUB_TOKEN` | No scopes needed for public repos |

## Quick start

```bash
# 1. Install
npm install

# 2. Add API keys (Groq is fastest to set up)
cp .env.example .env.local
# Edit .env.local and paste your keys

# 3. Run
npm run dev
# Open http://localhost:3000
```

You can also leave `.env.local` empty and add keys via **Settings → BYOK** in
the running app — they'll be stored only in your browser.

## Tech stack

- **Next.js 15** (App Router, React 19, Server Components, streaming responses)
- **TypeScript** strict
- **Tailwind CSS** + **shadcn/ui-style** primitives (Radix UI)
- **Framer Motion** for animation
- **Lucide** icons
- **Recharts** for data viz
- **Zustand** for client state, persisted to `localStorage`
- **next-themes** for dark / light / system

Every dependency is open-source and free to use.

## Project structure

```
src/
├── app/
│   ├── page.tsx                    # Landing page
│   ├── layout.tsx                  # Root layout (theme, fonts, toaster)
│   ├── api/
│   │   ├── chat/route.ts           # Streaming chat endpoint
│   │   └── status/route.ts         # Provider uptime checks
│   └── (dashboard)/                # Route group with sidebar layout
│       ├── layout.tsx
│       ├── dashboard/page.tsx      # Overview
│       ├── playground/page.tsx     # Multi-model chat
│       ├── compare/page.tsx        # Side-by-side eval
│       ├── models/page.tsx         # Model tracker
│       ├── calculator/page.tsx     # Cost calculator
│       ├── status/page.tsx         # API status
│       ├── leaderboard/page.tsx    # Public ranking
│       ├── prompts/page.tsx        # Prompt library
│       ├── learn/page.tsx          # Hub
│       ├── learn/[slug]/page.tsx   # Lesson detail
│       ├── learn/path/[slug]/page.tsx
│       └── settings/page.tsx       # BYOK
├── components/
│   ├── ui/                         # Radix-based primitives
│   ├── landing/                    # Marketing sections
│   ├── dashboard/                  # Sidebar, topbar, shell
│   ├── playground/                 # Chat components
│   └── theme-provider.tsx
└── lib/
    ├── models.ts                   # 20+ model catalogue
    ├── providers.ts                # Unified streaming client (8 providers)
    ├── learn-content.ts            # 9 lessons + 3 learning paths
    ├── store.ts                    # Zustand stores
    ├── api-status.ts               # Provider health checks
    └── utils.ts
```

## Deploying

This is a stock Next.js 15 app — deploy anywhere Next.js runs:

- **Vercel** (1-click): `vercel deploy`
- **Cloudflare Pages**: connect repo, framework preset = Next.js
- **Self-hosted**: `npm run build && npm start`

Remember to set the API keys you want available as environment variables on
your host (or rely entirely on BYOK).

## Roadmap

This is the v1 MVP — see `output/LLMAtlas_OpenSourceFirst_BusinessModel.docx`
for the full 24-month roadmap. Highlights from later phases:

- Phase 1: nightly regression testing, custom benchmark builder
- Phase 2: shared workspaces, RBAC, marketplace
- Phase 3: local gateway (Ollama / vLLM), audit log exports, EU AI Act module

## License

MIT — fork it, deploy it, own it.

---

Built with 💙 on the open-source AI stack. Star on GitHub if it helped.
