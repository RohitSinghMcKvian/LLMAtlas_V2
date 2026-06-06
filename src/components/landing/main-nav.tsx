"use client";

/**
 * LLMAtlas — MainNav
 *
 * A premium, fully featured navigation bar used on all public-facing landing
 * pages.  Designed to the standard of Vercel / Linear / Anthropic.
 *
 * Features
 *  ■ Scroll-reactive glass morphism (transparent → blur-backdrop on scroll)
 *  ■ Shimmer border that appears on scroll
 *  ■ Products & Learn  — wide mega-menu with featured card + icon-grid
 *  ■ Solutions         — compact icon-list dropdown
 *  ■ Pricing           — direct anchor link
 *  ■ Live status badge (pulsing green dot)
 *  ■ GitHub pill
 *  ■ Sign in + animated "Get started" CTA
 *  ■ Hover-intent delay (150 ms) so menus don't vanish on diagonal mouse moves
 *  ■ ESC to close any open menu
 *  ■ Route-change auto-close
 *  ■ Mobile: full-height slide-in drawer, accordion submenus, body-scroll lock
 *  ■ Animated hamburger ↔ close icon
 *  ■ HexMark brand logo with hover glow
 */

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Menu, X, ChevronDown, ArrowRight,
  MessageSquare, GitCompare, Database, Calculator,
  BarChart3, Library, Activity, Code2,
  BookOpen, Sparkles, Zap, Layers,
  Users, Building2, TrendingUp,
  GitBranch, BadgeCheck,
  Github, Mail,
} from "lucide-react";
import { HexMark } from "@/components/brand/logo";
import { cn } from "@/lib/utils";

/* ══════════════════════════════════════════════════════════════════════
   NAV DATA
══════════════════════════════════════════════════════════════════════ */

interface NavItem {
  label: string;
  icon: React.ElementType;
  href: string;
  desc: string;
  badge?: string;
}
interface Featured {
  title: string;
  desc: string;
  href: string;
  badge?: string;
  accent: string;   // Tailwind bg-gradient class
}
interface NavGroup {
  label: string;
  type: "mega" | "dropdown" | "link";
  href?: string;
  featured?: Featured;
  items?: NavItem[];
}

const GROUPS: NavGroup[] = [
  /* ── Products ─────────────────────────────────────────────────────── */
  {
    label: "Products",
    type: "mega",
    featured: {
      title: "AI Playground",
      desc: "Chat with 195+ models simultaneously. Compare side-by-side, test prompts, export results — completely free to start.",
      href: "/playground",
      badge: "Free tier",
      accent: "from-blue-600/20 via-violet-600/12 to-indigo-600/20",
    },
    items: [
      { label: "Playground",      icon: MessageSquare, href: "/playground",  desc: "Chat with 195+ LLMs live"      },
      { label: "Compare Lab",     icon: GitCompare,    href: "/compare",     desc: "A/B test any two models"       },
      { label: "Model Tracker",   icon: Database,      href: "/models",      desc: "Catalogue + live benchmarks"   },
      { label: "Cost Calculator", icon: Calculator,    href: "/calculator",  desc: "Estimate your token spend"     },
      { label: "Leaderboard",     icon: BarChart3,     href: "/leaderboard", desc: "Ranked by quality & speed"    },
      { label: "Prompt Library",  icon: Library,       href: "/prompts",     desc: "Community-curated prompts"    },
      { label: "API Status",      icon: Activity,      href: "/status",      desc: "Live provider uptime"          },
      { label: "Code Editor",     icon: Code2,         href: "/code",        desc: "AI-assisted code runs", badge: "Soon" },
    ],
  },

  /* ── Learn ─────────────────────────────────────────────────────────── */
  {
    label: "Learn",
    type: "mega",
    featured: {
      title: "Zero → Production",
      desc: "Three guided paths. Nine lessons. Go from \"what is an LLM\" to shipping production AI — earn shareable certificates.",
      href: "/learn",
      badge: "New",
      accent: "from-violet-600/22 via-purple-600/12 to-fuchsia-600/18",
    },
    items: [
      { label: "Lesson Library",    icon: BookOpen,    href: "/learn",                        desc: "9 lessons · 3 paths"           },
      { label: "Absolute Beginner", icon: Sparkles,    href: "/learn/path/absolute-beginner", desc: "Zero AI knowledge needed"      },
      { label: "Ship to Prod",      icon: Zap,         href: "/learn/path/production-ready",  desc: "Build real features in days"   },
      { label: "AI Architect",      icon: Layers,      href: "/learn/path/ai-architect",      desc: "Enterprise-scale design"       },
      { label: "Visual Roadmap",    icon: GitBranch,   href: "/learn/roadmap",                desc: "See your full learning path"   },
      { label: "Certificates",      icon: BadgeCheck,  href: "/learn/certificates",           desc: "Earn shareable credentials"    },
    ],
  },

  /* ── Solutions ─────────────────────────────────────────────────────── */
  {
    label: "Solutions",
    type: "dropdown",
    items: [
      { label: "For Developers",  icon: Code2,        href: "/playground",  desc: "BYOK · 195+ models · no setup"  },
      { label: "For Researchers", icon: TrendingUp,   href: "/models",      desc: "Benchmarks & cost comparisons"  },
      { label: "For Teams",       icon: Users,        href: "/#pricing",    desc: "Shared workspace + RBAC"        },
      { label: "Enterprise",      icon: Building2,    href: "/contact",     desc: "On-prem · SSO · dedicated SLA"  },
    ],
  },

  /* ── Pricing ───────────────────────────────────────────────────────── */
  { label: "Pricing", type: "link", href: "/#pricing" },
];

