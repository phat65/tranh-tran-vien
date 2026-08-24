import "server-only"

import { listProducts } from "./products"

export async function getCustomHexagonPriceProduct(countryCode: string) {
  return listProducts({
    countryCode,
    queryParams: {
      handle: "custom-hexagon-poster",
      fields:
        "*variants.calculated_price,*variants.images,*variants.options,+metadata,+tags,*categories,*collection,*images",
    },
  }).then(({ response }) => response.products[0] ?? null)
}
