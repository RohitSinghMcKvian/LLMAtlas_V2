"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { nanoid } from "nanoid";
import type { ProviderId } from "./models";
import { LEVELS, makeSerial, type EarnedCertificate, type LevelSlug } from "./curriculum";

// -------- prompt library ---------------------------------------------------
export interface SavedPrompt {
  id: string;
  title: string;
  content: string;
  tags: string[];
  createdAt: number;
  updatedAt: number;
}

interface PromptStore {
  prompts: SavedPrompt[];
  save: (input: { title: string; content: string; tags?: string[] }) => SavedPrompt;
  update: (id: string, patch: Partial<Omit<SavedPrompt, "id" | "createdAt">>) => void;
  remove: (id: string) => void;
}

export const usePromptStore = create<PromptStore>()(
  persist(
    (set) => ({
      prompts: [],
      save: ({ title, content, tags = [] }) => {
        const now = Date.now();
        const p: SavedPrompt = { id: nanoid(8), title, content, tags, createdAt: now, updatedAt: now };
        set((s) => ({ prompts: [p, ...s.prompts] }));
        return p;
      },
      update: (id, patch) =>
        set((s) => ({
          prompts: s.prompts.map((p) =>
            p.id === id ? { ...p, ...patch, updatedAt: Date.now() } : p,
          ),
        })),
      remove: (id) => set((s) => ({ prompts: s.prompts.filter((p) => p.id !== id) })),
    }),
    { name: "llmatlas-prompts", storage: createJSONStorage(() => localStorage) },
  ),
);

// -------- learning progress ------------------------------------------------
interface ProgressStore {
  completed: Record<string, number>; // slug -> timestamp
  complete: (slug: string) => void;
  reset: () => void;
}

export const useProgressStore = create<ProgressStore>()(
  persist(
    (set) => ({
      completed: {},
      complete: (slug) =>
        set((s) => ({ completed: { ...s.completed, [slug]: Date.now() } })),
      reset: () => set({ completed: {} }),
    }),
    { name: "llmatlas-progress", storage: createJSONStorage(() => localStorage) },
  ),
);

// -------- MCP servers (Atlas Brain external tools) -------------------------
/** A Model Context Protocol server the agent can pull tools from. */
export interface McpServerConfig {
  id: string;
  /** Display name, also used to namespace tools: mcp__<name>__<tool>. */
  name: string;
  /** Streamable-HTTP / SSE endpoint URL (remote MCP server). */
  url: string;
  /** Optional Authorization header value, e.g. "Bearer sk-…". Sent server-side only. */
  authHeader?: string;
  enabled: boolean;
  createdAt: number;
}

// -------- Web tools (Atlas Brain real-world reach) -------------------------
export type WebSearchProvider = "duckduckgo" | "tavily" | "brave" | "searxng";

/** Config for the agent's web_search / fetch_url / browse tools. */
export interface WebToolsConfig {
  /** Master switch — registers web_search + fetch_url when on. */
  enabled: boolean;
  searchProvider: WebSearchProvider;
  /** Optional provider keys (sent server-side only; DuckDuckGo needs none). */
  tavilyKey?: string;
  braveKey?: string;
  searxngUrl?: string;
  /** Registers the (heavier) browse tool; needs an external Playwright service. */
  browseEnabled: boolean;
  browseServiceUrl?: string;
}

export const DEFAULT_WEB_TOOLS: WebToolsConfig = {
  enabled: false,
  searchProvider: "duckduckgo",
  browseEnabled: false,
};

