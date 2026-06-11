import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"

/**
 * GET /api/user/accounts — list linked OAuth accounts for the current user.
 */
export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const accounts = await db.account.findMany({
      where: { userId: session.user.id },
      select: {
        id: true,
        provider: true,
        providerAccountId: true,
      },
    })

    return NextResponse.json(accounts)
  } catch (error) {
    console.error("[GET_ACCOUNTS]", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

/**
 * DELETE /api/user/accounts — unlink an OAuth provider.
 * Body: { provider: "google" | "github" | "discord" }
 *
 * Prevents unlinking if it would leave the user with no sign-in method.
 */
export async function DELETE(req: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { provider } = await req.json()
    if (!provider || typeof provider !== "string") {
      return NextResponse.json({ error: "Provider is required" }, { status: 400 })
    }

    // Find the account to delete
    const account = await db.account.findFirst({
      where: { userId: session.user.id, provider },
    })

    if (!account) {
      return NextResponse.json({ error: "Account not found" }, { status: 404 })
    }

    // Safety check: user must have another sign-in method
    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: {
        hashedPassword: true,
        _count: { select: { accounts: true } },
      },
    })

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const hasPassword = !!user.hashedPassword
    const otherAccountsCount = user._count.accounts - 1 // Exclude the one being removed

    if (!hasPassword && otherAccountsCount < 1) {
      return NextResponse.json(
        { error: "Cannot disconnect your only sign-in method. Set a password first." },
        { status: 400 }
      )
    }

    await db.account.delete({ where: { id: account.id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[DELETE_ACCOUNT]", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
