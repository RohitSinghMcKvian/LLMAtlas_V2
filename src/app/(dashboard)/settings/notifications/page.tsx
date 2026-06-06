"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { motion } from "framer-motion"
import { Bell, Shield, Megaphone, BookOpen, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"

interface NotifSettings {
  emailNewLogin: boolean
  emailPasswordChange: boolean
  emailFeatureAnnouncements: boolean
  emailWeeklyDigest: boolean
}

const defaultSettings: NotifSettings = {
  emailNewLogin: true,
  emailPasswordChange: true,
  emailFeatureAnnouncements: false,
  emailWeeklyDigest: false,
}

interface PrefRow {
  key: keyof NotifSettings
  icon: React.ElementType
  label: string
  description: string
}

const PREFS: PrefRow[] = [
  { key: "emailNewLogin", icon: Shield, label: "New sign-in alerts", description: "Get notified when your account is accessed from a new device or location." },
  { key: "emailPasswordChange", icon: Shield, label: "Security changes", description: "Be alerted when your password or security settings are changed." },
  { key: "emailFeatureAnnouncements", icon: Megaphone, label: "Product announcements", description: "Hear about new features, models, and improvements." },
  { key: "emailWeeklyDigest", icon: BookOpen, label: "Weekly digest", description: "A weekly summary of new models, benchmarks, and community highlights." },
]

export default function NotificationsPage() {
  const { data: session } = useSession()
  const [settings, setSettings] = useState<NotifSettings>(defaultSettings)
  const [isLoading, setIsLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)

  useEffect(() => {
    if (!session) return
    fetch("/api/user/settings")
      .then((r) => r.json())
      .then((data) => {
        setSettings({
          emailNewLogin: data.emailNewLogin ?? true,
          emailPasswordChange: data.emailPasswordChange ?? true,
          emailFeatureAnnouncements: data.emailFeatureAnnouncements ?? false,
          emailWeeklyDigest: data.emailWeeklyDigest ?? false,
        })
        setIsLoading(false)
      })
      .catch(() => setIsLoading(false))
  }, [session])

  const toggle = async (key: keyof NotifSettings) => {
    const newVal = !settings[key]
    setSettings((s) => ({ ...s, [key]: newVal }))
    setSaving(key)

    try {
      const res = await fetch("/api/user/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [key]: newVal }),
      })
      if (!res.ok) {
        setSettings((s) => ({ ...s, [key]: !newVal }))
        toast.error("Failed to update preference")
      }
    } catch {
      setSettings((s) => ({ ...s, [key]: !newVal }))
      toast.error("Failed to update preference")
    } finally {
      setSaving(null)
    }
  }

  if (!session) {
    return <div className="text-center py-16 text-muted-foreground">Please sign in to manage notification preferences.</div>
  }

  if (isLoading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
  }

  return (
    <div className="max-w-2xl mx-auto py-8 px-4 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Notifications</h1>
        <p className="text-muted-foreground text-sm mt-1">Choose which emails you want to receive from LLMAtlas</p>
      </div>

      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="p-6 rounded-xl border bg-card space-y-1">
        <div className="flex items-center gap-2 mb-4">
          <Bell className="w-4 h-4 text-primary" />
          <h2 className="font-semibold">Email notifications</h2>
        </div>

        <div className="space-y-0">
          {PREFS.map((pref, i) => {
            const Icon = pref.icon
            return (
              <motion.div
                key={pref.key}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className="flex items-center justify-between py-4 border-b last:border-b-0 gap-4"
              >
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Icon className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <div className="min-w-0">
                    <Label className="text-sm font-medium cursor-pointer">{pref.label}</Label>
                    <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{pref.description}</p>
                  </div>
                </div>
                <div className="flex-shrink-0">
                  {saving === pref.key ? (
                    <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                  ) : (
                    <Switch
                      checked={settings[pref.key]}
                      onCheckedChange={() => toggle(pref.key)}
                    />
                  )}
                </div>
              </motion.div>
            )
          })}
        </div>
      </motion.div>

      <p className="text-xs text-muted-foreground px-1">
        We never sell your data. Security notifications (sign-in alerts, security changes) are highly recommended for your safety.
      </p>
    </div>
  )
}
