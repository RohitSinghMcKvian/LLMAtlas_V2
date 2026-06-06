"use client"

import { useState } from "react"
import { useSession } from "next-auth/react"
import { AlertCircle, X, Loader2, CheckCircle2 } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"

export function EmailVerificationBanner() {
  const { data: session } = useSession()
  const [dismissed, setDismissed] = useState(false)
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)

  if (!session?.user?.email) return null
  if ((session.user as { emailVerified?: Date | null }).emailVerified) return null
  if (dismissed) return null

  const resend = async () => {
    setSending(true)
    try {
      const res = await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: session.user.email }),
      })
      if (res.ok) {
        setSent(true)
        toast.success("Verification email sent!")
      } else {
        toast.error("Failed to send email. Try again later.")
      }
    } catch {
      toast.error("Something went wrong.")
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-2.5 flex items-center gap-3 text-sm">
      <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0" />
      <p className="flex-1 text-amber-200 text-xs">
        <span className="font-medium">Please verify your email</span> — check your inbox for a verification link or{" "}
        {sent ? (
          <span className="inline-flex items-center gap-1 text-green-400">
            <CheckCircle2 className="w-3 h-3" /> sent!
          </span>
        ) : (
          <button
            onClick={resend}
            disabled={sending}
            className="underline hover:no-underline text-amber-300 hover:text-amber-200 inline-flex items-center gap-1"
          >
            {sending ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
            resend it
          </button>
        )}
      </p>
      <button
        onClick={() => setDismissed(true)}
        className="text-amber-400/60 hover:text-amber-400 transition-colors flex-shrink-0"
        aria-label="Dismiss"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  )
}
