import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

import { syncCartRules } from "../../../../../../lib/cart-rules"

export async function POST(
  req: MedusaRequest,
  res: MedusaResponse
): Promise<void> {
  const result = await syncCartRules(req.scope, req.params.cart_id)

  res.status(200).json(result)
}