// -------- BYOK settings ----------------------------------------------------
interface SettingsStore {
  keys: Partial<Record<ProviderId, string>>;
  setKey: (provider: ProviderId, key: string) => void;
  clearKey: (provider: ProviderId) => void;
  defaultModel: string;
  setDefaultModel: (id: string) => void;
  mcpServers: McpServerConfig[];
  addMcpServer: (input: { name: string; url: string; authHeader?: string }) => McpServerConfig;
  updateMcpServer: (id: string, patch: Partial<Omit<McpServerConfig, "id" | "createdAt">>) => void;
  removeMcpServer: (id: string) => void;
  webTools: WebToolsConfig;
  setWebTools: (patch: Partial<WebToolsConfig>) => void;
}

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set) => ({
      keys: {},
      setKey: (provider, key) =>
        set((s) => ({ keys: { ...s.keys, [provider]: key } })),
      clearKey: (provider) =>
        set((s) => {
          const next = { ...s.keys };
          delete next[provider];
          return { keys: next };
        }),
      defaultModel: "groq-llama-3.3-70b",
      setDefaultModel: (id) => set({ defaultModel: id }),
      mcpServers: [],
      addMcpServer: ({ name, url, authHeader }) => {
        const server: McpServerConfig = {
          id: nanoid(8),
          name: name.trim(),
          url: url.trim(),
          authHeader: authHeader?.trim() || undefined,
          enabled: true,
          createdAt: Date.now(),
        };
        set((s) => ({ mcpServers: [...s.mcpServers, server] }));
        return server;
      },
      updateMcpServer: (id, patch) =>
        set((s) => ({
          mcpServers: s.mcpServers.map((m) => (m.id === id ? { ...m, ...patch } : m)),
        })),
      removeMcpServer: (id) =>
        set((s) => ({ mcpServers: s.mcpServers.filter((m) => m.id !== id) })),
      webTools: DEFAULT_WEB_TOOLS,
      setWebTools: (patch) => set((s) => ({ webTools: { ...s.webTools, ...patch } })),
    }),
    { name: "llmatlas-settings", storage: createJSONStorage(() => localStorage) },
  ),
);

// -------- learn (curriculum) progress: quizzes + certificates -------------
export interface QuizResult {
  score: number;       // 0..1
  total: number;       // number of questions
  passedAt: number;    // timestamp first passed
  bestAt: number;      // timestamp of best score
}

interface LearnStore {
  learnerName: string;
  setLearnerName: (name: string) => void;
  quizPassed: Record<string, QuizResult>; // chapterSlug -> result
  recordQuiz: (chapterSlug: string, score: number, total: number) => void;
  certificates: EarnedCertificate[];
  awardCertificate: (levelSlug: LevelSlug | "master") => EarnedCertificate | null;
  hasCertificate: (levelSlug: LevelSlug | "master") => boolean;
  isLevelComplete: (levelSlug: LevelSlug) => boolean;
  isCurriculumComplete: () => boolean;
  resetLearn: () => void;
}

export const useLearnStore = create<LearnStore>()(
  persist(
    (set, get) => ({
      learnerName: "",
      setLearnerName: (name) => set({ learnerName: name.trim() }),
      quizPassed: {},
      recordQuiz: (chapterSlug, score, total) =>
        set((s) => {
          const previous = s.quizPassed[chapterSlug];
          const now = Date.now();
          // Only record if score is a pass (≥70%) AND better than prior
          if (score / total < 0.7) return s;
          if (previous && previous.score >= score / total) {
            return s; // keep previous
          }
          return {
            quizPassed: {
              ...s.quizPassed,
              [chapterSlug]: {
                score: score / total,
                total,
                passedAt: previous?.passedAt ?? now,
                bestAt: now,
              },
            },
          };
        }),
      certificates: [],
      hasCertificate: (levelSlug) => get().certificates.some((c) => c.levelSlug === levelSlug),
      awardCertificate: (levelSlug) => {
        if (get().hasCertificate(levelSlug)) return null;
        const cert: EarnedCertificate = {
          levelSlug,
          earnedAt: Date.now(),
          serial: makeSerial(),
        };
        set((s) => ({ certificates: [...s.certificates, cert] }));
        return cert;
      },
      isLevelComplete: (levelSlug) => {
        const level = LEVELS.find((l) => l.slug === levelSlug);
        if (!level) return false;
        const { quizPassed } = get();
        return level.chapters.every((c) => quizPassed[c.slug] !== undefined);
      },
      isCurriculumComplete: () => {
        const { quizPassed } = get();
        return LEVELS.every((l) => l.chapters.every((c) => quizPassed[c.slug] !== undefined));
      },
      resetLearn: () => set({ learnerName: "", quizPassed: {}, certificates: [] }),
    }),
    {
      name: "llmatlas-learn",
      storage: createJSONStorage(() => localStorage),
    },
  ),
);

