// API storefront cung cấp dữ liệu public cho custom.

import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

import { getBackendStatus } from "../../../lib/project-status"

export async function GET(
  _req: MedusaRequest,
  res: MedusaResponse
): Promise<void> {
  res.status(200).json({
    ...getBackendStatus(),
    surface: "store",
  })
}
