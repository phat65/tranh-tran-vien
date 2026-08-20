// Template ghép dữ liệu và component để dựng khu vực product actions wrapper.

import { addToCart } from "@lib/data/cart"
import { listProducts } from "@lib/data/products"
import {
  listTtvComboRules,
  retrieveTtvProductCatalogLinks,
} from "@lib/data/ttv"
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

  const [rules, catalogLinks] = await Promise.all([
    listTtvComboRules({ regionId: region.id }),
    retrieveTtvProductCatalogLinks(product.id),
  ])
  const taxonomyTermIds = new Set(
    catalogLinks.product_taxonomy_terms.map((link) => link.term_id)
  )
  const categoryIds = new Set((product.categories ?? []).map(({ id }) => id))
  const comboRules = rules.filter((rule) => {
    if (rule.scope_type === "category") {
      return Boolean(rule.category_id && categoryIds.has(rule.category_id))
    }

    if (rule.scope_type === "collection") {
      return rule.collection_id === product.collection_id
    }

    if (rule.scope_type === "product") {
      return rule.product_id === product.id
    }

    if (rule.scope_type === "taxonomy") {
      return Boolean(
        rule.taxonomy_term_id && taxonomyTermIds.has(rule.taxonomy_term_id)
      )
    }

    return rule.scope_type === "all"
  })

  return (
    <ProductActions
      product={product}
      region={region}
      comboRules={comboRules}
      addToCartAction={addToCart}
      selectedExploreImage={selectedExploreImage}
    />
  )
}
