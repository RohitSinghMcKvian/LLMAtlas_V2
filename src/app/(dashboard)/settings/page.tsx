"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { useSession } from "next-auth/react";
import {
  Settings as Cog, Key, ExternalLink, Eye, EyeOff, CheckCircle2, AlertCircle, Sparkles,
  User, Shield, Bell, Link2, KeyRound, ChevronRight,
} from "lucide-react";
import { toast } from "sonner";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useSettingsStore } from "@/lib/store";
import { PROVIDERS, type ProviderId } from "@/lib/models";
import { McpServersPanel } from "@/components/settings/mcp-servers";
import { MemoryPanel } from "@/components/settings/memory-panel";
import { WebToolsPanel } from "@/components/settings/web-tools";
import { SkillsPanel } from "@/components/settings/skills-panel";

const ACCOUNT_LINKS = [
  { href: "/settings/profile", icon: User, label: "Profile", description: "Name, username, avatar, bio" },
  { href: "/settings/security", icon: Shield, label: "Security", description: "Password, 2FA, login history" },
  { href: "/settings/notifications", icon: Bell, label: "Notifications", description: "Email alert preferences" },
  { href: "/settings/connected-accounts", icon: Link2, label: "Connected accounts", description: "Google, GitHub, Discord" },
  { href: "/settings/api-keys", icon: KeyRound, label: "API Keys", description: "Manage personal LLMAtlas keys" },
]

export default function SettingsPage() {
  const { data: session } = useSession();
  const keys = useSettingsStore((s) => s.keys);
  const setKey = useSettingsStore((s) => s.setKey);
  const clearKey = useSettingsStore((s) => s.clearKey);

  return (
    <div className="container max-w-4xl py-8">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <div className="inline-flex items-center gap-2 mb-2">
          <Cog className="h-5 w-5 text-muted-foreground" />
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Settings
          </span>
        </div>
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
          API keys & preferences
        </h1>
        <p className="mt-2 text-muted-foreground">
          Bring your own keys — stored only in your browser, never on our servers.
        </p>
      </motion.div>

      {/* My Account section */}
      {session && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="mb-8">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">My account</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {ACCOUNT_LINKS.map((link) => {
              const Icon = link.icon
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className="flex items-center gap-3 p-4 rounded-xl border bg-card hover:bg-accent/50 transition-colors group"
                >
                  <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                    <Icon className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{link.label}</p>
                    <p className="text-xs text-muted-foreground truncate">{link.description}</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                </Link>
              )
            })}
          </div>
        </motion.div>
      )}

      {!session && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mb-8 p-5 rounded-xl border border-blue-500/20 bg-blue-500/5">
          <div className="flex items-center gap-3">
            <User className="w-5 h-5 text-blue-400 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium">Sign in to unlock account features</p>
              <p className="text-xs text-muted-foreground">Save settings to the cloud, manage 2FA, API keys, and more.</p>
            </div>
            <Link href="/auth/login">
              <Button size="sm" className="bg-gradient-to-r from-blue-600 to-violet-600 text-white border-0">Sign in</Button>
            </Link>
          </div>
        </motion.div>
      )}

      <Card className="mb-6 border-amber-500/30 bg-amber-500/5">
        <CardContent className="p-4 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-semibold mb-1">Server-side keys take priority.</p>
            <p className="text-muted-foreground">
              If you set keys in <code className="bg-muted px-1 rounded">.env.local</code>,
              they'll be used automatically. The fields below only apply when no server key is present.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" /> Provider keys (BYOK)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          {(Object.keys(PROVIDERS) as ProviderId[]).map((id) => (
            <KeyRow
              key={id}
              providerId={id}
              value={keys[id] ?? ""}
              onSave={(v) => {
                setKey(id, v);
                toast.success(`${PROVIDERS[id].name} key saved (local only)`);
              }}
              onClear={() => {
                clearKey(id);
                toast.success(`${PROVIDERS[id].name} key cleared`);
              }}
            />
          ))}
        </CardContent>
      </Card>

      <McpServersPanel />

      <SkillsPanel className="mt-6" />

      <WebToolsPanel className="mt-6" />

      <MemoryPanel className="mt-6" />

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>About data storage</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>• All API keys you enter here are stored in <code className="bg-muted px-1 rounded">localStorage</code> and never leave your browser.</p>
          <p>• Saved prompts, learning progress, and preferences are also local-only.</p>
          <p>• Clear browser data to wipe everything. Self-host the app to control the full stack.</p>
        </CardContent>
      </Card>
    </div>
  );
}

function KeyRow({
  providerId, value, onSave, onClear,
}: {
  providerId: ProviderId;
  value: string;
  onSave: (v: string) => void;
  onClear: () => void;
}) {
  const provider = PROVIDERS[providerId];
  const [draft, setDraft] = useState(value);
  const [revealed, setRevealed] = useState(false);

  const hasKey = !!value;
  const dirty = draft !== value;

  // Pollinations is keyless — no input needed
  if (providerId === "pollinations") {
    return (
      <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] gap-4 items-start">
        <div className="flex items-center gap-3">
          <div
            className="h-10 w-10 rounded-md flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
            style={{ backgroundColor: provider.color }}
          >
            {provider.name.slice(0, 2).toUpperCase()}
          </div>
          <div>
            <p className="text-sm font-semibold">{provider.name}</p>
            <a
              href={provider.getKeyUrl}
              target="_blank"
              rel="noreferrer"
              className="text-[11px] text-primary hover:underline inline-flex items-center gap-0.5"
            >
              Visit site <ExternalLink className="h-2.5 w-2.5" />
            </a>
          </div>
        </div>
        <div className="space-y-2">
          <Badge variant="frontier-free" className="text-[11px] px-2.5 py-1">
            <Sparkles className="h-3 w-3 mr-1.5" />
            Keyless · No key needed
          </Badge>
          <p className="text-[11px] text-muted-foreground">
            Pollinations is keyless and rate-limited per IP. Prompts may be visible to operators —
            avoid sensitive content.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] gap-4 items-start">
      <div className="flex items-center gap-3">
        <div
          className="h-10 w-10 rounded-md flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
          style={{ backgroundColor: provider.color }}
        >
          {provider.name.slice(0, 2).toUpperCase()}
        </div>
        <div>
          <p className="text-sm font-semibold">{provider.name}</p>
          <a
            href={provider.getKeyUrl}
            target="_blank"
            rel="noreferrer"
            className="text-[11px] text-primary hover:underline inline-flex items-center gap-0.5"
          >
            Get key <ExternalLink className="h-2.5 w-2.5" />
          </a>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Input
              type={revealed ? "text" : "password"}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Paste API key…"
              className="font-mono text-xs pr-9"
            />
            <button
              onClick={() => setRevealed((r) => !r)}
              type="button"
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              aria-label="Toggle reveal"
            >
              {revealed ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          <Button onClick={() => onSave(draft)} disabled={!dirty || !draft}>
            <CheckCircle2 className="h-4 w-4" /> Save
          </Button>
          {hasKey && (
            <Button onClick={onClear} variant="outline">Clear</Button>
          )}
        </div>
        {hasKey && (
          <Badge variant="success" className="text-[10px]">
            <CheckCircle2 className="h-3 w-3 mr-1" /> Saved locally
          </Badge>
        )}
      </div>
    </div>
  );
}
