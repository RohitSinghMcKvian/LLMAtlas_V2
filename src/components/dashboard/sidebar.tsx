"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import {
  Home, MessageSquare, GitCompare, Database, Calculator, Activity,
  BookOpen, Library, BarChart3, Settings, Sparkles, Code2, FolderKanban,
  LogIn, UserPlus,
} from "lucide-react";
import { HexMark } from "@/components/brand/logo";
import { useSession } from "next-auth/react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

interface NavItem {
  label: string;
  href: string;
  icon: typeof Home;
  badge?: string;
  group: string;
}

const NAV: NavItem[] = [
  { label: "Overview",       href: "/dashboard",   icon: Home,         group: "Workspace" },
  { label: "Playground",     href: "/playground",  icon: MessageSquare, group: "Develop"  },
  { label: "Code",           href: "/code",        icon: Code2,         badge: "Soon", group: "Develop" },
  { label: "Projects",       href: "/projects",    icon: FolderKanban,  badge: "Soon", group: "Develop" },
  { label: "Compare",        href: "/compare",     icon: GitCompare,    group: "Develop"  },
  { label: "Prompts",        href: "/prompts",     icon: Library,       group: "Develop"  },
  { label: "Models",         href: "/models",      icon: Database,      group: "Research" },
  { label: "Cost Calculator",href: "/calculator",  icon: Calculator,    group: "Research" },
  { label: "Leaderboard",    href: "/leaderboard", icon: BarChart3,     group: "Research" },
  { label: "API Status",     href: "/status",      icon: Activity,      group: "Research" },
  { label: "Learn",          href: "/learn",       icon: BookOpen,      badge: "New", group: "Learn" },
  { label: "Settings",       href: "/settings",    icon: Settings,      group: "Account"  },
];

const GROUPS = ["Workspace", "Develop", "Research", "Learn", "Account"];

/* ── variants ─────────────────────────────────────────────────────── */
const sidebarVariants = {
  hidden: { x: -24, opacity: 0 },
  show:   { x: 0,   opacity: 1, transition: { duration: 0.38, ease: [0.25, 0.1, 0.25, 1] } },
};
const groupContainer = {
  hidden: {},
  show:   { transition: { staggerChildren: 0.04, delayChildren: 0.1 } },
};
const itemVariant = {
  hidden: { opacity: 0, x: -10 },
  show:   { opacity: 1, x: 0, transition: { duration: 0.28, ease: "easeOut" } },
};