/* ══════════════════════════════════════════════════════════════════════
   ANIMATION VARIANTS
══════════════════════════════════════════════════════════════════════ */

const menuVariants = {
  hidden: { opacity: 0, y: -10, scale: 0.97 },
  show: {
    opacity: 1, y: 0, scale: 1,
    transition: { duration: 0.2, ease: [0.16, 1, 0.3, 1] },
  },
  exit: {
    opacity: 0, y: -8, scale: 0.97,
    transition: { duration: 0.13, ease: "easeIn" },
  },
};

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.032, delayChildren: 0.05 } },
};
const itemFade = {
  hidden: { opacity: 0, x: -6 },
  show: { opacity: 1, x: 0, transition: { duration: 0.22 } },
};

const drawerVariants = {
  hidden: { x: "100%", opacity: 0 },
  show: { x: 0, opacity: 1, transition: { duration: 0.32, ease: [0.16, 1, 0.3, 1] } },
  exit:  { x: "100%", opacity: 0, transition: { duration: 0.22, ease: "easeIn" } },
};

/* ══════════════════════════════════════════════════════════════════════
   SUB-COMPONENTS
══════════════════════════════════════════════════════════════════════ */

/* Single row inside any dropdown */
function DropRow({ item, onClose }: { item: NavItem; onClose: () => void }) {
  const Icon = item.icon;
  return (
    <motion.div variants={itemFade}>
      <Link
        href={item.href}
        onClick={onClose}
        className="group flex items-start gap-3 p-2.5 rounded-xl
                   hover:bg-white/[0.07] transition-colors duration-150"
      >
        <div
          className="mt-0.5 h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0
                     bg-white/[0.06] group-hover:bg-white/[0.11] transition-colors"
        >
          <Icon className="h-[14px] w-[14px] text-white/55 group-hover:text-white/90 transition-colors" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 leading-none">
            <span className="text-[13px] font-medium text-white/78 group-hover:text-white transition-colors">
              {item.label}
            </span>
            {item.badge && (
              <span className="px-1.5 py-[2px] text-[9px] font-bold rounded-full leading-none
                               bg-violet-500/25 text-violet-300 border border-violet-500/35">
                {item.badge}
              </span>
            )}
          </div>
          <p className="text-[11.5px] text-white/35 mt-[3px] leading-snug truncate">{item.desc}</p>
        </div>
      </Link>
    </motion.div>
  );
}

