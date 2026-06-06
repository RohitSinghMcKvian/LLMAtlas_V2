import { NextResponse } from "next/server"
import { db } from "@/lib/db"

export async function POST(req: Request) {
  try {
    const { token } = await req.json()

    if (!token) {
      return NextResponse.json({ error: "Token is required" }, { status: 400 })
    }

    const verificationToken = await db.verificationToken.findUnique({
      where: { token },
      include: { user: true },
    })

    if (!verificationToken) {
      return NextResponse.json({ error: "Invalid verification token" }, { status: 400 })
    }

    if (verificationToken.expires < new Date()) {
      await db.verificationToken.delete({ where: { token } })
      return NextResponse.json({ error: "Verification link has expired. Please request a new one." }, { status: 400 })
    }

    await db.$transaction([
      db.user.update({
        where: { id: verificationToken.userId },
        data: { emailVerified: new Date() },
      }),
      db.verificationToken.delete({ where: { token } }),
    ])

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[VERIFY_EMAIL]", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
