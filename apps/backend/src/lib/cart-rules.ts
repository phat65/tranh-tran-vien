// Helper backend xử lý cart rules dùng lại giữa API, module và script.

import { refetchEntity } from "@medusajs/framework/http"
import { CartTypes, MedusaContainer } from "@medusajs/framework/types"
import { MedusaError, Modules } from "@medusajs/framework/utils"
import {
  addToCartWorkflow,
  refreshCartItemsWorkflow,
  refreshPaymentCollectionForCartWorkflow,
} from "@medusajs/medusa/core-flows"

import {
  ComboRuleScope,
  getComboRuleMatchingQuantity,
  matchesComboRuleScope as matchesComboScopeSignals,
} from "./combo-rule-matching"
import { BRAND_MODULE } from "../modules/brand"
import BrandModuleService from "../modules/brand/service"
import { COMBO_RULE_MODULE } from "../modules/combo-rule"
import ComboRuleModuleService from "../modules/combo-rule/service"
import { GIFT_RULE_MODULE } from "../modules/gift-rule"
import GiftRuleModuleService from "../modules/gift-rule/service"
import { SHIPPING_RULE_MODULE } from "../modules/shipping-rule"
import ShippingRuleModuleService from "../modules/shipping-rule/service"
import { TAXONOMY_MODULE } from "../modules/taxonomy"
import TaxonomyModuleService from "../modules/taxonomy/service"

const AUTO_GIFT_METADATA_KEY = "ttv_auto_gift"
const GIFT_RULE_ID_METADATA_KEY = "ttv_gift_rule_id"
const CART_RULES_METADATA_KEY = "ttv_cart_rules"
const COMBO_ADJUSTMENT_CODE_PREFIX = "TTV-COMBO-"

type RuleScope = "all" | "product" | "category" | "collection" | "brand" | "taxonomy"

type CartService = {
  retrieveCart: (
    id: string,
    config?: Record<string, unknown>
  ) => Promise<CartTypes.CartDTO>
  updateCarts: (
    id: string,
    data: CartTypes.UpdateCartDataDTO
  ) => Promise<CartTypes.CartDTO>
  updateLineItems: (
    id: string,
    data: Partial<CartTypes.UpdateLineItemDTO>
  ) => Promise<CartTypes.CartLineItemDTO>
  deleteLineItems: (ids: string[] | string) => Promise<void>
  updateShippingMethods: (
    data: CartTypes.UpdateShippingMethodDTO[]
  ) => Promise<CartTypes.CartShippingMethodDTO[]>
  setLineItemAdjustments: (
    cartId: string,
    data: CartTypes.UpsertLineItemAdjustmentDTO[]
  ) => Promise<CartTypes.LineItemAdjustmentDTO[]>
}

type CartItem = CartTypes.CartLineItemDTO & {
  product_id?: string | null
  product_category_id?: string | null
  product_collection_id?: string | null
}

type ProductSignals = {
  category_ids: string[]
  collection_ids: string[]
  option_value_ids_by_variant: Map<string, string[]>
  brand_ids: string[]
  taxonomy_term_ids: string[]
}

type EnrichedCartItem = CartItem &
  Omit<ProductSignals, "option_value_ids_by_variant"> & {
    option_value_ids: string[]
  }

type GiftRule = {
  id: string
  name: string
  scope_type: RuleScope
  product_id?: string | null
  category_id?: string | null
  collection_id?: string | null
  brand_id?: string | null
  taxonomy_term_id?: string | null
  minimum_quantity: number
  gift_variant_id: string
  gift_quantity: number
  priority: number
  is_stackable: boolean
}

type ShippingRule = {
  id: string
  name: string
  scope_type: RuleScope
  product_id?: string | null
  category_id?: string | null
  collection_id?: string | null
  brand_id?: string | null
  taxonomy_term_id?: string | null
  minimum_quantity: number
  maximum_quantity?: number | null
  shipping_fee: number
  is_free_shipping: boolean
  priority: number
}

