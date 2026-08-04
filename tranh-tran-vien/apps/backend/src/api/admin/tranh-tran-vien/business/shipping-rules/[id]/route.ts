import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

import {
  shippingRuleUpdateBodySchema,
  ShippingRuleUpdateBody,
} from "../../validators"
import { assertFound, getShippingRuleService } from "../../utils"

export async function GET(
  req: MedusaRequest,
  res: MedusaResponse
): Promise<void> {
  const service = getShippingRuleService(req.scope)
  const shipping_rule = await service.retrieveShippingRule(req.params.id)

  res.status(200).json({
    shipping_rule: assertFound(shipping_rule, "Shipping rule not found"),
  })
}

export async function POST(
  req: MedusaRequest<ShippingRuleUpdateBody>,
  res: MedusaResponse
): Promise<void> {
  const input = shippingRuleUpdateBodySchema.parse(req.body)
  const service = getShippingRuleService(req.scope)
  const [shipping_rule] = await service.updateShippingRules({
    selector: { id: req.params.id },
    data: input,
  })

  res.status(200).json({
    shipping_rule: assertFound(shipping_rule, "Shipping rule not found"),
  })
}

export async function DELETE(
  req: MedusaRequest,
  res: MedusaResponse
): Promise<void> {
  const service = getShippingRuleService(req.scope)
  await service.deleteShippingRules(req.params.id)

  res.status(200).json({
    id: req.params.id,
    object: "shipping_rule",
    deleted: true,
  })
}