// -------- chat history (in-memory only for now) ----------------------------
export interface ChatTurn {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  modelId?: string;
  tokens?: number;
  latencyMs?: number;
  createdAt: number;
}

// -------- artifact store ---------------------------------------------------
export type ArtifactKind =
  | "html"
  | "react"
  | "svg"
  | "mermaid"
  | "markdown"
  | "code"
  // Ultra-Capability renderers (PDF, charts, 3D, audio, maps, spreadsheets…)
  | "pdf"
  | "chart"
  | "three"
  | "audio"
  | "map"
  | "spreadsheet"
  | "mindmap"
  | "whiteboard";

export interface ArtifactVersion {
  id: string;
  content: string;
  language?: string;
  createdAt: number;
}

export interface Artifact {
  id: string;
  title: string;
  kind: ArtifactKind;
  /** Optional language hint when kind is "code". */
  language?: string;
  /** Stable identity across regenerations — e.g. extracted from <artifact id="..."> or the fenced-block hash. */
  externalId?: string;
  conversationId?: string;
  messageId?: string;
  versions: ArtifactVersion[];
  createdAt: number;
  updatedAt: number;
}

interface StreamPushInput {
  externalId?: string;
  title: string;
  kind: ArtifactKind;
  language?: string;
  content: string;
  messageId?: string;
  conversationId?: string;
}

interface ArtifactStore {
  artifacts: Artifact[];
  openId: string | null;
  /** Transient: externalId -> artifactId for artifacts owned by the in-flight stream. Not persisted. */
  streamingOwned: Record<string, string>;
  open: (id: string | null) => void;
  upsert: (input: {
    externalId?: string;
    title: string;
    kind: ArtifactKind;
    language?: string;
    content: string;
    messageId?: string;
    conversationId?: string;
  }) => Artifact;
  /** Reset stream ownership at the start of an assistant turn. */
  beginStream: () => void;
  /**
   * Streaming upsert. The first push for an externalId this turn creates a new
   * artifact (or appends one version to an existing artifact, preserving prior
   * history); subsequent pushes update that version *in place* — so a long build
   * renders live without spamming version history.
   */
  streamPush: (input: StreamPushInput) => Artifact;
  addVersion: (id: string, content: string, language?: string) => void;
  remove: (id: string) => void;
  clear: () => void;
  byMessage: (messageId: string) => Artifact[];
}

