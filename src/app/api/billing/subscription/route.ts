import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { isConfigured } from "@/lib/billing/razorpay";

export const runtime = "nodejs";

/** Current user's active/most-recent subscription + whether payments are live. */
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const subscription = await db.subscription.findFirst({
      where: { userId: session.user.id, status: "active" },
      orderBy: { currentPeriodEnd: "desc" },
      select: {
        id: true,
        plan: true,
        cycle: true,
        seats: true,
        currency: true,
        amount: true,
        status: true,
        currentPeriodStart: true,
        currentPeriodEnd: true,
        cancelAtPeriodEnd: true,
      },
    });

    return NextResponse.json({
      paymentsEnabled: isConfigured(),
      tier: session.user.tier ?? "FREE",
      subscription,
    });
  } catch (error) {
    console.error("[BILLING_SUBSCRIPTION]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