type ShippingAdjustmentRule = {
  id: string
  name: string
  shipping_fee: number
  is_free_shipping: boolean
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
  scope_type: ComboRuleScope
  product_id?: string | null
  category_id?: string | null
  collection_id?: string | null
  option_value_id?: string | null
  taxonomy_term_id?: string | null
  sales_channel_id?: string | null
  region_id?: string | null
  tiers: ComboTier[] | unknown
  priority: number
  is_stackable: boolean
}

type AppliedComboRule = {
  rule: ComboRule
  tier: ComboTier
}

export type CartRuleSyncResult = {
  cart: CartTypes.CartDTO
  combo_discounts: {
    rule_id: string
    name: string
    minimum_quantity: number
    discount_type: ComboTier["discount_type"]
    discount_value: number
    is_free_shipping: boolean
  }[]
  combo_progress: {
    rule_id: string
    matching_quantity: number
  }[]
  gifts: {
    rule_id: string
    name: string
    variant_id: string
    quantity: number
  }[]
  shipping_rule: null | {
    rule_id: string
    name: string
    shipping_fee: number
    is_free_shipping: boolean
  }
}

export async function syncCartRules(
  scope: MedusaContainer,
  cartId: string
): Promise<CartRuleSyncResult> {
  const cartService = scope.resolve<CartService>(Modules.CART)
  const comboRuleService =
    scope.resolve<ComboRuleModuleService>(COMBO_RULE_MODULE)
  const giftRuleService = scope.resolve<GiftRuleModuleService>(GIFT_RULE_MODULE)
  const shippingRuleService =
    scope.resolve<ShippingRuleModuleService>(SHIPPING_RULE_MODULE)

  let cart = await retrieveRuleCart(cartService, cartId)
  const normalItems = cart.items?.filter((item) => !isAutoGift(item)) ?? []
  const enrichedItems = await enrichCartItems(scope, normalItems as CartItem[])

  const activeComboRules =
    (await comboRuleService.listActiveComboRules()) as ComboRule[]
  const comboProgress = getComboRuleProgress(
    activeComboRules,
    enrichedItems,
    cart
  )
  const appliedComboRules = selectComboRules(activeComboRules, enrichedItems, cart)
  const comboMutated = await syncComboAdjustments(
    cartService,
    cartId,
    cart,
    enrichedItems,
    appliedComboRules
  )

  if (comboMutated) {
    cart = await retrieveRuleCart(cartService, cartId)
  }

  const activeGiftRules =
    (await giftRuleService.listActiveGiftRules()) as GiftRule[]
  const appliedGiftRules = selectGiftRules(activeGiftRules, enrichedItems)

  const giftMutated = await syncGiftItems(
    scope,
    cartService,
    cartId,
    cart,
    appliedGiftRules
  )

  if (giftMutated) {
    await refreshCartItemsWorkflow(scope).run({
      input: {
        cart_id: cartId,
        force_refresh: true,
      },
    })
    cart = await retrieveRuleCart(cartService, cartId)
  }

  const activeShippingRules =
    (await shippingRuleService.listActiveShippingRules()) as ShippingRule[]
  const shippingRule =
    selectComboShippingRule(appliedComboRules) ??
    selectShippingRule(activeShippingRules, enrichedItems)
  const shippingMutated = await syncShippingMethods(
    cartService,
    cart,
    shippingRule
  )

  const metadata = {
    combo_discounts: appliedComboRules.map(({ rule, tier }) => ({
      rule_id: rule.id,
      name: rule.name,
      minimum_quantity: tier.minimum_quantity,
      discount_type: tier.discount_type,
      discount_value: tier.discount_value,
      is_free_shipping: tier.is_free_shipping === true,
    })),
    combo_progress: comboProgress,
    gifts: appliedGiftRules.map((rule) => ({
      rule_id: rule.id,
      name: rule.name,
      variant_id: rule.gift_variant_id,
      quantity: rule.gift_quantity,
    })),
    shipping_rule: shippingRule
      ? {
          rule_id: shippingRule.id,
          name: shippingRule.name,
          shipping_fee: shippingRule.is_free_shipping
            ? 0
            : shippingRule.shipping_fee,
          is_free_shipping: shippingRule.is_free_shipping,
        }
      : null,
    synced_at: new Date().toISOString(),
  }

  await cartService.updateCarts(cartId, {
    metadata: {
      ...(cart.metadata ?? {}),
      [CART_RULES_METADATA_KEY]: metadata,
    },
  })

  if (comboMutated || giftMutated || shippingMutated) {
    await refreshPaymentCollectionForCartWorkflow(scope).run({
      input: {
        cart_id: cartId,
      },
    })
  }

  const syncedCart = await retrieveRuleCart(cartService, cartId)

  return {
    cart: syncedCart,
    combo_discounts: metadata.combo_discounts,
    combo_progress: metadata.combo_progress,
    gifts: metadata.gifts,
    shipping_rule: metadata.shipping_rule,
  }
}