/* Featured card (left side of mega menu) */
function FeaturedCard({ f, onClose }: { f: Featured; onClose: () => void }) {
  return (
    <Link href={f.href} onClick={onClose} className="group block h-full">
      <div
        className={cn(
          "relative h-full rounded-xl overflow-hidden border border-white/[0.10] p-5",
          "flex flex-col justify-between",
          "bg-gradient-to-br",
          f.accent,
          "hover:border-white/[0.22] transition-colors duration-200",
        )}
      >
        {/* Shimmer top line */}
        <div
          className="absolute top-0 inset-x-0 h-px"
          style={{ background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.35), transparent)" }}
        />

        {/* Corner glow */}
        <div
          className="absolute -top-8 -right-8 w-24 h-24 rounded-full blur-2xl opacity-30 pointer-events-none"
          style={{ background: "radial-gradient(circle, rgba(168,85,247,0.8) 0%, transparent 70%)" }}
        />

        <div className="relative">
          {f.badge && (
            <span
              className="inline-block mb-3 px-2 py-[3px] text-[9px] font-bold rounded-full uppercase tracking-wider
                         bg-white/10 text-white/65 border border-white/[0.16]"
            >
              {f.badge}
            </span>
          )}
          <h3 className="text-[15px] font-bold text-white mb-2 leading-tight">{f.title}</h3>
          <p className="text-[11.5px] text-white/48 leading-relaxed">{f.desc}</p>
        </div>

        <div className="relative mt-4 flex items-center gap-1 text-[12px] font-semibold
                        text-white/50 group-hover:text-white/85 transition-colors">
          Explore
          <ArrowRight className="h-3 w-3 group-hover:translate-x-0.5 transition-transform duration-150" />
        </div>
      </div>
    </Link>
  );
}

/* Wide mega-menu panel (Products, Learn) */
function MegaPanel({ group, onClose, onMouseEnter, onMouseLeave }: {
  group: NavGroup;
  onClose: () => void;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}) {
  return (
    <div
      className="w-full max-w-[660px] rounded-2xl border border-white/[0.10]
                 shadow-2xl shadow-black/70 overflow-hidden"
      style={{
        background: "hsl(260 55% 4% / 0.97)",
        backdropFilter: "blur(24px) saturate(180%)",
      }}
    >
      {/* Rainbow top bar */}
      <div
        className="h-px w-full"
        style={{
          background:
            "linear-gradient(90deg, transparent 0%, rgba(251,191,36,0.7) 20%, rgba(232,121,176,0.7) 40%, rgba(168,85,247,0.7) 60%, rgba(99,102,241,0.7) 80%, transparent 100%)",
        }}
      />

      <div className="p-4 grid grid-cols-[210px_1fr] gap-3">
        {/* Featured card */}
        {group.featured && (
          <div style={{ minHeight: 200 }}>
            <FeaturedCard f={group.featured} onClose={onClose} />
          </div>
        )}

        {/* Items grid */}
        <motion.div
          variants={stagger}
          initial="hidden"
          animate="show"
          className="grid grid-cols-2 content-start gap-0.5"
        >
          {group.items?.map((item) => (
            <DropRow key={item.label} item={item} onClose={onClose} />
          ))}
        </motion.div>
      </div>

      {/* Bottom strip */}
      <div className="px-4 py-2.5 border-t border-white/[0.06] flex items-center justify-between">
        <span className="text-[11px] text-white/25">
          {group.label === "Products" ? "195+ models · 13 providers · MIT licensed" : "Free forever · Self-hostable · Open source"}
        </span>
        <Link
          href={group.featured?.href ?? "/"}
          onClick={onClose}
          className="flex items-center gap-1 text-[11px] font-semibold text-violet-400/70 hover:text-violet-300 transition-colors"
        >
          View all
          <ArrowRight className="h-2.5 w-2.5" />
        </Link>
      </div>
    </div>
  );
}

