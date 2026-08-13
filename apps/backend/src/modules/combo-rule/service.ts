// Service Medusa chứa nghiệp vụ và thao tác dữ liệu cho module combo rule.

import { MedusaService } from "@medusajs/framework/utils"

import ComboRule from "./models/combo-rule"

type ComboScope = "all" | "product" | "category" | "collection" | "option"

type ComboTier = {
  minimum_quantity: number
  discount_type: "percentage" | "fixed" | "fixed_total"
  discount_value: number
  label?: string
  is_featured?: boolean
  is_free_shipping?: boolean
}

type ComboRuleCandidate = {
  product_id?: string | null
  category_ids?: string[]
  collection_id?: string | null
  option_value_ids?: string[]
  sales_channel_id?: string | null
  region_id?: string | null
  quantity: number
  now?: Date
}

class ComboRuleModuleService extends MedusaService({
  ComboRule,
}) {
  async listActiveComboRules(now = new Date()) {
    const rules = await this.listComboRules(
      { status: "active" },
      { take: 200, order: { priority: "DESC", created_at: "DESC" } }
    )

    return rules.filter((rule) => {
      const startsAt = rule.starts_at ? new Date(rule.starts_at) : null
      const endsAt = rule.ends_at ? new Date(rule.ends_at) : null

      return (!startsAt || startsAt <= now) && (!endsAt || endsAt >= now)
    })
  }

  async findApplicableComboRules(candidate: ComboRuleCandidate) {
    const rules = await this.listActiveComboRules(candidate.now)

    return rules
      .filter((rule) => {
        return (
          matchesChannel(rule, candidate) &&
          matchesScope(rule.scope_type as ComboScope, rule, candidate) &&
          Boolean(getBestTier(rule.tiers, candidate.quantity))
        )
      })
      .sort((a, b) => {
        if (b.priority !== a.priority) {
          return b.priority - a.priority
        }

        return (
          getHighestMinimumQuantity(b.tiers) - getHighestMinimumQuantity(a.tiers)
        )
      })
  }
}

function matchesChannel(
  rule: {
    sales_channel_id?: string | null
    region_id?: string | null
  },
  candidate: ComboRuleCandidate
): boolean {
  if (
    rule.sales_channel_id &&
    rule.sales_channel_id !== candidate.sales_channel_id
  ) {
    return false
  }

  if (rule.region_id && rule.region_id !== candidate.region_id) {
    return false
  }

  return true
}

function matchesScope(
  scopeType: ComboScope,
  rule: {
    product_id?: string | null
    category_id?: string | null
    collection_id?: string | null
    option_value_id?: string | null
  },
  candidate: ComboRuleCandidate
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
      rule.collection_id && rule.collection_id === candidate.collection_id
    )
  }

  return Boolean(
    rule.option_value_id &&
      candidate.option_value_ids?.includes(rule.option_value_id)
  )
}

function getBestTier(tiers: unknown, quantity: number): ComboTier | null {
  return normalizeTiers(tiers)
    .filter((tier) => quantity >= tier.minimum_quantity)
    .sort((a, b) => b.minimum_quantity - a.minimum_quantity)[0] ?? null
}

function getHighestMinimumQuantity(tiers: unknown): number {
  return normalizeTiers(tiers).sort(
    (a, b) => b.minimum_quantity - a.minimum_quantity
  )[0]?.minimum_quantity ?? 0
}

function normalizeTiers(tiers: unknown): ComboTier[] {
  if (!Array.isArray(tiers)) {
    return []
  }

  return tiers.filter((tier): tier is ComboTier => {
    if (!tier || typeof tier !== "object") {
      return false
    }

    const candidate = tier as Partial<ComboTier>

    return (
      typeof candidate.minimum_quantity === "number" &&
      candidate.minimum_quantity > 0 &&
      (candidate.discount_type === "percentage" ||
        candidate.discount_type === "fixed" ||
        candidate.discount_type === "fixed_total") &&
      typeof candidate.discount_value === "number" &&
      candidate.discount_value > 0
    )
  })
}

export default ComboRuleModuleService
