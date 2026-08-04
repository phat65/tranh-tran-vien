import { Module } from "@medusajs/framework/utils"

import ShippingRuleModuleService from "./service"

export const SHIPPING_RULE_MODULE = "shipping_rule"

export default Module(SHIPPING_RULE_MODULE, {
  service: ShippingRuleModuleService,
})