export const useArtifactStore = create<ArtifactStore>()(
  persist(
    (set, get) => ({
      artifacts: [],
      openId: null,
      streamingOwned: {},
      open: (id) => set({ openId: id }),
      beginStream: () => set({ streamingOwned: {} }),
      streamPush: ({ externalId, title, kind, language, content, messageId, conversationId }) => {
        const now = Date.now();
        const owned = externalId ? get().streamingOwned[externalId] : undefined;

        // Subsequent push for an artifact already being streamed this turn → update last version in place.
        if (owned) {
          let updated: Artifact | undefined;
          set((s) => ({
            artifacts: s.artifacts.map((a) => {
              if (a.id !== owned) return a;
              const versions = a.versions.slice();
              const last = versions[versions.length - 1];
              versions[versions.length - 1] = { ...last, content, language: language ?? last.language };
              updated = { ...a, language: language ?? a.language, versions, updatedAt: now };
              return updated;
            }),
          }));
          return updated ?? get().artifacts.find((a) => a.id === owned)!;
        }

        const existing = externalId ? get().artifacts.find((a) => a.externalId === externalId) : undefined;

        // First push this turn for an existing artifact → append a fresh version we'll keep updating.
        if (existing) {
          const version: ArtifactVersion = { id: nanoid(8), content, language, createdAt: now };
          const updated: Artifact = {
            ...existing,
            language: language ?? existing.language,
            versions: [...existing.versions, version],
            updatedAt: now,
          };
          set((s) => ({
            artifacts: s.artifacts.map((a) => (a.id === existing.id ? updated : a)),
            streamingOwned: externalId ? { ...s.streamingOwned, [externalId]: existing.id } : s.streamingOwned,
          }));
          return updated;
        }

        // Brand-new artifact.
        const artifact: Artifact = {
          id: nanoid(10),
          externalId,
          title,
          kind,
          language,
          conversationId,
          messageId,
          versions: [{ id: nanoid(8), content, language, createdAt: now }],
          createdAt: now,
          updatedAt: now,
        };
        set((s) => ({
          artifacts: [artifact, ...s.artifacts],
          streamingOwned: externalId ? { ...s.streamingOwned, [externalId]: artifact.id } : s.streamingOwned,
        }));
        return artifact;
      },
      upsert: ({ externalId, title, kind, language, content, messageId, conversationId }) => {
        const now = Date.now();
        const existing = externalId
          ? get().artifacts.find((a) => a.externalId === externalId)
          : undefined;
        if (existing) {
          const lastContent = existing.versions[existing.versions.length - 1]?.content;
          if (lastContent === content) return existing;
          const version: ArtifactVersion = { id: nanoid(8), content, language, createdAt: now };
          const updated: Artifact = {
            ...existing,
            language: language ?? existing.language,
            versions: [...existing.versions, version],
            updatedAt: now,
          };
          set((s) => ({ artifacts: s.artifacts.map((a) => (a.id === existing.id ? updated : a)) }));
          return updated;
        }
        const artifact: Artifact = {
          id: nanoid(10),
          externalId,
          title,
          kind,
          language,
          conversationId,
          messageId,
          versions: [{ id: nanoid(8), content, language, createdAt: now }],
          createdAt: now,
          updatedAt: now,
        };
        set((s) => ({ artifacts: [artifact, ...s.artifacts] }));
        return artifact;
      },
      addVersion: (id, content, language) =>
        set((s) => ({
          artifacts: s.artifacts.map((a) =>
            a.id === id
              ? {
                  ...a,
                  language: language ?? a.language,
                  versions: [
                    ...a.versions,
                    { id: nanoid(8), content, language, createdAt: Date.now() },
                  ],
                  updatedAt: Date.now(),
                }
              : a,
          ),
        })),
      remove: (id) =>
        set((s) => ({
          artifacts: s.artifacts.filter((a) => a.id !== id),
          openId: s.openId === id ? null : s.openId,
        })),
      clear: () => set({ artifacts: [], openId: null }),
      byMessage: (messageId) => get().artifacts.filter((a) => a.messageId === messageId),
    }),
    {
      name: "llmatlas-artifacts",
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ artifacts: s.artifacts.slice(0, 200) }),
    },
  ),
);

// -------- attachments (staged for next message) ----------------------------
export interface Attachment {
  id: string;
  kind: "image" | "pdf" | "docx" | "text" | "code";
  name: string;
  mime: string;
  size: number;
  /** Base64 data URL for images; extracted text for PDFs/docx; raw text for code. */
  data: string;
  /** Extracted text for non-image kinds, used as context. */
  extractedText?: string;
}

// -------- conversation store (branching tree) ------------------------------
export interface ConvMessage {
  id: string;
  conversationId: string;
  parentId: string | null;
  role: "user" | "assistant" | "system";
  content: string;
  modelId?: string;
  attachments?: Attachment[];
  tokens?: number;
  latencyMs?: number;
  createdAt: number;
  /** When true the message is still streaming. */
  streaming?: boolean;
  /** Optional UI hint when this message errored. */
  errorMessage?: string;
}

export interface Conversation {
  id: string;
  title: string;
  modelId: string;
  systemPrompt: string;
  projectId?: string;
  /** Leaf id of the currently-selected branch path; UI walks from root via children. */
  activeLeafId: string | null;
  pinned: boolean;
  archived: boolean;
  createdAt: number;
  updatedAt: number;
}

interface ConversationStore {
  conversations: Conversation[];
  messages: ConvMessage[];
  currentId: string | null;

