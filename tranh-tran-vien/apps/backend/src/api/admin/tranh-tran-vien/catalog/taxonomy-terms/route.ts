import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

import {
  taxonomyTermBodySchema,
  TaxonomyTermBody,
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

  if (query.taxonomy_id) {
    filters.taxonomy_id = query.taxonomy_id
  }

  if (query.parent_id) {
    filters.parent_id = query.parent_id
  }

  if (query.q) {
    filters.name = { $ilike: `%${query.q}%` }
  }

  const service = getTaxonomyService(req.scope)
  const [taxonomy_terms, count] = await service.listAndCountTaxonomyTerms(
    filters,
    toListConfig(query)
  )

  res.status(200).json({
    taxonomy_terms,
    count,
    offset: query.offset,
    limit: query.limit,
  })
}

export async function POST(
  req: MedusaRequest<TaxonomyTermBody>,
  res: MedusaResponse
): Promise<void> {
  const input = taxonomyTermBodySchema.parse(req.body)
  const service = getTaxonomyService(req.scope)
  await service.retrieveTaxonomy(input.taxonomy_id)
  const taxonomy_term = await service.createTaxonomyTerms(input)

  res.status(200).json({ taxonomy_term })
}
