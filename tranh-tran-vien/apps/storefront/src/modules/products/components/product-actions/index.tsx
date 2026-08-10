"use client"

// Component giao diện xử lý phần product actions trong storefront.

import { useIntersection } from "@lib/hooks/use-in-view"
import { convertToLocale } from "@lib/util/money"
import { HttpTypes } from "@medusajs/types"
import { Button, Text, clx } from "@modules/common/components/ui"
import Divider from "@modules/common/components/divider"
import OptionSelect from "@modules/products/components/product-actions/option-select"
import { isEqual } from "lodash"
import { useParams, usePathname, useSearchParams } from "next/navigation"
import { useEffect, useMemo, useRef, useState } from "react"
import ProductPrice from "../product-price"
import MobileActions from "./mobile-actions"
import { useRouter } from "next/navigation"

type ProductActionsProps = {
  product: HttpTypes.StoreProduct
  region: HttpTypes.StoreRegion
  disabled?: boolean
  comboRules?: ComboRule[]
  addToCartAction?: AddToCartAction
}

type AddToCartAction = (input: {
  variantId: string
  quantity: number
  countryCode: string
}) => Promise<void>

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
  tiers: ComboTier[]
  ends_at?: string | null
}

const optionsAsKeymap = (
  variantOptions: HttpTypes.StoreProductVariant["options"]
) => {
  return variantOptions?.reduce((acc: Record<string, string>, varopt) => {
    if (varopt.option_id) acc[varopt.option_id] = varopt.value
    return acc
  }, {})
}

