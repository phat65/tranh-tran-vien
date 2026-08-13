// Model Medusa mô tả cấu trúc dữ liệu design request.

import { model } from "@medusajs/framework/utils"

const DesignRequest = model.define("design_request", {
  id: model.id({ prefix: "designreq" }).primaryKey(),
  customer_id: model.text().index().nullable(),
  guest_token: model.text().index().nullable(),
  product_id: model.text().index(),
  variant_id: model.text().index().nullable(),
  piece_count: model.number().default(1),
  layout_template_id: model.text().index().nullable(),
  status: model
    .enum([
      "draft",
      "uploading",
      "submitted",
      "attached_to_cart",
      "ordered",
      "designing",
      "awaiting_customer_approval",
      "revision_requested",
      "approved",
      "in_production",
      "completed",
      "cancelled",
    ])
    .default("draft"),
  customer_note: model.text().nullable(),
  internal_note: model.text().nullable(),
  preview_url: model.text().nullable(),
  snapshot_json: model.json().nullable(),
  cart_id: model.text().index().nullable(),
  order_id: model.text().index().nullable(),
  order_line_item_id: model.text().index().nullable(),
  metadata: model.json().nullable(),
})

export default DesignRequest
