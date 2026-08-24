// API admin xử lý dữ liệu quản trị cho tranh tran vien / business / feedbacks.

import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

import { feedbackBodySchema, FeedbackBody } from "../validators"
import {
  addCommonFilters,
  getFeedbackService,
  parseBusinessListQuery,
  toBusinessListConfig,
} from "../utils"

export async function GET(
  req: MedusaRequest,
  res: MedusaResponse
): Promise<void> {
  const query = parseBusinessListQuery(req.query)
  const filters: Record<string, unknown> = {}
  addCommonFilters(filters, query)

  if (query.q) {
    filters.customer_name = { $ilike: `%${query.q}%` }
  }

  const service = getFeedbackService(req.scope)
  const [feedbacks, count] = await service.listAndCountFeedbacks(
    filters,
    toBusinessListConfig(query)
  )

  res.status(200).json({
    feedbacks,
    count,
    offset: query.offset,
    limit: query.limit,
  })
}

export async function POST(
  req: MedusaRequest<FeedbackBody>,
  res: MedusaResponse
): Promise<void> {
  const input = feedbackBodySchema.parse(req.body)
  const service = getFeedbackService(req.scope)
  const feedback = await service.createFeedbacks(input)

  res.status(200).json({ feedback })
}
