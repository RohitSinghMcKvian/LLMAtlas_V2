import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyWebhookSignature } from "@/lib/billing/razorpay";
import { activateSubscription } from "@/lib/billing/subscription";

export const runtime = "nodejs";

/**
 * Razorpay webhook — the source-of-truth backstop for `/verify`.
 *
 * The client-side `/verify` call can be interrupted (user closes the tab right
 * after paying). This server-to-server event guarantees the subscription is
 * still activated. Configure it in the Razorpay dashboard:
 *   URL:    {NEXT_PUBLIC_APP_URL}/api/billing/webhook
 *   Events: payment.captured, payment.failed
 *   Secret: RAZORPAY_WEBHOOK_SECRET
 */
export async function POST(req: Request) {
  const rawBody = await req.text();
  const signature = req.headers.get("x-razorpay-signature");

  if (!verifyWebhookSignature(rawBody, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  let event: {
    event?: string;
    payload?: { payment?: { entity?: { id?: string; order_id?: string } } };
  };
  try {
    event = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  try {
    const payment = event.payload?.payment?.entity;
    const orderId = payment?.order_id;
    const paymentId = payment?.id;

    if (!orderId || !paymentId) {
      // Not a payment event we handle — ack so Razorpay stops retrying.
      return NextResponse.json({ received: true });
    }

    const subscription = await db.subscription.findUnique({
      where: { razorpayOrderId: orderId },
    });
    if (!subscription) {
      return NextResponse.json({ received: true });
    }

    if (event.event === "payment.captured") {
      const tier = subscription.plan === "TEAMS" ? "TEAMS" : "PRO";
      await activateSubscription({
        subscriptionId: subscription.id,
        razorpayPaymentId: paymentId,
        tier,
      });
    } else if (event.event === "payment.failed") {
      if (subscription.status === "pending") {
        await db.subscription.update({
          where: { id: subscription.id },
          data: { status: "failed" },
        });
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("[BILLING_WEBHOOK]", error);
    // 500 so Razorpay retries.
    return NextResponse.json({ error: "Webhook handler error" }, { status: 500 });
  }
}