async function retrieveRuleCart(
  cartService: CartService,
  cartId: string
): Promise<CartTypes.CartDTO> {
  const cart = await cartService.retrieveCart(cartId, {
    relations: [
      "items",
      "items.adjustments",
      "shipping_methods",
      "shipping_methods.adjustments",
    ],
  })

  if (!cart) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      `Cart with id "${cartId}" not found`
    )
  }

  return cart
}

async function enrichCartItems(
  scope: MedusaContainer,
  items: CartItem[]
): Promise<EnrichedCartItem[]> {
  const productIds = unique(
    items.map((item) => item.product_id).filter(Boolean) as string[]
  )

  const [productSignals, brandSignals, taxonomySignals] = await Promise.all([
    getProductCategorySignals(scope, productIds),
    getProductBrandSignals(scope, productIds),
    getProductTaxonomySignals(scope, productIds),
  ])

  return items.map((item) => {
    const productId = item.product_id ?? ""

    return {
      ...item,
      category_ids: unique([
        ...(item.product_category_id ? [item.product_category_id] : []),
        ...(productSignals.get(productId)?.category_ids ?? []),
      ]),
      collection_ids: unique([
        ...(item.product_collection_id ? [item.product_collection_id] : []),
        ...(productSignals.get(productId)?.collection_ids ?? []),
      ]),
      option_value_ids: unique([
        ...getItemOptionValueIds(item),
        ...(productSignals
          .get(productId)
          ?.option_value_ids_by_variant.get(item.variant_id ?? "") ?? []),
      ]),
      brand_ids: brandSignals.get(productId)?.brand_ids ?? [],
      taxonomy_term_ids:
        taxonomySignals.get(productId)?.taxonomy_term_ids ?? [],
    }
  })
}

async function getProductCategorySignals(
  scope: MedusaContainer,
  productIds: string[]
): Promise<Map<string, ProductSignals>> {
  const pairs = await Promise.all(
    productIds.map(async (productId) => {
      const product = (await refetchEntity({
        entity: "product",
        idOrFilter: productId,
        scope,
        fields: [
          "id",
          "categories.id",
          "collection.id",
          "variants.id",
          "variants.options.id",
          "variants.options.value",
        ],
      })) as {
        categories?: { id: string }[]
        collection?: { id: string } | null
        variants?: {
          id?: string
          options?: { id?: string; value?: string }[]
        }[]
      } | null

      const signals: ProductSignals = {
        category_ids: product?.categories?.map((category) => category.id) ?? [],
        collection_ids: product?.collection?.id ? [product.collection.id] : [],
        option_value_ids_by_variant: new Map(
          (product?.variants ?? []).map((variant) => [
            variant.id ?? "",
            unique(
              (variant.options ?? [])
                .map((option) => option.id)
                .filter(Boolean) as string[]
            ),
          ])
        ),
        brand_ids: [],
        taxonomy_term_ids: [],
      }

      return [
        productId,
        signals,
      ] as const
    })
  )

  return new Map(pairs)
}

