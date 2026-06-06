import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { verifyTOTP, verifyBackupCode } from "@/lib/two-factor"

export async function POST(req: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { code, isBackupCode } = await req.json()

    const twoFactor = await db.twoFactorAuth.findUnique({
      where: { userId: session.user.id },
    })

    if (!twoFactor?.enabled) {
      return NextResponse.json({ error: "2FA is not enabled" }, { status: 400 })
    }

    if (isBackupCode) {
      const parsedCodes: string[] = JSON.parse(twoFactor.backupCodes)
      const index = await verifyBackupCode(code, parsedCodes)
      if (index === -1) {
        return NextResponse.json({ error: "Invalid backup code" }, { status: 400 })
      }
      const updatedCodes = [...parsedCodes]
      updatedCodes.splice(index, 1)
      await db.twoFactorAuth.update({
        where: { userId: session.user.id },
        data: { backupCodes: JSON.stringify(updatedCodes) },
      })
    } else {
      const isValid = verifyTOTP(code, twoFactor.secret)
      if (!isValid) {
        return NextResponse.json({ error: "Invalid authenticator code" }, { status: 400 })
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[2FA_VERIFY]", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
