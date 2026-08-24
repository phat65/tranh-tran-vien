// API storefront cung cấp dữ liệu public cho tranh tran vien / business / posts / slug.

import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

import { getContentService } from "../../utils"

export async function GET(
  req: MedusaRequest,
  res: MedusaResponse
): Promise<void> {
  const service = getContentService(req.scope)
  const [posts] = await service.listAndCountPosts(
    {
      slug: req.params.slug,
      status: "published",
    },
    { take: 1 }
  )

  res.status(200).json({ post: posts[0] ?? null })
}
