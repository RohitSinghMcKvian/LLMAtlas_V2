/**
 * Billing plans — the single source of truth for pricing.
 *
 * Both the public pricing page (`components/landing/pricing.tsx`) and the
 * checkout flow (`/upgrade`, `/api/billing/*`) read from here, so the price a
 * customer sees can never drift from the price they're actually charged.
 *
 * Pricing rationale (Jun 2026): infra runs on Oracle's Always-Free ARM tier, a
 * free is-a.dev domain, Neon's free Postgres, Resend's free email tier and
 * BYOK / free-tier LLM APIs — so the marginal cost per user is ~$0 and the only
 * real per-transaction cost is the Razorpay processing fee (~2% domestic /
 * ~3% international, no fixed fee on INR). That lets us price at the floor while
 * keeping a ~90%+ gross margin. Annual billing further amortises any fixed fee.
 *
 * Amounts below are in MAJOR units (dollars / rupees). Razorpay wants the
 * smallest unit (cents / paise) — use `toSmallestUnit()`.
 */

export type PlanId = "pro" | "teams";
export type BillingCycle = "monthly" | "yearly";
export type Currency = "USD" | "INR";

export interface PlanPricing {
  /** Per-seat price in MAJOR units, keyed by currency then cycle. */
  monthly: number;
  yearly: number; // total billed once per year (per seat)
}

export interface Plan {
  id: PlanId;
  /** The DB `User.tier` value granted when this plan is active. */
  tier: "PRO" | "TEAMS";
  name: string;
  /** Whether the price is charged per seat (Teams) or flat (Pro). */
  perSeat: boolean;
  prices: Record<Currency, PlanPricing>;
}

export const CURRENCY_SYMBOL: Record<Currency, string> = {
  USD: "$",
  INR: "₹",
};

/**
 * Canonical plan catalogue.
 *
 * USD is the canonical/global currency (matches the marketing page). INR prices
 * are rounded local price points, not a raw FX conversion, so Indian customers
 * get clean numbers and pay no FX/markup.
 */
export const PLANS: Record<PlanId, Plan> = {
  pro: {
    id: "pro",
    tier: "PRO",
    name: "Pro",
    perSeat: false,
    prices: {
      USD: { monthly: 5, yearly: 42 }, // $3.50/mo billed yearly (−30%)
      INR: { monthly: 399, yearly: 3499 }, // ≈ ₹291/mo billed yearly
    },
  },
  teams: {
    id: "teams",
    tier: "TEAMS",
    name: "Teams",
    perSeat: true,
    prices: {
      USD: { monthly: 12, yearly: 108 }, // $9/seat/mo billed yearly (−25%)
      INR: { monthly: 999, yearly: 8999 }, // ≈ ₹750/seat/mo billed yearly
    },
  },
};

export const DEFAULT_CURRENCY: Currency = "USD";

/* ── Helpers ─────────────────────────────────────────────────────────────── */

export function isPlanId(value: string): value is PlanId {
  return value === "pro" || value === "teams";
}

export function isCycle(value: string): value is BillingCycle {
  return value === "monthly" || value === "yearly";
}

export function isCurrency(value: string): value is Currency {
  return value === "USD" || value === "INR";
}

/** Per-seat amount (major units) for a plan/cycle/currency. */
export function unitPrice(plan: Plan, cycle: BillingCycle, currency: Currency): number {
  return plan.prices[currency][cycle];
}

/** Total amount in MAJOR units for the whole order (accounts for seats). */
export function orderAmount(
  plan: Plan,
  cycle: BillingCycle,
  currency: Currency,
  seats: number,
): number {
  const qty = plan.perSeat ? Math.max(1, Math.floor(seats)) : 1;
  return unitPrice(plan, cycle, currency) * qty;
}

/** Convert major units to the smallest unit Razorpay expects (cents/paise). */
export function toSmallestUnit(majorAmount: number): number {
  return Math.round(majorAmount * 100);
}

/** Effective per-month price (for "billed yearly" sub-copy). */
export function perMonthEquivalent(plan: Plan, currency: Currency): number {
  return plan.prices[currency].yearly / 12;
}

/** Yearly discount vs paying monthly, as a positive integer percentage. */
export function yearlyDiscountPct(plan: Plan, currency: Currency): number {
  const monthly12 = plan.prices[currency].monthly * 12;
  const yearly = plan.prices[currency].yearly;
  return Math.round((1 - yearly / monthly12) * 100);
}

/** Format a major-unit amount with the currency symbol. Whole numbers show no
 *  decimals; fractional amounts show two (e.g. $5, $3.50, ₹399, ₹291.58). */
export function formatPrice(amount: number, currency: Currency): string {
  const symbol = CURRENCY_SYMBOL[currency];
  const rounded = Math.round(amount * 100) / 100;
  const str = Number.isInteger(rounded) ? rounded.toString() : rounded.toFixed(2);
  return `${symbol}${str}`;
}

/** Marketing display block for a plan, in the given currency. */
export function planDisplay(planId: PlanId, currency: Currency = DEFAULT_CURRENCY) {
  const plan = PLANS[planId];
  const seatSuffix = plan.perSeat ? " / seat" : "";
  const cadence = `${seatSuffix} / mo`;
  const perMo = perMonthEquivalent(plan, currency);
  const discount = yearlyDiscountPct(plan, currency);
  return {
    price: formatPrice(plan.prices[currency].monthly, currency),
    cadence,
    annualNote: `${formatPrice(perMo, currency)}${seatSuffix} / mo billed yearly  (−${discount}%)`,
  };
}
