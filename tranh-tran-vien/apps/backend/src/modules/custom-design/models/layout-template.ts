import { model } from "@medusajs/framework/utils"

const LayoutTemplate = model.define("layout_template", {
  id: model.id({ prefix: "layout" }).primaryKey(),
  name: model.text().searchable(),
  piece_count: model.number().default(1),
  thumbnail_url: model.text().nullable(),
  canvas_width: model.number().default(0),
  canvas_height: model.number().default(0),
  layout_json: model.json(),
  status: model.enum(["draft", "active", "archived"]).default("draft"),
  sort_order: model.number().default(0),
  metadata: model.json().nullable(),
})

export default LayoutTemplate
