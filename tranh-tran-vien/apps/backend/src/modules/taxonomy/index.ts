import { Module } from "@medusajs/framework/utils"

import TaxonomyModuleService from "./service"

export const TAXONOMY_MODULE = "taxonomy"

export default Module(TAXONOMY_MODULE, {
  service: TaxonomyModuleService,
})
