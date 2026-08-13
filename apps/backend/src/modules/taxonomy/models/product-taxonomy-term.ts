// Model Medusa mô tả cấu trúc dữ liệu product taxonomy term.

import { model } from "@medusajs/framework/utils"

const ProductTaxonomyTerm = model.define("product_taxonomy_term", {
  id: model.id({ prefix: "prodterm" }).primaryKey(),
  product_id: model.text().index(),
  term_id: model.text().index(),
  sort_order: model.number().default(0),
  metadata: model.json().nullable(),
})

export default ProductTaxonomyTerm
