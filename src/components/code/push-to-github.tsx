"use client";

import { useState } from "react";
import { Github, ExternalLink, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import type { Workspace } from "@/lib/store";

interface Props {
  workspace: Workspace;
}

export function PushToGithub({ workspace }: Props) {
  const [open, setOpen] = useState(false);
  const [token, setToken] = useState("");
  const [repoName, setRepoName] = useState(workspace.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 40));
  const [isPrivate, setIsPrivate] = useState(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; repoUrl?: string; pushed?: number; failed?: number; error?: string } | null>(null);

  async function push() {
    if (!token.trim() || !repoName.trim()) return;
    setBusy(true);
    setResult(null);
    try {
      const res = await fetch("/api/github/push", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: token.trim(),
          repoName: repoName.trim(),
          isPrivate,
          files: workspace.files.map((f) => ({ path: f.path, content: f.content })),
          commitMessage: `Sync from LLMAtlas Playground Code`,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setResult({ ok: false, error: data.error ?? "Push failed" });
        toast.error(data.error ?? "Push failed");
      } else {
        setResult(data);
        if (data.ok) toast.success(`Pushed ${data.pushed} files`);
        else toast.warning(`Pushed ${data.pushed}, ${data.failed} failed`);
        setToken(""); // clear token from memory immediately
      }
    } catch (e) {
      setResult({ ok: false, error: e instanceof Error ? e.message : "Push failed" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1 h-7 px-2 rounded-md border text-xs hover:bg-accent text-muted-foreground"
        title="Push workspace to GitHub"
      >
        <Github className="h-3 w-3" /> Push
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Github className="h-4 w-4" /> Push to GitHub
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Personal access token</Label>
              <Input
                type="password"
                placeholder="ghp_…"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                autoComplete="off"
              />
              <p className="text-[10px] text-muted-foreground">
                Token is used once and cleared from memory. Needs <code>repo</code> scope.{" "}
                <a href="https://github.com/settings/tokens/new?scopes=repo&description=LLMAtlas" target="_blank" rel="noreferrer" className="text-primary hover:underline inline-flex items-center gap-1">
                  Create token <ExternalLink className="h-2.5 w-2.5" />
                </a>
              </p>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Repository name</Label>
              <Input value={repoName} onChange={(e) => setRepoName(e.target.value)} />
              <p className="text-[10px] text-muted-foreground">
                Will be created under your account if it doesn&apos;t exist.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={isPrivate} onCheckedChange={setIsPrivate} />
              <Label className="text-xs cursor-pointer" onClick={() => setIsPrivate(v => !v)}>Private repository</Label>
            </div>

            {result && (
              <div className={result.ok ? "p-2 rounded border bg-green-500/10 border-green-500/30 text-xs" : "p-2 rounded border bg-red-500/10 border-red-500/30 text-xs"}>
                {result.ok ? (
                  <>
                    Pushed {result.pushed} files.
                    {result.repoUrl && (
                      <a href={result.repoUrl} target="_blank" rel="noreferrer" className="ml-2 text-primary hover:underline inline-flex items-center gap-1">
                        Open repo <ExternalLink className="h-2.5 w-2.5" />
                      </a>
                    )}
                  </>
                ) : (
                  <>Error: {result.error}</>
                )}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" onClick={() => setOpen(false)}>Close</Button>
              <Button onClick={push} disabled={busy || !token.trim() || !repoName.trim()}>
                {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <Github className="h-3.5 w-3.5 mr-1.5" />}
                Push {workspace.files.length} files
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
