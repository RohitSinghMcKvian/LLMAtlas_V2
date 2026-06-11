import { NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { changePasswordSchema } from "@/lib/validations/auth"
import { trySendEmail, sendPasswordChangedAlert } from "@/lib/email"
import { rateLimit, rateLimitResponse } from "@/lib/rate-limit"
import { z } from "zod"

// Separate schema for setting a password (no currentPassword needed)
const setPasswordSchema = z.object({
  newPassword: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[0-9]/, "Password must contain at least one number")
    .regex(/[^a-zA-Z0-9]/, "Password must contain at least one special character"),
  confirmPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
})

export async function POST(req: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Rate limit: 5 attempts per user per 15 minutes
    const rl = rateLimit(`change-pw:${session.user.id}`, 5, 15 * 60 * 1000)
    if (!rl.success) return rateLimitResponse(rl.resetAt)

    const body = await req.json()

    const user = await db.user.findUnique({ where: { id: session.user.id } })
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // ── OAuth-only user setting a password for the first time ──────────
    if (!user.hashedPassword) {
      const parsed = setPasswordSchema.safeParse(body)
      if (!parsed.success) {
        return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
      }

      const hashedPassword = await bcrypt.hash(parsed.data.newPassword, 12)
      await db.user.update({
        where: { id: session.user.id },
        data: { hashedPassword, tokenVersion: { increment: 1 } },
      })

      await trySendEmail(() => sendPasswordChangedAlert(user.email))
      return NextResponse.json({ success: true })
    }

    // ── Existing password user changing password ───────────────────────
    const parsed = changePasswordSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
    }

    const { currentPassword, newPassword } = parsed.data

    const isValid = await bcrypt.compare(currentPassword, user.hashedPassword)
    if (!isValid) {
      return NextResponse.json({ error: "Current password is incorrect" }, { status: 400 })
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12)
    await db.user.update({
      where: { id: session.user.id },
      data: { hashedPassword, tokenVersion: { increment: 1 } },
    })

    await trySendEmail(() => sendPasswordChangedAlert(user.email))

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[CHANGE_PASSWORD]", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
