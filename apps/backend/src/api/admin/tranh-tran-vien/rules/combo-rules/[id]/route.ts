// API admin xử lý dữ liệu quản trị cho tranh tran vien / rules / combo rules / id.

import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"

import { ComboRuleUpdateBody, comboRuleUpdateBodySchema } from "../../validators"
import {
  assertCatalogScope,
  assertFound,
  getComboRuleService,
} from "../../utils"

export async function GET(
  req: MedusaRequest,
  res: MedusaResponse
): Promise<void> {
  const service = getComboRuleService(req.scope)
  const combo_rule = await service.retrieveComboRule(req.params.id)

  res.status(200).json({
    combo_rule: assertFound(combo_rule, "Combo rule not found"),
  })
}

export async function POST(
  req: MedusaRequest<ComboRuleUpdateBody>,
  res: MedusaResponse
): Promise<void> {
  const input = comboRuleUpdateBodySchema.parse(req.body)
  const service = getComboRuleService(req.scope)

  if (
    input.scope_type &&
    input.scope_type !== "category" &&
    input.scope_type !== "collection"
  ) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Combo rules must use a Medusa category or collection."
    )
  }

  const scopeId =
    input.scope_type === "category"
      ? input.category_id
      : input.scope_type === "collection"
        ? input.collection_id
        : null

  if (input.scope_type && !scopeId) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      `Select a ${input.scope_type} for this combo rule.`
    )
  }

  if (input.scope_type && scopeId) {
    await assertCatalogScope(req.scope, input.scope_type, scopeId)
  }

  const combo_rule = await service.updateComboRules({
    id: req.params.id,
    ...input,
    ...(input.scope_type === "category" || input.scope_type === "collection"
      ? {
          product_id: null,
          category_id: input.scope_type === "category" ? scopeId : null,
          collection_id: input.scope_type === "collection" ? scopeId : null,
          option_value_id: null,
          taxonomy_term_id: null,
        }
      : {}),
  } as any)

  res.status(200).json({
    combo_rule: assertFound(combo_rule, "Combo rule not found"),
  })
}

export async function DELETE(
  req: MedusaRequest,
  res: MedusaResponse
): Promise<void> {
  const service = getComboRuleService(req.scope)
  await service.deleteComboRules(req.params.id)

  res.status(200).json({
    id: req.params.id,
    object: "combo_rule",
    deleted: true,
  })
}
