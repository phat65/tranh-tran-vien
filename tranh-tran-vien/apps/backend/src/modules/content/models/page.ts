// Model Medusa mô tả cấu trúc dữ liệu content.

import { model } from "@medusajs/framework/utils"

const Page = model.define("page", {
  id: model.id({ prefix: "page" }).primaryKey(),
  title: model.text().searchable(),
  slug: model.text().unique(),
  content_json: model.json().nullable(),
  page_type: model.text().index().default("static"),
  status: model.enum(["draft", "published", "archived"]).default("draft"),
  published_at: model.dateTime().index().nullable(),
  seo_title: model.text().nullable(),
  seo_description: model.text().nullable(),
  metadata: model.json().nullable(),
})

export default Page
