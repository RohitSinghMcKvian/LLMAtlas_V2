"use client"

import { Suspense } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import { AlertTriangle } from "lucide-react"
import { AuthLayout } from "@/components/auth/auth-layout"
import { Button } from "@/components/ui/button"

const errorMessages: Record<string, string> = {
  Configuration: "There is a problem with the server configuration.",
  AccessDenied: "You do not have permission to sign in.",
  Verification: "The sign-in link is no longer valid. It may have been used already or expired.",
  OAuthSignin: "Could not sign in with this provider. Please try again.",
  OAuthCallback: "OAuth callback failed. Please try again.",
  OAuthCreateAccount: "Could not create account using this provider.",
  EmailCreateAccount: "Could not create account with this email.",
  Callback: "Something went wrong during authentication.",
  OAuthAccountNotLinked: "This email is already linked to another sign-in method. Sign in with the method you used originally.",
  Default: "An unexpected authentication error occurred.",
}

function ErrorContent() {
  const searchParams = useSearchParams()
  const error = searchParams.get("error") ?? "Default"
  const message = errorMessages[error] ?? errorMessages.Default

  return (
    <div className="text-center py-4 space-y-4">
      <div className="w-14 h-14 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto">
        <AlertTriangle className="w-6 h-6 text-red-400" />
      </div>
      <div>
        <p className="text-white font-medium">Authentication error</p>
        <p className="text-white/50 text-sm mt-1 max-w-xs mx-auto">{message}</p>
      </div>
      <div className="flex flex-col gap-2">
        <Button asChild className="bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-500 hover:to-violet-500 text-white border-0">
          <Link href="/auth/login">Try signing in again</Link>
        </Button>
        <Button asChild variant="ghost" className="text-white/50 hover:text-white">
          <Link href="/">Go to homepage</Link>
        </Button>
      </div>
    </div>
  )
}

export default function AuthErrorPage() {
  return (
    <AuthLayout title="Sign in error" description="Something went wrong with authentication">
      <Suspense>
        <ErrorContent />
      </Suspense>
    </AuthLayout>
  )
}
