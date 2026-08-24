import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import type { PricingTypes } from "@medusajs/framework/types"
import {
  ContainerRegistrationKeys,
  Modules,
  QueryContext,
} from "@medusajs/framework/utils"

import {
  getDiscountPercentage,
  toNumericAmount,
} from "../../../lib/quantity-prices"
import type { StoreGetQuantityPricesParamsType } from "./validators"

type VariantPriceSet = {
  id: string
  price_set?: { id: string } | null
}

type CalculatedVariant = {
  id: string
  calculated_price?: {
    calculated_amount?: unknown
    original_amount?: unknown
    currency_code?: string | null
    calculated_price?: {
      id?: string | null
      price_list_id?: string | null
      price_list_type?: string | null
      min_quantity?: unknown
      max_quantity?: unknown
    } | null
  } | null
}

export type StoreQuantityPrice = {
  variant_id: string
  min_quantity: number
  max_quantity: number | null
  amount: number
  original_amount: number | null
  currency_code: string
  discount_percentage: number | null
  price_list_id: string
  price_list_title: string | null
  price_list_type: string | null
}

export async function GET(
  req: MedusaRequest,
  res: MedusaResponse
): Promise<void> {
  const params = req.validatedQuery as StoreGetQuantityPricesParamsType
  const variantIds = toArray(params.variant_id)

  if (!variantIds.length) {
    res.status(200).json({ quantity_prices: [] })
    return
  }

  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const pricing = req.scope.resolve<PricingTypes.IPricingModuleService>(
    Modules.PRICING
  )
  const { data } = await query.graph({
    entity: "variant",
    fields: ["id", "price_set.id"],
    filters: { id: variantIds },
  })
  const variants = data as VariantPriceSet[]
  const variantByPriceSetId = new Map(
    variants
      .filter((variant) => variant.price_set?.id)
      .map((variant) => [variant.price_set!.id, variant.id])
  )
  const priceSetIds = Array.from(variantByPriceSetId.keys())

  if (!priceSetIds.length) {
    res.status(200).json({ quantity_prices: [] })
    return
  }

  const currencyCode = getString(req.pricingContext?.currency_code)
  const prices = await pricing.listPrices(
    {
      price_set_id: priceSetIds,
      ...(currencyCode ? { currency_code: currencyCode } : {}),
    },
    { relations: ["price_list", "price_rules"], take: 1000 }
  )
  const candidateQuantities = new Map<number, Set<string>>()
  const priceListTitles = new Map<string, string>()

  for (const price of prices) {
    const minQuantity = toNumericAmount(price.min_quantity)
    const priceSetId = price.price_set_id
    const priceListId = price.price_list?.id

    if (!priceSetId || !priceListId || !minQuantity || minQuantity < 2) {
      continue
    }

    const priceSets = candidateQuantities.get(minQuantity) ?? new Set<string>()
    priceSets.add(priceSetId)
    candidateQuantities.set(minQuantity, priceSets)

    if (price.price_list?.title) {
      priceListTitles.set(priceListId, price.price_list.title)
    }
  }

  const quantityPrices: StoreQuantityPrice[] = []
  const seenPriceIds = new Set<string>()

  for (const [quantity, candidatePriceSetIds] of candidateQuantities) {
    const candidateVariantIds = Array.from(candidatePriceSetIds)
      .map((priceSetId) => variantByPriceSetId.get(priceSetId))
      .filter((variantId): variantId is string => Boolean(variantId))
    const context = {
      calculated_price: QueryContext({
        ...(req.pricingContext ?? {}),
        quantity,
      }),
    }
    const { data: calculatedData } = await query.graph({
      entity: "variant",
      fields: ["id", "calculated_price.*"],
      filters: { id: candidateVariantIds },
      context,
    })
    const calculatedVariants = calculatedData as CalculatedVariant[]

    for (const variant of calculatedVariants) {
      const calculated = variant.calculated_price
      const selectedPrice = calculated?.calculated_price
      const priceId = selectedPrice?.id
      const priceListId = selectedPrice?.price_list_id
      const minQuantity = toNumericAmount(selectedPrice?.min_quantity)
      const amount = toNumericAmount(calculated?.calculated_amount)

      if (
        !variant.id ||
        !priceId ||
        !priceListId ||
        !minQuantity ||
        minQuantity < 2 ||
        amount === null ||
        seenPriceIds.has(priceId)
      ) {
        continue
      }

      seenPriceIds.add(priceId)
      const originalAmount = toNumericAmount(calculated?.original_amount)

      quantityPrices.push({
        variant_id: variant.id,
        min_quantity: minQuantity,
        max_quantity: toNumericAmount(selectedPrice?.max_quantity),
        amount,
        original_amount: originalAmount,
        currency_code: calculated?.currency_code ?? currencyCode,
        discount_percentage: getDiscountPercentage(originalAmount, amount),
        price_list_id: priceListId,
        price_list_title: priceListTitles.get(priceListId) ?? null,
        price_list_type: selectedPrice?.price_list_type ?? null,
      })
    }
  }

  quantityPrices.sort((first, second) => {
    if (first.variant_id !== second.variant_id) {
      return first.variant_id.localeCompare(second.variant_id)
    }

    return first.min_quantity - second.min_quantity
  })

  res.status(200).json({ quantity_prices: quantityPrices })
}

function toArray(value: string | string[]): string[] {
  return (Array.isArray(value) ? value : [value]).filter(Boolean)
}

function getString(value: unknown): string {
  return typeof value === "string" ? value : ""
}
