import NextAuth from "next-auth"
import type { Provider } from "next-auth/providers"
import { PrismaAdapter } from "@auth/prisma-adapter"
import Google from "next-auth/providers/google"
import GitHub from "next-auth/providers/github"
import Discord from "next-auth/providers/discord"
import Credentials from "next-auth/providers/credentials"
import bcrypt from "bcryptjs"
import { db } from "@/lib/db"
import { authConfig } from "@/lib/auth.config"
import { loginSchema } from "@/lib/validations/auth"
import { trySendEmail, sendNewLoginAlert } from "@/lib/email"

// ── Build providers list conditionally ──────────────────────────────────────
const oauthProviders: Provider[] = []

if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  oauthProviders.push(
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    })
  )
}

if (process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET) {
  oauthProviders.push(
    GitHub({
      clientId: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
    })
  )
}

if (process.env.DISCORD_CLIENT_ID && process.env.DISCORD_CLIENT_SECRET) {
  oauthProviders.push(
    Discord({
      clientId: process.env.DISCORD_CLIENT_ID,
      clientSecret: process.env.DISCORD_CLIENT_SECRET,
    })
  )
}

// ── Account lockout constants ───────────────────────────────────────────────
const MAX_FAILED_ATTEMPTS = 5
const LOCKOUT_DURATION_MS = 15 * 60 * 1000 // 15 minutes

// ── NextAuth config ─────────────────────────────────────────────────────────
export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(db),
  session: { strategy: "jwt" },
  providers: [
    ...oauthProviders,
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials)
        if (!parsed.success) return null

        const user = await db.user.findUnique({
          where: { email: parsed.data.email },
          include: { twoFactorAuth: { select: { enabled: true } } },
        })

        if (!user || !user.hashedPassword) return null

        // ── Account lockout check ─────────────────────────────────────────
        if (user.lockedUntil && user.lockedUntil > new Date()) {
          const minutesLeft = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 60_000)
          // Record failed login attempt
          await db.loginHistory.create({
            data: {
              userId: user.id,
              success: false,
              failReason: `Account locked (${minutesLeft}m remaining)`,
            },
          })
          return null
        }

        const passwordMatch = await bcrypt.compare(parsed.data.password, user.hashedPassword)

        if (!passwordMatch) {
          const attempts = user.failedLoginAttempts + 1
          const updateData: { failedLoginAttempts: number; lockedUntil?: Date } = {
            failedLoginAttempts: attempts,
          }
          let failReason = "Invalid password"

          if (attempts >= MAX_FAILED_ATTEMPTS) {
            updateData.lockedUntil = new Date(Date.now() + LOCKOUT_DURATION_MS)
            failReason = `Account locked after ${MAX_FAILED_ATTEMPTS} failed attempts`
          }

          await db.user.update({ where: { id: user.id }, data: updateData })
          await db.loginHistory.create({
            data: { userId: user.id, success: false, failReason },
          })
          return null
        }

        // ── Successful login: reset lockout ───────────────────────────────
        if (user.failedLoginAttempts > 0 || user.lockedUntil) {
          await db.user.update({
            where: { id: user.id },
            data: { failedLoginAttempts: 0, lockedUntil: null },
          })
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
          role: user.role,
          tier: user.tier,
          username: user.username,
          bio: user.bio,
          emailVerified: user.emailVerified,
          twoFactorEnabled: user.twoFactorAuth?.enabled ?? false,
          tokenVersion: user.tokenVersion,
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger, session, account }) {
      if (user) {
        token.id = user.id as string
        token.role = (user as { role?: string }).role ?? "USER"
        token.tier = (user as { tier?: string }).tier ?? "FREE"
        token.username = (user as { username?: string | null }).username
        token.bio = (user as { bio?: string | null }).bio
        token.twoFactorEnabled = (user as { twoFactorEnabled?: boolean }).twoFactorEnabled ?? false
        token.emailVerified = (user as { emailVerified?: Date | null }).emailVerified ?? null
        token.tokenVersion = (user as { tokenVersion?: number }).tokenVersion ?? 0
      }

      // For OAuth sign-ins, the authorize function is not called, so
      // we need to fetch tokenVersion from the DB on first JWT creation.
      if (account && account.provider !== "credentials" && token.id) {
        const dbUser = await db.user.findUnique({
          where: { id: token.id as string },
          select: { tokenVersion: true, role: true, tier: true, username: true, bio: true, emailVerified: true },
        })
        if (dbUser) {
          token.tokenVersion = dbUser.tokenVersion
          token.role = dbUser.role
          token.tier = dbUser.tier
          token.username = dbUser.username
          token.bio = dbUser.bio
          token.emailVerified = dbUser.emailVerified
        }
      }

      if (trigger === "update" && session) {
        if (session.name) token.name = session.name
        if (session.image) token.picture = session.image
        if (session.username !== undefined) token.username = session.username
        if (session.bio !== undefined) token.bio = session.bio
        if (session.tier) token.tier = session.tier
      }

      return token
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string
        session.user.role = (token.role as string) ?? "USER"
        session.user.tier = (token.tier as string) ?? "FREE"
        session.user.username = token.username as string | null | undefined
        session.user.bio = token.bio as string | null | undefined
        session.user.twoFactorEnabled = token.twoFactorEnabled as boolean | undefined
        session.user.emailVerified = (token.emailVerified as Date | null | undefined) ?? null
      }
      return session
    },
    async signIn({ user, account }) {
      // Allow OAuth sign-ins unrestricted
      if (account?.provider !== "credentials") return true

      // Credentials sign-in (lockout is handled in authorize)
      if (!user) return false

      // Record successful login & send login alert (non-blocking)
      const userId = user.id as string
      try {
        await db.loginHistory.create({
          data: { userId, success: true },
        })

        // Send login alert email if user has it enabled
        const settings = await db.userSettings.findUnique({
          where: { userId },
          select: { emailNewLogin: true },
        })
        if (settings?.emailNewLogin && user.email) {
          trySendEmail(() =>
            sendNewLoginAlert(user.email!, {
              time: new Date().toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" }),
            })
          )
        }
      } catch {
        // Non-fatal — don't block sign-in
      }

      return true
    },
  },
  events: {
    async createUser({ user }) {
      // Create default settings for new users (upsert to avoid dupe from register route)
      if (user.id) {
        try {
          await db.userSettings.upsert({
            where: { userId: user.id },
            create: { userId: user.id },
            update: {},
          })
        } catch {
          // Already exists — safe to ignore
        }
      }
    },
  },
})
