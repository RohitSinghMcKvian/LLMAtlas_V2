import { NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { auth, signOut } from "@/lib/auth"
import { db } from "@/lib/db"

export async function DELETE(req: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { password, confirmation } = await req.json()

    if (confirmation !== "DELETE") {
      return NextResponse.json({ error: "Please type DELETE to confirm account deletion" }, { status: 400 })
    }

    const user = await db.user.findUnique({ where: { id: session.user.id } })
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 })

    if (user.hashedPassword && password) {
      const isValid = await bcrypt.compare(password, user.hashedPassword)
      if (!isValid) {
        return NextResponse.json({ error: "Incorrect password" }, { status: 400 })
      }
    }

    // Cascade delete via Prisma (all related data is deleted via onDelete: Cascade)
    await db.user.delete({ where: { id: session.user.id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[DELETE_ACCOUNT]", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
