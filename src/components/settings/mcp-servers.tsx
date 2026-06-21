"use client";

// MCP Servers settings panel — manage the Model Context Protocol servers the
// Atlas Brain agent pulls external tools from. Adding/enabling a server makes
// its tools available in the /code agent (and, later, the global Atlas Agent).

import { useState } from "react";
import { Plug, Plus, Trash2, RefreshCw, CheckCircle2, AlertCircle, Server } from "lucide-react";
import { toast } from "sonner";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useSettingsStore, type McpServerConfig } from "@/lib/store";
import { syncMcpServer } from "@/lib/brain/mcp";

const PRESETS: Array<{ name: string; url: string; hint: string }> = [
  { name: "DeepWiki", url: "https://mcp.deepwiki.com/mcp", hint: "Ask questions about any public GitHub repo" },
  { name: "Hugging Face", url: "https://huggingface.co/mcp", hint: "Search models, datasets, and papers" },
];

export function McpServersPanel() {
  const servers = useSettingsStore((s) => s.mcpServers);
  const addMcpServer = useSettingsStore((s) => s.addMcpServer);
  const updateMcpServer = useSettingsStore((s) => s.updateMcpServer);
  const removeMcpServer = useSettingsStore((s) => s.removeMcpServer);

  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [auth, setAuth] = useState("");

  function add(presetName?: string, presetUrl?: string) {
    const n = (presetName ?? name).trim();
    const u = (presetUrl ?? url).trim();
    if (!n || !u) { toast.error("Name and URL are required"); return; }
    if (!/^https?:\/\//i.test(u)) { toast.error("URL must start with http(s)://"); return; }
    const server = addMcpServer({ name: n, url: u, authHeader: auth || undefined });
    setName(""); setUrl(""); setAuth("");
    toast.success(`Added ${n} — connecting…`);
    void test(server);
  }

  async function test(server: McpServerConfig) {
    const res = await syncMcpServer(server);
    if (res.ok) toast.success(`${server.name}: ${res.toolCount} tool${res.toolCount === 1 ? "" : "s"} available`);
    else toast.error(`${server.name}: ${res.error ?? "connection failed"}`);
  }

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Plug className="h-5 w-5" /> MCP servers (agent tools)
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Connect Model Context Protocol servers to give the LLMAtlas Code agent extra tools —
          GitHub, web search, databases, and more. HTTP/SSE servers only.
        </p>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Configured servers */}
        {servers.length > 0 && (
          <div className="space-y-2">
            {servers.map((s) => (
              <div key={s.id} className="flex items-center gap-3 p-3 rounded-lg border bg-card">
                <Server className="h-4 w-4 text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium truncate">{s.name}</p>
                    {s.enabled
                      ? <Badge variant="success" className="text-[10px]"><CheckCircle2 className="h-3 w-3 mr-1" />enabled</Badge>
                      : <Badge variant="secondary" className="text-[10px]">disabled</Badge>}
                  </div>
                  <p className="text-[11px] text-muted-foreground font-mono truncate">{s.url}</p>
                </div>
                <button
                  onClick={() => test(s)}
                  title="Test connection / refresh tools"
                  className="text-muted-foreground hover:text-foreground p-1.5 rounded-md hover:bg-accent"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                </button>
                <Switch
                  checked={s.enabled}
                  onCheckedChange={(v) => updateMcpServer(s.id, { enabled: v })}
                  aria-label="Toggle server"
                />
                <button
                  onClick={() => { removeMcpServer(s.id); toast.success(`Removed ${s.name}`); }}
                  title="Remove server"
                  className="text-muted-foreground hover:text-destructive p-1.5 rounded-md hover:bg-accent"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Add form */}
        <div className="grid grid-cols-1 sm:grid-cols-[1fr_1.6fr] gap-2">
          <div className="space-y-1">
            <Label className="text-xs">Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="github" className="text-xs" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Server URL</Label>
            <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://example.com/mcp" className="font-mono text-xs" />
          </div>
          <div className="space-y-1 sm:col-span-2">
            <Label className="text-xs">Authorization header <span className="text-muted-foreground">(optional)</span></Label>
            <div className="flex gap-2">
              <Input value={auth} onChange={(e) => setAuth(e.target.value)} placeholder="Bearer sk-…" className="font-mono text-xs" type="password" />
              <Button onClick={() => add()} disabled={!name.trim() || !url.trim()}>
                <Plus className="h-4 w-4" /> Add
              </Button>
            </div>
          </div>
        </div>

        {/* Presets */}
        <div>
          <p className="text-xs text-muted-foreground mb-1.5">Quick add:</p>
          <div className="flex flex-wrap gap-2">
            {PRESETS.map((p) => (
              <button
                key={p.url}
                onClick={() => add(p.name, p.url)}
                title={p.hint}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border bg-card hover:bg-accent text-xs"
              >
                <Plus className="h-3 w-3" /> {p.name}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-start gap-2 text-[11px] text-muted-foreground">
          <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
          <p>
            MCP tools run with your approval each time (even in Smart mode). Auth headers are sent
            only through the LLMAtlas server proxy and stored locally in your browser.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