  setCurrent: (id: string | null) => void;
  createConversation: (input: { modelId: string; systemPrompt: string; projectId?: string; title?: string }) => Conversation;
  renameConversation: (id: string, title: string) => void;
  togglePin: (id: string) => void;
  toggleArchive: (id: string) => void;
  removeConversation: (id: string) => void;
  duplicateConversation: (id: string) => Conversation | null;

  /** Append a message at the end of the active branch. Returns created message. */
  appendMessage: (conversationId: string, input: Omit<ConvMessage, "id" | "conversationId" | "parentId" | "createdAt">) => ConvMessage;
  /** Append as a sibling of `parentId` — used by Edit-and-Resend to fork. */
  forkMessage: (conversationId: string, parentId: string | null, input: Omit<ConvMessage, "id" | "conversationId" | "parentId" | "createdAt">) => ConvMessage;
  updateMessage: (id: string, patch: Partial<ConvMessage>) => void;
  setActiveLeaf: (conversationId: string, leafId: string) => void;

  /** Walk from root to active leaf. */
  getActiveThread: (conversationId: string) => ConvMessage[];
  /** Find sibling ids that share parentId. */
  getSiblings: (messageId: string) => ConvMessage[];

  /** Plaintext search; returns hits with conv id + match snippet. */
  search: (query: string) => Array<{ conversation: Conversation; message: ConvMessage; snippet: string }>;
}

function makeSnippet(content: string, query: string): string {
  const idx = content.toLowerCase().indexOf(query.toLowerCase());
  if (idx < 0) return content.slice(0, 100);
  const start = Math.max(0, idx - 40);
  const end = Math.min(content.length, idx + query.length + 40);
  return (start > 0 ? "…" : "") + content.slice(start, end) + (end < content.length ? "…" : "");
}

