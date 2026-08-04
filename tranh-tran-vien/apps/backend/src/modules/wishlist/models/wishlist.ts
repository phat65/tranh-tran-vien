import { model } from "@medusajs/framework/utils"

const Wishlist = model.define("wishlist", {
  id: model.id({ prefix: "wishlist" }).primaryKey(),
  customer_id: model.text().index().nullable(),
  guest_token: model.text().index().nullable(),
  status: model.enum(["active", "archived"]).default("active"),
  metadata: model.json().nullable(),
})

export default Wishlist
