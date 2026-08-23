import { MedusaError } from "@medusajs/framework/utils"

const QUANTITY_RULE_KEYS = ["min_quantity", "max_quantity"] as const

type QuantityRuleKey = (typeof QUANTITY_RULE_KEYS)[number]

/**
 * Medusa Dashboard 2.18 sends quantity bounds inside `rules`, while the
 * pricing engine reads them from the price's native quantity columns.
 * Normalize the batch payload before Medusa validates and persists it.
 */
export function normalizePriceListQuantityRules(body: unknown): number {
  if (!isRecord(body)) {
    return 0
  }

  let normalized = 0

  for (const operation of ["create", "update"] as const) {
    const prices = body[operation]

    if (!Array.isArray(prices)) {
      continue
    }

    for (const price of prices) {
      if (normalizePriceQuantityRules(price)) {
        normalized += 1
      }
    }
  }

  return normalized
}

export function normalizePriceQuantityRules(price: unknown): boolean {
  if (!isRecord(price) || !isRecord(price.rules)) {
    return false
  }

  let changed = false

  for (const key of QUANTITY_RULE_KEYS) {
    if (!Object.prototype.hasOwnProperty.call(price.rules, key)) {
      continue
    }

    if (!Object.prototype.hasOwnProperty.call(price, key)) {
      price[key] = parseQuantityRule(price.rules[key], key)
    }

    delete price.rules[key]
    changed = true
  }

  if (changed && !Object.keys(price.rules).length) {
    delete price.rules
  }

  return changed
}

/**
 * Medusa Dashboard 2.18 reads quantity bounds from `price.rules`, even though
 * the pricing module returns the native values on the price itself. Mirror the
 * native fields into the Admin response without changing persisted data.
 */
export function exposeNativeQuantityRulesToDashboard(payload: unknown): void {
  if (!isRecord(payload)) {
    return
  }

  if (isRecord(payload.price_list) && Array.isArray(payload.price_list.prices)) {
    payload.price_list.prices.forEach(exposePriceQuantityRules)
  }

  if (Array.isArray(payload.prices)) {
    payload.prices.forEach(exposePriceQuantityRules)
  }
}

function exposePriceQuantityRules(price: unknown): void {
  if (!isRecord(price)) {
    return
  }

  const rules = isRecord(price.rules) ? { ...price.rules } : {}

  if (Array.isArray(price.price_rules)) {
    for (const rule of price.price_rules) {
      if (
        isRecord(rule) &&
        typeof rule.attribute === "string" &&
        typeof rule.value === "string"
      ) {
        rules[rule.attribute] = rule.value
      }
    }
  }

  const minQuantity = toDashboardRuleValue(price.min_quantity)
  const maxQuantity = toDashboardRuleValue(price.max_quantity)

  if (minQuantity !== null) {
    rules.min_quantity = minQuantity
  }

  if (maxQuantity !== null) {
    rules.max_quantity = maxQuantity
  }

  if (Object.keys(rules).length) {
    price.rules = rules
  }
}

function toDashboardRuleValue(value: unknown): string | null {
  if (typeof value === "number" || typeof value === "string") {
    return String(value)
  }

  if (isRecord(value) && (typeof value.value === "number" || typeof value.value === "string")) {
    return String(value.value)
  }

  return null
}

function parseQuantityRule(value: unknown, key: QuantityRuleKey): number {
  const quantity = Number(value)

  if (!Number.isSafeInteger(quantity) || quantity < 1) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      `${key} must be a positive integer`
    )
  }

  return quantity
}

function isRecord(value: unknown): value is Record<string, any> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value)
}
