import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { updateSettingsSchema } from "@/lib/validations/profile"

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const settings = await db.userSettings.findUnique({
      where: { userId: session.user.id },
    })

    if (!settings) {
      const created = await db.userSettings.create({ data: { userId: session.user.id } })
      return NextResponse.json(created)
    }

    return NextResponse.json(settings)
  } catch (error) {
    console.error("[GET_SETTINGS]", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function PATCH(req: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const body = await req.json()
    const parsed = updateSettingsSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
    }

    const settings = await db.userSettings.upsert({
      where: { userId: session.user.id },
      create: { userId: session.user.id, ...parsed.data },
      update: parsed.data,
    })

    return NextResponse.json(settings)
  } catch (error) {
    console.error("[UPDATE_SETTINGS]", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
