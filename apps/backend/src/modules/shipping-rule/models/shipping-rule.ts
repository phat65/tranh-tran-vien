// Model Medusa mô tả cấu trúc dữ liệu shipping rule.

import { model } from "@medusajs/framework/utils"

const ShippingRule = model.define("shipping_rule", {
  id: model.id({ prefix: "shiprule" }).primaryKey(),
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
  maximum_quantity: model.number().nullable(),
  shipping_fee: model.number().default(0),
  is_free_shipping: model.boolean().default(false),
  starts_at: model.dateTime().index().nullable(),
  ends_at: model.dateTime().index().nullable(),
  priority: model.number().default(0),
  status: model.enum(["draft", "active", "archived"]).default("draft"),
  metadata: model.json().nullable(),
})

export default ShippingRule
