// Model Medusa mô tả cấu trúc dữ liệu design revision.

import { model } from "@medusajs/framework/utils"

const DesignRevision = model.define("design_revision", {
  id: model.id({ prefix: "designrev" }).primaryKey(),
  design_request_id: model.text().index(),
  version: model.number().default(1),
  preview_url: model.text().nullable(),
  status: model
    .enum(["draft", "sent", "approved", "revision_requested", "rejected"])
    .default("draft"),
  note: model.text().nullable(),
  created_by: model.text().index().nullable(),
  metadata: model.json().nullable(),
})

export default DesignRevision
