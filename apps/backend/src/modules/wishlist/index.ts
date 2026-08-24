// Khai báo và export module Medusa wishlist.

import { Module } from "@medusajs/framework/utils"

import WishlistModuleService from "./service"

export const WISHLIST_MODULE = "wishlist"

export default Module(WISHLIST_MODULE, {
  service: WishlistModuleService,
})
