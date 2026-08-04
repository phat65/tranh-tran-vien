import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

import { ComboRuleBody, comboRuleBodySchema } from "../validators"
import {
  addComboRuleFilters,
  getComboRuleService,
  parseRulesListQuery,
  toRulesListConfig,
} from "../utils"

export async function GET(
  req: MedusaRequest,
  res: MedusaResponse
): Promise<void> {
  const query = parseRulesListQuery(req.query)
  const filters: Record<string, unknown> = {}
  addComboRuleFilters(filters, query)

  if (query.q) {
    filters.name = { $ilike: `%${query.q}%` }
  }

  const service = getComboRuleService(req.scope)
  const [combo_rules, count] = await service.listAndCountComboRules(
    filters,
    toRulesListConfig(query)
  )

  res.status(200).json({
    combo_rules,
    count,
    offset: query.offset,
    limit: query.limit,
  })
}

export async function POST(
  req: MedusaRequest<ComboRuleBody>,
  res: MedusaResponse
): Promise<void> {
  const input = comboRuleBodySchema.parse(req.body)
  const service = getComboRuleService(req.scope)
  const combo_rule = await service.createComboRules(input as any)

  res.status(200).json({ combo_rule })
}
