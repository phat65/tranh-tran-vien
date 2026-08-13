// API storefront cung cấp dữ liệu public cho tranh tran vien / business / pages / slug.

import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

import { getContentService } from "../../utils"

export async function GET(
  req: MedusaRequest,
  res: MedusaResponse
): Promise<void> {
  const service = getContentService(req.scope)
  const [pages] = await service.listAndCountPages(
    {
      slug: req.params.slug,
      status: "published",
    },
    { take: 1 }
  )

  res.status(200).json({ page: pages[0] ?? null })
}
