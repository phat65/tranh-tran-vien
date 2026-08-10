// API admin xử lý dữ liệu quản trị cho tranh tran vien / business / posts / id.

import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { z } from "@medusajs/framework/zod"

import { postUpdateBodySchema, PostUpdateBody } from "../../validators"
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
  const post = await service.retrievePost(req.params.id)

  res.status(200).json({
    post: assertFound(post, "Post not found"),
  })
}

export async function POST(
  req: MedusaRequest<PostUpdateBody & { action?: string }>,
  res: MedusaResponse
): Promise<void> {
  const action = contentActionSchema.parse(req.body).action
  const service = getContentService(req.scope)

  if (action === "publish") {
    const post = await service.publishPost(req.params.id)
    res.status(200).json({ post })
    return
  }

  if (action === "archive") {
    const post = await service.archivePost(req.params.id)
    res.status(200).json({ post })
    return
  }

  const input = postUpdateBodySchema.parse(req.body)
  const [post] = await service.updatePosts({
    selector: { id: req.params.id },
    data: input,
  })

  res.status(200).json({
    post: assertFound(post, "Post not found"),
  })
}

export async function DELETE(
  req: MedusaRequest,
  res: MedusaResponse
): Promise<void> {
  const service = getContentService(req.scope)
  await service.deletePosts(req.params.id)

  res.status(200).json({
    id: req.params.id,
    object: "post",
    deleted: true,
  })
}
