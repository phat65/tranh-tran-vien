import { model } from "@medusajs/framework/utils"

const Post = model.define("post", {
  id: model.id({ prefix: "post" }).primaryKey(),
  title: model.text().searchable(),
  slug: model.text().unique(),
  excerpt: model.text().nullable(),
  content_json: model.json().nullable(),
  cover_image_url: model.text().nullable(),
  author_id: model.text().index().nullable(),
  category_id: model.text().index().nullable(),
  status: model.enum(["draft", "published", "archived"]).default("draft"),
  published_at: model.dateTime().index().nullable(),
  seo_title: model.text().nullable(),
  seo_description: model.text().nullable(),
  metadata: model.json().nullable(),
})

export default Post
