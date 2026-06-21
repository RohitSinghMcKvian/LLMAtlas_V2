/**
 * Razorpay provider — server-side only.
 *
 * Talks to the Razorpay REST API directly with `fetch` (Basic auth) and verifies
 * signatures with Node's `crypto`, so there's no SDK dependency to ship.
 *
 * Following the project's "route around missing keys" philosophy, every export
 * works in a keyless dev environment: `isConfigured()` is false and the checkout
 * UI surfaces a clear "payments not configured" state instead of crashing.
 *
 * The integration is intentionally provider-agnostic at the call sites
 * (`createOrder` / `verifyPaymentSignature` / `verifyWebhookSignature`), so a
 * future Stripe/Lemon-Squeezy adapter can be dropped in behind the same shape.
 */

import crypto from "crypto";
import type { Currency } from "./plans";

const RAZORPAY_API = "https://api.razorpay.com/v1";

export function getKeyId(): string | undefined {
  // The publishable key id is also exposed to the browser via NEXT_PUBLIC_*.
  return process.env.RAZORPAY_KEY_ID || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
}

function getKeySecret(): string | undefined {
  return process.env.RAZORPAY_KEY_SECRET;
}

function getWebhookSecret(): string | undefined {
  return process.env.RAZORPAY_WEBHOOK_SECRET;
}

/** True only when we can actually create + verify a real charge. */
export function isConfigured(): boolean {
  return Boolean(getKeyId() && getKeySecret());
}

export interface RazorpayOrder {
  id: string;
  amount: number; // smallest unit
  currency: string;
  receipt?: string;
  status: string;
}

/**
 * Create a Razorpay Order. `amount` is in the smallest currency unit
 * (paise / cents). Throws if Razorpay is not configured or the API errors.
 */
export async function createOrder(params: {
  amount: number;
  currency: Currency;
  receipt: string;
  notes?: Record<string, string>;
}): Promise<RazorpayOrder> {
  const keyId = getKeyId();
  const keySecret = getKeySecret();
  if (!keyId || !keySecret) {
    throw new Error("Razorpay is not configured (missing RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET)");
  }

  const auth = Buffer.from(`${keyId}:${keySecret}`).toString("base64");
  const res = await fetch(`${RAZORPAY_API}/orders`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      amount: params.amount,
      currency: params.currency,
      receipt: params.receipt,
      notes: params.notes ?? {},
      payment_capture: 1,
    }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Razorpay order creation failed (${res.status}): ${detail}`);
  }
  return (await res.json()) as RazorpayOrder;
}

/**
 * Verify the signature returned by Razorpay Checkout after a successful payment.
 * signature == HMAC_SHA256(order_id + "|" + payment_id, key_secret)
 */
export function verifyPaymentSignature(params: {
  orderId: string;
  paymentId: string;
  signature: string;
}): boolean {
  const secret = getKeySecret();
  if (!secret) return false;
  const expected = crypto
    .createHmac("sha256", secret)
    .update(`${params.orderId}|${params.paymentId}`)
    .digest("hex");
  return timingSafeEqual(expected, params.signature);
}

/**
 * Verify an inbound webhook against the configured webhook secret.
 * signature == HMAC_SHA256(rawBody, webhook_secret)
 */
export function verifyWebhookSignature(rawBody: string, signature: string | null): boolean {
  const secret = getWebhookSecret();
  if (!secret || !signature) return false;
  const expected = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
  return timingSafeEqual(expected, signature);
}

/** Constant-time comparison that won't throw on length mismatch. */
function timingSafeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}
