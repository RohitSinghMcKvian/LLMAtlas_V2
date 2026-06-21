"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { nanoid } from "nanoid";
import type { CompareSession, SavedRound } from "./compare";

interface CompareStore {
  sessions: CompareSession[];
  currentId: string | null;

  setCurrent: (id: string | null) => void;
  createSession: (input: { columns: string[]; focusId: string; title?: string }) => CompareSession;
  updateSession: (id: string, patch: Partial<Pick<CompareSession, "title" | "columns" | "focusId" | "rounds">>) => void;
  renameSession: (id: string, title: string) => void;
  togglePin: (id: string) => void;
  toggleArchive: (id: string) => void;
  removeSession: (id: string) => void;
  duplicateSession: (id: string) => CompareSession | null;
  saveRounds: (id: string, rounds: SavedRound[]) => void;
  search: (query: string) => CompareSession[];
}

export const useCompareStore = create<CompareStore>()(
  persist(
    (set, get) => ({
      sessions: [],
      currentId: null,

      setCurrent: (id) => set({ currentId: id }),

      createSession: ({ columns, focusId, title }) => {
        const now = Date.now();
        const s: CompareSession = {
          id: nanoid(10),
          title: title ?? "New comparison",
          columns,
          focusId,
          rounds: [],
          pinned: false,
          archived: false,
          createdAt: now,
          updatedAt: now,
        };
        set((st) => ({ sessions: [s, ...st.sessions], currentId: s.id }));
        return s;
      },

      updateSession: (id, patch) =>
        set((s) => ({
          sessions: s.sessions.map((c) =>
            c.id === id ? { ...c, ...patch, updatedAt: Date.now() } : c,
          ),
        })),

      renameSession: (id, title) =>
        set((s) => ({
          sessions: s.sessions.map((c) =>
            c.id === id ? { ...c, title, updatedAt: Date.now() } : c,
          ),
        })),

      togglePin: (id) =>
        set((s) => ({
          sessions: s.sessions.map((c) =>
            c.id === id ? { ...c, pinned: !c.pinned } : c,
          ),
        })),

      toggleArchive: (id) =>
        set((s) => ({
          sessions: s.sessions.map((c) =>
            c.id === id ? { ...c, archived: !c.archived } : c,
          ),
        })),

      removeSession: (id) =>
        set((s) => ({
          sessions: s.sessions.filter((c) => c.id !== id),
          currentId: s.currentId === id ? null : s.currentId,
        })),

      duplicateSession: (id) => {
        const orig = get().sessions.find((c) => c.id === id);
        if (!orig) return null;
        const now = Date.now();
        const dup: CompareSession = {
          ...orig,
          id: nanoid(10),
          title: `${orig.title} (copy)`,
          pinned: false,
          archived: false,
          createdAt: now,
          updatedAt: now,
        };
        set((s) => ({ sessions: [dup, ...s.sessions], currentId: dup.id }));
        return dup;
      },

      saveRounds: (id, rounds) =>
        set((s) => ({
          sessions: s.sessions.map((c) =>
            c.id === id ? { ...c, rounds, updatedAt: Date.now() } : c,
          ),
        })),

      search: (query) => {
        const q = query.toLowerCase();
        return get().sessions.filter(
          (s) =>
            s.title.toLowerCase().includes(q) ||
            s.rounds.some((r) => r.prompt.toLowerCase().includes(q)),
        );
      },
    }),
    {
      name: "llmatlas-compare-sessions",
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({
        sessions: s.sessions.slice(0, 100),
        currentId: s.currentId,
      }),
    },
  ),
);
