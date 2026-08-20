// Trang route storefront render màn hình countryCode / (main) / custom wall.

import { Metadata } from "next"
import { notFound } from "next/navigation"

import { listCollections } from "@lib/data/collections"
import { addCustomWallItemsToCart } from "@lib/data/custom-wall"
import { listImageProducts } from "@lib/data/image-products"
import { getRegion } from "@lib/data/regions"
import CustomWallTemplate from "@modules/custom-wall/templates"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "Dựng tường tranh | Tranh Trần Viền",
  description: "Xếp thử tranh lục giác lên tường và thêm vào giỏ hàng.",
}

type CustomWallPageProps = {
  params: Promise<{
    countryCode: string
  }>
}

export default async function CustomWallPage(props: CustomWallPageProps) {
  const params = await props.params
  const region = await getRegion(params.countryCode)

  if (!region) {
    notFound()
  }

  const [{ response }, collectionsResponse] = await Promise.all([
    listImageProducts({
      countryCode: params.countryCode,
      queryParams: {
        limit: 100,
      },
    }),
    listCollections({ limit: "100" }, { cache: "no-store" }).catch(() => ({
      collections: [],
      count: 0,
    })),
  ])

  return (
    <CustomWallTemplate
      products={response.products}
      collections={collectionsResponse.collections}
      countryCode={params.countryCode}
      currencyCode={region.currency_code}
      addItemsToCartAction={addCustomWallItemsToCart}
    />
  )
}
