import { z } from "@medusajs/framework/zod"

const metadataSchema = z.record(z.string(), z.unknown()).nullable().optional()
const nullableString = z.string().trim().nullable().optional()
const optionalDate = z.coerce.date().nullable().optional()

const comboTierSchema = z
  .object({
    minimum_quantity: z.coerce.number().int().min(1),
    discount_type: z.enum(["percentage", "fixed", "fixed_total"]),
    discount_value: z.coerce.number().min(0),
    label: z.string().trim().optional(),
    is_featured: z.coerce.boolean().optional(),
    is_free_shipping: z.coerce.boolean().optional(),
  })
  .strict()

export const rulesListQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(200).default(50),
  offset: z.coerce.number().int().min(0).default(0),
  q: z.string().trim().optional(),
  status: z.string().trim().optional(),
  scope_type: z.string().trim().optional(),
  product_id: z.string().trim().optional(),
  category_id: z.string().trim().optional(),
  collection_id: z.string().trim().optional(),
  option_value_id: z.string().trim().optional(),
  sales_channel_id: z.string().trim().optional(),
  region_id: z.string().trim().optional(),
})

export const comboRuleBodySchema = z
  .object({
    name: z.string().trim().min(1),
    description: nullableString,
    scope_type: z
      .enum(["all", "product", "category", "collection", "option"])
      .default("collection"),
    product_id: nullableString,
    category_id: nullableString,
    collection_id: nullableString,
    option_value_id: nullableString,
    sales_channel_id: nullableString,
    region_id: nullableString,
    tiers: z.array(comboTierSchema).min(1),
    priority: z.coerce.number().int().default(0),
    is_stackable: z.coerce.boolean().default(false),
    starts_at: optionalDate,
    ends_at: optionalDate,
    status: z.enum(["draft", "active", "archived"]).default("draft"),
    metadata: metadataSchema,
  })
  .strict()

export const comboRuleUpdateBodySchema = comboRuleBodySchema.partial()

export type RulesListQuery = z.infer<typeof rulesListQuerySchema>
export type ComboRuleBody = z.infer<typeof comboRuleBodySchema>
export type ComboRuleUpdateBody = z.infer<typeof comboRuleUpdateBodySchema>
