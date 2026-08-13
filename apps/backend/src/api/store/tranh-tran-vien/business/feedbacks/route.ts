// API storefront cung cấp dữ liệu public cho tranh tran vien / business / feedbacks.

import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

import {
  getFeedbackService,
  parseStoreBusinessListQuery,
  toStoreBusinessListConfig,
} from "../utils"

export async function GET(
  req: MedusaRequest,
  res: MedusaResponse
): Promise<void> {
  const query = parseStoreBusinessListQuery(req.query)
  const filters: Record<string, unknown> = { status: "approved" }

  if (query.product_id) {
    filters.product_id = query.product_id
  }

  if (query.q) {
    filters.customer_name = { $ilike: `%${query.q}%` }
  }

  const service = getFeedbackService(req.scope)
  const [feedbacks, count] = await service.listAndCountFeedbacks(
    filters,
    toStoreBusinessListConfig(query)
  )
  const feedbackIds = feedbacks.map((feedback) => feedback.id)
  const feedback_media = feedbackIds.length
    ? await service.listFeedbackMedias(
        { feedback_id: feedbackIds },
        { take: 500, order: { sort_order: "ASC", created_at: "ASC" } }
      )
    : []

  res.status(200).json({
    feedbacks,
    feedback_media,
    count,
    offset: query.offset,
    limit: query.limit,
  })
}
