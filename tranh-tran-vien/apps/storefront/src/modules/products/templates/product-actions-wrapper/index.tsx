import { listProducts } from "@lib/data/products"
import { listTtvComboRules } from "@lib/data/ttv"
import { HttpTypes } from "@medusajs/types"
import ProductActions from "@modules/products/components/product-actions"

/**
 * Fetches real time pricing for a product and renders the product actions component.
 */
export default async function ProductActionsWrapper({
  id,
  region,
}: {
  id: string
  region: HttpTypes.StoreRegion
}) {
  const product = await listProducts({
    queryParams: {
      id: [id],
      fields:
        "*variants.calculated_price,+variants.inventory_quantity,*variants.images,*variants.options,+metadata,+tags,*categories,*collection",
    },
    regionId: region.id,
  }).then(({ response }) => response.products[0])

  if (!product) {
    return null
  }

  const comboRules = await listTtvComboRules({ regionId: region.id }).then(
    (rules) => rules.filter((rule) => matchesProductComboRule(rule, product))
  )

  return (
    <ProductActions product={product} region={region} comboRules={comboRules} />
  )
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
