// Helper dùng chung cho nhóm API admin / tranh tran vien / business.

import { MedusaContainer } from "@medusajs/framework/types"
import { MedusaError } from "@medusajs/framework/utils"

import { CONTENT_MODULE } from "../../../../modules/content"
import ContentModuleService from "../../../../modules/content/service"
import { FEEDBACK_MODULE } from "../../../../modules/feedback"
import FeedbackModuleService from "../../../../modules/feedback/service"
import { GIFT_RULE_MODULE } from "../../../../modules/gift-rule"
import GiftRuleModuleService from "../../../../modules/gift-rule/service"
import { SHIPPING_RULE_MODULE } from "../../../../modules/shipping-rule"
import ShippingRuleModuleService from "../../../../modules/shipping-rule/service"
import { BusinessListQuery, businessListQuerySchema } from "./validators"

export type ListConfig = {
  skip: number
  take: number
  order?: Record<string, "ASC" | "DESC">
}

export function parseBusinessListQuery(query: unknown): BusinessListQuery {
  return businessListQuerySchema.parse(query)
}

export function toBusinessListConfig(query: BusinessListQuery): ListConfig {
  return {
    skip: query.offset,
    take: query.limit,
    order: {
      priority: "DESC",
      sort_order: "ASC",
      created_at: "DESC",
    },
  }
}

export function getGiftRuleService(
  scope: MedusaContainer
): GiftRuleModuleService {
  return scope.resolve(GIFT_RULE_MODULE)
}

export function getShippingRuleService(
  scope: MedusaContainer
): ShippingRuleModuleService {
  return scope.resolve(SHIPPING_RULE_MODULE)
}

export function getFeedbackService(
  scope: MedusaContainer
): FeedbackModuleService {
  return scope.resolve(FEEDBACK_MODULE)
}

export function getContentService(
  scope: MedusaContainer
): ContentModuleService {
  return scope.resolve(CONTENT_MODULE)
}

export function assertFound<T>(value: T | null | undefined, message: string): T {
  if (!value) {
    throw new MedusaError(MedusaError.Types.NOT_FOUND, message)
  }

  return value
}

export function addCommonFilters(
  filters: Record<string, unknown>,
  query: BusinessListQuery
): void {
  if (query.status) {
    filters.status = query.status
  }

  if (query.product_id) {
    filters.product_id = query.product_id
  }

  if (query.category_id) {
    filters.category_id = query.category_id
  }

  if (query.collection_id) {
    filters.collection_id = query.collection_id
  }

  if (query.brand_id) {
    filters.brand_id = query.brand_id
  }

  if (query.taxonomy_term_id) {
    filters.taxonomy_term_id = query.taxonomy_term_id
  }

  if (query.customer_id) {
    filters.customer_id = query.customer_id
  }

  if (query.order_id) {
    filters.order_id = query.order_id
  }
}
