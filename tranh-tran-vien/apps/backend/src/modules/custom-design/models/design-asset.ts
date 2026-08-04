import { model } from "@medusajs/framework/utils"

const DesignAsset = model.define("design_asset", {
  id: model.id({ prefix: "designasset" }).primaryKey(),
  design_request_id: model.text().index(),
  object_key: model.text().unique(),
  original_filename: model.text(),
  mime_type: model.text().index(),
  size_bytes: model.number().default(0),
  width: model.number().nullable(),
  height: model.number().nullable(),
  checksum: model.text().index().nullable(),
  upload_status: model
    .enum(["pending", "uploaded", "verified", "rejected", "expired"])
    .default("pending"),
  metadata: model.json().nullable(),
})

export default DesignAsset
