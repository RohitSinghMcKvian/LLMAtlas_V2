"use client"

import { useState, useEffect } from "react"
import { useSession, signIn } from "next-auth/react"
import { motion } from "framer-motion"
import { Link2, Link2Off, Loader2, CheckCircle2, AlertTriangle } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"

interface LinkedAccount {
  id: string
  provider: string
  providerAccountId: string
}

const PROVIDERS = [
  { id: "google", name: "Google", icon: "G", color: "from-red-500 to-yellow-500" },
  { id: "github", name: "GitHub", icon: "GH", color: "from-gray-600 to-gray-800" },
  { id: "discord", name: "Discord", icon: "D", color: "from-indigo-500 to-purple-600" },
]

export default function ConnectedAccountsPage() {
  const { data: session } = useSession()
  const [accounts, setAccounts] = useState<LinkedAccount[]>([])
  const [hasPassword, setHasPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [disconnecting, setDisconnecting] = useState<string | null>(null)

  useEffect(() => {
    if (!session) return

    Promise.all([
      fetch("/api/user/accounts").then((r) => r.json()),
      fetch("/api/user/profile").then((r) => r.json()),
    ])
      .then(([accountsData, profileData]) => {
        setAccounts(Array.isArray(accountsData) ? accountsData : [])
        setHasPassword(profileData.hasPassword ?? false)
        setIsLoading(false)
      })
      .catch(() => setIsLoading(false))
  }, [session])

  const isLinked = (providerId: string) =>
    accounts.some((a) => a.provider === providerId)

  const canDisconnect = (providerId: string) => {
    const otherAccounts = accounts.filter((a) => a.provider !== providerId).length
    return hasPassword || otherAccounts > 0
  }

  const handleDisconnect = async (providerId: string) => {
    setDisconnecting(providerId)
    try {
      const res = await fetch("/api/user/accounts", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider: providerId }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || "Failed to disconnect")
        return
      }
      setAccounts((prev) => prev.filter((a) => a.provider !== providerId))
      toast.success(`${PROVIDERS.find((p) => p.id === providerId)?.name} disconnected`)
    } catch {
      toast.error("Something went wrong")
    } finally {
      setDisconnecting(null)
    }
  }

  if (!session) {
    return <div className="text-center py-16 text-muted-foreground">Please sign in to manage connected accounts.</div>
  }

  return (
    <div className="max-w-2xl mx-auto py-8 px-4 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Connected accounts</h1>
        <p className="text-muted-foreground text-sm mt-1">Connect social accounts for faster sign-in</p>
      </div>

      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="p-6 rounded-xl border bg-card space-y-3">
        <div className="flex items-center gap-2 mb-4">
          <Link2 className="w-4 h-4 text-primary" />
          <h2 className="font-semibold">OAuth providers</h2>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          PROVIDERS.map((provider, i) => {
            const linked = isLinked(provider.id)
            const canRemove = canDisconnect(provider.id)

            return (
              <motion.div
                key={provider.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className="flex items-center justify-between p-4 rounded-lg bg-muted/30 border border-white/5"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${provider.color} flex items-center justify-center text-white text-xs font-bold`}>
                    {provider.icon}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{provider.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {linked ? (
                        <span className="flex items-center gap-1 text-green-400">
                          <CheckCircle2 className="w-3 h-3" /> Connected
                        </span>
                      ) : (
                        `Connect your ${provider.name} account`
                      )}
                    </p>
                  </div>
                </div>

                {linked ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDisconnect(provider.id)}
                    disabled={!canRemove || disconnecting === provider.id}
                    title={!canRemove ? "Set a password before disconnecting your only sign-in method" : ""}
                    className="gap-1.5 text-red-400 hover:text-red-300 border-red-500/20 hover:border-red-500/40"
                  >
                    {disconnecting === provider.id ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Link2Off className="w-3.5 h-3.5" />
                    )}
                    Disconnect
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => signIn(provider.id, { callbackUrl: "/settings/connected-accounts" })}
                    className="gap-1.5"
                  >
                    <Link2 className="w-3.5 h-3.5" /> Connect
                  </Button>
                )}
              </motion.div>
            )
          })
        )}
      </motion.div>

      {!hasPassword && accounts.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="flex items-start gap-3 p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/20"
        >
          <AlertTriangle className="w-4 h-4 text-yellow-400 mt-0.5 shrink-0" />
          <p className="text-xs text-yellow-200/80">
            You don&apos;t have a password set. If you disconnect all providers, you won&apos;t be able to sign in.{" "}
            <a href="/settings/security" className="text-yellow-400 hover:underline font-medium">Set a password</a> first.
          </p>
        </motion.div>
      )}

      <div className="p-4 rounded-lg bg-muted/30 border border-white/5">
        <p className="text-xs text-muted-foreground">
          Connecting accounts allows you to sign in with any linked provider. Your email remains your primary identifier. You must have at least one sign-in method active.
        </p>
      </div>
    </div>
  )
}
