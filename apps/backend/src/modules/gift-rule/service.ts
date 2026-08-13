// Service Medusa chứa nghiệp vụ và thao tác dữ liệu cho module gift rule.

import { MedusaService } from "@medusajs/framework/utils"

import GiftRule from "./models/gift-rule"

type GiftRuleScope =
  | "all"
  | "product"
  | "category"
  | "collection"
  | "brand"
  | "taxonomy"

type GiftRuleCandidate = {
  product_id?: string | null
  category_ids?: string[]
  collection_ids?: string[]
  brand_ids?: string[]
  taxonomy_term_ids?: string[]
  quantity: number
  now?: Date
}

class GiftRuleModuleService extends MedusaService({
  GiftRule,
}) {
  async listActiveGiftRules(now = new Date()) {
    const rules = await this.listGiftRules(
      { status: "active" },
      { take: 200, order: { priority: "DESC", created_at: "DESC" } }
    )

    return rules.filter((rule) => {
      const startsAt = rule.starts_at ? new Date(rule.starts_at) : null
      const endsAt = rule.ends_at ? new Date(rule.ends_at) : null

      return (!startsAt || startsAt <= now) && (!endsAt || endsAt >= now)
    })
  }

  async findApplicableGiftRules(candidate: GiftRuleCandidate) {
    const rules = await this.listActiveGiftRules(candidate.now)

    return rules.filter((rule) => {
      return (
        candidate.quantity >= rule.minimum_quantity &&
        matchesScope(rule.scope_type as GiftRuleScope, rule, candidate)
      )
    })
  }
}

function matchesScope(
  scopeType: GiftRuleScope,
  rule: {
    product_id?: string | null
    category_id?: string | null
    collection_id?: string | null
    brand_id?: string | null
    taxonomy_term_id?: string | null
  },
  candidate: GiftRuleCandidate
): boolean {
  if (scopeType === "all") {
    return true
  }

  if (scopeType === "product") {
    return Boolean(rule.product_id && rule.product_id === candidate.product_id)
  }

  if (scopeType === "category") {
    return Boolean(
      rule.category_id && candidate.category_ids?.includes(rule.category_id)
    )
  }

  if (scopeType === "collection") {
    return Boolean(
      rule.collection_id &&
        candidate.collection_ids?.includes(rule.collection_id)
    )
  }

  if (scopeType === "brand") {
    return Boolean(rule.brand_id && candidate.brand_ids?.includes(rule.brand_id))
  }

  return Boolean(
    rule.taxonomy_term_id &&
      candidate.taxonomy_term_ids?.includes(rule.taxonomy_term_id)
  )
}

export default GiftRuleModuleService
