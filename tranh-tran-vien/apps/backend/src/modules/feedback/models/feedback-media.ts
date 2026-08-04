import { model } from "@medusajs/framework/utils"

const FeedbackMedia = model.define("feedback_media", {
  id: model.id({ prefix: "feedbackmedia" }).primaryKey(),
  feedback_id: model.text().index(),
  type: model.enum(["image", "video"]).default("image"),
  object_key: model.text(),
  url: model.text().nullable(),
  sort_order: model.number().default(0),
  metadata: model.json().nullable(),
})

export default FeedbackMedia
