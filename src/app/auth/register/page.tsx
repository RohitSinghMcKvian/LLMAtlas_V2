import Link from "next/link"
import type { Metadata } from "next"
import { AuthLayout } from "@/components/auth/auth-layout"
import { RegisterForm } from "@/components/auth/register-form"
import { SocialButtons } from "@/components/auth/social-buttons"

export const metadata: Metadata = { title: "Create account" }

export default function RegisterPage() {
  const configuredProviders = {
    google: !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
    github: !!(process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET),
    discord: !!(process.env.DISCORD_CLIENT_ID && process.env.DISCORD_CLIENT_SECRET),
  }
  const hasAnyProvider = Object.values(configuredProviders).some(Boolean)

  return (
    <AuthLayout
      title="Create your account"
      description="Join thousands of developers exploring LLMs"
      footer={
        <>
          Already have an account?{" "}
          <Link href="/auth/login" className="text-blue-400 hover:text-blue-300 transition-colors font-medium">
            Sign in
          </Link>
        </>
      }
    >
      <div className="space-y-5">
        <RegisterForm />

        {hasAnyProvider && (
          <>
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-white/10" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-[hsl(222,47%,8%)] px-3 text-white/30">or sign up with</span>
              </div>
            </div>

            <SocialButtons providers={configuredProviders} />
          </>
        )}
      </div>
    </AuthLayout>
  )
}
