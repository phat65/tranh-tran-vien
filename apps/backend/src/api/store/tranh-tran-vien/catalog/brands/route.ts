// API storefront cung cấp dữ liệu public cho tranh tran vien / catalog / brands.

import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

import {
  getBrandService,
  parseStoreCatalogListQuery,
  toStoreListConfig,
} from "../utils"

export async function GET(
  req: MedusaRequest,
  res: MedusaResponse
): Promise<void> {
  const query = parseStoreCatalogListQuery(req.query)
  const filters: Record<string, unknown> = { status: "active" }

  if (query.q) {
    filters.name = { $ilike: `%${query.q}%` }
  }

  const service = getBrandService(req.scope)
  const [brands, count] = await service.listAndCountBrands(
    filters,
    toStoreListConfig(query)
  )

  res.status(200).json({
    brands,
    count,
    offset: query.offset,
    limit: query.limit,
  })
}