export const useConversationStore = create<ConversationStore>()(
  persist(
    (set, get) => ({
      conversations: [],
      messages: [],
      currentId: null,
      setCurrent: (id) => set({ currentId: id }),
      createConversation: ({ modelId, systemPrompt, projectId, title }) => {
        const now = Date.now();
        const c: Conversation = {
          id: nanoid(10),
          title: title ?? "New conversation",
          modelId,
          systemPrompt,
          projectId,
          activeLeafId: null,
          pinned: false,
          archived: false,
          createdAt: now,
          updatedAt: now,
        };
        set((s) => ({ conversations: [c, ...s.conversations], currentId: c.id }));
        return c;
      },
      renameConversation: (id, title) =>
        set((s) => ({
          conversations: s.conversations.map((c) =>
            c.id === id ? { ...c, title, updatedAt: Date.now() } : c,
          ),
        })),
      togglePin: (id) =>
        set((s) => ({
          conversations: s.conversations.map((c) => (c.id === id ? { ...c, pinned: !c.pinned } : c)),
        })),
      toggleArchive: (id) =>
        set((s) => ({
          conversations: s.conversations.map((c) =>
            c.id === id ? { ...c, archived: !c.archived } : c,
          ),
        })),
      removeConversation: (id) =>
        set((s) => ({
          conversations: s.conversations.filter((c) => c.id !== id),
          messages: s.messages.filter((m) => m.conversationId !== id),
          currentId: s.currentId === id ? null : s.currentId,
        })),
      duplicateConversation: (id) => {
        const conv = get().conversations.find((c) => c.id === id);
        if (!conv) return null;
        const now = Date.now();
        const newConv: Conversation = {
          ...conv,
          id: nanoid(10),
          title: conv.title + " (copy)",
          createdAt: now,
          updatedAt: now,
        };
        // remap messages
        const idMap = new Map<string, string>();
        const cloned: ConvMessage[] = get()
          .messages.filter((m) => m.conversationId === id)
          .map((m) => {
            const newId = nanoid(10);
            idMap.set(m.id, newId);
            return { ...m, id: newId, conversationId: newConv.id, parentId: m.parentId ? idMap.get(m.parentId) ?? null : null };
          });
        newConv.activeLeafId = conv.activeLeafId ? idMap.get(conv.activeLeafId) ?? null : null;
        set((s) => ({ conversations: [newConv, ...s.conversations], messages: [...s.messages, ...cloned] }));
        return newConv;
      },
      appendMessage: (conversationId, input) => {
        const conv = get().conversations.find((c) => c.id === conversationId);
        if (!conv) throw new Error("conversation not found");
        const parentId = conv.activeLeafId;
        const msg: ConvMessage = {
          ...input,
          id: nanoid(10),
          conversationId,
          parentId,
          createdAt: Date.now(),
        };
        set((s) => ({
          messages: [...s.messages, msg],
          conversations: s.conversations.map((c) =>
            c.id === conversationId ? { ...c, activeLeafId: msg.id, updatedAt: Date.now() } : c,
          ),
        }));
        return msg;
      },
      forkMessage: (conversationId, parentId, input) => {
        const msg: ConvMessage = {
          ...input,
          id: nanoid(10),
          conversationId,
          parentId,
          createdAt: Date.now(),
        };
        set((s) => ({
          messages: [...s.messages, msg],
          conversations: s.conversations.map((c) =>
            c.id === conversationId ? { ...c, activeLeafId: msg.id, updatedAt: Date.now() } : c,
          ),
        }));
        return msg;
      },
      updateMessage: (id, patch) =>
        set((s) => ({ messages: s.messages.map((m) => (m.id === id ? { ...m, ...patch } : m)) })),
      setActiveLeaf: (conversationId, leafId) =>
        set((s) => ({
          conversations: s.conversations.map((c) =>
            c.id === conversationId ? { ...c, activeLeafId: leafId, updatedAt: Date.now() } : c,
          ),
        })),
      getActiveThread: (conversationId) => {
        const conv = get().conversations.find((c) => c.id === conversationId);
        if (!conv || !conv.activeLeafId) return [];
        const allMsgs = get().messages.filter((m) => m.conversationId === conversationId);
        const byId = new Map(allMsgs.map((m) => [m.id, m]));
        const path: ConvMessage[] = [];
        let cur: ConvMessage | undefined = byId.get(conv.activeLeafId);
        while (cur) {
          path.unshift(cur);
          cur = cur.parentId ? byId.get(cur.parentId) : undefined;
        }
        return path;
      },
      getSiblings: (messageId) => {
        const all = get().messages;
        const me = all.find((m) => m.id === messageId);
        if (!me) return [];
        return all.filter((m) => m.conversationId === me.conversationId && m.parentId === me.parentId);
      },
      search: (query) => {
        const q = query.trim().toLowerCase();
        if (!q) return [];
        const convById = new Map(get().conversations.map((c) => [c.id, c]));
        const hits: Array<{ conversation: Conversation; message: ConvMessage; snippet: string }> = [];
        for (const m of get().messages) {
          if (m.content.toLowerCase().includes(q)) {
            const conv = convById.get(m.conversationId);
            if (conv) hits.push({ conversation: conv, message: m, snippet: makeSnippet(m.content, query) });
          }
        }
        return hits.slice(0, 50);
      },
    }),
    {
      name: "llmatlas-conversations",
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({
        conversations: s.conversations.slice(0, 200),
        messages: s.messages.slice(-2000),
        currentId: s.currentId,
      }),
    },
  ),
);

// -------- project store ----------------------------------------------------
export interface ProjectFile {
  id: string;
  name: string;
  mime: string;
  size: number;
  /** Extracted plain-text — what we inject into prompts. */
  extractedText: string;
  createdAt: number;
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  systemPrompt: string;
  files: ProjectFile[];
  createdAt: number;
  updatedAt: number;
}

interface ProjectStore {
  projects: Project[];
  create: (input: { name: string; description?: string; systemPrompt?: string }) => Project;
  update: (id: string, patch: Partial<Omit<Project, "id" | "createdAt">>) => void;
  remove: (id: string) => void;
  addFile: (projectId: string, file: Omit<ProjectFile, "id" | "createdAt">) => void;
  removeFile: (projectId: string, fileId: string) => void;
}

