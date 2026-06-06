"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Library, Plus, Search, Trash2, Copy, Pencil, X, Check, Sparkles } from "lucide-react";
import { toast } from "sonner";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { usePromptStore } from "@/lib/store";
import { formatDate, truncate, copyToClipboard } from "@/lib/utils";

export default function PromptsPage() {
  const prompts = usePromptStore((s) => s.prompts);
  const save = usePromptStore((s) => s.save);
  const remove = usePromptStore((s) => s.remove);
  const update = usePromptStore((s) => s.update);

  const [query, setQuery] = useState("");
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [tags, setTags] = useState("");

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    if (!q) return prompts;
    return prompts.filter((p) =>
      p.title.toLowerCase().includes(q) ||
      p.content.toLowerCase().includes(q) ||
      p.tags.some((t) => t.toLowerCase().includes(q)),
    );
  }, [prompts, query]);

  function resetForm() {
    setTitle(""); setContent(""); setTags("");
    setCreating(false); setEditing(null);
  }

  function submit() {
    if (!title.trim() || !content.trim()) {
      toast.error("Title and content are required.");
      return;
    }
    const tagList = tags.split(",").map((t) => t.trim()).filter(Boolean);
    if (editing) {
      update(editing, { title, content, tags: tagList });
      toast.success("Prompt updated");
    } else {
      save({ title, content, tags: tagList });
      toast.success("Prompt saved");
    }
    resetForm();
  }

  function startEdit(id: string) {
    const p = prompts.find((x) => x.id === id);
    if (!p) return;
    setTitle(p.title); setContent(p.content); setTags(p.tags.join(", "));
    setEditing(id); setCreating(true);
  }

  async function copy(text: string) {
    await copyToClipboard(text);
    toast.success("Copied to clipboard");
  }

  return (
    <div className="container max-w-6xl py-8">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <div className="inline-flex items-center gap-2 mb-2">
          <Library className="h-5 w-5 text-amber-500" />
          <span className="text-xs font-semibold text-amber-500 uppercase tracking-wider">
            Prompt Library
          </span>
        </div>
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
          Your prompts, version-controlled
        </h1>
        <p className="mt-2 text-muted-foreground">
          Save, tag, and reuse. Stored locally in your browser — no account required.
        </p>
      </motion.div>

      <div className="flex items-center gap-3 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search prompts…"
            className="pl-9"
          />
        </div>
        <Button onClick={() => { resetForm(); setCreating(true); }} variant="gradient">
          <Plus className="h-4 w-4" />
          New prompt
        </Button>
      </div>

      <AnimatePresence>
        {creating && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden mb-6"
          >
            <Card>
              <CardContent className="p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="font-semibold">
                    {editing ? "Edit prompt" : "New prompt"}
                  </h2>
                  <Button variant="ghost" size="icon" onClick={resetForm}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <div>
                  <Label className="mb-1.5 block">Title</Label>
                  <Input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Extract invoice line items"
                  />
                </div>
                <div>
                  <Label className="mb-1.5 block">Content</Label>
                  <Textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="You are a helpful assistant…"
                    className="min-h-[140px]"
                  />
                </div>
                <div>
                  <Label className="mb-1.5 block">Tags (comma-separated)</Label>
                  <Input
                    value={tags}
                    onChange={(e) => setTags(e.target.value)}
                    placeholder="extraction, json, finance"
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={resetForm}>Cancel</Button>
                  <Button onClick={submit} variant="gradient">
                    <Check className="h-4 w-4" />
                    {editing ? "Save changes" : "Save prompt"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <div className="inline-flex h-14 w-14 rounded-2xl bg-muted items-center justify-center text-muted-foreground mb-4">
              <Library className="h-7 w-7" />
            </div>
            <h2 className="text-lg font-bold mb-1">
              {query ? "No prompts match" : "No prompts yet"}
            </h2>
            <p className="text-sm text-muted-foreground mb-4">
              {query ? "Try a different search." : "Save your first prompt to start building a library."}
            </p>
            {!query && (
              <Button onClick={() => setCreating(true)} variant="gradient">
                <Plus className="h-4 w-4" />
                Create your first prompt
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((p, i) => (
            <motion.div
              key={p.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: Math.min(i * 0.03, 0.3) }}
            >
              <Card className="h-full hover:shadow-md hover:border-primary/30 transition-all">
                <CardContent className="p-5">
                  <h3 className="font-semibold text-sm mb-1 line-clamp-1">{p.title}</h3>
                  <p className="text-xs text-muted-foreground mb-3">
                    Saved {formatDate(new Date(p.createdAt).toISOString())}
                  </p>
                  <p className="text-xs text-muted-foreground line-clamp-3 mb-3 font-mono leading-relaxed">
                    {truncate(p.content, 160)}
                  </p>
                  <div className="flex flex-wrap gap-1 mb-3">
                    {p.tags.map((t) => (
                      <Badge key={t} variant="outline" className="text-[10px]">{t}</Badge>
                    ))}
                  </div>
                  <div className="flex gap-1">
                    <Button asChild variant="default" size="sm" className="flex-1">
                      <Link href={`/playground?prompt=${encodeURIComponent(p.content)}`}>
                        <Sparkles className="h-3.5 w-3.5" />
                        Use
                      </Link>
                    </Button>
                    <Button variant="outline" size="icon" onClick={() => copy(p.content)} aria-label="Copy">
                      <Copy className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="outline" size="icon" onClick={() => startEdit(p.id)} aria-label="Edit">
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="outline" size="icon" onClick={() => remove(p.id)} aria-label="Delete">
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
