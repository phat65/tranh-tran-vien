// API admin xử lý dữ liệu quản trị cho tranh tran vien / business / posts.

import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

import { postBodySchema, PostBody } from "../validators"
import {
  getContentService,
  parseBusinessListQuery,
  toBusinessListConfig,
} from "../utils"

export async function GET(
  req: MedusaRequest,
  res: MedusaResponse
): Promise<void> {
  const query = parseBusinessListQuery(req.query)
  const filters: Record<string, unknown> = {}

  if (query.status) {
    filters.status = query.status
  }

  if (query.q) {
    filters.title = { $ilike: `%${query.q}%` }
  }

  const service = getContentService(req.scope)
  const [posts, count] = await service.listAndCountPosts(
    filters,
    toBusinessListConfig(query)
  )

  res.status(200).json({
    posts,
    count,
    offset: query.offset,
    limit: query.limit,
  })
}

export async function POST(
  req: MedusaRequest<PostBody>,
  res: MedusaResponse
): Promise<void> {
  const input = postBodySchema.parse(req.body)
  const service = getContentService(req.scope)
  const post = await service.createPosts(input)

  res.status(200).json({ post })
}
