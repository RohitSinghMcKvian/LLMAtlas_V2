"use client"

interface PasswordStrengthProps {
  password: string
}

function getStrength(password: string): { score: number; label: string; color: string } {
  if (!password) return { score: 0, label: "", color: "" }

  let score = 0
  if (password.length >= 8) score++
  if (password.length >= 12) score++
  if (/[A-Z]/.test(password)) score++
  if (/[0-9]/.test(password)) score++
  if (/[^A-Za-z0-9]/.test(password)) score++

  if (score <= 1) return { score: 1, label: "Very weak", color: "bg-red-500" }
  if (score === 2) return { score: 2, label: "Weak", color: "bg-orange-500" }
  if (score === 3) return { score: 3, label: "Fair", color: "bg-yellow-500" }
  if (score === 4) return { score: 4, label: "Strong", color: "bg-green-400" }
  return { score: 5, label: "Very strong", color: "bg-green-500" }
}

export function PasswordStrength({ password }: PasswordStrengthProps) {
  const { score, label, color } = getStrength(password)

  if (!password) return null

  return (
    <div className="mt-1.5 space-y-1">
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full transition-all duration-300 ${
              i <= score ? color : "bg-white/10"
            }`}
          />
        ))}
      </div>
      <p className={`text-xs ${score <= 2 ? "text-red-400" : score === 3 ? "text-yellow-400" : "text-green-400"}`}>
        {label}
      </p>
    </div>
  )
}
