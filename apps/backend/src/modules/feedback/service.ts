// Service Medusa chứa nghiệp vụ và thao tác dữ liệu cho module feedback.

import { MedusaService } from "@medusajs/framework/utils"

import Feedback from "./models/feedback"
import FeedbackMedia from "./models/feedback-media"

class FeedbackModuleService extends MedusaService({
  Feedback,
  FeedbackMedia,
}) {
  async approveFeedback(id: string, publishedAt = new Date()) {
    const [feedback] = await this.updateFeedbacks({
      selector: { id },
      data: {
        status: "approved",
        published_at: publishedAt,
      },
    })

    return feedback
  }

  async rejectFeedback(id: string) {
    const [feedback] = await this.updateFeedbacks({
      selector: { id },
      data: {
        status: "rejected",
        published_at: null,
      },
    })

    return feedback
  }

  async archiveFeedback(id: string) {
    const [feedback] = await this.updateFeedbacks({
      selector: { id },
      data: {
        status: "archived",
      },
    })

    return feedback
  }
}

export default FeedbackModuleService