export function DashboardSidebar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const isLoggedIn = !!session?.user;
  const userTier = (session?.user as { tier?: string })?.tier ?? "FREE";
  const isPro = userTier !== "FREE";

  return (
    <motion.div
      variants={sidebarVariants}
      initial="hidden"
      animate="show"
      className="flex flex-col h-full bg-card border-r"
    >
      {/* Logo */}
      <div className="px-6 py-5 border-b">
        <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
          <Link href="/" className="flex items-center gap-2.5 group" aria-label="LLMAtlas home">
            <HexMark size={36} glow shimmer />
            <span className="text-lg font-bold">LLMAtlas</span>
          </Link>
        </motion.div>
      </div>

      {/* Nav */}
      <motion.nav
        variants={groupContainer}
        initial="hidden"
        animate="show"
        className="flex-1 overflow-y-auto px-3 py-3 space-y-0.5"
      >
        {GROUPS.map((group, idx) => {
          const items = NAV.filter((n) => n.group === group);
          if (!items.length) return null;
          return (
            <motion.div key={group} variants={itemVariant} className="pt-1">
              {/* Intentional thin divider between sections — not before the first */}
              {idx > 0 && (
                <div className="mx-3 mb-3 mt-1 h-px bg-border/60" aria-hidden />
              )}
              <p className="px-3 mb-1 text-[10px] font-semibold text-muted-foreground/70 uppercase tracking-widest">
                {group}
              </p>
              <ul className="space-y-0.5">
                {items.map((item) => {
                  const active = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
                  return (
                    <motion.li key={item.href} variants={itemVariant} className="relative">
                      {/* Active indicator pill — plain CSS, no Framer transforms so it
                          stays exactly at left:0 of the li (nav content edge), cleanly
                          outside the rounded link background. CSS fade+scale via
                          tailwindcss-animate. */}
                      {active && (
                        <span
                          className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5
                                     rounded-r-full bg-primary
                                     animate-in fade-in zoom-in-75 duration-200"
                          aria-hidden
                        />
                      )}
                      <motion.div whileHover={{ x: 2 }} transition={{ duration: 0.15 }}>
                        <Link
                          href={item.href}
                          prefetch
                          onClick={onNavigate}
                          aria-current={active ? "page" : undefined}
                          className={cn(
                            "flex items-center gap-3 pl-5 pr-3 py-2 rounded-lg text-sm font-medium transition-colors",
                            active
                              ? "bg-accent text-foreground"
                              : "text-muted-foreground hover:text-foreground hover:bg-accent/50",
                          )}
                        >
                          <motion.div
                            animate={active ? { scale: 1.1 } : { scale: 1 }}
                            transition={{ duration: 0.2 }}
                          >
                            <item.icon className="h-4 w-4 flex-shrink-0" />
                          </motion.div>
                          <span className="flex-1">{item.label}</span>
                          {item.badge && (
                            <Badge variant="default" className="text-[10px] px-1.5 py-0">
                              {item.badge}
                            </Badge>
                          )}
                        </Link>
                      </motion.div>
                    </motion.li>
                  );
                })}
              </ul>
            </motion.div>
          );
        })}
      </motion.nav>

      {/* Bottom card */}
      <div className="p-4 border-t">
        {!isLoggedIn ? (
          <motion.div
            className="relative rounded-lg overflow-hidden border border-primary/20 p-4"
            whileHover={{ scale: 1.02 }}
            transition={{ duration: 0.2 }}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-blue-600/10 via-violet-600/10 to-indigo-600/10" />
            <div className="relative">
              <div className="flex items-center gap-2 mb-2">
                <motion.div
                  animate={{ rotate: [0, 15, -5, 0] }}
                  transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", repeatDelay: 2 }}
                >
                  <Sparkles className="h-4 w-4 text-primary" />
                </motion.div>
                <span className="text-sm font-semibold">Sign in free</span>
              </div>
              <p className="text-xs text-muted-foreground mb-3">
                Save prompts, track progress, and sync your workspace across devices.
              </p>
              <div className="flex gap-2">
                <Link href="/auth/login" className="flex items-center gap-1 text-xs font-medium text-primary hover:underline">
                  <LogIn className="h-3 w-3" /> Sign in
                </Link>
                <span className="text-xs text-muted-foreground">·</span>
                <Link href="/auth/register" className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground">
                  <UserPlus className="h-3 w-3" /> Register
                </Link>
              </div>
            </div>
          </motion.div>
        ) : !isPro ? (
          <motion.div
            className="relative rounded-lg overflow-hidden border border-primary/20 p-4"
            whileHover={{ scale: 1.02 }}
            transition={{ duration: 0.2 }}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-blue-600/10 via-violet-600/10 to-indigo-600/10" />
            <div className="relative">
              <div className="flex items-center gap-2 mb-2">
                <motion.div
                  animate={{ rotate: [0, 15, -5, 0] }}
                  transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", repeatDelay: 2 }}
                >
                  <Sparkles className="h-4 w-4 text-primary" />
                </motion.div>
                <span className="text-sm font-semibold">Pro tier</span>
              </div>
              <p className="text-xs text-muted-foreground mb-3">
                Unlock all 20+ models, unlimited prompts, and eval suite.
              </p>
              <Link href="/#pricing" className="inline-flex items-center text-xs font-medium text-primary hover:underline">
                Upgrade — $9/mo →
              </Link>
            </div>
          </motion.div>
        ) : (
          <div className="px-1">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-green-400 animate-pulse" />
              <span className="text-xs text-muted-foreground capitalize">{userTier.toLowerCase()} plan active</span>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}
