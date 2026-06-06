import { NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { changePasswordSchema } from "@/lib/validations/auth"
import { sendPasswordChangedAlert } from "@/lib/email"

export async function POST(req: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const parsed = changePasswordSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
    }

    const { currentPassword, newPassword } = parsed.data

    const user = await db.user.findUnique({ where: { id: session.user.id } })
    if (!user?.hashedPassword) {
      return NextResponse.json({ error: "No password set for this account. Use OAuth sign-in." }, { status: 400 })
    }

    const isValid = await bcrypt.compare(currentPassword, user.hashedPassword)
    if (!isValid) {
      return NextResponse.json({ error: "Current password is incorrect" }, { status: 400 })
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12)
    await db.user.update({
      where: { id: session.user.id },
      data: { hashedPassword },
    })

    try {
      await sendPasswordChangedAlert(user.email)
    } catch {}

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[CHANGE_PASSWORD]", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
