// Validators for the remaining custom catalog extensions.

import { z } from "@medusajs/framework/zod"

const metadataSchema = z.record(z.string(), z.unknown()).nullable().optional()
const jsonObjectSchema = z
  .unknown()
  .transform((value): Record<string, unknown> => {
    if (value && typeof value === "object" && !Array.isArray(value)) {
      return value as Record<string, unknown>
    }

    return { value }
  })

export const listQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(200).default(50),
  offset: z.coerce.number().int().min(0).default(0),
  q: z.string().trim().optional(),
  status: z.enum(["draft", "active", "archived"]).optional(),
  is_public: z.coerce.boolean().optional(),
})

export const brandBodySchema = z
  .object({
    name: z.string().trim().min(1),
    slug: z.string().trim().min(1),
    parent_id: z.string().trim().nullable().optional(),
    logo_url: z.string().trim().nullable().optional(),
    description: z.string().trim().nullable().optional(),
    status: z.enum(["draft", "active", "archived"]).default("draft"),
    sort_order: z.coerce.number().int().default(0),
    seo_title: z.string().trim().nullable().optional(),
    seo_description: z.string().trim().nullable().optional(),
    metadata: metadataSchema,
  })
  .strict()

export const brandUpdateBodySchema = brandBodySchema.partial()

export const siteSettingBodySchema = z
  .object({
    key: z.string().trim().min(1),
    value_json: jsonObjectSchema,
    is_public: z.coerce.boolean().default(false),
    group: z.string().trim().nullable().optional(),
    description: z.string().trim().nullable().optional(),
  })
  .strict()

export const siteSettingUpdateBodySchema = siteSettingBodySchema.partial()

export type ListQuery = z.infer<typeof listQuerySchema>
export type BrandBody = z.infer<typeof brandBodySchema>
export type BrandUpdateBody = z.infer<typeof brandUpdateBodySchema>
export type SiteSettingBody = z.infer<typeof siteSettingBodySchema>
export type SiteSettingUpdateBody = z.infer<typeof siteSettingUpdateBodySchema>
