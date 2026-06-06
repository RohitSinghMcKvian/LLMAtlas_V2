"use client"

import { useState } from "react"
import { Loader2, Download, ShieldCheck, Copy, Check } from "lucide-react"
import { toast } from "sonner"
import { copyToClipboard } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface TwoFactorSetupProps {
  onEnabled: () => void
  onCancel: () => void
}

export function TwoFactorSetup({ onEnabled, onCancel }: TwoFactorSetupProps) {
  const [step, setStep] = useState<"init" | "scan" | "verify" | "backup">("init")
  const [qrCode, setQrCode] = useState("")
  const [secret, setSecret] = useState("")
  const [code, setCode] = useState("")
  const [backupCodes, setBackupCodes] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [copiedSecret, setCopiedSecret] = useState(false)

  const initSetup = async () => {
    setIsLoading(true)
    try {
      const res = await fetch("/api/auth/2fa/setup", { method: "POST" })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error); return }
      setQrCode(data.qrCode)
      setSecret(data.secret)
      setStep("scan")
    } catch {
      toast.error("Setup failed. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  const verifyAndEnable = async () => {
    if (code.length !== 6) return
    setIsLoading(true)
    try {
      const res = await fetch("/api/auth/2fa/enable", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error || "Invalid code"); return }
      setBackupCodes(data.backupCodes)
      setStep("backup")
    } catch {
      toast.error("Verification failed")
    } finally {
      setIsLoading(false)
    }
  }

  const downloadBackupCodes = () => {
    const text = `LLMAtlas 2FA Backup Codes\nGenerated: ${new Date().toLocaleDateString()}\n\nKeep these safe. Each code can only be used once.\n\n${backupCodes.join("\n")}`
    const blob = new Blob([text], { type: "text/plain" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "llmatlas-backup-codes.txt"
    a.click()
    URL.revokeObjectURL(url)
  }

  const copySecret = async () => {
    await copyToClipboard(secret)
    setCopiedSecret(true)
    setTimeout(() => setCopiedSecret(false), 2000)
  }

  if (step === "init") {
    return (
      <div className="space-y-4">
        <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/20 text-sm text-blue-300">
          Two-factor authentication adds an extra layer of security by requiring a code from your phone in addition to your password.
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onCancel} className="flex-1">Cancel</Button>
          <Button
            onClick={initSetup}
            disabled={isLoading}
            className="flex-1 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white border-0"
          >
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            Set up 2FA
          </Button>
        </div>
      </div>
    )
  }

  if (step === "scan") {
    return (
      <div className="space-y-4">
        <div>
          <h3 className="font-medium mb-1">1. Scan QR code</h3>
          <p className="text-sm text-muted-foreground">Use Google Authenticator, Authy, or any TOTP app to scan this code.</p>
        </div>

        <div className="flex justify-center p-4 bg-white rounded-xl">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qrCode} alt="2FA QR Code" className="w-44 h-44" />
        </div>

        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">Or enter this key manually:</p>
          <div className="flex items-center gap-2">
            <code className="flex-1 text-xs bg-muted px-3 py-2 rounded font-mono break-all">{secret}</code>
            <Button variant="ghost" size="icon" className="flex-shrink-0 h-8 w-8" onClick={copySecret}>
              {copiedSecret ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
            </Button>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label className="text-sm">2. Enter the 6-digit code from your app</Label>
          <Input
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
            placeholder="000000"
            maxLength={6}
            className="text-center text-lg tracking-widest font-mono bg-muted/50"
            onKeyDown={(e) => e.key === "Enter" && verifyAndEnable()}
          />
        </div>

        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setStep("init")} className="flex-1">Back</Button>
          <Button
            onClick={verifyAndEnable}
            disabled={code.length !== 6 || isLoading}
            className="flex-1 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white border-0"
          >
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            Verify & Enable
          </Button>
        </div>
      </div>
    )
  }

  if (step === "backup") {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-green-400" />
          <h3 className="font-medium">2FA enabled! Save your backup codes</h3>
        </div>
        <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-sm text-amber-300">
          Save these backup codes in a safe place. You can use them to access your account if you lose access to your authenticator app. Each code can only be used once.
        </div>
        <div className="grid grid-cols-2 gap-2">
          {backupCodes.map((code, i) => (
            <code key={i} className="text-center font-mono text-sm bg-muted px-3 py-1.5 rounded border border-white/5">
              {code}
            </code>
          ))}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={downloadBackupCodes} className="flex-1 gap-2">
            <Download className="w-4 h-4" /> Download
          </Button>
          <Button
            onClick={onEnabled}
            className="flex-1 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white border-0"
          >
            I&apos;ve saved my codes
          </Button>
        </div>
      </div>
    )
  }

  return null
}
