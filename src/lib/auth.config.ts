import type { NextAuthConfig } from "next-auth"

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
    authorized({ auth, request: { nextUrl } }) {
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

      return true
    },
  },
  providers: [],
} satisfies NextAuthConfig
