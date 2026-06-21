"use client";

import { useState } from "react";
import { DashboardSidebar } from "./sidebar";
import { DashboardTopbar } from "./topbar";
import { CommandPalette } from "@/components/shared/command-palette";
import { AtlasAgentBar } from "@/components/agent/atlas-agent-bar";
import { EmailVerificationBanner } from "@/components/auth/email-verification-banner";
import { OnboardingModal } from "@/components/auth/onboarding-modal";
import { cn } from "@/lib/utils";

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex md:w-64 md:flex-shrink-0">
        <DashboardSidebar />
      </aside>

      {/* Mobile drawer — CSS only, no framer */}
      <div
        className={cn(
          "fixed inset-0 z-40 md:hidden bg-background/70 transition-opacity duration-150",
          mobileOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none",
        )}
        onClick={() => setMobileOpen(false)}
        aria-hidden
      />
      <aside
        className={cn(
          "fixed left-0 top-0 bottom-0 w-72 z-50 md:hidden transform transition-transform duration-200 will-change-transform",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <DashboardSidebar onNavigate={() => setMobileOpen(false)} />
      </aside>

      <div className="flex-1 flex flex-col overflow-hidden">
        <DashboardTopbar onMenuClick={() => setMobileOpen(true)} />
        <EmailVerificationBanner />
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
      <CommandPalette />
      <AtlasAgentBar />
      <OnboardingModal />
    </div>
  );
}
