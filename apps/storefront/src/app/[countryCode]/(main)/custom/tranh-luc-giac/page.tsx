// Trang route storefront render màn hình countryCode / (main) / custom / tranh luc giac.

import { Metadata } from "next"
import { notFound } from "next/navigation"

import { getCustomHexagonPriceProduct } from "@lib/data/custom-products"
import { addCustomWallItemsToCart } from "@lib/data/custom-wall"
import { listQuantityPrices } from "@lib/data/quantity-prices"
import { getRegion } from "@lib/data/regions"
import HexagonCustomTemplate from "@modules/custom/templates/hexagon"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "Custom tranh lục giác | Tranh Trần Viền",
  description: "Tải ảnh riêng và crop preview cho tranh lục giác custom.",
}

type CustomHexagonPageProps = {
  params: Promise<{
    countryCode: string
  }>
}

export default async function CustomHexagonPage(props: CustomHexagonPageProps) {
  const params = await props.params
  const region = await getRegion(params.countryCode)

  if (!region) {
    notFound()
  }

  const product = await getCustomHexagonPriceProduct(params.countryCode)

  if (!product) {
    notFound()
  }

  const quantityPrices = await listQuantityPrices({
    variantIds: (product.variants ?? []).map((variant) => variant.id),
    regionId: region.id,
  })

  return (
    <HexagonCustomTemplate
      product={product}
      countryCode={params.countryCode}
      displayDescription="Tải ảnh riêng và tạo tranh lục giác custom. Giá được lấy trực tiếp từ sản phẩm Medusa."
      displayTitle="Custom Hexagon Poster"
      currencyCode={region.currency_code}
      quantityPrices={quantityPrices}
      addItemsToCartAction={addCustomWallItemsToCart}
    />
  )
}
