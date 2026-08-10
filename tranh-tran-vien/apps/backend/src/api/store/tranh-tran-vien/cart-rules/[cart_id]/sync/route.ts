// API storefront cung cấp dữ liệu public cho tranh tran vien / cart rules / cart id / sync.

import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

import { syncCartRules } from "../../../../../../lib/cart-rules"

export async function POST(
  req: MedusaRequest,
  res: MedusaResponse
): Promise<void> {
  const result = await syncCartRules(req.scope, req.params.cart_id)

  res.status(200).json(result)
}
