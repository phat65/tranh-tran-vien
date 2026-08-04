"use client"

import { Button, Heading } from "@modules/common/components/ui"

import CartTotals from "@modules/common/components/cart-totals"
import Divider from "@modules/common/components/divider"
import DiscountCode from "@modules/checkout/components/discount-code"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { HttpTypes } from "@medusajs/types"
import { convertToLocale } from "@lib/util/money"

type SummaryProps = {
  cart: HttpTypes.StoreCart
  comboRules?: ComboRule[]
}

type ComboTier = {
  minimum_quantity: number
  discount_type: "percentage" | "fixed" | "fixed_total"
  discount_value: number
  label?: string | null
  is_featured?: boolean
  is_free_shipping?: boolean
}

type ComboRule = {
  id: string
  name: string
  scope_type: "all" | "product" | "category" | "collection" | "option"
  product_id?: string | null
  category_id?: string | null
  collection_id?: string | null
  option_value_id?: string | null
  tiers: ComboTier[]
}

function getCheckoutStep(cart: HttpTypes.StoreCart) {
  if (!cart?.shipping_address?.address_1 || !cart.email) {
    return "address"
  } else if (cart?.shipping_methods?.length === 0) {
    return "delivery"
  } else {
    return "payment"
  }
}

const Summary = ({ cart, comboRules = [] }: SummaryProps) => {
  const step = getCheckoutStep(cart)

  return (
    <div className="flex flex-col gap-y-4">
      <Heading level="h2" className="text-[2rem] leading-[2.75rem]">
        Summary
      </Heading>
      <DiscountCode cart={cart} />
      <CartComboSummary cart={cart} comboRules={comboRules} />
      <Divider />
      <CartTotals totals={cart} />
      <LocalizedClientLink
        href={"/checkout?step=" + step}
        data-testid="checkout-button"
      >
        <Button className="w-full h-10">Go to checkout</Button>
      </LocalizedClientLink>
    </div>
  )
}

export default Summary

function CartComboSummary({
  cart,
  comboRules,
}: {
  cart: HttpTypes.StoreCart
  comboRules: ComboRule[]
}) {
  const applied = getAppliedComboDiscounts(cart)
  const nextTier = getNextComboTier(cart, comboRules)

  if (!applied.length && !nextTier) {
    return null
  }

  return (
    <div className="grid gap-3 border-y border-ui-border-base py-4">
      <div className="flex items-center justify-between gap-3">
        <span className="txt-compact-small-plus text-ui-fg-base">
          Combo savings
        </span>
        {!!applied.length && (
          <span className="txt-small-plus text-ui-fg-interactive">Applied</span>
        )}
      </div>

      {!!applied.length && (
        <div className="grid gap-2">
          {applied.map((discount) => (
            <div
              key={`${discount.rule_id}-${discount.minimum_quantity}`}
              className="grid gap-0.5"
            >
              <span className="txt-small-plus text-ui-fg-base">
                {discount.name}
              </span>
              <span className="txt-small text-ui-fg-subtle">
                {formatAppliedDiscount(discount, cart.currency_code)}
                {discount.is_free_shipping ? " - Freeship" : ""}
              </span>
            </div>
          ))}
        </div>
      )}

      {nextTier && (
        <div className="grid gap-1">
          <span className="txt-small text-ui-fg-subtle">
            Add {nextTier.remaining} more to unlock:
          </span>
          <span className="txt-small-plus text-ui-fg-base">
            {nextTier.rule.name} -{" "}
            {formatTier(nextTier.tier, cart.currency_code)}
          </span>
        </div>
      )}
    </div>
  )
}

function getAppliedComboDiscounts(cart: HttpTypes.StoreCart) {
  const metadata = cart.metadata as
    | {
        ttv_cart_rules?: {
          combo_discounts?: {
            rule_id: string
            name: string
            minimum_quantity: number
            discount_type: ComboTier["discount_type"]
            discount_value: number
            is_free_shipping?: boolean
          }[]
        }
      }
    | undefined

  return metadata?.ttv_cart_rules?.combo_discounts ?? []
}

function getNextComboTier(cart: HttpTypes.StoreCart, rules: ComboRule[]) {
  return rules
    .flatMap((rule) => {
      const quantity = getMatchingQuantity(cart, rule)

      return rule.tiers
        .filter((tier) => tier.minimum_quantity > quantity)
        .map((tier) => ({
          rule,
          tier,
          remaining: tier.minimum_quantity - quantity,
        }))
    })
    .sort((a, b) => {
      if (a.remaining !== b.remaining) {
        return a.remaining - b.remaining
      }

      return a.tier.minimum_quantity - b.tier.minimum_quantity
    })[0]
}

function getMatchingQuantity(cart: HttpTypes.StoreCart, rule: ComboRule) {
  return (cart.items ?? []).reduce((sum, item) => {
    if (!matchesRule(item, rule)) {
      return sum
    }

    return sum + Number(item.quantity)
  }, 0)
}

function matchesRule(item: HttpTypes.StoreCartLineItem, rule: ComboRule) {
  if (rule.scope_type === "all") {
    return true
  }

  if (rule.scope_type === "product") {
    return rule.product_id === item.product_id
  }

  if (rule.scope_type === "collection") {
    return Boolean(
      rule.collection_id && rule.collection_id === getLineItemCollectionId(item)
    )
  }

  if (rule.scope_type === "category") {
    const categories = (
      item.product as { categories?: { id?: string }[] } | undefined
    )?.categories

    return Boolean(
      rule.category_id &&
        categories?.some((category) => category.id === rule.category_id)
    )
  }

  const variantOptionIds =
    item.variant?.options?.map((option) => option.id).filter(Boolean) ?? []

  return Boolean(
    rule.option_value_id && variantOptionIds.includes(rule.option_value_id)
  )
}

function getLineItemCollectionId(
  item: HttpTypes.StoreCartLineItem
): string | null {
  const extendedItem = item as {
    product_collection_id?: string | null
    product?: {
      collection_id?: string | null
      collection?: { id?: string | null } | null
    }
  }

  return (
    extendedItem.product_collection_id ??
    extendedItem.product?.collection_id ??
    extendedItem.product?.collection?.id ??
    null
  )
}

function formatAppliedDiscount(
  discount: ReturnType<typeof getAppliedComboDiscounts>[number],
  currencyCode: string
) {
  return `${discount.minimum_quantity}+ - ${formatDiscountValue(
    discount.discount_type,
    discount.discount_value,
    currencyCode
  )}`
}

function formatTier(tier: ComboTier, currencyCode: string) {
  const suffix = tier.is_free_shipping ? " + freeship" : ""

  return `${tier.minimum_quantity}+ ${formatDiscountValue(
    tier.discount_type,
    tier.discount_value,
    currencyCode
  )}${suffix}`
}

function formatDiscountValue(
  type: ComboTier["discount_type"],
  value: number,
  currencyCode: string
) {
  if (type === "percentage") {
    return `${value}% off`
  }

  if (type === "fixed_total") {
    return `${convertToLocale({
      amount: value,
      currency_code: currencyCode,
    })} total`
  }

  return `${convertToLocale({
    amount: value,
    currency_code: currencyCode,
  })} off/item`
}
