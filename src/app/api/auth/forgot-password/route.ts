import { NextResponse } from "next/server"
import crypto from "crypto"
import { db } from "@/lib/db"
import { forgotPasswordSchema } from "@/lib/validations/auth"
import { sendPasswordResetEmail } from "@/lib/email"

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const parsed = forgotPasswordSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
    }

    const { email } = parsed.data

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

    await sendPasswordResetEmail(email, token)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[FORGOT_PASSWORD]", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
