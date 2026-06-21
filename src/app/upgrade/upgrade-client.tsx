"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import {
  ArrowLeft,
  Check,
  Loader2,
  Lock,
  Minus,
  Plus,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  PLANS,
  CURRENCY_SYMBOL,
  orderAmount,
  perMonthEquivalent,
  yearlyDiscountPct,
  formatPrice,
  type PlanId,
  type BillingCycle,
  type Currency,
} from "@/lib/billing/plans";

/* Razorpay Checkout is injected on demand from their CDN. */
const RAZORPAY_SRC = "https://checkout.razorpay.com/v1/checkout.js";

interface RazorpayResponse {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}
interface RazorpayInstance {
  open: () => void;
  on: (event: string, cb: (resp: { error?: { description?: string } }) => void) => void;
}
declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => RazorpayInstance;
  }
}

function loadRazorpay(): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window === "undefined") return resolve(false);
    if (window.Razorpay) return resolve(true);
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${RAZORPAY_SRC}"]`);
    if (existing) {
      existing.addEventListener("load", () => resolve(true));
      existing.addEventListener("error", () => resolve(false));
      return;
    }
    const script = document.createElement("script");
    script.src = RAZORPAY_SRC;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

const PLAN_PERKS: Record<PlanId, string[]> = {
  pro: [
    "All 195+ models across 13 providers",
    "Unlimited saved prompts + version history",
    "Custom benchmark builder & nightly evals",
    "CSV / JSON export · 48h priority support",
  ],
  teams: [
    "Everything in Pro, per seat",
    "Shared workspaces & prompt libraries",
    "RBAC, audit log & per-provider budgets",
    "SSO (Google + GitHub) · 24h SLA",
  ],
};

