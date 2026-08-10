// API storefront cung cấp dữ liệu public cho tranh tran vien / custom wall / cart.

import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import { addToCartWorkflow } from "@medusajs/medusa/core-flows"

import { syncCartRules } from "../../../../../lib/cart-rules"

type CustomCrop = {
  offsetX?: unknown
  offsetY?: unknown
  zoom?: unknown
  imageRatio?: unknown
}

type CustomWallCartItemPayload = {
  source?: unknown
  variant_id?: unknown
  quantity?: unknown
  image_url?: unknown
  original_filename?: unknown
  wall_slot?: unknown
  crop?: unknown
  display_title?: unknown
  product_id?: unknown
  product_title?: unknown
  custom_item_index?: unknown
}

type CustomWallCartPayload = {
  cart_id?: unknown
  items?: unknown
}

type NormalizedCartItem = {
  variant_id: string
  quantity: number
  metadata?: Record<string, unknown>
}

export async function POST(
  req: MedusaRequest<CustomWallCartPayload>,
  res: MedusaResponse
): Promise<void> {
  const cartId = typeof req.body.cart_id === "string" ? req.body.cart_id : ""
  const payloadItems = Array.isArray(req.body.items) ? req.body.items : []

  if (!cartId) {
    throw new MedusaError(MedusaError.Types.INVALID_DATA, "cart_id is required")
  }

  const items = normalizeCartItems(payloadItems as CustomWallCartItemPayload[])

  if (!items.length) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "At least one cart item is required"
    )
  }

  await addToCartWorkflow(req.scope).run({
    input: {
      cart_id: cartId,
      items,
    },
  })

  const result = await syncCartRules(req.scope, cartId)

  res.status(200).json({
    cart: result.cart,
    combo_discounts: result.combo_discounts,
    gifts: result.gifts,
    shipping_rule: result.shipping_rule,
  })
}

function normalizeCartItems(
  payloadItems: CustomWallCartItemPayload[]
): NormalizedCartItem[] {
  const productQuantities = new Map<string, number>()
  const customItems: NormalizedCartItem[] = []

  for (const payloadItem of payloadItems) {
    const variantId =
      typeof payloadItem.variant_id === "string" ? payloadItem.variant_id : ""
    const quantity = Math.max(1, Math.floor(Number(payloadItem.quantity) || 0))
    const source =
      typeof payloadItem.source === "string" ? payloadItem.source : "product"

    if (!variantId || quantity <= 0) {
      continue
    }

    if (source === "product") {
      productQuantities.set(
        variantId,
        (productQuantities.get(variantId) ?? 0) + quantity
      )
      continue
    }

    customItems.push({
      variant_id: variantId,
      quantity,
      metadata: buildCustomMetadata(payloadItem, source),
    })
  }

  return [
    ...Array.from(productQuantities.entries()).map(([variantId, quantity]) => ({
      variant_id: variantId,
      quantity,
    })),
    ...customItems,
  ]
}

function buildCustomMetadata(
  payloadItem: CustomWallCartItemPayload,
  source: string
): Record<string, unknown> {
  const imageUrl = getString(payloadItem.image_url)
  const originalFilename = getString(payloadItem.original_filename)
  const crop = normalizeCrop(payloadItem.crop)

  if (source === "custom_hexagon_page") {
    return {
      ttv_source: "custom_hexagon_page",
      ttv_custom_type: "hexagon_poster",
      ttv_custom_display_title: getString(payloadItem.display_title),
      ttv_price_carrier_product_id: getString(payloadItem.product_id),
      ttv_price_carrier_product_title: getString(payloadItem.product_title),
      ttv_custom_item_index: Number(payloadItem.custom_item_index) || 1,
      ttv_custom_image_url: imageUrl,
      ttv_custom_original_filename: originalFilename,
      ttv_crop: crop,
    }
  }

  return {
    ttv_source: "custom_wall",
    ttv_custom_type: "hexagon_poster",
    ttv_custom_image_url: imageUrl,
    ttv_custom_original_filename: originalFilename,
    ttv_wall_slot: Number(payloadItem.wall_slot) || 0,
    ttv_crop: crop,
  }
}

function normalizeCrop(value: unknown) {
  const crop = value && typeof value === "object" ? (value as CustomCrop) : {}

  return {
    offsetX: Number(crop.offsetX) || 0,
    offsetY: Number(crop.offsetY) || 0,
    zoom: Number(crop.zoom) || 1,
    imageRatio:
      crop.imageRatio === null || crop.imageRatio === undefined
        ? null
        : Number(crop.imageRatio) || null,
  }
}

function getString(value: unknown): string {
  return typeof value === "string" ? value : ""
}
