// API admin xử lý dữ liệu quản trị cho tranh tran vien / business.

import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

import { AUDIT_LOG_MODULE } from "../../../../modules/audit-log"
import AuditLogModuleService from "../../../../modules/audit-log/service"
import { CONTENT_MODULE } from "../../../../modules/content"
import ContentModuleService from "../../../../modules/content/service"
import { CUSTOM_DESIGN_MODULE } from "../../../../modules/custom-design"
import CustomDesignModuleService from "../../../../modules/custom-design/service"
import { FEEDBACK_MODULE } from "../../../../modules/feedback"
import FeedbackModuleService from "../../../../modules/feedback/service"
import { WISHLIST_MODULE } from "../../../../modules/wishlist"
import WishlistModuleService from "../../../../modules/wishlist/service"

type BusinessModuleSummary = {
  key: string
  label: string
  status: "schema_ready" | "placeholder"
  tables: string[]
  count: number
}

export async function GET(
  req: MedusaRequest,
  res: MedusaResponse
): Promise<void> {
  const [
    designRequestCount,
    designAssetCount,
    layoutTemplateCount,
    feedbackCount,
    feedbackMediaCount,
    postCount,
    pageCount,
    auditLogCount,
    wishlistCount,
    wishlistItemCount,
  ] = await Promise.all([
    safeCount(async () => {
      const service =
        req.scope.resolve<CustomDesignModuleService>(CUSTOM_DESIGN_MODULE)
      return service.listAndCountDesignRequests({}, { take: 1 })
    }),
    safeCount(async () => {
      const service =
        req.scope.resolve<CustomDesignModuleService>(CUSTOM_DESIGN_MODULE)
      return service.listAndCountDesignAssets({}, { take: 1 })
    }),
    safeCount(async () => {
      const service =
        req.scope.resolve<CustomDesignModuleService>(CUSTOM_DESIGN_MODULE)
      return service.listAndCountLayoutTemplates({}, { take: 1 })
    }),
    safeCount(async () => {
      const service = req.scope.resolve<FeedbackModuleService>(FEEDBACK_MODULE)
      return service.listAndCountFeedbacks({}, { take: 1 })
    }),
    safeCount(async () => {
      const service = req.scope.resolve<FeedbackModuleService>(FEEDBACK_MODULE)
      return service.listAndCountFeedbackMedias({}, { take: 1 })
    }),
    safeCount(async () => {
      const service = req.scope.resolve<ContentModuleService>(CONTENT_MODULE)
      return service.listAndCountPosts({}, { take: 1 })
    }),
    safeCount(async () => {
      const service = req.scope.resolve<ContentModuleService>(CONTENT_MODULE)
      return service.listAndCountPages({}, { take: 1 })
    }),
    safeCount(async () => {
      const service = req.scope.resolve<AuditLogModuleService>(AUDIT_LOG_MODULE)
      return service.listAndCountAuditLogs({}, { take: 1 })
    }),
    safeCount(async () => {
      const service = req.scope.resolve<WishlistModuleService>(WISHLIST_MODULE)
      return service.listAndCountWishlists({}, { take: 1 })
    }),
    safeCount(async () => {
      const service = req.scope.resolve<WishlistModuleService>(WISHLIST_MODULE)
      return service.listAndCountWishlistItems({}, { take: 1 })
    }),
  ])

  const modules: BusinessModuleSummary[] = [
    {
      key: "custom-design",
      label: "Custom design",
      status: "schema_ready",
      tables: [
        "design_request",
        "design_asset",
        "design_canvas_item",
        "design_revision",
        "layout_template",
      ],
      count: designRequestCount + designAssetCount + layoutTemplateCount,
    },
    {
      key: "feedback",
      label: "Feedback",
      status: "schema_ready",
      tables: ["feedback", "feedback_media"],
      count: feedbackCount + feedbackMediaCount,
    },
    {
      key: "content",
      label: "Content",
      status: "schema_ready",
      tables: ["post", "page"],
      count: postCount + pageCount,
    },
    {
      key: "audit-log",
      label: "Audit log",
      status: "schema_ready",
      tables: ["audit_log"],
      count: auditLogCount,
    },
    {
      key: "wishlist",
      label: "Wishlist",
      status: "schema_ready",
      tables: ["wishlist", "wishlist_item"],
      count: wishlistCount + wishlistItemCount,
    },
  ]

  res.status(200).json({ modules })
}

async function safeCount(
  read: () => Promise<[unknown[], number]>
): Promise<number> {
  try {
    const [, count] = await read()
    return count
  } catch {
    return 0
  }
}
