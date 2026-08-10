// Validator kiểm tra input request cho nhóm API admin / tranh tran vien / catalog.

import { z } from "@medusajs/framework/zod"

const metadataSchema = z.record(z.string(), z.unknown()).nullable().optional()
const jsonObjectSchema = z.unknown().transform((value): Record<string, unknown> => {
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
  taxonomy_id: z.string().trim().optional(),
  parent_id: z.string().trim().optional(),
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

export const taxonomyBodySchema = z
  .object({
    code: z.string().trim().min(1),
    name: z.string().trim().min(1),
    description: z.string().trim().nullable().optional(),
    status: z.enum(["draft", "active", "archived"]).default("draft"),
    sort_order: z.coerce.number().int().default(0),
    metadata: metadataSchema,
  })
  .strict()

export const taxonomyUpdateBodySchema = taxonomyBodySchema.partial()

export const taxonomyTermBodySchema = z
  .object({
    taxonomy_id: z.string().trim().min(1),
    parent_id: z.string().trim().nullable().optional(),
    name: z.string().trim().min(1),
    slug: z.string().trim().min(1),
    image_url: z.string().trim().nullable().optional(),
    description: z.string().trim().nullable().optional(),
    status: z.enum(["draft", "active", "archived"]).default("draft"),
    sort_order: z.coerce.number().int().default(0),
    seo_title: z.string().trim().nullable().optional(),
    seo_description: z.string().trim().nullable().optional(),
    metadata: metadataSchema,
  })
  .strict()

export const taxonomyTermUpdateBodySchema = taxonomyTermBodySchema.partial()

export const productCatalogLinksBodySchema = z
  .object({
    brand_ids: z.array(z.string().trim().min(1)).default([]),
    primary_brand_id: z.string().trim().nullable().optional(),
    taxonomy_term_ids: z.array(z.string().trim().min(1)).default([]),
  })
  .strict()

export const navigationMenuBodySchema = z
  .object({
    code: z.string().trim().min(1),
    name: z.string().trim().min(1),
    status: z.enum(["draft", "active", "archived"]).default("draft"),
    metadata: metadataSchema,
  })
  .strict()

export const navigationMenuUpdateBodySchema = navigationMenuBodySchema.partial()

export const navigationItemBodySchema = z
  .object({
    menu_id: z.string().trim().min(1),
    parent_id: z.string().trim().nullable().optional(),
    label: z.string().trim().min(1),
    link_type: z
      .enum(["url", "product", "category", "brand", "taxonomy", "page", "post"])
      .default("url"),
    entity_id: z.string().trim().nullable().optional(),
    url: z.string().trim().nullable().optional(),
    image_url: z.string().trim().nullable().optional(),
    sort_order: z.coerce.number().int().default(0),
    visibility: z.enum(["visible", "hidden"]).default("visible"),
    metadata: metadataSchema,
  })
  .strict()

export const navigationItemUpdateBodySchema = navigationItemBodySchema.partial()

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
export type TaxonomyBody = z.infer<typeof taxonomyBodySchema>
export type TaxonomyUpdateBody = z.infer<typeof taxonomyUpdateBodySchema>
export type TaxonomyTermBody = z.infer<typeof taxonomyTermBodySchema>
export type TaxonomyTermUpdateBody = z.infer<typeof taxonomyTermUpdateBodySchema>
export type ProductCatalogLinksBody = z.infer<
  typeof productCatalogLinksBodySchema
>
export type NavigationMenuBody = z.infer<typeof navigationMenuBodySchema>
export type NavigationMenuUpdateBody = z.infer<
  typeof navigationMenuUpdateBodySchema
>
export type NavigationItemBody = z.infer<typeof navigationItemBodySchema>
export type NavigationItemUpdateBody = z.infer<
  typeof navigationItemUpdateBodySchema
>
export type SiteSettingBody = z.infer<typeof siteSettingBodySchema>
export type SiteSettingUpdateBody = z.infer<typeof siteSettingUpdateBodySchema>
