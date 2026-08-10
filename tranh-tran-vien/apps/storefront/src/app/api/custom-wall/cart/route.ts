import { NextResponse } from "next/server"

import { addItemsToCart } from "@lib/data/cart"

type AddWallCartPayload = {
  countryCode?: unknown
  items?: unknown
}

type AddWallCartItem = {
  variantId?: unknown
  quantity?: unknown
  metadata?: unknown
}

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as AddWallCartPayload
    const countryCode =
      typeof payload.countryCode === "string" ? payload.countryCode : ""
    const rawItems = Array.isArray(payload.items) ? payload.items : []
    const items = rawItems
      .map((item) => normalizeItem(item as AddWallCartItem))
      .filter((item) => item.variantId && item.quantity > 0)

    if (!countryCode) {
      return NextResponse.json(
        { message: "Missing country code" },
        { status: 400 }
      )
    }

    if (!items.length) {
      return NextResponse.json(
        { message: "Missing line items" },
        { status: 400 }
      )
    }

    await addItemsToCart({ countryCode, items })

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("[custom-wall-cart]", error)

    return NextResponse.json(
      {
        message:
          error instanceof Error ? error.message : "Could not add wall to cart",
      },
      { status: 500 }
    )
  }
}

function normalizeItem(item: AddWallCartItem) {
  const variantId = typeof item.variantId === "string" ? item.variantId : ""
  const quantity = Math.max(1, Math.floor(Number(item.quantity) || 0))
  const metadata =
    item.metadata && typeof item.metadata === "object" && !Array.isArray(item.metadata)
      ? (item.metadata as Record<string, unknown>)
      : undefined

  return {
    variantId,
    quantity,
    metadata,
  }
}
