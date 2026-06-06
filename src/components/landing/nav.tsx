"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, BookOpen, Database, MessageSquare, GitCompare, Tag, Mail, ArrowRight } from "lucide-react";
import { HexMark } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { label: "Learn",      href: "/learn",      icon: BookOpen      },
  { label: "Models",     href: "/models",     icon: Database      },
  { label: "Playground", href: "/playground", icon: MessageSquare },
  { label: "Compare",    href: "/compare",    icon: GitCompare    },
  { label: "Pricing",    href: "#pricing",    icon: Tag           },
];

export function LandingNav() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const isContact = pathname === "/contact";

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <motion.header
      initial={{ y: -80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-all duration-300",
        scrolled ? "glass border-b py-3" : "bg-transparent py-5",
      )}
    >
      <div className="container flex items-center justify-between">

        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 group" aria-label="LLMAtlas home">
          <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.94 }} transition={{ duration: 0.18 }}>
            <HexMark size={36} />
          </motion.div>
          <span className="text-xl font-bold tracking-tight">LLMAtlas</span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-1">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors rounded-md hover:bg-accent"
            >
              <item.icon className="h-3.5 w-3.5 opacity-60" />
              {item.label}
            </Link>
          ))}

          {/* ── Contact pill — visually distinct ── */}
          <motion.div
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
            className="ml-1"
          >
            <Link
              href="/contact"
              className={cn(
                "relative flex items-center gap-1.5 px-3.5 py-1.5 text-sm font-semibold rounded-full border transition-all duration-200 overflow-hidden group",
                isContact
                  ? "border-blue-500/60 bg-blue-500/10 text-blue-400"
                  : "border-border hover:border-blue-500/40 text-muted-foreground hover:text-blue-400 hover:bg-blue-500/8",
              )}
            >
              {/* Animated gradient shimmer on hover */}
              <span
                className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none rounded-full"
                style={{
                  background:
                    "linear-gradient(135deg, hsl(217 91% 60% / 0.08) 0%, hsl(258 90% 66% / 0.06) 100%)",
                }}
              />
              {/* Pulse dot — always visible on /contact, else on hover */}
              <span className="relative flex h-1.5 w-1.5 shrink-0">
                <span
                  className={cn(
                    "absolute inline-flex h-full w-full rounded-full opacity-75",
                    isContact
                      ? "animate-ping bg-blue-400"
                      : "animate-ping bg-blue-400 opacity-0 group-hover:opacity-75 transition-opacity",
                  )}
                />
                <span
                  className={cn(
                    "relative inline-flex h-1.5 w-1.5 rounded-full",
                    isContact ? "bg-blue-400" : "bg-blue-400 opacity-0 group-hover:opacity-100 transition-opacity",
                  )}
                />
              </span>
              <Mail className="h-3.5 w-3.5 relative" />
              <span className="relative">Contact</span>
              <ArrowRight
                className={cn(
                  "h-3 w-3 transition-all duration-200 relative",
                  isContact ? "opacity-60 translate-x-0" : "opacity-0 -translate-x-1 group-hover:opacity-50 group-hover:translate-x-0",
                )}
              />
            </Link>
          </motion.div>
        </nav>

        {/* Right actions */}
        <div className="hidden md:flex items-center gap-2">
          <Button asChild variant="ghost" size="sm">
            <Link href="/auth/login">Sign in</Link>
          </Button>
          <Button asChild variant="gradient" size="sm" className="shadow-lg">
            <Link href="/playground">Get started — free</Link>
          </Button>
        </div>

        {/* Mobile hamburger */}
        <button
          className="md:hidden p-2 rounded-md hover:bg-accent"
          onClick={() => setOpen((o) => !o)}
          aria-label="Toggle menu"
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile drawer */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="md:hidden overflow-hidden border-t bg-background/95 backdrop-blur"
          >
            <div className="container py-4 flex flex-col gap-1">
              {NAV_ITEMS.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex items-center gap-2 px-3 py-2 text-base font-medium rounded-md hover:bg-accent"
                  onClick={() => setOpen(false)}
                >
                  <item.icon className="h-4 w-4 opacity-60" />
                  {item.label}
                </Link>
              ))}

              {/* Contact — highlighted in mobile drawer */}
              <Link
                href="/contact"
                onClick={() => setOpen(false)}
                className={cn(
                  "flex items-center gap-2 px-3 py-2 text-base font-semibold rounded-md border transition-colors",
                  isContact
                    ? "border-blue-500/40 bg-blue-500/10 text-blue-400"
                    : "border-border hover:bg-blue-500/8 hover:text-blue-400",
                )}
              >
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-blue-400 opacity-60" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-blue-400" />
                </span>
                <Mail className="h-4 w-4" />
                Contact Us
              </Link>

              <div className="flex gap-2 mt-2">
                <Button asChild variant="outline" size="sm" className="flex-1">
                  <Link href="/auth/login">Sign in</Link>
                </Button>
                <Button asChild variant="gradient" size="sm" className="flex-1">
                  <Link href="/playground">Start free</Link>
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  );
}