export default function ProductActions({
  product,
  region,
  disabled,
  comboRules = [],
  addToCartAction,
}: ProductActionsProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const [options, setOptions] = useState<Record<string, string | undefined>>({})
  const [quantity, setQuantity] = useState(() =>
    parseQuantity(searchParams.get("qty"))
  )
  const [isAdding, setIsAdding] = useState(false)
  const [addToCartError, setAddToCartError] = useState<string | null>(null)
  const [now, setNow] = useState(() => Date.now())
  const countryCode = useParams().countryCode as string

  // If there is only 1 variant, preselect the options
  useEffect(() => {
    if (product.variants?.length === 1) {
      const variantOptions = optionsAsKeymap(product.variants[0].options)
      setOptions(variantOptions ?? {})
    }
  }, [product.variants])

  const selectedVariant = useMemo(() => {
    if (!product.variants || product.variants.length === 0) {
      return
    }

    return product.variants.find((v) => {
      const variantOptions = optionsAsKeymap(v.options)
      return isEqual(variantOptions, options)
    })
  }, [product.variants, options])

  // update the options when a variant is selected
  const setOptionValue = (optionId: string, value: string) => {
    setOptions((prev) => ({
      ...prev,
      [optionId]: value,
    }))
  }

  //check if the selected options produce a valid variant
  const isValidVariant = useMemo(() => {
    return product.variants?.some((v) => {
      const variantOptions = optionsAsKeymap(v.options)
      return isEqual(variantOptions, options)
    })
  }, [product.variants, options])

  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString())
    const value = isValidVariant ? selectedVariant?.id : null

    if (params.get("v_id") === value) {
      return
    }

    if (value) {
      params.set("v_id", value)
    } else {
      params.delete("v_id")
    }

    router.replace(pathname + "?" + params.toString())
  }, [selectedVariant, isValidVariant])

  // check if the selected variant is in stock
  const inStock = useMemo(() => {
    // If we don't manage inventory, we can always add to cart
    if (selectedVariant && !selectedVariant.manage_inventory) {
      return true
    }

    // If we allow back orders on the variant, we can add to cart
    if (selectedVariant?.allow_backorder) {
      return true
    }

    // If there is inventory available, we can add to cart
    if (
      selectedVariant?.manage_inventory &&
      (selectedVariant?.inventory_quantity || 0) >= quantity
    ) {
      return true
    }

    // Otherwise, we can't add to cart
    return false
  }, [quantity, selectedVariant])

  const addToCartLabel = useMemo(() => {
    if (!selectedVariant || !isValidVariant) {
      return "Select variant"
    }

    if (!inStock) {
      return "Out of stock"
    }

    return "Add to cart"
  }, [inStock, isValidVariant, selectedVariant])

  const comboTiers = useMemo(() => {
    return comboRules
      .flatMap((rule) =>
        rule.tiers.map((tier) => ({
          rule,
          tier,
        }))
      )
      .filter(({ tier }) => tier.minimum_quantity > 1)
      .sort((a, b) => {
        if (a.tier.minimum_quantity !== b.tier.minimum_quantity) {
          return a.tier.minimum_quantity - b.tier.minimum_quantity
        }

        return Number(b.tier.is_featured) - Number(a.tier.is_featured)
      })
  }, [comboRules])

  const comboDeadline = useMemo(() => {
    return comboRules
      .map((rule) => rule.ends_at)
      .filter((value): value is string => Boolean(value))
      .map((value) => new Date(value).getTime())
      .filter((value) => Number.isFinite(value) && value > Date.now())
      .sort((a, b) => a - b)[0]
  }, [comboRules])

  useEffect(() => {
    if (!comboDeadline) {
      return
    }

    const timer = window.setInterval(() => setNow(Date.now()), 1000)

    return () => window.clearInterval(timer)
  }, [comboDeadline])

  const comboTimeLeft = comboDeadline
    ? formatDealCountdown(comboDeadline - now)
    : ""

  const actionsRef = useRef<HTMLDivElement>(null)

  const inView = useIntersection(actionsRef, "0px")

  // add the selected variant to the cart
  const handleAddToCart = async () => {
    if (!selectedVariant?.id || !addToCartAction) return null

    setIsAdding(true)
    setAddToCartError(null)

    try {
      await addToCartAction({
        variantId: selectedVariant.id,
        quantity,
        countryCode,
      })

      window.dispatchEvent(
        new CustomEvent("ttv-cart-updated", {
          detail: {
            delta: quantity,
          },
        })
      )
      router.refresh()
    } catch (error) {
      setAddToCartError(
        error instanceof Error ? error.message : "Could not add to cart"
      )
    } finally {
      setIsAdding(false)
    }
  }

  return (
    <>
      <div className="flex flex-col gap-y-5" ref={actionsRef}>
        {!!comboTiers.length && (
          <div className="grid gap-3 rounded-lg border border-[#d8ddd7] bg-[#f7f8f5] p-4 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <Text className="text-sm font-semibold uppercase tracking-[0.08em] text-[#343a33]">
                Deal combo
              </Text>
              {comboTimeLeft ? (
                <div className="rounded-full border border-[#7aa66b]/35 bg-white px-3 py-1 text-xs font-semibold text-[#3f6f36] shadow-sm">
                  Sale ends in{" "}
                  <span className="font-bold tabular-nums">{comboTimeLeft}</span>
                </div>
              ) : (
                <Text className="text-sm text-[#687064]">
                  Tự động tính trong giỏ hàng
                </Text>
              )}
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {comboTiers.map(({ rule, tier }) => (
                <div
                  key={`${rule.id}-${tier.minimum_quantity}`}
                  className={clx(
                    "relative flex min-h-[4.25rem] flex-col justify-center rounded-lg border bg-white px-4 py-3 text-left shadow-sm transition-colors",
                    {
                      "border-[#cfd7cf] text-[#20251f]":
                        !tier.is_featured,
                      "border-[#9aa86f] bg-[#fbfcf2] text-[#20251f] ring-1 ring-[#bdc890]":
                        tier.is_featured,
                    }
                  )}
                >
                  {tier.is_featured && (
                    <span className="absolute right-3 top-2 rounded-full bg-[#52613f] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-white">
                      Nên chọn
                    </span>
                  )}
                  <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#72806c]">
                    Từ {tier.minimum_quantity} tranh
                  </span>
                  <span className="mt-1 pr-12 text-sm font-bold leading-5">
                    {formatComboDealTitle(tier, region.currency_code)}
                  </span>
                  {tier.is_free_shipping && (
                    <span className="mt-1 text-xs font-medium text-[#4d7b42]">
                      Freeship
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        <div>
          {(product.variants?.length ?? 0) > 1 && (
            <div className="flex flex-col gap-y-4">
              {(product.options || []).map((option) => {
                return (
                  <div key={option.id}>
                    <OptionSelect
                      option={option}
                      current={options[option.id]}
                      updateOption={setOptionValue}
                      title={option.title ?? ""}
                      data-testid="product-options"
                      disabled={!!disabled || isAdding}
                    />
                  </div>
                )
              })}
              <Divider />
            </div>
          )}
        </div>

        <div className="flex items-end gap-3">
          <ProductPrice product={product} variant={selectedVariant} />
          <Text className="pb-1 text-sm text-ui-fg-muted">incl. VAT</Text>
        </div>

        <div className="flex items-center gap-2 text-sm">
          <span
            className={clx("h-2 w-2 rounded-full", {
              "bg-green-600": inStock,
              "bg-red-600": !inStock,
            })}
          />
          <Text className="text-sm text-ui-fg-base">
            {inStock ? "In stock" : "Currently unavailable"}
          </Text>
        </div>

        <div className="grid grid-cols-[8.25rem_1fr] gap-3">
          <div className="grid grid-cols-[2.75rem_1fr_2.75rem] items-center overflow-hidden rounded-lg border border-ui-border-base bg-[#f2f0f1]">
            <button
              type="button"
              className="h-12 text-xl text-ui-fg-base disabled:text-ui-fg-disabled"
              onClick={() => setQuantity((current) => Math.max(1, current - 1))}
              disabled={quantity <= 1 || isAdding}
            >
              -
            </button>
            <input
              className="h-12 w-full bg-white text-center font-semibold outline-none"
              min={1}
              max={99}
              inputMode="numeric"
              pattern="[0-9]*"
              type="text"
              value={quantity}
              onChange={(event) =>
                setQuantity(parseQuantity(event.target.value))
              }
              disabled={isAdding}
            />
            <button
              type="button"
              className="h-12 text-xl text-ui-fg-base disabled:text-ui-fg-disabled"
              onClick={() => setQuantity((current) => Math.min(99, current + 1))}
              disabled={isAdding}
            >
              +
            </button>
          </div>
          <Button
            onClick={handleAddToCart}
            disabled={
              !inStock ||
              !selectedVariant ||
              !addToCartAction ||
              !!disabled ||
              isAdding ||
              !isValidVariant
            }
            variant="primary"
            className="h-12 w-full rounded-lg text-base font-bold"
            isLoading={isAdding}
            data-testid="add-product-button"
          >
            {addToCartLabel}
          </Button>
        </div>
        {addToCartError && (
          <Text className="text-sm font-medium text-red-600">
            {addToCartError}
          </Text>
        )}

        <MobileActions
          product={product}
          variant={selectedVariant}
          options={options}
          updateOptions={setOptionValue}
          inStock={inStock}
          handleAddToCart={handleAddToCart}
          isAdding={isAdding}
          show={!inView}
          optionsDisabled={!!disabled || isAdding}
        />
      </div>
    </>
  )
}

function parseQuantity(value: string | null): number {
  const parsed = Number(value)

  if (!Number.isFinite(parsed) || parsed < 1) {
    return 1
  }

  return Math.min(99, Math.floor(parsed))
}

function formatDealCountdown(milliseconds: number): string {
  if (milliseconds <= 0) {
    return ""
  }

  const totalSeconds = Math.floor(milliseconds / 1000)
  const days = Math.floor(totalSeconds / 86400)
  const hours = Math.floor((totalSeconds % 86400) / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60

  return `${padTime(days)}d : ${padTime(hours)}h : ${padTime(minutes)}m : ${padTime(seconds)}s`
}

function padTime(value: number): string {
  return String(value).padStart(2, "0")
}

function formatComboDealTitle(tier: ComboTier, currencyCode: string): string {
  if (tier.label?.trim()) {
    return tier.label.trim()
  }

  if (tier.discount_type === "fixed_total") {
    return `Combo ${tier.minimum_quantity} tranh: ${convertToLocale({
      amount: tier.discount_value,
      currency_code: currencyCode,
    })}`
  }

  if (tier.discount_type === "percentage") {
    return `Mua từ ${tier.minimum_quantity} tranh: giảm ${tier.discount_value}%`
  }

  return `Mua từ ${tier.minimum_quantity} tranh: giảm ${convertToLocale({
    amount: tier.discount_value,
    currency_code: currencyCode,
  })}/tranh`
}
