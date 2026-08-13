"use server"

// Lớp truy xuất dữ liệu custom wall từ Medusa/backend cho storefront.

import { sdk } from "@lib/config"
import { revalidateTag } from "next/cache"

import { getCacheTag } from "./cookies"
import { getOrSetCart } from "./cart"

export type CustomWallCartItemInput = {
  source: "product" | "custom_wall" | "custom_hexagon_page"
  variantId: string
  quantity: number
  imageUrl?: string | null
  originalFilename?: string | null
  wallSlot?: number | null
  crop?: {
    offsetX: number
    offsetY: number
    zoom: number
    imageRatio?: number | null
  }
  displayTitle?: string | null
  productId?: string | null
  productTitle?: string | null
  customItemIndex?: number | null
}

export async function addCustomWallItemsToCart({
  countryCode,
  items,
}: {
  countryCode: string
  items: CustomWallCartItemInput[]
}) {
  const cart = await getOrSetCart(countryCode)

  if (!cart?.id) {
    throw new Error("Error retrieving or creating cart")
  }

  await sdk.client.fetch("/store/tranh-tran-vien/custom-wall/cart", {
    method: "POST",
    body: {
      cart_id: cart.id,
      items: items.map((item) => ({
        source: item.source,
        variant_id: item.variantId,
        quantity: item.quantity,
        image_url: item.imageUrl,
        original_filename: item.originalFilename,
        wall_slot: item.wallSlot,
        crop: item.crop,
        display_title: item.displayTitle,
        product_id: item.productId,
        product_title: item.productTitle,
        custom_item_index: item.customItemIndex,
      })),
    },
    cache: "no-store",
  })

  const cartCacheTag = await getCacheTag("carts")
  const fulfillmentCacheTag = await getCacheTag("fulfillment")

  if (cartCacheTag) {
    revalidateTag(cartCacheTag)
  }

  if (fulfillmentCacheTag) {
    revalidateTag(fulfillmentCacheTag)
  }
}
