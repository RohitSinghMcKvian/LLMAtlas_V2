"use client"

import { motion } from "framer-motion"
import Link from "next/link"
import { HexMark } from "@/components/brand/logo"

interface AuthLayoutProps {
  children: React.ReactNode
  title: string
  description: string
  footer?: React.ReactNode
}

export function AuthLayout({ children, title, description, footer }: AuthLayoutProps) {
  return (
    <div className="min-h-screen bg-[hsl(240,32%,6%)] flex flex-col items-center justify-center p-4">
      {/* Mesh gradient background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full bg-indigo-600/12 blur-[120px]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] rounded-full bg-violet-600/10 blur-[120px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="relative z-10 w-full max-w-md"
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-3 group" aria-label="LLMAtlas home">
            <motion.div
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.93 }}
              transition={{ duration: 0.18 }}
            >
              <HexMark size={44} glow shimmer />
            </motion.div>
            <motion.span
              className="text-2xl font-bold tracking-tight select-none"
              style={{ color: "hsl(40 6% 92%)" }}
              whileHover={{ color: "hsl(40 6% 100%)" }}
              transition={{ duration: 0.15 }}
            >
              LLMAtlas
            </motion.span>
          </Link>
        </div>

        {/* Card */}
        <div className="bg-[hsl(240,30%,9%)] border border-white/10 rounded-2xl p-8 shadow-2xl backdrop-blur-sm">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-white mb-1">{title}</h1>
            <p className="text-sm text-white/50">{description}</p>
          </div>

          {children}
        </div>

        {footer && (
          <div className="mt-4 text-center text-sm text-white/40">{footer}</div>
        )}
      </motion.div>
    </div>
  )
}
