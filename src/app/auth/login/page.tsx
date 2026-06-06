import { Suspense } from "react"
import Link from "next/link"
import type { Metadata } from "next"
import { AuthLayout } from "@/components/auth/auth-layout"
import { LoginForm } from "@/components/auth/login-form"
import { SocialButtons } from "@/components/auth/social-buttons"

export const metadata: Metadata = { title: "Sign in" }

export default function LoginPage() {
  const configuredProviders = {
    google: !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
    github: !!(process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET),
    discord: !!(process.env.DISCORD_CLIENT_ID && process.env.DISCORD_CLIENT_SECRET),
  }
  const hasAnyProvider = Object.values(configuredProviders).some(Boolean)

  return (
    <AuthLayout
      title="Welcome back"
      description="Sign in to your LLMAtlas account"
      footer={
        <>
          Don&apos;t have an account?{" "}
          <Link href="/auth/register" className="text-blue-400 hover:text-blue-300 transition-colors font-medium">
            Create one free
          </Link>
        </>
      }
    >
      <div className="space-y-5">
        <Suspense>
          <LoginForm />
        </Suspense>

        {hasAnyProvider && (
          <>
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-white/10" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-[hsl(222,47%,8%)] px-3 text-white/30">or continue with</span>
              </div>
            </div>

            <SocialButtons providers={configuredProviders} />
          </>
        )}
      </div>
    </AuthLayout>
  )
}
