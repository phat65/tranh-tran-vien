// Template ghép dữ liệu và component để dựng khu vực product actions wrapper.

import { addToCart } from "@lib/data/cart"
import { listProducts } from "@lib/data/products"
import { listQuantityPrices } from "@lib/data/quantity-prices"
import type { TtvSelectedExploreImage } from "@lib/data/ttv-explore"
import { HttpTypes } from "@medusajs/types"
import ProductActions from "@modules/products/components/product-actions"

/**
 * Fetches real time pricing for a product and renders the product actions component.
 */
export default async function ProductActionsWrapper({
  id,
  region,
  selectedExploreImage,
}: {
  id: string
  region: HttpTypes.StoreRegion
  selectedExploreImage?: TtvSelectedExploreImage | null
}) {
  const product = await listProducts({
    queryParams: {
      id: [id],
      fields:
        "*variants.calculated_price,*variants.images,*variants.options,+metadata,+tags,*categories,*collection",
    },
    regionId: region.id,
  }).then(({ response }) => response.products[0])

  if (!product) {
    return null
  }

  const quantityPrices = await listQuantityPrices({
    variantIds: (product.variants ?? []).map((variant) => variant.id),
    regionId: region.id,
  })

  return (
    <ProductActions
      product={product}
      region={region}
      quantityPrices={quantityPrices}
      addToCartAction={addToCart}
      selectedExploreImage={selectedExploreImage}
    />
  )
}
