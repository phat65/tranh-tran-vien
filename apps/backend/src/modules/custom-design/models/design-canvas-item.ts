// Model Medusa mô tả cấu trúc dữ liệu design canvas item.

import { model } from "@medusajs/framework/utils"

const DesignCanvasItem = model.define("design_canvas_item", {
  id: model.id({ prefix: "canvasitem" }).primaryKey(),
  design_request_id: model.text().index(),
  design_asset_id: model.text().index().nullable(),
  slot_index: model.number().default(0),
  crop_data_json: model.json().nullable(),
  transform_data_json: model.json().nullable(),
  metadata: model.json().nullable(),
})

export default DesignCanvasItem
