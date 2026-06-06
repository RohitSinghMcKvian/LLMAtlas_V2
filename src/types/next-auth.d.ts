import type { DefaultSession } from "next-auth"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      role: string
      tier: string
      username?: string | null
      bio?: string | null
      twoFactorEnabled?: boolean
      emailVerified?: Date | null
    } & DefaultSession["user"]
  }
}
