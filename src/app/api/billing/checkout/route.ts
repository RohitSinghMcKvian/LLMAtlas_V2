import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { createOrder, getKeyId, isConfigured } from "@/lib/billing/razorpay";
import {
  PLANS,
  orderAmount,
  toSmallestUnit,
  isPlanId,
  isCycle,
  isCurrency,
} from "@/lib/billing/plans";

export const runtime = "nodejs";

const schema = z.object({
  plan: z.string().refine(isPlanId, "Invalid plan"),
  cycle: z.string().refine(isCycle, "Invalid cycle"),
  currency: z.string().refine(isCurrency, "Invalid currency").default("USD"),
  seats: z.coerce.number().int().min(1).max(500).default(1),
});

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!isConfigured()) {
      return NextResponse.json(
        { error: "Payments are not configured on this server yet." },
        { status: 503 },
      );
    }

    const body = await req.json().catch(() => ({}));
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const { plan: planId, cycle, currency } = parsed.data;
    const plan = PLANS[planId];
    const seats = plan.perSeat ? parsed.data.seats : 1;

    const majorTotal = orderAmount(plan, cycle, currency, seats);
    const amount = toSmallestUnit(majorTotal);

    // Persist a pending subscription first so the webhook/verify can find it.
    const subscription = await db.subscription.create({
      data: {
        userId: session.user.id,
        plan: plan.tier,
        cycle,
        seats,
        currency,
        amount,
        status: "pending",
      },
    });

    const order = await createOrder({
      amount,
      currency,
      receipt: subscription.id,
      notes: {
        subscriptionId: subscription.id,
        userId: session.user.id,
        plan: plan.tier,
        cycle,
      },
    });

    await db.subscription.update({
      where: { id: subscription.id },
      data: { razorpayOrderId: order.id },
    });

    return NextResponse.json({
      keyId: getKeyId(),
      orderId: order.id,
      amount,
      currency,
      subscriptionId: subscription.id,
      planName: plan.name,
      seats,
      cycle,
      prefill: {
        name: session.user.name ?? "",
        email: session.user.email ?? "",
      },
    });
  } catch (error) {
    console.error("[BILLING_CHECKOUT]", error);
    return NextResponse.json({ error: "Could not start checkout" }, { status: 500 });
  }
}
