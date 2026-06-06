import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { id } = await params

    const key = await db.apiKey.findUnique({ where: { id } })
    if (!key || key.userId !== session.user.id) {
      return NextResponse.json({ error: "API key not found" }, { status: 404 })
    }

    await db.apiKey.update({
      where: { id },
      data: { revokedAt: new Date() },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[REVOKE_API_KEY]", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
