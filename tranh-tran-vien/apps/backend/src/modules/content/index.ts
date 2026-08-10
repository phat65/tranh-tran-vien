// Khai báo và export module Medusa content.

import { Module } from "@medusajs/framework/utils"

import ContentModuleService from "./service"

export const CONTENT_MODULE = "content"

export default Module(CONTENT_MODULE, {
  service: ContentModuleService,
})
