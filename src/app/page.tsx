import dynamic from "next/dynamic";
import { MainNav } from "@/components/landing/main-nav";
import { LandingHero } from "@/components/landing/hero";
import { LandingStats } from "@/components/landing/stats";
import { LandingPillars } from "@/components/landing/pillars";

/* Below-the-fold sections are code-split to shrink the initial JS payload and
   speed up mobile TTI. ssr stays on (default), so they're still in the server
   HTML — no SEO loss and no layout shift. */
const LandingFeatures = dynamic(() => import("@/components/landing/features").then((m) => m.LandingFeatures));
const LandingPricing = dynamic(() => import("@/components/landing/pricing").then((m) => m.LandingPricing));
const LandingCTA = dynamic(() => import("@/components/landing/cta").then((m) => m.LandingCTA));
const LandingFooter = dynamic(() => import("@/components/landing/footer").then((m) => m.LandingFooter));

export default function HomePage() {
  return (
    <>
      <MainNav />
      <LandingHero />
      <main className="overflow-x-hidden">
        <LandingStats />
        <LandingPillars />
        <LandingFeatures />
        <LandingPricing />
        <LandingCTA />
      </main>
      <LandingFooter />
    </>
  );
}
