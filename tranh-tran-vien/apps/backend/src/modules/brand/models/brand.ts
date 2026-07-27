import { model } from "@medusajs/framework/utils"

const Brand = model.define("brand", {
  id: model.id({ prefix: "brand" }).primaryKey(),
  name: model.text().searchable(),
  slug: model.text().unique(),
  parent_id: model.text().index().nullable(),
  logo_url: model.text().nullable(),
  description: model.text().nullable(),
  status: model.enum(["draft", "active", "archived"]).default("draft"),
  sort_order: model.number().default(0),
  seo_title: model.text().nullable(),
  seo_description: model.text().nullable(),
  metadata: model.json().nullable(),
})

export default Brand
