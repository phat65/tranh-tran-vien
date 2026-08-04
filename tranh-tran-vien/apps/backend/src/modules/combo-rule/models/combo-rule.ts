import { model } from "@medusajs/framework/utils"

const ComboRule = model.define("combo_rule", {
  id: model.id({ prefix: "comborule" }).primaryKey(),
  name: model.text().searchable(),
  description: model.text().nullable(),
  scope_type: model
    .enum(["all", "product", "category", "collection", "option"])
    .default("collection"),
  product_id: model.text().index().nullable(),
  category_id: model.text().index().nullable(),
  collection_id: model.text().index().nullable(),
  option_value_id: model.text().index().nullable(),
  sales_channel_id: model.text().index().nullable(),
  region_id: model.text().index().nullable(),
  tiers: model.json(),
  priority: model.number().default(0),
  is_stackable: model.boolean().default(false),
  starts_at: model.dateTime().index().nullable(),
  ends_at: model.dateTime().index().nullable(),
  status: model.enum(["draft", "active", "archived"]).default("draft"),
  metadata: model.json().nullable(),
})

export default ComboRule
