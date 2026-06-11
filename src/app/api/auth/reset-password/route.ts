import { NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { db } from "@/lib/db"
import { resetPasswordSchema } from "@/lib/validations/auth"
import { trySendEmail, sendPasswordChangedAlert } from "@/lib/email"
import { rateLimit, getClientIP, rateLimitResponse } from "@/lib/rate-limit"

export async function POST(req: Request) {
  try {
    // Rate limit: 5 attempts per IP per hour
    const ip = getClientIP(req)
    const rl = rateLimit(`reset:${ip}`, 5, 60 * 60 * 1000)
    if (!rl.success) return rateLimitResponse(rl.resetAt)

    const body = await req.json()
    const parsed = resetPasswordSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
    }

    const { token, password } = parsed.data

    const resetToken = await db.passwordResetToken.findUnique({
      where: { token },
      include: { user: true },
    })

    if (!resetToken || resetToken.used) {
      return NextResponse.json({ error: "Invalid or already used reset token" }, { status: 400 })
    }

    if (resetToken.expires < new Date()) {
      await db.passwordResetToken.delete({ where: { token } })
      return NextResponse.json({ error: "Reset link has expired. Please request a new one." }, { status: 400 })
    }

    const hashedPassword = await bcrypt.hash(password, 12)

    await db.$transaction([
      db.user.update({
        where: { id: resetToken.userId },
        data: {
          hashedPassword,
          tokenVersion: { increment: 1 },   // Invalidate all existing sessions
          failedLoginAttempts: 0,            // Clear any lockout
          lockedUntil: null,
        },
      }),
      db.passwordResetToken.update({
        where: { token },
        data: { used: true },
      }),
    ])

    // Send security alert (non-fatal)
    await trySendEmail(() => sendPasswordChangedAlert(resetToken.user.email))

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[RESET_PASSWORD]", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
