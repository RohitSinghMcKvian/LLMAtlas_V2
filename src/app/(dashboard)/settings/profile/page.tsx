"use client"

import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useSession } from "next-auth/react"
import { motion } from "framer-motion"
import { Camera, Loader2, CheckCircle2, AlertCircle, User } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { updateProfileSchema, type UpdateProfileInput } from "@/lib/validations/profile"

interface UserProfile {
  id: string
  name: string | null
  email: string
  username: string | null
  image: string | null
  bio: string | null
  tier: string
  emailVerified: string | null
  twoFactorAuth: { enabled: boolean } | null
}

export default function ProfileSettingsPage() {
  const { data: session, update: updateSession } = useSession()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<UpdateProfileInput>({
    resolver: zodResolver(updateProfileSchema),
  })

  useEffect(() => {
    fetch("/api/user/profile")
      .then((r) => r.json())
      .then((data) => {
        setProfile(data)
        reset({
          name: data.name || "",
          username: data.username || "",
          bio: data.bio || "",
        })
        setIsLoading(false)
      })
      .catch(() => setIsLoading(false))
  }, [reset])

  const onSubmit = async (data: UpdateProfileInput) => {
    setIsSaving(true)
    try {
      const res = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
      const json = await res.json()
      if (!res.ok) {
        toast.error(json.error || "Update failed")
        return
      }
      toast.success("Profile updated")
      setProfile((p) => p ? { ...p, ...json } : null)
      await updateSession({ name: json.name, username: json.username })
      reset(data)
    } catch {
      toast.error("Something went wrong")
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!session) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        Please sign in to view profile settings.
      </div>
    )
  }

  const tierColors: Record<string, string> = {
    FREE: "bg-slate-500/20 text-slate-300 border-slate-500/30",
    PRO: "bg-blue-500/20 text-blue-300 border-blue-500/30",
    TEAM: "bg-violet-500/20 text-violet-300 border-violet-500/30",
    ENTERPRISE: "bg-amber-500/20 text-amber-300 border-amber-500/30",
  }

  return (
    <div className="max-w-2xl mx-auto py-8 px-4 space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Profile</h1>
        <p className="text-muted-foreground text-sm mt-1">Manage your public profile and account information</p>
      </div>

      {/* Avatar & account info */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-5 p-6 rounded-xl border bg-card"
      >
        <div className="relative">
          <div className="h-20 w-20 rounded-full bg-gradient-to-br from-blue-500 to-violet-500 flex items-center justify-center text-white text-2xl font-bold overflow-hidden">
            {profile?.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={profile.image} alt={profile.name || ""} className="w-full h-full object-cover" />
            ) : (
              <User className="w-8 h-8" />
            )}
          </div>
          <button className="absolute -bottom-1 -right-1 h-7 w-7 rounded-full bg-primary flex items-center justify-center border-2 border-background hover:bg-primary/90 transition-colors">
            <Camera className="w-3 h-3 text-white" />
          </button>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-lg truncate">{profile?.name || "No name"}</span>
            <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${tierColors[profile?.tier || "FREE"]}`}>
              {profile?.tier}
            </span>
          </div>
          <p className="text-sm text-muted-foreground truncate">{profile?.email}</p>
          <div className="flex items-center gap-1.5 mt-1">
            {profile?.emailVerified ? (
              <><CheckCircle2 className="w-3.5 h-3.5 text-green-400" /><span className="text-xs text-green-400">Email verified</span></>
            ) : (
              <><AlertCircle className="w-3.5 h-3.5 text-yellow-400" /><span className="text-xs text-yellow-400">Email not verified</span></>
            )}
          </div>
        </div>
      </motion.div>

      {/* Edit form */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="p-6 rounded-xl border bg-card space-y-5"
      >
        <h2 className="font-semibold">Personal information</h2>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-sm text-muted-foreground">Full name</Label>
              <Input
                placeholder="Ada Lovelace"
                className="bg-muted/50"
                {...register("name")}
              />
              {errors.name && <p className="text-xs text-red-400">{errors.name.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm text-muted-foreground">Username</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">@</span>
                <Input
                  placeholder="ada_lovelace"
                  className="bg-muted/50 pl-7"
                  {...register("username")}
                />
              </div>
              {errors.username && <p className="text-xs text-red-400">{errors.username.message}</p>}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-sm text-muted-foreground">Bio</Label>
            <textarea
              placeholder="Tell us a bit about yourself..."
              rows={3}
              className="w-full rounded-md border bg-muted/50 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring resize-none"
              {...register("bio")}
            />
            {errors.bio && <p className="text-xs text-red-400">{errors.bio.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label className="text-sm text-muted-foreground">Email address</Label>
            <Input value={profile?.email || ""} disabled className="bg-muted/30 opacity-60" />
            <p className="text-xs text-muted-foreground">Email changes require verification. Contact support.</p>
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => reset()} disabled={!isDirty}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!isDirty || isSaving}
              className="bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-500 hover:to-violet-500 text-white border-0"
            >
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Save changes
            </Button>
          </div>
        </form>
      </motion.div>
    </div>
  )
}
