"use client";

// Per-workspace agent state: the conversation transcript, the live plan/todo list,
// workspace checkpoints (for undo), and the global autonomy mode. Persisted to
// localStorage so an agent session survives a workspace switch or page reload.

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { WorkspaceFile } from "@/lib/store";
import type { ToolCall, ToolResult, PendingMutation } from "@/lib/code/tools";

/** How much the agent may do without asking. */
export type AutonomyMode = "manual" | "smart" | "autonomous";

export type PlanStepStatus = "pending" | "in_progress" | "done";
export interface PlanStep {
  id: string;
  text: string;
  status: PlanStepStatus;
}

export interface AgentMessage {
  id: string;
  role: "user" | "assistant" | "tool";
  content: string;
  toolCall?: ToolCall;
  toolResult?: ToolResult;
  pendingMutation?: PendingMutation;
  pendingResolved?: "approved" | "rejected";
  createdAt: number;
}

export interface Checkpoint {
  id: string;
  label: string;
  files: WorkspaceFile[]; // deep snapshot of workspace.files at checkpoint time
  createdAt: number;
}

export interface WorkspaceAgentState {
  messages: AgentMessage[];
  plan: PlanStep[];
  checkpoints: Checkpoint[];
}

const EMPTY: WorkspaceAgentState = { messages: [], plan: [], checkpoints: [] };

const MAX_MESSAGES = 400;
const MAX_CHECKPOINTS = 10;

interface AgentStore {
  mode: AutonomyMode;
  setMode: (m: AutonomyMode) => void;
  byWorkspace: Record<string, WorkspaceAgentState>;
  setMessages: (workspaceId: string, updater: (prev: AgentMessage[]) => AgentMessage[]) => void;
  setPlan: (workspaceId: string, plan: PlanStep[]) => void;
  pushCheckpoint: (workspaceId: string, label: string, files: WorkspaceFile[]) => string;
  removeCheckpoint: (workspaceId: string, checkpointId: string) => void;
  clearConversation: (workspaceId: string) => void;
}

function patch(s: AgentStore, id: string, next: Partial<WorkspaceAgentState>): Pick<AgentStore, "byWorkspace"> {
  const cur = s.byWorkspace[id] ?? EMPTY;
  return { byWorkspace: { ...s.byWorkspace, [id]: { ...cur, ...next } } };
}

export const useAgentStore = create<AgentStore>()(
  persist(
    (set) => ({
      mode: "smart",
      setMode: (mode) => set({ mode }),
      byWorkspace: {},
      setMessages: (id, updater) =>
        set((s) => {
          const cur = s.byWorkspace[id] ?? EMPTY;
          return patch(s, id, { messages: updater(cur.messages).slice(-MAX_MESSAGES) });
        }),
      setPlan: (id, plan) => set((s) => patch(s, id, { plan })),
      pushCheckpoint: (id, label, files) => {
        const checkpointId = crypto.randomUUID();
        set((s) => {
          const cur = s.byWorkspace[id] ?? EMPTY;
          const checkpoints = [
            { id: checkpointId, label, files: files.map((f) => ({ ...f })), createdAt: Date.now() },
            ...cur.checkpoints,
          ].slice(0, MAX_CHECKPOINTS);
          return patch(s, id, { checkpoints });
        });
        return checkpointId;
      },
      removeCheckpoint: (id, checkpointId) =>
        set((s) => {
          const cur = s.byWorkspace[id] ?? EMPTY;
          return patch(s, id, { checkpoints: cur.checkpoints.filter((c) => c.id !== checkpointId) });
        }),
      clearConversation: (id) => set((s) => patch(s, id, { messages: [], plan: [] })),
    }),
    {
      name: "llmatlas-agent",
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ mode: s.mode, byWorkspace: s.byWorkspace }),
    },
  ),
);

/** Stable empty references so selectors don't return a fresh array each render. */
export const EMPTY_MESSAGES: AgentMessage[] = [];
export const EMPTY_PLAN: PlanStep[] = [];
export const EMPTY_CHECKPOINTS: Checkpoint[] = [];
