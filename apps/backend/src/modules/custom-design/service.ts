// Service Medusa chứa nghiệp vụ và thao tác dữ liệu cho module custom design.

import { MedusaService } from "@medusajs/framework/utils"
import { MedusaError } from "@medusajs/framework/utils"

import DesignAsset from "./models/design-asset"
import DesignCanvasItem from "./models/design-canvas-item"
import DesignRequest from "./models/design-request"
import DesignRevision from "./models/design-revision"
import LayoutTemplate from "./models/layout-template"

export type DesignRequestStatus =
  | "draft"
  | "uploading"
  | "submitted"
  | "attached_to_cart"
  | "ordered"
  | "designing"
  | "awaiting_customer_approval"
  | "revision_requested"
  | "approved"
  | "in_production"
  | "completed"
  | "cancelled"

const DESIGN_REQUEST_TRANSITIONS: Record<
  DesignRequestStatus,
  DesignRequestStatus[]
> = {
  draft: ["uploading", "submitted", "cancelled"],
  uploading: ["draft", "submitted", "cancelled"],
  submitted: ["attached_to_cart", "designing", "cancelled"],
  attached_to_cart: ["ordered", "cancelled"],
  ordered: ["designing", "cancelled"],
  designing: ["awaiting_customer_approval", "revision_requested", "cancelled"],
  awaiting_customer_approval: ["approved", "revision_requested", "cancelled"],
  revision_requested: ["designing", "cancelled"],
  approved: ["in_production", "cancelled"],
  in_production: ["completed", "cancelled"],
  completed: [],
  cancelled: [],
}

type DesignRequestTransitionInput = {
  status: DesignRequestStatus
  internal_note?: string | null
  preview_url?: string | null
  snapshot_json?: Record<string, unknown> | null
  metadata?: Record<string, unknown> | null
}

class CustomDesignModuleService extends MedusaService({
  DesignAsset,
  DesignCanvasItem,
  DesignRequest,
  DesignRevision,
  LayoutTemplate,
}) {
  async transitionDesignRequest(
    id: string,
    input: DesignRequestTransitionInput
  ) {
    const request = await this.retrieveDesignRequest(id)
    const currentStatus = request.status as DesignRequestStatus
    const allowedNextStatuses = DESIGN_REQUEST_TRANSITIONS[currentStatus] ?? []

    if (!allowedNextStatuses.includes(input.status)) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `Cannot transition design request from "${currentStatus}" to "${input.status}"`
      )
    }

    const [updated] = await this.updateDesignRequests({
      selector: { id },
      data: input,
    })

    return updated
  }

  async attachDesignRequestToCart(id: string, cartId: string) {
    return this.transitionDesignRequest(id, {
      status: "attached_to_cart",
      metadata: { cart_id: cartId },
    }).then(async () => {
      const [updated] = await this.updateDesignRequests({
        selector: { id },
        data: { cart_id: cartId },
      })

      return updated
    })
  }

  async markDesignRequestOrdered(input: {
    id: string
    order_id: string
    order_line_item_id?: string | null
  }) {
    await this.transitionDesignRequest(input.id, {
      status: "ordered",
    })

    const [updated] = await this.updateDesignRequests({
      selector: { id: input.id },
      data: {
        order_id: input.order_id,
        order_line_item_id: input.order_line_item_id ?? null,
      },
    })

    return updated
  }

  async listCustomerDesignRequests(customerId: string, limit = 50) {
    return this.listDesignRequests(
      { customer_id: customerId },
      {
        take: limit,
        order: { created_at: "DESC" },
      }
    )
  }
}

export default CustomDesignModuleService
