import { defaultStoreProductFields } from "@medusajs/medusa/api/store/products/query-config"

export const listImageProductQueryConfig = {
  defaults: [
    ...defaultStoreProductFields,
    "+metadata",
    "*categories",
    "*collection",
    "*images.metadata",
    "*variants.calculated_price",
  ],
  isList: true,
  defaultLimit: 100,
}
