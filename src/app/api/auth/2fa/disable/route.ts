import { NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { verifyTOTP } from "@/lib/two-factor"

export async function POST(req: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { code, password } = await req.json()

    const user = await db.user.findUnique({
      where: { id: session.user.id },
      include: { twoFactorAuth: true },
    })

    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 })

    // Require password confirmation for users with passwords
    if (user.hashedPassword && password) {
      const isPasswordValid = await bcrypt.compare(password, user.hashedPassword)
      if (!isPasswordValid) {
        return NextResponse.json({ error: "Incorrect password" }, { status: 400 })
      }
    }

    // Require current TOTP code
    if (user.twoFactorAuth?.enabled && code) {
      const isValid = verifyTOTP(code, user.twoFactorAuth.secret)
      if (!isValid) {
        return NextResponse.json({ error: "Invalid authenticator code" }, { status: 400 })
      }
    }

    await db.twoFactorAuth.update({
      where: { userId: session.user.id },
      data: { enabled: false, backupCodes: "[]" },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[2FA_DISABLE]", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
