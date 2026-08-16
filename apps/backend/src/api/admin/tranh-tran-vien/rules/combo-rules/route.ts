// API admin xử lý dữ liệu quản trị cho tranh tran vien / rules / combo rules.

import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"

import { ComboRuleBody, comboRuleBodySchema } from "../validators"
import {
  addComboRuleFilters,
  assertActiveExploreTerm,
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

  if (input.scope_type !== "taxonomy" || !input.taxonomy_term_id) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Select an Explore Item for this combo rule."
    )
  }

  await assertActiveExploreTerm(req.scope, input.taxonomy_term_id)
  const service = getComboRuleService(req.scope)
  const combo_rule = await service.createComboRules({
    ...input,
    product_id: null,
    category_id: null,
    collection_id: null,
    option_value_id: null,
  } as any)

  res.status(200).json({ combo_rule })
}
