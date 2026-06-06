"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { Loader2, ShieldCheck } from "lucide-react"
import { toast } from "sonner"
import { AuthLayout } from "@/components/auth/auth-layout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export default function TwoFactorPage() {
  const router = useRouter()
  const { data: session } = useSession()
  const [code, setCode] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [useBackupCode, setUseBackupCode] = useState(false)

  const handleVerify = async () => {
    if (!code.trim()) return
    setIsLoading(true)

    try {
      const res = await fetch("/api/auth/2fa/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: code.trim(), isBackupCode: useBackupCode }),
      })
      const data = await res.json()

      if (!res.ok) {
        toast.error(data.error || "Invalid code")
        return
      }

      toast.success("Identity verified")
      router.push("/dashboard")
      router.refresh()
    } catch {
      toast.error("Verification failed. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <AuthLayout
      title="Two-factor authentication"
      description="Enter the code from your authenticator app"
    >
      <div className="space-y-5">
        <div className="flex items-center justify-center w-14 h-14 rounded-full bg-blue-500/10 border border-blue-500/20 mx-auto">
          <ShieldCheck className="w-6 h-6 text-blue-400" />
        </div>

        <div className="space-y-1.5">
          <Label className="text-white/70 text-sm">
            {useBackupCode ? "Backup code" : "Authenticator code"}
          </Label>
          <Input
            value={code}
            onChange={(e) => setCode(useBackupCode ? e.target.value : e.target.value.replace(/\D/g, "").slice(0, 6))}
            placeholder={useBackupCode ? "XXXXXXXX" : "000000"}
            maxLength={useBackupCode ? 8 : 6}
            className="bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-blue-500/50 h-10 text-center text-lg tracking-widest font-mono"
            autoFocus
            onKeyDown={(e) => e.key === "Enter" && handleVerify()}
          />
        </div>

        <Button
          onClick={handleVerify}
          disabled={isLoading || code.length < (useBackupCode ? 8 : 6)}
          className="w-full h-10 bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-500 hover:to-violet-500 text-white border-0 font-semibold"
        >
          {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
          Verify
        </Button>

        <button
          type="button"
          onClick={() => { setUseBackupCode(!useBackupCode); setCode("") }}
          className="w-full text-xs text-white/40 hover:text-white/60 transition-colors text-center"
        >
          {useBackupCode ? "Use authenticator app instead" : "Use a backup code instead"}
        </button>
      </div>
    </AuthLayout>
  )
}
