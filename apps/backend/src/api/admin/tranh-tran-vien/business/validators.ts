// Validator kiểm tra input request cho nhóm API admin / tranh tran vien / business.

import { z } from "@medusajs/framework/zod"

const metadataSchema = z.record(z.string(), z.unknown()).nullable().optional()
const jsonContentSchema = z
  .record(z.string(), z.unknown())
  .nullable()
  .optional()

const nullableString = z.string().trim().nullable().optional()
const optionalDate = z.coerce.date().nullable().optional()

export const businessListQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(200).default(50),
  offset: z.coerce.number().int().min(0).default(0),
  q: z.string().trim().optional(),
  status: z.string().trim().optional(),
  product_id: z.string().trim().optional(),
  category_id: z.string().trim().optional(),
  collection_id: z.string().trim().optional(),
  brand_id: z.string().trim().optional(),
  taxonomy_term_id: z.string().trim().optional(),
  customer_id: z.string().trim().optional(),
  order_id: z.string().trim().optional(),
})

export const feedbackBodySchema = z
  .object({
    customer_id: nullableString,
    customer_name: z.string().trim().min(1),
    order_id: nullableString,
    product_id: nullableString,
    rating: z.coerce.number().int().min(1).max(5).default(5),
    content: nullableString,
    status: z
      .enum(["draft", "pending_review", "approved", "rejected", "archived"])
      .default("pending_review"),
    published_at: optionalDate,
    sort_order: z.coerce.number().int().default(0),
    metadata: metadataSchema,
  })
  .strict()

export const feedbackUpdateBodySchema = feedbackBodySchema.partial()

export const postBodySchema = z
  .object({
    title: z.string().trim().min(1),
    slug: z.string().trim().min(1),
    excerpt: nullableString,
    content_json: jsonContentSchema,
    cover_image_url: nullableString,
    author_id: nullableString,
    category_id: nullableString,
    status: z.enum(["draft", "published", "archived"]).default("draft"),
    published_at: optionalDate,
    seo_title: nullableString,
    seo_description: nullableString,
    metadata: metadataSchema,
  })
  .strict()

export const postUpdateBodySchema = postBodySchema.partial()

export const pageBodySchema = z
  .object({
    title: z.string().trim().min(1),
    slug: z.string().trim().min(1),
    content_json: jsonContentSchema,
    page_type: z.string().trim().min(1).default("static"),
    status: z.enum(["draft", "published", "archived"]).default("draft"),
    published_at: optionalDate,
    seo_title: nullableString,
    seo_description: nullableString,
    metadata: metadataSchema,
  })
  .strict()

export const pageUpdateBodySchema = pageBodySchema.partial()

export type BusinessListQuery = z.infer<typeof businessListQuerySchema>
export type FeedbackBody = z.infer<typeof feedbackBodySchema>
export type FeedbackUpdateBody = z.infer<typeof feedbackUpdateBodySchema>
export type PostBody = z.infer<typeof postBodySchema>
export type PostUpdateBody = z.infer<typeof postUpdateBodySchema>
export type PageBody = z.infer<typeof pageBodySchema>
export type PageUpdateBody = z.infer<typeof pageUpdateBodySchema>
