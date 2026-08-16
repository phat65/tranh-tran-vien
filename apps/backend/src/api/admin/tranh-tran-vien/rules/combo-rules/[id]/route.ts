// API admin xử lý dữ liệu quản trị cho tranh tran vien / rules / combo rules / id.

import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"

import { ComboRuleUpdateBody, comboRuleUpdateBodySchema } from "../../validators"
import {
  assertActiveExploreTerm,
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

  if (input.scope_type && input.scope_type !== "taxonomy") {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Combo rules can only use Explore Items."
    )
  }

  if (input.scope_type === "taxonomy" && !input.taxonomy_term_id) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Select an Explore Item for this combo rule."
    )
  }

  if (input.taxonomy_term_id) {
    await assertActiveExploreTerm(req.scope, input.taxonomy_term_id)
  }

  const combo_rule = await service.updateComboRules({
    id: req.params.id,
    ...input,
    ...(input.scope_type === "taxonomy"
      ? {
          product_id: null,
          category_id: null,
          collection_id: null,
          option_value_id: null,
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
