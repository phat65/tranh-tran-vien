import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import {
  ContainerRegistrationKeys,
  MedusaError,
  QueryContext,
} from "@medusajs/framework/utils"
import { wrapProductsWithTaxPrices } from "@medusajs/medusa/api/store/products/helpers"

import {
  IMAGE_PRODUCT_ID_PREFIX,
  ImageProduct,
  ImageProductSource,
  projectImageProducts,
} from "../../../lib/image-products"
import { getTaxonomyService } from "../tranh-tran-vien/catalog/utils"
import type { StoreGetImageProductsParamsType } from "./validators"

type ProductTaxonomyTermRecord = {
  product_id: string
  term_id: string
}

export async function GET(
  req: MedusaRequest,
  res: MedusaResponse
): Promise<void> {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const params = req.validatedQuery as StoreGetImageProductsParamsType
  const filters = { ...req.filterableFields } as Record<string, any>
  const requestedIds = toArray(params.id)
  const requestedVirtualIds = requestedIds.filter((id) =>
    id.startsWith(IMAGE_PRODUCT_ID_PREFIX)
  )
  const requestedParentIds = requestedIds.filter(
    (id) => !id.startsWith(IMAGE_PRODUCT_ID_PREFIX)
  )

  delete filters.q
  delete filters.handle
  delete filters.parent_handle
  delete filters.image_id
  delete filters.taxonomy_term_id
  delete filters.offset
  delete filters.limit
  delete filters.order

  if (requestedVirtualIds.length && !requestedParentIds.length) {
    delete filters.id
  } else if (requestedParentIds.length) {
    filters.id = requestedParentIds
  }

  const parentHandles = toArray(params.parent_handle)

  if (parentHandles.length) {
    filters.handle = parentHandles
  }

  const taxonomyProductIds = await getTaxonomyProductIds(
    req,
    toArray(params.taxonomy_term_id)
  )

  if (taxonomyProductIds) {
    const currentIds = toArray(filters.id)
    filters.id = currentIds.length
      ? currentIds.filter((id) => taxonomyProductIds.includes(id))
      : taxonomyProductIds
  }

  if (Array.isArray(filters.id) && !filters.id.length) {
    res.status(200).json({
      products: [],
      count: 0,
      offset: params.offset ?? 0,
      limit: params.limit ?? 100,
      parent_count: 0,
    })
    return
  }

  const context: Record<string, unknown> = {}

  if (req.pricingContext) {
    context.variants = {
      calculated_price: QueryContext(req.pricingContext),
    }
  }

  const { data } = await query.graph(
    {
      entity: "product",
      fields: req.queryConfig.fields,
      filters,
      pagination: { skip: 0, take: 10000 },
      context,
    },
    {
      cache: { enable: true },
      locale: req.locale,
    }
  )
  const parents = data as ImageProductSource[]

  await wrapProductsWithTaxPrices(req as any, parents as any[])

  let products = projectImageProducts(parents)
  products = filterImageProducts(products, params, requestedVirtualIds)
  products = sortImageProducts(products, params.order)

  const offset = Math.max(params.offset ?? 0, 0)
  const limit = Math.min(Math.max(params.limit ?? 100, 1), 500)
  const count = products.length

  if (toArray(params.handle).length && count > 1) {
    const duplicateHandles = findDuplicateHandles(products)

    if (duplicateHandles.length) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `Duplicate image product handle: ${duplicateHandles.join(", ")}`
      )
    }
  }

  res.status(200).json({
    products: products.slice(offset, offset + limit),
    count,
    offset,
    limit,
    parent_count: parents.length,
  })
}

async function getTaxonomyProductIds(
  req: MedusaRequest,
  taxonomyTermIds: string[]
): Promise<string[] | null> {
  if (!taxonomyTermIds.length) {
    return null
  }

  const taxonomyService = getTaxonomyService(req.scope)
  const links = (await taxonomyService.listProductTaxonomyTerms(
    { term_id: taxonomyTermIds },
    { take: 10000 }
  )) as ProductTaxonomyTermRecord[]

  return Array.from(new Set(links.map((link) => link.product_id)))
}

function filterImageProducts(
  products: ImageProduct[],
  params: StoreGetImageProductsParamsType,
  requestedVirtualIds: string[]
) {
  const requestedHandles = new Set(toArray(params.handle))
  const requestedImageIds = new Set([
    ...toArray(params.image_id),
    ...requestedVirtualIds.map((id) => id.slice(IMAGE_PRODUCT_ID_PREFIX.length)),
  ])
  const search = params.q?.trim().toLocaleLowerCase() ?? ""

  return products.filter((product) => {
    if (requestedHandles.size && !requestedHandles.has(product.handle)) {
      return false
    }

    if (requestedImageIds.size && !requestedImageIds.has(product.image_id)) {
      return false
    }

    if (!search) {
      return true
    }

    return [
      product.title,
      product.handle,
      product.image_code,
      product.parent_product_handle,
      product.metadata?.ttv_parent_product_handle,
    ].some((value) =>
      typeof value === "string"
        ? value.toLocaleLowerCase().includes(search)
        : false
    )
  })
}

function sortImageProducts(
  products: ImageProduct[],
  order: string | undefined
) {
  const descending = order?.startsWith("-") ?? false
  const field = order?.replace(/^-/, "") || "created_at"
  const direction = descending ? -1 : 1

  return [...products].sort((first, second) => {
    if (field === "title") {
      return first.title.localeCompare(second.title) * direction
    }

    const firstTime = new Date(first[field] ?? 0).getTime()
    const secondTime = new Date(second[field] ?? 0).getTime()

    return (firstTime - secondTime) * direction
  })
}

function findDuplicateHandles(products: ImageProduct[]) {
  const seen = new Set<string>()
  const duplicates = new Set<string>()

  products.forEach((product) => {
    if (seen.has(product.handle)) {
      duplicates.add(product.handle)
    }
    seen.add(product.handle)
  })

  return Array.from(duplicates)
}

function toArray(value: string | string[] | undefined | unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((entry): entry is string => typeof entry === "string")
  }

  return typeof value === "string" && value ? [value] : []
}
