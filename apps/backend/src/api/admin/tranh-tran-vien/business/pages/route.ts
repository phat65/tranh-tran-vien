// API admin xử lý dữ liệu quản trị cho tranh tran vien / business / pages.

import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

import { pageBodySchema, PageBody } from "../validators"
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
  const [pages, count] = await service.listAndCountPages(
    filters,
    toBusinessListConfig(query)
  )

  res.status(200).json({
    pages,
    count,
    offset: query.offset,
    limit: query.limit,
  })
}

export async function POST(
  req: MedusaRequest<PageBody>,
  res: MedusaResponse
): Promise<void> {
  const input = pageBodySchema.parse(req.body)
  const service = getContentService(req.scope)
  const page = await service.createPages(input)

  res.status(200).json({ page })
}
