import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

import {
  getTaxonomyService,
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

  const service = getTaxonomyService(req.scope)
  const [taxonomies, count] = await service.listAndCountTaxonomies(
    filters,
    toStoreListConfig(query)
  )

  res.status(200).json({
    taxonomies,
    count,
    offset: query.offset,
    limit: query.limit,
  })
}
