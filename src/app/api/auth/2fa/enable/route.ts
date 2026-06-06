import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { verifyTOTP, generateBackupCodes } from "@/lib/two-factor"

export async function POST(req: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { code } = await req.json()
    if (!code || typeof code !== "string") {
      return NextResponse.json({ error: "Code is required" }, { status: 400 })
    }

    const twoFactor = await db.twoFactorAuth.findUnique({
      where: { userId: session.user.id },
    })

    if (!twoFactor) {
      return NextResponse.json({ error: "2FA setup not initiated. Please start setup first." }, { status: 400 })
    }

    const isValid = verifyTOTP(code, twoFactor.secret)
    if (!isValid) {
      return NextResponse.json({ error: "Invalid code. Please try again." }, { status: 400 })
    }

    const { codes, hashedCodes } = await generateBackupCodes(8)

    await db.twoFactorAuth.update({
      where: { userId: session.user.id },
      data: { enabled: true, backupCodes: JSON.stringify(hashedCodes) },
    })

    return NextResponse.json({ success: true, backupCodes: codes })
  } catch (error) {
    console.error("[2FA_ENABLE]", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