async function getProductBrandSignals(
  scope: MedusaContainer,
  productIds: string[]
): Promise<Map<string, ProductSignals>> {
  const brandService = scope.resolve<BrandModuleService>(BRAND_MODULE)
  const productBrands = productIds.length
    ? await brandService.listProductBrands({ product_id: productIds })
    : []
  const result = new Map<string, ProductSignals>()

  for (const productId of productIds) {
    result.set(productId, {
      category_ids: [],
      collection_ids: [],
      option_value_ids_by_variant: new Map(),
      brand_ids: [],
      taxonomy_term_ids: [],
    })
  }

  for (const productBrand of productBrands) {
    const current = result.get(productBrand.product_id)
    current?.brand_ids.push(productBrand.brand_id)
  }

  return result
}

async function getProductTaxonomySignals(
  scope: MedusaContainer,
  productIds: string[]
): Promise<Map<string, ProductSignals>> {
  const taxonomyService = scope.resolve<TaxonomyModuleService>(TAXONOMY_MODULE)
  const productTerms = productIds.length
    ? await taxonomyService.listProductTaxonomyTerms({ product_id: productIds })
    : []
  const result = new Map<string, ProductSignals>()

  for (const productId of productIds) {
    result.set(productId, {
      category_ids: [],
      collection_ids: [],
      option_value_ids_by_variant: new Map(),
      brand_ids: [],
      taxonomy_term_ids: [],
    })
  }

  for (const productTerm of productTerms) {
    const current = result.get(productTerm.product_id)
    current?.taxonomy_term_ids.push(productTerm.term_id)
  }

  return result
}

function selectGiftRules(
  rules: GiftRule[],
  items: EnrichedCartItem[]
): GiftRule[] {
  const applicable = rules.filter((rule) => isRuleApplicable(rule, items))
  const firstNonStackable = applicable.find((rule) => !rule.is_stackable)

  return firstNonStackable ? [firstNonStackable] : applicable
}

function selectShippingRule(
  rules: ShippingRule[],
  items: EnrichedCartItem[]
): ShippingRule | null {
  return (
    rules
      .filter((rule) => {
        const quantity = getMatchingQuantity(rule, items)
        const belowMaximum =
          !rule.maximum_quantity || quantity <= rule.maximum_quantity

        return quantity >= rule.minimum_quantity && belowMaximum
      })
      .sort((a, b) => {
        if (b.priority !== a.priority) {
          return b.priority - a.priority
        }

        return b.minimum_quantity - a.minimum_quantity
      })[0] ?? null
  )
}

function selectComboRules(
  rules: ComboRule[],
  items: EnrichedCartItem[],
  cart: CartTypes.CartDTO
): AppliedComboRule[] {
  const applicable = rules
    .map((rule) => {
      if (
        rule.sales_channel_id &&
        rule.sales_channel_id !== cart.sales_channel_id
      ) {
        return null
      }

      if (rule.region_id && rule.region_id !== cart.region_id) {
        return null
      }

      const quantity = getComboMatchingQuantity(rule, items)
      const tier = getBestComboTier(rule.tiers, quantity)

      return tier ? { rule, tier } : null
    })
    .filter((result): result is AppliedComboRule => Boolean(result))
    .sort((a, b) => {
      if (b.rule.priority !== a.rule.priority) {
        return b.rule.priority - a.rule.priority
      }

      return b.tier.minimum_quantity - a.tier.minimum_quantity
    })

  const firstNonStackable = applicable.find(({ rule }) => !rule.is_stackable)

  return firstNonStackable ? [firstNonStackable] : applicable
}

function getComboRuleProgress(
  rules: ComboRule[],
  items: EnrichedCartItem[],
  cart: CartTypes.CartDTO
) {
  return rules
    .filter((rule) => matchesComboCartContext(rule, cart))
    .map((rule) => ({
      rule_id: rule.id,
      matching_quantity: getComboMatchingQuantity(rule, items),
    }))
}

