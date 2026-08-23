import { z } from "@medusajs/framework/zod"
import { createFindParams } from "@medusajs/medusa/api/utils/validators"

const stringOrArray = z.union([z.string(), z.array(z.string())])

export const StoreGetImageProductsParams = createFindParams({
  offset: 0,
  limit: 100,
})
  .merge(
    z.object({
      region_id: z.string().optional(),
      country_code: z.string().optional(),
      province: z.string().optional(),
      cart_id: z.string().optional(),
      sales_channel_id: stringOrArray.optional(),
      q: z.string().trim().optional(),
      id: stringOrArray.optional(),
      image_id: stringOrArray.optional(),
      handle: stringOrArray.optional(),
      parent_handle: stringOrArray.optional(),
      category_id: stringOrArray.optional(),
      collection_id: stringOrArray.optional(),
    })
  )
  .strict()

export type StoreGetImageProductsParamsType = z.infer<
  typeof StoreGetImageProductsParams
>
