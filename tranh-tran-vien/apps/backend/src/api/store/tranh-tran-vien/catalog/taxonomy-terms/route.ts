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

  if (query.taxonomy_id) {
    filters.taxonomy_id = query.taxonomy_id
  }

  if (query.q) {
    filters.name = { $ilike: `%${query.q}%` }
  }

  const service = getTaxonomyService(req.scope)
  const [taxonomy_terms, count] = await service.listAndCountTaxonomyTerms(
    filters,
    toStoreListConfig(query)
  )

  res.status(200).json({
    taxonomy_terms,
    count,
    offset: query.offset,
    limit: query.limit,
  })
}
