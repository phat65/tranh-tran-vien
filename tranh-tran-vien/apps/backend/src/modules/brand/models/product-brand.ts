import { model } from "@medusajs/framework/utils"

const ProductBrand = model.define("product_brand", {
  id: model.id({ prefix: "prodbrand" }).primaryKey(),
  product_id: model.text().index(),
  brand_id: model.text().index(),
  is_primary: model.boolean().default(false),
  sort_order: model.number().default(0),
  metadata: model.json().nullable(),
})

export default ProductBrand
