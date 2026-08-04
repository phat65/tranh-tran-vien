import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

import { COMBO_RULE_MODULE } from "../../../../../modules/combo-rule"
import ComboRuleModuleService from "../../../../../modules/combo-rule/service"

export async function GET(
  req: MedusaRequest,
  res: MedusaResponse
): Promise<void> {
  const service = req.scope.resolve<ComboRuleModuleService>(COMBO_RULE_MODULE)
  const rules = await service.listActiveComboRules()
  const salesChannelId =
    typeof req.query.sales_channel_id === "string"
      ? req.query.sales_channel_id
      : undefined
  const regionId =
    typeof req.query.region_id === "string" ? req.query.region_id : undefined

  const combo_rules = rules.filter((rule) => {
    if (
      salesChannelId &&
      rule.sales_channel_id &&
      rule.sales_channel_id !== salesChannelId
    ) {
      return false
    }

    if (regionId && rule.region_id && rule.region_id !== regionId) {
      return false
    }

    return true
  })

  res.status(200).json({
    combo_rules,
    count: combo_rules.length,
  })
}
