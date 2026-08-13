// Model Medusa mô tả cấu trúc dữ liệu navigation menu.

import { model } from "@medusajs/framework/utils"

const NavigationMenu = model.define("navigation_menu", {
  id: model.id({ prefix: "navmenu" }).primaryKey(),
  code: model.text().unique(),
  name: model.text().searchable(),
  status: model.enum(["draft", "active", "archived"]).default("draft"),
  metadata: model.json().nullable(),
})

export default NavigationMenu
