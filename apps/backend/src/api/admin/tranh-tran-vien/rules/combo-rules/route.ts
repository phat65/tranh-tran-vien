// API admin xử lý dữ liệu quản trị cho tranh tran vien / rules / combo rules.

import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"

import { ComboRuleBody, comboRuleBodySchema } from "../validators"
import {
  addComboRuleFilters,
  assertCatalogScope,
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

  if (input.scope_type !== "category" && input.scope_type !== "collection") {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Combo rules must use a Medusa category or collection."
    )
  }

  const scopeId =
    input.scope_type === "category" ? input.category_id : input.collection_id

  if (!scopeId) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      `Select a ${input.scope_type} for this combo rule.`
    )
  }

  await assertCatalogScope(req.scope, input.scope_type, scopeId)
  const service = getComboRuleService(req.scope)
  const combo_rule = await service.createComboRules({
    ...input,
    product_id: null,
    category_id: input.scope_type === "category" ? scopeId : null,
    collection_id: input.scope_type === "collection" ? scopeId : null,
    option_value_id: null,
    taxonomy_term_id: null,
  } as any)

  res.status(200).json({ combo_rule })
}
