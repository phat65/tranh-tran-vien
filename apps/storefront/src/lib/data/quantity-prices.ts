"use server"

import { sdk } from "@lib/config"

import { getAuthHeaders } from "./cookies"

export type StoreQuantityPrice = {
  variant_id: string
  min_quantity: number
  max_quantity: number | null
  amount: number
  original_amount: number | null
  currency_code: string
  discount_percentage: number | null
  price_list_id: string
  price_list_title: string | null
  price_list_type: string | null
}

export async function listQuantityPrices({
  variantIds,
  regionId,
}: {
  variantIds: string[]
  regionId: string
}): Promise<StoreQuantityPrice[]> {
  if (!variantIds.length) {
    return []
  }

  const headers = await getAuthHeaders()

  return sdk.client
    .fetch<{ quantity_prices: StoreQuantityPrice[] }>(
      "/store/quantity-prices",
      {
        method: "GET",
        query: {
          variant_id: variantIds,
          region_id: regionId,
        },
        headers,
        cache: "no-store",
      }
    )
    .then(({ quantity_prices }) => quantity_prices ?? [])
}
