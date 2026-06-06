import { z } from "zod"

export const updateProfileSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(50, "Name is too long").optional(),
  username: z
    .string()
    .min(3, "Username must be at least 3 characters")
    .max(30, "Username can't exceed 30 characters")
    .regex(/^[a-zA-Z0-9_-]+$/, "Username can only contain letters, numbers, underscores, and hyphens")
    .optional()
    .or(z.literal("")),
  bio: z.string().max(160, "Bio can't exceed 160 characters").optional().or(z.literal("")),
  image: z.string().url("Invalid image URL").optional().or(z.literal("")),
})

export const updateSettingsSchema = z.object({
  theme: z.enum(["light", "dark", "system"]).optional(),
  defaultModel: z.string().optional().or(z.literal("")),
  language: z.string().length(2).optional(),
  timezone: z.string().optional(),
  emailNewLogin: z.boolean().optional(),
  emailPasswordChange: z.boolean().optional(),
  emailFeatureAnnouncements: z.boolean().optional(),
  emailWeeklyDigest: z.boolean().optional(),
})

export const createApiKeySchema = z.object({
  name: z
    .string()
    .min(1, "API key name is required")
    .max(50, "Name can't exceed 50 characters"),
})

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>
export type UpdateSettingsInput = z.infer<typeof updateSettingsSchema>
export type CreateApiKeyInput = z.infer<typeof createApiKeySchema>
