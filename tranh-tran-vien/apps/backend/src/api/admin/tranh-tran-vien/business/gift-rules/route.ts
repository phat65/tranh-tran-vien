import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

import { giftRuleBodySchema, GiftRuleBody } from "../validators"
import {
  addCommonFilters,
  getGiftRuleService,
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
    filters.name = { $ilike: `%${query.q}%` }
  }

  const service = getGiftRuleService(req.scope)
  const [gift_rules, count] = await service.listAndCountGiftRules(
    filters,
    toBusinessListConfig(query)
  )

  res.status(200).json({
    gift_rules,
    count,
    offset: query.offset,
    limit: query.limit,
  })
}

export async function POST(
  req: MedusaRequest<GiftRuleBody>,
  res: MedusaResponse
): Promise<void> {
  const input = giftRuleBodySchema.parse(req.body)
  const service = getGiftRuleService(req.scope)
  const gift_rule = await service.createGiftRules(input)

  res.status(200).json({ gift_rule })
}
