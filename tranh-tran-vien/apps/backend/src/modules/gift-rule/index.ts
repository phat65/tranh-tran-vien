import { Module } from "@medusajs/framework/utils"

import GiftRuleModuleService from "./service"

export const GIFT_RULE_MODULE = "gift_rule"

export default Module(GIFT_RULE_MODULE, {
  service: GiftRuleModuleService,
})
