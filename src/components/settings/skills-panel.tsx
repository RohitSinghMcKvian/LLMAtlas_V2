"use client";

// ─────────────────────────────────────────────────────────────────────────────
// Settings — Atlas Skills manager (Phase 6)
//
// Manage the named skill bundles the Atlas agent uses. Toggle auto-select, pin a
// default skill, view the curated built-ins, and author/edit/delete your own.
// ─────────────────────────────────────────────────────────────────────────────

import { useState } from "react";
import { Wand2, Plus, Trash2, Pencil, Check, X, Sparkles } from "lucide-react";
import { toast } from "sonner";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Textarea } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useSkillStore, BUILTIN_SKILLS, type SkillDef } from "@/lib/brain/skills";
import { cn } from "@/lib/utils";

export function SkillsPanel({ className }: { className?: string }) {
  const userSkills = useSkillStore((s) => s.skills);
  const activeId = useSkillStore((s) => s.activeId);
  const autoSelect = useSkillStore((s) => s.autoSelect);
  const add = useSkillStore((s) => s.add);
  const update = useSkillStore((s) => s.update);
  const remove = useSkillStore((s) => s.remove);
  const setActive = useSkillStore((s) => s.setActive);
  const setAutoSelect = useSkillStore((s) => s.setAutoSelect);

  const [adding, setAdding] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wand2 className="h-5 w-5 text-violet-500" /> Atlas Skills
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Reusable instruction + tool bundles the Atlas agent applies to a request. The active skill shapes how it works.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Auto-select toggle */}
        <div className="flex items-center justify-between rounded-xl border p-3">
          <div>
            <p className="text-sm font-medium">Auto-select skill</p>
            <p className="text-[11px] text-muted-foreground">Pick the best-matching skill per request (unless one is pinned).</p>
          </div>
          <button
            onClick={() => setAutoSelect(!autoSelect)}
            role="switch"
            aria-checked={autoSelect}
            className={cn("relative h-6 w-11 rounded-full transition-colors", autoSelect ? "bg-violet-500" : "bg-muted")}
          >
            <span className={cn("absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform", autoSelect ? "translate-x-5" : "translate-x-0.5")} />
          </button>
        </div>

        {/* Built-in skills */}
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Built-in</p>
          <div className="space-y-1.5">
            {BUILTIN_SKILLS.map((s) => (
              <SkillRow key={s.id} skill={s} pinned={activeId === s.id} onPin={() => setActive(activeId === s.id ? null : s.id)} />
            ))}
          </div>
        </div>

        {/* User skills */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Your skills</p>
            {!adding && (
              <Button size="sm" variant="outline" onClick={() => { setAdding(true); setEditId(null); }} className="h-7 gap-1 text-xs">
                <Plus className="h-3.5 w-3.5" /> New skill
              </Button>
            )}
          </div>

          {adding && (
            <SkillForm
              onCancel={() => setAdding(false)}
              onSave={(v) => { add(v); setAdding(false); toast.success(`Skill "${v.name}" created`); }}
            />
          )}

          <div className="space-y-1.5 mt-1.5">
            {userSkills.length === 0 && !adding && (
              <p className="text-[11px] text-muted-foreground italic px-1 py-2">No custom skills yet — create one to teach Atlas a repeatable workflow.</p>
            )}
            {userSkills.map((s) =>
              editId === s.id ? (
                <SkillForm
                  key={s.id}
                  initial={s}
                  onCancel={() => setEditId(null)}
                  onSave={(v) => { update(s.id, v); setEditId(null); toast.success("Skill updated"); }}
                />
              ) : (
                <SkillRow
                  key={s.id}
                  skill={s}
                  pinned={activeId === s.id}
                  onPin={() => setActive(activeId === s.id ? null : s.id)}
                  onEdit={() => { setEditId(s.id); setAdding(false); }}
                  onDelete={() => { remove(s.id); toast.success("Skill deleted"); }}
                />
              ),
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function SkillRow({
  skill, pinned, onPin, onEdit, onDelete,
}: {
  skill: SkillDef; pinned: boolean; onPin: () => void; onEdit?: () => void; onDelete?: () => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className={cn("rounded-xl border p-2.5 transition-colors", pinned && "border-violet-500/40 bg-violet-500/5")}>
      <div className="flex items-center gap-2">
        <Wand2 className={cn("h-4 w-4 shrink-0", pinned ? "text-violet-500" : "text-muted-foreground")} />
        <button onClick={() => setOpen((v) => !v)} className="flex-1 min-w-0 text-left">
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-medium truncate">{skill.name}</span>
            {pinned && <Badge variant="secondary" className="text-[9px] py-0 h-4">pinned</Badge>}
          </div>
          <p className="text-[11px] text-muted-foreground truncate">{skill.description}</p>
        </button>
        <button onClick={onPin} title={pinned ? "Unpin" : "Pin as default"} className={cn("p-1.5 rounded-lg hover:bg-accent", pinned ? "text-violet-500" : "text-muted-foreground")}>
          <Check className="h-3.5 w-3.5" />
        </button>
        {onEdit && <button onClick={onEdit} title="Edit" className="p-1.5 rounded-lg hover:bg-accent text-muted-foreground"><Pencil className="h-3.5 w-3.5" /></button>}
        {onDelete && <button onClick={onDelete} title="Delete" className="p-1.5 rounded-lg hover:bg-accent text-muted-foreground hover:text-red-500"><Trash2 className="h-3.5 w-3.5" /></button>}
      </div>
      {open && (
        <div className="mt-2 pt-2 border-t space-y-1.5">
          <p className="text-[11px] leading-relaxed text-muted-foreground whitespace-pre-wrap">{skill.instructions}</p>
          <div className="flex flex-wrap gap-1">
            {skill.triggers.map((t) => (
              <span key={t} className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-muted text-muted-foreground">{t}</span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function SkillForm({
  initial, onSave, onCancel,
}: {
  initial?: SkillDef;
  onSave: (v: { name: string; description: string; instructions: string; triggers: string[] }) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [instructions, setInstructions] = useState(initial?.instructions ?? "");
  const [triggers, setTriggers] = useState((initial?.triggers ?? []).join(", "));

  const canSave = name.trim() && instructions.trim();
  return (
    <div className="rounded-xl border p-3 space-y-2 bg-muted/20">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold flex items-center gap-1.5"><Sparkles className="h-3.5 w-3.5 text-violet-500" /> {initial ? "Edit skill" : "New skill"}</span>
        <button onClick={onCancel} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
      </div>
      <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name — e.g. Release Researcher" className="text-sm" />
      <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="One-line description" className="text-sm" />
      <Textarea value={instructions} onChange={(e) => setInstructions(e.target.value)} placeholder="Instructions injected into Atlas's system prompt when this skill is active…" className="text-sm min-h-[80px]" />
      <Input value={triggers} onChange={(e) => setTriggers(e.target.value)} placeholder="Trigger keywords (comma-separated) — release, changelog, new model" className="text-sm" />
      <div className="flex justify-end gap-2 pt-0.5">
        <Button size="sm" variant="ghost" onClick={onCancel}>Cancel</Button>
        <Button
          size="sm"
          disabled={!canSave}
          onClick={() => onSave({ name, description, instructions, triggers: triggers.split(",").map((t) => t.trim()).filter(Boolean) })}
        >
          {initial ? "Save" : "Create"}
        </Button>
      </div>
    </div>
  );
}
