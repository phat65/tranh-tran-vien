import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

import {
  brandBodySchema,
  BrandBody,
} from "../validators"
import { getBrandService, parseListQuery, toListConfig } from "../utils"

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

  const service = getBrandService(req.scope)
  const [brands, count] = await service.listAndCountBrands(
    filters,
    toListConfig(query)
  )

  res.status(200).json({
    brands,
    count,
    offset: query.offset,
    limit: query.limit,
  })
}

export async function POST(
  req: MedusaRequest<BrandBody>,
  res: MedusaResponse
): Promise<void> {
  const input = brandBodySchema.parse(req.body)
  const service = getBrandService(req.scope)
  const brand = await service.createBrands(input)

  res.status(200).json({ brand })
}
