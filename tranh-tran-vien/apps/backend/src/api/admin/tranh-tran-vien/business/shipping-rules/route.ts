// API admin xử lý dữ liệu quản trị cho tranh tran vien / business / shipping rules.

import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

import { shippingRuleBodySchema, ShippingRuleBody } from "../validators"
import {
  addCommonFilters,
  getShippingRuleService,
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

  const service = getShippingRuleService(req.scope)
  const [shipping_rules, count] = await service.listAndCountShippingRules(
    filters,
    toBusinessListConfig(query)
  )

  res.status(200).json({
    shipping_rules,
    count,
    offset: query.offset,
    limit: query.limit,
  })
}

export async function POST(
  req: MedusaRequest<ShippingRuleBody>,
  res: MedusaResponse
): Promise<void> {
  const input = shippingRuleBodySchema.parse(req.body)
  const service = getShippingRuleService(req.scope)
  const shipping_rule = await service.createShippingRules(input)

  res.status(200).json({ shipping_rule })
}
