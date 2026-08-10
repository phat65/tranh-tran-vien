// API admin xử lý dữ liệu quản trị cho tranh tran vien / rules / combo rules / id.

import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

import { ComboRuleUpdateBody, comboRuleUpdateBodySchema } from "../../validators"
import { assertFound, getComboRuleService } from "../../utils"

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
  const combo_rule = await service.updateComboRules({
    id: req.params.id,
    ...input,
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
