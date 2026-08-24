// API admin xử lý dữ liệu quản trị cho tranh tran vien / business / pages / id.

import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { z } from "@medusajs/framework/zod"

import { pageUpdateBodySchema, PageUpdateBody } from "../../validators"
import { assertFound, getContentService } from "../../utils"

const contentActionSchema = z
  .object({
    action: z.enum(["publish", "archive"]).optional(),
  })
  .passthrough()

export async function GET(
  req: MedusaRequest,
  res: MedusaResponse
): Promise<void> {
  const service = getContentService(req.scope)
  const page = await service.retrievePage(req.params.id)

  res.status(200).json({
    page: assertFound(page, "Page not found"),
  })
}

export async function POST(
  req: MedusaRequest<PageUpdateBody & { action?: string }>,
  res: MedusaResponse
): Promise<void> {
  const action = contentActionSchema.parse(req.body).action
  const service = getContentService(req.scope)

  if (action === "publish") {
    const page = await service.publishPage(req.params.id)
    res.status(200).json({ page })
    return
  }

  if (action === "archive") {
    const page = await service.archivePage(req.params.id)
    res.status(200).json({ page })
    return
  }

  const input = pageUpdateBodySchema.parse(req.body)
  const [page] = await service.updatePages({
    selector: { id: req.params.id },
    data: input,
  })

  res.status(200).json({
    page: assertFound(page, "Page not found"),
  })
}

export async function DELETE(
  req: MedusaRequest,
  res: MedusaResponse
): Promise<void> {
  const service = getContentService(req.scope)
  await service.deletePages(req.params.id)

  res.status(200).json({
    id: req.params.id,
    object: "page",
    deleted: true,
  })
}