export function UpgradeClient({
  initialPlan,
  initialCycle,
  currentTier,
}: {
  initialPlan: PlanId;
  initialCycle: BillingCycle;
  currentTier: string;
}) {
  const router = useRouter();
  const { update } = useSession();

  const [planId, setPlanId] = useState<PlanId>(initialPlan);
  const [cycle, setCycle] = useState<BillingCycle>(initialCycle);
  const [currency, setCurrency] = useState<Currency>("USD");
  const [seats, setSeats] = useState(3);
  const [loading, setLoading] = useState(false);
  const [paymentsEnabled, setPaymentsEnabled] = useState<boolean | null>(null);

  const plan = PLANS[planId];

  useEffect(() => {
    fetch("/api/billing/subscription")
      .then((r) => r.json())
      .then((d) => setPaymentsEnabled(Boolean(d?.paymentsEnabled)))
      .catch(() => setPaymentsEnabled(false));
  }, []);

  const effectiveSeats = plan.perSeat ? seats : 1;
  const total = useMemo(
    () => orderAmount(plan, cycle, currency, effectiveSeats),
    [plan, cycle, currency, effectiveSeats],
  );
  const perMo = perMonthEquivalent(plan, currency);
  const discount = yearlyDiscountPct(plan, currency);

  const handlePay = useCallback(async () => {
    setLoading(true);
    try {
      const ok = await loadRazorpay();
      if (!ok) {
        toast.error("Couldn't reach the payment gateway. Check your connection and retry.");
        setLoading(false);
        return;
      }

      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: planId, cycle, currency, seats: effectiveSeats }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data?.error ?? "Could not start checkout.");
        setLoading(false);
        return;
      }

      const rzp = new window.Razorpay!({
        key: data.keyId,
        amount: data.amount,
        currency: data.currency,
        order_id: data.orderId,
        name: "LLMAtlas",
        description: `${data.planName} · ${cycle === "yearly" ? "Annual" : "Monthly"}`,
        image: "/icon.svg",
        prefill: data.prefill,
        theme: { color: "#7c3aed" },
        handler: async (response: RazorpayResponse) => {
          const verify = await fetch("/api/billing/verify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(response),
          });
          const result = await verify.json();
          if (verify.ok && result.success) {
            await update({ tier: result.tier });
            toast.success(`Welcome to ${plan.name}! Your account is upgraded.`);
            router.push("/dashboard");
            router.refresh();
          } else {
            toast.error(result?.error ?? "Payment verification failed. Contact support.");
            setLoading(false);
          }
        },
        modal: { ondismiss: () => setLoading(false) },
      });
      rzp.on("payment.failed", (resp) => {
        toast.error(resp?.error?.description ?? "Payment failed. No charge was made.");
        setLoading(false);
      });
      rzp.open();
    } catch (err) {
      console.error(err);
      toast.error("Something went wrong starting checkout.");
      setLoading(false);
    }
  }, [planId, cycle, currency, effectiveSeats, plan.name, router, update]);

  const alreadyOnPlan = currentTier === plan.tier;

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-5xl py-10 md:py-16">
        <Link
          href="/#pricing"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8"
        >
          <ArrowLeft className="h-4 w-4" /> Back to pricing
        </Link>

        <div className="grid lg:grid-cols-[1fr_minmax(340px,400px)] gap-8 items-start">
          {/* ── Left: configure ─────────────────────────────────────────── */}
          <div>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
              Upgrade to <span className="gradient-text-blue">{plan.name}</span>
            </h1>
            <p className="mt-2 text-muted-foreground">
              Cancel anytime. Secure checkout via Razorpay — UPI, cards, netbanking, wallets &
              international cards.
            </p>

            {/* Plan switch */}
            <div className="mt-8 grid grid-cols-2 gap-3">
              {(Object.keys(PLANS) as PlanId[]).map((id) => (
                <button
                  key={id}
                  onClick={() => setPlanId(id)}
                  className={cn(
                    "rounded-xl border p-4 text-left transition-all",
                    planId === id
                      ? "border-primary ring-2 ring-primary/30 bg-primary/[0.03]"
                      : "hover:border-primary/30",
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold">{PLANS[id].name}</span>
                    {PLANS[id].perSeat && (
                      <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                        per seat
                      </span>
                    )}
                  </div>
                  <div className="mt-1 text-2xl font-bold">
                    {formatPrice(PLANS[id].prices[currency].monthly, currency)}
                    <span className="text-xs font-normal text-muted-foreground"> / mo</span>
                  </div>
                </button>
              ))}
            </div>

            {/* Billing cycle */}
            <div className="mt-6">
              <p className="text-sm font-medium mb-2">Billing cycle</p>
              <div className="inline-flex rounded-lg border p-1">
                {(["monthly", "yearly"] as BillingCycle[]).map((c) => (
                  <button
                    key={c}
                    onClick={() => setCycle(c)}
                    className={cn(
                      "px-4 py-1.5 text-sm rounded-md transition-all capitalize",
                      cycle === c
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {c}
                    {c === "yearly" && (
                      <span
                        className={cn(
                          "ml-1.5 text-[10px] font-semibold",
                          cycle === c ? "text-primary-foreground/90" : "text-emerald-500",
                        )}
                      >
                        −{discount}%
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Currency */}
            <div className="mt-6">
              <p className="text-sm font-medium mb-2">Currency</p>
              <div className="inline-flex rounded-lg border p-1">
                {(["USD", "INR"] as Currency[]).map((c) => (
                  <button
                    key={c}
                    onClick={() => setCurrency(c)}
                    className={cn(
                      "px-4 py-1.5 text-sm rounded-md transition-all",
                      currency === c
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {CURRENCY_SYMBOL[c]} {c}
                  </button>
                ))}
              </div>
            </div>

            {/* Seats (Teams only) */}
            {plan.perSeat && (
              <div className="mt-6">
                <p className="text-sm font-medium mb-2">Seats</p>
                <div className="inline-flex items-center gap-3 rounded-lg border p-1.5">
                  <button
                    onClick={() => setSeats((s) => Math.max(1, s - 1))}
                    className="h-8 w-8 inline-flex items-center justify-center rounded-md hover:bg-accent"
                    aria-label="Remove seat"
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                  <span className="w-8 text-center font-semibold tabular-nums">{seats}</span>
                  <button
                    onClick={() => setSeats((s) => Math.min(500, s + 1))}
                    className="h-8 w-8 inline-flex items-center justify-center rounded-md hover:bg-accent"
                    aria-label="Add seat"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}

            {/* Perks */}
            <ul className="mt-8 space-y-2.5">
              {PLAN_PERKS[planId].map((perk) => (
                <li key={perk} className="flex items-start gap-2.5 text-sm">
                  <Check className="h-4 w-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                  <span className="text-muted-foreground">{perk}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* ── Right: order summary ────────────────────────────────────── */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="rounded-2xl border bg-card p-6 shadow-xl lg:sticky lg:top-8"
          >
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Sparkles className="h-4 w-4 text-violet-500" />
              Order summary
            </div>

            <div className="mt-5 space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">{plan.name} plan</span>
                <span className="font-medium capitalize">{cycle}</span>
              </div>
              {plan.perSeat && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Seats</span>
                  <span className="font-medium">
                    {seats} × {formatPrice(plan.prices[currency][cycle], currency)}
                  </span>
                </div>
              )}
              <div className="border-t pt-3 flex justify-between items-baseline">
                <span className="font-semibold">
                  Total {cycle === "yearly" ? "/ year" : "/ month"}
                </span>
                <span className="text-2xl font-bold">{formatPrice(total, currency)}</span>
              </div>
              {cycle === "yearly" && (
                <p className="text-xs text-emerald-500">
                  ≈ {formatPrice(perMo * effectiveSeats, currency)} / mo · you save{" "}
                  {discount}% vs monthly
                </p>
              )}
            </div>

            <div className="mt-6">
              {alreadyOnPlan ? (
                <Button className="w-full" size="lg" variant="outline" disabled>
                  <Check className="h-4 w-4" /> You're on {plan.name}
                </Button>
              ) : paymentsEnabled === false ? (
                <div className="rounded-lg border border-amber-500/30 bg-amber-500/[0.06] p-3 text-xs text-amber-600 dark:text-amber-400">
                  Payments aren&apos;t configured on this server yet. Add your Razorpay keys to
                  <code className="mx-1 rounded bg-amber-500/10 px-1">.env.local</code>
                  to enable checkout.
                </div>
              ) : (
                <Button
                  onClick={handlePay}
                  disabled={loading || paymentsEnabled === null}
                  variant="gradient"
                  size="lg"
                  className="w-full"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" /> Opening secure checkout…
                    </>
                  ) : (
                    <>
                      <Lock className="h-4 w-4" /> Pay {formatPrice(total, currency)}
                    </>
                  )}
                </Button>
              )}
            </div>

            <div className="mt-4 flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground">
              <ShieldCheck className="h-3.5 w-3.5" />
              256-bit encrypted · PCI-DSS via Razorpay · no card data touches our servers
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
