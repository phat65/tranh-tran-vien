import { Module } from "@medusajs/framework/utils"

import ComboRuleModuleService from "./service"

export const COMBO_RULE_MODULE = "combo_rule"

export default Module(COMBO_RULE_MODULE, {
  service: ComboRuleModuleService,
})
