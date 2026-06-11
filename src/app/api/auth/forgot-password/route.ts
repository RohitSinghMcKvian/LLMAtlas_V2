import { NextResponse } from "next/server"
import crypto from "crypto"
import { db } from "@/lib/db"
import { forgotPasswordSchema } from "@/lib/validations/auth"
import { trySendEmail, sendPasswordResetEmail } from "@/lib/email"
import { rateLimit, getClientIP, rateLimitResponse } from "@/lib/rate-limit"

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const parsed = forgotPasswordSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
    }

    const { email } = parsed.data

    // Rate limit: 3 requests per email per hour
    const rl = rateLimit(`forgot:${email}`, 3, 60 * 60 * 1000)
    if (!rl.success) return rateLimitResponse(rl.resetAt)

    // Also rate-limit by IP to prevent enumeration attempts
    const ip = getClientIP(req)
    const ipRl = rateLimit(`forgot-ip:${ip}`, 10, 60 * 60 * 1000)
    if (!ipRl.success) return rateLimitResponse(ipRl.resetAt)

    // Always return success to prevent user enumeration
    const user = await db.user.findUnique({ where: { email } })
    if (!user) {
      return NextResponse.json({ success: true })
    }

    // Invalidate any existing reset tokens
    await db.passwordResetToken.deleteMany({ where: { userId: user.id } })

    const token = crypto.randomBytes(32).toString("hex")
    await db.passwordResetToken.create({
      data: {
        userId: user.id,
        token,
        expires: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
      },
    })

    await trySendEmail(() => sendPasswordResetEmail(email, token))

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[FORGOT_PASSWORD]", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
