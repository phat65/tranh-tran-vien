import { z } from "@medusajs/framework/zod"

const stringOrArray = z.union([z.string(), z.array(z.string())])

export const StoreGetQuantityPricesParams = z
  .object({
    variant_id: stringOrArray,
    region_id: z.string().optional(),
    country_code: z.string().optional(),
    province: z.string().optional(),
    cart_id: z.string().optional(),
  })
  .strict()

export type StoreGetQuantityPricesParamsType = z.infer<
  typeof StoreGetQuantityPricesParams
>
