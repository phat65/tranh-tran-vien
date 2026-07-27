import { model } from "@medusajs/framework/utils"

const NavigationItem = model.define("navigation_item", {
  id: model.id({ prefix: "navitem" }).primaryKey(),
  menu_id: model.text().index(),
  parent_id: model.text().index().nullable(),
  label: model.text().searchable(),
  link_type: model
    .enum(["url", "product", "category", "brand", "taxonomy", "page", "post"])
    .default("url"),
  entity_id: model.text().index().nullable(),
  url: model.text().nullable(),
  image_url: model.text().nullable(),
  sort_order: model.number().default(0),
  visibility: model.enum(["visible", "hidden"]).default("visible"),
  metadata: model.json().nullable(),
})

export default NavigationItem
