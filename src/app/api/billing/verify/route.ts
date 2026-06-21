import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { verifyPaymentSignature } from "@/lib/billing/razorpay";
import { activateSubscription } from "@/lib/billing/subscription";

export const runtime = "nodejs";

const schema = z.object({
  razorpay_order_id: z.string().min(1),
  razorpay_payment_id: z.string().min(1),
  razorpay_signature: z.string().min(1),
});

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid payment payload" }, { status: 400 });
    }

    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = parsed.data;

    const valid = verifyPaymentSignature({
      orderId: razorpay_order_id,
      paymentId: razorpay_payment_id,
      signature: razorpay_signature,
    });
    if (!valid) {
      return NextResponse.json({ error: "Payment signature verification failed" }, { status: 400 });
    }

    const subscription = await db.subscription.findUnique({
      where: { razorpayOrderId: razorpay_order_id },
    });
    if (!subscription) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }
    // Guard: the order must belong to the authenticated user.
    if (subscription.userId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const tier = subscription.plan === "TEAMS" ? "TEAMS" : "PRO";
    await activateSubscription({
      subscriptionId: subscription.id,
      razorpayPaymentId: razorpay_payment_id,
      tier,
    });

    return NextResponse.json({ success: true, tier });
  } catch (error) {
    console.error("[BILLING_VERIFY]", error);
    return NextResponse.json({ error: "Verification failed" }, { status: 500 });
  }
}
