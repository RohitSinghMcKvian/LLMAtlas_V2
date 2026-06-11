import { NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import crypto from "crypto"
import { db } from "@/lib/db"
import { registerSchema } from "@/lib/validations/auth"
import { trySendEmail, sendVerificationEmail } from "@/lib/email"
import { rateLimit, getClientIP, rateLimitResponse } from "@/lib/rate-limit"

export async function POST(req: Request) {
  try {
    // Rate limit: 5 registrations per IP per 15 minutes
    const ip = getClientIP(req)
    const rl = rateLimit(`register:${ip}`, 5, 15 * 60 * 1000)
    if (!rl.success) return rateLimitResponse(rl.resetAt)

    const body = await req.json()
    const parsed = registerSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      )
    }

    const { name, email, password } = parsed.data

    const existing = await db.user.findUnique({ where: { email } })
    if (existing) {
      return NextResponse.json(
        { error: "An account with this email already exists" },
        { status: 409 }
      )
    }

    const hashedPassword = await bcrypt.hash(password, 12)

    const user = await db.user.create({
      data: {
        name,
        email,
        hashedPassword,
        userSettings: { create: {} },
      },
    })

    // Send verification email (non-fatal — user can resend later)
    const token = crypto.randomBytes(32).toString("hex")
    await db.verificationToken.create({
      data: {
        userId: user.id,
        token,
        expires: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    })
    await trySendEmail(() => sendVerificationEmail(email, token))

    return NextResponse.json({ success: true }, { status: 201 })
  } catch (error) {
    console.error("[REGISTER]", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
