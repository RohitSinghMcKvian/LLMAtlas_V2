"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Command } from "cmdk";
import {
  Sparkles, MessageSquare, FolderKanban, Code2, Search, Database, BarChart3,
  Activity, Calculator, BookOpen, Library, GitCompare, Settings, Home,
} from "lucide-react";

import { MODELS, findModel } from "@/lib/models";
import {
  useSettingsStore, useConversationStore, useProjectStore, useWorkspaceStore,
} from "@/lib/store";

interface Item {
  id: string;
  label: string;
  hint?: string;
  group: string;
  icon: React.ComponentType<{ className?: string }>;
  run: () => void;
}

const NAV_ITEMS: Array<Omit<Item, "run"> & { href: string }> = [
  { id: "nav-dashboard",   label: "Overview",         group: "Navigate", icon: Home,         href: "/dashboard" },
  { id: "nav-playground",  label: "Playground",       group: "Navigate", icon: MessageSquare, href: "/playground" },
  { id: "nav-code",        label: "Playground Code",  group: "Navigate", icon: Code2,        href: "/code" },
  { id: "nav-projects",    label: "Projects",         group: "Navigate", icon: FolderKanban, href: "/projects" },
  { id: "nav-compare",     label: "Compare",          group: "Navigate", icon: GitCompare,   href: "/compare" },
  { id: "nav-prompts",     label: "Prompts",          group: "Navigate", icon: Library,      href: "/prompts" },
  { id: "nav-models",      label: "Models",           group: "Navigate", icon: Database,     href: "/models" },
  { id: "nav-leaderboard", label: "Leaderboard",      group: "Navigate", icon: BarChart3,    href: "/leaderboard" },
  { id: "nav-calculator",  label: "Cost Calculator",  group: "Navigate", icon: Calculator,   href: "/calculator" },
  { id: "nav-status",      label: "API Status",       group: "Navigate", icon: Activity,     href: "/status" },
  { id: "nav-learn",       label: "Learn",            group: "Navigate", icon: BookOpen,     href: "/learn" },
  { id: "nav-settings",    label: "Settings",         group: "Navigate", icon: Settings,     href: "/settings" },
];

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const router = useRouter();
  const setDefaultModel = useSettingsStore((s) => s.setDefaultModel);
  const conversations = useConversationStore((s) => s.conversations);
  const setConvCurrent = useConversationStore((s) => s.setCurrent);
  const projects = useProjectStore((s) => s.projects);
  const workspaces = useWorkspaceStore((s) => s.workspaces);
  const setWorkspaceCurrent = useWorkspaceStore((s) => s.setCurrent);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.key === "k" || e.key === "K") && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((v) => !v);
      }
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  function run(fn: () => void) {
    fn();
    setOpen(false);
    setQuery("");
  }

  if (!open) return null;

  const items: Item[] = [
    ...NAV_ITEMS.map((n) => ({ ...n, run: () => router.push(n.href) })),
    ...MODELS.filter((m) => !m.disabled).slice(0, 50).map((m) => ({
      id: `model-${m.id}`,
      label: m.name,
      hint: m.vendor,
      group: "Switch model",
      icon: Sparkles,
      run: () => { setDefaultModel(m.id); router.push(`/playground?model=${m.id}`); },
    })),
    ...conversations.slice(0, 20).map((c) => ({
      id: `conv-${c.id}`,
      label: c.title,
      hint: new Date(c.updatedAt).toLocaleDateString(),
      group: "Conversations",
      icon: MessageSquare,
      run: () => { setConvCurrent(c.id); router.push(`/playground?conv=${c.id}`); },
    })),
    ...projects.slice(0, 20).map((p) => ({
      id: `proj-${p.id}`,
      label: p.name,
      hint: `${p.files.length} files`,
      group: "Projects",
      icon: FolderKanban,
      run: () => router.push(`/projects/${p.id}`),
    })),
    ...workspaces.slice(0, 10).map((w) => ({
      id: `ws-${w.id}`,
      label: w.name,
      hint: w.runtime,
      group: "Code workspaces",
      icon: Code2,
      run: () => { setWorkspaceCurrent(w.id); router.push("/code"); },
    })),
  ];

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh] px-4 bg-black/40 backdrop-blur-sm"
      onClick={() => setOpen(false)}
    >
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-xl rounded-xl border bg-card shadow-2xl overflow-hidden">
        <Command shouldFilter className="w-full">
          <div className="flex items-center gap-2 px-3 border-b">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Command.Input
              autoFocus
              value={query}
              onValueChange={setQuery}
              placeholder="Type a command, model, conversation, project…"
              className="flex-1 h-11 bg-transparent text-sm focus:outline-none"
            />
            <kbd className="text-[10px] font-mono text-muted-foreground border rounded px-1.5 py-0.5">esc</kbd>
          </div>
          <Command.List className="max-h-[55vh] overflow-y-auto p-1">
            <Command.Empty className="px-4 py-6 text-center text-sm text-muted-foreground">No results.</Command.Empty>
            {Object.entries(
              items.reduce<Record<string, Item[]>>((acc, item) => {
                (acc[item.group] ??= []).push(item);
                return acc;
              }, {}),
            ).map(([group, groupItems]) => (
              <Command.Group key={group} heading={group} className="text-[10px] uppercase tracking-wider text-muted-foreground px-2 pt-2 pb-1">
                {groupItems.map((item) => (
                  <Command.Item
                    key={item.id}
                    value={`${item.group} ${item.label} ${item.hint ?? ""}`}
                    onSelect={() => run(item.run)}
                    className="flex items-center gap-2 px-2 py-2 text-sm rounded-md aria-selected:bg-accent cursor-pointer"
                  >
                    <item.icon className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="flex-1 truncate text-foreground">{item.label}</span>
                    {item.hint && <span className="text-[10px] text-muted-foreground">{item.hint}</span>}
                  </Command.Item>
                ))}
              </Command.Group>
            ))}
          </Command.List>
        </Command>
      </div>
    </div>
  );
}