function matchesComboCartContext(
  rule: ComboRule,
  cart: CartTypes.CartDTO
) {
  return !(
    (rule.sales_channel_id &&
      rule.sales_channel_id !== cart.sales_channel_id) ||
    (rule.region_id && rule.region_id !== cart.region_id)
  )
}

function selectComboShippingRule(
  appliedRules: AppliedComboRule[]
): ShippingAdjustmentRule | null {
  const shippingRule = appliedRules.find(({ tier }) => tier.is_free_shipping)

  if (!shippingRule) {
    return null
  }

  return {
    id: shippingRule.rule.id,
    name: shippingRule.rule.name,
    shipping_fee: 0,
    is_free_shipping: true,
  }
}

async function syncComboAdjustments(
  cartService: CartService,
  cartId: string,
  cart: CartTypes.CartDTO,
  items: EnrichedCartItem[],
  appliedRules: AppliedComboRule[]
): Promise<boolean> {
  const keepExistingAdjustments: CartTypes.UpsertLineItemAdjustmentDTO[] = []
  const existingTtvAdjustments: CartTypes.UpsertLineItemAdjustmentDTO[] = []

  for (const item of cart.items ?? []) {
    for (const adjustment of item.adjustments ?? []) {
      if (isTtvComboAdjustment(adjustment)) {
        existingTtvAdjustments.push({
          id: adjustment.id,
          item_id: item.id,
          code: adjustment.code,
          amount: toNumber(adjustment.amount),
          description: adjustment.description,
        })
      } else {
        keepExistingAdjustments.push({
          id: adjustment.id,
          item_id: item.id,
        })
      }
    }
  }

  const nextTtvAdjustments = appliedRules.flatMap(({ rule, tier }) => {
    return buildComboAdjustments(rule, tier, items)
  })

  if (sameAdjustmentSet(existingTtvAdjustments, nextTtvAdjustments)) {
    return false
  }

  await cartService.setLineItemAdjustments(cartId, [
    ...keepExistingAdjustments,
    ...nextTtvAdjustments,
  ])

  return true
}

function isRuleApplicable(rule: GiftRule, items: EnrichedCartItem[]): boolean {
  return getMatchingQuantity(rule, items) >= rule.minimum_quantity
}

function getMatchingQuantity(
  rule: Pick<
    GiftRule | ShippingRule,
    | "scope_type"
    | "product_id"
    | "category_id"
    | "collection_id"
    | "brand_id"
    | "taxonomy_term_id"
  >,
  items: EnrichedCartItem[]
): number {
  return items.reduce((sum, item) => {
    if (matchesRuleScope(rule, item)) {
      return sum + Number(item.quantity)
    }

    return sum
  }, 0)
}

function matchesRuleScope(
  rule: Pick<
    GiftRule | ShippingRule,
    | "scope_type"
    | "product_id"
    | "category_id"
    | "collection_id"
    | "brand_id"
    | "taxonomy_term_id"
  >,
  item: EnrichedCartItem
): boolean {
  if (rule.scope_type === "all") {
    return true
  }

  if (rule.scope_type === "product") {
    return Boolean(rule.product_id && rule.product_id === item.product_id)
  }

  if (rule.scope_type === "category") {
    return Boolean(rule.category_id && item.category_ids.includes(rule.category_id))
  }

  if (rule.scope_type === "collection") {
    return Boolean(
      rule.collection_id && item.collection_ids.includes(rule.collection_id)
    )
  }

  if (rule.scope_type === "brand") {
    return Boolean(rule.brand_id && item.brand_ids.includes(rule.brand_id))
  }

  return Boolean(
    rule.taxonomy_term_id &&
    item.taxonomy_term_ids.includes(rule.taxonomy_term_id)
  )
}

function getComboMatchingQuantity(
  rule: ComboRule,
  items: EnrichedCartItem[]
): number {
  return getComboRuleMatchingQuantity(rule, items)
}

