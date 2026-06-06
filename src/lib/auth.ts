import NextAuth from "next-auth"
import { PrismaAdapter } from "@auth/prisma-adapter"
import Google from "next-auth/providers/google"
import GitHub from "next-auth/providers/github"
import Discord from "next-auth/providers/discord"
import Credentials from "next-auth/providers/credentials"
import bcrypt from "bcryptjs"
import { db } from "@/lib/db"
import { authConfig } from "@/lib/auth.config"
import { loginSchema } from "@/lib/validations/auth"

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(db),
  session: { strategy: "jwt" },
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      allowDangerousEmailAccountLinking: true,
    }),
    GitHub({
      clientId: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
      allowDangerousEmailAccountLinking: true,
    }),
    Discord({
      clientId: process.env.DISCORD_CLIENT_ID,
      clientSecret: process.env.DISCORD_CLIENT_SECRET,
      allowDangerousEmailAccountLinking: true,
    }),
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

        const passwordMatch = await bcrypt.compare(parsed.data.password, user.hashedPassword)
        if (!passwordMatch) return null

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
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id as string
        token.role = (user as { role?: string }).role ?? "USER"
        token.tier = (user as { tier?: string }).tier ?? "FREE"
        token.username = (user as { username?: string | null }).username
        token.bio = (user as { bio?: string | null }).bio
        token.twoFactorEnabled = (user as { twoFactorEnabled?: boolean }).twoFactorEnabled ?? false
        token.emailVerified = (user as { emailVerified?: Date | null }).emailVerified ?? null
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

      // Allow credentials sign-in (email verification checked separately in UX)
      return !!user
    },
  },
  events: {
    async createUser({ user }) {
      // Create default settings for new users
      if (user.id) {
        await db.userSettings.create({
          data: { userId: user.id },
        })
      }
    },
  },
})
