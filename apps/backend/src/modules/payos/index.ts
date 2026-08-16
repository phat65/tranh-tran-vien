import { Module } from "@medusajs/framework/utils"

import PayosModuleService from "./service"

export const PAYOS_MODULE = "payos"

export default Module(PAYOS_MODULE, {
  service: PayosModuleService,
})
