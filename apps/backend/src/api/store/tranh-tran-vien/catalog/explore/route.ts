// Explore is a small storefront adapter over native Medusa categories and collections.

import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

type ProductLink = {
  id: string
}

type CategoryRecord = {
  id: string
  name: string
  handle: string
  description?: string | null
  rank?: number | null
  is_active?: boolean
  is_internal?: boolean
  parent_category_id?: string | null
  metadata?: Record<string, unknown> | null
  products?: ProductLink[]
}

type CollectionRecord = {
  id: string
  title: string
  handle: string
  metadata?: Record<string, unknown> | null
  products?: ProductLink[]
}

type ExploreTerm = {
  id: string
  taxonomy_id: string
  name: string
  slug: string
  image_url: string | null
  description: string | null
  sort_order: number
  seo_title: string | null
  seo_description: string | null
  metadata: Record<string, unknown>
  product_ids: string[]
}

const standaloneNavigation = {
  mode: "standalone" as const,
  auto_assign_target: false,
  target: null,
}

export async function GET(
  req: MedusaRequest,
  res: MedusaResponse
): Promise<void> {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const [categoryResult, collectionResult] = await Promise.all([
    query.graph({
      entity: "product_category",
      fields: [
        "id",
        "name",
        "handle",
        "description",
        "rank",
        "is_active",
        "is_internal",
        "parent_category_id",
        "metadata",
        "products.id",
      ],
      pagination: { take: 500, order: { rank: "ASC" } },
    }),
    query.graph({
      entity: "product_collection",
      fields: ["id", "title", "handle", "metadata", "products.id"],
      pagination: { take: 500, order: { title: "ASC" } },
    }),
  ])

  const categories = (categoryResult.data as CategoryRecord[])
    .filter(
      (category) =>
        category.is_active !== false &&
        category.is_internal !== true &&
        !category.parent_category_id
    )
    .map((category, index) => toCategoryTerm(category, index))
  const collections = (collectionResult.data as CollectionRecord[]).map(
    (collection, index) => toCollectionTerm(collection, index)
  )
  const groups = [
    {
      code: "medusa_categories",
      label: "Danh muc",
      slug: "categories",
      sort_order: 10,
      taxonomy_id: null,
      metadata: null,
      navigation: standaloneNavigation,
      terms: categories,
    },
    {
      code: "medusa_collections",
      label: "Bo suu tap",
      slug: "collections",
      sort_order: 20,
      taxonomy_id: null,
      metadata: null,
      navigation: standaloneNavigation,
      terms: collections,
    },
  ]
  const headingSlug = getQueryString(req.query.heading_slug)
  const itemSlug = getQueryString(req.query.item_slug)

  if (headingSlug && itemSlug) {
    const group = groups.find((candidate) => candidate.slug === headingSlug)
    const item = group?.terms.find((term) => term.slug === itemSlug)

    res.status(200).json({
      groups,
      group: group && item ? group : null,
      item: item ?? null,
      product_ids: item?.product_ids ?? [],
    })
    return
  }

  res.status(200).json({ groups })
}

function toCategoryTerm(
  category: CategoryRecord,
  index: number
): ExploreTerm {
  const metadata = category.metadata ?? {}

  return {
    id: category.id,
    taxonomy_id: "medusa_categories",
    name: category.name,
    slug: category.handle,
    image_url: getMetadataString(metadata, "image_url"),
    description: category.description ?? null,
    sort_order: category.rank ?? index,
    seo_title: getMetadataString(metadata, "seo_title"),
    seo_description: getMetadataString(metadata, "seo_description"),
    metadata: {
      ...metadata,
      entity_type: "category",
      href: `/categories/${category.handle}`,
    },
    product_ids: uniqueProductIds(category.products),
  }
}

function toCollectionTerm(
  collection: CollectionRecord,
  index: number
): ExploreTerm {
  const metadata = collection.metadata ?? {}

  return {
    id: collection.id,
    taxonomy_id: "medusa_collections",
    name: collection.title,
    slug: collection.handle,
    image_url: getMetadataString(metadata, "image_url"),
    description: getMetadataString(metadata, "description"),
    sort_order: index,
    seo_title: getMetadataString(metadata, "seo_title"),
    seo_description: getMetadataString(metadata, "seo_description"),
    metadata: {
      ...metadata,
      entity_type: "collection",
      href: `/collections/${collection.handle}`,
    },
    product_ids: uniqueProductIds(collection.products),
  }
}

function uniqueProductIds(products: ProductLink[] | undefined) {
  return Array.from(
    new Set((products ?? []).map((product) => product.id).filter(Boolean))
  )
}

function getMetadataString(
  metadata: Record<string, unknown>,
  key: string
) {
  const value = metadata[key]

  return typeof value === "string" && value.trim() ? value.trim() : null
}

function getQueryString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined
}
