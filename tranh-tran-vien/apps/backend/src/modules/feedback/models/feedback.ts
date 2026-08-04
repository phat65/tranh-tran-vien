import { model } from "@medusajs/framework/utils"

const Feedback = model.define("feedback", {
  id: model.id({ prefix: "feedback" }).primaryKey(),
  customer_id: model.text().index().nullable(),
  customer_name: model.text().searchable(),
  order_id: model.text().index().nullable(),
  product_id: model.text().index().nullable(),
  rating: model.number().default(5),
  content: model.text().nullable(),
  status: model
    .enum(["draft", "pending_review", "approved", "rejected", "archived"])
    .default("pending_review"),
  published_at: model.dateTime().index().nullable(),
  sort_order: model.number().default(0),
  metadata: model.json().nullable(),
})

export default Feedback
