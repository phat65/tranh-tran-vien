import { MedusaContainer } from "@medusajs/framework/types"
import { z } from "@medusajs/framework/zod"

import { CONTENT_MODULE } from "../../../../modules/content"
import ContentModuleService from "../../../../modules/content/service"
import { FEEDBACK_MODULE } from "../../../../modules/feedback"
import FeedbackModuleService from "../../../../modules/feedback/service"

export const storeBusinessListQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(200).default(20),
  offset: z.coerce.number().int().min(0).default(0),
  q: z.string().trim().optional(),
  product_id: z.string().trim().optional(),
})

export type StoreBusinessListQuery = z.infer<
  typeof storeBusinessListQuerySchema
>

export function parseStoreBusinessListQuery(
  query: unknown
): StoreBusinessListQuery {
  return storeBusinessListQuerySchema.parse(query)
}

export function toStoreBusinessListConfig(query: StoreBusinessListQuery) {
  return {
    skip: query.offset,
    take: query.limit,
    order: {
      published_at: "DESC" as const,
      created_at: "DESC" as const,
    },
  }
}

export function getContentService(scope: MedusaContainer): ContentModuleService {
  return scope.resolve(CONTENT_MODULE)
}

export function getFeedbackService(
  scope: MedusaContainer
): FeedbackModuleService {
  return scope.resolve(FEEDBACK_MODULE)
}
