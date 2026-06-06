"use client"

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useSession } from "next-auth/react"
import { motion } from "framer-motion"
import {
  Shield, ShieldCheck, ShieldOff, Key, History, Trash2, Loader2, Eye, EyeOff, ChevronDown, ChevronUp
} from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { TwoFactorSetup } from "@/components/auth/two-factor-setup"
import { LoginHistoryTable } from "@/components/auth/login-history-table"
import { DeleteAccountDialog } from "@/components/auth/delete-account-dialog"
import { changePasswordSchema, type ChangePasswordInput } from "@/lib/validations/auth"

interface UserProfile {
  twoFactorAuth: { enabled: boolean } | null
  hashedPassword?: string | null
}

export default function SecuritySettingsPage() {
  const { data: session } = useSession()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [show2FASetup, setShow2FASetup] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [disabling2FA, setDisabling2FA] = useState(false)
  const [show2FADisableForm, setShow2FADisableForm] = useState(false)
  const [disable2FACode, setDisable2FACode] = useState("")
  const [showCurrentPw, setShowCurrentPw] = useState(false)
  const [showNewPw, setShowNewPw] = useState(false)
  const [isChangingPw, setIsChangingPw] = useState(false)

  const {
    register,
    handleSubmit,
    reset: resetPwForm,
    formState: { errors },
  } = useForm<ChangePasswordInput>({ resolver: zodResolver(changePasswordSchema) })

  useEffect(() => {
    if (!session) return
    fetch("/api/user/profile").then((r) => r.json()).then(setProfile)
  }, [session])

  const twoFactorEnabled = profile?.twoFactorAuth?.enabled ?? false
  const hasPassword = !!profile?.hashedPassword

  const handleDisable2FA = async () => {
    setDisabling2FA(true)
    try {
      const res = await fetch("/api/auth/2fa/disable", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: disable2FACode }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error); return }
      toast.success("2FA disabled")
      setProfile((p) => p ? { ...p, twoFactorAuth: { enabled: false } } : p)
      setShow2FADisableForm(false)
      setDisable2FACode("")
    } catch {
      toast.error("Failed to disable 2FA")
    } finally {
      setDisabling2FA(false)
    }
  }

  const handleChangePassword = async (data: ChangePasswordInput) => {
    setIsChangingPw(true)
    try {
      const res = await fetch("/api/user/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
      const json = await res.json()
      if (!res.ok) { toast.error(json.error); return }
      toast.success("Password changed successfully")
      resetPwForm()
    } catch {
      toast.error("Failed to change password")
    } finally {
      setIsChangingPw(false)
    }
  }

  if (!session) {
    return <div className="text-center py-16 text-muted-foreground">Please sign in to manage security settings.</div>
  }

  return (
    <div className="max-w-2xl mx-auto py-8 px-4 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Security</h1>
        <p className="text-muted-foreground text-sm mt-1">Manage your account security and authentication methods</p>
      </div>

      {/* 2FA Section */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="p-6 rounded-xl border bg-card space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {twoFactorEnabled ? (
              <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center">
                <ShieldCheck className="w-5 h-5 text-green-400" />
              </div>
            ) : (
              <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                <Shield className="w-5 h-5 text-muted-foreground" />
              </div>
            )}
            <div>
              <h2 className="font-semibold">Two-factor authentication</h2>
              <p className="text-xs text-muted-foreground">
                {twoFactorEnabled ? "Active — your account is extra secure" : "Add an extra layer of protection"}
              </p>
            </div>
          </div>
          <div>
            {twoFactorEnabled ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShow2FADisableForm(!show2FADisableForm)}
                className="gap-1 text-red-400 hover:text-red-300 border-red-500/20 hover:border-red-500/40"
              >
                <ShieldOff className="w-3.5 h-3.5" /> Disable
              </Button>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShow2FASetup(!show2FASetup)}
                className="gap-1"
              >
                <Shield className="w-3.5 h-3.5" /> Enable
              </Button>
            )}
          </div>
        </div>

        {show2FASetup && !twoFactorEnabled && (
          <TwoFactorSetup
            onEnabled={() => {
              setProfile((p) => p ? { ...p, twoFactorAuth: { enabled: true } } : p)
              setShow2FASetup(false)
            }}
            onCancel={() => setShow2FASetup(false)}
          />
        )}

        {show2FADisableForm && twoFactorEnabled && (
          <div className="pt-2 border-t space-y-3">
            <div className="space-y-1.5">
              <Label className="text-sm">Enter your current authenticator code to confirm</Label>
              <Input
                value={disable2FACode}
                onChange={(e) => setDisable2FACode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="000000"
                maxLength={6}
                className="bg-muted/50 text-center font-mono tracking-widest"
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setShow2FADisableForm(false)}>Cancel</Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleDisable2FA}
                disabled={disable2FACode.length !== 6 || disabling2FA}
              >
                {disabling2FA ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : null}
                Disable 2FA
              </Button>
            </div>
          </div>
        )}
      </motion.div>

      {/* Change Password */}
      {hasPassword && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="p-6 rounded-xl border bg-card space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
              <Key className="w-5 h-5 text-muted-foreground" />
            </div>
            <div>
              <h2 className="font-semibold">Change password</h2>
              <p className="text-xs text-muted-foreground">Update your password regularly for better security</p>
            </div>
          </div>

          <form onSubmit={handleSubmit(handleChangePassword)} className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-sm">Current password</Label>
              <div className="relative">
                <Input
                  type={showCurrentPw ? "text" : "password"}
                  className="bg-muted/50 pr-10"
                  {...register("currentPassword")}
                />
                <button type="button" onClick={() => setShowCurrentPw(!showCurrentPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  {showCurrentPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.currentPassword && <p className="text-xs text-red-400">{errors.currentPassword.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm">New password</Label>
              <div className="relative">
                <Input
                  type={showNewPw ? "text" : "password"}
                  className="bg-muted/50 pr-10"
                  {...register("newPassword")}
                />
                <button type="button" onClick={() => setShowNewPw(!showNewPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  {showNewPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.newPassword && <p className="text-xs text-red-400">{errors.newPassword.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm">Confirm new password</Label>
              <Input type="password" className="bg-muted/50" {...register("confirmPassword")} />
              {errors.confirmPassword && <p className="text-xs text-red-400">{errors.confirmPassword.message}</p>}
            </div>

            <Button
              type="submit"
              disabled={isChangingPw}
              className="bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-500 hover:to-violet-500 text-white border-0"
            >
              {isChangingPw ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Update password
            </Button>
          </form>
        </motion.div>
      )}

      {/* Login History */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="p-6 rounded-xl border bg-card space-y-4">
        <button
          className="w-full flex items-center justify-between"
          onClick={() => setShowHistory(!showHistory)}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
              <History className="w-5 h-5 text-muted-foreground" />
            </div>
            <div className="text-left">
              <h2 className="font-semibold">Login history</h2>
              <p className="text-xs text-muted-foreground">Recent sign-in activity on your account</p>
            </div>
          </div>
          {showHistory ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
        </button>

        {showHistory && <LoginHistoryTable />}
      </motion.div>

      {/* Danger Zone */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="p-6 rounded-xl border border-red-500/20 bg-red-500/5 space-y-3">
        <div className="flex items-center gap-2">
          <Trash2 className="w-4 h-4 text-red-400" />
          <h2 className="font-semibold text-red-400">Danger zone</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          Permanently delete your account and all associated data. This action cannot be undone.
        </p>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowDeleteDialog(true)}
          className="text-red-400 hover:text-red-300 border-red-500/30 hover:border-red-500/50 hover:bg-red-500/10"
        >
          Delete my account
        </Button>
      </motion.div>

      <DeleteAccountDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        hasPassword={hasPassword}
      />
    </div>
  )
}
