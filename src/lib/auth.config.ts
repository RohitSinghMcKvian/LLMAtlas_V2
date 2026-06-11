import type { NextAuthConfig } from "next-auth"
import { db } from "@/lib/db"

const AUTH_REQUIRED_PATHS = [
  "/settings/profile",
  "/settings/security",
  "/settings/notifications",
  "/settings/connected-accounts",
  "/settings/api-keys",
  "/profile",
]

export const authConfig = {
  pages: {
    signIn: "/auth/login",
    error: "/auth/error",
  },
  callbacks: {
    async authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user
      const pathname = nextUrl.pathname

      // Redirect logged-in users away from auth pages (except 2FA)
      if (isLoggedIn && pathname.startsWith("/auth/") && pathname !== "/auth/2fa") {
        return Response.redirect(new URL("/dashboard", nextUrl))
      }

      // Require auth only for account-specific pages
      const requiresAuth = AUTH_REQUIRED_PATHS.some((p) => pathname.startsWith(p))
      if (requiresAuth && !isLoggedIn) {
        const loginUrl = new URL("/auth/login", nextUrl)
        loginUrl.searchParams.set("callbackUrl", pathname)
        return Response.redirect(loginUrl)
      }

      // ── Token version check (invalidates sessions after password change) ──
      if (isLoggedIn && auth?.user?.id) {
        const tokenVersion = (auth as { tokenVersion?: number }).tokenVersion
        if (tokenVersion !== undefined) {
          try {
            const user = await db.user.findUnique({
              where: { id: auth.user.id },
              select: { tokenVersion: true },
            })
            if (user && user.tokenVersion !== tokenVersion) {
              // Token version mismatch — session is stale, force re-login
              const loginUrl = new URL("/auth/login", nextUrl)
              loginUrl.searchParams.set("callbackUrl", pathname)
              return Response.redirect(loginUrl)
            }
          } catch {
            // DB read failed — allow through to avoid blocking
          }
        }
      }

      return true
    },
  },
  providers: [],
} satisfies NextAuthConfig
