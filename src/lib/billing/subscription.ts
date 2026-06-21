/**
 * Subscription period + activation helpers shared by the verify route and the
 * webhook. Keeping the "what does an active subscription do to the user" logic
 * in one place means the two activation paths can never diverge.
 */

import { db } from "@/lib/db";
import type { BillingCycle } from "./plans";

/** End of the paid period, starting from `from`. */
export function periodEnd(cycle: BillingCycle, from: Date = new Date()): Date {
  const end = new Date(from);
  if (cycle === "yearly") {
    end.setFullYear(end.getFullYear() + 1);
  } else {
    end.setMonth(end.getMonth() + 1);
  }
  return end;
}

/**
 * Activate a subscription and grant the matching tier to the user.
 * Idempotent: safe to call from both /verify and the webhook for the same
 * payment — it only flips state that isn't already set.
 */
export async function activateSubscription(params: {
  subscriptionId: string;
  razorpayPaymentId: string;
  tier: "PRO" | "TEAMS";
}): Promise<void> {
  const sub = await db.subscription.findUnique({ where: { id: params.subscriptionId } });
  if (!sub) throw new Error(`Subscription ${params.subscriptionId} not found`);

  // Already active for this payment — nothing to do.
  if (sub.status === "active" && sub.razorpayPaymentId === params.razorpayPaymentId) {
    return;
  }

  const start = new Date();
  const end = periodEnd(sub.cycle as BillingCycle, start);

  await db.$transaction([
    db.subscription.update({
      where: { id: sub.id },
      data: {
        status: "active",
        razorpayPaymentId: params.razorpayPaymentId,
        currentPeriodStart: start,
        currentPeriodEnd: end,
        cancelAtPeriodEnd: false,
      },
    }),
    db.user.update({
      where: { id: sub.userId },
      data: { tier: params.tier },
    }),
  ]);
}
