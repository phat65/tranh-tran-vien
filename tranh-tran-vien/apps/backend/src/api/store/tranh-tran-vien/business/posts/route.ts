import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

import {
  getContentService,
  parseStoreBusinessListQuery,
  toStoreBusinessListConfig,
} from "../utils"

export async function GET(
  req: MedusaRequest,
  res: MedusaResponse
): Promise<void> {
  const query = parseStoreBusinessListQuery(req.query)
  const filters: Record<string, unknown> = { status: "published" }

  if (query.q) {
    filters.title = { $ilike: `%${query.q}%` }
  }

  const service = getContentService(req.scope)
  const [posts, count] = await service.listAndCountPosts(
    filters,
    toStoreBusinessListConfig(query)
  )

  res.status(200).json({
    posts,
    count,
    offset: query.offset,
    limit: query.limit,
  })
}
