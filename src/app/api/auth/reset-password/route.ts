import { NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { db } from "@/lib/db"
import { resetPasswordSchema } from "@/lib/validations/auth"
import { sendPasswordChangedAlert } from "@/lib/email"

export async function POST(req: Request) {
  try {
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
        data: { hashedPassword },
      }),
      db.passwordResetToken.update({
        where: { token },
        data: { used: true },
      }),
    ])

    // Send security alert (non-fatal)
    try {
      await sendPasswordChangedAlert(resetToken.user.email)
    } catch {}

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[RESET_PASSWORD]", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
