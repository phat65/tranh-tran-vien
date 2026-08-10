// Model Medusa mô tả cấu trúc dữ liệu taxonomy.

import { model } from "@medusajs/framework/utils"

const Taxonomy = model.define("taxonomy", {
  id: model.id({ prefix: "tax" }).primaryKey(),
  code: model.text().unique(),
  name: model.text().searchable(),
  description: model.text().nullable(),
  status: model.enum(["draft", "active", "archived"]).default("draft"),
  sort_order: model.number().default(0),
  metadata: model.json().nullable(),
})

export default Taxonomy
