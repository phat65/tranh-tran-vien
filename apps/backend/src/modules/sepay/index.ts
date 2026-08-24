import { Module } from "@medusajs/framework/utils"

import SepayModuleService from "./service"

export const SEPAY_MODULE = "sepay"

export default Module(SEPAY_MODULE, {
  service: SepayModuleService,
})
