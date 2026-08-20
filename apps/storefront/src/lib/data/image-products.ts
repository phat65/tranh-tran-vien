"use server"

import { sdk } from "@lib/config"
import { sortProducts } from "@lib/util/sort-products"
import { HttpTypes } from "@medusajs/types"
import { SortOptions } from "@modules/store/components/refinement-list/sort-products"

import { getAuthHeaders, getCacheOptions } from "./cookies"
import { getRegion, retrieveRegion } from "./regions"

export type TtvImageProduct = HttpTypes.StoreProduct & {
  parent_product_id: string
  parent_product_handle: string
  image_id: string
  image_title: string
  image_handle: string
  image_code: string
  image_url: string
  image_alt: string
  image_original_filename: string
  image_active: boolean
}

export type ImageProductListQueryParams = {
  limit?: number
  offset?: number
  q?: string
  id?: string | string[]
  image_id?: string | string[]
  handle?: string | string[]
  parent_handle?: string | string[]
  category_id?: string | string[]
  collection_id?: string | string[]
  taxonomy_term_id?: string | string[]
  order?: string
}

export async function listImageProducts({
  pageParam = 1,
  queryParams,
  countryCode,
  regionId,
}: {
  pageParam?: number
  queryParams?: ImageProductListQueryParams
  countryCode?: string
  regionId?: string
}): Promise<{
  response: { products: TtvImageProduct[]; count: number }
  nextPage: number | null
}> {
  if (!countryCode && !regionId) {
    throw new Error("Country code or region ID is required")
  }

  const region = countryCode
    ? await getRegion(countryCode)
    : await retrieveRegion(regionId!)

  if (!region) {
    return {
      response: { products: [], count: 0 },
      nextPage: null,
    }
  }

  const limit = queryParams?.limit ?? 12
  const page = Math.max(pageParam, 1)
  const offset = queryParams?.offset ?? (page - 1) * limit
  const headers = await getAuthHeaders()
  const shouldBypassCache = process.env.NODE_ENV === "development"
  const next = shouldBypassCache ? {} : await getCacheOptions("products")
  const response = await sdk.client.fetch<{
    products: TtvImageProduct[]
    count: number
  }>("/store/image-products", {
    method: "GET",
    query: {
      ...queryParams,
      limit,
      offset,
      region_id: region.id,
    },
    headers,
    ...(shouldBypassCache
      ? { cache: "no-store" as const }
      : { next, cache: "force-cache" as const }),
  })

  return {
    response,
    nextPage: response.count > offset + limit ? page + 1 : null,
  }
}

export async function listImageProductsWithSort({
  page = 1,
  queryParams,
  sortBy = "created_at",
  countryCode,
}: {
  page?: number
  queryParams?: ImageProductListQueryParams
  sortBy?: SortOptions
  countryCode: string
}) {
  const limit = queryParams?.limit ?? 12
  const { response } = await listImageProducts({
    pageParam: 1,
    queryParams: {
      ...queryParams,
      limit: 500,
      offset: 0,
    },
    countryCode,
  })
  const sortedProducts = sortProducts(response.products, sortBy) as TtvImageProduct[]
  const offset = (Math.max(page, 1) - 1) * limit

  return {
    response: {
      products: sortedProducts.slice(offset, offset + limit),
      count: response.count,
    },
    nextPage: response.count > offset + limit ? page + 1 : null,
  }
}

export async function retrieveImageProduct({
  handle,
  countryCode,
}: {
  handle: string
  countryCode: string
}) {
  return listImageProducts({
    countryCode,
    queryParams: { handle, limit: 2 },
  }).then(({ response }) => response.products[0] ?? null)
}
