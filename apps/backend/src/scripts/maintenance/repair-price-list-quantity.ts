import { MedusaContainer } from "@medusajs/framework"
import type { PricingTypes } from "@medusajs/framework/types"
import {
  ContainerRegistrationKeys,
  MedusaError,
  Modules,
} from "@medusajs/framework/utils"
import { batchPriceListPricesWorkflow } from "@medusajs/medusa/core-flows"

type VariantPriceSet = {
  id: string
  price_set?: { id: string } | null
}

type PriceListBatch = {
  create: Array<{
    amount: number
    currency_code: string
    variant_id: string
    min_quantity?: number | null
    max_quantity?: number | null
    rules?: Record<string, string>
  }>
  delete: string[]
}

const QUANTITY_RULE_KEYS = new Set(["min_quantity", "max_quantity"])

/**
 * One-time repair for quantity tiers saved by Medusa Dashboard 2.18 as
 * generic price rules. Recreates only affected prices using native quantity
 * fields so Medusa's pricing engine can apply them to cart line quantities.
 */
export default async function repair_price_list_quantity({
  container,
}: {
  container: MedusaContainer
}) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const pricing = container.resolve<PricingTypes.IPricingModuleService>(
    Modules.PRICING
  )
  const { data } = await query.graph({
    entity: "variant",
    fields: ["id", "price_set.id"],
    pagination: { take: 10000 },
  })
  const variantByPriceSetId = new Map(
    (data as VariantPriceSet[])
      .filter((variant) => variant.price_set?.id)
      .map((variant) => [variant.price_set!.id, variant.id])
  )
  const prices = await pricing.listPrices(
    {},
    { relations: ["price_list", "price_rules"], take: 10000 }
  )
  const batches = new Map<string, PriceListBatch>()

  for (const price of prices) {
    const rules = price.price_rules ?? []
    const quantityRules = rules.filter((rule) =>
      QUANTITY_RULE_KEYS.has(rule.attribute)
    )

    if (!quantityRules.length) {
      continue
    }

    const priceListId = price.price_list?.id
    const variantId = price.price_set_id
      ? variantByPriceSetId.get(price.price_set_id)
      : undefined
    const amount = toNumber(price.amount)
    const currencyCode = price.currency_code

    if (!priceListId || !variantId || amount === null || !currencyCode) {
      logger.warn(`Skipping price ${price.id}: incomplete price-list data.`)
      continue
    }

    const ruleMap = new Map(
      quantityRules.map((rule) => [rule.attribute, rule.value])
    )
    const minQuantity =
      toNumber(price.min_quantity) ??
      toPositiveInteger(ruleMap.get("min_quantity"), "min_quantity", price.id)
    const maxQuantity =
      toNumber(price.max_quantity) ??
      toPositiveInteger(ruleMap.get("max_quantity"), "max_quantity", price.id)
    const remainingRules = Object.fromEntries(
      rules
        .filter((rule) => !QUANTITY_RULE_KEYS.has(rule.attribute))
        .map((rule) => [rule.attribute, rule.value])
    )
    const batch = batches.get(priceListId) ?? { create: [], delete: [] }

    batch.create.push({
      amount,
      currency_code: currencyCode,
      variant_id: variantId,
      min_quantity: minQuantity,
      max_quantity: maxQuantity,
      ...(Object.keys(remainingRules).length
        ? { rules: remainingRules }
        : {}),
    })
    batch.delete.push(price.id)
    batches.set(priceListId, batch)
  }

  let repaired = 0

  for (const [priceListId, batch] of batches) {
    await batchPriceListPricesWorkflow(container).run({
      input: {
        data: {
          id: priceListId,
          create: batch.create,
          update: [],
          delete: batch.delete,
        },
      },
    })
    repaired += batch.delete.length
  }

  logger.info(`Repaired ${repaired} native quantity price tier(s).`)

  const verifiedPrices = await pricing.listPrices(
    {},
    { relations: ["price_list", "price_rules"], take: 10000 }
  )
  const nativeTiers = verifiedPrices.filter(
    (price) => price.price_list?.id && (toNumber(price.min_quantity) ?? 0) >= 2
  )

  logger.info(`Verified ${nativeTiers.length} native quantity price tier(s).`)

  for (const price of nativeTiers) {
    logger.info(
      [
        price.price_set_id
          ? variantByPriceSetId.get(price.price_set_id) ?? price.price_set_id
          : price.id,
        price.price_list?.title ?? price.price_list?.id,
        `quantity ${toNumber(price.min_quantity)}-${toNumber(price.max_quantity) ?? "+"}`,
        `${toNumber(price.amount)} ${price.currency_code}`,
      ].join(" | ")
    )
  }
}

function toNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") {
    return null
  }

  const number = Number(value)
  return Number.isFinite(number) ? number : null
}

function toPositiveInteger(
  value: unknown,
  field: string,
  priceId: string
): number | null {
  if (value === null || value === undefined || value === "") {
    return null
  }

  const quantity = Number(value)

  if (!Number.isSafeInteger(quantity) || quantity < 1) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      `Invalid ${field} on price ${priceId}`
    )
  }

  return quantity
}
