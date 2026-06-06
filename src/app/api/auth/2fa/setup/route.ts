import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { generateTOTPSecret, generateQRCodeDataURL } from "@/lib/two-factor"

export async function POST() {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const secret = generateTOTPSecret()
    const qrCode = await generateQRCodeDataURL(session.user.email!, secret)

    // Store as pending (not yet enabled)
    await db.twoFactorAuth.upsert({
      where: { userId: session.user.id },
      create: { userId: session.user.id, secret, backupCodes: "[]", enabled: false },
      update: { secret, enabled: false },
    })

    return NextResponse.json({ secret, qrCode })
  } catch (error) {
    console.error("[2FA_SETUP]", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
