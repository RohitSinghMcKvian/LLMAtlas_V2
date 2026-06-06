"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { signIn } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Eye, EyeOff, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { registerSchema, type RegisterInput } from "@/lib/validations/auth"
import { PasswordStrength } from "@/components/auth/password-strength"

export function RegisterForm() {
  const router = useRouter()
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [password, setPassword] = useState("")

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
  })

  const watchedPassword = watch("password", "")

  const onSubmit = async (data: RegisterInput) => {
    setIsLoading(true)
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: data.name, email: data.email, password: data.password }),
      })

      const json = await res.json()

      if (!res.ok) {
        toast.error(json.error || "Registration failed")
        return
      }

      // Auto sign-in after registration
      const signInResult = await signIn("credentials", {
        email: data.email,
        password: data.password,
        redirect: false,
      })

      if (signInResult?.ok) {
        toast.success("Account created! Check your email to verify your address.")
        router.push("/dashboard")
        router.refresh()
      }
    } catch {
      toast.error("Something went wrong. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="name" className="text-white/70 text-sm">Full name</Label>
        <Input
          id="name"
          type="text"
          placeholder="Ada Lovelace"
          autoComplete="name"
          className="bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-violet-500/50 h-10"
          {...register("name")}
        />
        {errors.name && <p className="text-xs text-red-400">{errors.name.message}</p>}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="email" className="text-white/70 text-sm">Email address</Label>
        <Input
          id="email"
          type="email"
          placeholder="you@example.com"
          autoComplete="email"
          className="bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-violet-500/50 h-10"
          {...register("email")}
        />
        {errors.email && <p className="text-xs text-red-400">{errors.email.message}</p>}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="password" className="text-white/70 text-sm">Password</Label>
        <div className="relative">
          <Input
            id="password"
            type={showPassword ? "text" : "password"}
            placeholder="Create a strong password"
            autoComplete="new-password"
            className="bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-violet-500/50 h-10 pr-10"
            {...register("password", {
              onChange: (e) => setPassword(e.target.value),
            })}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70 transition-colors"
          >
            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
        <PasswordStrength password={watchedPassword || password} />
        {errors.password && <p className="text-xs text-red-400">{errors.password.message}</p>}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="confirmPassword" className="text-white/70 text-sm">Confirm password</Label>
        <Input
          id="confirmPassword"
          type="password"
          placeholder="Repeat your password"
          autoComplete="new-password"
          className="bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-violet-500/50 h-10"
          {...register("confirmPassword")}
        />
        {errors.confirmPassword && <p className="text-xs text-red-400">{errors.confirmPassword.message}</p>}
      </div>

      <p className="text-xs text-white/30">
        By creating an account, you agree to our{" "}
        <a href="/terms" className="text-violet-400 hover:underline">Terms of Service</a> and{" "}
        <a href="/privacy" className="text-violet-400 hover:underline">Privacy Policy</a>.
      </p>

      <Button
        type="submit"
        disabled={isLoading}
        className="w-full h-10 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white border-0 font-semibold"
      >
        {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
        Create account
      </Button>
    </form>
  )
}
