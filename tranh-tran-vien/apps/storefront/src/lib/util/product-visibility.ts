import type { HttpTypes } from "@medusajs/types"

export function isTtvHiddenStorefrontProduct(
  product: HttpTypes.StoreProduct
): boolean {
  const metadata = product.metadata as Record<string, unknown> | null | undefined
  const hasTechnicalVariant = product.variants?.some(
    (variant) => variant.sku === "TTV-CUSTOM-HEXAGON-POSTER"
  )

  return Boolean(
    metadata?.hidden_from_storefront === true ||
      metadata?.hidden_from_store === true ||
      metadata?.ttv_custom_type === "hexagon_poster" ||
      hasTechnicalVariant ||
      product.handle === "custom-hexagon-poster" ||
      product.handle === "custom-wall-poster"
  )
}

export function filterTtvVisibleStorefrontProducts(
  products: HttpTypes.StoreProduct[]
): HttpTypes.StoreProduct[] {
  return products.filter((product) => !isTtvHiddenStorefrontProduct(product))
}