function matchesComboRuleScope(
  rule: Pick<
    ComboRule,
    | "scope_type"
    | "product_id"
    | "category_id"
    | "collection_id"
    | "option_value_id"
  >,
  item: EnrichedCartItem
): boolean {
  return matchesComboScopeSignals(rule, item)
}

function getBestComboTier(
  tiers: ComboRule["tiers"],
  quantity: number
): ComboTier | null {
  return normalizeComboTiers(tiers)
    .filter((tier) => quantity >= tier.minimum_quantity)
    .sort((a, b) => b.minimum_quantity - a.minimum_quantity)[0] ?? null
}

function normalizeComboTiers(tiers: unknown): ComboTier[] {
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

function buildComboAdjustments(
  rule: ComboRule,
  tier: ComboTier,
  items: EnrichedCartItem[]
): CartTypes.UpsertLineItemAdjustmentDTO[] {
  const matchingItems = items.filter((item) => matchesComboRuleScope(rule, item))

  if (tier.discount_type === "fixed_total") {
    return buildFixedTotalComboAdjustments(rule, tier, matchingItems)
  }

  return matchingItems.reduce<CartTypes.UpsertLineItemAdjustmentDTO[]>(
    (result, item) => {
      const amount = calculateLineComboAdjustmentAmount(item, tier)

      if (amount <= 0) {
        return result
      }

      result.push({
        item_id: item.id,
        code: buildComboAdjustmentCode(rule),
        amount,
        description: tier.label || rule.name,
      })

      return result
    },
    []
  )
}

function calculateLineComboAdjustmentAmount(
  item: EnrichedCartItem,
  tier: Pick<ComboTier, "discount_type" | "discount_value">
): number {
  const baseAmount = getLineItemDiscountBase(item)

  if (baseAmount <= 0) {
    return 0
  }

  if (tier.discount_type === "percentage") {
    return Math.min(
      baseAmount,
      Math.round((baseAmount * tier.discount_value) / 100)
    )
  }

  return Math.min(baseAmount, Math.round(tier.discount_value * toNumber(item.quantity)))
}

function buildFixedTotalComboAdjustments(
  rule: ComboRule,
  tier: ComboTier,
  items: EnrichedCartItem[]
): CartTypes.UpsertLineItemAdjustmentDTO[] {
  const pricedItems = items
    .map((item) => ({
      item,
      quantity: toNumber(item.quantity),
      baseAmount: getLineItemDiscountBase(item),
    }))
    .filter(({ quantity, baseAmount }) => quantity > 0 && baseAmount > 0)

  const quantity = pricedItems.reduce((sum, item) => sum + item.quantity, 0)

  if (quantity < tier.minimum_quantity) {
    return []
  }

  const baseTotal = pricedItems.reduce((sum, item) => sum + item.baseAmount, 0)
  const comboUnitPrice = tier.discount_value / tier.minimum_quantity
  const targetTotal = comboUnitPrice * quantity
  const discountTotal = Math.min(
    baseTotal,
    Math.max(0, Math.round(baseTotal - targetTotal))
  )

  if (discountTotal <= 0) {
    return []
  }

  let allocated = 0

  return pricedItems.reduce<CartTypes.UpsertLineItemAdjustmentDTO[]>(
    (result, pricedItem, index) => {
      const isLast = index === pricedItems.length - 1
      const amount = isLast
        ? discountTotal - allocated
        : Math.round((discountTotal * pricedItem.baseAmount) / baseTotal)

      allocated += amount

      if (amount <= 0) {
        return result
      }

      result.push({
        item_id: pricedItem.item.id,
        code: buildComboAdjustmentCode(rule),
        amount: Math.min(amount, pricedItem.baseAmount),
        description: tier.label || rule.name,
      })

      return result
    },
    []
  )
}

function getLineItemDiscountBase(item: CartTypes.CartLineItemDTO): number {
  const originalSubtotal =
    toNumber(item.original_subtotal) ||
    toNumber(item.unit_price) * toNumber(item.quantity)

  const existingNonTtvDiscount = (item.adjustments ?? [])
    .filter((adjustment) => !isTtvComboAdjustment(adjustment))
    .reduce((sum, adjustment) => sum + toNumber(adjustment.amount), 0)

  return Math.max(0, originalSubtotal - existingNonTtvDiscount)
}

function getItemOptionValueIds(item: CartItem): string[] {
  const values = item.variant_option_values

  if (!values || typeof values !== "object") {
    return []
  }

  return unique(
    Object.values(values)
      .flatMap((value) => extractStringValues(value))
      .filter((value) => value.startsWith("optval_"))
  )
}

function extractStringValues(value: unknown): string[] {
  if (typeof value === "string") {
    return [value]
  }

  if (Array.isArray(value)) {
    return value.flatMap((entry) => extractStringValues(entry))
  }

  if (value && typeof value === "object") {
    return Object.values(value).flatMap((entry) => extractStringValues(entry))
  }

  return []
}

function isTtvComboAdjustment(
  adjustment: Pick<CartTypes.LineItemAdjustmentDTO, "code">
): boolean {
  return Boolean(adjustment.code?.startsWith(COMBO_ADJUSTMENT_CODE_PREFIX))
}

function buildComboAdjustmentCode(rule: Pick<ComboRule, "id">): string {
  return `${COMBO_ADJUSTMENT_CODE_PREFIX}${rule.id}`
}

function sameAdjustmentSet(
  left: CartTypes.UpsertLineItemAdjustmentDTO[],
  right: CartTypes.UpsertLineItemAdjustmentDTO[]
): boolean {
  return adjustmentSignature(left) === adjustmentSignature(right)
}

function adjustmentSignature(
  adjustments: CartTypes.UpsertLineItemAdjustmentDTO[]
): string {
  return [...adjustments]
    .map((adjustment) => ({
      item_id: adjustment.item_id,
      code: adjustment.code ?? "",
      amount: toNumber(adjustment.amount),
      description: adjustment.description ?? "",
    }))
    .sort((a, b) =>
      `${a.item_id}:${a.code}`.localeCompare(`${b.item_id}:${b.code}`)
    )
    .map(
      (adjustment) =>
        `${adjustment.item_id}:${adjustment.code}:${adjustment.amount}:${adjustment.description}`
    )
    .join("|")
}

async function syncGiftItems(
  scope: MedusaContainer,
  cartService: CartService,
  cartId: string,
  cart: CartTypes.CartDTO,
  appliedRules: GiftRule[]
): Promise<boolean> {
  const desiredByRuleId = new Map(appliedRules.map((rule) => [rule.id, rule]))
  const existingGiftItems = cart.items?.filter(isAutoGift) ?? []
  const seenRuleIds = new Set<string>()
  const toDelete: string[] = []
  const toCreate: GiftRule[] = []
  let mutated = false

  for (const item of existingGiftItems) {
    const ruleId = getStringMetadata(item, GIFT_RULE_ID_METADATA_KEY)
    const desired = ruleId ? desiredByRuleId.get(ruleId) : undefined

    if (
      !ruleId ||
      !desired ||
      seenRuleIds.has(ruleId) ||
      item.variant_id !== desired.gift_variant_id
    ) {
      toDelete.push(item.id)
      mutated = true
      continue
    }

    seenRuleIds.add(ruleId)

    const metadata = buildGiftMetadata(desired)
    if (
      Number(item.quantity) !== desired.gift_quantity ||
      item.unit_price !== 0 ||
      item.is_custom_price !== true ||
      item.is_discountable !== false ||
      !hasMetadata(item, metadata)
    ) {
      await cartService.updateLineItems(item.id, {
        quantity: desired.gift_quantity,
        unit_price: 0,
        is_custom_price: true,
        is_discountable: false,
        metadata,
      })
      mutated = true
    }
  }

  for (const rule of appliedRules) {
    if (!seenRuleIds.has(rule.id)) {
      toCreate.push(rule)
    }
  }

  if (toDelete.length) {
    await cartService.deleteLineItems(toDelete)
  }

  if (toCreate.length) {
    await addToCartWorkflow(scope).run({
      input: {
        cart_id: cartId,
        items: toCreate.map((rule) => ({
          variant_id: rule.gift_variant_id,
          quantity: rule.gift_quantity,
          unit_price: 0,
          is_custom_price: true,
          is_discountable: false,
          metadata: buildGiftMetadata(rule),
        })),
      },
    })
    mutated = true
  }

  return mutated
}

async function syncShippingMethods(
  cartService: CartService,
  cart: CartTypes.CartDTO,
  rule: ShippingAdjustmentRule | null
): Promise<boolean> {
  const shippingMethods = cart.shipping_methods ?? []
  let mutated = false

  for (const method of shippingMethods) {
    if (!method.id) {
      continue
    }

    const data = { ...(method.data ?? {}) }
    const currentAmount = toNumber(method.amount)
    const originalAmount = getStoredOriginalAmount(data, currentAmount)
    const targetAmount = rule
      ? rule.is_free_shipping
        ? 0
        : rule.shipping_fee
      : originalAmount

    const nextData = rule
      ? {
          ...data,
          ttv_original_amount: originalAmount,
          ttv_shipping_rule_id: rule.id,
          ttv_shipping_rule_name: rule.name,
          ttv_is_free_shipping: rule.is_free_shipping,
      }
      : omitTtvShippingData(data)

    if (currentAmount !== targetAmount || !shallowEqualData(data, nextData)) {
      await cartService.updateShippingMethods([
        {
          id: method.id,
          amount: targetAmount,
          data: nextData,
        },
      ])
      mutated = true
    }
  }

  return mutated
}

function isAutoGift(item: Pick<CartTypes.CartLineItemDTO, "metadata">): boolean {
  return item.metadata?.[AUTO_GIFT_METADATA_KEY] === true
}

function buildGiftMetadata(rule: GiftRule): Record<string, unknown> {
  return {
    [AUTO_GIFT_METADATA_KEY]: true,
    [GIFT_RULE_ID_METADATA_KEY]: rule.id,
    ttv_gift_rule_name: rule.name,
  }
}

function getStringMetadata(
  item: Pick<CartTypes.CartLineItemDTO, "metadata">,
  key: string
): string | null {
  const value = item.metadata?.[key]
  return typeof value === "string" ? value : null
}

function hasMetadata(
  item: Pick<CartTypes.CartLineItemDTO, "metadata">,
  expected: Record<string, unknown>
): boolean {
  return Object.entries(expected).every(
    ([key, value]) => item.metadata?.[key] === value
  )
}

function getStoredOriginalAmount(
  data: Record<string, unknown>,
  fallback: number
): number {
  const stored = data.ttv_original_amount

  if (typeof stored === "number" && Number.isFinite(stored)) {
    return stored
  }

  if (typeof stored === "string" && stored.trim()) {
    const parsed = Number(stored)

    if (Number.isFinite(parsed)) {
      return parsed
    }
  }

  return fallback
}

function omitTtvShippingData(
  data: Record<string, unknown>
): Record<string, unknown> {
  const {
    ttv_original_amount: _originalAmount,
    ttv_shipping_rule_id: _shippingRuleId,
    ttv_shipping_rule_name: _shippingRuleName,
    ttv_is_free_shipping: _isFreeShipping,
    ...rest
  } = data

  return rest
}

function shallowEqualData(
  left: Record<string, unknown>,
  right: Record<string, unknown>
): boolean {
  return JSON.stringify(left) === JSON.stringify(right)
}

function toNumber(value: unknown): number {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0
  }

  if (typeof value === "string") {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : 0
  }

  if (value && typeof value === "object") {
    const objectValue = value as { value?: unknown; numeric?: unknown }
    return toNumber(objectValue.value ?? objectValue.numeric)
  }

  return 0
}

function unique(values: string[]): string[] {
  return Array.from(new Set(values))
}
