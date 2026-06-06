"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useTheme } from "next-themes";
import { motion } from "framer-motion";
import { Menu, Sun, Moon, Search, Bell, Github, LogOut, User, Settings, BookOpen, Zap } from "lucide-react";
import { useSession, signOut } from "next-auth/react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Props {
  onMenuClick: () => void;
}

const IconBtn = ({ children, onClick, label }: { children: React.ReactNode; onClick?: () => void; label?: string }) => (
  <motion.button
    whileHover={{ scale: 1.1 }}
    whileTap={{ scale: 0.9 }}
    onClick={onClick}
    aria-label={label}
    className="tap-target h-9 w-9 inline-flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
  >
    {children}
  </motion.button>
);

export function DashboardTopbar({ onMenuClick }: Props) {
  const { resolvedTheme, setTheme } = useTheme();
  const { data: session } = useSession();
  const [query, setQuery]   = useState("");
  const [mounted, setMounted] = useState(false);
  const [focused, setFocused] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  const userName = session?.user?.name || "Guest";
  const userEmail = session?.user?.email || "";
  const userImage = session?.user?.image;
  const userTier = (session?.user as { tier?: string })?.tier ?? "FREE";
  const initials = userName.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2) || "G";

  const tierLabel = userTier === "FREE" ? "free tier" : userTier === "PRO" ? "pro" : userTier.toLowerCase();

  return (
    <motion.header
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
      className="sticky top-0 z-40 h-16 border-b bg-background/95 backdrop-blur flex items-center px-4 md:px-6 gap-4"
    >
      {/* Mobile hamburger */}
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        className="tap-target md:hidden p-2 -ml-2 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
        onClick={onMenuClick}
        aria-label="Open menu"
      >
        <Menu className="h-5 w-5" />
      </motion.button>

      {/* Search */}
      <motion.div
        className="flex-1 max-w-md relative"
        animate={{ scale: focused ? 1.01 : 1 }}
        transition={{ duration: 0.15 }}
      >
        <motion.div
          className="absolute left-3 top-1/2 -translate-y-1/2"
          animate={{ color: focused ? "hsl(var(--primary))" : "hsl(var(--muted-foreground))" }}
          transition={{ duration: 0.2 }}
        >
          <Search className="h-4 w-4" />
        </motion.div>
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder="Search models, prompts, lessons…"
          className="pl-9 bg-muted/50 border-transparent focus:border-primary/40 transition-all duration-200"
        />
        <kbd className="hidden lg:flex absolute right-3 top-1/2 -translate-y-1/2 items-center gap-0.5 rounded border bg-muted px-1.5 text-[10px] font-mono text-muted-foreground pointer-events-none">
          ⌘K
        </kbd>
      </motion.div>

      {/* Right actions */}
      <div className="flex items-center gap-1">
        {/* GitHub */}
        <a
          href="https://github.com"
          target="_blank"
          rel="noreferrer"
          className="hidden md:block"
          aria-label="GitHub"
        >
          <IconBtn label="GitHub">
            <Github className="h-4 w-4" />
          </IconBtn>
        </a>

        {/* Theme toggle */}
        <IconBtn
          label="Toggle theme"
          onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
        >
          {mounted ? (
            resolvedTheme === "dark"
              ? <Sun className="h-4 w-4" />
              : <Moon className="h-4 w-4" />
          ) : (
            <Sun className="h-4 w-4" />
          )}
        </IconBtn>

        {/* Notifications */}
        <div className="relative">
          <motion.div
            whileHover="hover"
            whileTap={{ scale: 0.9 }}
          >
            <motion.button
              variants={{ hover: { scale: 1.1 } }}
              className="tap-target h-9 w-9 inline-flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors relative"
              aria-label="Notifications"
            >
              <motion.div
                variants={{
                  hover: { rotate: [0, -20, 20, -10, 10, 0] },
                }}
                transition={{ duration: 0.5 }}
              >
                <Bell className="h-4 w-4" />
              </motion.div>
            </motion.button>
          </motion.div>
          {/* Notification dot */}
          <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-primary">
            <motion.span
              className="absolute inset-0 rounded-full bg-primary"
              animate={{ scale: [1, 1.8, 1], opacity: [1, 0, 1] }}
              transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
            />
          </span>
        </div>

        {/* Avatar */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <motion.button
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.95 }}
              className="tap-target relative ml-2 h-9 w-9 rounded-full overflow-hidden bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center text-white text-sm font-semibold shadow-md focus:outline-none focus:ring-2 focus:ring-primary/40 focus:ring-offset-2"
            >
              {userImage ? (
                <Image src={userImage} alt={userName} fill className="object-cover" />
              ) : (
                <span className="text-xs font-bold">{initials}</span>
              )}
            </motion.button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64">
            <DropdownMenuLabel>
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-full overflow-hidden bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center flex-shrink-0">
                  {userImage ? (
                    <Image src={userImage} alt={userName} width={36} height={36} className="object-cover" />
                  ) : (
                    <span className="text-xs font-bold text-white">{initials}</span>
                  )}
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-semibold truncate">{userName}</div>
                  <div className="text-xs text-muted-foreground truncate">
                    {userEmail || "Not signed in"} · <span className="capitalize">{tierLabel}</span>
                  </div>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {session ? (
              <>
                <DropdownMenuItem asChild>
                  <Link href="/settings/profile" className="flex items-center gap-2">
                    <User className="h-4 w-4" /> Profile & account
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/settings" className="flex items-center gap-2">
                    <Settings className="h-4 w-4" /> API keys & settings
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/settings/security" className="flex items-center gap-2">
                    <Zap className="h-4 w-4" /> Security
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/learn" className="flex items-center gap-2">
                    <BookOpen className="h-4 w-4" /> Learn hub
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-red-400 hover:text-red-300 flex items-center gap-2 cursor-pointer"
                  onClick={() => signOut({ callbackUrl: "/" })}
                >
                  <LogOut className="h-4 w-4" /> Sign out
                </DropdownMenuItem>
              </>
            ) : (
              <>
                <DropdownMenuItem asChild>
                  <Link href="/auth/login" className="flex items-center gap-2">
                    <LogOut className="h-4 w-4 rotate-180" /> Sign in
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/auth/register" className="flex items-center gap-2">
                    <User className="h-4 w-4" /> Create account
                  </Link>
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </motion.header>
  );
}
