import { NextResponse } from "next/server"
import crypto from "crypto"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { createApiKeySchema } from "@/lib/validations/profile"

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const keys = await db.apiKey.findMany({
      where: { userId: session.user.id, revokedAt: null },
      select: { id: true, name: true, keyPreview: true, lastUsed: true, createdAt: true },
      orderBy: { createdAt: "desc" },
    })

    return NextResponse.json(keys)
  } catch (error) {
    console.error("[LIST_API_KEYS]", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const body = await req.json()
    const parsed = createApiKeySchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
    }

    const count = await db.apiKey.count({ where: { userId: session.user.id, revokedAt: null } })
    if (count >= 10) {
      return NextResponse.json({ error: "Maximum of 10 API keys allowed. Revoke an existing key to create a new one." }, { status: 400 })
    }

    const key = `llma_${crypto.randomBytes(32).toString("hex")}`
    const keyPreview = `${key.slice(0, 12)}...`

    const apiKey = await db.apiKey.create({
      data: {
        userId: session.user.id,
        name: parsed.data.name,
        key,
        keyPreview,
      },
    })

    // Return full key only once
    return NextResponse.json({
      id: apiKey.id,
      name: apiKey.name,
      key,
      keyPreview: apiKey.keyPreview,
      createdAt: apiKey.createdAt,
    }, { status: 201 })
  } catch (error) {
    console.error("[CREATE_API_KEY]", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
