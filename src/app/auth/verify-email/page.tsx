"use client"

import { useEffect, useState, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import { CheckCircle2, XCircle, Loader2 } from "lucide-react"
import { AuthLayout } from "@/components/auth/auth-layout"
import { Button } from "@/components/ui/button"

function VerifyContent() {
  const searchParams = useSearchParams()
  const token = searchParams.get("token")
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading")
  const [message, setMessage] = useState("")

  useEffect(() => {
    if (!token) {
      setStatus("error")
      setMessage("No verification token provided.")
      return
    }

    fetch("/api/auth/verify-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setStatus("success")
          setMessage("Your email has been verified successfully!")
        } else {
          setStatus("error")
          setMessage(data.error || "Verification failed. The link may have expired.")
        }
      })
      .catch(() => {
        setStatus("error")
        setMessage("Something went wrong. Please try again.")
      })
  }, [token])

  if (status === "loading") {
    return (
      <div className="text-center py-6 space-y-3">
        <Loader2 className="w-10 h-10 animate-spin text-blue-400 mx-auto" />
        <p className="text-white/50 text-sm">Verifying your email...</p>
      </div>
    )
  }

  if (status === "success") {
    return (
      <div className="text-center py-4 space-y-4">
        <CheckCircle2 className="w-14 h-14 text-green-400 mx-auto" />
        <div>
          <p className="text-white font-medium">{message}</p>
          <p className="text-white/50 text-sm mt-1">You can now use all features of LLMAtlas.</p>
        </div>
        <Button asChild className="bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-500 hover:to-violet-500 text-white border-0">
          <Link href="/dashboard">Go to Dashboard</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="text-center py-4 space-y-4">
      <XCircle className="w-14 h-14 text-red-400 mx-auto" />
      <div>
        <p className="text-white font-medium">Verification failed</p>
        <p className="text-white/50 text-sm mt-1">{message}</p>
      </div>
      <Button asChild variant="outline" className="border-white/10 text-white/70 hover:text-white">
        <Link href="/auth/login">Back to sign in</Link>
      </Button>
    </div>
  )
}

export default function VerifyEmailPage() {
  return (
    <AuthLayout title="Verify your email" description="Confirming your email address">
      <Suspense
        fallback={
          <div className="text-center py-6">
            <Loader2 className="w-10 h-10 animate-spin text-blue-400 mx-auto" />
          </div>
        }
      >
        <VerifyContent />
      </Suspense>
    </AuthLayout>
  )
}
