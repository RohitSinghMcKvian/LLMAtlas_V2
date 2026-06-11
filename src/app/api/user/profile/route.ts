import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { updateProfileSchema } from "@/lib/validations/profile"

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        username: true,
        image: true,
        bio: true,
        tier: true,
        role: true,
        emailVerified: true,
        hashedPassword: true,
        createdAt: true,
        twoFactorAuth: { select: { enabled: true } },
        accounts: { select: { provider: true, providerAccountId: true } },
        _count: { select: { apiKeys: { where: { revokedAt: null } } } },
      },
    })

    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 })

    // Transform: never expose the actual password hash — only a boolean flag
    const { hashedPassword, ...rest } = user
    return NextResponse.json({
      ...rest,
      hasPassword: !!hashedPassword,
    })
  } catch (error) {
    console.error("[GET_PROFILE]", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function PATCH(req: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const parsed = updateProfileSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
    }

    const data = parsed.data

    // Check username uniqueness
    if (data.username) {
      const existing = await db.user.findFirst({
        where: { username: data.username, NOT: { id: session.user.id } },
      })
      if (existing) {
        return NextResponse.json({ error: "Username is already taken" }, { status: 409 })
      }
    }

    const updatedUser = await db.user.update({
      where: { id: session.user.id },
      data: {
        ...(data.name && { name: data.name }),
        ...(data.username !== undefined && { username: data.username || null }),
        ...(data.bio !== undefined && { bio: data.bio || null }),
        ...(data.image !== undefined && { image: data.image || null }),
      },
      select: { id: true, name: true, username: true, bio: true, image: true },
    })

    return NextResponse.json(updatedUser)
  } catch (error) {
    console.error("[UPDATE_PROFILE]", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
