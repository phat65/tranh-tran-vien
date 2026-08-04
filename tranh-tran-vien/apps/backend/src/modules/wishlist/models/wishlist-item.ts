import { model } from "@medusajs/framework/utils"

const WishlistItem = model.define("wishlist_item", {
  id: model.id({ prefix: "wishitem" }).primaryKey(),
  wishlist_id: model.text().index(),
  product_id: model.text().index(),
  variant_id: model.text().index().nullable(),
  metadata: model.json().nullable(),
})

export default WishlistItem
