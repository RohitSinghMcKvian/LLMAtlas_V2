"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { motion, AnimatePresence } from "framer-motion"
import { Key, Plus, Trash2, Copy, Check, Loader2, Eye, EyeOff } from "lucide-react"
import { toast } from "sonner"
import { copyToClipboard } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { formatDistanceToNow } from "date-fns"

interface ApiKey {
  id: string
  name: string
  keyPreview: string
  lastUsed: string | null
  createdAt: string
}

interface NewKey extends ApiKey {
  key: string
}

export default function ApiKeysPage() {
  const { data: session } = useSession()
  const [keys, setKeys] = useState<ApiKey[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [newKeyName, setNewKeyName] = useState("")
  const [isCreating, setIsCreating] = useState(false)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [newKey, setNewKey] = useState<NewKey | null>(null)
  const [copiedKey, setCopiedKey] = useState(false)
  const [revokingId, setRevokingId] = useState<string | null>(null)

  useEffect(() => {
    if (!session) return
    fetch("/api/user/api-keys")
      .then((r) => r.json())
      .then((data) => { setKeys(data); setIsLoading(false) })
      .catch(() => setIsLoading(false))
  }, [session])

  const createKey = async () => {
    if (!newKeyName.trim()) return
    setIsCreating(true)
    try {
      const res = await fetch("/api/user/api-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newKeyName.trim() }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error); return }
      setNewKey(data)
      setKeys((k) => [{ id: data.id, name: data.name, keyPreview: data.keyPreview, lastUsed: null, createdAt: data.createdAt }, ...k])
      setNewKeyName("")
      setShowCreateForm(false)
      toast.success("API key created")
    } catch {
      toast.error("Failed to create API key")
    } finally {
      setIsCreating(false)
    }
  }

  const revokeKey = async (id: string) => {
    setRevokingId(id)
    try {
      const res = await fetch(`/api/user/api-keys/${id}`, { method: "DELETE" })
      if (!res.ok) { toast.error("Failed to revoke key"); return }
      setKeys((k) => k.filter((key) => key.id !== id))
      toast.success("API key revoked")
    } catch {
      toast.error("Failed to revoke key")
    } finally {
      setRevokingId(null)
    }
  }

  const copyKey = async (key: string) => {
    await copyToClipboard(key)
    setCopiedKey(true)
    setTimeout(() => setCopiedKey(false), 2000)
  }

  if (!session) {
    return <div className="text-center py-16 text-muted-foreground">Please sign in to manage API keys.</div>
  }

  return (
    <div className="max-w-2xl mx-auto py-8 px-4 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">API Keys</h1>
          <p className="text-muted-foreground text-sm mt-1">Manage your personal LLMAtlas API keys</p>
        </div>
        <Button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-500 hover:to-violet-500 text-white border-0 gap-2"
        >
          <Plus className="w-4 h-4" /> New key
        </Button>
      </div>

      {/* New key created banner */}
      <AnimatePresence>
        {newKey && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="p-4 rounded-xl border border-green-500/30 bg-green-500/10 space-y-3"
          >
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-green-400" />
              <p className="text-sm font-medium text-green-400">Key created — save it now, it won&apos;t be shown again</p>
            </div>
            <div className="flex items-center gap-2">
              <code className="flex-1 text-xs bg-black/20 px-3 py-2 rounded font-mono break-all">{newKey.key}</code>
              <Button variant="ghost" size="icon" className="flex-shrink-0 h-8 w-8" onClick={() => copyKey(newKey.key)}>
                {copiedKey ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
              </Button>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setNewKey(null)} className="text-muted-foreground">
              I&apos;ve saved my key
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Create form */}
      <AnimatePresence>
        {showCreateForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="p-5 rounded-xl border bg-card space-y-3">
              <h3 className="font-medium">Create new API key</h3>
              <div className="space-y-1.5">
                <Label className="text-sm">Key name</Label>
                <Input
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                  placeholder="e.g., Production, Personal project"
                  className="bg-muted/50"
                  onKeyDown={(e) => e.key === "Enter" && createKey()}
                  autoFocus
                />
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setShowCreateForm(false)}>Cancel</Button>
                <Button
                  onClick={createKey}
                  disabled={!newKeyName.trim() || isCreating}
                  className="bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-500 hover:to-violet-500 text-white border-0"
                >
                  {isCreating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  Create key
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Keys list */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="rounded-xl border bg-card overflow-hidden">
        <div className="px-6 py-4 border-b">
          <div className="flex items-center gap-2">
            <Key className="w-4 h-4 text-primary" />
            <h2 className="font-semibold">Your API keys</h2>
            <Badge variant="secondary" className="ml-auto">{keys.length}/10</Badge>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center h-24"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
        ) : keys.length === 0 ? (
          <div className="text-center py-10 text-muted-foreground">
            <Key className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p className="text-sm">No API keys yet. Create your first key to get started.</p>
          </div>
        ) : (
          <div className="divide-y">
            {keys.map((key) => (
              <div key={key.id} className="flex items-center gap-3 px-6 py-4">
                <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                  <Key className="w-4 h-4 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{key.name}</p>
                  <p className="text-xs text-muted-foreground font-mono">{key.keyPreview}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-xs text-muted-foreground">Created {formatDistanceToNow(new Date(key.createdAt), { addSuffix: true })}</p>
                  {key.lastUsed && (
                    <p className="text-xs text-muted-foreground">Last used {formatDistanceToNow(new Date(key.lastUsed), { addSuffix: true })}</p>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-muted-foreground hover:text-red-400 flex-shrink-0"
                  onClick={() => revokeKey(key.id)}
                  disabled={revokingId === key.id}
                >
                  {revokingId === key.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                </Button>
              </div>
            ))}
          </div>
        )}
      </motion.div>

      <p className="text-xs text-muted-foreground px-1">
        API keys provide full access to your LLMAtlas account. Keep them secure and never share them publicly. You can have up to 10 active keys.
      </p>
    </div>
  )
}
