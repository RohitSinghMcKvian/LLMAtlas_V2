import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export const runtime = "nodejs";

/**
 * Cancel auto-renew. The user keeps access until `currentPeriodEnd`; a daily
 * sweep (or the next webhook) downgrades the tier once the period lapses.
 */
export async function POST() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const subscription = await db.subscription.findFirst({
      where: { userId: session.user.id, status: "active" },
      orderBy: { currentPeriodEnd: "desc" },
    });
    if (!subscription) {
      return NextResponse.json({ error: "No active subscription" }, { status: 404 });
    }

    await db.subscription.update({
      where: { id: subscription.id },
      data: { cancelAtPeriodEnd: true },
    });

    return NextResponse.json({
      success: true,
      activeUntil: subscription.currentPeriodEnd,
    });
  } catch (error) {
    console.error("[BILLING_CANCEL]", error);
    return NextResponse.json({ error: "Could not cancel" }, { status: 500 });
  }
}
