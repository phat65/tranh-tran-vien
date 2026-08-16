export type ComboRuleScope =
  | "all"
  | "product"
  | "category"
  | "collection"
  | "option"
  | "taxonomy"

export type ComboRuleScopeFields = {
  scope_type: ComboRuleScope
  product_id?: string | null
  category_id?: string | null
  collection_id?: string | null
  option_value_id?: string | null
  taxonomy_term_id?: string | null
}

export type ComboRuleCandidateSignals = {
  product_id?: string | null
  category_ids?: string[]
  collection_id?: string | null
  collection_ids?: string[]
  option_value_ids?: string[]
  taxonomy_term_ids?: string[]
}

export function matchesComboRuleScope(
  rule: ComboRuleScopeFields,
  candidate: ComboRuleCandidateSignals
) {
  if (rule.scope_type === "all") {
    return true
  }

  if (rule.scope_type === "product") {
    return Boolean(rule.product_id && rule.product_id === candidate.product_id)
  }

  if (rule.scope_type === "category") {
    return Boolean(
      rule.category_id && candidate.category_ids?.includes(rule.category_id)
    )
  }

  if (rule.scope_type === "collection") {
    return Boolean(
      rule.collection_id &&
        (candidate.collection_id === rule.collection_id ||
          candidate.collection_ids?.includes(rule.collection_id))
    )
  }

  if (rule.scope_type === "option") {
    return Boolean(
      rule.option_value_id &&
        candidate.option_value_ids?.includes(rule.option_value_id)
    )
  }

  if (rule.scope_type === "taxonomy") {
    return Boolean(
      rule.taxonomy_term_id &&
        candidate.taxonomy_term_ids?.includes(rule.taxonomy_term_id)
    )
  }

  return false
}

export function getComboRuleMatchingQuantity<
  T extends ComboRuleCandidateSignals & { quantity: unknown }
>(rule: ComboRuleScopeFields, items: T[]) {
  return items.reduce((sum, item) => {
    if (!matchesComboRuleScope(rule, item)) {
      return sum
    }

    const quantity = Number(item.quantity)

    return Number.isFinite(quantity) ? sum + quantity : sum
  }, 0)
}
