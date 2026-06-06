"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import Link from "next/link"
import { ArrowLeft, Loader2, Mail } from "lucide-react"
import { toast } from "sonner"
import { AuthLayout } from "@/components/auth/auth-layout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { forgotPasswordSchema, type ForgotPasswordInput } from "@/lib/validations/auth"

export default function ForgotPasswordPage() {
  const [submitted, setSubmitted] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
    getValues,
  } = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
  })

  const onSubmit = async (data: ForgotPasswordInput) => {
    setIsLoading(true)
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
      if (res.ok) {
        setSubmitted(true)
      } else {
        toast.error("Something went wrong. Please try again.")
      }
    } catch {
      toast.error("Something went wrong. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  if (submitted) {
    return (
      <AuthLayout
        title="Check your email"
        description="We sent you a password reset link"
        footer={
          <Link href="/auth/login" className="flex items-center justify-center gap-1.5 text-white/40 hover:text-white/60 transition-colors">
            <ArrowLeft className="w-3 h-3" /> Back to sign in
          </Link>
        }
      >
        <div className="text-center py-4 space-y-4">
          <div className="w-14 h-14 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center mx-auto">
            <Mail className="w-6 h-6 text-blue-400" />
          </div>
          <div>
            <p className="text-white/60 text-sm leading-relaxed">
              If an account exists for <strong className="text-white">{getValues("email")}</strong>, we sent a reset link. Check your inbox and spam folder.
            </p>
            <p className="text-white/40 text-xs mt-2">The link expires in 1 hour.</p>
          </div>
        </div>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout
      title="Forgot your password?"
      description="Enter your email and we'll send you a reset link"
      footer={
        <Link href="/auth/login" className="flex items-center justify-center gap-1.5 text-white/40 hover:text-white/60 transition-colors">
          <ArrowLeft className="w-3 h-3" /> Back to sign in
        </Link>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="email" className="text-white/70 text-sm">Email address</Label>
          <Input
            id="email"
            type="email"
            placeholder="you@example.com"
            autoComplete="email"
            autoFocus
            className="bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-blue-500/50 h-10"
            {...register("email")}
          />
          {errors.email && <p className="text-xs text-red-400">{errors.email.message}</p>}
        </div>

        <Button
          type="submit"
          disabled={isLoading}
          className="w-full h-10 bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-500 hover:to-violet-500 text-white border-0 font-semibold"
        >
          {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
          Send reset link
        </Button>
      </form>
    </AuthLayout>
  )
}
