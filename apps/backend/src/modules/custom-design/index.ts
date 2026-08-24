// Khai báo và export module Medusa custom design.

import { Module } from "@medusajs/framework/utils"

import CustomDesignModuleService from "./service"

export const CUSTOM_DESIGN_MODULE = "custom_design"

export default Module(CUSTOM_DESIGN_MODULE, {
  service: CustomDesignModuleService,
})
