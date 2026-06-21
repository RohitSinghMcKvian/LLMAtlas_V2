import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { isPlanId, type PlanId } from "@/lib/billing/plans";
import { UpgradeClient } from "./upgrade-client";

export const metadata: Metadata = {
  title: "Upgrade",
  description: "Unlock the full LLMAtlas workspace.",
};

export default async function UpgradePage({
  searchParams,
}: {
  searchParams: Promise<{ plan?: string; cycle?: string }>;
}) {
  const params = await searchParams;
  const plan: PlanId = params.plan && isPlanId(params.plan) ? params.plan : "pro";
  const cycle = params.cycle === "yearly" ? "yearly" : "monthly";

  const session = await auth();
  if (!session?.user?.id) {
    const callback = `/upgrade?plan=${plan}&cycle=${cycle}`;
    redirect(`/auth/login?callbackUrl=${encodeURIComponent(callback)}`);
  }

  return (
    <UpgradeClient
      initialPlan={plan}
      initialCycle={cycle}
      currentTier={session.user.tier ?? "FREE"}
    />
  );
}
