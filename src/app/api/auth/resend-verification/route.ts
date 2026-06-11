import { NextResponse } from "next/server"
import crypto from "crypto"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { trySendEmail, sendVerificationEmail } from "@/lib/email"
import { rateLimit, rateLimitResponse } from "@/lib/rate-limit"

export async function POST() {
  try {
    const session = await auth()
    if (!session?.user?.id || !session.user.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Rate limit: 2 requests per user per hour
    const rl = rateLimit(`resend-verify:${session.user.id}`, 2, 60 * 60 * 1000)
    if (!rl.success) return rateLimitResponse(rl.resetAt)

    if (session.user.emailVerified) {
      return NextResponse.json({ error: "Email already verified" }, { status: 400 })
    }

    // Delete any existing tokens
    await db.verificationToken.deleteMany({ where: { userId: session.user.id } })

    const token = crypto.randomBytes(32).toString("hex")
    await db.verificationToken.create({
      data: {
        userId: session.user.id,
        token,
        expires: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    })

    const sent = await trySendEmail(() => sendVerificationEmail(session.user!.email!, token))
    if (!sent) {
      return NextResponse.json({ error: "Email service is not configured" }, { status: 503 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[RESEND_VERIFICATION]", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