export const useProjectStore = create<ProjectStore>()(
  persist(
    (set) => ({
      projects: [],
      create: ({ name, description, systemPrompt }) => {
        const now = Date.now();
        const p: Project = {
          id: nanoid(10),
          name,
          description,
          systemPrompt: systemPrompt ?? "You are a helpful expert AI assistant.",
          files: [],
          createdAt: now,
          updatedAt: now,
        };
        set((s) => ({ projects: [p, ...s.projects] }));
        return p;
      },
      update: (id, patch) =>
        set((s) => ({
          projects: s.projects.map((p) =>
            p.id === id ? { ...p, ...patch, updatedAt: Date.now() } : p,
          ),
        })),
      remove: (id) => set((s) => ({ projects: s.projects.filter((p) => p.id !== id) })),
      addFile: (projectId, file) =>
        set((s) => ({
          projects: s.projects.map((p) =>
            p.id === projectId
              ? {
                  ...p,
                  files: [...p.files, { ...file, id: nanoid(8), createdAt: Date.now() }],
                  updatedAt: Date.now(),
                }
              : p,
          ),
        })),
      removeFile: (projectId, fileId) =>
        set((s) => ({
          projects: s.projects.map((p) =>
            p.id === projectId
              ? { ...p, files: p.files.filter((f) => f.id !== fileId), updatedAt: Date.now() }
              : p,
          ),
        })),
    }),
    { name: "llmatlas-projects", storage: createJSONStorage(() => localStorage) },
  ),
);

// -------- code workspace store (Playground Code) ---------------------------
export interface WorkspaceFile {
  /** Forward-slash path relative to workspace root, e.g. "src/index.ts". */
  path: string;
  content: string;
  /** ms epoch — used for "dirty since last save" / sorting. */
  updatedAt: number;
}

export type WorkspaceRuntime = "node" | "python" | "static";

export interface Workspace {
  id: string;
  name: string;
  runtime: WorkspaceRuntime;
  files: WorkspaceFile[];
  openTabs: string[];
  activePath: string | null;
  createdAt: number;
  updatedAt: number;
}

interface WorkspaceStore {
  workspaces: Workspace[];
  currentId: string | null;
  setCurrent: (id: string | null) => void;
  create: (input: { name: string; runtime: WorkspaceRuntime; files?: WorkspaceFile[] }) => Workspace;
  remove: (id: string) => void;
  rename: (id: string, name: string) => void;
  writeFile: (workspaceId: string, path: string, content: string) => void;
  deleteFile: (workspaceId: string, path: string) => void;
  renameFile: (workspaceId: string, oldPath: string, newPath: string) => void;
  /** Replace the entire file set (used to restore a checkpoint). Prunes dangling tabs. */
  replaceFiles: (workspaceId: string, files: WorkspaceFile[]) => void;
  openTab: (workspaceId: string, path: string) => void;
  closeTab: (workspaceId: string, path: string) => void;
  setActive: (workspaceId: string, path: string | null) => void;
}

