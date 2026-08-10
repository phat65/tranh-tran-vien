import { Metadata } from "next"
import { notFound } from "next/navigation"

import { listCategories } from "@lib/data/categories"
import { listProducts } from "@lib/data/products"
import { getRegion } from "@lib/data/regions"
import { listTtvComboRules } from "@lib/data/ttv"
import { HttpTypes } from "@medusajs/types"
import HexagonCustomTemplate from "@modules/custom/templates/hexagon"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "Custom tranh luc giac | Tranh Tran Vien",
  description: "Tai anh rieng va crop preview cho tranh luc giac custom.",
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

  const comboRules = await listTtvComboRules({ regionId: region.id }).then(
    (rules) => rules.filter((rule) => matchesProductComboRule(rule, product))
  )

  return (
    <HexagonCustomTemplate
      product={product}
      countryCode={params.countryCode}
      comboRules={comboRules}
      displayDescription="Tai anh rieng va tao tranh luc giac custom. Gia va combo duoc tinh theo dong tranh luc giac."
      displayTitle="Custom Hexagon Poster"
    />
  )
}

async function resolveCustomHexagonPriceProduct(countryCode: string) {
  const customProduct = await listProducts({
    countryCode,
    queryParams: {
      handle: "custom-hexagon-poster",
      fields:
        "*variants.calculated_price,+variants.inventory_quantity,*variants.images,*variants.options,+metadata,+tags,*categories,*collection,*images",
    },
  }).then(({ response }) => response.products[0])

  if (customProduct) {
    return customProduct
  }

  const categories = await listCategories(
    {
      limit: 100,
      handle: "tranh-luc-giac-hop-kim",
    },
    { cache: "no-store" }
  ).catch(() => [])
  const hexagonCategory =
    categories[0] ??
    (await listCategories(
      {
        limit: 100,
        handle: "tranh-luc-giac",
      },
      { cache: "no-store" }
    )
      .then((fallbackCategories) => fallbackCategories[0])
      .catch(() => null))

  if (!hexagonCategory?.id) {
    return null
  }

  return listProducts({
    countryCode,
    queryParams: {
      category_id: [hexagonCategory.id],
      limit: 20,
      fields:
        "*variants.calculated_price,+variants.inventory_quantity,*variants.images,*variants.options,+metadata,+tags,*categories,*collection,*images",
    },
  }).then(({ response }) => {
    return (
      response.products.find((product) => {
        const metadata = product.metadata as Record<string, unknown> | null

        return metadata?.ttv_custom_type !== "hexagon_poster"
      }) ?? response.products[0]
    )
  })
}

function matchesProductComboRule(
  rule: Awaited<ReturnType<typeof listTtvComboRules>>[number],
  product: HttpTypes.StoreProduct
): boolean {
  if (rule.scope_type === "all") {
    return true
  }

  if (rule.scope_type === "product") {
    return rule.product_id === product.id
  }

  if (rule.scope_type === "collection") {
    return Boolean(
      rule.collection_id && rule.collection_id === getProductCollectionId(product)
    )
  }

  if (rule.scope_type === "category") {
    const categories = (product as { categories?: { id?: string }[] }).categories

    return Boolean(
      rule.category_id &&
        categories?.some((category) => category.id === rule.category_id)
    )
  }

  const productOptions = (product.options ?? []).flatMap((option) => {
    return (
      (option as { values?: { id?: string }[] }).values?.map(
        (value) => value.id
      ) ?? []
    )
  })
  const variantOptions =
    product.variants?.flatMap((variant) => {
      return variant.options?.map((option) => option.id) ?? []
    }) ?? []

  return Boolean(
    rule.option_value_id &&
      [...productOptions, ...variantOptions].includes(rule.option_value_id)
  )
}

function getProductCollectionId(product: HttpTypes.StoreProduct): string | null {
  const extendedProduct = product as {
    collection_id?: string | null
    collection?: { id?: string | null } | null
  }

  return (
    extendedProduct.collection_id ?? extendedProduct.collection?.id ?? null
  )
}
