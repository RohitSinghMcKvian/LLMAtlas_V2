"use client"

import { useState, Suspense } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useSearchParams, useRouter } from "next/navigation"
import Link from "next/link"
import { Eye, EyeOff, Loader2, CheckCircle2 } from "lucide-react"
import { toast } from "sonner"
import { AuthLayout } from "@/components/auth/auth-layout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { PasswordStrength } from "@/components/auth/password-strength"
import { resetPasswordSchema, type ResetPasswordInput } from "@/lib/validations/auth"

function ResetPasswordForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get("token") ?? ""
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm<ResetPasswordInput>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { token },
  })

  const onSubmit = async (data: ResetPasswordInput) => {
    setIsLoading(true)
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
      const json = await res.json()

      if (!res.ok) {
        toast.error(json.error || "Password reset failed")
        return
      }

      setSuccess(true)
      setTimeout(() => router.push("/auth/login"), 2000)
    } catch {
      toast.error("Something went wrong. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  if (!token) {
    return (
      <div className="text-center py-4">
        <p className="text-red-400 text-sm">Invalid or missing reset token.</p>
        <Link href="/auth/forgot-password" className="text-blue-400 hover:underline text-sm mt-2 block">
          Request a new reset link
        </Link>
      </div>
    )
  }

  if (success) {
    return (
      <div className="text-center py-4 space-y-3">
        <CheckCircle2 className="w-12 h-12 text-green-400 mx-auto" />
        <p className="text-white/70 text-sm">Password reset successfully! Redirecting to sign in...</p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <input type="hidden" {...register("token")} />

      <div className="space-y-1.5">
        <Label htmlFor="password" className="text-white/70 text-sm">New password</Label>
        <div className="relative">
          <Input
            id="password"
            type={showPassword ? "text" : "password"}
            placeholder="Create a strong password"
            className="bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-blue-500/50 h-10 pr-10"
            {...register("password")}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70 transition-colors"
          >
            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
        <PasswordStrength password={watch("password") ?? ""} />
        {errors.password && <p className="text-xs text-red-400">{errors.password.message}</p>}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="confirmPassword" className="text-white/70 text-sm">Confirm new password</Label>
        <Input
          id="confirmPassword"
          type="password"
          placeholder="Repeat your new password"
          className="bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-blue-500/50 h-10"
          {...register("confirmPassword")}
        />
        {errors.confirmPassword && <p className="text-xs text-red-400">{errors.confirmPassword.message}</p>}
      </div>

      <Button
        type="submit"
        disabled={isLoading}
        className="w-full h-10 bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-500 hover:to-violet-500 text-white border-0 font-semibold"
      >
        {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
        Reset password
      </Button>
    </form>
  )
}

export default function ResetPasswordPage() {
  return (
    <AuthLayout
      title="Set new password"
      description="Choose a strong password for your account"
      footer={
        <Link href="/auth/login" className="text-white/40 hover:text-white/60 transition-colors">
          Back to sign in
        </Link>
      }
    >
      <Suspense>
        <ResetPasswordForm />
      </Suspense>
    </AuthLayout>
  )
}
