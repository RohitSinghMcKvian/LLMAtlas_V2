"use client"

import { useState, useEffect } from "react"
import { useSession, signIn } from "next-auth/react"
import { motion } from "framer-motion"
import { Link2, Link2Off, Loader2, CheckCircle2 } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"

interface Account {
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
  const [accounts, setAccounts] = useState<Account[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!session) return
    fetch("/api/user/profile")
      .then((r) => r.json())
      .then((data) => {
        // We'll use the accounts from the profile endpoint if available
        setIsLoading(false)
      })
      .catch(() => setIsLoading(false))
  }, [session])

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

        {PROVIDERS.map((provider, i) => (
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
                  {/* In a real implementation, check if this provider is linked */}
                  Connect your {provider.name} account
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => signIn(provider.id, { callbackUrl: "/settings/connected-accounts" })}
              className="gap-1.5"
            >
              <Link2 className="w-3.5 h-3.5" /> Connect
            </Button>
          </motion.div>
        ))}
      </motion.div>

      <div className="p-4 rounded-lg bg-muted/30 border border-white/5">
        <p className="text-xs text-muted-foreground">
          Connecting accounts allows you to sign in with any linked provider. Your email remains your primary identifier. You must have at least one sign-in method active.
        </p>
      </div>
    </div>
  )
}