/* Narrow dropdown panel (Solutions) */
function SimplePanel({ group, onClose, onMouseEnter, onMouseLeave }: {
  group: NavGroup;
  onClose: () => void;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}) {
  return (
    <div
      className="w-72 rounded-2xl border border-white/[0.10]
                 shadow-2xl shadow-black/70 overflow-hidden"
      style={{
        background: "hsl(260 55% 4% / 0.97)",
        backdropFilter: "blur(24px) saturate(180%)",
      }}
    >
      <div
        className="h-px w-full"
        style={{
          background:
            "linear-gradient(90deg, transparent, rgba(168,85,247,0.6), rgba(99,102,241,0.6), transparent)",
        }}
      />
      <motion.div variants={stagger} initial="hidden" animate="show" className="p-2">
        {group.items?.map((item) => (
          <DropRow key={item.label} item={item} onClose={onClose} />
        ))}
      </motion.div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════════════════════════════════════ */

export function MainNav() {
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mobileExpanded, setMobileExpanded] = useState<string | null>(null);
  const [scrolled, setScrolled] = useState(false);
  const pathname = usePathname();
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* ── Scroll detection ───────────────────────────────────────────── */
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  /* ── Close everything on route change ───────────────────────────── */
  useEffect(() => {
    setMobileOpen(false);
    setActiveMenu(null);
    setMobileExpanded(null);
  }, [pathname]);

  /* ── ESC key ────────────────────────────────────────────────────── */
  useEffect(() => {
    const fn = (e: KeyboardEvent) => {
      if (e.key === "Escape") { setActiveMenu(null); setMobileOpen(false); }
    };
    window.addEventListener("keydown", fn);
    return () => window.removeEventListener("keydown", fn);
  }, []);

  /* ── Body scroll lock for mobile drawer ────────────────────────── */
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [mobileOpen]);

  /* ── Hover-intent helpers ───────────────────────────────────────── */
  const openMenu = useCallback((label: string) => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setActiveMenu(label);
  }, []);

  const scheduleClose = useCallback(() => {
    closeTimer.current = setTimeout(() => setActiveMenu(null), 150);
  }, []);

  const cancelClose = useCallback(() => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
  }, []);

  const closeAll = useCallback(() => {
    setActiveMenu(null);
    setMobileOpen(false);
    setMobileExpanded(null);
  }, []);

  /* ── Render ─────────────────────────────────────────────────────── */
  return (
    <>
      {/* ════════════════════════════════════ HEADER ════════════════ */}
      <motion.header
        initial={{ y: -72, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.62, ease: [0.16, 1, 0.3, 1] }}
        className="fixed top-0 inset-x-0 z-50"
        style={{
          background: scrolled ? "hsl(260 87% 2% / 0.88)" : "transparent",
          backdropFilter: scrolled ? "blur(22px) saturate(180%)" : "none",
          transition: "background 0.3s ease, backdrop-filter 0.3s ease",
        }}
      >
        {/* ── Shimmer bottom border (visible on scroll) ─────────── */}
        <AnimatePresence>
          {scrolled && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute bottom-0 inset-x-0 h-px pointer-events-none"
              style={{
                background:
                  "linear-gradient(90deg, transparent 0%, rgba(251,191,36,0.5) 20%, rgba(168,85,247,0.6) 50%, rgba(99,102,241,0.5) 80%, transparent 100%)",
              }}
            />
          )}
        </AnimatePresence>

        {/*
         * THREE-COLUMN LAYOUT
         * ─────────────────────────────────────────────────────────────
         * Left  : logo  (flex-1, left-aligned)
         * Centre: nav   (absolutely centred — always pixel-perfect)
         * Right : CTAs  (flex-1, right-aligned)
         *
         * On mobile the absolute nav is hidden; a lean logo + hamburger
         * row takes over.
         */}
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 h-[68px] flex items-center">

          {/* ── LEFT — Logo ───────────────────────────────────────── */}
          <div className="flex-1 flex items-center">
            <Link
              href="/"
              className="flex items-center gap-2.5 group shrink-0"
              aria-label="LLMAtlas home"
            >
              <motion.div whileHover={{ scale: 1.09 }} whileTap={{ scale: 0.94 }} transition={{ duration: 0.18 }}>
                <HexMark size={32} glow shimmer />
              </motion.div>
              <span className="text-[hsl(40_6%_95%)] text-[17px] font-semibold tracking-tight select-none group-hover:text-white transition-colors">
                LLMAtlas
              </span>
            </Link>
          </div>

          {/* ── CENTRE — Nav (absolutely centred, desktop only) ─────── */}
          <nav className="hidden lg:flex absolute left-1/2 -translate-x-1/2 items-center gap-0.5">
            {GROUPS.map((group) => {
              const isActive = activeMenu === group.label;
              if (group.type === "link") {
                return (
                  <Link
                    key={group.label}
                    href={group.href!}
                    className="px-3.5 py-2 text-[13.5px] font-medium rounded-lg transition-colors duration-150
                               text-[hsl(40_6%_95%/0.62)] hover:text-[hsl(40_6%_95%)] hover:bg-white/[0.05]"
                  >
                    {group.label}
                  </Link>
                );
              }
              return (
                <div
                  key={group.label}
                  className="relative"
                  onMouseEnter={() => openMenu(group.label)}
                  onMouseLeave={scheduleClose}
                >
                  <button
                    onClick={() => setActiveMenu(isActive ? null : group.label)}
                    aria-expanded={isActive}
                    aria-haspopup="true"
                    className={cn(
                      "flex items-center gap-1 px-3.5 py-2 text-[13.5px] font-medium rounded-lg transition-colors duration-150",
                      isActive
                        ? "text-white bg-white/[0.07]"
                        : "text-[hsl(40_6%_95%/0.62)] hover:text-white hover:bg-white/[0.05]",
                    )}
                  >
                    {group.label}
                    <motion.span
                      animate={{ rotate: isActive ? 180 : 0 }}
                      transition={{ duration: 0.22 }}
                      className="mt-px opacity-60"
                    >
                      <ChevronDown className="h-3.5 w-3.5" />
                    </motion.span>
                  </button>

                  {/* Gradient underline pill on active */}
                  <AnimatePresence>
                    {isActive && (
                      <motion.span
                        key="ul"
                        layoutId="nav-underline"
                        className="absolute bottom-1 inset-x-3.5 h-[2px] rounded-full"
                        initial={{ opacity: 0, scaleX: 0 }}
                        animate={{ opacity: 1, scaleX: 1 }}
                        exit={{ opacity: 0, scaleX: 0 }}
                        style={{ background: "linear-gradient(90deg,#FBBF24,#A855F7,#6366F1)" }}
                        transition={{ duration: 0.18 }}
                      />
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </nav>

          {/* ── RIGHT — desktop CTAs + mobile hamburger ───────────── */}
          <div className="flex-1 flex items-center justify-end gap-2">

            {/* ·· DESKTOP ONLY ········································ */}

            {/* Live status pill */}
            <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1.5 rounded-full
                            border border-white/[0.10] bg-white/[0.04] select-none">
              <span className="relative flex h-1.5 w-1.5 shrink-0">
                <span className="absolute inset-0 animate-ping rounded-full bg-emerald-400 opacity-70" />
                <span className="relative h-1.5 w-1.5 rounded-full bg-emerald-400" />
              </span>
              <span className="text-[11px] text-white/48 font-medium whitespace-nowrap">All systems live</span>
            </div>

            {/* GitHub icon-only */}
            <motion.a
              href="https://github.com"
              target="_blank"
              rel="noreferrer"
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.95 }}
              className="hidden lg:flex h-8 w-8 items-center justify-center rounded-lg
                         text-white/45 hover:text-white/85 border border-white/[0.09]
                         hover:border-white/[0.22] hover:bg-white/[0.06] transition-all duration-150"
              aria-label="GitHub"
            >
              <Github className="h-4 w-4" />
            </motion.a>

            {/* Divider */}
            <div className="hidden lg:block w-px h-5 bg-white/[0.10]" />

            {/* Sign in */}
            <Link
              href="/auth/login"
              className="hidden lg:flex px-3.5 py-1.5 text-[13px] font-medium text-white/60
                         hover:text-white hover:bg-white/[0.05] rounded-lg transition-all duration-150"
            >
              Sign in
            </Link>

            {/* Get started gradient CTA */}
            <motion.div
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              className="hidden lg:block"
            >
              <Link
                href="/auth/register"
                className="flex items-center gap-1.5 px-[18px] py-[9px] text-[13px] font-semibold
                           text-white rounded-full transition-opacity duration-150 hover:opacity-90"
                style={{
                  background: "linear-gradient(135deg,hsl(239 84% 67%),hsl(271 91% 65%))",
                  boxShadow: "0 2px 16px -2px hsl(240 80% 55%/0.45),inset 0 1px 0 rgba(255,255,255,0.12)",
                }}
              >
                Get started
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </motion.div>

            {/* ·· MOBILE ONLY ········································· */}

            {/* Compact "Get started" pill on mobile */}
            <Link
              href="/auth/register"
              className="lg:hidden flex items-center gap-1 px-3.5 py-2 text-[12px] font-semibold
                         text-white rounded-full"
              style={{ background: "linear-gradient(135deg,hsl(239 84% 67%),hsl(271 91% 65%))" }}
            >
              Get started
            </Link>

            {/* Hamburger / Close — always visible on mobile, no AnimatePresence opacity bug */}
            <button
              onClick={() => setMobileOpen((v) => !v)}
              aria-label={mobileOpen ? "Close menu" : "Open menu"}
              aria-expanded={mobileOpen}
              className="tap-target lg:hidden flex items-center justify-center h-9 w-9 rounded-xl
                         text-white bg-white/[0.10] hover:bg-white/[0.16]
                         border border-white/[0.15] transition-colors duration-150"
            >
              <motion.div
                animate={{ rotate: mobileOpen ? 90 : 0 }}
                transition={{ duration: 0.22, ease: "easeInOut" }}
              >
                {mobileOpen ? <X className="h-[18px] w-[18px]" /> : <Menu className="h-[18px] w-[18px]" />}
              </motion.div>
            </button>
          </div>
        </div>

        {/* ── DESKTOP DROPDOWNS — rendered at header level so they
             position correctly (absolute relative to fixed header,
             not relative to the tiny button wrapper)           ── */}
        <AnimatePresence>
          {activeMenu && (() => {
            const group = GROUPS.find((g) => g.label === activeMenu);
            if (!group?.items) return null;
            return (
              <motion.div
                key={activeMenu}
                variants={menuVariants}
                initial="hidden"
                animate="show"
                exit="exit"
                className="hidden lg:block absolute inset-x-0 z-50 pt-2"
                style={{ top: "100%" }}
                onMouseEnter={cancelClose}
                onMouseLeave={scheduleClose}
              >
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex justify-center">
                  {group.type === "mega" ? (
                    <MegaPanel
                      group={group}
                      onClose={closeAll}
                      onMouseEnter={cancelClose}
                      onMouseLeave={scheduleClose}
                    />
                  ) : (
                    <SimplePanel
                      group={group}
                      onClose={closeAll}
                      onMouseEnter={cancelClose}
                      onMouseLeave={scheduleClose}
                    />
                  )}
                </div>
              </motion.div>
            );
          })()}
        </AnimatePresence>
      </motion.header>

      {/* ════════════════════════════════ MOBILE BACKDROP ══════════ */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22 }}
            className="fixed inset-0 z-40 bg-black/65 backdrop-blur-sm lg:hidden"
            onClick={() => setMobileOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* ════════════════════════════════ MOBILE DRAWER ════════════ */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            key="drawer"
            variants={drawerVariants}
            initial="hidden"
            animate="show"
            exit="exit"
            className="fixed top-0 right-0 bottom-0 z-50 w-full max-w-[340px]
                       flex flex-col lg:hidden overflow-y-auto overscroll-contain"
            style={{
              background: "hsl(260 87% 3%)",
              borderLeft: "1px solid rgba(255,255,255,0.08)",
              boxShadow: "-24px 0 80px rgba(0,0,0,0.7)",
            }}
          >
            {/* Drawer header */}
            <div className="flex items-center justify-between px-5 h-16 flex-shrink-0 border-b border-white/[0.08]">
              <Link href="/" onClick={closeAll} className="flex items-center gap-2.5">
                <HexMark size={28} glow />
                <span className="text-white text-[16px] font-semibold tracking-tight">LLMAtlas</span>
              </Link>
              <motion.button
                whileTap={{ scale: 0.88 }}
                onClick={() => setMobileOpen(false)}
                className="p-2 rounded-lg text-white/55 hover:text-white hover:bg-white/[0.08] transition-colors"
                aria-label="Close menu"
              >
                <X className="h-4.5 w-4.5" />
              </motion.button>
            </div>

            {/* Status badge */}
            <div className="px-4 pt-4">
              <div className="flex items-center justify-between px-3.5 py-2.5 rounded-xl
                              bg-white/[0.04] border border-white/[0.07]">
                <div className="flex items-center gap-2 text-[12px] text-white/45">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-65" />
                    <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  </span>
                  All systems operational
                </div>
                <Link
                  href="/status"
                  onClick={closeAll}
                  className="text-[11px] text-white/30 hover:text-white/60 transition-colors"
                >
                  Details →
                </Link>
              </div>
            </div>

            {/* Nav groups */}
            <div className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto">
              {GROUPS.map((group) => {
                if (group.type === "link") {
                  return (
                    <Link
                      key={group.label}
                      href={group.href!}
                      onClick={closeAll}
                      className="flex items-center justify-between px-3.5 py-3 rounded-xl
                                 text-[15px] font-medium text-white/65 hover:text-white
                                 hover:bg-white/[0.06] transition-colors"
                    >
                      {group.label}
                      <ArrowRight className="h-3.5 w-3.5 opacity-35" />
                    </Link>
                  );
                }

                const isExpanded = mobileExpanded === group.label;
                return (
                  <div key={group.label}>
                    <button
                      onClick={() => setMobileExpanded(isExpanded ? null : group.label)}
                      className={cn(
                        "w-full flex items-center justify-between px-3.5 py-3 rounded-xl",
                        "text-[15px] font-medium transition-colors",
                        isExpanded
                          ? "text-white bg-white/[0.07]"
                          : "text-white/65 hover:text-white hover:bg-white/[0.05]",
                      )}
                    >
                      {group.label}
                      <motion.span
                        animate={{ rotate: isExpanded ? 180 : 0 }}
                        transition={{ duration: 0.22 }}
                      >
                        <ChevronDown className="h-4 w-4 opacity-50" />
                      </motion.span>
                    </button>

                    <AnimatePresence initial={false}>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.24, ease: "easeInOut" }}
                          className="overflow-hidden"
                        >
                          <div className="px-2 pb-1.5 pt-0.5 space-y-0.5">
                            {group.items?.map((item) => {
                              const Icon = item.icon;
                              return (
                                <Link
                                  key={item.label}
                                  href={item.href}
                                  onClick={closeAll}
                                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl
                                             text-[13.5px] text-white/55 hover:text-white
                                             hover:bg-white/[0.06] transition-colors"
                                >
                                  <div className="h-7 w-7 rounded-lg bg-white/[0.06] flex items-center justify-center flex-shrink-0">
                                    <Icon className="h-3.5 w-3.5" />
                                  </div>
                                  <span className="flex-1">{item.label}</span>
                                  {item.badge && (
                                    <span className="px-1.5 py-[2px] text-[9px] font-bold rounded-full
                                                     bg-violet-500/25 text-violet-300 border border-violet-500/35">
                                      {item.badge}
                                    </span>
                                  )}
                                </Link>
                              );
                            })}

                            {/* Featured link */}
                            {group.featured && (
                              <Link
                                href={group.featured.href}
                                onClick={closeAll}
                                className="flex items-center justify-between mt-1 px-3 py-2.5 rounded-xl
                                           bg-gradient-to-r from-violet-500/12 to-indigo-500/12
                                           border border-white/[0.08] hover:border-white/[0.16]
                                           text-[12.5px] font-semibold text-white/60 hover:text-white/85
                                           transition-all duration-150"
                              >
                                <span>{group.featured.title}</span>
                                <ArrowRight className="h-3 w-3 opacity-50" />
                              </Link>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>

            {/* Bottom actions */}
            <div className="flex-shrink-0 border-t border-white/[0.08] p-4 space-y-2.5">
              {/* Social row */}
              <div className="flex items-center gap-2">
                <a
                  href="https://github.com"
                  target="_blank"
                  rel="noreferrer"
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl
                             text-[12.5px] font-medium text-white/45 border border-white/[0.09]
                             hover:text-white/70 hover:bg-white/[0.05] transition-all"
                >
                  <Github className="h-4 w-4" />
                  GitHub
                </a>
                <Link
                  href="/contact"
                  onClick={closeAll}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl
                             text-[12.5px] font-medium text-white/45 border border-white/[0.09]
                             hover:text-white/70 hover:bg-white/[0.05] transition-all"
                >
                  <Mail className="h-4 w-4" />
                  Contact
                </Link>
              </div>

              {/* Auth CTAs */}
              <Link
                href="/auth/login"
                onClick={closeAll}
                className="flex items-center justify-center w-full py-3 rounded-xl
                           text-[14px] font-medium text-white/70 border border-white/[0.12]
                           hover:text-white hover:border-white/[0.25] transition-all duration-150"
              >
                Sign in
              </Link>
              <Link
                href="/auth/register"
                onClick={closeAll}
                className="flex items-center justify-center gap-2 w-full py-3 rounded-xl
                           text-[14px] font-semibold text-white transition-all duration-150
                           hover:opacity-92"
                style={{
                  background: "linear-gradient(135deg, hsl(239 84% 67%), hsl(271 91% 65%))",
                  boxShadow: "0 4px 20px -4px hsl(240 80% 55% / 0.45)",
                }}
              >
                Get started free
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
