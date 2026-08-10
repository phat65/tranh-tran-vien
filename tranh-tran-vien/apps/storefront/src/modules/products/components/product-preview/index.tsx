// Component giao diện xử lý phần product preview trong storefront.

import { Text } from "@modules/common/components/ui"
import { getProductPrice } from "@lib/util/get-product-price"
import { HttpTypes } from "@medusajs/types"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import Thumbnail from "../thumbnail"
import PreviewPrice from "./price"

export default async function ProductPreview({
  product,
  isFeatured,
  region: _region,
}: {
  product: HttpTypes.StoreProduct
  isFeatured?: boolean
  region: HttpTypes.StoreRegion
}) {
  // const pricedProduct = await listProducts({
  //   regionId: region.id,
  //   queryParams: { id: [product.id!] },
  // }).then(({ response }) => response.products[0])

  // if (!pricedProduct) {
  //   return null
  // }

  const { cheapestPrice } = getProductPrice({
    product,
  })
  const isSoldOut = !product.variants?.some((variant) => {
    if (!variant.manage_inventory || variant.allow_backorder) {
      return true
    }

    return Number(variant.inventory_quantity ?? 0) > 0
  })

  return (
    <LocalizedClientLink href={`/products/${product.handle}`} className="group">
      <div
        className="relative overflow-hidden rounded-lg border-2 border-[#ffdc36] bg-white p-3 transition-shadow duration-150 group-hover:shadow-[0_18px_45px_rgba(15,23,42,0.12)]"
        data-testid="product-wrapper"
      >
        {isSoldOut && (
          <span className="absolute right-3 top-3 z-10 rounded-full bg-black px-3 py-1 text-xs font-semibold text-[#ffdc36]">
            Sold out
          </span>
        )}
        <Thumbnail
          thumbnail={product.thumbnail}
          images={product.images}
          size="full"
          isFeatured={isFeatured}
          className="rounded-lg"
        />
        <div className="mt-3 grid gap-3">
          <div className="grid grid-cols-[1fr_auto] items-start gap-3">
            <Text
              className="line-clamp-2 text-sm font-semibold leading-5 text-ui-fg-base"
              data-testid="product-title"
            >
              {product.title}
            </Text>
            <div className="flex shrink-0 items-center gap-x-2 text-sm font-semibold text-ui-fg-base">
              {cheapestPrice && <PreviewPrice price={cheapestPrice} />}
            </div>
          </div>
          <span className="flex h-10 items-center justify-center rounded-md bg-[#ffe476] px-4 text-sm font-semibold text-black transition-colors group-hover:bg-[#ffdc36]">
            View product
          </span>
        </div>
      </div>
    </LocalizedClientLink>
  )
}
