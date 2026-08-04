import { MedusaService } from "@medusajs/framework/utils"

import ShippingRule from "./models/shipping-rule"

type ShippingRuleScope =
  | "all"
  | "product"
  | "category"
  | "collection"
  | "brand"
  | "taxonomy"

type ShippingRuleCandidate = {
  product_id?: string | null
  category_ids?: string[]
  collection_ids?: string[]
  brand_ids?: string[]
  taxonomy_term_ids?: string[]
  quantity: number
  fallback_fee?: number
  now?: Date
}

class ShippingRuleModuleService extends MedusaService({
  ShippingRule,
}) {
  async listActiveShippingRules(now = new Date()) {
    const rules = await this.listShippingRules(
      { status: "active" },
      { take: 200, order: { priority: "DESC", created_at: "DESC" } }
    )

    return rules.filter((rule) => {
      const startsAt = rule.starts_at ? new Date(rule.starts_at) : null
      const endsAt = rule.ends_at ? new Date(rule.ends_at) : null

      return (!startsAt || startsAt <= now) && (!endsAt || endsAt >= now)
    })
  }

  async findApplicableShippingRule(candidate: ShippingRuleCandidate) {
    const rules = await this.listActiveShippingRules(candidate.now)

    return (
      rules
        .filter((rule) => {
          const belowMaximum =
            !rule.maximum_quantity || candidate.quantity <= rule.maximum_quantity

          return (
            candidate.quantity >= rule.minimum_quantity &&
            belowMaximum &&
            matchesScope(rule.scope_type as ShippingRuleScope, rule, candidate)
          )
        })
        .sort((a, b) => {
          if (b.priority !== a.priority) {
            return b.priority - a.priority
          }

          return b.minimum_quantity - a.minimum_quantity
        })[0] ?? null
    )
  }

  async calculateShippingFee(candidate: ShippingRuleCandidate) {
    const rule = await this.findApplicableShippingRule(candidate)

    if (!rule) {
      return {
        rule,
        is_free_shipping: false,
        shipping_fee: candidate.fallback_fee ?? 0,
      }
    }

    return {
      rule,
      is_free_shipping: rule.is_free_shipping,
      shipping_fee: rule.is_free_shipping ? 0 : rule.shipping_fee,
    }
  }
}

function matchesScope(
  scopeType: ShippingRuleScope,
  rule: {
    product_id?: string | null
    category_id?: string | null
    collection_id?: string | null
    brand_id?: string | null
    taxonomy_term_id?: string | null
  },
  candidate: ShippingRuleCandidate
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

export default ShippingRuleModuleService
