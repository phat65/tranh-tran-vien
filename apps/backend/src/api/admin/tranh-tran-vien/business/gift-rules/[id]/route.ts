// API admin xử lý dữ liệu quản trị cho tranh tran vien / business / gift rules / id.

import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

import { giftRuleUpdateBodySchema, GiftRuleUpdateBody } from "../../validators"
import { assertFound, getGiftRuleService } from "../../utils"

export async function GET(
  req: MedusaRequest,
  res: MedusaResponse
): Promise<void> {
  const service = getGiftRuleService(req.scope)
  const gift_rule = await service.retrieveGiftRule(req.params.id)

  res.status(200).json({
    gift_rule: assertFound(gift_rule, "Gift rule not found"),
  })
}

export async function POST(
  req: MedusaRequest<GiftRuleUpdateBody>,
  res: MedusaResponse
): Promise<void> {
  const input = giftRuleUpdateBodySchema.parse(req.body)
  const service = getGiftRuleService(req.scope)
  const [gift_rule] = await service.updateGiftRules({
    selector: { id: req.params.id },
    data: input,
  })

  res.status(200).json({
    gift_rule: assertFound(gift_rule, "Gift rule not found"),
  })
}

export async function DELETE(
  req: MedusaRequest,
  res: MedusaResponse
): Promise<void> {
  const service = getGiftRuleService(req.scope)
  await service.deleteGiftRules(req.params.id)

  res.status(200).json({
    id: req.params.id,
    object: "gift_rule",
    deleted: true,
  })
}
