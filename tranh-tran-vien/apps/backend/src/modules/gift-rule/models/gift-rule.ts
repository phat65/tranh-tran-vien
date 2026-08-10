// Model Medusa mô tả cấu trúc dữ liệu gift rule.

import { model } from "@medusajs/framework/utils"

const GiftRule = model.define("gift_rule", {
  id: model.id({ prefix: "giftrule" }).primaryKey(),
  name: model.text().searchable(),
  scope_type: model
    .enum(["all", "product", "category", "collection", "brand", "taxonomy"])
    .default("all"),
  product_id: model.text().index().nullable(),
  category_id: model.text().index().nullable(),
  collection_id: model.text().index().nullable(),
  brand_id: model.text().index().nullable(),
  taxonomy_term_id: model.text().index().nullable(),
  minimum_quantity: model.number().default(1),
  gift_variant_id: model.text().index(),
  gift_quantity: model.number().default(1),
  starts_at: model.dateTime().index().nullable(),
  ends_at: model.dateTime().index().nullable(),
  priority: model.number().default(0),
  is_stackable: model.boolean().default(false),
  status: model.enum(["draft", "active", "archived"]).default("draft"),
  metadata: model.json().nullable(),
})

export default GiftRule
