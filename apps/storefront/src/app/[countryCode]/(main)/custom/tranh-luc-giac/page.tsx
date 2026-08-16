// Trang route storefront render màn hình countryCode / (main) / custom / tranh luc giac.

import { Metadata } from "next"
import { notFound } from "next/navigation"

import { addCustomWallItemsToCart } from "@lib/data/custom-wall"
import { listProducts } from "@lib/data/products"
import { getRegion } from "@lib/data/regions"
import {
  listTtvComboRules,
  retrieveTtvProductCatalogLinks,
} from "@lib/data/ttv"
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

  const product = await resolveCustomHexagonPriceProduct(params.countryCode)

  if (!product) {
    notFound()
  }

  const [rules, catalogLinks] = await Promise.all([
    listTtvComboRules({ regionId: region.id }),
    retrieveTtvProductCatalogLinks(product.id),
  ])
  const taxonomyTermIds = new Set(
    catalogLinks.product_taxonomy_terms.map((link) => link.term_id)
  )
  const comboRules = rules.filter(
    (rule) =>
      rule.scope_type === "taxonomy" &&
      Boolean(
        rule.taxonomy_term_id && taxonomyTermIds.has(rule.taxonomy_term_id)
      )
  )

  return (
    <HexagonCustomTemplate
      product={product}
      countryCode={params.countryCode}
      comboRules={comboRules}
      displayDescription="Tải ảnh riêng và tạo tranh lục giác custom. Giá và combo được tính theo dòng tranh lục giác."
      displayTitle="Custom Hexagon Poster"
      addItemsToCartAction={addCustomWallItemsToCart}
    />
  )
}

async function resolveCustomHexagonPriceProduct(countryCode: string) {
  const customProduct = await listProducts({
    countryCode,
    queryParams: {
      handle: "custom-hexagon-poster",
      fields:
        "*variants.calculated_price,*variants.images,*variants.options,+metadata,+tags,*categories,*collection,*images",
    },
  }).then(({ response }) => response.products[0])

  if (customProduct) {
    return customProduct
  }

  return null
}