export const useWorkspaceStore = create<WorkspaceStore>()(
  persist(
    (set) => ({
      workspaces: [],
      currentId: null,
      setCurrent: (id) => set({ currentId: id }),
      create: ({ name, runtime, files = [] }) => {
        const now = Date.now();
        const w: Workspace = {
          id: nanoid(10),
          name,
          runtime,
          files,
          openTabs: files.length > 0 ? [files[0].path] : [],
          activePath: files[0]?.path ?? null,
          createdAt: now,
          updatedAt: now,
        };
        set((s) => ({ workspaces: [w, ...s.workspaces], currentId: w.id }));
        return w;
      },
      remove: (id) =>
        set((s) => ({
          workspaces: s.workspaces.filter((w) => w.id !== id),
          currentId: s.currentId === id ? null : s.currentId,
        })),
      rename: (id, name) =>
        set((s) => ({
          workspaces: s.workspaces.map((w) =>
            w.id === id ? { ...w, name, updatedAt: Date.now() } : w,
          ),
        })),
      writeFile: (workspaceId, path, content) =>
        set((s) => ({
          workspaces: s.workspaces.map((w) => {
            if (w.id !== workspaceId) return w;
            const exists = w.files.some((f) => f.path === path);
            const files = exists
              ? w.files.map((f) => (f.path === path ? { ...f, content, updatedAt: Date.now() } : f))
              : [...w.files, { path, content, updatedAt: Date.now() }];
            return { ...w, files, updatedAt: Date.now() };
          }),
        })),
      deleteFile: (workspaceId, path) =>
        set((s) => ({
          workspaces: s.workspaces.map((w) => {
            if (w.id !== workspaceId) return w;
            return {
              ...w,
              files: w.files.filter((f) => f.path !== path),
              openTabs: w.openTabs.filter((p) => p !== path),
              activePath: w.activePath === path ? null : w.activePath,
              updatedAt: Date.now(),
            };
          }),
        })),
      renameFile: (workspaceId, oldPath, newPath) =>
        set((s) => ({
          workspaces: s.workspaces.map((w) => {
            if (w.id !== workspaceId) return w;
            return {
              ...w,
              files: w.files.map((f) => (f.path === oldPath ? { ...f, path: newPath, updatedAt: Date.now() } : f)),
              openTabs: w.openTabs.map((p) => (p === oldPath ? newPath : p)),
              activePath: w.activePath === oldPath ? newPath : w.activePath,
              updatedAt: Date.now(),
            };
          }),
        })),
      replaceFiles: (workspaceId, files) =>
        set((s) => ({
          workspaces: s.workspaces.map((w) => {
            if (w.id !== workspaceId) return w;
            const paths = new Set(files.map((f) => f.path));
            const openTabs = w.openTabs.filter((p) => paths.has(p));
            const activePath = w.activePath && paths.has(w.activePath) ? w.activePath : openTabs[0] ?? files[0]?.path ?? null;
            return { ...w, files: files.map((f) => ({ ...f })), openTabs, activePath, updatedAt: Date.now() };
          }),
        })),
      openTab: (workspaceId, path) =>
        set((s) => ({
          workspaces: s.workspaces.map((w) => {
            if (w.id !== workspaceId) return w;
            const openTabs = w.openTabs.includes(path) ? w.openTabs : [...w.openTabs, path];
            return { ...w, openTabs, activePath: path };
          }),
        })),
      closeTab: (workspaceId, path) =>
        set((s) => ({
          workspaces: s.workspaces.map((w) => {
            if (w.id !== workspaceId) return w;
            const openTabs = w.openTabs.filter((p) => p !== path);
            const activePath = w.activePath === path ? openTabs[openTabs.length - 1] ?? null : w.activePath;
            return { ...w, openTabs, activePath };
          }),
        })),
      setActive: (workspaceId, path) =>
        set((s) => ({
          workspaces: s.workspaces.map((w) => (w.id === workspaceId ? { ...w, activePath: path } : w)),
        })),
    }),
    { name: "llmatlas-workspaces", storage: createJSONStorage(() => localStorage) },
  ),
);

// -------- usage telemetry --------------------------------------------------
export interface UsageEntry {
  id: string;
  modelId: string;
  promptTokens?: number;
  completionTokens?: number;
  costUSD?: number;
  createdAt: number;
}

interface UsageStore {
  entries: UsageEntry[];
  record: (e: Omit<UsageEntry, "id" | "createdAt">) => void;
  totals: () => { calls: number; tokens: number; costUSD: number };
  clear: () => void;
}

export const useUsageStore = create<UsageStore>()(
  persist(
    (set, get) => ({
      entries: [],
      record: (e) =>
        set((s) => ({
          entries: [
            { ...e, id: nanoid(8), createdAt: Date.now() },
            ...s.entries.slice(0, 999),
          ],
        })),
      totals: () => {
        const e = get().entries;
        return {
          calls: e.length,
          tokens: e.reduce((acc, x) => acc + (x.promptTokens ?? 0) + (x.completionTokens ?? 0), 0),
          costUSD: e.reduce((acc, x) => acc + (x.costUSD ?? 0), 0),
        };
      },
      clear: () => set({ entries: [] }),
    }),
    { name: "llmatlas-usage", storage: createJSONStorage(() => localStorage) },
  ),
);
