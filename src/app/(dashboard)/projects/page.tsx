"use client";

import Link from "next/link";
import { useState } from "react";
import { FolderKanban, Plus, FileText, Calendar, ArrowRight, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useProjectStore } from "@/lib/store";

export default function ProjectsPage() {
  const projects = useProjectStore((s) => s.projects);
  const create = useProjectStore((s) => s.create);
  const remove = useProjectStore((s) => s.remove);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");

  function handleCreate() {
    const trimmed = name.trim();
    if (!trimmed) return;
    const p = create({ name: trimmed, description: desc.trim() || undefined });
    setName("");
    setDesc("");
    setCreating(false);
    toast.success(`Created “${p.name}”`);
  }

  return (
    <div className="container max-w-5xl py-10">
      <div className="flex items-start gap-4 mb-8">
        <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-violet-500/20 to-primary/20 flex items-center justify-center flex-shrink-0">
          <FolderKanban className="h-6 w-6 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold mb-1">Projects</h1>
          <p className="text-muted-foreground text-sm">
            Group conversations under a single workspace with its own system prompt and knowledge files.
          </p>
        </div>
        <Button onClick={() => setCreating((v) => !v)} className="gap-1.5">
          <Plus className="h-4 w-4" /> New project
        </Button>
      </div>

      {creating && (
        <div className="rounded-xl border bg-card p-5 mb-6">
          <div className="space-y-3">
            <Input
              placeholder="Project name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
            <Input
              placeholder="Short description (optional)"
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
            />
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setCreating(false)}>Cancel</Button>
              <Button onClick={handleCreate} disabled={!name.trim()}>Create</Button>
            </div>
          </div>
        </div>
      )}

      {projects.length === 0 && !creating ? (
        <div className="rounded-xl border-2 border-dashed bg-muted/20 p-12 text-center">
          <FolderKanban className="h-10 w-10 mx-auto mb-3 text-muted-foreground/50" />
          <h3 className="font-semibold mb-1">No projects yet</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Projects give you persistent knowledge files and a shared system prompt across chats.
          </p>
          <Button onClick={() => setCreating(true)} className="gap-1.5">
            <Plus className="h-4 w-4" /> Create your first project
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {projects.map((p) => (
            <div key={p.id} className="group relative rounded-xl border bg-card p-5 hover:border-primary/40 transition-colors">
              <Link href={`/projects/${p.id}`} className="block">
                <div className="flex items-start gap-3 mb-3">
                  <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
                    <FolderKanban className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold truncate">{p.name}</h3>
                    {p.description && (
                      <p className="text-xs text-muted-foreground truncate">{p.description}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1">
                    <FileText className="h-3 w-3" />
                    {p.files.length} {p.files.length === 1 ? "file" : "files"}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {new Date(p.updatedAt).toLocaleDateString()}
                  </span>
                  <span className="ml-auto inline-flex items-center gap-1 text-primary font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                    Open <ArrowRight className="h-3 w-3" />
                  </span>
                </div>
              </Link>
              <button
                onClick={() => {
                  if (confirm(`Delete “${p.name}”? This removes the project but keeps its conversations.`)) {
                    remove(p.id);
                    toast.success("Project deleted");
                  }
                }}
                className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                title="Delete project"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
