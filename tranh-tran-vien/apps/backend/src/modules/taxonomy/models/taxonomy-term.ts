// Model Medusa mô tả cấu trúc dữ liệu taxonomy term.

import { model } from "@medusajs/framework/utils"

const TaxonomyTerm = model.define("taxonomy_term", {
  id: model.id({ prefix: "term" }).primaryKey(),
  taxonomy_id: model.text().index(),
  parent_id: model.text().index().nullable(),
  name: model.text().searchable(),
  slug: model.text().unique(),
  image_url: model.text().nullable(),
  description: model.text().nullable(),
  status: model.enum(["draft", "active", "archived"]).default("draft"),
  sort_order: model.number().default(0),
  seo_title: model.text().nullable(),
  seo_description: model.text().nullable(),
  metadata: model.json().nullable(),
})

export default TaxonomyTerm
