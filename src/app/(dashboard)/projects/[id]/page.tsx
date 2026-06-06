"use client";

import Link from "next/link";
import { use, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  FolderKanban, FileText, Paperclip, Trash2, ArrowLeft, MessageSquare,
  Save, Plus, Loader2, FileImage, FileCode2,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useProjectStore, useConversationStore, useSettingsStore } from "@/lib/store";
import { fileToAttachment } from "@/lib/attachments";

export default function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const project = useProjectStore((s) => s.projects.find((p) => p.id === id));
  const update = useProjectStore((s) => s.update);
  const addFile = useProjectStore((s) => s.addFile);
  const removeFile = useProjectStore((s) => s.removeFile);
  const createConversation = useConversationStore((s) => s.createConversation);
  const allConversations = useConversationStore((s) => s.conversations);
  const conversations = useMemo(
    () => allConversations.filter((c) => c.projectId === id).sort((a, b) => b.updatedAt - a.updatedAt),
    [allConversations, id],
  );
  const defaultModel = useSettingsStore((s) => s.defaultModel);

  const [systemDirty, setSystemDirty] = useState(false);
  const [systemBuf, setSystemBuf] = useState(project?.systemPrompt ?? "");
  const [busy, setBusy] = useState(false);

  if (!project) {
    return (
      <div className="container max-w-3xl py-16 text-center">
        <h2 className="text-xl font-semibold mb-2">Project not found</h2>
        <p className="text-muted-foreground mb-6">It may have been deleted.</p>
        <Link href="/projects"><Button>Back to projects</Button></Link>
      </div>
    );
  }

  async function onUpload(files: FileList | null) {
    if (!files) return;
    setBusy(true);
    for (const f of Array.from(files)) {
      try {
        const att = await fileToAttachment(f);
        addFile(id, {
          name: att.name,
          mime: att.mime,
          size: att.size,
          extractedText: att.extractedText || att.data,
        });
      } catch (e) {
        toast.error(`${f.name}: ${e instanceof Error ? e.message : "failed"}`);
      }
    }
    setBusy(false);
    toast.success("Files added");
  }

  function saveSystem() {
    update(id, { systemPrompt: systemBuf });
    setSystemDirty(false);
    toast.success("System prompt saved");
  }

  function startConversation() {
    const conv = createConversation({
      modelId: defaultModel,
      systemPrompt: project!.systemPrompt,
      projectId: id,
      title: `${project!.name} — chat`,
    });
    router.push(`/playground?conv=${conv.id}`);
  }

  return (
    <div className="container max-w-5xl py-8">
      <Link href="/projects" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mb-4">
        <ArrowLeft className="h-3 w-3" /> All projects
      </Link>

      <div className="flex items-start gap-4 mb-8">
        <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-violet-500/20 to-primary/20 flex items-center justify-center flex-shrink-0">
          <FolderKanban className="h-6 w-6 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <input
            value={project.name}
            onChange={(e) => update(id, { name: e.target.value })}
            className="text-2xl font-bold bg-transparent border-0 focus:outline-none focus:ring-0 w-full"
          />
          {project.description && <p className="text-sm text-muted-foreground">{project.description}</p>}
        </div>
        <Button onClick={startConversation} className="gap-1.5">
          <MessageSquare className="h-4 w-4" /> New chat
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-6">
          <div className="rounded-xl border bg-card p-5">
            <div className="flex items-center justify-between mb-3">
              <Label className="text-sm font-semibold">Custom instructions</Label>
              {systemDirty && (
                <Button size="sm" onClick={saveSystem} className="gap-1.5 h-7">
                  <Save className="h-3 w-3" /> Save
                </Button>
              )}
            </div>
            <Textarea
              value={systemBuf}
              onChange={(e) => { setSystemBuf(e.target.value); setSystemDirty(true); }}
              className="min-h-[160px] text-sm font-mono"
              placeholder="You are an expert in…"
            />
            <p className="text-xs text-muted-foreground mt-2">
              Every conversation in this project starts with this as the system prompt.
            </p>
          </div>

          <div className="rounded-xl border bg-card p-5">
            <div className="flex items-center justify-between mb-3">
              <Label className="text-sm font-semibold">Knowledge files</Label>
              <label className="cursor-pointer">
                <input
                  type="file"
                  multiple
                  className="hidden"
                  onChange={(e) => onUpload(e.target.files)}
                />
                <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md border text-xs hover:bg-accent">
                  {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
                  Add file
                </span>
              </label>
            </div>
            {project.files.length === 0 ? (
              <div className="text-center py-8 text-xs text-muted-foreground border-2 border-dashed rounded-lg">
                <Paperclip className="h-5 w-5 mx-auto mb-2 opacity-50" />
                Drop PDFs, docx, code, or text here. Extracted text is injected into every chat.
              </div>
            ) : (
              <ul className="space-y-1.5">
                {project.files.map((f) => (
                  <li key={f.id} className="group flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-accent">
                    <FileText className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm truncate">{f.name}</div>
                      <div className="text-[10px] text-muted-foreground">{(f.size / 1024).toFixed(1)} KB · {f.extractedText.length.toLocaleString()} chars extracted</div>
                    </div>
                    <button
                      onClick={() => { removeFile(id, f.id); toast.success("File removed"); }}
                      className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="rounded-xl border bg-card p-5">
          <div className="flex items-center justify-between mb-3">
            <Label className="text-sm font-semibold">Conversations</Label>
            <span className="text-xs text-muted-foreground">{conversations.length}</span>
          </div>
          {conversations.length === 0 ? (
            <div className="text-center py-8 text-xs text-muted-foreground border-2 border-dashed rounded-lg">
              <MessageSquare className="h-5 w-5 mx-auto mb-2 opacity-50" />
              No conversations yet. Start one with the New chat button above.
            </div>
          ) : (
            <ul className="space-y-1.5">
              {conversations.map((c) => (
                <li key={c.id}>
                  <Link
                    href={`/playground?conv=${c.id}`}
                    className="flex items-center gap-2 px-2 py-2 rounded-md hover:bg-accent"
                  >
                    <MessageSquare className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm truncate">{c.title}</div>
                      <div className="text-[10px] text-muted-foreground">
                        {new Date(c.updatedAt).toLocaleString()}
                      </div>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
