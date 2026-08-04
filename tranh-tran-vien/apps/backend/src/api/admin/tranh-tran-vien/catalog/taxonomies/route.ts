import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

import {
  taxonomyBodySchema,
  TaxonomyBody,
} from "../validators"
import { getTaxonomyService, parseListQuery, toListConfig } from "../utils"

export async function GET(
  req: MedusaRequest,
  res: MedusaResponse
): Promise<void> {
  const query = parseListQuery(req.query)
  const filters: Record<string, unknown> = {}

  if (query.status) {
    filters.status = query.status
  }

  if (query.q) {
    filters.name = { $ilike: `%${query.q}%` }
  }

  const service = getTaxonomyService(req.scope)
  const [taxonomies, count] = await service.listAndCountTaxonomies(
    filters,
    toListConfig(query)
  )

  res.status(200).json({
    taxonomies,
    count,
    offset: query.offset,
    limit: query.limit,
  })
}

export async function POST(
  req: MedusaRequest<TaxonomyBody>,
  res: MedusaResponse
): Promise<void> {
  const input = taxonomyBodySchema.parse(req.body)
  const service = getTaxonomyService(req.scope)
  const taxonomy = await service.createTaxonomies(input)

  res.status(200).json({ taxonomy })
}
