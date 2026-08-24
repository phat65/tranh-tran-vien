// API admin xử lý dữ liệu quản trị cho tranh tran vien / business / feedbacks / id.

import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { z } from "@medusajs/framework/zod"

import { feedbackUpdateBodySchema, FeedbackUpdateBody } from "../../validators"
import { assertFound, getFeedbackService } from "../../utils"

const feedbackActionSchema = z
  .object({
    action: z.enum(["approve", "reject", "archive"]).optional(),
  })
  .passthrough()

export async function GET(
  req: MedusaRequest,
  res: MedusaResponse
): Promise<void> {
  const service = getFeedbackService(req.scope)
  const feedback = await service.retrieveFeedback(req.params.id)
  const feedback_media = await service.listFeedbackMedias({
    feedback_id: req.params.id,
  })

  res.status(200).json({
    feedback: assertFound(feedback, "Feedback not found"),
    feedback_media,
  })
}

export async function POST(
  req: MedusaRequest<FeedbackUpdateBody & { action?: string }>,
  res: MedusaResponse
): Promise<void> {
  const action = feedbackActionSchema.parse(req.body).action
  const service = getFeedbackService(req.scope)

  if (action === "approve") {
    const feedback = await service.approveFeedback(req.params.id)
    res.status(200).json({ feedback })
    return
  }

  if (action === "reject") {
    const feedback = await service.rejectFeedback(req.params.id)
    res.status(200).json({ feedback })
    return
  }

  if (action === "archive") {
    const feedback = await service.archiveFeedback(req.params.id)
    res.status(200).json({ feedback })
    return
  }

  const input = feedbackUpdateBodySchema.parse(req.body)
  const [feedback] = await service.updateFeedbacks({
    selector: { id: req.params.id },
    data: input,
  })

  res.status(200).json({
    feedback: assertFound(feedback, "Feedback not found"),
  })
}

export async function DELETE(
  req: MedusaRequest,
  res: MedusaResponse
): Promise<void> {
  const service = getFeedbackService(req.scope)
  await service.deleteFeedbacks(req.params.id)

  res.status(200).json({
    id: req.params.id,
    object: "feedback",
    deleted: true,
  })
}
