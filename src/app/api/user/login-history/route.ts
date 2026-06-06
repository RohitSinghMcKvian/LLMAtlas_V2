import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const history = await db.loginHistory.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      take: 50,
    })

    return NextResponse.json(history)
  } catch (error) {
    console.error("[LOGIN_HISTORY]", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const body = await req.json()
    await db.loginHistory.create({
      data: {
        userId: session.user.id,
        ipAddress: body.ipAddress,
        device: body.device,
        browser: body.browser,
        os: body.os,
        success: body.success ?? true,
      },
    })

    // Keep only latest 100 records per user
    const count = await db.loginHistory.count({ where: { userId: session.user.id } })
    if (count > 100) {
      const oldest = await db.loginHistory.findMany({
        where: { userId: session.user.id },
        orderBy: { createdAt: "asc" },
        take: count - 100,
        select: { id: true },
      })
      await db.loginHistory.deleteMany({ where: { id: { in: oldest.map((r: { id: string }) => r.id) } } })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[LOG_LOGIN]", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
