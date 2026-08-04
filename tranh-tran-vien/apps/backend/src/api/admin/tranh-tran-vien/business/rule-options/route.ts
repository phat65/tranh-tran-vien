import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

import { BRAND_MODULE } from "../../../../../modules/brand"
import BrandModuleService from "../../../../../modules/brand/service"
import { TAXONOMY_MODULE } from "../../../../../modules/taxonomy"
import TaxonomyModuleService from "../../../../../modules/taxonomy/service"

type QueryGraph = {
  graph: (input: {
    entity: string
    fields: string[]
    filters?: Record<string, unknown>
    pagination?: {
      skip?: number
      take?: number
      order?: Record<string, "ASC" | "DESC">
    }
  }) => Promise<{ data: unknown[] }>
}

type Option = {
  id: string
  label: string
  subtitle?: string
}

type ProductRecord = {
  id?: string
  title?: string
  handle?: string
  status?: string
  variants?: VariantRecord[]
}

type VariantRecord = {
  id?: string
  title?: string
  sku?: string | null
  product?: {
    title?: string
    handle?: string
  } | null
}

type CategoryRecord = {
  id?: string
  name?: string
  handle?: string
}

type CollectionRecord = {
  id?: string
  title?: string
  handle?: string
}

export async function GET(
  req: MedusaRequest,
  res: MedusaResponse
): Promise<void> {
  const [products, categories, collections, variants, brands, taxonomyTerms] =
    await Promise.all([
      getProductOptions(req.scope),
      getCategoryOptions(req.scope),
      getCollectionOptions(req.scope),
      getVariantOptions(req.scope),
      getBrandOptions(req.scope),
      getTaxonomyTermOptions(req.scope),
    ])

  res.status(200).json({
    products,
    categories,
    collections,
    variants,
    brands,
    taxonomy_terms: taxonomyTerms,
  })
}

async function getProductOptions(scope: MedusaContainer): Promise<Option[]> {
  const products = await safeGraph<ProductRecord>(scope, "product", [
    "id",
    "title",
    "handle",
    "status",
  ])

  return products.map((product) => ({
    id: product.id ?? "",
    label: product.title ?? product.handle ?? product.id ?? "",
    subtitle: [product.handle, product.status].filter(Boolean).join(" / "),
  }))
}

async function getCategoryOptions(scope: MedusaContainer): Promise<Option[]> {
  const categories = await safeGraph<CategoryRecord>(scope, "product_category", [
    "id",
    "name",
    "handle",
  ])

  return categories.map((category) => ({
    id: category.id ?? "",
    label: category.name ?? category.handle ?? category.id ?? "",
    subtitle: category.handle,
  }))
}

async function getCollectionOptions(scope: MedusaContainer): Promise<Option[]> {
  const collections = await safeGraph<CollectionRecord>(
    scope,
    "product_collection",
    ["id", "title", "handle"]
  )

  return collections.map((collection) => ({
    id: collection.id ?? "",
    label: collection.title ?? collection.handle ?? collection.id ?? "",
    subtitle: collection.handle,
  }))
}

async function getVariantOptions(scope: MedusaContainer): Promise<Option[]> {
  const products = await safeGraph<ProductRecord>(scope, "product", [
    "id",
    "title",
    "handle",
    "variants.id",
    "variants.title",
    "variants.sku",
  ])

  return products.flatMap((product) => {
    return (product.variants ?? []).map((variant) => ({
      id: variant.id ?? "",
      label: [
        product.title ?? product.handle ?? product.id,
        variant.title ?? variant.sku ?? variant.id,
      ]
        .filter(Boolean)
        .join(" / "),
      subtitle: variant.sku ?? undefined,
    }))
  })
}

async function getBrandOptions(scope: MedusaContainer): Promise<Option[]> {
  const brandService = scope.resolve<BrandModuleService>(BRAND_MODULE)
  const brands = await brandService.listBrands(
    { status: "active" },
    { take: 200, order: { sort_order: "ASC", created_at: "DESC" } }
  )

  return brands.map((brand) => ({
    id: brand.id,
    label: brand.name,
    subtitle: brand.slug,
  }))
}

async function getTaxonomyTermOptions(
  scope: MedusaContainer
): Promise<Option[]> {
  const taxonomyService = scope.resolve<TaxonomyModuleService>(TAXONOMY_MODULE)
  const [terms, taxonomies] = await Promise.all([
    taxonomyService.listTaxonomyTerms(
      { status: "active" },
      { take: 200, order: { sort_order: "ASC", created_at: "DESC" } }
    ),
    taxonomyService.listTaxonomies(
      { status: "active" },
      { take: 200, order: { sort_order: "ASC", created_at: "DESC" } }
    ),
  ])
  const taxonomyById = new Map(
    taxonomies.map((taxonomy) => [taxonomy.id, taxonomy.name])
  )

  return terms.map((term) => ({
    id: term.id,
    label: term.name,
    subtitle: taxonomyById.get(term.taxonomy_id) ?? term.taxonomy_id,
  }))
}

async function safeGraph<T>(
  scope: MedusaContainer,
  entity: string,
  fields: string[]
): Promise<T[]> {
  try {
    const query = scope.resolve<QueryGraph>(ContainerRegistrationKeys.QUERY)
    const { data } = await query.graph({
      entity,
      fields,
      pagination: {
        take: 200,
        order: { created_at: "DESC" },
      },
    })

    return data.filter(hasId) as T[]
  } catch {
    return []
  }
}

function hasId(record: unknown): boolean {
  return Boolean(
    record &&
      typeof record === "object" &&
      "id" in record &&
      typeof record.id === "string" &&
      record.id
  )
}
